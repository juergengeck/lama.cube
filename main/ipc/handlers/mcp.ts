/**
 * MCP Server IPC Handlers (TypeScript)
 * Manages Model Context Protocol server configuration and operations
 */

import { IpcMainInvokeEvent } from 'electron';
import { mcpManager } from '@mcp/core';

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
   */
  async getStatus(event: IpcMainInvokeEvent): Promise<MCPStatusResult> {
    try {
      const state = mcpManager.debugState();

      return {
        success: true,
        data: {
          running: state.initialized,
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
  }
};

export default mcpHandlers;
