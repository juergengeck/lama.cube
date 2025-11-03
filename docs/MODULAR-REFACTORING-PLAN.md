# Modular Refactoring Plan: memory.core + mcp.core

**Goal**: Extract memory and MCP functionality into dedicated, platform-agnostic packages

**Date**: 2025-11-03

---

## Current Architecture (Problems)

```
lama.core/
├── handlers/
│   ├── ChatMemoryHandler.ts          ❌ Should be in memory.core
│   └── MemoryHandler.ts               ❌ Should be in memory.core
├── services/
│   ├── ChatMemoryService.ts           ❌ Should be in memory.core
│   └── mcp/                           ❌ Should be in mcp.core
│       ├── mcp-tool-interface.ts
│       ├── tool-executor.ts
│       ├── tool-definitions.ts
│       └── types.ts
└── types/
    └── chat-memory-types.ts           ❌ Should be in memory.core

lama.electron/main/
├── services/
│   ├── mcp-manager.ts                 ❌ Should be in mcp.core
│   ├── mcp-lama-server.ts             ❌ Should be in mcp.core
│   └── mcp/
│       ├── cube-tools.js              ❌ Should be in mcp.core
│       └── memory-tools.js            ❌ Should be in mcp.core
└── recipes/
    ├── chat-memory-config.ts          ❌ Should be in memory.core
    └── mcp-recipes.ts                 ❌ Should be in mcp.core
```

**Issues**:
- Memory logic mixed with AI/topic handlers
- MCP code split between lama.core and lama.electron
- No clear module boundaries
- Hard to test in isolation
- Can't reuse in other projects

---

## Target Architecture (Solution)

```
memory.core/                           ✅ NEW dedicated package
├── package.json
├── tsconfig.json
├── src/
│   ├── handlers/
│   │   ├── ChatMemoryHandler.ts      (from lama.core)
│   │   └── MemoryHandler.ts          (from lama.core)
│   ├── services/
│   │   └── ChatMemoryService.ts      (from lama.core)
│   ├── recipes/
│   │   ├── ChatMemoryConfig.ts       (from lama.electron)
│   │   └── ChatMemoryAssociation.ts
│   ├── types/
│   │   └── chat-memory-types.ts      (from lama.core)
│   └── index.ts                      (exports)

mcp.core/                              ✅ NEW dedicated package
├── package.json
├── tsconfig.json
├── src/
│   ├── server/
│   │   ├── MCPManager.ts             (from lama.electron)
│   │   └── MCPLamaServer.ts          (from lama.electron)
│   ├── tools/
│   │   ├── CubeTools.ts              (from lama.electron)
│   │   ├── MemoryTools.ts            (from lama.electron)
│   │   └── index.ts
│   ├── interface/
│   │   ├── MCPToolInterface.ts       (from lama.core)
│   │   ├── MCPToolExecutor.ts        (from lama.core)
│   │   └── tool-definitions.ts       (from lama.core)
│   ├── recipes/
│   │   └── mcp-recipes.ts            (from lama.electron)
│   ├── types/
│   │   └── mcp-types.ts              (from lama.core)
│   └── index.ts                      (exports)

lama.core/                             ✅ CLEANED UP
├── handlers/
│   ├── AIAssistantHandler.ts         ✓ Keep
│   ├── TopicAnalysisHandler.ts       ✓ Keep
│   └── ... (NO memory handlers)
└── services/
    └── ... (NO mcp/, NO ChatMemoryService)

lama.electron/main/                    ✅ Integration only
├── core/
│   └── node-one-core.ts              (wires up packages)
├── ipc/handlers/
│   ├── memory.ts                     (uses @memory.core)
│   └── mcp.ts                        (uses @mcp.core)
└── services/
    └── node-provisioning.ts          (initializes all core packages)
```

---

## File Inventory

### Memory Module Files to Move

**From lama.core → memory.core**:
- `handlers/ChatMemoryHandler.ts` (167 lines)
- `handlers/MemoryHandler.ts` (99 lines)
- `services/ChatMemoryService.ts` (472 lines)
- `types/chat-memory-types.ts` (need to check)

**From lama.electron → memory.core**:
- `main/recipes/chat-memory-config.ts` (46 lines)

**Total**: ~784+ lines to extract

### MCP Module Files to Move

