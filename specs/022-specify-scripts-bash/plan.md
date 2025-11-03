# Implementation Plan: Configuration Consolidation

**Branch**: `022-config-consolidation` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-specify-scripts-bash/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Consolidate LAMA's 9+ overlapping configuration mechanisms into 3 clean architectural layers: (1) Bootstrap Config (file-based LamaConfig with CLI/env/file precedence), (2) User Settings (unified UserSettings ONE.core object synced via CHUM), and (3) Entity Configs (per-entity MCPServerConfig, MCPTopicConfig, LLM objects). Includes automatic migration of GlobalLLMSettings and WordCloudSettings to preserve all user preferences without data loss. Reduces configuration code by ~800 lines while improving developer experience through clear documentation and consistent patterns.

## Technical Context

**Language/Version**: TypeScript 5.x with ES modules (ESNext target)
**Primary Dependencies**:
- @refinio/one.core (content-addressed storage, versioned objects, CHUM sync)
- @refinio/one.models (Leute model, ChannelManager, TopicModel)
- Electron (safeStorage for token encryption, IPC for main/renderer communication)
- Node.js fs module (LamaConfig file loading)
- React (UI components in electron-ui/)

**Storage**:
- ONE.core content-addressed storage (OneDB/ directory)
- File system (lama.config.json for bootstrap)
- OS-level encrypted storage via Electron safeStorage (tokens)

**Testing**:
- Integration tests (tests/integration/)
- Unit tests (tests/unit/)
- Migration tests (new, for data migration validation)
- Manual testing checklist (UI verification)

**Target Platform**:
- Electron desktop app (macOS, Windows, Linux)
- Node.js main process + React renderer process

**Project Type**: Desktop application (Electron multi-process architecture)

**Performance Goals**:
- Settings cache lookup: <1ms (O(1) map access)
- Migration completion: <5 seconds during startup
- CHUM sync latency: <30 seconds for settings propagation
- IPC handler response: <10ms for get/update operations

**Constraints**:
- Must not block UI during migration (max 5 seconds)
- Must preserve all existing user data (zero data loss requirement)
- Must maintain backward compatibility for 1-2 releases (deprecation period)
- Must not modify existing CHUM sync protocol
- Must not change MCPServerConfig/MCPTopicConfig/LLM structures (in production)
- Must use existing ONE.core versioning (cannot change storage format)

**Scale/Scope**:
- 15 functional requirements
- 3 data migrations (GlobalLLMSettings, WordCloudSettings, ConnectionConfig)
- ~800 lines of code to be removed
- 6+ storage mechanisms to consolidate into 3
- 4 user stories with independent test scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: Constitution file not yet populated for LAMA project - contains template placeholders only.

**Project-Specific Principles** (derived from CLAUDE.md):
- ✅ **No fallbacks**: Fail fast and throw, fix problems rather than mitigate
- ✅ **No delays**: Configuration operations must be immediate (cached)
- ✅ **Use what you have first**: Leverage existing ONE.core storage, CHUM sync, Electron safeStorage
- ✅ **ONE.core helpers**: Use @refinio/one.core storage-versioned-objects, calculateIdHashOfObj
- ✅ **Test is means to end**: Focus on fixing configuration mess, not test coverage for its own sake

**Architecture Compliance**:
- ✅ **Single ONE.core instance**: All configuration stored in NodeOneCore (main process only)
- ✅ **IPC for everything**: Browser accesses config via IPC handlers, no direct ONE.core access
- ✅ **Versioned objects**: UserSettings uses ONE.core versioning for CHUM sync
- ✅ **Content-addressed storage**: All ONE.core objects stored by SHA-256 hash
- ✅ **Branded types**: SHA256Hash<T> and SHA256IdHash<T> for type safety

**Gates**:
- ✅ No new external dependencies (using existing ONE.core, Electron, React)
- ✅ Data migration automated (no manual user intervention)
- ✅ Backward compatibility maintained (deprecated APIs bridged for 1-2 releases)
- ✅ Rollback plan documented (backup + restore + revert)

**Re-evaluation after Phase 1**: Will verify data model and contracts maintain these principles.

## Project Structure

### Documentation (this feature)

