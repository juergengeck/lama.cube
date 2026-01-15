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
import { MemoryTools } from './mcp/memory-tools.js';
import { planRegistry, getPlanMetaToolDefinitions, handleDiscoverPlans, handleCallPlan } from '@mcp/core';
import { registerLamaCorePlans, getLamaCoreDepend } from '@lama/core/services/plan-registration.js';

export class LamaMCPServer {
  public nodeOneCore: any;
  public server: any;

  aiAssistantModel: any;
  toolInterface: any;
  private mcpClientPersonId: any = null;
  private memoryTools: MemoryTools;
  private registrationComplete: Promise<void>;

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

    // Initialize memory tools
    this.memoryTools = new MemoryTools(this.nodeOneCore);

    // Register plans with plan registry (async - will complete before start())
    this.registrationComplete = this.registerPlans();

    // Don't call setupTools() here - it must be called after server.connect()
  }

  /**
   * Register all plan instances with the plan registry
   * Plans are called directly by MCP tools (no IPC)
   */
  private async registerPlans(): Promise<void> {
    // Register lama.core plans (AI, memory, subjects, proposals, etc.)
    if (this.nodeOneCore) {
      const deps = getLamaCoreDepend(this.nodeOneCore);
      registerLamaCorePlans(deps);
    }

    // Register platform-specific plans (chat, contacts from chat.core)
    // IMPORTANT: Create a NEW ChatPlan instance with THIS nodeOneCore,
    // not the one from main/ipc/plans/chat.ts which may be uninitialized
    // (especially in standalone MCP server process)
    try {
      const { ChatPlan } = await import('@chat/core/plans/ChatPlan.js');
      if (ChatPlan && this.nodeOneCore) {
        const chatPlan = new ChatPlan(this.nodeOneCore, null, null, null);
        planRegistry.registerPlan('chat', 'messaging', chatPlan, 'Chat and messaging operations');
      }
    } catch (err) {
      console.error('[MCP] Failed to register chat plan:', err);
    }

    // Register assembly tools (Assembly, Supply, Demand, Plan, Story operations)
    try {
      const { AssemblyTools } = await import('@mcp/core/tools/AssemblyTools');
      if (this.nodeOneCore) {
        const assemblyTools = new AssemblyTools(this.nodeOneCore);
        await assemblyTools.init();
        planRegistry.registerPlan('assembly', 'core', assemblyTools, 'Assembly system (Supply/Demand/Assembly/Plan/Story operations)');
        console.error('[MCP] ✅ Registered assembly plan');
      }
    } catch (err) {
      console.error('[MCP] Failed to register assembly plan:', err);
    }

    console.error('[MCP] Plan registration complete');
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('[LamaMCPServer] 🔍 ListTools request received');

      // ONLY expose meta-tools (plan discovery) and memory tools
      // All other functionality is accessed via discover_plans + call_plan
      const planMetaTools = getPlanMetaToolDefinitions();
      const memoryToolDefinitions = this.memoryTools.getToolDefinitions();

      const tools = [
        ...planMetaTools,        // discover_plans, call_plan
        ...memoryToolDefinitions // memory_*, subject_* tools
      ];

      console.error(`[LamaMCPServer] 📋 Returning ${tools.length} tools`);
      console.error(`[LamaMCPServer] Plan meta-tools: ${planMetaTools.map(t => t.name).join(', ')}`);
      console.error(`[LamaMCPServer] Memory tools: ${memoryToolDefinitions.map(t => t.name).join(', ')}`);
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      console.error(`[LamaMCPServer] 🔧 CallTool request: ${name}`);
      console.error(`[LamaMCPServer] Arguments: ${JSON.stringify(args)}`);

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
        // Plan Meta-Tools - route to plan registry
        if (name === 'discover_plans') {
          return await handleDiscoverPlans(args);
        }
        if (name === 'call_plan') {
          return await handleCallPlan(args);
        }

        // Memory tools - route to memory tools handler
        if (name.startsWith('memory_') || name.startsWith('subject_')) {
          return await this.memoryTools.handleToolCall(name, args);
        }

        // Unknown tool
        throw new Error(`Unknown tool: ${name}. Use discover_plans to see available functionality.`);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<any> {
    const transport = new StdioServerTransport();

    // CRITICAL: Wait for plan registration to complete
    await this.registrationComplete;

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