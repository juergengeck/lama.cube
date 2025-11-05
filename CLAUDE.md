# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Install all dependencies (root + electron-ui)
npm install

# Start Vite dev server for UI hot-reload
cd electron-ui && npm run dev

# Launch Electron app (run from project root)
npm run electron              # Uses dist/ (requires build first)
npm run electron:src          # Uses source TypeScript directly

# Run simple electron test
npm run simple
```

### Building
```bash
# Build everything (TypeScript + React UI)
npm run build:all

# Build individual components
npm run build:main            # TypeScript main process → dist/
npm run build:ui              # React UI → electron-ui/dist/
npm run build:preload         # Preload script

# Watch mode for development
npm run watch:main            # Auto-rebuild TypeScript on changes

# Type checking without building
npm run typecheck
```

### Testing
```bash
# Run all tests (from electron-ui/)
cd electron-ui && npm test

# Watch mode for development
npm run test:watch

# Run specific test suites
npm run test:unit             # Unit tests only
npm run test:integration      # Integration tests only

# Coverage report
npm run test:coverage

# CI mode (used in automation)
npm run test:ci
```

### Distribution (Creating Installers)
```bash
# Build installers for current platform
npm run dist

# Platform-specific builds
npm run dist:win              # Windows NSIS installer
npm run dist:win-portable     # Windows portable .exe
npm run dist:mac              # macOS .dmg
npm run dist:linux            # Linux AppImage + .deb

# Build for all platforms (requires macOS for .dmg)
npm run dist:all
```

### Cleanup & Utilities
```bash
# Clear all ONE.core storage
./clear-all-storage.sh

# Clear specific data
./clear-storage.sh            # Clear main storage
./clear-lama-topic.sh         # Clear LAMA topics only
./clear-p2p-channels.sh       # Clear P2P channels

# Kill all Electron processes
pkill -f Electron
```

## Project Structure

```
lama.cube/                          # Electron desktop app
├── main/                           # Node.js main process
│   ├── core/                       # Core ONE.core instance & services
│   │   ├── node-one-core.ts        # Single Node.js ONE.core instance
│   │   ├── ai-assistant-model.ts   # AI orchestration (legacy)
│   │   ├── topic-group-manager.ts  # P2P and group chat management
│   │   └── llm-object-manager.ts   # LLM configuration storage
│   ├── ipc/                        # IPC communication layer
│   │   ├── controller.ts           # Main IPC router
│   │   └── handlers/               # IPC handlers for each domain
│   ├── services/                   # Platform services
│   │   ├── llm-manager.ts          # LLM provider integration
│   │   ├── mcp-manager.ts          # Model Context Protocol tools
│   │   ├── proposal-engine.ts      # Context-aware proposals
│   │   └── html-export/            # HTML export with microdata
│   ├── models/                     # Data models
│   ├── recipes/                    # ONE.core recipe definitions
│   └── utils/                      # Utilities
│
├── electron-ui/                    # React renderer process
│   ├── src/
│   │   ├── App.tsx                 # Main React app
│   │   ├── components/             # UI components
│   │   ├── hooks/                  # React hooks
│   │   ├── services/               # Browser services
│   │   └── bridge/                 # IPC bridge to main process
│   └── tests/                      # Frontend tests
│
├── dist/                           # Build output (TypeScript → JS)
├── specs/                          # Feature specifications
├── docs/                           # Documentation
├── reference/                      # Reference implementations
├── lama-electron-shadcn.ts         # Electron main entry point
├── electron-preload.ts             # Preload script (security bridge)
└── tsconfig.json                   # TypeScript config
```

## Architecture Overview

### Single ONE.core Architecture

**CRITICAL**: This Electron app runs ONE ONE.core instance in Node.js ONLY:

1. **Browser** (Renderer Process)
   - Location: `/electron-ui/`
   - Role: UI ONLY - NO ONE.core instance
   - Communication: ALL data operations via IPC
   - NO AppModel, NO LeuteModel, NO ChannelManager
   - NO SingleUserNoAuth - authentication handled by Node.js

2. **Node.js Instance** (Main Process)
   - Location: `/main/core/node-one-core.ts`
   - Platform: Node.js with file system
   - Role: SINGLE ONE.core instance - handles EVERYTHING
   - Models: SingleUserNoAuth, LeuteModel, ChannelManager, AI contacts, etc.
   - Storage: File system based

**Architecture Principles**:
- **NO FALLBACKS**: Browser ONLY uses IPC - if IPC fails, operations fail
- **NO BROWSER ONE.CORE**: Browser has NO ONE.core imports, just UI
- **FIX DON'T MITIGATE**: Fix problems, don't work around them

### lama.core vs lama.cube

**Package Separation**:
- **lama.core** (`/Users/gecko/src/lama/lama.core/`) - Platform-agnostic business logic
  - Handlers with dependency injection (NO platform-specific imports)
  - LLM services (Ollama, Claude, LMStudio HTTP clients)
  - AI models (AIContactManager, AITopicManager, AIAssistantHandler, etc.)
  - Dependencies: ONLY `@refinio/one.core` and `@refinio/one.models`

- **lama.cube** (this package) - Electron-specific implementation
  - IPC handlers that instantiate lama.core handlers
  - Electron-specific services (MCP manager, node provisioning)
  - Node ONE.core instance
  - Injects dependencies into lama.core handlers

**Pattern**:
```typescript
// lama.core/handlers/ChatHandler.ts
export class ChatHandler {
  constructor(private nodeOneCore: any, private stateManager: any) {}
  async sendMessage(params) { /* business logic */ }
}

