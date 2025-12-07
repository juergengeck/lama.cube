# MCP Local/Remote Refactor Design

**Date:** 2025-12-07
**Status:** Draft
**Scope:** Refactor `mcp.core` to support local execution (Node.js) and remote execution (browser/mobile via chat)

## Problem

Currently `mcp.core` is tightly coupled to Node.js:
- `MCPManager` uses `StdioClientTransport` to spawn MCP server processes
- `MCPLamaServer` uses `StdioServerTransport` for stdio communication
- Direct use of Node.js modules: `path`, `os`, `process.env`

This prevents browser and mobile platforms from using MCP capabilities.

## Solution

Split `mcp.core` into two submodules:
- `mcp.core/local` - Node.js only, executes MCP tools locally
- `mcp.core/remote` - Platform-agnostic, sends MCP requests via chat to Node.js peers

Non-Node platforms offload MCP execution to connected Node.js instances through LAMA's existing chat infrastructure.

## Package Structure

```
mcp.core/
├── src/
│   ├── interface/          # Tool definitions, types (unchanged)
│   ├── tools/              # MemoryTools, AssemblyTools, PlanRegistry (unchanged)
│   ├── types/              # Shared types (unchanged)
│   ├── local/              # NEW: Node.js-only MCP execution
│   │   ├── index.ts
│   │   ├── MCPManager.ts           # Manages external MCP servers (moved)
│   │   ├── MCPLocalServer.ts       # Executes tools locally (renamed)
│   │   ├── MCPRemoteHandler.ts     # Handles inbound MCP requests from chat
│   │   └── MCPSupplyManager.ts     # Manages supplies and credentials
│   ├── remote/             # NEW: Platform-agnostic remote MCP client
│   │   ├── index.ts
│   │   ├── MCPRemoteClient.ts      # Sends MCP requests via chat
│   │   ├── MCPDemandManager.ts     # Manages demands and received credentials
│   │   └── MCPCredentialCache.ts   # Caches credentials for fast lookup
│   └── index.ts            # Platform-aware exports
```

### Platform Usage

```typescript
// lama.cube (Electron) - main process
import { MCPManager, MCPLocalServer, MCPRemoteHandler, MCPSupplyManager } from '@mcp/core/local';
import { MCPRemoteClient, MCPDemandManager } from '@mcp/core/remote';

// lama.ios / lama.browser
import { MCPRemoteClient, MCPDemandManager } from '@mcp/core/remote';
// Cannot import from '@mcp/core/local' - Node.js only
```

## Authority Model: Supply/Demand

Uses LAMA's existing Supply/Demand pattern for capability management.

### MCPSupply (Node.js user offers MCP service)

```typescript
interface MCPSupply {
  $type$: 'MCPSupply';
  topicId: SHA256IdHash;
  providerPersonId: SHA256IdHash;  // The Node.js user
  allowedTools?: string[];          // Optional: limit which tools
  createdAt: number;
}
```

### MCPDemand (remote user wants MCP service)

```typescript
interface MCPDemand {
  $type$: 'MCPDemand';
  topicId: SHA256IdHash;
  requesterPersonId: SHA256IdHash;  // The mobile/browser user
  createdAt: number;
}
```

### Credential Flow

When Supply and Demand match (same topic, provider accepts requester), a credential is issued. Credentials are:
- **Asymmetric**: Node.js grants to remote, not vice versa
- **Per-participant**: In group chat, each Node.js user controls their own grants
- **Exchanged on connection**: Shared when peers connect, and pushed on change

## Message Types for MCP over Chat

Thin message types that reference immutable ONE.core objects via `isId`.

### MCPRequest

```typescript
interface MCPRequest {
  $type$: 'MCPRequest';
  targetPersonId: SHA256IdHash;      // Which Node.js participant handles this
  toolCall: SHA256Hash<MCPToolCall>; // isId - the request details
}
```

### MCPResponse

```typescript
interface MCPResponse {
  $type$: 'MCPResponse';
  toolCall: SHA256Hash<MCPToolCall>; // Which request this answers
  result: SHA256Hash<MCPToolResult>; // isId - the result details
}
```

