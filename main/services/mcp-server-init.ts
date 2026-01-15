/**
 * MCP Server Initialization
 *
 * Wires modules to PlanRegistry and starts MCP stdio server.
 * Called after ModuleRegistry.initAll() completes.
 */

import { createPlanRegistry, type PlanRegistry } from '@refinio/api/registry';
import { McpStdioServer } from '@mcp/core/servers';
import type { ModuleRegistry } from '@refinio/api/plan-system';

// Module types - import dynamically to avoid circular deps
import type { AIModule } from '@lama/core/modules';
import type { MemoryModule } from '@lama/core/modules';
import type { ChatModule } from '@lama/core/modules';
import type { ConnectionModule } from '@lama/core/modules';
import type { CoreModule } from '@lama/core/modules';

let planRegistry: PlanRegistry | null = null;
let mcpServer: McpStdioServer | null = null;

/**
 * Wire modules to PlanRegistry
 *
 * Extracts plans from initialized modules and registers them.
 */
export function wireModulesToRegistry(moduleRegistry: ModuleRegistry): PlanRegistry {
  if (planRegistry) {
    console.log('[MCPServerInit] PlanRegistry already created');
    return planRegistry;
  }

  console.log('[MCPServerInit] Creating PlanRegistry and wiring modules...');
  planRegistry = createPlanRegistry();

  // Wire AIModule
  const aiModule = moduleRegistry.getModule<AIModule>('AIModule');
  if (aiModule?.aiAssistantPlan) {
    planRegistry.register('aiAssistant', aiModule.aiAssistantPlan, {
      description: 'AI assistant operations',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: aiAssistant');
  }

  // Wire MemoryModule
  const memoryModule = moduleRegistry.getModule<MemoryModule>('MemoryModule');
  if (memoryModule?.memoryPlan) {
    planRegistry.register('memory', memoryModule.memoryPlan, {
      description: 'Memory/subject storage operations',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: memory');
  }
  if (memoryModule?.chatMemoryPlan) {
    planRegistry.register('chatMemory', memoryModule.chatMemoryPlan, {
      description: 'Chat memory integration',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: chatMemory');
  }

  // Wire ChatModule
  const chatModule = moduleRegistry.getModule<ChatModule>('ChatModule');
  if (chatModule?.chatPlan) {
    planRegistry.register('chat', chatModule.chatPlan, {
      description: 'Chat operations',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: chat');
  }

  // Wire ConnectionModule
  const connectionModule = moduleRegistry.getModule<ConnectionModule>('ConnectionModule');
  if (connectionModule?.connectionPlan) {
    planRegistry.register('connections', connectionModule.connectionPlan, {
      description: 'Connection management',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: connections');
  }

  // Wire CoreModule (contacts via LeuteModel)
  const coreModule = moduleRegistry.getModule<CoreModule>('CoreModule');
  if (coreModule?.leuteModel) {
    planRegistry.register('contacts', coreModule.leuteModel, {
      description: 'Contact management',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: contacts');
  }

  console.log('[MCPServerInit] ✅ PlanRegistry wired with', planRegistry.listPlans().length, 'plans');
  return planRegistry;
}

/**
 * Start MCP stdio server
 *
 * Call after wireModulesToRegistry()
 */
export async function startMcpServer(): Promise<McpStdioServer> {
  if (!planRegistry) {
    throw new Error('PlanRegistry not initialized. Call wireModulesToRegistry() first.');
  }

  if (mcpServer) {
    console.log('[MCPServerInit] MCP server already running');
    return mcpServer;
  }

  console.log('[MCPServerInit] Starting MCP stdio server...');
  mcpServer = new McpStdioServer(planRegistry, {
    name: 'lama',
    version: '1.0.0'
  });

  await mcpServer.start();
  console.log('[MCPServerInit] ✅ MCP server started');

  return mcpServer;
}

/**
 * Stop MCP server
 */
export async function stopMcpServer(): Promise<void> {
  if (mcpServer) {
    console.log('[MCPServerInit] Stopping MCP server...');
    await mcpServer.stop();
    mcpServer = null;
    console.log('[MCPServerInit] MCP server stopped');
  }
}

/**
 * Get the PlanRegistry
 */
export function getPlanRegistry(): PlanRegistry | null {
  return planRegistry;
}
