/**
 * MCP Server IPC Handlers (TypeScript)
 * Manages Model Context Protocol server configuration and operations
 */

import { IpcMainInvokeEvent } from 'electron';
import { mcpManager, MCPSupplyManager } from '@mcp/core/local';
import { MCPRemoteAdapter } from '@mcp/core/router';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { PlanRouter } from '@mcp/core/router';

// Singleton instances for supply/demand management
let supplyManager: MCPSupplyManager | null = null;
let remoteAdapter: MCPRemoteAdapter | null = null;
let myPersonId: SHA256IdHash | null = null;

/**
 * Initialize the supply manager and remote adapter
 * Called when the node-one-core is ready
 */
export function initMCPSupplyManager(deps: {
  router: PlanRouter;
  sendMessage: (topicId: SHA256IdHash, message: any) => Promise<void>;
  sendCredential: (targetPersonId: SHA256IdHash, credential: any) => Promise<void>;
  myPersonId: SHA256IdHash;
}): void {
  myPersonId = deps.myPersonId;
  supplyManager = new MCPSupplyManager({
    myPersonId: deps.myPersonId,
    sendCredential: deps.sendCredential
  });
  remoteAdapter = new MCPRemoteAdapter({
    router: deps.router,
    myPersonId: deps.myPersonId,
    sendMessage: deps.sendMessage,
    getCredentialForTopic: (topicId, senderId) => {
      if (!supplyManager) return undefined;
      return supplyManager.hasValidCredential(topicId, senderId)
        ? `${topicId}:${senderId}`
        : undefined;
    }
  });
}

/**
 * Get the supply manager instance
 */
export function getSupplyManager(): MCPSupplyManager | null {
  return supplyManager;
}

/**
 * Get the remote adapter instance
 */
export function getRemoteAdapter(): MCPRemoteAdapter | null {
  return remoteAdapter;
}

interface MCPServer {
  name: string;
  command: string;
  args: string[];
  description: string;
  enabled: boolean;
  createdAt?: number;
  updatedAt?: number;
}

interface MCPListRequest {
  // No parameters needed
}

interface MCPAddRequest {
  config: Omit<MCPServer, 'createdAt' | 'updatedAt'>;
}

interface MCPUpdateRequest {
  name: string;
  config: Partial<MCPServer>;
}

interface MCPRemoveRequest {
  name: string;
}

interface MCPGetTopicConfigRequest {
  topicId: string;
}

interface MCPSetTopicConfigRequest {
  topicId: string;
  config: {
    inboundEnabled: boolean;
    outboundEnabled: boolean;
    allowedTools?: string[];
  };
}

interface MCPGetAvailableToolsRequest {
  // No parameters needed
}

interface MCPListResult {
  success: boolean;
  servers?: MCPServer[];
  error?: string;
}

interface MCPActionResult {
  success: boolean;
  error?: string;
}

interface MCPTopicConfigResult {
  success: boolean;
  config?: {
    inboundEnabled: boolean;
    outboundEnabled: boolean;
    allowedTools?: string[];
  };
  error?: string;
}

interface MCPAvailableToolsResult {
  success: boolean;
  tools?: Array<{
    name: string;
    fullName: string;
    description: string;
    server: string;
  }>;
  error?: string;
}

interface MCPStatusResult {
  success: boolean;
  data?: {
    running: boolean;
    servers: string[];
    connectedClients: string[];
    toolCount: number;
    availableTools: string[];
  };
  error?: string;
}