// lama.cube/main/ipc/handlers/chat.ts
import { ChatHandler } from '@lama/core/handlers/ChatHandler.js';
const chatHandler = new ChatHandler(nodeOneCore, stateManager);
export default {
  async sendMessage(event, params) {
    return await chatHandler.sendMessage(params);
  }
};
```

### NodeOneCore: Comprehensive ONE.core Instance

The Node.js process runs a FULL ONE.core instance with complete capabilities:

**Available Models & Services**:
- `leuteModel` - Full Leute model (people, contacts, profiles, groups)
- `channelManager` - Complete channel management
- `connectionsModel` - P2P connections, pairing, CHUM sync
- `topicModel` - Chat topics and messages
- `aiAssistantModel` - AI assistant handler
- `llmManager` - LLM provider integration
- `topicGroupManager` - Group chat management
- Full ONE.core storage, BLOB storage, access control, encryption

**TypeScript Strategy**:
- Import proper types from `@refinio/one.core/lib/recipes.js`
- Use TypeScript's `Extract<>` utility for union type narrowing
- Create type guards that preserve type information
- Avoid `as any` - use proper type assertions

## Configuration Architecture

LAMA uses a **3-layer configuration system**:

### Layer 1: Bootstrap Config (File-Based)
- **File**: `lama.config.json` or `~/.lama/config.json`
- **Use**: Required before ONE.core starts (network settings, instance identity)
- **Examples**: Instance name/email, ONE.core storage directory, CommServer URL, log level

### Layer 2: User Settings (ONE.core Versioned)
- **Type**: `UserSettings` ONE.core object (ID: `userEmail`)
- **Use**: User preferences that sync across instances via CHUM
- **Examples**: AI temperature/maxTokens, default AI model, UI theme, word cloud preferences
- **Access**: Via `UserSettingsManager`

### Layer 3: Entity Configs (ONE.core Versioned)
- **Types**: `MCPServerConfig`, `MCPTopicConfig`, `LLM`
- **Use**: Per-entity configuration (servers, topics, models)
- **Examples**: Per-model auth tokens, per-topic MCP settings, per-server MCP config

**Decision Tree**:
```
Required before ONE.core starts? → Layer 1 (LamaConfig)
Belongs to specific entity? → Layer 3 (Entity Configs)
User preference that should sync? → Layer 2 (UserSettings)
```

**Full Documentation**: See `docs/config-quickstart.md` and `docs/config-platform-support.md`

## Key Concepts

### MCP Memory Storage

- **Storage**: Memories stored as Message objects in the "lama" topic
- **Journal Entries**: Every memory creates keywords, subject, summary (via LLM analysis)
- **Access**: Via MCP tools (`memory:store`, `memory:search`, `memory:recent`, `memory:subjects`)
- **Implementation**: `main/services/mcp/memory-tools.js`
- **Non-blocking**: Journal creation runs in background via `setImmediate()`

### ONE.core Fundamentals

ONE uses content-addressed storage where everything is a SHA-256 hash. Objects are immutable and support versioning through DAGs.

**Key concepts**:
- Hash types: Object hash vs ID hash
- Versioned vs unversioned objects
- Recipe system for type definitions
- Storage patterns (`storeVersionedObject`, `storeUnversionedObject`)

**Deep dive**: See `docs/one-core-fundamentals.md` for complete details on:
- Hash types and object categories
- Microdata serialization format
- Recipe system and common pitfalls
- Creating custom versioned objects
- TypeScript type system integration

## Feature Status

### Feature 018: Structured LLM Communication
**Status**: Implementation in progress
**Purpose**: Structured JSON-based protocol for LLM responses using Ollama's native `format` parameter
**Key**: Guarantees valid JSON structure, extracts keywords/subjects/summaries reliably, stores as ONE.core objects
**Docs**: `specs/018-we-must-create/spec.md`, `specs/018-we-must-create/plan.md`

### Feature 019: Context-Aware Knowledge Sharing
**Status**: Planning complete, implementation in progress
**Purpose**: Display context-aware proposals above chat to suggest relevant past conversations
**Key**: Subject/keyword matching with Jaccard similarity, includes memories from "lama" topic
**Implementation**: `main/services/proposal-engine.ts`, `main/services/proposal-ranker.ts`
**Docs**: `specs/019-above-the-chat/spec.md`, `specs/019-above-the-chat/quickstart.md`

### Feature 021: AI Assistant Core Refactor
**Status**: Phase 3 complete, integration active
**Purpose**: Refactor monolithic AI assistant into focused, platform-agnostic components
**Components**: AIContactManager, AITopicManager, AITaskManager, AIPromptBuilder, AIMessageProcessor, AIAssistantHandler
**Key**: All components <400 lines, zero Electron dependencies in lama.core, dependency injection pattern
**Docs**: `specs/021-ai-assistant-core-refactor/IMPLEMENTATION-STATUS.md`, `specs/021-ai-assistant-core-refactor/quickstart.md`

### HTML Export with Microdata
**Feature**: Export conversations as HTML with comprehensive microdata markup
**IPC Handler**: `export:htmlWithMicrodata`
**Implementation**: Uses ONE.core's native `implode()` function to embed referenced objects
**Location**: `main/services/html-export/`

### Topic Analysis with AI
**Feature**: AI-powered analysis to extract subjects, keywords, and summaries
**Data Model**: Subject, Keyword, Summary (versioned ONE.core objects)
**IPC Handlers**: `topicAnalysis:analyzeMessages`, `topicAnalysis:getSubjects`, `topicAnalysis:getSummary`
**Auto-Analysis**: Triggers after every message for immediate analysis
**Location**: `main/core/one-ai/`

## Channel Architecture

**IMPORTANT**: Different architectures for P2P vs group chats:

### P2P Conversations (Two Participants)

1. **Single Shared Channel**
   - ONE channel for both participants
   - Channel ID format: `personId1<->personId2` (lexicographically sorted)
   - Channel owner: `null` or `undefined`
   - Both participants read AND write to same channel

2. **Access Control**
   - Direct person-based access to BOTH channel AND Topic object
   - NO Group objects needed for P2P
   - Channel access: `{id: channelHash, person: [person1, person2]}`
   - Topic access: `{object: topicHash, person: [person1, person2]}`

3. **Critical**: Must grant access to Topic object itself (not just channel)

### Group Chats (3+ Participants including AI)

1. **One Topic ID per Conversation**
   - Each group chat has ONE topic ID
   - All participants use the SAME topic ID

2. **Multiple Channels per Topic**
   - Each participant has their OWN channel with same topic ID
   - Channel = `{id: topic_id, owner: participant_person_id}`

3. **Writing Messages - Decentralized**
   - Each participant writes ONLY to their OWN channel
   - Cannot write to another participant's channel (will throw error)

4. **Reading Messages - Aggregated**
   - `TopicRoom.retrieveAllMessages()` queries by topic ID only
   - `getMatchingChannelInfos()` finds ALL channels with that topic ID
   - `multiChannelObjectIterator()` aggregates messages from ALL channels
   - Result: Messages merged and sorted by timestamp

5. **Access Control**
   - Group-based access: All participants in a Group object
   - Groups are LOCAL objects - NEVER synced through CHUM
   - Only IdAccess objects referencing group hash are shared

### Key Differences Summary

| Aspect | P2P (2 participants) | Group (3+ participants) |
|--------|---------------------|------------------------|
| Channels | 1 shared channel | 1 channel per participant |
| Channel Owner | null/undefined | Each participant owns their channel |
| Write Access | Both write to same channel | Each writes to own channel only |
| Access Control | Person-based | Group-based (local groups) |
| Topic ID Format | `id1<->id2` | Any string |

## Transport Architecture

**Clean separation** between transport and protocol layers:

```
Application Layer:  [CHUM Sync Protocol]
                           |
