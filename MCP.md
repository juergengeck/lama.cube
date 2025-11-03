# Model Context Protocol (MCP) Integration

## Overview

LAMA integrates the Model Context Protocol (MCP) to enable AI assistants to use external tools during conversations. The implementation provides:

- **Per-conversation control**: Enable/disable MCP tools for each chat independently
- **Tool call auditability**: All MCP tool invocations stored as ONE.core objects
- **Bidirectional MCP**:
  - **Inbound**: AI participants can use MCP tools (filesystem, memory, cube.core)
  - **Outbound**: External systems can access LAMA tools via MCP server (future)

## Architecture

### Component Overview

```
LLM Manager (lama.core)
├── MCP Manager (lama.cube)
│   ├── Filesystem Tools (28 tools from 2 servers)
│   ├── Memory Tools (3 tools)
│   ├── Cube.core Tools (9 tools)
│   └── Tool Call Storage (ONE.core)
├── MCPTopicConfig Storage
└── Tool Execution & Tracking
```

### Data Model (ONE.core Objects)

All MCP data is stored as versioned ONE.core objects:

#### MCPServer
```typescript
{
  $type$: 'MCPServer',
  name: string,              // Server identifier (ID property)
  command: string,           // Executable command
  args: string[],           // Command arguments
  description: string,       // Human-readable description
  enabled: boolean,          // Server enabled state
  createdAt: number,
  updatedAt: number
}
```

#### MCPServerConfig
```typescript
{
  $type$: 'MCPServerConfig',
  userEmail: string,                    // User identifier (ID property)
  servers: SHA256IdHash<MCPServer>[],  // References to server configs
  updatedAt: number
}
```

#### MCPTopicConfig
```typescript
{
  $type$: 'MCPTopicConfig',
  topicId: string,           // Topic identifier (ID property)
  inboundEnabled: boolean,   // AI can use MCP tools
  outboundEnabled: boolean,  // External access to chat tools
  allowedTools?: string[],   // Tool whitelist (optional)
  createdAt: number,
  updatedAt: number
}
```

#### MCPToolCall
```typescript
{
  $type$: 'MCPToolCall',
  id: string,                // Unique call ID (ID property)
  toolName: string,          // Tool that was invoked
  parameters: string,        // JSON-serialized parameters
  result?: string,           // JSON-serialized result
  error?: string,            // Error message if failed
  timestamp: number,         // Invocation time
  duration?: number,         // Execution time (ms)
  topicId: string,          // Associated conversation
  messageHash?: string       // Message this call relates to
}
```

## Available Tools

### Filesystem Tools (28 total)
From 2 MCP servers (`filesystem` and `filesystem-home`):

- `read_file`, `read_text_file`, `read_media_file`
- `read_multiple_files`
- `write_file`, `edit_file`
- `create_directory`, `list_directory`, `list_directory_with_sizes`
- `directory_tree`
- `move_file`, `search_files`
- `get_file_info`, `list_allowed_directories`

Each tool available for both project directory and home directory.

### Memory Tools (3 total)
Provided by `MemoryTools` class:

- `memory:store` - Store information for later retrieval
- `memory:recall` - Retrieve stored memories
- `memory:search` - Search memories by keyword

### Cube.core Tools (9 total)
Provided by `CubeTools` class for Assembly/Plan operations:

- `cube:createSupply` - Create a Supply object
- `cube:createDemand` - Create a Demand object
- `cube:createAssembly` - Match Supply and Demand
- `cube:createPlan` - Create execution Plan
- `cube:createStory` - Create user Story
- `cube:queryAssemblies` - Search Assemblies
- `cube:queryPlans` - Search Plans
- `cube:getAssembly` - Get Assembly by ID
- `cube:getPlan` - Get Plan by ID

## Configuration UI

### Per-Chat MCP Settings

Access via chat list context menu → "MCP Settings":

- **Inbound MCP**: Toggle to allow AI participants to use MCP tools
- **Outbound MCP**: Toggle to expose chat tools to external MCP clients (future)
- **Available Tools**: Shows count of registered tools
- Settings stored as `MCPTopicConfig` versioned object

### Default Behavior

- MCP disabled by default for all new conversations
- User must explicitly enable per conversation
- Configuration persists across app restarts

## Implementation Flow

### 1. Tool Registration (Startup)

```typescript
// main/core/node-one-core.ts
await mcpManager.init()
// Connects to MCP servers, discovers tools
// Result: 31 tools registered (28 filesystem + 3 memory)

// CubeManager initialized separately
const cubeManager = new CubeManager(nodeOneCore)
await cubeManager.init()
// Result: 9 cube.core tools registered
```

### 2. User Sends Message

```typescript
// AIMessageProcessor → AIAssistantHandler.chatWithAnalysis()
await aiAssistant.chatWithAnalysis(history, modelId, options, topicId)
```

### 3. MCP Configuration Check