**From lama.core → mcp.core**:
- `services/mcp/mcp-tool-interface.ts` (202 lines)
- `services/mcp/tool-executor.ts` (need to check)
- `services/mcp/tool-definitions.ts` (need to check)
- `services/mcp/types.ts` (need to check)
- `services/mcp/index.ts` (53 lines)

**From lama.electron → mcp.core**:
- `main/services/mcp-manager.ts` (need to check)
- `main/services/mcp-lama-server.ts` (need to check)
- `main/services/mcp/cube-tools.js` (13,828 bytes)
- `main/services/mcp/memory-tools.js` (283 lines)
- `main/recipes/mcp-recipes.ts` (need to check)

**Total**: ~1000+ lines to extract

---

## Refactoring Steps

### Phase 1: Create Package Skeletons

**1.1 Create memory.core package**:
```bash
cd /Users/gecko/src/lama
mkdir -p memory.core/src/{handlers,services,recipes,types}
cd memory.core
npm init -y
```

**1.2 Create mcp.core package**:
```bash
cd /Users/gecko/src/lama
mkdir -p mcp.core/src/{server,tools,interface,recipes,types}
cd mcp.core
npm init -y
```

**1.3 Configure TypeScript for both packages**:
- Copy tsconfig.json from lama.core
- Adjust paths and output directories
- Set up as ES modules

**1.4 Add dependencies**:
- memory.core: `@refinio/one.core`, `@refinio/one.models`
- mcp.core: `@modelcontextprotocol/sdk`, `@refinio/one.core`

### Phase 2: Move Memory Files

**2.1 Move handlers**:
```bash
# From lama.core to memory.core
cp lama.core/handlers/ChatMemoryHandler.ts memory.core/src/handlers/
cp lama.core/handlers/MemoryHandler.ts memory.core/src/handlers/
```

**2.2 Move service**:
```bash
cp lama.core/services/ChatMemoryService.ts memory.core/src/services/
```

**2.3 Move types**:
```bash
cp lama.core/types/chat-memory-types.ts memory.core/src/types/
```

**2.4 Move recipes**:
```bash
cp lama.cube/main/recipes/chat-memory-config.ts memory.core/src/recipes/
```

**2.5 Create index.ts**:
```typescript
// memory.core/src/index.ts
export * from './handlers/ChatMemoryHandler.js';
export * from './handlers/MemoryHandler.js';
export * from './services/ChatMemoryService.js';
export * from './types/chat-memory-types.js';
export * from './recipes/ChatMemoryConfig.js';
```

### Phase 3: Move MCP Files

**3.1 Move interface**:
```bash
# From lama.core/services/mcp to mcp.core/src/interface
cp -r lama.core/services/mcp/* mcp.core/src/interface/
```

**3.2 Move server**:
```bash
# From lama.electron to mcp.core
cp lama.cube/main/services/mcp-manager.ts mcp.core/src/server/MCPManager.ts
cp lama.cube/main/services/mcp-lama-server.ts mcp.core/src/server/MCPLamaServer.ts
```

**3.3 Move tools**:
```bash
cp lama.cube/main/services/mcp/cube-tools.js mcp.core/src/tools/CubeTools.ts
cp lama.cube/main/services/mcp/memory-tools.js mcp.core/src/tools/MemoryTools.ts
```

**3.4 Move recipes**:
```bash
cp lama.cube/main/recipes/mcp-recipes.ts mcp.core/src/recipes/
```

**3.5 Create index.ts**:
```typescript
// mcp.core/src/index.ts
export * from './server/MCPManager.js';
export * from './server/MCPLamaServer.js';
export * from './tools/index.js';
export * from './interface/mcp-tool-interface.js';
export * from './types/mcp-types.js';
```

### Phase 4: Update Imports in lama.electron

**4.1 Update node-one-core.ts**:
```typescript
// Before
import { ChatMemoryHandler } from '@lama/core/handlers/ChatMemoryHandler.js';

// After
import { ChatMemoryHandler } from '@memory.core';
```

**4.2 Update IPC handlers**:
```typescript
// main/ipc/handlers/memory.ts
// Uses nodeOneCore.chatMemoryHandler (no direct imports needed)

// main/ipc/handlers/mcp.ts
// Before
import { MCPManager } from '../../services/mcp-manager.js';

// After
import { MCPManager } from '@mcp.core';
```

**4.3 Update package.json**:
```json
{
  "dependencies": {
    "@memory.core": "file:../../memory.core",
    "@mcp.core": "file:../../mcp.core"
  }
}
```

### Phase 5: Clean Up lama.core

