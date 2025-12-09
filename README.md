# lama.cube - Electron Desktop Application

Electron desktop application for LAMA (Local AI Messaging App) with ONE.core integration and Internet of Me (IoM) support.

## Architecture Overview

```
lama-electron-shadcn.ts        # Main Electron process entry
├── Window Management (macOS hiddenInset)
├── IPC Handlers (system, app data)
└── Dev/Production modes

main/                          # Node.js Backend (SINGLE ONE.core instance)
├── app.ts                     # Application lifecycle
├── core/                      # Core business logic
│   ├── node-one-core.ts       # THE ONE.core instance (Node.js only)
│   ├── instance-manager.ts    # Instance lifecycle management
│   ├── device-manager.ts      # Device pairing and management
│   ├── contact-trust-manager.ts
│   ├── inference-manager.ts   # Local LLM inference status
│   └── ai-message-listener.ts # AI response handling
├── ipc/                       # IPC communication layer
│   ├── controller.ts          # Central IPC router
│   └── plans/                 # IPC handlers by domain
│       ├── ai.ts              # AI/LLM operations
│       ├── chat.ts            # Chat messaging
│       ├── contacts.ts        # Contact management
│       ├── devices.ts         # Device management
│       ├── auth.ts            # Authentication
│       ├── export.ts          # HTML export
│       ├── mcp.ts             # MCP server control
│       └── ... (50+ plan files)
├── plans/                     # Initialization plans
│   ├── CoreInstanceInitializationPlan.ts
│   ├── ModelInitializationPlan.ts
│   └── MCPInitializationPlan.ts
├── services/                  # Background services
├── recipes/                   # ONE.core type definitions
├── types/                     # TypeScript types
└── config/                    # Configuration

electron-ui/                   # React Frontend (NO ONE.core)
├── src/
│   ├── App.tsx                # Main app shell with navigation
│   ├── bridge/
│   │   └── lama-bridge.ts     # IPC bridge (ALL communication)
│   ├── components/            # UI components
│   │   ├── ChatLayout.tsx     # Multi-conversation layout
│   │   ├── ChatView.tsx       # Chat interface
│   │   ├── MessageView.tsx    # Message display
│   │   ├── DevicesView.tsx    # Device management
│   │   ├── ContactsView.tsx   # Contact management
│   │   ├── SettingsView.tsx   # Settings interface
│   │   ├── StatusBar.tsx      # App status bar
│   │   └── InferenceStatus.tsx # Local AI status indicator
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Frontend services
│   └── types/                 # TypeScript types
└── preload.cjs                # Electron preload script
```

## Critical Architecture Principles

### Single ONE.core Instance (Node.js ONLY)

**The browser/renderer process has NO direct access to ONE.core.**

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Renderer)                                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │  React UI                                            ││
│  │  - Components, hooks, contexts                       ││
│  │  - NO AppModel, NO LeuteModel, NO authentication     ││
│  │  - ALL operations via IPC only                       ││
│  └─────────────────────────────────────────────────────┘│
│                           │                              │
│                    IPC (window.electronAPI)              │
│                           │                              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Node.js (Main Process)                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │  ONE.core Instance (node-one-core.ts)               ││
│  │  - LeuteModel, ChannelManager, ConnectionsModel     ││
│  │  - TopicModel, TopicRoom                            ││
│  │  - File system storage                              ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### IPC Communication Flow

All browser-to-core communication uses the IPC bridge:

```typescript
// Browser side (lama-bridge.ts)
const contacts = await window.electronAPI.invoke('contacts:list')

// Main process (ipc/plans/contacts.ts)
export const contactPlans = {
  async 'contacts:list'(event) {
    return await contactHandler.listContacts()
  }
}
```

## Development

### Commands

