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

export interface MCPProgressCallback {
  (stage: string, progress: number, message: string): void;
}

/**
 * MCP Initialization Plan
 * Initializes MCP Manager and HTTP API server
 * Supports lazy initialization to avoid blocking app startup
 */
export class MCPInitializationPlan {
  private progressCallback?: MCPProgressCallback;

  /**
   * Set progress callback for UI updates
   */
  setProgressCallback(callback: MCPProgressCallback): void {
    this.progressCallback = callback;
  }

  private reportProgress(stage: string, progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(stage, progress, message);
    }
  }

  /**
   * Execute MCP initialization synchronously (blocks startup)
   * Use executeLazy() instead for non-blocking initialization
   */
  async execute(context: MCPInitContext): Promise<MCPServices> {
    console.log('[MCPInitializationPlan] Initializing MCP services...');
    this.reportProgress('mcp-init', 0, 'Starting MCP initialization');

    // Step 1: Register NodeOneCore with MCP Manager
    const mcpManager = await this.registerNodeOneCore(context.nodeOneCore);
    this.reportProgress('mcp-init', 25, 'Memory tools registered');

    // Step 2: Initialize MCP Manager (parallel authentication)
    await this.initializeMCPManager(mcpManager);
    this.reportProgress('mcp-init', 75, 'MCP servers connected');

    // Step 2.5: Register LAMA plans with plan registry
    await this.registerPlans(context.nodeOneCore);

    // Step 3: Start HTTP API server
    const lamaAPIServer = await this.startAPIServer();
    this.reportProgress('mcp-init', 100, 'MCP initialization complete');

    console.log('[MCPInitializationPlan] ✅ All MCP services initialized');

    return {
      mcpManager,
      lamaAPIServer
    };
  }

  /**
   * Execute MCP initialization in the background (non-blocking)
   * Returns immediately with partially initialized services
   * MCP servers connect in background, tools become available progressively
   */
  async executeLazy(context: MCPInitContext): Promise<MCPServices> {
    console.log('[MCPInitializationPlan] Starting lazy MCP initialization...');
    this.reportProgress('mcp-init', 0, 'MCP initializing in background');

    // Step 1: Register NodeOneCore with MCP Manager (fast, synchronous)
    const mcpManager = await this.registerNodeOneCore(context.nodeOneCore);
    this.reportProgress('mcp-init', 20, 'Memory tools registered');

    // Step 2.5: Register LAMA plans with plan registry (fast)
    await this.registerPlans(context.nodeOneCore);
    this.reportProgress('mcp-init', 30, 'Plans registered');

    // Step 3: Start HTTP API server (fast)
    const lamaAPIServer = await this.startAPIServer();
    this.reportProgress('mcp-init', 40, 'HTTP API server started');

    // Step 4: Initialize MCP Manager in background (slow - deferred)
    // Don't await - let it run in background
    this.initializeMCPManagerBackground(mcpManager);

    console.log('[MCPInitializationPlan] ✅ Core MCP services initialized (servers connecting in background)');

    return {
      mcpManager,
      lamaAPIServer
    };
  }

  private async initializeMCPManagerBackground(mcpManager: any): Promise<void> {
    try {
      console.log('[MCPInitializationPlan] Background: Connecting to MCP servers...');
      this.reportProgress('mcp-init', 40, 'Connecting to MCP servers');

      await mcpManager.init();

      this.reportProgress('mcp-init', 100, 'MCP servers connected');
      console.log('[MCPInitializationPlan] Background: ✅ MCP servers connected');
    } catch (error) {
      console.error('[MCPInitializationPlan] Background: MCP Manager initialization failed:', error);
      this.reportProgress('mcp-init', 100, 'MCP initialization failed (tools unavailable)');
    }
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
