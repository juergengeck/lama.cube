/**
 * MCP Initialization Plan
 *
 * Extracted from NodeOneCore.setupMessageSync() MCP setup
 * Handles initialization of MCP Manager and HTTP API server.
 *
 * Principles:
 * - Register NodeOneCore with MCP for memory tools
 * - Initialize MCP manager to connect to servers
 * - Start HTTP API server for MCP clients
 */

export interface MCPInitContext {
  nodeOneCore: any;
}

export interface MCPServices {
  mcpManager: any;
  lamaAPIServer: any;
}

/**
 * MCP Initialization Plan
 * Initializes MCP Manager and HTTP API server
 */
export class MCPInitializationPlan {
  async execute(context: MCPInitContext): Promise<MCPServices> {
    console.log('[MCPInitializationPlan] Initializing MCP services...');

    // Step 1: Register NodeOneCore with MCP Manager
    const mcpManager = await this.registerNodeOneCore(context.nodeOneCore);

    // Step 2: Initialize MCP Manager
    await this.initializeMCPManager(mcpManager);

    // Step 2.5: Register LAMA plans with plan registry
    await this.registerPlans(context.nodeOneCore);

    // Step 3: Start HTTP API server
    const lamaAPIServer = await this.startAPIServer();

    console.log('[MCPInitializationPlan] ✅ All MCP services initialized');

    return {
      mcpManager,
      lamaAPIServer
    };
  }

  private async registerNodeOneCore(nodeOneCore: any): Promise<any> {
    console.log('[MCPInitializationPlan] Registering memory tools with MCP Manager...');

    const { mcpManager } = await import('@mcp/core');
    mcpManager.setNodeOneCore(nodeOneCore);

    console.log('[MCPInitializationPlan] ✅ Memory tools registered');
    return mcpManager;
  }

  private async initializeMCPManager(mcpManager: any): Promise<void> {
    console.log('[MCPInitializationPlan] Initializing MCP Manager...');

    await mcpManager.init();

    console.log('[MCPInitializationPlan] ✅ MCP Manager initialized');
  }

  private async registerPlans(nodeOneCore: any): Promise<void> {
    console.log('[MCPInitializationPlan] Registering plans with plan registry...');

    const { registerLamaCorePlans, getLamaCoreDepend } = await import('@lama/core/services/plan-registration.js');
    const deps = getLamaCoreDepend(nodeOneCore);
    registerLamaCorePlans(deps);

    // Register chat.core plan
    const { chatPlan } = await import('../ipc/plans/chat.js');
    if (chatPlan) {
      const { planRegistry } = await import('@mcp/core');
      planRegistry.registerPlan('chat', 'messaging', chatPlan, 'Chat and messaging operations');
    }

    console.log('[MCPInitializationPlan] ✅ Plans registered');
  }

  private async startAPIServer(): Promise<any> {
    console.log('[MCPInitializationPlan] Starting HTTP API server...');

    const { lamaAPIServer } = await import('../services/lama-api-server.js');
    await lamaAPIServer.start();

    console.log('[MCPInitializationPlan] ✅ HTTP API server started');
    return lamaAPIServer;
  }
}
