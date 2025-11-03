# MCP Quick Start Guide

## What is MCP?

Model Context Protocol (MCP) allows AI assistants to use external tools. LAMA implements MCP in both directions:

- **Inbound**: AI in LAMA can use filesystem, memory, and cube.core tools
- **Outbound**: External AI (like Claude Desktop) can access LAMA conversations

## Inbound MCP (AI uses tools)

### Enable for a Conversation

1. Right-click chat in conversation list
2. Select "MCP Settings"
3. Toggle "Enable inbound MCP" **ON**
4. Click "Save"

Now AI can use 40 tools:
- 28 filesystem tools (read/write files, list directories)
- 3 memory tools (store/recall/search memories)
- 9 cube.core tools (Assembly/Plan operations)

### Disable for a Conversation

Same steps, but toggle **OFF**. AI will not use tools in that chat.

### View Tool Call History

All tool calls are stored as MCPToolCall objects in ONE.core for auditability.

## Outbound MCP (Claude Desktop accesses LAMA)

### ⚠️ Security Warning

**Current implementation has NO access control** - external clients get full access to:
- All conversations
- All contacts
- All assemblies/plans

**Only use with trusted clients on personal machines.** Production deployments need access control implementation (see MCP.md for details).

### Setup

1. **Ensure LAMA app is running** (must initialize NodeOneCore first)

2. **Add to Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
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

3. **Restart Claude Desktop**

4. **Verify** - LAMA tools should appear in Claude's tool menu

### Available Tools

Claude Desktop can now:
- `send_message` - Send messages to LAMA chats
- `get_messages` - Read conversation history
- `list_topics` - See all conversations
- `get_contacts` - List LAMA contacts
- `search_contacts` - Find specific contacts
- `list_connections` - View P2P connections
- `create_invitation` - Generate pairing invites
- `list_models` - See available AI models
- `load_model` - Load an AI model
- `create_ai_topic` - Create AI-enabled chat
- `generate_ai_response` - Get AI responses

### Testing

In Claude Desktop, try:
```
Can you list my LAMA conversations?
```

Claude will use the `list_topics` tool to fetch your chats.

## Architecture Summary

### Inbound MCP
```
AI in LAMA → LLM Manager → MCP Manager → External Tools (filesystem, memory, cube.core)
                                ↓
                        MCPToolCall storage (audit trail)
```

### Outbound MCP
```
Claude Desktop → stdio → mcp-server-standalone.js → NodeOneCore → LAMA data
```

## Troubleshooting

**Inbound MCP not working?**
- Check MCP settings for that conversation (must be enabled)
- Look for MCPToolCall objects in OneDB to verify storage
- Check console for `[LLMManager]` logs

**Outbound MCP not working?**
- Ensure LAMA app is running before starting Claude Desktop
- Check absolute path in claude_desktop_config.json
- Look for `[MCP-Standalone]` logs in terminal
- Verify dist/mcp-server-standalone.js exists (run `npm run build:main`)

**Tools not appearing?**
- MCP disabled by default - must explicitly enable per chat
- Check `mcp:getAvailableTools` IPC handler returns tools

## More Information

See [MCP.md](./MCP.md) for complete documentation including:
- Data models and recipes
- IPC handlers
- Security considerations
- Implementation details
- Future enhancements
