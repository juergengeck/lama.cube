# MCP Local/Remote Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `mcp.core` into `local/` (Node.js) and `remote/` (all platforms) submodules to enable browser/mobile MCP support via chat.

**Architecture:** Node.js instances run MCP servers locally. Browser/mobile clients send `MCPRequest` messages through chat to Node.js peers, which execute tools and return `MCPResponse`. Authority controlled via Supply/Demand credential exchange.

**Tech Stack:** TypeScript, ONE.core (storage/recipes), MCP SDK, LAMA chat protocol

**Design Document:** `docs/plans/2025-12-07-mcp-local-remote-refactor-design.md`

---

## Phase 1: Restructure mcp.core Package

### Task 1: Create local/ directory and move MCPManager

**Files:**
- Create: `packages/mcp.core/src/local/index.ts`
- Move: `packages/mcp.core/src/server/MCPManager.ts` → `packages/mcp.core/src/local/MCPManager.ts`

**Step 1: Create local directory and index**

```bash
mkdir -p /Users/gecko/src/lama/packages/mcp.core/src/local
```

**Step 2: Create local/index.ts**

Create file `packages/mcp.core/src/local/index.ts`:

```typescript
/**
 * mcp.core/local - Node.js-only MCP execution
 *
 * This module requires Node.js and cannot be used in browser/mobile.
 * It provides local MCP server management and tool execution.
 */

export * from './MCPManager.js';
export { default as mcpManager } from './MCPManager.js';
```

**Step 3: Move MCPManager.ts**

```bash
mv /Users/gecko/src/lama/packages/mcp.core/src/server/MCPManager.ts /Users/gecko/src/lama/packages/mcp.core/src/local/MCPManager.ts
```

**Step 4: Verify file exists in new location**

```bash
ls -la /Users/gecko/src/lama/packages/mcp.core/src/local/MCPManager.ts
```

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(mcp.core): move MCPManager to local/"
```

---

### Task 2: Rename MCPLamaServer to MCPLocalServer

**Files:**
- Move: `packages/mcp.core/src/server/MCPLamaServer.ts` → `packages/mcp.core/src/local/MCPLocalServer.ts`
- Modify: `packages/mcp.core/src/local/MCPLocalServer.ts` (rename class)

**Step 1: Move file**

```bash
mv /Users/gecko/src/lama/packages/mcp.core/src/server/MCPLamaServer.ts /Users/gecko/src/lama/packages/mcp.core/src/local/MCPLocalServer.ts
```

**Step 2: Rename class in file**

In `packages/mcp.core/src/local/MCPLocalServer.ts`, replace:
- `export class LamaMCPServer` → `export class MCPLocalServer`
- `export default LamaMCPServer` → `export default MCPLocalServer`
- Update JSDoc header to reflect new name

**Step 3: Update local/index.ts exports**

Add to `packages/mcp.core/src/local/index.ts`:

```typescript
export * from './MCPLocalServer.js';
export { default as MCPLocalServer } from './MCPLocalServer.js';
```

**Step 4: Remove empty server/ directory if empty**

```bash
rmdir /Users/gecko/src/lama/packages/mcp.core/src/server 2>/dev/null || echo "server/ not empty or already removed"
```

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(mcp.core): rename MCPLamaServer to MCPLocalServer in local/"
```

---

### Task 3: Create remote/ directory structure

**Files:**
- Create: `packages/mcp.core/src/remote/index.ts`
- Create: `packages/mcp.core/src/remote/types.ts`

**Step 1: Create remote directory**

```bash
mkdir -p /Users/gecko/src/lama/packages/mcp.core/src/remote
```

**Step 2: Create remote/types.ts**

Create file `packages/mcp.core/src/remote/types.ts`:

```typescript
/**
 * MCP Remote Types
 * Types for MCP communication over chat protocol
 */

import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';

/**
 * MCPSupply - Node.js user offers MCP service in a chat
 */
export interface MCPSupply {
  $type$: 'MCPSupply';
  topicId: SHA256IdHash;
  providerPersonId: SHA256IdHash;
  allowedTools?: string[];
  createdAt: number;
}

/**
 * MCPDemand - Remote user requests MCP access in a chat
 */
export interface MCPDemand {
  $type$: 'MCPDemand';
  topicId: SHA256IdHash;
  requesterPersonId: SHA256IdHash;
  createdAt: number;
}

/**
 * MCPCredential - Issued when Supply matches Demand
 */
export interface MCPCredential {
  $type$: 'MCPCredential';
  topicId: SHA256IdHash;
  providerPersonId: SHA256IdHash;
  consumerPersonId: SHA256IdHash;
  allowedTools?: string[];
  issuedAt: number;
  revokedAt?: number;
}

/**
 * MCPRequest - Sent in chat to request tool execution
 */
export interface MCPRequest {
  $type$: 'MCPRequest';
  targetPersonId: SHA256IdHash;
  toolCall: SHA256Hash;  // Reference to MCPToolCall object
}

/**
 * MCPResponse - Sent in chat with tool execution result
 */
export interface MCPResponse {
  $type$: 'MCPResponse';
  toolCall: SHA256Hash;  // Which request this answers
  result: SHA256Hash;    // Reference to MCPToolResult object
}

/**
 * MCPToolResult - Stored result of tool execution
 */
export interface MCPToolResultObject {
  $type$: 'MCPToolResult';
  toolCallHash: SHA256Hash;
  success: boolean;
  content: string;  // JSON stringified result
  error?: string;
  executionTime: number;
}
```

