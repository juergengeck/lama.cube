/**
 * LAMA HTTP API Server
 * Exposes LAMA functionality to external MCP clients via HTTP
 * Runs inside the Electron app, proxies calls to existing IPC handlers
 */

import http from 'http';
import oneCoreHandlers from '../ipc/handlers/one-core.js';
import { chatHandler } from '../ipc/handlers/chat.js';
import connectionHandlers from '../ipc/handlers/connection.js';
import aiHandlers from '../ipc/handlers/ai.js';
import { registerContactHandlers } from '../ipc/handlers/contacts.js';
import nodeOneCore from '../core/node-one-core.js';

export class LamaAPIServer {
  private server: http.Server | null = null;
  private port: number;
  private requestCount = 0;
  private startTime: number | null = null;

  constructor(port: number = 8787) {
    this.port = port;
  }

  getStatus() {
    return {
      running: this.server !== null,
      port: this.port,
      requestCount: this.requestCount,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      url: `http://127.0.0.1:${this.port}`
    };
  }

  async start() {
    if (this.server) {
      console.log('[LamaAPI] Server already running');
      return;
    }

    this.startTime = Date.now();

    this.server = http.createServer(async (req, res) => {
      // CORS headers for local access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      // Parse request body
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { method, params } = JSON.parse(body);

          this.requestCount++;
          console.log(`[LamaAPI] ${this.requestCount}. ${method}`, params ? `(${Object.keys(params).join(', ')})` : '');

          // Health check endpoint
          if (method === 'health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, result: this.getStatus() }));
            return;
          }

          // Route to appropriate handler
          let result;
          const mockEvent = {} as any; // TODO: Refactor remaining handlers to not need this

          switch (method) {
            // Chat handlers - call business logic directly
            case 'chat:sendMessage':
              // Accept both 'text' and 'content' params for flexibility
              // Use provided senderId or fall back to owner
              result = await chatHandler.sendMessage({
                conversationId: params.conversationId,
                content: params.content || params.text,
                attachments: params.attachments || [],
                senderId: params.senderId || nodeOneCore.ownerId
              });
              break;
            case 'chat:getMessages':
              result = await chatHandler.getMessages(params);
              break;
            case 'topics:list':
              // For HTTP/MCP clients: enrich conversation data server-side
              // HTTP clients can't access nodeOneCore.aiAssistantModel directly,
              // so we enrich here using the real NodeOneCore instance
              result = await chatHandler.getConversations({});

              if (result.success && result.data && nodeOneCore.aiAssistantModel) {
                result.data = result.data.map((conv: any) => {
                  // Get AI info from the actual NodeOneCore (not HTTP proxy)
                  const isAITopic = nodeOneCore.aiAssistantModel.isAITopic(conv.id);
                  const modelId = isAITopic ? nodeOneCore.aiAssistantModel.getModelIdForTopic(conv.id) : null;

                  return {
                    ...conv,
                    isAITopic,
                    modelName: modelId || conv.modelName
                  };
                });
              }
              break;

            // ONE.core handlers
            case 'onecore:getOwnerInfo':
              result = { ownerId: nodeOneCore.ownerId };
              break;
            case 'onecore:createAIContact':
              // Create AI contact for MCP clients
              if (!nodeOneCore.aiAssistantModel?.contactManager) {
                throw new Error('AI contact creation not available');
              }
              result = {
                personId: await nodeOneCore.aiAssistantModel.contactManager.createAIContact(
                  params.modelId,
                  params.displayName
                )
              };
              break;

            // Contact handlers
            case 'contacts:getContacts':
              result = await oneCoreHandlers.getContacts(mockEvent);
              break;

            // Connection handlers
            case 'connection:list':
              result = await connectionHandlers['connection:list'](mockEvent);
              break;
            case 'connection:createInvitation':
              result = await oneCoreHandlers.createLocalInvite(mockEvent, params);
              break;

            // AI handlers
            case 'ai:chat':
              result = await aiHandlers.chat(mockEvent, params);
              break;
            case 'ai:getModels':
              result = await aiHandlers.getModels(mockEvent);
              break;
            case 'ai:isAITopic':
              result = await aiHandlers.isAITopic(mockEvent, params);
              break;
            case 'ai:isAIPerson':
              result = await aiHandlers.isAIPerson(mockEvent, params);
              break;
            case 'ai:getModelIdForTopic':
              result = await aiHandlers.getModelIdForTopic(mockEvent, params);
              break;
            case 'ai:getModelIdForPersonId':
              result = await aiHandlers.getModelIdForPersonId(mockEvent, params);
              break;
            case 'ai:getAllContacts':
              result = await aiHandlers.getAllContacts(mockEvent);
              break;

            default:
              res.writeHead(404);
              res.end(JSON.stringify({ error: `Unknown method: ${method}` }));
              return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));

        } catch (error) {
          console.error('[LamaAPI] Request error:', error);
          res.writeHead(500);
          res.end(JSON.stringify({
            success: false,
            error: (error as Error).message
          }));
        }
      });
    });

    return new Promise<void>((resolve, reject) => {
      this.server!.listen(this.port, '127.0.0.1', () => {
        console.log(`[LamaAPI] ✅ HTTP API server listening on http://127.0.0.1:${this.port}`);
        console.log(`[LamaAPI] 📡 MCP clients can now connect via standalone server`);
        console.log(`[LamaAPI] 🔍 Monitoring requests... (health check: POST {"method":"health"})`);
        resolve();
      });

      this.server!.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`[LamaAPI] Port ${this.port} already in use - API server already running`);
          resolve(); // Don't fail if already running
        } else {
          reject(error);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          console.log(`[LamaAPI] ⏹️  Server stopped (${this.requestCount} requests served)`);
          this.server = null;
          this.startTime = null;
          resolve();
        });
      });
    }
  }
}

// Singleton instance
export const lamaAPIServer = new LamaAPIServer();
