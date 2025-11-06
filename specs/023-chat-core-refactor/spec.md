# Feature Specification: Chat Core Integration and Architecture Refactoring

**Feature Branch**: `023-chat-core-refactor`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "Refactor chat initialization and management into chat.core - Create a clean layered architecture with proper separation of concerns between connection.core (transport), chat.core (generic chat), lama.core (AI logic), and lama.cube (Electron app)."

## Context

**Current Problem**: AI chat topics in lama.cube are created by `AITopicManager` calling `TopicGroupManager.createGroupTopic()` directly, but with incomplete participant lists. This caused a critical bug where only the AI participant was added to group chats, resulting in missing channels for human users and disappearing AI responses after streaming.

**Root Cause**: Chat initialization logic is mixed with AI-specific logic, without clear architectural boundaries. The package `@chat/core` exists with proper group chat handling (`TopicGroupManager`, `ChatHandler`) as demonstrated in connection.core's integration tests, but isn't being used correctly by lama-specific code.

**Architecture Gap**:
- connection.core: Handles transport (WebSocket, future QUIC, etc.), pairing, and CHUM sync
- trust.core: Handles certificates, access control, ObjectFilter, and attestation (blocks objects without proper credentials)
- chat.core: EXISTS but not properly integrated - should handle ALL generic chat operations (REQUIRES trust.core)
- lama.core: AI logic that SHOULD USE chat.core, but currently bypasses it
- lama.cube: Electron app that orchestrates everything

**Future Requirements**: Architecture must support:
- Multiple transport types (WebSocket, QUIC, etc.) without affecting chat or trust logic
- Pluggable authentication and authorization mechanisms
- Pluggable attestation mechanisms (different certificate types beyond AffirmationCertificate)
- Reusable chat functionality across different applications

## User Scenarios & Testing

### User Story 1 - Correct Channel Setup for All Participants (Priority: P1)

When creating any group chat (AI or human-only), all participants must receive their own channels automatically.

**Why this priority**: Critical bug fix - without proper channel setup, messages disappear and persistence fails. This is the immediate problem that exposed the architectural issue.

**Independent Test**: Create an AI chat topic (like "LAMA" or "Hi") and verify:
1. User gets a channel: `{id: 'topic-id', owner: userPersonId}`
2. AI gets a channel: `{id: 'topic-id', owner: aiPersonId}`
3. Both can write to their own channels
4. `retrieveAllMessages()` aggregates from both channels
5. Messages persist after app restart

**Acceptance Scenarios**:

1. **Given** user starts new AI chat, **When** topic is created, **Then** both user and AI have channels with same topic ID
2. **Given** AI sends response, **When** message is stored, **Then** message persists and remains visible after streaming completes
3. **Given** app restarts, **When** user opens previous AI chat, **Then** all messages (user + AI) are still there

---

### User Story 2 - Clean Architecture Layers (Priority: P2)

Establish clear separation between transport, chat, AI logic, and application layers with proper dependency injection.

**Why this priority**: Prevents future bugs and enables transport/auth flexibility. Once channels work (P1), we need to ensure the architecture doesn't cause similar issues again.

**Independent Test**:
1. Review code dependencies - lama.core should import from chat.core, NOT directly manipulate ONE.core channels
2. Verify AITopicManager uses ChatHandler for operations instead of TopicGroupManager directly
3. Confirm transport changes (switching from WebSocket to QUIC) don't require changes to chat or AI logic
4. Verify auth/authz can be swapped without affecting chat operations

**Acceptance Scenarios**:

1. **Given** developer adds new transport type, **When** implementing transport layer, **Then** no changes needed in chat.core or lama.core
2. **Given** AI creates new chat topic, **When** calling lama.core API, **Then** chat.core handles channel/group creation with proper invariants
3. **Given** non-AI group chat is created, **When** using chat.core directly, **Then** same channel setup works without AI-specific code
4. **Given** different auth mechanism configured, **When** user authenticates, **Then** chat operations work identically

---

### User Story 3 - Integration Test Parity (Priority: P3)

Lama.cube's AI chat initialization should match the pattern demonstrated in connection.core's `chat-core-test-server.js` and `group-chat.test.js`.