**Step 3: Create remote/index.ts**

Create file `packages/mcp.core/src/remote/index.ts`:

```typescript
/**
 * mcp.core/remote - Platform-agnostic MCP client
 *
 * This module works on all platforms (Node.js, browser, mobile).
 * It sends MCP requests via chat to Node.js peers.
 */

export * from './types.js';
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(mcp.core): add remote/ directory with types"
```

---

### Task 4: Add recipes for new types

**Files:**
- Modify: `packages/mcp.core/src/recipes/mcp-recipes.ts`

**Step 1: Add MCPSupply recipe**

Add to `packages/mcp.core/src/recipes/mcp-recipes.ts` before `MCPRecipes` array:

```typescript
/**
 * MCPSupply - Node.js user offers MCP service in a topic
 */
export const MCPSupplyRecipe = {
  $type$: 'Recipe',
  name: 'MCPSupply',
  rule: [
    {
      itemprop: 'topicId',
      isId: true,
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'providerPersonId',
      isId: true,
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'allowedTools',
      itemtype: {
        type: 'bag',
        item: { type: 'string' }
      },
      optional: true
    },
    {
      itemprop: 'createdAt',
      itemtype: { type: 'number' }
    }
  ]
};

/**
 * MCPDemand - Remote user requests MCP access in a topic
 */
export const MCPDemandRecipe = {
  $type$: 'Recipe',
  name: 'MCPDemand',
  rule: [
    {
      itemprop: 'topicId',
      isId: true,
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'requesterPersonId',
      isId: true,
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'createdAt',
      itemtype: { type: 'number' }
    }
  ]
};

/**
 * MCPCredential - Issued when Supply matches Demand
 */
export const MCPCredentialRecipe = {
  $type$: 'Recipe',
  name: 'MCPCredential',
  rule: [
    {
      itemprop: 'topicId',
      isId: true,
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'providerPersonId',
      isId: true,
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'consumerPersonId',
      isId: true,
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'allowedTools',
      itemtype: {
        type: 'bag',
        item: { type: 'string' }
      },
      optional: true
    },
    {
      itemprop: 'issuedAt',
      itemtype: { type: 'number' }
    },
    {
      itemprop: 'revokedAt',
      itemtype: { type: 'number' },
      optional: true
    }
  ]
};

/**
 * MCPRequest - Chat message requesting tool execution
 */
export const MCPRequestRecipe = {
  $type$: 'Recipe',
  name: 'MCPRequest',
  rule: [
    {
      itemprop: 'targetPersonId',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'toolCall',
      isId: true,
      itemtype: {
        type: 'referenceToObj',
        allowedTypes: new Set(['MCPToolCall'])
      }
    }
  ]
};

/**
 * MCPResponse - Chat message with tool execution result
 */
export const MCPResponseRecipe = {
  $type$: 'Recipe',
  name: 'MCPResponse',
  rule: [
    {
      itemprop: 'toolCall',
      isId: true,
      itemtype: {
        type: 'referenceToObj',
        allowedTypes: new Set(['MCPToolCall'])
      }
    },
    {
      itemprop: 'result',
      itemtype: {
        type: 'referenceToObj',
        allowedTypes: new Set(['MCPToolResult'])
      }
    }
  ]
};

/**
 * MCPToolResult - Stored result of tool execution (for remote)
 */
export const MCPToolResultRecipe = {
  $type$: 'Recipe',
  name: 'MCPToolResult',
  rule: [
    {
      itemprop: 'toolCallHash',
      isId: true,
      itemtype: {
        type: 'referenceToObj',
        allowedTypes: new Set(['MCPToolCall'])
      }
    },
    {
      itemprop: 'success',
      itemtype: { type: 'boolean' }
    },
    {
      itemprop: 'content',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'error',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'executionTime',
      itemtype: { type: 'number' }
    }
  ]
};
```

**Step 2: Update MCPRecipes export array**