```
specs/022-specify-scripts-bash/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (technical decisions, migration strategy)
├── data-model.md        # Phase 1 output (UserSettings schema, recipe definitions)
├── quickstart.md        # Phase 1 output (developer guide for new config system)
├── contracts/           # Phase 1 output (IPC contracts, TypeScript interfaces)
│   ├── ipc-user-settings.json      # UserSettings IPC API contract
│   ├── user-settings-types.ts      # TypeScript interface definitions
│   └── migration-contract.ts       # Migration API contract
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Specification quality checklist (COMPLETE)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```
lama.cube/
├── main/                           # Node.js main process
│   ├── core/
│   │   ├── node-one-core.ts        # NodeOneCore instance (injection point)
│   │   ├── user-settings-manager.ts  # NEW: Unified settings manager
│   │   ├── ai-settings-manager.ts    # DEPRECATED: Bridge to UserSettings
│   │   └── ...
│   ├── config/
│   │   └── lama-config.ts          # MODIFIED: Add network.direct section
│   ├── ipc/
│   │   ├── controller.ts           # MODIFIED: Register new handlers
│   │   └── handlers/
│   │       ├── user-settings.ts    # NEW: Unified settings IPC
│   │       ├── word-cloud-settings.ts  # DEPRECATED: To be removed
│   │       └── ...
│   ├── recipes/
│   │   ├── user-settings-recipe.ts  # NEW: UserSettings recipe
│   │   ├── llm-recipes.ts           # DEPRECATED: GlobalLLMSettings recipe
│   │   └── ...
│   ├── migrations/
│   │   ├── migrate-global-llm-settings.ts  # NEW: Migration logic
│   │   └── migrate-word-cloud-settings.ts  # NEW: Migration logic
│   └── ...
│
├── electron-ui/                    # React renderer process
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useSettings.ts      # NEW: React hook for UserSettings
│   │   ├── config/
│   │   │   └── connection-config.ts  # DEPRECATED: Merged into LamaConfig
│   │   ├── components/
│   │   │   └── SettingsView.tsx    # MODIFIED: Use useSettings hook
│   │   └── ...
│   └── ...
│
├── @OneCoreTypes.d.ts              # MODIFIED: Add UserSettings, remove deprecated
├── docs/
│   ├── config-migration-guide.md   # NEW: Migration guide for developers
│   └── config-refactoring-plan.md  # EXISTING: Detailed implementation plan
└── ...
```

**Structure Decision**:
- Single Electron desktop application with multi-process architecture (main + renderer)
- TypeScript throughout with ES modules
- Configuration logic in main process (Node.js), UI in renderer (React)
- ONE.core storage in main process only, accessed via IPC
- Follows existing LAMA architecture patterns (no new structural changes)

## Complexity Tracking

*No constitutional violations - all requirements satisfied within existing constraints*

This refactoring **reduces** complexity rather than adding it:
- Consolidates 9+ storage mechanisms into 3 clean layers
- Removes ~800 lines of code
- Eliminates redundant managers and handlers
- Uses existing ONE.core patterns consistently

No complexity justification required.

## Phase 0: Research & Technical Decisions

**Status**: ✅ COMPLETE (see research.md)

Research tasks completed:
1. ✅ Migration strategy for GlobalLLMSettings → UserSettings.ai
2. ✅ Migration strategy for WordCloudSettings → UserSettings.ui.wordCloud
3. ✅ CHUM sync behavior for UserSettings
4. ✅ Caching strategy for performance
5. ✅ Rollback and error handling patterns
6. ✅ Deprecation timeline and backward compatibility approach

All technical unknowns resolved through analysis of existing LAMA codebase and ONE.core documentation.

## Phase 1: Design Artifacts

**Status**: ✅ COMPLETE (see generated files)

Artifacts generated:
1. ✅ [data-model.md](./data-model.md) - UserSettings schema, recipe definitions, entity relationships
2. ✅ [contracts/](./contracts/) - IPC contracts, TypeScript interfaces, migration APIs
   - [ipc-user-settings.json](./contracts/ipc-user-settings.json) - JSON Schema for IPC API
   - [user-settings-types.ts](./contracts/user-settings-types.ts) - TypeScript type definitions
   - [migration-contract.ts](./contracts/migration-contract.ts) - Migration API contract
3. ✅ [quickstart.md](./quickstart.md) - Developer quick-start guide for new config system

## Multi-Platform Considerations

**CRITICAL**: LAMA runs on multiple platforms - configuration architecture must be platform-agnostic.

### Platform Matrix

| Platform | Bootstrap Config | User Settings | IPC/Bridge | Status |
|----------|------------------|---------------|------------|--------|
| **Electron** (lama.cube) | File-based | ONE.core (Node.js) | Electron IPC | Primary (this feature) |
| **Expo** (lama mobile) | AsyncStorage? | ONE.core (mobile) | N/A (single process) | Future consideration |
| **Browser** (lama.browser) | SessionStorage? | ONE.core (Web Worker?) | postMessage | Future consideration |
| **Server** (API mode) | File-based | ONE.core (Node.js) | HTTP API | Future consideration |

### Platform-Agnostic Design

The core UserSettings architecture is platform-independent:

1. **UserSettings data model**: Platform-agnostic ONE.core object (works everywhere)
2. **UserSettingsManager**: Pure TypeScript class with injected dependencies (no Electron imports)
3. **Storage layer**: Abstracted via ONE.core (file-based on Node, IndexedDB on browser)
4. **CHUM sync**: Works across all platforms that support ONE.core

### Platform-Specific Adapters

Each platform provides its own adapter for bootstrap config and access patterns:

**Electron** (current focus):
```typescript
// main/config/lama-config.ts (Node.js)
const config = await loadConfig(); // File system

