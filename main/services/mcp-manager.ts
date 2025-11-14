/**
 * MCP Manager for Main Process
 * Manages Model Context Protocol servers in Node.js environment
 * Provides IPC bridge for renderer process to access MCP tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MCPTool {
  name: string;
  fullName: string;
  description?: string;
  inputSchema?: any;
  server?: string;
}

class MCPManager {
  public clients: Map<string, any>;
  public servers: any[];
  public tools: Map<string, MCPTool>;
  public isInitialized: boolean;
  public memoryTools: any;
  public assemblyTools: any;
  public nodeOneCore: any;

  constructor() {
    this.clients = new Map();
    this.tools = new Map();
    this.servers = [];
    this.isInitialized = false;
    this.memoryTools = null;
    this.assemblyTools = null;
    this.nodeOneCore = null;
  }

  /**
   * Get default server configurations
   * These are created on first run if no servers exist in the database
   */
  getDefaultServerConfigurations(): any {
    const projectRoot = path.resolve(__dirname, '../..');
    const homeDir = os.homedir();

    return [
      {
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', projectRoot],
        description: 'File system operations for the project directory',
        enabled: true
      },
      {
        name: 'filesystem-home',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', homeDir],
        description: 'File system operations for home directory',
        enabled: true
      }
      // Shell server not yet available in npm registry
      // {
      //   name: 'shell',
      //   command: 'npx',
      //   args: ['-y', '@modelcontextprotocol/server-shell'],
      //   description: 'Shell command execution',
      //   enabled: true
      // }
    ];
  }

  /**
   * Load server configurations from ONE.core database
   */
  async loadServersFromDatabase(): Promise<any[]> {
    if (!this.nodeOneCore) {
      console.warn('[MCPManager] NodeOneCore not available, cannot load servers from database');
      return [];
    }

    try {
      const { getIdObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');

      // Get user email for config lookup
      const userEmail = this.nodeOneCore.ownerId; // Using owner ID as identifier

      // Try to get user's MCP configuration
      const configIdHash = await calculateIdHashOfObj({
        $type$: 'MCPServerConfig',
        userEmail: userEmail,
        servers: [],
        updatedAt: 0
      });

      let config: any;
      try {
        config = await getIdObject(configIdHash);
      } catch (e) {
        // Config doesn't exist yet - first run
        console.log('[MCPManager] No MCP configuration found in database');
        return [];
      }

      if (!config || !config.servers || config.servers.length === 0) {
        console.log('[MCPManager] MCP configuration exists but has no servers');
        return [];
      }

      // Load each server object
      const servers = [];
      for (const serverIdHash of config.servers) {
        try {
          const server: any = await getIdObject(serverIdHash);
          if (server && server.enabled) {
            servers.push({
              name: server.name,
              command: server.command,
              args: server.args,
              description: server.description,
              enabled: server.enabled
            });
          }
        } catch (e) {
          console.warn(`[MCPManager] Failed to load server ${String(serverIdHash).substring(0, 8)}:`, (e as Error).message);
        }
      }

      console.log(`[MCPManager] Loaded ${servers.length} servers from database`);
      return servers;
    } catch (error) {
      console.error('[MCPManager] Failed to load servers from database:', error);
      return [];
    }
  }

  /**
   * Ensure default servers exist in database
   * Creates them if they don't exist
   */
  async ensureDefaultServers(): Promise<void> {
    if (!this.nodeOneCore) {
      console.warn('[MCPManager] NodeOneCore not available, cannot ensure default servers');
      return;
    }

    try {
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');

      const userEmail = this.nodeOneCore.ownerId;

      // Check if config exists
      const configIdHash = await calculateIdHashOfObj({
        $type$: 'MCPServerConfig',
        userEmail: userEmail,
        servers: [],
        updatedAt: 0
      });

      const { getIdObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      let config: any;
      let isNewConfig = false;

      try {
        config = await getIdObject(configIdHash);
      } catch (e) {
        // Config doesn't exist - create it
        isNewConfig = true;
      }

      if (isNewConfig || !config || !config.servers || config.servers.length === 0) {
        console.log('[MCPManager] Creating default MCP server configurations...');

        const defaultConfigs = this.getDefaultServerConfigurations();
        const serverIdHashes = [];

        // Create each server object
        for (const serverConfig of defaultConfigs) {
          const server = {
            $type$: 'MCPServer' as const,
            name: serverConfig.name,
            command: serverConfig.command,
            args: serverConfig.args,
            description: serverConfig.description,
            enabled: serverConfig.enabled,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          const result = await storeVersionedObject(server as any);
          serverIdHashes.push(result.idHash);
          console.log(`[MCPManager] Created server: ${serverConfig.name}`);
        }

        // Create or update config
        const newConfig = {
          $type$: 'MCPServerConfig' as const,
          userEmail: userEmail,
          servers: serverIdHashes,
          updatedAt: Date.now()
        };

        await storeVersionedObject(newConfig as any);
        console.log('[MCPManager] ✅ Default MCP servers created and saved to database');
      } else {
        console.log('[MCPManager] MCP servers already configured in database');
      }
    } catch (error) {
      console.error('[MCPManager] Failed to ensure default servers:', error);
      throw error;
    }
  }

  /**
   * Add a new MCP server and persist it to database
   */
  async addServer(config: any): Promise<void> {
    if (!this.nodeOneCore) {
      throw new Error('NodeOneCore not available');
    }

    try {
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');
      const { getIdObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

      const userEmail = this.nodeOneCore.ownerId;

      // Create server object
      const server = {
        $type$: 'MCPServer' as const,
        name: config.name,
        command: config.command,
        args: config.args,
        description: config.description || '',
        enabled: config.enabled !== false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const serverResult = await storeVersionedObject(server as any);

      // Update config to include this server
      const configIdHash = await calculateIdHashOfObj({
        $type$: 'MCPServerConfig',
        userEmail: userEmail,
        servers: [],
        updatedAt: 0
      });

      let existingConfig: any;
      try {
        existingConfig = await getIdObject(configIdHash);
      } catch (e) {
        // Config doesn't exist yet
        existingConfig = null;
      }

      const updatedConfig = {
        $type$: 'MCPServerConfig' as const,
        userEmail: userEmail,
        servers: existingConfig ? [...existingConfig.servers, serverResult.idHash] : [serverResult.idHash],
        updatedAt: Date.now()
      };

      await storeVersionedObject(updatedConfig as any);

      // Connect to the new server
      await this.connectToServer(config);

      console.log(`[MCPManager] ✅ Added and connected to server: ${config.name}`);
    } catch (error) {
      console.error(`[MCPManager] Failed to add server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * List all MCP servers from database
   */
  async listServers(): Promise<any[]> {
    if (!this.nodeOneCore) {
      throw new Error('NodeOneCore not available');
    }

    try {
      const servers = await this.loadServersFromDatabase();
      return servers;
    } catch (error) {
      console.error('[MCPManager] Failed to list servers:', error);
      throw error;
    }
  }

  /**
   * Update an existing MCP server in database
   */
  async updateServer(name: string, updates: any): Promise<void> {
    if (!this.nodeOneCore) {
      throw new Error('NodeOneCore not available');
    }

    try {
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');
      const { getIdObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

      // Find the existing server
      const serverIdHash = await calculateIdHashOfObj({
        $type$: 'MCPServer',
        name: name,
        command: '',
        args: [],
        description: '',
        enabled: false,
        createdAt: 0,
        updatedAt: 0
      });

      let existingServer: any;
      try {
        existingServer = await getIdObject(serverIdHash);
      } catch (e) {
        throw new Error(`Server ${name} not found`);
      }

      // Merge updates with existing server
      const updatedServer = {
        $type$: 'MCPServer' as const,
        name: existingServer.name, // Name cannot be changed (it's the ID)
        command: updates.command !== undefined ? updates.command : existingServer.command,
        args: updates.args !== undefined ? updates.args : existingServer.args,
        description: updates.description !== undefined ? updates.description : existingServer.description,
        enabled: updates.enabled !== undefined ? updates.enabled : existingServer.enabled,
        createdAt: existingServer.createdAt,
        updatedAt: Date.now()
      };

      await storeVersionedObject(updatedServer as any);

      // If enabled state changed, connect or disconnect
      if (updates.enabled !== undefined && updates.enabled !== existingServer.enabled) {
        if (updates.enabled) {
          await this.connectToServer(updatedServer);
        } else {
          const client = this.clients.get(name);
          if (client) {
            await client.client.close();
            this.clients.delete(name);

            // Remove tools from this server
            const toolsToRemove = Array.from(this.tools.entries())
              .filter(([_, tool]) => tool.server === name)
              .map(([key]) => key);

            for (const key of toolsToRemove) {
              this.tools.delete(key);
            }
          }
        }
      }

      console.log(`[MCPManager] ✅ Updated server: ${name}`);
    } catch (error) {
      console.error(`[MCPManager] Failed to update server ${name}:`, error);
      throw error;
    }
  }

  /**
   * Remove an MCP server from database and disconnect
   */
  async removeServer(name: string): Promise<void> {
    if (!this.nodeOneCore) {
      throw new Error('NodeOneCore not available');
    }

    try {
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');
      const { getIdObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

      const userEmail = this.nodeOneCore.ownerId;

      // Get current config
      const configIdHash = await calculateIdHashOfObj({
        $type$: 'MCPServerConfig',
        userEmail: userEmail,
        servers: [],
        updatedAt: 0
      });

      const config: any = await getIdObject(configIdHash);

      if (!config || !config.servers) {
        throw new Error('No MCP configuration found');
      }

      // Find and remove the server
      const serverIdHash = await calculateIdHashOfObj({
        $type$: 'MCPServer',
        name: name,
        command: '',
        args: [],
        description: '',
        enabled: false,
        createdAt: 0,
        updatedAt: 0
      });

      const updatedServers = config.servers.filter((hash: any) => hash !== serverIdHash);

      if (updatedServers.length === config.servers.length) {
        throw new Error(`Server ${name} not found in configuration`);
      }

      // Update config
      const updatedConfig = {
        $type$: 'MCPServerConfig' as const,
        userEmail: userEmail,
        servers: updatedServers,
        updatedAt: Date.now()
      };

      await storeVersionedObject(updatedConfig as any);

      // Disconnect the server
      const client = this.clients.get(name);
      if (client) {
        await client.client.close();
        this.clients.delete(name);

        // Remove tools from this server
        const toolsToRemove = Array.from(this.tools.entries())
          .filter(([_, tool]) => tool.server === name)
          .map(([key]) => key);

        for (const key of toolsToRemove) {
          this.tools.delete(key);
        }
      }

      console.log(`[MCPManager] ✅ Removed server: ${name}`);
    } catch (error) {
      console.error(`[MCPManager] Failed to remove server ${name}:`, error);
      throw error;
    }
  }

  /**
   * Set NodeOneCore reference for memory tools
   * Called after ONE.core is initialized
   */
  setNodeOneCore(nodeOneCore: any): void {
    this.nodeOneCore = nodeOneCore;

    // Initialize memory tools
    if (nodeOneCore) {
      import('./mcp/memory-tools.js').then(({ MemoryTools }) => {
        this.memoryTools = new MemoryTools(nodeOneCore);

        // Register memory tool definitions
        const toolDefs = this.memoryTools.getToolDefinitions();
        for (const toolDef of toolDefs) {
          this.tools.set(toolDef.name, {
            name: toolDef.name,
            fullName: toolDef.name,
            description: toolDef.description,
            inputSchema: toolDef.inputSchema,
            server: 'memory' // Virtual server for memory tools
          });
        }

        console.log(`[MCPManager] Registered ${toolDefs.length} memory tools`);
      }).catch(err => {
        console.error('[MCPManager] Failed to load memory tools:', err);
      });

      // Initialize assembly tools
      import('@mcp/core/tools/AssemblyTools').then(async ({ AssemblyTools }) => {
        this.assemblyTools = new AssemblyTools(nodeOneCore);
        await this.assemblyTools.init();

        // Register assembly tool definitions
        const toolDefs = this.assemblyTools.getToolDefinitions();
        for (const toolDef of toolDefs) {
          this.tools.set(toolDef.name, {
            name: toolDef.name,
            fullName: toolDef.name,
            description: toolDef.description,
            inputSchema: toolDef.inputSchema,
            server: 'assembly' // Virtual server for assembly tools
          });
        }

        console.log(`[MCPManager] Registered ${toolDefs.length} assembly tools`);
      }).catch(err => {
        console.error('[MCPManager] Failed to load assembly tools:', err);
      });
    }
  }

  /**
   * Wrap a promise with a timeout
   * Throws if the promise doesn't resolve within the timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  }

  async init(): Promise<any> {
    if (this.isInitialized) {
      console.log('[MCPManager] Already initialized');
      return;
    }

    console.log('[MCPManager] Initializing MCP servers...');

    // Ensure default servers exist in database (first run)
    await this.ensureDefaultServers();

    // Load servers from database
    this.servers = await this.loadServersFromDatabase();

    // If no servers loaded (shouldn't happen after ensureDefaultServers), use defaults
    if (this.servers.length === 0) {
      console.warn('[MCPManager] No servers loaded from database, using in-memory defaults');
      this.servers = this.getDefaultServerConfigurations();
    }

    // Connect to all enabled servers in parallel with 10s timeout per server
    const connectionPromises = this.servers
      .filter(server => server.enabled !== false)
      .map(server =>
        this.withTimeout(
          this.connectToServer(server),
          10000,
          `Connection to ${server.name} timed out after 10s`
        ).catch(error => {
          console.error(`[MCPManager] Failed to connect to ${server.name}:`, (error as Error).message);
          return null; // Return null for failed connections
        })
      );

    await Promise.allSettled(connectionPromises);

    this.isInitialized = true;
    console.log(`[MCPManager] ✅ Initialized with ${this.tools.size} tools from ${this.clients.size} servers`);
  }

  async connectToServer(server: any): Promise<any> {
    console.log(`[MCPManager] Connecting to ${server.name}...`);
    
    try {
      const transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: {
          ...process.env,
          // Add any required environment variables
        }
      });
      
      const client = new Client({
        name: `lama-electron-${server.name}`,
        version: '1.0.0'
      }, {
        capabilities: {}
      });
      
      await client.connect(transport);
      this.clients.set(server.name, { client, transport });
      
      // Discover tools from this server
      try {
        const tools: any = await client.listTools();
        if (tools.tools) {
          const toolNames = [];
          for (const tool of tools.tools) {
            const toolKey = `${server.name}:${tool.name}`;
            this.tools.set(toolKey, {
              name: tool.name,
              description: tool.description || '',
              inputSchema: tool.inputSchema,
              server: server.name,
              fullName: toolKey
            });
            toolNames.push(toolKey);
          }
          // Log all tools at once instead of individually
          if (toolNames.length > 0) {
            console.log(`[MCPManager] Registered ${toolNames.length} tools from ${server.name}`);
          }
        }
      } catch (error) {
        console.warn(`[MCPManager] Failed to list tools for ${server.name}:`, (error as Error).message);
      }
      
      console.log(`[MCPManager] Connected to ${server.name} successfully`);
    } catch (error) {
      console.error(`[MCPManager] Failed to connect to ${server.name}:`, error);
      throw error;
    }
  }

  async shutdown(): Promise<any> {
    console.log('[MCPManager] Shutting down MCP servers...');
    
    for (const [name, { client, transport }] of this.clients) {
      try {
        await client.close();
        console.log(`[MCPManager] Closed ${name}`);
      } catch (error) {
        console.error(`[MCPManager] Error closing ${name}:`, error);
      }
    }
    
    this.clients.clear();
    this.tools.clear();
    this.isInitialized = false;
  }

  getAvailableTools(): any {
    // Filter out memory tools - memory should be automatic context, not explicit tools
    // Memory tools (memory:search, memory:recent, memory:store) cause:
    // 1. Multiple LLM calls (user message → tool call → follow-up)
    // 2. Raw tool results shown to user instead of natural responses
    // 3. Wasted tokens and latency
    //
    // Memory should be automatically included in system prompt BEFORE calling LLM
    return Array.from(this.tools.values()).filter(tool =>
      !tool.fullName.startsWith('memory:') &&
      !tool.fullName.startsWith('subject:')
    );
  }

  /**
   * Get compact tool descriptions (name + 1-line summary only)
   * Drastically reduces prompt size for faster responses
   */
  getCompactToolDescriptions(): string {
    const tools = this.getAvailableTools();
    if (tools.length === 0) {
      return '';
    }

    let description = '\n\n# Available Tools\n\n';

    // Just list tools with 1-line description
    for (const tool of tools) {
      const summary = tool.description?.split('\n')[0] || 'No description';
      description += `• **${tool.fullName}** - ${summary}\n`;
    }

    // Add the meta-tool for getting full details
    description += `• **tool:describe** - Get full documentation for a specific tool\n`;

    description += '\n# Tool Usage\n\n';
    description += 'To use a tool:\n';
    description += '1. If you need details, call: `{"tool":"tool:describe","parameters":{"toolName":"tool-name"}}`\n';
    description += '2. Execute tool: `{"tool":"tool-name","parameters":{...}}`\n\n';
    description += 'Respond with ONLY the JSON (no markdown, no thinking).\n';

    return description;
  }

  /**
   * Get full tool descriptions (original verbose format)
   * Only used for detailed documentation or when specifically requested
   */
  getToolDescriptions(): any {
    const tools = this.getAvailableTools();
    if (tools.length === 0) {
      return '';
    }

    let description = '\n\n# Available Tools\n\n';
    description += 'You have access to the following tools that you can execute:\n\n';

    for (const tool of tools) {
      description += `**${tool.fullName}**\n`;
      if (tool.description) {
        description += `${tool.description}\n`;
      }
      if (tool.inputSchema && tool.inputSchema.properties) {
        description += 'Parameters:\n';
        for (const [paramName, paramDef] of Object.entries(tool.inputSchema.properties)) {
          const def = paramDef as any;
          const required = tool.inputSchema.required?.includes(paramName) ? ' (required)' : ' (optional)';
          description += `  - ${paramName}${required}: ${def.description || def.type || 'no description'}\n`;
        }
      }
      description += '\n';
    }

    description += '\n# Tool Usage\n\n';
    description += 'When you need to use a tool, respond with ONLY the JSON block (no thinking, no explanation):\n\n';
    description += '```json\n';
    description += '{"tool":"tool-name","parameters":{"param":"value"}}\n';
    description += '```\n\n';
    description += 'The system will execute the tool and provide you with the result. Then you can respond with the result formatted for the user.\n';
    description += 'IMPORTANT: Do NOT simulate tool execution - actually call the tool by responding with the JSON.\n';

    return description;
  }

  /**
   * Get full documentation for a specific tool
   */
  getToolDocumentation(toolName: string): string {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return `Tool "${toolName}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`;
    }

    let doc = `# ${tool.fullName}\n\n`;

    if (tool.description) {
      doc += `${tool.description}\n\n`;
    }

    if (tool.inputSchema && tool.inputSchema.properties) {
      doc += '## Parameters\n\n';
      for (const [paramName, paramDef] of Object.entries(tool.inputSchema.properties)) {
        const def = paramDef as any;
        const required = tool.inputSchema.required?.includes(paramName) ? ' (required)' : ' (optional)';
        doc += `• **${paramName}**${required}: ${def.description || def.type || 'no description'}\n`;
      }
    }

    return doc;
  }

  async executeTool(toolName: any, parameters: any, context?: any): Promise<any> {
    // Handle meta-tool: tool:describe
    if (toolName === 'tool:describe') {
      const requestedTool = parameters?.toolName;
      if (!requestedTool) {
        return { content: [{ type: 'text', text: 'Error: toolName parameter required' }] };
      }
      const doc = this.getToolDocumentation(requestedTool);
      return { content: [{ type: 'text', text: doc }] };
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      // Try to find by short name
      const foundTool = Array.from(this.tools.values()).find(t => t.name === toolName);
      if (foundTool) {
        toolName = foundTool.fullName;
      } else {
        throw new Error(`Tool ${toolName} not found`);
      }
    }

    const toolData = tool || this.tools.get(toolName);

    // Handle memory tools (virtual server)
    if (toolData.server === 'memory') {
      if (!this.memoryTools) {
        throw new Error('Memory tools not initialized - ONE.core may not be ready');
      }

      console.log(`[MCPManager] Executing memory tool ${toolName} with params:`, parameters);

      try {
        const result = await this.memoryTools.executeTool(toolName, parameters, context);
        console.log(`[MCPManager] Memory tool ${toolName} executed successfully`);
        return result;
      } catch (error) {
        console.error(`[MCPManager] Memory tool execution failed:`, error);
        throw error;
      }
    }

    // Handle assembly tools (virtual server)
    if (toolData.server === 'assembly') {
      if (!this.assemblyTools) {
        throw new Error('Assembly tools not initialized - ONE.core may not be ready');
      }

      console.log(`[MCPManager] Executing assembly tool ${toolName} with params:`, parameters);

      try {
        const result = await this.assemblyTools.executeTool(toolName, parameters, context);
        console.log(`[MCPManager] Assembly tool ${toolName} executed successfully`);
        return result;
      } catch (error) {
        console.error(`[MCPManager] Assembly tool execution failed:`, error);
        throw error;
      }
    }

    // Handle external MCP server tools
    const serverData = this.clients.get(toolData.server);

    if (!serverData) {
      throw new Error(`Server ${toolData.server} not connected`);
    }

    console.log(`[MCPManager] Executing tool ${toolName} with params:`, parameters);

    try {
      const result: any = await serverData.client.callTool({
        name: toolData.name,
        arguments: parameters
      });

      console.log(`[MCPManager] Tool ${toolName} executed successfully`);
      return result;
    } catch (error) {
      console.error(`[MCPManager] Tool execution failed:`, error);
      throw error;
    }
  }

  /**
   * Store MCP tool call for auditability
   * Stores the tool call as a versioned ONE.core object
   */
  async storeToolCall(toolCallData: {
    id: string;
    toolName: string;
    parameters: any;
    result?: any;
    error?: string;
    timestamp: number;
    duration?: number;
    topicId: string;
    messageHash?: string;
  }): Promise<void> {
    if (!this.nodeOneCore) {
      console.warn('[MCPManager] Cannot store tool call - NodeOneCore not available');
      return;
    }

    const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

    const mcpToolCall = {
      $type$: 'MCPToolCall',
      id: toolCallData.id,
      toolName: toolCallData.toolName,
      parameters: JSON.stringify(toolCallData.parameters),
      result: toolCallData.result ? JSON.stringify(toolCallData.result) : undefined,
      error: toolCallData.error,
      timestamp: toolCallData.timestamp,
      duration: toolCallData.duration,
      topicId: toolCallData.topicId,
      messageHash: toolCallData.messageHash
    };

    await storeVersionedObject(mcpToolCall as any);
    console.log(`[MCPManager] Stored tool call: ${toolCallData.toolName} (ID: ${toolCallData.id})`);
  }

  // Debug method to check state
  debugState(): any {
    return {
      initialized: this.isInitialized,
      servers: this.servers.map((s: any) => s.name),
      connectedClients: Array.from(this.clients.keys()),
      availableTools: Array.from(this.tools.keys()),
      toolCount: this.tools.size
    };
  }

  /**
   * Get MCP tools in Claude API format
   * Converts internal tool definitions to Anthropic's tool schema
   */
  getClaudeTools(): any[] {
    const tools: any[] = [];

    for (const [toolKey, tool] of this.tools.entries()) {
      tools.push({
        name: toolKey,
        description: tool.description || 'No description available',
        input_schema: tool.inputSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      });
    }

    return tools;
  }
}

// Export singleton instance
const mcpManager = new MCPManager();
export default mcpManager;