Update the `MCPRecipes` array at end of file:

```typescript
export const MCPRecipes = [
  MCPServerRecipe,
  MCPServerConfigRecipe,
  MCPTopicConfigRecipe,
  MCPToolCallRecipe,
  MCPSupplyRecipe,
  MCPDemandRecipe,
  MCPCredentialRecipe,
  MCPRequestRecipe,
  MCPResponseRecipe,
  MCPToolResultRecipe
];
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(mcp.core): add recipes for Supply/Demand/Credential/Request/Response"
```

---

### Task 5: Update main index.ts exports

**Files:**
- Modify: `packages/mcp.core/src/index.ts`

**Step 1: Update index.ts**

Replace contents of `packages/mcp.core/src/index.ts`:

```typescript
/**
 * mcp.core - Model Context Protocol integration for LAMA
 *
 * Submodules:
 * - @mcp/core/local - Node.js only, local MCP execution
 * - @mcp/core/remote - All platforms, remote MCP via chat
 *
 * Common exports available from main entry point.
 */

// Common exports (platform-agnostic)
export * from './interface/index.js';
export * from './tools/index.js';
export * from './recipes/mcp-recipes.js';
export * from './types/mcp-types.js';

// Re-export remote types (platform-agnostic)
export * from './remote/types.js';

// Note: local/ exports require Node.js - import directly:
// import { MCPManager, MCPLocalServer } from '@mcp/core/local';
```

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor(mcp.core): update main index.ts exports"
```

---

### Task 6: Update package.json exports

**Files:**
- Modify: `packages/mcp.core/package.json`

**Step 1: Update exports field**

In `packages/mcp.core/package.json`, update the `exports` field:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./local": {
      "import": "./dist/local/index.js",
      "types": "./dist/local/index.d.ts"
    },
    "./local/*": {
      "import": "./dist/local/*.js",
      "types": "./dist/local/*.d.ts"
    },
    "./remote": {
      "import": "./dist/remote/index.js",
      "types": "./dist/remote/index.d.ts"
    },
    "./remote/*": {
      "import": "./dist/remote/*.js",
      "types": "./dist/remote/*.d.ts"
    },
    "./tools/*": {
      "import": "./dist/tools/*.js",
      "types": "./dist/tools/*.d.ts"
    },
    "./interface/*": {
      "import": "./dist/interface/*.js",
      "types": "./dist/interface/*.d.ts"
    },
    "./recipes/*": {
      "import": "./dist/recipes/*.js",
      "types": "./dist/recipes/*.d.ts"
    }
  }
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "build(mcp.core): add local/ and remote/ to package exports"
```

---

### Task 7: Build and verify mcp.core

**Step 1: Build mcp.core**

```bash
cd /Users/gecko/src/lama/packages/mcp.core && npm run build
```

**Step 2: Verify local/ exports exist**

```bash
ls -la /Users/gecko/src/lama/packages/mcp.core/dist/local/
```

Expected: `index.js`, `index.d.ts`, `MCPManager.js`, `MCPManager.d.ts`, `MCPLocalServer.js`, `MCPLocalServer.d.ts`

**Step 3: Verify remote/ exports exist**

```bash
ls -la /Users/gecko/src/lama/packages/mcp.core/dist/remote/
```

Expected: `index.js`, `index.d.ts`, `types.js`, `types.d.ts`

**Step 4: Commit if build succeeds**

```bash
git add -A && git commit -m "build(mcp.core): verify local/ and remote/ build successfully"
```

---

## Phase 2: Update lama.cube imports

### Task 8: Update lama.cube imports to use @mcp/core/local

**Files:**
- Modify: `packages/lama.cube/main/ipc/plans/mcp.ts`
- Modify: `packages/lama.cube/main/ipc/plans/ai.ts`
- Modify: `packages/lama.cube/main/core/ai-assistant-handler-adapter.ts`
- Modify: `packages/lama.cube/main/services/mcp-lama-server.ts`
- Modify: `packages/lama.cube/main/services/lama-api-server.ts`

**Step 1: Update mcp.ts**

In `packages/lama.cube/main/ipc/plans/mcp.ts`, change:

```typescript
// Before
import { mcpManager } from '@mcp/core';

// After
import { mcpManager } from '@mcp/core/local';
```

**Step 2: Update ai.ts**

In `packages/lama.cube/main/ipc/plans/ai.ts`, change:

```typescript
// Before
import { mcpManager } from '@mcp/core';

// After
import { mcpManager } from '@mcp/core/local';
```

**Step 3: Update ai-assistant-handler-adapter.ts**

In `packages/lama.cube/main/core/ai-assistant-handler-adapter.ts`, change:

```typescript
// Before
import { mcpManager } from '@mcp/core';

// After
import { mcpManager } from '@mcp/core/local';
```

