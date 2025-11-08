/**
 * LAMA HTTP API Server
 * Exposes LAMA functionality to external MCP clients via HTTP
 * Runs inside the Electron app, proxies calls to existing IPC handlers
 */

import http from 'http';
import oneCoreHandlers from '../ipc/plans/one-core.js';
import { chatPlan } from '../ipc/plans/chat.js';
import connectionHandlers from '../ipc/plans/connection.js';
import aiHandlers from '../ipc/plans/ai.js';
import { registerContactPlans } from '../ipc/plans/contacts.js';
import nodeOneCore from '../core/node-one-core.js';
import { ipcMain } from 'electron';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { storeUnversionedObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import { ContactsPlan } from '@chat/core/plans/ContactsPlan.js';
import { MemoryTools } from './mcp/memory-tools.js';
import { handleDiscoverPlans, handleCallPlan } from '@mcp/core';

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
            // MCP Meta-Tools - Plan discovery and dynamic calls
            case 'mcp:discover_plans':
              result = await handleDiscoverPlans(params || {});
              break;
            case 'mcp:call_plan':
              result = await handleCallPlan(params);
              break;

            // Chat handlers - call business logic directly
            case 'chat:sendMessage':
              // Accept both 'text' and 'content' params for flexibility
              // Use provided senderId or fall back to owner
              result = await chatPlan.sendMessage({
                conversationId: params.conversationId,
                content: params.content || params.text,
                attachments: params.attachments || [],
                senderId: params.senderId || nodeOneCore.ownerId
              });
              break;
            case 'chat:getMessages':
              result = await chatPlan.getMessages(params);
              break;
            case 'chat:createConversation':
              {
                const type = params.type || 'group';
                let participants = params.participants || [];
                const name = params.name || null;
                const aiModelId = params.aiModelId;

                // If aiModelId is provided, ensure LLM contact exists and add to participants
                if (aiModelId && nodeOneCore.aiAssistantModel) {
                  try {
                    const aiPersonId = await nodeOneCore.aiAssistantModel.ensureAIContactForModel(aiModelId);
                    // Add LLM participant to the list if not already present
                    if (!participants.includes(String(aiPersonId))) {
                      participants.push(String(aiPersonId));
                    }
                  } catch (error) {
                    result = {
                      success: false,
                      error: `Failed to create LLM participant: ${(error as Error).message}`
                    };
                    break;
                  }
                }

                // Create conversation via chat.core (generic operation)
                result = await chatPlan.createConversation({ type, participants, name });

                if (result.success && result.data && aiModelId && nodeOneCore.aiAssistantModel) {
                  const topicId = result.data.id;

                  try {
                    // Register topic so AIMessageListener knows to trigger AI responses
                    nodeOneCore.aiAssistantModel.registerAITopic(topicId, aiModelId);
                    console.log(`[LamaAPI] Registered AI topic: ${topicId} with model: ${aiModelId}`);

                    // Trigger welcome message generation in background (non-blocking)
                    setImmediate(async () => {
                      try {
                        await nodeOneCore.aiAssistantModel.handleNewTopic(topicId);
                        console.log(`[LamaAPI] Welcome message generated for topic: ${topicId}`);
                      } catch (error) {
                        console.error('[LamaAPI] Failed to generate welcome message:', error);
                        // Non-fatal - conversation is already created
                      }
                    });
                  } catch (error) {
                    console.error('[LamaAPI] Failed to register AI topic:', error);
                    // Non-fatal - conversation is already created
                  }
                }
              }
              break;
            case 'topics:list':
              // For HTTP/MCP clients: enrich conversation data server-side
              // HTTP clients can't access nodeOneCore.aiAssistantModel directly,
              // so we enrich here using the real NodeOneCore instance
              result = await chatPlan.getConversations({});

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
            case 'contacts:add':
              // Call ContactsHandler directly in main process
              const { ContactsPlan } = await import('@chat/core/plans/ContactsPlan.js');
              const contactsHandler = new ContactsPlan(nodeOneCore);
              result = await contactsHandler.addContact(params);
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
            case 'ai:executeTool':
              result = await aiHandlers.executeTool(mockEvent, params);
              break;

            // Memory handlers - invoke via ipcMain handlers
            case 'memory:store':
              // Create proper Memory Assembly
              if (!params.content) {
                throw new Error('Memory content is required');
              }

              // Lookup contact Person if contactEmail provided, otherwise use owner
              let authorHash: SHA256IdHash<Person>;
              if (params.contactEmail) {
                const contactsHandler = new ContactsPlan(nodeOneCore);
                const contactsResponse = await contactsHandler.getContacts();

                if (contactsResponse.success && contactsResponse.contacts) {
                  const matchingContact = contactsResponse.contacts.find(
                    (c) => c.name === params.contactEmail || c.id === params.contactEmail
                  );

                  if (matchingContact) {
                    authorHash = matchingContact.personId as SHA256IdHash<Person>;
                  } else {
                    throw new Error(`Contact not found: ${params.contactEmail}`);
                  }
                } else {
                  throw new Error('Failed to get contacts');
                }
              } else {
                // Use owner as author if no contact specified
                authorHash = nodeOneCore.ownerId as SHA256IdHash<Person>;
              }

              // Create Memory object (versioned)
              const memoryData = {
                $type$: 'Memory' as const,
                content: params.content,
                author: authorHash, // Required: part of composite ID
                memoryType: params.category || 'note',
                timestamp: new Date().toISOString(),
                importance: 0.8,
                tags: params.category ? [params.category] : [],
                topicRef: 'lama'
              };

              // Store as versioned object using proper ONE.core function
              const memoryResult = await storeVersionedObject(memoryData);

              result = {
                idHash: memoryResult.idHash,
                hash: memoryResult.hash,
                category: params.category,
                author: authorHash
              };
              break;

            case 'memory:getStatus':
            case 'memory:toggle':
            case 'memory:enable':
            case 'memory:disable':
            case 'memory:extract':
            case 'memory:find':
            case 'memory:journal:list':
            case 'memory:journal:get':
              // Get the registered handler from ipcMain
              const handler = (ipcMain as any)._events[`handle-${method}`]?.[0];
              if (handler) {
                result = await handler(mockEvent, params || {});
              } else {
                throw new Error(`Memory handler ${method} not registered`);
              }
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