```bash
# Development
npm run electron              # Run app (uses dist/)
npm run electron:src          # Run from source TypeScript
cd electron-ui && npm run dev # Vite dev server (hot-reload)

# Building
npm run build:all             # TypeScript + React UI
npm run build:main            # Main process only
npm run build:ui              # UI only
npm run watch:main            # Watch mode for main process

# Testing
cd electron-ui && npm test    # Run tests
npm run test:watch            # Watch mode
npm run test:ci               # CI mode

# Distribution
npm run dist                  # Current platform
npm run dist:mac              # macOS DMG
npm run dist:win              # Windows installer
npm run dist:linux            # Linux AppImage/deb

# Cleanup
./clear-all-storage.sh        # Clear ALL ONE.core storage
pkill -f Electron             # Kill Electron processes
```

### Quick Start

```bash
# Terminal 1: Start Vite dev server with hot reload
cd electron-ui && npm run dev

# Terminal 2: Launch Electron
npm run electron
```

## Features

### Current Capabilities

- **AI Chat Interface**: Multiple LLM providers (Claude, OpenAI, Ollama)
- **Local Inference**: On-device LLM with download progress and status
- **MCP Integration**: Model Context Protocol for tool use
- **Contact Management**: P2P identity and trust handling
- **Device Management**: Multi-device pairing and sync
- **Topic Analysis**: AI-powered keyword extraction and summarization
- **HTML Export**: Conversations with microdata markup
- **Proposals**: Context-aware suggestions based on conversation
- **Memory Scan**: Store and retrieve conversation memories

### UI Components

- **StatusBar**: App-wide status with inference indicator, MCP status, sliders
- **InferenceStatus**: Traffic-light style local AI status (idle/downloading/loading/ready/error)
- **ChatLayout**: Multi-conversation interface
- **DevicesView**: Device pairing with QR codes
- **ContactsView**: Contact management with trust levels
- **SettingsView**: AI providers, user preferences

## Configuration

Three-layer configuration system:

1. **Bootstrap** (`lama.config.json`): Pre-ONE.core settings (network, identity)
2. **User Settings** (ONE.core): Synced preferences (AI config, UI theme)
3. **Entity Configs** (ONE.core): Per-entity config (MCP servers, models)

## Channel Architecture

### P2P Channels (2 participants)
- Single shared channel
- Person-based access control
- Both participants write to same channel

### Group Channels (3+ participants)
- One channel per participant
- Group-based access control
- Each member writes to own channel only
- Reads aggregate all channels

## Key Files

| File | Purpose |
|------|---------|
| `lama-electron-shadcn.ts` | Electron main entry point |
| `main/core/node-one-core.ts` | THE ONE.core instance |
| `main/ipc/controller.ts` | Central IPC router |
| `main/plans/CoreInstanceInitializationPlan.ts` | Instance setup and recipes |
| `electron-ui/src/bridge/lama-bridge.ts` | Browser-side IPC bridge |
| `electron-ui/src/App.tsx` | React app shell |

## Registering ONE.core Types

Custom ONE object types (recipes) are registered at initialization:

```typescript
// 1. Create recipe in your package
// meaning.core/src/recipes/MeaningNodeRecipe.ts

// 2. Export from package
export const MeaningCoreRecipes = [MeaningNodeRecipe];

// 3. Import in CoreInstanceInitializationPlan.ts
const { MeaningCoreRecipes } = await import('@meaning/core/recipes/index.js');

const allRecipes = [
  ...RecipesStable,
  ...RecipesExperimental,
  ...(MeaningCoreRecipes || [])
];
```

## Related Packages

- **lama.core**: Platform-agnostic business logic (no Electron imports)
- **lama.ui**: Shared React components (StatusBar, ChatLayout, etc.)
- **one.core**: Core data storage and synchronization
- **one.models**: Data models (LeuteModel, TopicModel, etc.)

## Common Issues

### "User not authenticated"
User must complete login flow. Node instance initializes after authentication.

### Browser trying to access ONE.core
Remove direct ONE.core imports from renderer. Use IPC via `window.electronAPI.invoke()`.

### Messages not syncing
- Verify channel access permissions
- Check that each participant writes to correct channel
- Use `TopicRoom.retrieveAllMessages()` to read

## Development Principles

- ESM everywhere (`import` syntax)
- IPC via contextBridge only
- NO browser ONE.core access
- Fail fast, NO fallbacks
- Single source of truth in Node.js
