#!/usr/bin/env node
/**
 * LAMA MCP Server - Standalone Entry Point
 *
 * Proxies MCP tool calls to the running Electron app's HTTP API (port 8787).
 * Dynamically discovers all handlers and exposes their methods as MCP tools.
 */

import fs from 'fs';
import http from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SubjectMemoryPlan } from '@refinio/memory.core';

// Redirect stderr to log file (MCP uses stdout for JSON-RPC)
const logStream = fs.createWriteStream('/tmp/mcp-lama-standalone.log', { flags: 'a' });
console.error = (...args: any[]) => {
  logStream.write(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') + '\n');
};

const API_PORT = 8787;
const API_HOST = '127.0.0.1';
const HEALTH_RETRY_INTERVAL_MS = 2000;
const HEALTH_MAX_RETRIES = 150; // 5 minutes

/**
 * Check if the Electron app's HTTP API is reachable
 */
function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    http.get(`http://${API_HOST}:${API_PORT}/health`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(true));
    }).on('error', () => resolve(false));
  });
}

/**
 * Wait for the Electron app to become available
 */
async function waitForApp(): Promise<void> {
  for (let i = 0; i < HEALTH_MAX_RETRIES; i++) {
    if (await checkHealth()) {
      console.error('[MCP-Standalone] Connected to LAMA app');
      return;
    }
    if (i === 0) {
      console.error('[MCP-Standalone] Waiting for LAMA app on port 8787...');
    }
    await new Promise(r => setTimeout(r, HEALTH_RETRY_INTERVAL_MS));
  }
  console.error('[MCP-Standalone] Timed out waiting for LAMA app');
  process.exit(1);
}

/**
 * Call the running Electron app's HTTP API
 */
function apiCall(handler: string, method: string, params: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(params);
    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      path: `/api/${handler}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success === false) {
            reject(new Error(parsed.error?.message || parsed.error || 'API call failed'));
          } else {
            resolve(parsed);
          }
        } catch (err) {
          reject(new Error(`Failed to parse API response: ${err}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * Fetch handler metadata from the running app
 */
function fetchHandlers(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    http.get(`http://${API_HOST}:${API_PORT}/api`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.handlers || []);
        } catch (err) {
          reject(new Error(`Failed to parse /api response: ${err}`));
        }
      });
    }).on('error', reject);
  });
}

// Methods to skip - internal/lifecycle methods not useful for MCP clients
const SKIP_METHODS = new Set([
  'init', 'shutdown', 'setMessageManagers', 'setGroupPlan', 'setStoryFactory',
  'setTopicGroupManager', 'setParanoiaLevel', 'setExtendedDependencies',
  'registerPairingHandler', 'registerProtocolStartHandler',
  'setupChannelAccessListener', 'uiReady', 'getCurrentInstanceVersion',
  'waitForOnlineState', 'getToolDefinitions', 'buildIndex', 'ensureIndex',
  'loadLatestVersion', 'saveAndLoad', 'updateModelDataFromLeute',
  'createInitialDefaultProfile', 'addPersonToEveryoneGroup', 'syncEveryoneGroup',
  'updatePersonNameCache', 'updatePersonNameCacheForPerson', 'updateLeuteMember',
  'addProfileFromResult', 'givePersonAllRights',
  'shareObjectWithEveryone', 'shareVersionsWithEveryone',
  'shareObjectWithIoM', 'shareVersionsWithIoM',
  'shareObjectWithGroup', 'shareVersionsWithGroup',
  'createGroupInternal', 'createConversationInternal', 'sendMessageInternal',
  'createPairingInvitationInternal', 'acceptPairingInvitationInternal',
  'meLazyLoad', 'othersLazyLoad'
]);

// Map of handler+method to tool definition overrides (name, description, inputSchema)
type ToolDef = { name: string; description: string; inputSchema: object; handler: string; method: string };

function buildDynamicTools(handlers: any[]): ToolDef[] {
  const tools: ToolDef[] = [];

  for (const h of handlers) {
    // Skip subjectMemory - handled separately with proper schemas
    if (h.name === 'subjectMemory') continue;

    for (const m of h.methods) {
      if (SKIP_METHODS.has(m.name)) continue;

      tools.push({
        name: `${h.name}_${m.name}`,
        description: `[${h.name}] ${m.name}`,
        inputSchema: {
          type: 'object',
          properties: {
            args: {
              type: 'object',
              description: 'Arguments to pass to the method'
            }
          }
        },
        handler: h.name,
        method: m.name
      });
    }
  }

  return tools;
}

async function main() {
  console.error('[MCP-Standalone] Starting LAMA MCP Server...');

  // Wait for the Electron app to become available (retries for up to 5 minutes)
  await waitForApp();

  // Get SubjectMemoryPlan tool definitions (proper MCP schemas)
  const memoryToolDefs = new SubjectMemoryPlan(null).getToolDefinitions();

  // Discover all handlers from the running app
  const handlers = await fetchHandlers();
  const dynamicTools = buildDynamicTools(handlers);
  console.error(`[MCP-Standalone] Discovered ${handlers.length} handlers, ${dynamicTools.length} dynamic tools`);

  // Build tool name -> {handler, method} lookup for dynamic tools
  const toolRoutes = new Map<string, { handler: string; method: string }>();
  for (const t of dynamicTools) {
    toolRoutes.set(t.name, { handler: t.handler, method: t.method });
  }
  // SubjectMemory tools route to subjectMemory handler
  for (const t of memoryToolDefs) {
    toolRoutes.set(t.name, { handler: 'subjectMemory', method: t.name });
  }

  // Merge all tool definitions
  const allTools = [
    ...memoryToolDefs,
    ...dynamicTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  ];

  // Create MCP server
  const server = new Server(
    { name: 'lama', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;
    console.error(`[MCP-Standalone] Tool call: ${name}`);

    const route = toolRoutes.get(name);
    if (!route) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true
      };
    }

    try {
      // For dynamic tools, args come wrapped in an 'args' property or directly
      const callArgs = args?.args || args || {};
      const result = await apiCall(route.handler, route.method, callArgs);
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  });

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP-Standalone] LAMA MCP Server ready on stdio');

  process.on('SIGINT', () => { logStream.end(); process.exit(0); });
  process.on('SIGTERM', () => { logStream.end(); process.exit(0); });
}

main();
