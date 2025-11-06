# Architecture Research: Chat Core Integration

**Feature**: 023-chat-core-refactor
**Phase**: 0 (Research & Architecture)
**Date**: 2025-11-05

## Research Questions Resolved

This document consolidates architectural research findings for refactoring AI chat initialization to properly use chat.core.

## Decision 1: Use Existing chat.core Package

**Status**: ✅ RESOLVED

**Decision**: Use `@chat/core` package with `TopicGroupManager` and `ChatHandler` instead of reimplementing logic.

**Rationale**:
- chat.core ALREADY EXISTS with proper group chat handling
- Demonstrated in connection.core integration tests (`group-chat.test.js`, `chat-core-test-server.js`)
- Enforces "all participants get channels" invariant
- Test-proven architecture used by connection.core

**Alternatives Considered**:
1. Fix AITopicManager in place → REJECTED: Perpetuates architectural bypass of chat.core
2. Create new abstraction layer → REJECTED: Reinvents what chat.core already provides
3. Use chat.core (CHOSEN) → Correct layering, proven patterns, reduces code

**Implementation Approach**:
- Refactor `AITopicManager` to delegate to `ChatHandler` from chat.core
- Import `TopicGroupManager` only via chat.core abstractions
- Never call ONE.core's `TopicGroupManager` directly from AI code

## Decision 2: Enforce 4-Layer Architecture

**Status**: ✅ RESOLVED

**Decision**: Strictly enforce connection → trust → chat → AI/app layering.

**Rationale**:
- test-object-filter.js (lines 246-459) demonstrates this is the REQUIRED architecture
- **CRITICAL**: chat.core CANNOT function without trust.core (ObjectFilter blocks objects without attestation)
- Clean separation enables transport swaps (WebSocket → QUIC) with zero chat changes
- Matches established patterns in connection.core codebase

**Architecture Phases** (from test-object-filter.js):

**Phase 1: Connection** (connection.core)
- Pairing and connection establishment
- CHUM sync infrastructure
- Transport management (WebSocket, future QUIC)

**Phase 2: Trust** (trust.core)
- Create AffirmationCertificates for HashGroups
- ObjectFilter blocks objects without proper attestation
- CHUM distributes certificates automatically
- Access control and signature verification

**Phase 3: Chat** (chat.core)
- Create Topics using trusted HashGroups
- Establish channels for all participants
- Send/receive messages
- **REQUIRES Phase 2 trust established**

**Phase 4: AI/Application** (lama.core/lama.cube)
- AI-specific logic (LLM integration, AI contacts)
- Application composition (Electron IPC, UI)
- **USES Phase 3 chat.core APIs**

**Alternatives Considered**:
1. 3-layer without separate trust → REJECTED: trust.core is critical, test-object-filter.js proves it
2. Merge chat + AI → REJECTED: Violates reusability, chat.core must work for non-AI chats
3. 4-layer separation (CHOSEN) → Matches test patterns, enables pluggability

## Decision 3: Channel Creation Pattern

**Status**: ✅ RESOLVED

**Decision**: chat.core enforces "all participants MUST get channels" invariant during `createGroupTopic()`.

**Rationale**:
- Root cause of bug: AITopicManager passed incomplete participant list
- chat.core's `TopicGroupManager.createGroupTopic(participants)` creates channels for ALL participants
- connection.core tests verify this pattern works correctly
- Enforcing at chat.core level prevents future bugs

**Implementation Pattern** (from group-chat.test.js):
```typescript
// CORRECT (chat.core pattern)
const participants = [userPersonId, aiPersonId]; // COMPLETE list
await chatHandler.createGroupTopic(topicId, participants);
// Result: BOTH participants get channels automatically

// WRONG (current AITopicManager)
const participants = [aiPersonId]; // INCOMPLETE list
await topicGroupManager.createGroupTopic(topicId, participants);
// Result: Only AI gets channel, user messages disappear
```

**Alternatives Considered**:
1. Manual channel creation after topic → REJECTED: Error-prone, violates DRY
2. chat.core enforces invariant (CHOSEN) → Fail-fast, impossible to misuse
3. Document but don't enforce → REJECTED: Documentation rots, code doesn't

## Decision 4: Backward Compatibility Strategy

**Status**: ✅ RESOLVED

**Decision**: Preserve existing data structures, migrate logic not data.

