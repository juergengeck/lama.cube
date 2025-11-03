import type { ConnectionsModel } from '@refinio/one.models/lib/models/index.js';
/**
 * LAMA Application MCP Server
 * Provides access to LAMA-specific features like chat, contacts, connections, etc.
 *
 * ⚠️ SECURITY WARNING: NO ACCESS CONTROL IMPLEMENTED
 *
 * Current state:
 * - External MCP clients have FULL ACCESS to all LAMA data
 * - No per-chat or per-assembly access grants
 * - No client authentication or authorization
 * - Only use with TRUSTED clients on personal machines
 *
 * Required for production:
 * - Implement MCPClientAccess verification (per-chat, per-assembly grants)
 * - Add client authentication with cryptographic verification
 * - Implement MCPClientAudit logging for all operations
 * - Add UI for managing client access grants
 * - Support access revocation
 *
 * See MCP.md for full access control data model and implementation plan.
 *
 * This runs in the Node.js main process where it has access to:
 * - ONE.core instance
 * - LLMManager
 * - AIAssistantModel
 * - All LAMA functionality
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPToolInterface } from '../interfaces/tool-interface.js';

export class LamaMCPServer {
  public nodeOneCore: any;
  public server: any;

  aiAssistantModel: any;
  toolInterface: any;
  private mcpClientPersonId: any = null;

  constructor(nodeOneCore: any, aiAssistantModel?: any) {

    this.nodeOneCore = nodeOneCore;
    this.aiAssistantModel = aiAssistantModel || null;

    this.server = new Server({
      name: 'lama-app',
      version: '1.0.0'
}, {
      capabilities: {
        tools: {}
      }
    });

    // Initialize tool interface
    this.toolInterface = new MCPToolInterface(this as any, this.nodeOneCore);

    // Don't call setupTools() here - it must be called after server.connect()
  }

  /**
   * Initialize MCP client AI identity
   * Creates an AI Person for "Claude Desktop" (or other MCP client)
   */
  async initializeMCPClientIdentity(): Promise<void> {
    // Check if nodeOneCore already has MCP client identity (set by standalone server)
    if ((this.nodeOneCore as any).mcpClientPersonId) {
      this.mcpClientPersonId = (this.nodeOneCore as any).mcpClientPersonId;
      console.error(`[LamaMCPServer] Using MCP client identity from proxy: ${this.mcpClientPersonId}`);
      return;
    }

    console.error('[LamaMCPServer] No MCP client identity available, messages will use owner identity');
  }

  setupTools(): any {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Chat Tools
        {
          name: 'send_message',
          description: 'Send a message in a chat topic',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID to send message to'
              },
              message: {
                type: 'string',
                description: 'The message content to send'
              }
            },
            required: ['topicId', 'message']
          }
        },
        {
          name: 'get_messages',
          description: 'Get messages from a chat topic',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID to get messages from'
              },
              limit: {
                type: 'number',
                description: 'Number of messages to retrieve',
                default: 10
              }
            },
            required: ['topicId']
          }
        },
        {
          name: 'list_topics',
          description: 'List all available chat topics',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        
        // Contact Tools
        {
          name: 'get_contacts',
          description: 'Get list of contacts',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'search_contacts',
          description: 'Search for contacts by name or ID',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              }
            },
            required: ['query']
          }
        },
        
        // Connection Tools
        {
          name: 'list_connections',
          description: 'List all network connections',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'create_invitation',
          description: 'Create a pairing invitation for a new connection',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        
        // LLM Tools
        {
          name: 'list_models',
          description: 'List available AI models',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'load_model',
          description: 'Load an AI model',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: {
                type: 'string',
                description: 'The model ID to load'
              }
            },
            required: ['modelId']
          }
        },
        
        // AI Assistant Tools
        {
          name: 'create_ai_topic',
          description: 'Create a new AI-enabled chat topic',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: {
                type: 'string',
                description: 'The AI model ID for the topic'
              }
            },
            required: ['modelId']
          }
        },
        {
          name: 'generate_ai_response',
          description: 'Generate an AI response for a message',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The message to respond to'
              },
              modelId: {
                type: 'string',
                description: 'The AI model to use'
              },
              topicId: {
                type: 'string',
                description: 'Optional topic ID for context'
              }
            },
            required: ['message', 'modelId']
          }
        },

        // Chat Memory Tools
        {
          name: 'enable_chat_memories',
          description: 'Enable automatic memory extraction for a chat topic',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID to enable memories for'
              },
              autoExtract: {
                type: 'boolean',
                description: 'Automatically extract subjects from messages',
                default: true
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional keywords to track'
              }
            },
            required: ['topicId']
          }
        },
        {
          name: 'disable_chat_memories',
          description: 'Disable memory extraction for a chat topic',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID to disable memories for'
              }
            },
            required: ['topicId']
          }
        },
        {
          name: 'toggle_chat_memories',
          description: 'Toggle memory extraction on/off for a chat topic',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID to toggle memories for'
              }
            },
            required: ['topicId']
          }
        },
        {
          name: 'extract_chat_subjects',
          description: 'Manually extract subjects from chat history',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID to extract from'
              },
              limit: {
                type: 'number',
                description: 'Number of messages to analyze',
                default: 50
              }
            },
            required: ['topicId']
          }
        },
        {
          name: 'find_chat_memories',
          description: 'Find related memories by keywords',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID for context'
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: 'Keywords to search for'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 10
              }
            },
            required: ['keywords']
          }
        },
        {
          name: 'get_chat_memory_status',
          description: 'Get memory extraction status for a chat',
          inputSchema: {
            type: 'object',
            properties: {
              topicId: {
                type: 'string',
                description: 'The topic/chat ID to check'
              }
            },
            required: ['topicId']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      if (!this.nodeOneCore) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: ONE.core not initialized. LAMA tools are not available yet.'
            }
          ]
        };
      }
      
      try {
        switch (name) {
          // Chat operations
          case 'send_message':
            return await this.sendMessage(args.topicId, args.message);
          case 'get_messages':
            return await this.getMessages(args.topicId, args.limit);
          case 'list_topics':
            return await this.listTopics();
            
          // Contact operations
          case 'get_contacts':
            return await this.getContacts();
          case 'search_contacts':
            return await this.searchContacts(args.query);
            
          // Connection operations
          case 'list_connections':
            return await this.listConnections();
          case 'create_invitation':
            return await this.createInvitation();
            
          // LLM operations
          case 'list_models':
            return await this.listModels();
          case 'load_model':
            return await this.loadModel(args.modelId);
            
          // AI Assistant operations
          case 'create_ai_topic':
            return await this.createAITopic(args.modelId);
          case 'generate_ai_response':
            return await this.generateAIResponse(args.message, args.modelId, args.topicId);

          // Chat Memory operations
          case 'enable_chat_memories':
            return await this.enableChatMemories(args.topicId, args.autoExtract, args.keywords);
          case 'disable_chat_memories':
            return await this.disableChatMemories(args.topicId);
          case 'toggle_chat_memories':
            return await this.toggleChatMemories(args.topicId);
          case 'extract_chat_subjects':
            return await this.extractChatSubjects(args.topicId, args.limit);
          case 'find_chat_memories':
            return await this.findChatMemories(args.topicId, args.keywords, args.limit);
          case 'get_chat_memory_status':
            return await this.getChatMemoryStatus(args.topicId);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`
            }
          ]
        };
      }
    });
  }
  
  // Chat implementations - use HTTP proxy for consistency
  async sendMessage(topicId: any, message: any): Promise<any> {
    try {
      // Call via HTTP API (nodeOneCore is HTTP proxy client)
      const response = await this.nodeOneCore.sendMessage({
        conversationId: topicId,
        content: message,
        senderId: this.mcpClientPersonId || undefined
      });

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to send message: ${response.error}`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Message sent to topic ${topicId}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to send message: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async getMessages(topicId: any, limit = 10): Promise<unknown> {
    try {
      // Use nodeOneCore's HTTP proxy method instead of ChatHandler
      // (ChatHandler needs topicModel.enterTopicRoom which HTTP proxy doesn't have)
      const response = await this.nodeOneCore.getMessages({ conversationId: topicId, limit });
      const messages = response?.messages || [];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(messages, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get messages: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async listTopics(): Promise<any> {
    try {
      // Call via HTTP API
      const topics = await this.nodeOneCore.listTopics();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(topics, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list topics: ${(error as Error).message}`
          }
        ]
      };
    }
  }
  
  // Contact implementations
  async getContacts(): Promise<any> {
    try {
      // Call via HTTP API
      const contacts = await this.nodeOneCore.getContacts();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(contacts, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get contacts: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async searchContacts(query: any): Promise<any> {
    try {
      // Call via HTTP API
      const contacts = await this.nodeOneCore.getContacts();
      const filtered = contacts.filter((c: any) =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.id?.includes(query)
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filtered, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to search contacts: ${(error as Error).message}`
          }
        ]
      };
    }
  }
  
  // Connection implementations
  async listConnections(): Promise<any> {
    try {
      const connections: ConnectionsModel = this.nodeOneCore.connectionsModel?.connectionsInfo() || [];
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(connections, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list connections: ${(error as Error).message}`
          }
        ]
      };
    }
  }
  
  async createInvitation(): Promise<any> {
    try {
      if (!this.nodeOneCore.connectionsModel?.pairing) {
        throw new Error('Pairing manager not available');
      }

      const invitation: any = await this.nodeOneCore.connectionsModel.pairing.createInvitation();
      
      return {
        content: [
          {
            type: 'text',
            text: `Invitation created:\n${invitation.url}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create invitation: ${(error as Error).message}`
          }
        ]
      };
    }
  }
  
  // LLM implementations
  async listModels(): Promise<any> {
    try {
      const models = this.aiAssistantModel?.getAvailableLLMModels ? this.aiAssistantModel.getAvailableLLMModels() : [];
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(models.map((m: any) => ({
              id: m.id,
              name: m.name,
              displayName: m.displayName,
              personId: m.personId
            })), null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list models: ${(error as Error).message}`
          }
        ]
      };
    }
  }
  
  async loadModel(modelId: any): Promise<any> {
    try {
      if (!this.aiAssistantModel?.llmManager) {
        throw new Error('LLM Manager not available');
      }
      
      await this.aiAssistantModel.llmManager.loadModel(modelId);
      
      return {
        content: [
          {
            type: 'text',
            text: `Model ${modelId} loaded successfully`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to load model: ${(error as Error).message}`
          }
        ]
      };
    }
  }
  
  // AI Assistant implementations
  async createAITopic(modelId: any): Promise<any> {
    try {
      if (!this.aiAssistantModel) {
        throw new Error('AI Assistant not initialized');
      }
      
      const topicId = await this.aiAssistantModel.getOrCreateAITopic(modelId);
      
      return {
        content: [
          {
            type: 'text',
            text: `AI topic created: ${topicId} for model: ${modelId}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create AI topic: ${(error as Error).message}`
          }
        ]
      };
    }
  }
  
  async generateAIResponse(message: any, modelId: any, topicId: any): Promise<any> {
    try {
      if (!this.aiAssistantModel) {
        throw new Error('AI Assistant not initialized');
      }
      
      const response = await this.aiAssistantModel.generateResponse({
        message,
        modelId,
        topicId
      });
      
      return {
        content: [
          {
            type: 'text',
            text: response
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to generate AI response: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  // Chat Memory implementations
  async enableChatMemories(topicId: any, autoExtract = true, keywords: string[] = []): Promise<any> {
    try {
      if (!this.nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const config = await this.nodeOneCore.chatMemoryHandler.enableMemories(
        topicId,
        autoExtract,
        keywords
      );

      return {
        content: [
          {
            type: 'text',
            text: `Memories enabled for topic ${String(topicId).substring(0, 8)}...\nAuto-extract: ${config.autoExtract}\nKeywords: ${keywords.join(', ') || 'none'}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to enable memories: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async disableChatMemories(topicId: any): Promise<any> {
    try {
      if (!this.nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      await this.nodeOneCore.chatMemoryHandler.disableMemories(topicId);

      return {
        content: [
          {
            type: 'text',
            text: `Memories disabled for topic ${String(topicId).substring(0, 8)}...`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to disable memories: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async toggleChatMemories(topicId: any): Promise<any> {
    try {
      if (!this.nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const enabled = await this.nodeOneCore.chatMemoryHandler.toggleMemories(topicId);

      return {
        content: [
          {
            type: 'text',
            text: `Memories ${enabled ? 'enabled' : 'disabled'} for topic ${String(topicId).substring(0, 8)}...`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to toggle memories: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async extractChatSubjects(topicId: any, limit = 50): Promise<any> {
    try {
      if (!this.nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const startTime = Date.now();
      const result = await this.nodeOneCore.chatMemoryHandler.extractSubjects({
        topicId,
        limit,
        includeContext: true
      });

      const processingTime = Date.now() - startTime;

      let text = `Extracted ${result.subjects.length} subjects from ${result.totalMessages} messages\n`;
      text += `Processing time: ${processingTime}ms\n\n`;
      text += 'Subjects:\n';

      for (const subject of result.subjects) {
        text += `- ${subject.name} (confidence: ${subject.confidence.toFixed(2)})\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to extract subjects: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async findChatMemories(topicId: any, keywords: string[], limit = 10): Promise<any> {
    try {
      if (!this.nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const result = await this.nodeOneCore.chatMemoryHandler.findRelatedMemories(
        topicId,
        keywords,
        limit
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              totalFound: result.totalFound,
              searchKeywords: result.searchKeywords,
              memories: result.memories.map((m: any) => ({
                name: m.name,
                keywords: m.keywords,
                relevance: m.relevanceScore.toFixed(2),
                lastUpdated: new Date(m.lastUpdated).toISOString()
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to find memories: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async getChatMemoryStatus(topicId: any): Promise<any> {
    try {
      if (!this.nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const status = this.nodeOneCore.chatMemoryHandler.getMemoryStatus(topicId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              enabled: status.enabled,
              config: status.config || null
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get memory status: ${(error as Error).message}`
          }
        ]
      };
    }
  }

  async start(): Promise<any> {
    const transport = new StdioServerTransport();

    // Set up request handlers BEFORE connecting
    this.setupTools();

    // Now connect the transport
    await this.server.connect(transport);

    // Initialize MCP client identity after connection
    await this.initializeMCPClientIdentity();

    console.error('[LamaMCPServer] ✅ LAMA MCP Server started');
  }
}

export default LamaMCPServer;