**Step 4: Update mcp-lama-server.ts**

In `packages/lama.cube/main/services/mcp-lama-server.ts`, the imports from `@mcp/core` for `planRegistry`, `getPlanMetaToolDefinitions`, `handleDiscoverPlans`, `handleCallPlan` remain unchanged (they're in tools/, not local/).

**Step 5: Verify lama-api-server.ts**

In `packages/lama.cube/main/services/lama-api-server.ts`, the imports from `@mcp/core` for `handleDiscoverPlans`, `handleCallPlan` remain unchanged (they're in tools/).

**Step 6: Build lama.cube to verify imports**

```bash
cd /Users/gecko/src/lama/packages/lama.cube && npm run build:main
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor(lama.cube): update imports to use @mcp/core/local"
```

---

## Phase 3: Implement Remote Components

### Task 9: Create MCPCredentialCache

**Files:**
- Create: `packages/mcp.core/src/remote/MCPCredentialCache.ts`
- Modify: `packages/mcp.core/src/remote/index.ts`

**Step 1: Create MCPCredentialCache.ts**

Create file `packages/mcp.core/src/remote/MCPCredentialCache.ts`:

```typescript
/**
 * MCPCredentialCache
 * Caches MCP credentials for fast lookup
 * Answers: "Can I call MCP on person X in topic Y?"
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { MCPCredential } from './types.js';

export class MCPCredentialCache {
  // Map: topicId -> Map: providerPersonId -> credential
  private cache: Map<string, Map<string, MCPCredential>> = new Map();

  /**
   * Add or update a credential in the cache
   */
  addCredential(credential: MCPCredential): void {
    const topicKey = String(credential.topicId);
    const providerKey = String(credential.providerPersonId);

    if (!this.cache.has(topicKey)) {
      this.cache.set(topicKey, new Map());
    }

    this.cache.get(topicKey)!.set(providerKey, credential);
  }

  /**
   * Remove a credential from the cache
   */
  removeCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): void {
    const topicKey = String(topicId);
    const providerKey = String(providerPersonId);

    const topicCredentials = this.cache.get(topicKey);
    if (topicCredentials) {
      topicCredentials.delete(providerKey);
      if (topicCredentials.size === 0) {
        this.cache.delete(topicKey);
      }
    }
  }

  /**
   * Check if we have a valid credential to call MCP on a provider in a topic
   */
  hasCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): boolean {
    const credential = this.getCredential(topicId, providerPersonId);
    if (!credential) return false;
    if (credential.revokedAt) return false;
    return true;
  }

  /**
   * Get credential for a provider in a topic
   */
  getCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): MCPCredential | undefined {
    const topicKey = String(topicId);
    const providerKey = String(providerPersonId);

    return this.cache.get(topicKey)?.get(providerKey);
  }

  /**
   * Get all providers offering MCP in a topic
   */
  getProvidersInTopic(topicId: SHA256IdHash): SHA256IdHash[] {
    const topicKey = String(topicId);
    const topicCredentials = this.cache.get(topicKey);

    if (!topicCredentials) return [];

    return Array.from(topicCredentials.values())
      .filter(c => !c.revokedAt)
      .map(c => c.providerPersonId);
  }

  /**
   * Check if a tool is allowed by credential
   */
  isToolAllowed(topicId: SHA256IdHash, providerPersonId: SHA256IdHash, toolName: string): boolean {
    const credential = this.getCredential(topicId, providerPersonId);
    if (!credential) return false;
    if (credential.revokedAt) return false;

    // If no allowedTools specified, all tools are allowed
    if (!credential.allowedTools || credential.allowedTools.length === 0) {
      return true;
    }

    return credential.allowedTools.includes(toolName);
  }

  /**
   * Clear all cached credentials
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get count of cached credentials
   */
  get size(): number {
    let count = 0;
    for (const topicCredentials of this.cache.values()) {
      count += topicCredentials.size;
    }
    return count;
  }
}

export default MCPCredentialCache;
```

**Step 2: Update remote/index.ts**

Add to `packages/mcp.core/src/remote/index.ts`:

```typescript
export * from './MCPCredentialCache.js';
export { default as MCPCredentialCache } from './MCPCredentialCache.js';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(mcp.core): add MCPCredentialCache to remote/"
```

---

### Task 10: Create MCPDemandManager

**Files:**
- Create: `packages/mcp.core/src/remote/MCPDemandManager.ts`
- Modify: `packages/mcp.core/src/remote/index.ts`

**Step 1: Create MCPDemandManager.ts**

Create file `packages/mcp.core/src/remote/MCPDemandManager.ts`:

```typescript
/**
 * MCPDemandManager
 * Manages MCP demands (requests for MCP access)
 * Creates MCPDemand objects and receives credentials from suppliers
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import type { MCPDemand, MCPCredential } from './types.js';
import { MCPCredentialCache } from './MCPCredentialCache.js';

export class MCPDemandManager {
  private credentialCache: MCPCredentialCache;
  private myPersonId: SHA256IdHash | null = null;

  constructor() {
    this.credentialCache = new MCPCredentialCache();
  }

  /**
   * Initialize with the local user's person ID
   */
  initialize(myPersonId: SHA256IdHash): void {
    this.myPersonId = myPersonId;
  }

  /**
   * Create a demand for MCP access in a topic
   * This signals to Node.js participants that we want MCP access
   */
  async createDemand(topicId: SHA256IdHash): Promise<MCPDemand> {
    if (!this.myPersonId) {
      throw new Error('MCPDemandManager not initialized - call initialize() first');
    }

    const demand: MCPDemand = {
      $type$: 'MCPDemand',
      topicId,
      requesterPersonId: this.myPersonId,
      createdAt: Date.now()
    };

    await storeVersionedObject(demand as any);

    return demand;
  }

  /**
   * Handle incoming credential from a supplier
   * Called when we receive a credential grant
   */
  receiveCredential(credential: MCPCredential): void {
    this.credentialCache.addCredential(credential);
  }

  /**
   * Handle credential revocation
   */
  revokeCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): void {
    this.credentialCache.removeCredential(topicId, providerPersonId);
  }

  /**
   * Check if we have access to a provider's MCP in a topic
   */
  hasAccess(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): boolean {
    return this.credentialCache.hasCredential(topicId, providerPersonId);
  }

  /**
   * Get all providers offering MCP in a topic
   */
  getAvailableProviders(topicId: SHA256IdHash): SHA256IdHash[] {
    return this.credentialCache.getProvidersInTopic(topicId);
  }

  /**
   * Check if a specific tool is allowed
   */
  isToolAllowed(topicId: SHA256IdHash, providerPersonId: SHA256IdHash, toolName: string): boolean {
    return this.credentialCache.isToolAllowed(topicId, providerPersonId, toolName);
  }

  /**
   * Get the credential cache (for advanced use cases)
   */
  getCredentialCache(): MCPCredentialCache {
    return this.credentialCache;
  }
}

export default MCPDemandManager;
```

**Step 2: Update remote/index.ts**

Add to `packages/mcp.core/src/remote/index.ts`:

```typescript
export * from './MCPDemandManager.js';
export { default as MCPDemandManager } from './MCPDemandManager.js';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(mcp.core): add MCPDemandManager to remote/"
```

---

### Task 11: Create MCPRemoteClient

**Files:**
- Create: `packages/mcp.core/src/remote/MCPRemoteClient.ts`
- Modify: `packages/mcp.core/src/remote/index.ts`

**Step 1: Create MCPRemoteClient.ts**

Create file `packages/mcp.core/src/remote/MCPRemoteClient.ts`:

```typescript
/**
 * MCPRemoteClient
 * Sends MCP requests via chat to Node.js peers
 * Platform-agnostic - works on browser, mobile, and Node.js
 */

import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject, getObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import type { MCPRequest, MCPResponse, MCPToolResultObject } from './types.js';
import type { MCPDemandManager } from './MCPDemandManager.js';

export interface MCPRemoteClientDependencies {
  demandManager: MCPDemandManager;
  sendMessage: (topicId: SHA256IdHash, message: any) => Promise<void>;
}

export interface MCPToolCallParams {
  toolName: string;
  parameters: Record<string, unknown>;
  topicId: SHA256IdHash;
  targetPersonId: SHA256IdHash;
}

export class MCPRemoteClient {
  private deps: MCPRemoteClientDependencies;
  private pendingRequests: Map<string, {
    resolve: (result: MCPToolResultObject) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(deps: MCPRemoteClientDependencies) {
    this.deps = deps;
  }

  /**
   * Call a tool on a remote Node.js peer
   */
  async callTool(params: MCPToolCallParams): Promise<MCPToolResultObject> {
    const { toolName, parameters, topicId, targetPersonId } = params;

    // Verify we have access
    if (!this.deps.demandManager.hasAccess(topicId, targetPersonId)) {
      throw new Error(`No MCP access to ${String(targetPersonId).substring(0, 8)} in topic ${String(topicId).substring(0, 8)}`);
    }

    // Verify tool is allowed
    if (!this.deps.demandManager.isToolAllowed(topicId, targetPersonId, toolName)) {
      throw new Error(`Tool ${toolName} not allowed by credential`);
    }

    // Create and store MCPToolCall object
    const toolCallId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const toolCall = {
      $type$: 'MCPToolCall',
      id: toolCallId,
      toolName,
      parameters: JSON.stringify(parameters),
      timestamp: Date.now(),
      topicId: String(topicId)
    };

    const toolCallResult = await storeVersionedObject(toolCall as any);
    const toolCallHash = toolCallResult.hash as SHA256Hash;

    // Create MCPRequest message
    const request: MCPRequest = {
      $type$: 'MCPRequest',
      targetPersonId,
      toolCall: toolCallHash
    };

    // Set up response promise with timeout
    const responsePromise = new Promise<MCPToolResultObject>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(String(toolCallHash));
        reject(new Error(`MCP request timeout after ${this.REQUEST_TIMEOUT}ms`));
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(String(toolCallHash), { resolve, reject, timeout });
    });

    // Send request via chat
    await this.deps.sendMessage(topicId, request);

    return responsePromise;
  }

  /**
   * Handle incoming MCPResponse message
   * Called by message handler when we receive a response
   */
  async handleResponse(response: MCPResponse): Promise<void> {
    const toolCallKey = String(response.toolCall);
    const pending = this.pendingRequests.get(toolCallKey);

    if (!pending) {
      console.warn(`[MCPRemoteClient] Received response for unknown request: ${toolCallKey}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(toolCallKey);

    try {
      // Fetch the result object
      const result = await getObject(response.result) as MCPToolResultObject;
      pending.resolve(result);
    } catch (error) {
      pending.reject(new Error(`Failed to fetch MCP result: ${(error as Error).message}`));
    }
  }

  /**
   * Get list of available MCP providers in a topic
   */
  getAvailableProviders(topicId: SHA256IdHash): SHA256IdHash[] {
    return this.deps.demandManager.getAvailableProviders(topicId);
  }

  /**
   * Check if we have access to a provider
   */
  hasAccess(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): boolean {
    return this.deps.demandManager.hasAccess(topicId, providerPersonId);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [key, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Request cancelled'));
    }
    this.pendingRequests.clear();
  }
}

