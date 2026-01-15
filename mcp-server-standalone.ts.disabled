#!/usr/bin/env node
/**
 * LAMA MCP Server - Standalone Entry Point
 *
 * Connects to the running Electron app via HTTP API (port 8787)
 * Does NOT create its own NodeOneCore instance
 */

// CRITICAL: Redirect stderr BEFORE any imports that might log
// MCP protocol uses stdout for JSON-RPC, so console.error must not pollute it
import fs from 'fs';
const logStream = fs.createWriteStream('/tmp/mcp-lama-standalone.log', { flags: 'a' });
console.error = (...args: any[]) => {
  logStream.write(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') + '\n');
};

import LamaMCPServer from './main/services/mcp-lama-server.js';
import http from 'http';

// HTTP API client wrapper that mimics NodeOneCore interface
class NodeOneCoreHTTPClient {
  private baseUrl = 'http://127.0.0.1:8787';
  public ownerId: string | null = null; // Will be populated from API

  async call(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ method, params });

      const options = {
        hostname: '127.0.0.1',
        port: 8787,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const { success, result, error } = JSON.parse(data);
            if (!success) {
              reject(new Error(error || 'API call failed'));
            } else {
              resolve(result);
            }
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(postData);
      req.end();
    });
  }
  
  // Proxy methods to HTTP API
  async getContacts() { return this.call('contacts:getContacts'); }
  async sendMessage(params: any) { return this.call('chat:sendMessage', params); }
  async getMessages(params: any) {
    // Call HTTP endpoint and return in format ChatHandler expects
    const result = await this.call('chat:getMessages', params);
    return result; // Already has {success, messages, total, hasMore}
  }
  async listTopics() { return this.call('topics:list'); }
  
  getInfo() {
    return { initialized: true }; // Assume running app is initialized
  }

  // Properties that ChatHandler expects
  get initialized() {
    return true; // Assume running app is initialized
  }

  // Required by ChatHandler - returns enriched conversation data
  get topicModel() {
    return {
      topics: {
        all: async () => {
          const response = await this.call('topics:list');
          // HTTP endpoint enriches AI data server-side, just unwrap response
          return response.data || [];
        }
      },
      // Required by sendMessage - proxy to HTTP call
      enterTopicRoom: async (topicId: string) => {
        // The HTTP API doesn't need enterTopicRoom - it handles this internally
        // Just return a mock room object with the methods ChatPlan needs
        return {
          sendMessage: async (message: any, channelOwner?: any) => {
            // Delegate to HTTP API chat:sendMessage
            return await this.call('chat:sendMessage', {
              conversationId: topicId,
              content: message.text || message.content,
              attachments: message.attachments || []
            });
          },
          sendMessageWithAttachmentAsHash: async (message: any, attachmentHashes: string[], channelOwner?: any) => {
            return await this.call('chat:sendMessage', {
              conversationId: topicId,
              content: message.text || message.content,
              attachments: attachmentHashes
            });
          }
        };
      }
    };
  }

  // Required by ChatHandler for contact lookups
  get leuteModel() {
    return {
      others: async () => this.call('contacts:getContacts')
    };
  }
}

async function main() {
  try {
    console.error('[MCP-Standalone] Starting LAMA MCP Server...');
    console.error('[MCP-Standalone] Connecting to Electron app at http://127.0.0.1:8787...');

    const nodeOneCoreClient = new NodeOneCoreHTTPClient();

    // Test connection and fetch owner ID
    try {
      await nodeOneCoreClient.call('topics:list');
      console.error('[MCP-Standalone] ✅ Connected to Electron app');

      // Fetch owner ID from the real NodeOneCore via HTTP
      const ownerInfo = await nodeOneCoreClient.call('onecore:getOwnerInfo');
      nodeOneCoreClient.ownerId = ownerInfo.ownerId;
      console.error(`[MCP-Standalone] Owner ID: ${nodeOneCoreClient.ownerId}`);

      // Create AI contact for Claude Desktop via HTTP
      try {
        const mcpContact = await nodeOneCoreClient.call('onecore:createAIContact', {
          modelId: 'claude-desktop-mcp',
          displayName: 'Claude Desktop (MCP)'
        });
        console.error(`[MCP-Standalone] ✅ Created MCP client identity: ${mcpContact.personId}`);
        // Store for MCP server to use
        (nodeOneCoreClient as any).mcpClientPersonId = mcpContact.personId;
      } catch (error) {
        console.error('[MCP-Standalone] Could not create MCP client identity, using owner');
      }
    } catch (error) {
      console.error('[MCP-Standalone] ❌ Cannot connect to Electron app');
      console.error('[MCP-Standalone] Make sure LAMA desktop app is running and you are logged in');
      throw error;
    }
    
    // Create and start MCP server
    // Don't pass aiAssistantModel - HTTP proxy can't provide synchronous AI methods
    console.error('[MCP-Standalone] Starting MCP server on stdio...');
    const mcpServer = new LamaMCPServer(nodeOneCoreClient as any);
    await mcpServer.start();
    
    console.error('[MCP-Standalone] ✅ LAMA MCP Server ready');
    console.error('[MCP-Standalone] Listening for MCP requests on stdio...');

    // Keep process alive
    process.on('SIGINT', () => {
      console.error('[MCP-Standalone] Shutting down...');
      logStream.end();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('[MCP-Standalone] Shutting down...');
      logStream.end();
      process.exit(0);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[MCP-Standalone] Unhandled rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('[MCP-Standalone] Uncaught exception:', error);
    });

    // Keep stdin open
    process.stdin.resume();

    // Keep the event loop alive - wait indefinitely
    await new Promise(() => {});
  } catch (error) {
    console.error('[MCP-Standalone] ❌ Failed to start:', error);
    logStream.end();
    process.exit(1);
  }
}

main();