**Why this priority**: Validates that the refactoring aligns with the established chat.core usage pattern. Ensures consistency across the codebase.

**Independent Test**:
1. Compare AI topic creation in lama.cube with group chat creation in connection.core tests
2. Verify both use identical chat.core APIs
3. Confirm both enforce "all participants get channels" invariant

**Acceptance Scenarios**:

1. **Given** connection.core test creates 3-person group chat, **When** reviewing channel creation code, **Then** it uses TopicGroupManager with full participant list
2. **Given** lama.cube AI chat creation refactored, **When** comparing with connection.core test, **Then** both use identical chat.core integration pattern
3. **Given** generic chat functionality needed, **When** implemented in new application, **Then** chat.core can be reused without lama-specific dependencies

---

### Edge Cases

- What happens when AITopicManager creates topic but chat.core is not initialized?
- How does system handle concurrent topic creation requests from different layers?
- What happens if channel creation fails for one participant but succeeds for others?
- How are orphaned channels (created but never used) cleaned up?
- What happens when group membership changes after initial channel creation?
- How does system handle transport switching mid-conversation?
- What happens when auth token expires during active chat session?
- How are channels managed when participant has multiple simultaneous auth sessions?

## Requirements

### Functional Requirements

- **FR-001**: System MUST ensure all group chat participants receive their own channels during topic creation
- **FR-002**: AITopicManager MUST delegate topic/channel creation to chat.core APIs instead of calling TopicGroupManager directly
- **FR-003**: chat.core MUST enforce the invariant "all participants in array MUST get channels" during createGroupTopic()
- **FR-004**: lama.core MUST have NO direct imports of TopicGroupManager or ChannelManager - only via chat.core abstractions
- **FR-005**: System MUST support initialization pattern where chat.core is initialized before AI-specific handlers
- **FR-006**: connection.core MUST remain transport-agnostic and never reference trust or chat-specific concepts (certificates, topics, channels, messages)
- **FR-007**: trust.core MUST remain between connection and chat layers, enforcing attestation without chat-specific knowledge
- **FR-008**: chat.core MUST work independently of lama.core for non-AI group chats
- **FR-009**: chat.core MUST NOT function without trust.core properly initialized (no chat without trust)
- **FR-010**: System MUST maintain backward compatibility with existing chat data and channel structures
- **FR-011**: All layers MUST communicate through well-defined dependency injection interfaces (no global singletons)
- **FR-012**: System MUST log clear errors when chat operations fail due to missing channels, participants, or trust attestation
- **FR-013**: Architecture MUST support pluggable transport implementations (WebSocket, QUIC, etc.) without affecting upper layers
- **FR-014**: Architecture MUST support pluggable authentication and authorization mechanisms without affecting chat functionality
- **FR-015**: Architecture MUST support pluggable attestation mechanisms (different certificate types) without affecting chat functionality

### Key Entities

- **Transport Layer** (connection.core): P2P connections, CHUM sync, pairing, transport protocols (WebSocket, QUIC)
- **Trust Layer** (trust.core): AffirmationCertificates, ObjectFilter, access control, attestation, signature verification
- **Chat Layer** (chat.core): TopicGroupManager, ChatHandler, generic channel/group management, message persistence - REQUIRES trust.core
- **AI Layer** (lama.core): AIContactManager, AITopicManager, AIAssistantHandler, LLM integration - uses chat.core, NO direct ONE.core access
- **Application Layer** (lama.cube): IPC handlers, Electron services, UI integration - composes chat.core + lama.core

## Success Criteria

### Measurable Outcomes