export default MCPRemoteClient;
```

**Step 2: Update remote/index.ts**

Add to `packages/mcp.core/src/remote/index.ts`:

```typescript
export * from './MCPRemoteClient.js';
export { default as MCPRemoteClient } from './MCPRemoteClient.js';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(mcp.core): add MCPRemoteClient to remote/"
```

---

## Phase 4: Implement Local Handler Components

### Task 12: Create MCPSupplyManager

**Files:**
- Create: `packages/mcp.core/src/local/MCPSupplyManager.ts`
- Modify: `packages/mcp.core/src/local/index.ts`

**Step 1: Create MCPSupplyManager.ts**

Create file `packages/mcp.core/src/local/MCPSupplyManager.ts`:

```typescript
/**
 * MCPSupplyManager
 * Manages MCP supplies (offers of MCP service)
 * Creates MCPSupply objects and issues credentials on demand match
 * Node.js only
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject, getIdObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import type { MCPSupply, MCPDemand, MCPCredential } from '../remote/types.js';

export interface MCPSupplyManagerDependencies {
  myPersonId: SHA256IdHash;
  sendCredential: (targetPersonId: SHA256IdHash, credential: MCPCredential) => Promise<void>;
}

export class MCPSupplyManager {
  private deps: MCPSupplyManagerDependencies;
  // Map: topicId -> MCPSupply
  private supplies: Map<string, MCPSupply> = new Map();
  // Map: topicId -> Set of consumer person IDs with credentials
  private issuedCredentials: Map<string, Set<string>> = new Map();

  constructor(deps: MCPSupplyManagerDependencies) {
    this.deps = deps;
  }

  /**
   * Create a supply (offer MCP service in a topic)
   * Called when user enables MCP in chat context menu
   */
  async createSupply(topicId: SHA256IdHash, allowedTools?: string[]): Promise<MCPSupply> {
    const supply: MCPSupply = {
      $type$: 'MCPSupply',
      topicId,
      providerPersonId: this.deps.myPersonId,
      allowedTools,
      createdAt: Date.now()
    };

    await storeVersionedObject(supply as any);
    this.supplies.set(String(topicId), supply);

    return supply;
  }

  /**
   * Remove a supply (disable MCP in a topic)
   */
  async removeSupply(topicId: SHA256IdHash): Promise<void> {
    this.supplies.delete(String(topicId));
    // Note: Should also revoke all issued credentials for this topic
    // This would be done by sending revocation messages to all consumers
  }

  /**
   * Check if we're offering MCP in a topic
   */
  hasSupply(topicId: SHA256IdHash): boolean {
    return this.supplies.has(String(topicId));
  }

  /**
   * Get supply for a topic
   */
  getSupply(topicId: SHA256IdHash): MCPSupply | undefined {
    return this.supplies.get(String(topicId));
  }

  /**
   * Handle incoming demand from a remote user
   * Issues credential if we have a matching supply
   */
  async handleDemand(demand: MCPDemand): Promise<MCPCredential | null> {
    const topicKey = String(demand.topicId);
    const supply = this.supplies.get(topicKey);

    if (!supply) {
      // We don't offer MCP in this topic
      return null;
    }

    // Check if we already issued a credential to this consumer
    const consumerKey = String(demand.requesterPersonId);
    const topicCredentials = this.issuedCredentials.get(topicKey);
    if (topicCredentials?.has(consumerKey)) {
      // Already issued
      return null;
    }

    // Issue credential
    const credential: MCPCredential = {
      $type$: 'MCPCredential',
      topicId: demand.topicId,
      providerPersonId: this.deps.myPersonId,
      consumerPersonId: demand.requesterPersonId,
      allowedTools: supply.allowedTools,
      issuedAt: Date.now()
    };

    await storeVersionedObject(credential as any);

    // Track issued credential
    if (!this.issuedCredentials.has(topicKey)) {
      this.issuedCredentials.set(topicKey, new Set());
    }
    this.issuedCredentials.get(topicKey)!.add(consumerKey);

    // Send credential to consumer
    await this.deps.sendCredential(demand.requesterPersonId, credential);

    return credential;
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(topicId: SHA256IdHash, consumerPersonId: SHA256IdHash): Promise<void> {
    const topicKey = String(topicId);
    const consumerKey = String(consumerPersonId);

    const topicCredentials = this.issuedCredentials.get(topicKey);
    if (topicCredentials) {
      topicCredentials.delete(consumerKey);
    }

    // Create revoked credential to send
    const revokedCredential: MCPCredential = {
      $type$: 'MCPCredential',
      topicId,
      providerPersonId: this.deps.myPersonId,
      consumerPersonId,
      issuedAt: 0, // Will be looked up
      revokedAt: Date.now()
    };

    await this.deps.sendCredential(consumerPersonId, revokedCredential);
  }

  /**
   * Check if a consumer has a valid credential
   */
  hasValidCredential(topicId: SHA256IdHash, consumerPersonId: SHA256IdHash): boolean {
    const topicKey = String(topicId);
    const consumerKey = String(consumerPersonId);

    const topicCredentials = this.issuedCredentials.get(topicKey);
    return topicCredentials?.has(consumerKey) ?? false;
  }
}