### MCPToolResult (new)

```typescript
interface MCPToolResult {
  $type$: 'MCPToolResult';
  toolCallHash: SHA256Hash<MCPToolCall>;  // Links to request
  success: boolean;
  content: string;                         // JSON stringified result
  error?: string;
  executionTime: number;
}
```

### Request/Response Flow

1. Client stores `MCPToolCall` object -> gets hash
2. Client sends `MCPRequest` with that hash in chat
3. Server receives, fetches `MCPToolCall` by hash, executes
4. Server stores `MCPToolResult` -> gets hash
5. Server sends `MCPResponse` with both hashes in chat
6. Client receives, fetches `MCPToolResult` by hash

The hashes ARE the correlation - no separate requestId needed.

## Component Responsibilities

### `mcp.core/local/` (Node.js only)

| Component | Responsibility |
|-----------|----------------|
| `MCPManager` | Manages external MCP servers (filesystem, shell, etc). Unchanged. |
| `MCPLocalServer` | Executes tools locally. Renamed from `MCPLamaServer`. |
| `MCPRemoteHandler` | Listens for `MCPRequest` in chats, validates credentials, executes via `MCPLocalServer`, sends `MCPResponse`. |
| `MCPSupplyManager` | Manages `MCPSupply` objects, issues credentials on demand match, pushes to peers. |

### `mcp.core/remote/` (all platforms)

| Component | Responsibility |
|-----------|----------------|
| `MCPRemoteClient` | Sends `MCPRequest` via chat, awaits `MCPResponse`, returns result to caller. |
| `MCPDemandManager` | Creates `MCPDemand`, receives credentials from suppliers. |
| `MCPCredentialCache` | Holds received credentials, answers "can I call MCP on person X in topic Y?" |

## Integration Points

### Chat System

- New message types `MCPRequest` and `MCPResponse` registered with ONE.core
- Chat UI context menu gains "Enable MCP Service" option (creates `MCPSupply`)
- `MCPRemoteHandler` subscribes to incoming messages, filters for `MCPRequest`

### Connection System

- On connection established: exchange existing MCP credentials for shared topics
- `MCPSupplyManager` and `MCPDemandManager` hook into `ConnectionsModel` events
- Credentials travel via existing CHUM sync

### Initialization

- **Electron**: Initialize both local (for executing) and remote (for calling peers)
- **Mobile/Browser**: Initialize only remote client + demand manager

## UI Extensions

### Message Card Display

| Message Type | Card Display |
|--------------|--------------|
| `MCPDemand` | "Carol is requesting MCP access" + Accept/Decline buttons |
| `MCPSupply` | "Alice enabled MCP service" (informational) |
| `MCPRequest` | "MCP: calling `tool_name`..." (collapsible, shows params) |
| `MCPResponse` | "MCP: result from `tool_name`" (collapsible, shows result/error) |
| Credential issued | "MCP access granted to Carol" (informational) |
| Credential revoked | "MCP access revoked for Carol" (informational) |

### Context Menu Additions

- On chat: "Enable MCP Service" / "Disable MCP Service" (toggles `MCPSupply`)
- On participant: "Request MCP Access" (creates `MCPDemand`)
- On participant with supply: "Revoke MCP Access" (revokes credential)

### Visibility Options

- MCP traffic (`MCPRequest`/`MCPResponse`) can be hidden by default with toggle "Show MCP traffic"
- Service messages (grants, revocations) always visible

## Migration Path

1. Move `MCPManager.ts` to `local/MCPManager.ts`
2. Rename `MCPLamaServer.ts` to `local/MCPLocalServer.ts`
3. Create `local/MCPRemoteHandler.ts` and `local/MCPSupplyManager.ts`
4. Create `remote/` components
5. Register new ONE.core types
6. Update lama.cube to use new imports
7. Add UI for supply/demand management
8. Implement credential exchange in connection flow

## Security Considerations

- Credentials are cryptographically tied to person identity
- Only credential holders can send `MCPRequest`
- Node.js instance validates credential before execution
- All MCP traffic encrypted via existing chat encryption
- Audit trail via immutable `MCPToolCall` and `MCPToolResult` objects