- **SC-001**: AI responses persist correctly - no disappearing messages after streaming (100% success rate in tests)
- **SC-002**: All chat participants receive channels automatically during topic creation (verified by integration tests matching connection.core's group-chat.test.js)
- **SC-003**: lama.core has zero direct imports of ONE.core channel/topic management primitives (static analysis verification via import graph)
- **SC-004**: Switching between transport implementations requires zero changes to trust, chat, or AI code (demonstrated by transport swap test)
- **SC-005**: chat.core integration tests pass identically whether used by AI system or direct human group chat (test suite verification)
- **SC-006**: Channel setup bug cannot recur - enforced by chat.core invariants and comprehensive test coverage (mutation testing verification with 90%+ score)
- **SC-007**: Different auth/attestation mechanisms can be configured without modifying chat.core or lama.core (demonstrated by auth provider swap test)
- **SC-008**: trust.core attestation enforcement works independently - chat operations fail gracefully when trust is not established (test suite verification)

## Assumptions

- chat.core package (`@chat/core`) already exists with `TopicGroupManager` and `ChatHandler` as demonstrated in connection.core integration tests (`group-chat.test.js`, `chat-core-test-server.js`)
- trust.core package exists with `ObjectFilter`, `AffirmationCertificate`, and attestation support as demonstrated in test-object-filter.js
- Existing ONE.core infrastructure (ChannelManager, TopicModel, LeuteModel) remains unchanged
- Current chat data structures and storage format are correct and should be preserved
- Transport layer abstraction already exists in connection.core and doesn't need modification
- Trust layer (ObjectFilter, certificates) already exists in trust.core and doesn't need modification
- Migration can happen incrementally without breaking existing functionality
- The pattern from connection.core's `chat-core-test-server.js` represents the desired usage of chat.core
- The 3-phase architecture (connection → trust → chat) from test-object-filter.js represents the desired layer separation
- Current authentication implementation (SingleUserNoAuth in lama.cube) will be replaced with pluggable auth in future features

## Dependencies

- connection.core: Must be stable and support multiple transport types, CHUM sync
- trust.core: Must be stable with ObjectFilter, AffirmationCertificate, and attestation support
- chat.core: Package already exists at `@chat/core`, may need minor API adjustments for lama.core integration
- lama.core: Requires refactoring to use chat.core instead of direct ONE.core calls
- ONE.core: Must remain at current version, no breaking changes assumed

## Out of Scope

- Changes to CHUM sync protocol or message format
- Modifications to underlying ONE.core storage or access control
- UI/UX changes to chat interface in lama.cube
- Performance optimizations to message delivery or channel operations
- New chat features beyond fixing the channel creation bug
- Migration tools for existing chat data (assumed compatible)
- Implementation of new authentication mechanisms (architecture must support, but implementation is separate feature)
- Implementation of QUIC transport (architecture must support, but implementation is separate feature)
- Modifications to connection.core's transport layer

## References

- connection.core integration tests: `node_modules/@lama/connection.core/test/integration/group-chat.test.js`
- connection.core test server: `node_modules/@lama/connection.core/test/integration/chat-core-test-server.js`
- connection.core object filter test: `node_modules/@lama/connection.core/test/test-object-filter.js` (demonstrates 3-phase architecture: connection → trust → chat)
- chat.core package: `@chat/core` (TopicGroupManager, ChatHandler)
- Current bug fix: AITopicManager now passes `[userPersonId, aiPersonId]` to createGroupTopic() (temporary fix before refactoring)

## Architectural Phases (from test-object-filter.js)

The architecture follows three sequential phases that MUST be respected:

**Phase 1: Connection** (connection.core)
- Pairing and connection establishment
- CHUM sync infrastructure
- Transport management (WebSocket, future QUIC)
- **Test reference**: Lines 246-273 in test-object-filter.js

**Phase 2: Trust** (trust.core)
- Create AffirmationCertificates for HashGroups
- ObjectFilter blocks objects without proper attestation
- CHUM distributes certificates automatically
- Access control and signature verification
- **CRITICAL**: Objects without certificates are rejected by ObjectFilter
- **Test reference**: Lines 287-356 in test-object-filter.js

**Phase 3: Chat** (chat.core)
- Create Topics using trusted HashGroups
- Establish channels for all participants
- Send/receive messages through channels
- **CRITICAL**: Cannot function without Phase 2 trust being established
- **Test reference**: Lines 358-409 in test-object-filter.js

**Phase 4: Decentralization** (built-in resilience)
- Peer-to-peer operation continues even if intermediary nodes go offline
- Messages propagate directly between remaining participants
- **Test reference**: Lines 411-459 in test-object-filter.js

**Implication for Feature 023**: The refactoring MUST preserve these phase boundaries. lama.core MUST NOT bypass trust.core to access chat.core, and chat.core MUST NOT bypass trust.core to access connection.core.
