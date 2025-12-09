# CLAUDE.md - lama.cube (Electron)

Electron-specific guidance for lama.cube. See parent `CLAUDE.md` for general LAMA architecture.

## Essential Commands

```bash
# Development
npm run electron              # Run app (uses dist/)
npm run electron:src          # Run from source TypeScript
cd electron-ui && npm run dev # Vite dev server (hot-reload)

# Building
npm run build:all             # TypeScript + React UI
npm run build:main            # Main process only
npm run build:ui              # UI only
npm run watch:main            # Watch mode

# Testing
cd electron-ui && npm test    # All tests
npm run test:watch            # Watch mode
npm run test:ci               # CI mode

# Distribution
npm run dist                  # Current platform
npm run dist:all              # All platforms

# Cleanup
./clear-all-storage.sh        # Clear ALL ONE.core storage
pkill -f Electron             # Kill Electron processes
```

## Architecture

### Single ONE.core Instance

**CRITICAL**: ONE Node.js instance ONLY, NO browser instance.

**Browser (Renderer)**:
- Role: UI ONLY - NO ONE.core
- Communication: ALL operations via IPC
- NO AppModel, NO LeuteModel, NO authentication

**Node.js (Main)**:
- Location: `main/core/node-one-core.ts`
- Role: SINGLE ONE.core instance
- Models: LeuteModel, ChannelManager, ConnectionsModel, TopicModel
- Storage: File system

**Principles**:
- Browser uses IPC for EVERYTHING
- NO fallbacks - if IPC fails, operations fail
- Fix problems, don't mitigate

### lama.core vs lama.cube

**lama.core**: Platform-agnostic business logic (dependency injection, NO Electron imports)
**lama.cube**: Electron implementation (IPC handlers, Node instance, injects dependencies)

**Pattern**:
```typescript
// lama.core/handlers/ChatHandler.ts
export class ChatHandler {
  constructor(private nodeOneCore: any) {}
  async sendMessage(params) { /* business logic */ }
}

// lama.cube/main/ipc/plans/chat.ts
import { ChatHandler } from '@lama/core/handlers/ChatHandler.js';
const handler = new ChatHandler(nodeOneCore);
export const chatPlans = {
  async sendMessage(event, params) {
    return await handler.sendMessage(params);
  }
};
```

## Configuration

3-layer system:

1. **Bootstrap** (`lama.config.json`): Before ONE.core starts (network, instance identity)
2. **User Settings** (ONE.core): Sync'd preferences (AI settings, UI theme)
3. **Entity Configs** (ONE.core): Per-entity config (MCP servers, LLM models)

Docs: `docs/config-quickstart.md`, `docs/config-platform-support.md`

## Channel Architecture

**P2P (2 participants)**:
- Single shared channel
- Person-based access
- Both write to same channel

**Group (3+ participants)**:
- One channel per participant
- Group-based access
- Each writes to own channel only
- Read aggregates all channels

## Transport Architecture

```
Application:  [CHUM Protocol]
                    |
Protocol:     [ConnectionsModel]
                    |
              ---------------
              |             |
Transport:  [QUIC]    [WebSocket]
          (future)    (current)
```

**Principles**:
- Transports are dumb byte pipes
- CHUM is transport-agnostic
- ConnectionsModel handles protocol

## Common Issues

### "User not authenticated - node not provisioned"
User must log in first via UI. Node initializes after login.

### Browser AppModel references
REMOVE THEM. Browser uses IPC only: `window.electronAPI.invoke()`

### Messages not visible
- Each participant writes to OWN channel
- Verify group access
- Use `TopicRoom.retrieveAllMessages()`

## Key Files

- `main/core/node-one-core.ts` - Node.js ONE.core instance
- `main/ipc/controller.ts` - IPC router
- `main/ipc/plans/` - IPC plan handlers
- `electron-ui/src/bridge/lama-bridge.ts` - IPC bridge
- `lama-electron-shadcn.ts` - Main entry point

## Features

- **MCP Memory**: Stores memories in "lama" topic with LLM analysis
- **HTML Export**: Microdata markup with `implode()`
- **Topic Analysis**: Auto-extract subjects/keywords/summaries
- **Proposals**: Context-aware suggestions (Feature 019)

Specs: `specs/018-*/`, `specs/019-*/`, `specs/021-*/`

## Registering ONE.core Types

Custom ONE object types (recipes) must be registered at instance initialization time. Do NOT use module augmentation (`@OneObjectInterfaces.d.ts`) for runtime type registration.

**Pattern - Adding new ONE types:**

1. Create recipe file in your package (e.g., `meaning.core/src/recipes/MeaningNodeRecipe.ts`)
2. Export recipes array from package:
```typescript
// meaning.core/src/recipes/index.ts
export const MeaningCoreRecipes = [
    MeaningNodeRecipe,
    MeaningDimensionValueRecipe
];
```

3. Add dependency in `lama.cube/package.json`:
```json
"@meaning/core": "file:../meaning.core"
```

4. Import and spread in `CoreInstanceInitializationPlan.loadRecipes()`:
```typescript
const { MeaningCoreRecipes } = await import('@meaning/core/recipes/index.js');

const allRecipes = [
    ...RecipesStable,
    ...RecipesExperimental,
    ...(LamaRecipes || []),
    ...(CubeCoreRecipes || []),
    ...(MeaningCoreRecipes || [])
];
```

**Key file**: `main/plans/CoreInstanceInitializationPlan.ts`

**Note**: The `@OneObjectInterfaces.d.ts` files provide TypeScript compile-time types only. Runtime registration happens via `initInstance({ initialRecipes: [...] })`.

## Development Principles

- ESM everywhere (`import`)
- IPC via contextBridge
- NO browser ONE.core access
- Fail fast, NO fallbacks
- ONE instance, ONE source of truth
