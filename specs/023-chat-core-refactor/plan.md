# Implementation Plan: Chat Core Integration and Architecture Refactoring

**Branch**: `023-chat-core-refactor` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-chat-core-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor AI chat initialization to properly integrate with chat.core, ensuring all group chat participants receive channels. The root problem is that `AITopicManager` bypasses chat.core and calls `TopicGroupManager` directly with incomplete participant lists, causing missing channels and disappearing AI responses.

**Technical Approach**:
1. Enforce 4-layer architecture: connection.core (transport) → trust.core (attestation) → chat.core (generic chat) → lama.core (AI logic) → lama.cube (Electron app)
2. Refactor `AITopicManager` to delegate channel/topic creation to chat.core APIs
3. Ensure chat.core enforces "all participants get channels" invariant
4. Maintain backward compatibility with existing chat data

**Critical Insight**: YOU CANNOT HAVE CHAT WITHOUT TRUST. test-object-filter.js demonstrates that ObjectFilter (trust.core) blocks HashGroups without proper attestation.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js main process), TypeScript 5.x + React (renderer process)
**Primary Dependencies**:
- `@refinio/one.core` (content-addressed storage, CHUM sync)
- `@lama/connection.core` (transport, pairing, P2P connections)
- `@lama/trust.core` (ObjectFilter, AffirmationCertificate, attestation)
- `@chat/core` (TopicGroupManager, ChatHandler - ALREADY EXISTS)
- `@lama/core` (AI-specific handlers - TO BE REFACTORED)
- Electron 32.x (IPC, multi-process architecture)

**Storage**: ONE.core content-addressed storage with versioned objects (filesystem-based in Node.js)

**Testing**:
- Integration tests following connection.core patterns (`group-chat.test.js`, `chat-core-test-server.js`)
- Test architecture phases: connection → trust → chat → AI
- Verify channel creation invariants

**Target Platform**: Electron desktop app (macOS, Windows, Linux) - Node.js main process + Chromium renderer

**Project Type**: Electron multi-process (main + renderer with IPC bridge)

**Performance Goals**:
- Chat operations must complete <500ms (channel creation, message send)
- No regressions in existing chat functionality
- Clean layer separation enables future transport swaps (WebSocket → QUIC) with zero chat/AI changes

**Constraints**:
- MUST maintain backward compatibility with existing chat data
- MUST respect 4-phase architecture (connection → trust → chat → AI/app)
- CANNOT modify connection.core or trust.core (external dependencies)
- chat.core CANNOT function without trust.core initialized

**Scale/Scope**:
- Refactoring ~200-300 LOC in AITopicManager
- Affects ALL AI chat creation flows
- Must preserve existing data for all users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: No constitution file exists yet (template only).

**Recommended Gates for Future** (when constitution is created):
- ✅ **No fallbacks**: Fail fast if channels cannot be created
- ✅ **Use existing code first**: chat.core ALREADY EXISTS with proper patterns
- ✅ **Fix, don't mitigate**: Root cause is bypassing chat.core - fix by using it properly
- ✅ **One.helpers usage**: Use ONE.core's built-in TopicGroupManager via chat.core abstractions
- ✅ **No delays**: Synchronous channel creation during topic setup

**Architecture Compliance**:
- ✅ Clean layer separation (connection/trust/chat/AI/app)
- ✅ Dependency injection (no global singletons)
- ✅ Test-first approach (match connection.core integration test patterns)

**PASS**: No constitution violations. Architecture follows established patterns from connection.core.

## Project Structure

### Documentation (this feature)

```
specs/023-chat-core-refactor/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (architecture research)
├── data-model.md        # Phase 1 output (refactoring entities)
├── quickstart.md        # Phase 1 output (implementation guide)
├── contracts/           # Phase 1 output (API contracts)
└── checklists/          # Quality checklists
    └── requirements.md  # Specification quality checklist (COMPLETE)
```

### Source Code (repository root)

```
lama.cube/                           # THIS PACKAGE - Electron desktop app
├── main/                            # Node.js main process
│   ├── core/                        # ONE.core instance & services
│   │   ├── node-one-core.ts         # Single Node.js ONE.core instance
│   │   ├── ai-assistant-model.ts    # AI orchestration (legacy - may be refactored)
│   │   ├── topic-group-manager.ts   # P2P and group chat (REFACTOR: use chat.core)
│   │   └── llm-object-manager.ts    # LLM configuration storage
│   ├── ipc/                         # IPC communication layer
│   │   ├── controller.ts            # Main IPC router
│   │   └── handlers/                # IPC handlers (REFACTOR: delegate to chat.core)
│   │       ├── chat.ts              # Chat IPC handlers
│   │       └── ai.ts                # AI IPC handlers
│   └── services/                    # Platform services (unchanged)
│
├── electron-ui/                     # React renderer process (NO CHANGES)
│   ├── src/
│   │   ├── components/              # UI components
│   │   └── bridge/                  # IPC bridge to main
│   └── tests/                       # Frontend tests
│
├── specs/                           # Feature specifications
│   └── 023-chat-core-refactor/      # This feature
│
└── tests/                           # Integration tests
    ├── integration/                 # NEW: Integration tests matching connection.core patterns
    │   └── chat-core-integration.test.js  # Verify channel creation for all participants
    └── unit/                        # Unit tests for refactored code

External Dependencies (NOT modified):
├── @lama/connection.core/           # Transport, CHUM sync, pairing
├── @lama/trust.core/                # ObjectFilter, attestation, certificates
├── @chat/core/                      # TopicGroupManager, ChatHandler (USE THIS)
└── @lama/core/                      # AI handlers (REFACTOR: use chat.core instead of direct ONE.core)
```

**Structure Decision**: Electron multi-process architecture with IPC bridge. Main refactoring occurs in:
1. `lama.cube/main/core/topic-group-manager.ts` → use chat.core APIs
2. `lama.cube/main/ipc/handlers/chat.ts` → delegate to chat.core
3. `lama.core` (external package) → refactor AI

Topic handlers to use chat.core

The refactoring preserves existing Electron architecture while establishing proper layer boundaries.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. This refactoring REDUCES complexity by:
- Using existing chat.core instead of reimplementing logic
- Enforcing proper layer boundaries
- Following established patterns from connection.core integration tests

