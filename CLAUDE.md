# CLAUDE.md - lama.cube (Electron)

Electron-specific guidance for lama.cube. See parent `CLAUDE.md` for general LAMA architecture.

## Essential Commands

```bash
# Development (electron-vite based)
pnpm dev                   # Dev mode with hot-reload (builds + launches Electron)
pnpm preview               # Run from pre-built output (rebuilds first, then launches)

# Building
pnpm build                 # Build all (main + preload + renderer) via electron-vite

# Testing
pnpm test                  # All tests (jest)
pnpm test:watch            # Watch mode

# Type checking
pnpm typecheck             # All
pnpm typecheck:main        # Main process only
pnpm typecheck:renderer    # Renderer only

# Distribution
pnpm dist                  # Current platform (build + bundle models + electron-builder)
pnpm dist:all              # All platforms

# Cleanup
./clear-all-storage.sh        # Clear ALL ONE.core storage
pkill -f Electron             # Kill Electron processes
```

**Starting the app**: Use `pnpm dev` for development (hot-reload). Use `pnpm build && pnpm preview` to test production builds. The `preview` command also rebuilds, so just `pnpm preview` suffices. There is no standalone `pnpm electron` script - all launching goes through electron-vite.

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
- `main/ipc/plans/` - IPC plan handlers (including `instance.ts` for IoM/IoP)
- `main/registry/module-registry-init.ts` - Module initialization (InstanceModule registered here)
- `electron-ui/src/bridge/lama-bridge.ts` - IPC bridge
- `lama-electron-shadcn.ts` - Main entry point

## Features

- **MCP Memory**: Stores memories in "lama" topic with LLM analysis
- **HTML Export**: Microdata markup with `implode()`
- **Topic Analysis**: Auto-extract subjects/keywords/summaries
- **Proposals**: Context-aware suggestions (Feature 019)
- **Instance Management**: IoM/IoP device tracking via `InstanceModule`
- **ESP32 Control**: LED control for discovered ESP32 devices via UDP

Specs: `specs/018-*/`, `specs/019-*/`, `specs/021-*/`

## ESP32 Device Control

ESP32 devices running the `esp32.core` firmware are discovered via mDNS and appear in Settings → Devices → Network Discovery.

**IPC Handler**: `esp32:controlLED` in `main/ipc/plans/devices.ts`

**Protocol**:
- Transport: UDP to device's advertised port (49497)
- Format: `[0x03][JSON]` where 0x03 = SERVICE_TYPE_LED_CONTROL
- Authentication: `senderPersonId` must match device owner

**LED Actions**: `on`, `off`, `toggle`

**UI**: LED dropdown button appears only for devices with names starting with "esp32"

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

## Bundling with electron-vite

**CRITICAL**: The packaged app bundles EVERYTHING. There is NO node_modules in the final app.

### How It Works

- `electron-vite` bundles all code into `out/main/index.js`
- `electron-builder` packages the bundle into AppImage/DMG/etc.
- Workspace packages are bundled (listed in `workspacePackages` array)
- npm packages are externalized by default (NOT bundled)

### Native Modules (nativeModules array)

**WARNING**: Packages in `nativeModules` are EXCLUDED FROM THE ENTIRE BUNDLE and WILL NOT BE AVAILABLE AT RUNTIME!

```typescript
// electron.vite.config.ts
const nativeModules = [
  '@abandonware/noble',      // ❌ NOT in final app
  '@roamhq/wrtc-linux-x64',  // ❌ Externalized, but copied by bundleWrtcBinaries plugin
  // etc.
]
```

**If you need a native module at runtime**, you MUST:
1. Remove it from `nativeModules`
2. Bundle it using a custom Vite plugin (like `bundleNodeLlamaCppBinaries`)
3. Copy binaries manually to `out/` directory

### Examples

**node-llama-cpp**: Bundled via custom plugin that copies platform binaries to `out/main/bins/`

**onnxruntime-node**: REMOVED from app entirely. Main process ONNX providers are stubs. TTS uses renderer-side worker with WebGPU/WASM instead.

**@roamhq/wrtc**: Externalized (not bundled). `transport.node` handles missing wrtc gracefully - logs warning and disables WebRTC transport. Use `isWebRTCAvailable()` to check availability.

### Debugging Bundle Issues

```bash
# Check what's in the bundle
ls -la out/main/

# Test AppImage
timeout 10 ./release/LAMA-*.AppImage --no-sandbox 2>&1

# Common error: "Cannot find module 'X'"
# → X is externalized but code tries to import it
# → Either bundle X or remove the import
```

## Development Principles

- ESM everywhere (`import`)
- IPC via contextBridge
- NO browser ONE.core access
- Fail fast, NO fallbacks
- ONE instance, ONE source of truth