Protocol Layer:     [ConnectionsModel]
                           |
                    ---------------
                    |             |
Transport Layer:  [QUIC]    [WebSocket]
                 (future)    (legacy)
```

### Transport Layers

- **QUIC** (`main/core/quic-transport.ts`): Future direct P2P (placeholder until node:quic stable)
- **WebSocket** (via commserver): Current transport using relay server

### Protocol Layer

- **CHUM**: Application-level sync protocol (transport-agnostic)
- **ConnectionsModel**: Protocol manager implementing CHUM logic

### Key Principles

1. **Transports are dumb** - Only move bytes, no application logic
2. **CHUM is transport-agnostic** - Works over ANY reliable transport
3. **Clean separation** - Transport layer doesn't know about channels/sync
4. **Pluggable architecture** - New transports added without changing CHUM

### Common Mistakes to Avoid

- **DON'T** implement CHUM logic in transport layer
- **DON'T** create channels from transport layer
- **DON'T** mix trust/verification with transport
- **DO** keep transport as simple byte pipe
- **DO** let ConnectionsModel handle all CHUM protocol logic

## Common Issues & Solutions

### "User not authenticated - node not provisioned"
- Occurs when creating conversations before login
- **Solution**: User must log in first via browser UI
- Node instance initializes after login

### Browser AppModel references
- **REMOVE THEM** - Browser should NOT have AppModel
- Use IPC: `window.electronAPI.invoke()`
- All data operations go through Node.js

### Messages not visible to other participants
- Check each participant writes to their OWN channel
- Verify group access granted to all channels
- Use `TopicRoom.retrieveAllMessages()` (not manual queries)
- Debug: Log channels with `getMatchingChannelInfos()`

## Key Files

- `/main/core/node-one-core.ts` - Single Node.js ONE.core instance
- `/main/ipc/handlers/` - IPC handlers for all operations
- `/electron-ui/src/services/browser-init.ts` - UI initialization (NO ONE.core)
- `/electron-ui/src/bridge/lama-bridge.ts` - IPC bridge for UI

## Development Principles

- Main process uses ESM (`import`)
- Renderer uses ESM (`import`)
- IPC communication via contextBridge for ALL operations
- NO direct ONE.core access from browser
- NO fallbacks - fail fast and fix
- ONE instance (Node.js), ONE source of truth, IPC for everything