```typescript
// lama.core/services/llm-manager.ts
async checkMCPEnabledForTopic(topicId: string): Promise<boolean> {
  // Import ONE.core storage functions
  const { getIdObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js')

  // Get MCPTopicConfig for this topic
  const config = await getIdObject(topicConfigIdHash)

  // Return inboundEnabled flag
  return config?.inboundEnabled ?? false
}
```

If MCP disabled, tools are NOT added to LLM prompt.

### 4. Tool Execution

When AI invokes a tool:

```typescript
// lama.core/services/llm-manager.ts - processToolCalls()
const toolCallId = `mcp-${Date.now()}-${Math.random().toString(36).substring(7)}`
const startTime = Date.now()

try {
  result = await mcpManager.executeTool(toolName, parameters, context)
} finally {
  // Store tool call for auditability
  await mcpManager.storeToolCall({
    id: toolCallId,
    toolName,
    parameters,
    result,
    error: toolCallError,
    timestamp: startTime,
    duration: Date.now() - startTime,
    topicId: context.topicId
  })
}
```

### 5. Tool Call Storage

```typescript
// lama.cube/main/services/mcp-manager.ts
async storeToolCall(toolCallData) {
  const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js')

  const mcpToolCall = {
    $type$: 'MCPToolCall',
    id: toolCallData.id,
    toolName: toolCallData.toolName,
    parameters: JSON.stringify(toolCallData.parameters),
    result: toolCallData.result ? JSON.stringify(toolCallData.result) : undefined,
    error: toolCallData.error,
    timestamp: toolCallData.timestamp,
    duration: toolCallData.duration,
    topicId: toolCallData.topicId
  }

  await storeVersionedObject(mcpToolCall as any)
}
```

## IPC Handlers

MCP configuration is managed via IPC from the renderer:

```typescript
// main/ipc/handlers/mcp.ts

'mcp:listServers' → mcpManager.listServers()
'mcp:addServer' → mcpManager.addServer(config)
'mcp:updateServer' → mcpManager.updateServer(name, config)
'mcp:removeServer' → mcpManager.removeServer(name)
'mcp:getTopicConfig' → Get MCPTopicConfig from ONE.core
'mcp:setTopicConfig' → Store MCPTopicConfig to ONE.core
'mcp:getAvailableTools' → mcpManager.getAvailableTools()
```

## Security & Privacy

### Tool Access Control

- Tools only execute when explicitly enabled per conversation
- No ambient access - user controls which chats can use tools
- Tool calls logged for auditability
- Future: Per-tool permission granularity via `allowedTools` array

### Data Storage

- All MCP data stored locally in ONE.core
- Encrypted at rest (ONE.core encryption)
- Synchronized via CHUM protocol (P2P only)
- No cloud dependencies

### Audit Trail

Every tool invocation creates an immutable `MCPToolCall` object recording:
- What tool was called
- With what parameters
- What result was returned
- Any errors that occurred
- Execution time and conversation context

## File Locations

### Core Implementation
- `/Users/gecko/src/lama/lama.cube/main/services/mcp-manager.ts` - MCP server management
- `/Users/gecko/src/lama/lama.cube/main/services/mcp/cube-tools.js` - Cube.core tools
- `/Users/gecko/src/lama/lama.cube/main/services/mcp/memory-tools.js` - Memory tools
- `/Users/gecko/src/lama/lama.core/services/llm-manager.ts` - Tool execution & storage
- `/Users/gecko/src/lama/lama.cube/main/recipes/mcp-recipes.ts` - ONE.core recipes

### UI Components
- `/Users/gecko/src/lama/lama.cube/electron-ui/src/components/MCPConfigDialog.tsx` - Configuration dialog
- `/Users/gecko/src/lama/lama.cube/electron-ui/src/components/ChatLayout.tsx` - Context menu integration

### IPC Layer
- `/Users/gecko/src/lama/lama.cube/main/ipc/handlers/mcp.ts` - MCP IPC handlers
- `/Users/gecko/src/lama/lama.cube/main/ipc/controller.ts` - Handler registration

## Usage Example

### Enable MCP for a Conversation

1. Right-click conversation in chat list
2. Select "MCP Settings"
3. Toggle "Enable inbound MCP" on
4. Click "Save"
5. AI can now use all 31 available tools

### Disable MCP for a Conversation

1. Right-click conversation in chat list
2. Select "MCP Settings"
3. Toggle "Enable inbound MCP" off
4. Click "Save"
5. AI responses will not include tool usage

### Query Tool Call History

```typescript
// Get all tool calls for a topic
const { queryByType } = await import('@refinio/one.core/lib/storage-versioned-objects.js')

const toolCalls = await queryByType('MCPToolCall', { topicId: 'my-topic' })
toolCalls.forEach(call => {
  console.log(`${call.toolName} - ${call.duration}ms`)
  console.log(`Parameters: ${call.parameters}`)
  console.log(`Result: ${call.result}`)
})
```

## Outbound MCP Server

LAMA exposes its own MCP server that external AI assistants (like Claude Desktop) can connect to.