const mcpHandlers = {
  /**
   * List all configured MCP servers
   */
  async listServers(event: IpcMainInvokeEvent, request?: MCPListRequest): Promise<MCPListResult> {
    try {
      console.log('[MCP] Listing all MCP servers');

      const servers = await mcpManager.listServers();

      return {
        success: true,
        servers
      };
    } catch (error: any) {
      console.error('[MCP] Failed to list servers:', error);
      return {
        success: false,
        error: error.message || 'Failed to list MCP servers'
      };
    }
  },

  /**
   * Add a new MCP server configuration
   */
  async addServer(event: IpcMainInvokeEvent, request: MCPAddRequest): Promise<MCPActionResult> {
    try {
      const { config } = request;
      console.log('[MCP] Adding new MCP server:', config.name);

      // Validate required fields
      if (!config.name || !config.command) {
        throw new Error('Server name and command are required');
      }

      // Add timestamps
      const serverConfig: MCPServer = {
        ...config,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await mcpManager.addServer(serverConfig);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('[MCP] Failed to add server:', error);
      return {
        success: false,
        error: error.message || 'Failed to add MCP server'
      };
    }
  },

  /**
   * Update an existing MCP server configuration
   */
  async updateServer(event: IpcMainInvokeEvent, request: MCPUpdateRequest): Promise<MCPActionResult> {
    try {
      const { name, config } = request;
      console.log('[MCP] Updating MCP server:', name);

      if (!name) {
        throw new Error('Server name is required');
      }

      // Add updated timestamp
      const updatedConfig = {
        ...config,
        updatedAt: Date.now()
      };

      await mcpManager.updateServer(name, updatedConfig);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('[MCP] Failed to update server:', error);
      return {
        success: false,
        error: error.message || 'Failed to update MCP server'
      };
    }
  },

  /**
   * Remove an MCP server configuration
   */
  async removeServer(event: IpcMainInvokeEvent, request: MCPRemoveRequest): Promise<MCPActionResult> {
    try {
      const { name } = request;
      console.log('[MCP] Removing MCP server:', name);

      if (!name) {
        throw new Error('Server name is required');
      }

      await mcpManager.removeServer(name);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('[MCP] Failed to remove server:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove MCP server'
      };
    }
  },

  /**
   * Get MCP configuration for a topic
   */
  async getTopicConfig(event: IpcMainInvokeEvent, request: MCPGetTopicConfigRequest): Promise<MCPTopicConfigResult> {
    try {
      const { topicId } = request;
      console.log('[MCP] Getting topic configuration for:', topicId);

      if (!topicId) {
        throw new Error('Topic ID is required');
      }

      // Import ONE.core functions
      const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');
      const { getIdObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

      // Try to get existing configuration
      const configIdHash = await calculateIdHashOfObj({
        $type$: 'MCPTopicConfig',
        topicId,
        inboundEnabled: false,
        outboundEnabled: false,
        createdAt: 0,
        updatedAt: 0
      } as any);

      let config;
      try {
        config = await getIdObject(configIdHash);
      } catch (e) {
        // No configuration exists yet, return defaults
        return {
          success: true,
          config: {
            inboundEnabled: false,
            outboundEnabled: false,
            allowedTools: []
          }
        };
      }

      return {
        success: true,
        config: {
          inboundEnabled: config.inboundEnabled,
          outboundEnabled: config.outboundEnabled,
          allowedTools: config.allowedTools || []
        }
      };
    } catch (error: any) {
      console.error('[MCP] Failed to get topic configuration:', error);
      return {
        success: false,
        error: error.message || 'Failed to get topic configuration'
      };
    }
  },

  /**
   * Set MCP configuration for a topic
   */
  async setTopicConfig(event: IpcMainInvokeEvent, request: MCPSetTopicConfigRequest): Promise<MCPActionResult> {
    try {
      const { topicId, config } = request;
      console.log('[MCP] Setting topic configuration for:', topicId, config);

      if (!topicId) {
        throw new Error('Topic ID is required');
      }

      // Import ONE.core functions
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

      // Create or update configuration
      const topicConfig = {
        $type$: 'MCPTopicConfig' as const,
        topicId,
        inboundEnabled: config.inboundEnabled,
        outboundEnabled: config.outboundEnabled,
        allowedTools: config.allowedTools || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await storeVersionedObject(topicConfig as any);

      console.log('[MCP] ✅ Topic configuration saved for:', topicId);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('[MCP] Failed to set topic configuration:', error);
      return {
        success: false,
        error: error.message || 'Failed to set topic configuration'
      };
    }
  },

  /**
   * Get list of available MCP tools
   */
  async getAvailableTools(event: IpcMainInvokeEvent, request?: MCPGetAvailableToolsRequest): Promise<MCPAvailableToolsResult> {
    try {
      console.log('[MCP] Getting available tools');

      const tools = mcpManager.getAvailableTools();

      return {
        success: true,
        tools: tools.map((tool: any) => ({
          name: tool.name,
          fullName: tool.fullName,
          description: tool.description || '',
          server: tool.server || 'unknown'
        }))
      };
    } catch (error: any) {
      console.error('[MCP] Failed to get available tools:', error);
      return {
        success: false,
        error: error.message || 'Failed to get available tools'
      };
    }
  },

  /**
   * Get MCP manager status
   * Includes both MCP manager state and HTTP API server status
   */
  async getStatus(event: IpcMainInvokeEvent): Promise<MCPStatusResult> {
    try {
      const state = mcpManager.debugState();

      // Also check HTTP API server status for MCP thin proxy
      let apiServerRunning = false;
      try {
        const { lamaAPIServer } = await import('../../services/lama-api-server.js');
        const apiStatus = lamaAPIServer.getStatus();
        apiServerRunning = apiStatus.running;
      } catch {
        // API server not imported/started
      }

      return {
        success: true,
        data: {
          // running is true if either MCP manager OR HTTP API server is available
          running: state.initialized || apiServerRunning,
          servers: state.servers,
          connectedClients: state.connectedClients,
          toolCount: state.toolCount,
          availableTools: state.availableTools
        }
      };
    } catch (error: any) {
      console.error('[MCP] Failed to get status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get MCP status'
      };
    }
  },

  /**
   * Reconnect MCP servers
   */
  async reconnect(event: IpcMainInvokeEvent): Promise<MCPActionResult> {
    try {
      console.log('[MCP] Reconnecting MCP servers...');

      // Shutdown all servers first
      await mcpManager.shutdown();

      // Re-initialize
      await mcpManager.init();

      console.log('[MCP] ✅ Reconnected successfully');

      return {
        success: true
      };
    } catch (error: any) {
      console.error('[MCP] Failed to reconnect:', error);
      return {
        success: false,
        error: error.message || 'Failed to reconnect MCP servers'
      };
    }
  },

  // ============================================
  // Supply/Demand Handlers (Remote MCP Support)
  // ============================================

  /**
   * Create an MCP supply (enable MCP service for a topic)
   */
  async createSupply(
    event: IpcMainInvokeEvent,
    request: { topicId: string; allowedTools?: string[] }
  ): Promise<MCPActionResult> {
    try {
      const { topicId, allowedTools } = request;
      console.log('[MCP] Creating supply for topic:', topicId);

      if (!supplyManager) {
        throw new Error('MCP supply manager not initialized');
      }

      await supplyManager.createSupply(topicId as SHA256IdHash, allowedTools);

      return { success: true };
    } catch (error: any) {
      console.error('[MCP] Failed to create supply:', error);
      return {
        success: false,
        error: error.message || 'Failed to create MCP supply'
      };
    }
  },

  /**
   * Remove an MCP supply (disable MCP service for a topic)
   */
  async removeSupply(
    event: IpcMainInvokeEvent,
    request: { topicId: string }
  ): Promise<MCPActionResult> {
    try {
      const { topicId } = request;
      console.log('[MCP] Removing supply for topic:', topicId);

      if (!supplyManager) {
        throw new Error('MCP supply manager not initialized');
      }

      await supplyManager.removeSupply(topicId as SHA256IdHash);

      return { success: true };
    } catch (error: any) {
      console.error('[MCP] Failed to remove supply:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove MCP supply'
      };
    }
  },

  /**
   * Check if MCP is enabled for a topic
   */
  async hasSupply(
    event: IpcMainInvokeEvent,
    request: { topicId: string }
  ): Promise<{ success: boolean; hasSupply?: boolean; error?: string }> {
    try {
      const { topicId } = request;

      if (!supplyManager) {
        throw new Error('MCP supply manager not initialized');
      }

      const supply = supplyManager.getSupply(topicId as SHA256IdHash);

      return {
        success: true,
        hasSupply: supply !== undefined
      };
    } catch (error: any) {
      console.error('[MCP] Failed to check supply:', error);
      return {
        success: false,
        error: error.message || 'Failed to check MCP supply'
      };
    }
  },

  /**
   * Get supply details for a topic
   */
  async getSupply(
    event: IpcMainInvokeEvent,
    request: { topicId: string }
  ): Promise<{
    success: boolean;
    supply?: { allowedTools?: string[]; createdAt: number };
    error?: string;
  }> {
    try {
      const { topicId } = request;

      if (!supplyManager) {
        throw new Error('MCP supply manager not initialized');
      }

      const supply = supplyManager.getSupply(topicId as SHA256IdHash);

      if (!supply) {
        return { success: true, supply: undefined };
      }

      return {
        success: true,
        supply: {
          allowedTools: supply.allowedTools,
          createdAt: supply.createdAt
        }
      };
    } catch (error: any) {
      console.error('[MCP] Failed to get supply:', error);
      return {
        success: false,
        error: error.message || 'Failed to get MCP supply'
      };
    }
  },

  /**
   * Handle an incoming MCP demand (credential request)
   * Called when we receive a demand from a remote peer
   */
  async handleDemand(
    event: IpcMainInvokeEvent,
    request: { topicId: string; requesterPersonId: string }
  ): Promise<MCPActionResult> {
    try {
      const { topicId, requesterPersonId } = request;
      console.log('[MCP] Handling demand from:', requesterPersonId);

      if (!supplyManager) {
        throw new Error('MCP supply manager not initialized');
      }

      // Issue credential if we have a supply for this topic
      const demand = {
        $type$: 'MCPDemand' as const,
        topicId: topicId as SHA256IdHash,
        requesterPersonId: requesterPersonId as SHA256IdHash,
        createdAt: Date.now()
      };
      const credential = await supplyManager.handleDemand(demand);

      if (!credential) {
        return {
          success: false,
          error: 'No supply available for this topic'
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[MCP] Failed to handle demand:', error);
      return {
        success: false,
        error: error.message || 'Failed to handle MCP demand'
      };
    }
  },

  /**
   * Handle an incoming MCP request (tool execution)
   * Called when we receive an MCPRequest message
   */
  async handleRequest(
    event: IpcMainInvokeEvent,
    request: { requestData: any; senderPersonId: string; topicId: string }
  ): Promise<MCPActionResult> {
    try {
      const { requestData, senderPersonId, topicId } = request;
      console.log('[MCP] Handling request from:', senderPersonId);

      if (!remoteAdapter) {
        throw new Error('MCP remote adapter not initialized');
      }

      await remoteAdapter.handleRequest(
        requestData,
        senderPersonId as SHA256IdHash,
        topicId as SHA256IdHash
      );

      return { success: true };
    } catch (error: any) {
      console.error('[MCP] Failed to handle request:', error);
      return {
        success: false,
        error: error.message || 'Failed to handle MCP request'
      };
    }
  },

  /**
   * Check if a consumer has a valid credential for a topic
   */
  async hasValidCredential(
    event: IpcMainInvokeEvent,
    request: { topicId: string; consumerPersonId: string }
  ): Promise<{ success: boolean; hasCredential?: boolean; error?: string }> {
    try {
      const { topicId, consumerPersonId } = request;

      if (!supplyManager) {
        throw new Error('MCP supply manager not initialized');
      }

      const hasCredential = supplyManager.hasValidCredential(
        topicId as SHA256IdHash,
        consumerPersonId as SHA256IdHash
      );

      return {
        success: true,
        hasCredential
      };
    } catch (error: any) {
      console.error('[MCP] Failed to check credential:', error);
      return {
        success: false,
        error: error.message || 'Failed to check credential'
      };
    }
  },

  /**
   * Revoke a credential for a consumer
   */
  async revokeCredential(
    event: IpcMainInvokeEvent,
    request: { topicId: string; consumerPersonId: string }
  ): Promise<MCPActionResult> {
    try {
      const { topicId, consumerPersonId } = request;
      console.log('[MCP] Revoking credential for:', consumerPersonId);

      if (!supplyManager) {
        throw new Error('MCP supply manager not initialized');
      }

      await supplyManager.revokeCredential(
        topicId as SHA256IdHash,
        consumerPersonId as SHA256IdHash
      );

      return { success: true };
    } catch (error: any) {
      console.error('[MCP] Failed to revoke credential:', error);
      return {
        success: false,
        error: error.message || 'Failed to revoke credential'
      };
    }
  }
};

export default mcpHandlers;