**5.1 Delete moved files**:
```bash
cd lama.core
rm handlers/ChatMemoryHandler.ts
rm handlers/MemoryHandler.ts
rm services/ChatMemoryService.ts
rm types/chat-memory-types.ts
rm -rf services/mcp/
```

**5.2 Update exports**:
```typescript
// lama.core/src/index.ts
// Remove memory and MCP exports
```

### Phase 6: Testing

**6.1 Build all packages**:
```bash
cd memory.core && npm run build
cd ../mcp.core && npm run build
cd ../lama.core && npm run build
cd ../lama.cube && npm install && npm run build
```

**6.2 Test memory IPC**:
```bash
cd lama.cube
npm run electron
# Test: memory:getStatus, memory:toggle, memory:extract
```

**6.3 Test MCP tools**:
```bash
# Test: MCP server starts, tools are registered
# Test: memory:search, memory:recent, memory:subjects
```

---

## Package Dependencies

### memory.core

```json
{
  "name": "@memory.core",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./handlers/*": "./dist/handlers/*.js",
    "./services/*": "./dist/services/*.js"
  },
  "dependencies": {
    "@refinio/one.core": "workspace:*",
    "@refinio/one.models": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

### mcp.core

```json
{
  "name": "@mcp.core",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./server/*": "./dist/server/*.js",
    "./tools/*": "./dist/tools/*.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@refinio/one.core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

---

## Integration Example

### Before (lama.electron)

```typescript
// main/core/node-one-core.ts
import { ChatMemoryHandler } from '@lama/core/handlers/ChatMemoryHandler.js';
import { MCPManager } from './services/mcp-manager.js';

// Scattered initialization
this.chatMemoryHandler = new ChatMemoryHandler({ ... });
this.mcpManager = new MCPManager({ ... });
```

### After (lama.electron)

```typescript
// main/core/node-one-core.ts
import { ChatMemoryHandler, ChatMemoryService } from '@memory.core';
import { MCPManager, MemoryTools, CubeTools } from '@mcp.core';

// Clean dependency injection
const memoryService = new ChatMemoryService({ nodeOneCore: this });
this.chatMemoryHandler = new ChatMemoryHandler({ chatMemoryService });

const mcpTools = [new MemoryTools(this), new CubeTools(this)];
this.mcpManager = new MCPManager({ tools: mcpTools });
```

---

## Benefits

1. **Clear Separation of Concerns**
   - Each package has single responsibility
   - Platform-agnostic business logic
   - No Electron/Node.js coupling in core

2. **Reusability**
   - `memory.core` can be used in browser, mobile, CLI
   - `mcp.core` can be used in any MCP server

3. **Independent Evolution**
   - Version memory and MCP independently
   - Update one without affecting others
   - Clear API boundaries

4. **Better Testing**
   - Test each package in isolation
   - Mock dependencies at package boundaries
   - No need for full Electron environment

5. **Easier Onboarding**
   - Developers can understand one module at a time
   - Clear documentation per package
   - Smaller, focused codebases

---

## Risks & Mitigations

### Risk 1: Circular Dependencies
**Mitigation**: Use dependency injection, pass dependencies at runtime

### Risk 2: Breaking Changes
**Mitigation**: Keep old imports working with re-exports during transition

### Risk 3: Build Complexity
**Mitigation**: Use npm workspaces or pnpm for monorepo management

### Risk 4: Type Errors
**Mitigation**: Build packages in dependency order: memory.core → mcp.core → lama.core → lama.electron

---

## Success Criteria

- [ ] memory.core builds without errors
- [ ] mcp.core builds without errors
- [ ] lama.core no longer has memory/mcp code
- [ ] lama.electron integrates both packages
- [ ] All IPC memory handlers work
- [ ] All MCP tools work
- [ ] Tests pass
- [ ] No circular dependencies
- [ ] Documentation updated

---

## Timeline Estimate

- **Phase 1**: Create skeletons - 1 hour
- **Phase 2**: Move memory files - 2 hours
- **Phase 3**: Move MCP files - 2 hours
- **Phase 4**: Update lama.electron - 2 hours
- **Phase 5**: Clean up lama.core - 1 hour
- **Phase 6**: Testing & fixes - 3 hours

**Total**: ~11 hours

---

## Next Steps

1. Review this plan with team
2. Get approval for directory structure
3. Create packages (Phase 1)
4. Execute moves (Phases 2-3)
5. Test integration (Phase 6)
6. Document new architecture