**Rationale**:
- Existing ONE.core storage format is correct
- Channel structure `{id: topicId, owner: participantId}` is correct
- Problem is LOGIC (bypassing chat.core), not DATA model
- No migration scripts needed

**Approach**:
- Keep all existing ONE.core objects (Topics, Channels, Messages)
- Refactor code paths to use chat.core
- Existing chats continue working without changes
- New chats use proper channel creation

**Alternatives Considered**:
1. Migrate data to new format → REJECTED: Unnecessary risk, data is correct
2. Dual code paths (old + new) → REJECTED: Technical debt, complexity
3. Logic-only refactor (CHOSEN) → Zero risk to existing data, clean architecture

## Decision 5: Testing Strategy

**Status**: ✅ RESOLVED

**Decision**: Follow connection.core integration test patterns.

**Rationale**:
- connection.core has proven test patterns for chat.core usage
- Tests verify full 4-phase architecture (connection → trust → chat → AI)
- Integration tests ensure channel creation works end-to-end

**Test Structure** (matching connection.core):
```typescript
// Test file: tests/integration/chat-core-integration.test.js

describe('AI Chat Core Integration', () => {
  // Phase 1: Setup connection
  it('establishes P2P connection', async () => { /* ... */ });

  // Phase 2: Setup trust
  it('creates AffirmationCertificate for group', async () => { /* ... */ });

  // Phase 3: Create AI chat
  it('creates group topic with all participants', async () => {
    const participants = [userPersonId, aiPersonId];
    const topic = await chatHandler.createGroupTopic(topicId, participants);

    // Verify BOTH got channels
    const userChannel = await getChannel(topicId, userPersonId);
    const aiChannel = await getChannel(topicId, aiPersonId);
    expect(userChannel).toBeDefined();
    expect(aiChannel).toBeDefined();
  });

  // Phase 4: Verify messages persist
  it('AI response persists after streaming', async () => { /* ... */ });
});
```

**Alternatives Considered**:
1. Unit tests only → REJECTED: Doesn't verify cross-layer integration
2. E2E UI tests only → REJECTED: Too slow, brittle
3. Integration tests matching connection.core (CHOSEN) → Proven pattern, fast enough

## Decision 6: Dependency Injection Pattern

**Status**: ✅ RESOLVED

**Decision**: Pass dependencies via constructor injection, no global singletons.

**Rationale**:
- Matches lama.core pattern established in Feature 021
- Enables testing with mocks
- Clear dependencies visible in constructor
- Follows SOLID principles

**Pattern**:
```typescript
// lama.core (platform-agnostic)
class AITopicManager {
  constructor(
    private chatHandler: ChatHandler,  // From chat.core
    private aiContactManager: AIContactManager
  ) {}

  async createAITopic(topicId: string, userPersonId: SHA256IdHash<Person>) {
    const aiPersonId = await this.aiContactManager.getAIPersonId();
    return this.chatHandler.createGroupTopic(topicId, [userPersonId, aiPersonId]);
  }
}

// lama.cube (Electron-specific)
// IPC handlers instantiate with injected dependencies
const chatHandler = new ChatHandler(nodeOneCore);
const aiTopicManager = new AITopicManager(chatHandler, aiContactManager);
```

**Alternatives Considered**:
1. Global singletons → REJECTED: Hard to test, hidden dependencies
2. Service locator pattern → REJECTED: Hidden dependencies, hard to trace
3. Constructor injection (CHOSEN) → Explicit, testable, SOLID

## Key References

- **connection.core tests**: `node_modules/@lama/connection.core/test/integration/group-chat.test.js`
- **connection.core server**: `node_modules/@lama/connection.core/test/integration/chat-core-test-server.js`
- **Architecture phases**: `node_modules/@lama/connection.core/test/test-object-filter.js` (lines 246-459)
- **chat.core package**: `@chat/core` (TopicGroupManager, ChatHandler)
- **Feature 021 patterns**: `specs/021-ai-assistant-core-refactor/` (dependency injection reference)

## Summary

All architectural decisions resolved without clarifications needed:

1. ✅ Use existing chat.core package
2. ✅ Enforce 4-layer architecture (connection → trust → chat → AI/app)
3. ✅ chat.core enforces channel creation invariant
4. ✅ Backward compatible (logic refactor, not data migration)
5. ✅ Integration tests matching connection.core patterns
6. ✅ Dependency injection (no globals)

**Ready for Phase 1**: Design (data-model.md, contracts/, quickstart.md)