export default MCPSupplyManager;
```

**Step 2: Update local/index.ts**

Add to `packages/mcp.core/src/local/index.ts`:

```typescript
export * from './MCPSupplyManager.js';
export { default as MCPSupplyManager } from './MCPSupplyManager.js';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(mcp.core): add MCPSupplyManager to local/"
```

---

### Task 13: Create MCPRemoteHandler

**Files:**
- Create: `packages/mcp.core/src/local/MCPRemoteHandler.ts`
- Modify: `packages/mcp.core/src/local/index.ts`

**Step 1: Create MCPRemoteHandler.ts**

Create file `packages/mcp.core/src/local/MCPRemoteHandler.ts`:

```typescript
/**
 * MCPRemoteHandler
 * Handles incoming MCP requests from remote clients
 * Validates credentials, executes tools, sends responses
 * Node.js only
 */

import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject, getObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import type { MCPRequest, MCPResponse, MCPToolResultObject } from '../remote/types.js';
import type { MCPSupplyManager } from './MCPSupplyManager.js';
import type { MCPToolExecutor } from '../types/mcp-types.js';

export interface MCPRemoteHandlerDependencies {
  supplyManager: MCPSupplyManager;
  toolExecutor: MCPToolExecutor;
  sendMessage: (topicId: SHA256IdHash, message: any) => Promise<void>;
  myPersonId: SHA256IdHash;
}