### Available Outbound Tools

**11 tools exposed via stdout MCP server**:

1. **Chat Tools**
   - `send_message` - Send message to a topic
   - `get_messages` - Retrieve messages from topic
   - `list_topics` - List all conversations

2. **Contact Tools**
   - `get_contacts` - List all contacts
   - `search_contacts` - Search contacts by name/ID

3. **Connection Tools**
   - `list_connections` - List network connections
   - `create_invitation` - Create pairing invitation

4. **LLM Tools**
   - `list_models` - List available AI models
   - `load_model` - Load an AI model

5. **AI Assistant Tools**
   - `create_ai_topic` - Create AI-enabled chat
   - `generate_ai_response` - Generate AI response

### Running the MCP Server

The MCP server runs as a **separate Node.js process** using stdio transport:

```bash
# From lama.cube directory
node dist/mcp-server-standalone.js
```

**Note**: The LAMA desktop app must be running first to initialize NodeOneCore.

### Connecting from Claude Desktop

Add to Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "lama": {
      "command": "node",
      "args": ["/absolute/path/to/lama.cube/dist/mcp-server-standalone.js"]
    }
  }
}
```

After adding configuration:
1. Restart Claude Desktop
2. LAMA tools will appear in Claude's tool menu
3. Ensure LAMA desktop app is running
4. Use tools to interact with LAMA conversations

### How It Works

**Stdio Transport**:
- Claude Desktop spawns MCP server as child process
- Communication via stdin/stdout pipes
- JSON-RPC protocol over stdio
- No network ports required

**Shared State**:
- MCP server uses NodeOneCore singleton
- Same instance as main Electron app
- Shared access to OneDB storage
- Real-time access to conversations and contacts

### Security Considerations

**⚠️ CURRENT LIMITATION: NO ACCESS CONTROL**

The current implementation has **full access** to all LAMA data:
- All conversations (regardless of participants)
- All contacts and connections
- All assemblies and plans
- All AI operations

**This is acceptable for**:
- Personal use (single trusted user)
- Development and testing
- Trusted external clients only

**This is NOT acceptable for**:
- Multi-user deployments
- Untrusted external clients
- Production use without additional security

**Process Isolation**:
- MCP server runs in separate process
- No direct memory sharing with Electron app
- Communication only via ONE.core storage

**Required Access Control (Not Yet Implemented)**:

1. **Per-Chat Access Grants**
   - External clients must be granted access to specific topics
   - Stored as `MCPClientAccess` versioned objects
   - Links client ID → allowed topic IDs
   - Enforced in all chat tool handlers

2. **Per-Assembly Access Grants**
   - Clients must be granted access to specific assemblies
   - Separate from chat access
   - Required for cube.core tool operations

3. **Client Authentication**
   - Each MCP client has unique identifier
   - Cryptographic verification of client identity
   - Revocation support for compromised clients

4. **Audit Trail**
   - All MCP client operations logged
   - Who accessed what and when
   - Stored as `MCPClientAudit` objects

## Future Access Control Data Model

When access control is implemented, these ONE.core objects will be used:

### MCPClientAccess
```typescript
{
  $type$: 'MCPClientAccess',
  clientId: string,              // Unique client identifier (ID property)
  allowedTopics: string[],       // Topic IDs this client can access
  allowedAssemblies: string[],   // Assembly IDs this client can access
  allowedTools: string[],        // Specific tools this client can use
  createdAt: number,
  updatedAt: number,
  revokedAt?: number            // If set, access is revoked
}
```

### MCPClientAudit
```typescript
{
  $type$: 'MCPClientAudit',
  id: string,                    // Unique audit log ID (ID property)
  clientId: string,              // Which client performed action
  toolName: string,              // Which tool was called
  resourceId: string,            // Topic/Assembly ID accessed
  timestamp: number,
  allowed: boolean,              // Whether access was granted
  denialReason?: string         // Why access was denied
}
```

### Implementation Checklist

- [ ] Create MCPClientAccess and MCPClientAudit recipes
- [ ] Add client ID to MCP server startup
- [ ] Modify tool handlers to check access before execution
- [ ] Create UI for managing client access grants
- [ ] Add context menu: "Share with MCP client..."
- [ ] Implement audit log viewer
- [ ] Add client revocation mechanism

## Future Enhancements

### Outbound MCP Improvements (Priority: High)
- **Per-chat access grants** - Most critical security feature
- **Per-assembly access grants** - Required for cube.core security
- **Client authentication** - Cryptographic client verification
- **Audit logging** - Complete operation history
- Tool-level permissions
- Rate limiting per client
- Session management
- Time-based access expiration

### Tool Marketplace
- Share custom tool definitions
- Community-contributed tool servers
- Verified tool signing and trust chain

### Advanced Configuration
- Per-tool permission granularity
- Resource quotas
- Tool result caching
- Execution sandboxing

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Anthropic MCP Integration](https://docs.anthropic.com/mcp)
- [ONE Platform Architecture](./CLAUDE.md)