// electron-ui/ (Browser)
const settings = await window.electronAPI.invoke('settings:get'); // IPC
```

**Browser** (future):
```typescript
// lama.browser/config/browser-config.ts
const config = await loadConfig(); // sessionStorage or localStorage

// lama.browser/
const settings = await settingsManager.getSettings(); // Direct access to ONE.core
```

**Expo** (future):
```typescript
// lama/config/mobile-config.ts
const config = await AsyncStorage.getItem('lamaConfig');

// lama/
const settings = await settingsManager.getSettings(); // Direct access to ONE.core
```

### This Feature's Scope

**Current scope (lama.cube only)**:
- Electron-specific implementation
- File-based LamaConfig for Node.js
- Electron IPC for renderer → main communication
- Electron safeStorage for token encryption

**Future work** (separate features):
- Adapt for browser platform (lama.browser)
- Adapt for mobile platform (lama/expo)
- Adapt for server platform (API mode)

### Architectural Compatibility

This refactoring maintains compatibility with future platforms:

✅ **UserSettings data model**: Platform-agnostic (pure TypeScript)
✅ **ONE.core storage**: Works on all platforms
✅ **CHUM sync**: Platform-agnostic (protocol-level)
✅ **UserSettingsManager**: No platform-specific imports (injectable dependencies)

❌ **LamaConfig loading**: Platform-specific (requires per-platform adapter)
❌ **Token encryption**: Platform-specific (Electron safeStorage → browser SubtleCrypto → Expo SecureStore)
❌ **IPC/bridge layer**: Platform-specific (Electron IPC → postMessage → direct access)

### Migration Strategy for Multi-Platform

When adapting to other platforms:

1. **Reuse UserSettings data model** (100% portable)
2. **Reuse UserSettingsManager** (inject platform-specific storage)
3. **Create platform-specific LamaConfig adapter** (file/sessionStorage/AsyncStorage)
4. **Create platform-specific IPC/bridge** (Electron IPC/postMessage/direct)
5. **Adapt token encryption** (safeStorage/SubtleCrypto/SecureStore)

See `docs/config-refactoring-plan.md` for more details on platform adaptation strategy.

---

## Phase 2: Task Generation

**Status**: ✅ COMPLETE (see tasks.md)

Generated dependency-ordered tasks.md with:
- 53 tasks organized by user story (US1, US2, US3, US4)
- 7 phases: Setup, Foundational, US1 (Clear Architecture P1), US3 (Migration P1), US2 (Unified Preferences P2), US4 (Complexity P3), Polish
- 18 tasks marked [P] for parallel execution
- Independent test criteria for each user story
- MVP scope: 20 tasks (Setup + Foundational + US1)
- Full feature: All 53 tasks

**Note**: Tasks focus on lama.cube (Electron) implementation. Multi-platform adaptation will be separate future features.