export class MCPRemoteHandler {
  private deps: MCPRemoteHandlerDependencies;

  constructor(deps: MCPRemoteHandlerDependencies) {
    this.deps = deps;
  }

  /**
   * Handle incoming MCPRequest message
   * Called by message handler when we receive a request
   */
  async handleRequest(request: MCPRequest, senderPersonId: SHA256IdHash, topicId: SHA256IdHash): Promise<void> {
    // Verify this request is for us
    if (String(request.targetPersonId) !== String(this.deps.myPersonId)) {
      // Not for us, ignore
      return;
    }

    // Verify sender has valid credential
    if (!this.deps.supplyManager.hasValidCredential(topicId, senderPersonId)) {
      console.warn(`[MCPRemoteHandler] Rejecting request from ${String(senderPersonId).substring(0, 8)} - no valid credential`);
      await this.sendErrorResponse(request.toolCall, topicId, 'No valid MCP credential');
      return;
    }

    // Fetch the tool call object
    let toolCall: any;
    try {
      toolCall = await getObject(request.toolCall);
    } catch (error) {
      console.error(`[MCPRemoteHandler] Failed to fetch tool call: ${(error as Error).message}`);
      await this.sendErrorResponse(request.toolCall, topicId, 'Failed to fetch tool call object');
      return;
    }

    // Validate tool is allowed
    const supply = this.deps.supplyManager.getSupply(topicId);
    if (supply?.allowedTools && !supply.allowedTools.includes(toolCall.toolName)) {
      await this.sendErrorResponse(request.toolCall, topicId, `Tool ${toolCall.toolName} not allowed`);
      return;
    }

    // Execute the tool
    const startTime = Date.now();
    let result: MCPToolResultObject;

    try {
      const executionResult = await this.deps.toolExecutor.execute(
        toolCall.toolName,
        JSON.parse(toolCall.parameters),
        { topicId: String(topicId) }
      );

      result = {
        $type$: 'MCPToolResult',
        toolCallHash: request.toolCall,
        success: !executionResult.isError,
        content: JSON.stringify(executionResult.content),
        executionTime: Date.now() - startTime
      };

      if (executionResult.isError) {
        result.error = executionResult.content[0]?.text || 'Unknown error';
      }
    } catch (error) {
      result = {
        $type$: 'MCPToolResult',
        toolCallHash: request.toolCall,
        success: false,
        content: '[]',
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }

    // Store result
    const storedResult = await storeVersionedObject(result as any);

    // Send response
    const response: MCPResponse = {
      $type$: 'MCPResponse',
      toolCall: request.toolCall,
      result: storedResult.hash as SHA256Hash
    };

    await this.deps.sendMessage(topicId, response);
  }

  /**
   * Send error response for a failed request
   */
  private async sendErrorResponse(toolCallHash: SHA256Hash, topicId: SHA256IdHash, errorMessage: string): Promise<void> {
    const result: MCPToolResultObject = {
      $type$: 'MCPToolResult',
      toolCallHash,
      success: false,
      content: '[]',
      error: errorMessage,
      executionTime: 0
    };

    const storedResult = await storeVersionedObject(result as any);

    const response: MCPResponse = {
      $type$: 'MCPResponse',
      toolCall: toolCallHash,
      result: storedResult.hash as SHA256Hash
    };

    await this.deps.sendMessage(topicId, response);
  }
}

export default MCPRemoteHandler;
```

**Step 2: Update local/index.ts**

Add to `packages/mcp.core/src/local/index.ts`:

```typescript
export * from './MCPRemoteHandler.js';
export { default as MCPRemoteHandler } from './MCPRemoteHandler.js';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(mcp.core): add MCPRemoteHandler to local/"
```

---

## Phase 5: Final Build and Verification

### Task 14: Build and verify complete package

**Step 1: Clean and build mcp.core**

```bash
cd /Users/gecko/src/lama/packages/mcp.core && npm run clean && npm run build
```

**Step 2: Verify all exports exist**

```bash
echo "=== local/ ===" && ls -la dist/local/
echo "=== remote/ ===" && ls -la dist/remote/
```

**Step 3: Build lama.cube**

```bash
cd /Users/gecko/src/lama/packages/lama.cube && npm run build:main
```

**Step 4: Commit final state**

```bash
git add -A && git commit -m "build: verify mcp.core local/remote refactor complete"
```

---

## Summary

After completing all tasks, the structure will be:

```
mcp.core/src/
├── local/
│   ├── index.ts
│   ├── MCPManager.ts          # Moved from server/
│   ├── MCPLocalServer.ts      # Renamed from MCPLamaServer
│   ├── MCPRemoteHandler.ts    # NEW: Handles inbound requests
│   └── MCPSupplyManager.ts    # NEW: Manages supplies/credentials
├── remote/
│   ├── index.ts
│   ├── types.ts               # NEW: Supply/Demand/Credential/Request/Response
│   ├── MCPCredentialCache.ts  # NEW: Caches credentials
│   ├── MCPDemandManager.ts    # NEW: Manages demands
│   └── MCPRemoteClient.ts     # NEW: Sends requests via chat
├── interface/                 # Unchanged
├── tools/                     # Unchanged
├── types/                     # Unchanged
├── recipes/                   # Updated with new recipes
└── index.ts                   # Updated exports
```

**Next steps (future tasks):**
- Integrate with lama.cube chat UI for context menu
- Implement credential exchange in connection flow
- Add message card rendering for MCP messages
- Test end-to-end with browser/mobile clients
