# Implementation Tasks: Chat Core Refactoring

**Feature**: 023-chat-core-refactor
**Status**: Ready for implementation
**Date**: 2025-11-05

## Task Dependencies

```
T1 → T2 → T3 → T4 → T5 → T6
```

---

## T1: Create ChatHandler in lama.core

**Priority**: P0 (Critical path)
**Estimated Effort**: 3-4 hours
**Dependencies**: None

### Description
Create the platform-agnostic ChatHandler in lama.core that uses chat.core for proper initialization.

### Subtasks
1. Create `lama.core/services/ai/ChatHandler.ts`
2. Define constructor dependencies (nodeOneCore, topicManager, contactManager, etc.)
3. Implement `createConversation()` method:
   - Resolve AI contact via AIContactManager
   - Get user identity from nodeOneCore
   - Call chat.core.startConversation() with [user, ai] participants
   - Return topic metadata
4. Implement `sendMessage()` method:
   - Validate topic exists
   - Post message via chat.core.postMessage()
   - Trigger AI response via AIMessageProcessor
5. Add comprehensive JSDoc comments

### Acceptance Criteria
- [ ] ChatHandler exports from lama.core
- [ ] Constructor accepts all required dependencies
- [ ] createConversation() creates proper P2P conversation
- [ ] sendMessage() posts to correct channel
- [ ] All methods have JSDoc documentation
- [ ] No Electron-specific imports

### Files Created
- `lama.core/services/ai/ChatHandler.ts`

---

## T2: Update lama.cube IPC Handler

**Priority**: P0 (Critical path)
**Estimated Effort**: 1-2 hours
**Dependencies**: T1

### Description
Update the lama.cube IPC handler to instantiate and use the new ChatHandler.

### Subtasks
1. Import ChatHandler from lama.core
2. Instantiate ChatHandler with dependencies:
   - nodeOneCore
   - aiTopicManager
   - aiContactManager
   - systemPromptBuilder
   - aiMessageProcessor
   - llmManager
   - chatCore module
3. Update `chat:createConversation` handler to use ChatHandler
4. Update `chat:sendMessage` handler to use ChatHandler
5. Preserve existing error handling

### Acceptance Criteria
- [ ] IPC handler imports ChatHandler from lama.core
- [ ] ChatHandler instantiated with all dependencies
- [ ] chat:createConversation uses ChatHandler.createConversation()
- [ ] chat:sendMessage uses ChatHandler.sendMessage()
- [ ] Error propagation works correctly
- [ ] No breaking changes to IPC signatures

### Files Modified
- `lama.cube/main/ipc/handlers/chat.ts`

---

## T3: Refactor AIMessageListener

**Priority**: P0 (Critical path)
**Estimated Effort**: 2-3 hours
**Dependencies**: T1

### Description
Update AIMessageListener to use chat.core for proper message retrieval.

### Subtasks
1. Add chatCore to constructor dependencies
2. Update `onChannelUpdate()` to use chat.core.retrieveMessages()
3. Filter messages to exclude AI-authored messages
4. Check if AI has responded to latest message
5. Trigger response only if needed
6. Remove manual channel queries (use chat.core aggregation)
7. Add debug logging for troubleshooting

### Acceptance Criteria
- [ ] AIMessageListener uses chat.core.retrieveMessages()
- [ ] Filters out AI's own messages correctly
- [ ] Only responds to unanswered messages
- [ ] No duplicate responses
- [ ] Works for both P2P and group chats
- [ ] Debug logging shows message flow

### Files Modified
- `lama.core/services/ai/AIMessageListener.ts`

---

## T4: Add Unit Tests

**Priority**: P1 (High)
**Estimated Effort**: 3-4 hours
**Dependencies**: T1, T2, T3

### Description
Create comprehensive unit tests for the new ChatHandler and updated components.

### Subtasks
1. Create test file: `lama.core/services/ai/__tests__/ChatHandler.test.ts`
2. Test ChatHandler.createConversation():
   - Mock all dependencies
   - Verify chat.core.startConversation called
   - Verify correct participant ordering
   - Verify error handling
3. Test ChatHandler.sendMessage():
   - Mock chat.core.postMessage
   - Verify messageProcessor triggered
   - Verify error handling
4. Create test file: `lama.core/services/ai/__tests__/AIMessageListener.test.ts`
5. Test AIMessageListener:
   - Mock chat.core.retrieveMessages
   - Verify author filtering
   - Verify response triggering logic
   - Verify no duplicate responses

### Acceptance Criteria
- [ ] ChatHandler has >80% code coverage
- [ ] AIMessageListener has >80% code coverage
- [ ] All edge cases tested
- [ ] Tests run via `npm test`
- [ ] All tests pass

### Files Created
- `lama.core/services/ai/__tests__/ChatHandler.test.ts`
- `lama.core/services/ai/__tests__/AIMessageListener.test.ts`

---

## T5: Integration Testing

**Priority**: P1 (High)
**Estimated Effort**: 2-3 hours
**Dependencies**: T1, T2, T3, T4

### Description
Perform end-to-end integration testing of the refactored chat initialization.

### Subtasks
1. Test creating new AI conversation:
   - Start app, log in
   - Create conversation via UI
   - Verify topic created with proper participants
   - Verify channel created correctly
2. Test sending messages:
   - Send user message
   - Verify AI responds
   - Verify no duplicate responses
   - Verify message persistence
3. Test app restart:
   - Send message, wait for AI response
   - Restart app
   - Verify conversation and messages persist
4. Test multi-participant groups (future):
   - Create group with 3+ participants
   - Verify each has own channel
   - Verify messages visible to all

### Acceptance Criteria
- [ ] Can create new AI conversation
- [ ] AI responds to messages (no duplicates)
- [ ] Messages persist after restart
- [ ] No errors in console
- [ ] Performance acceptable (<5s first response)

### Test Procedure
1. Clear storage: `./clear-all-storage.sh`
2. Start app: `npm run electron`
3. Log in as demo/demo
4. Create LAMA conversation
5. Send "test" message
6. Verify single AI response
7. Restart app
8. Verify conversation persists

---

## T6: Documentation & Cleanup

**Priority**: P2 (Medium)
**Estimated Effort**: 1-2 hours
**Dependencies**: T1, T2, T3, T4, T5

### Description
Update documentation and clean up legacy code comments.

### Subtasks
1. Update CLAUDE.md with chat.core usage guidance
2. Add JSDoc to all modified functions
3. Update quickstart.md with testing results
4. Add troubleshooting section to quickstart.md
5. Mark legacy initialization code with deprecation comments
6. Update IMPLEMENTATION-STATUS.md

### Acceptance Criteria
- [ ] CLAUDE.md reflects new chat.core usage
- [ ] All public APIs have JSDoc
- [ ] quickstart.md updated with test results
- [ ] Legacy code marked for future removal
- [ ] IMPLEMENTATION-STATUS.md shows feature complete

### Files Modified
- `lama.cube/CLAUDE.md`
- `specs/023-chat-core-refactor/quickstart.md`
- `specs/023-chat-core-refactor/IMPLEMENTATION-STATUS.md` (create)

---

## Implementation Order

### Day 1: Core Logic (T1, T2, T3)
1. Morning: Implement ChatHandler (T1)
2. Afternoon: Update IPC handler (T2)
3. Evening: Refactor AIMessageListener (T3)

### Day 2: Testing & Validation (T4, T5)
1. Morning: Write unit tests (T4)
2. Afternoon: Integration testing (T5)
3. Evening: Bug fixes based on testing

### Day 3: Polish (T6)
1. Documentation updates
2. Code review
3. Final testing

---

## Risk Mitigation

### Risk: Breaking existing conversations
**Mitigation**: Implement alongside existing code, use feature flag if needed

### Risk: Duplicate AI responses
**Mitigation**: Comprehensive testing of AIMessageListener filtering logic

### Risk: Access control issues
**Mitigation**: Verify chat.core grants proper access to both Topic and Channels

### Risk: Performance regression
**Mitigation**: Benchmark message send/receive times before and after

---

## Success Metrics

- [ ] New conversations use chat.core
- [ ] No duplicate AI responses
- [ ] Messages persist across restarts
- [ ] All tests pass
- [ ] No regressions in existing functionality
- [ ] Code review approved

---

## Rollback Plan

If critical issues found:
1. Revert IPC handler changes (T2)
2. Keep ChatHandler in lama.core (no harm)
3. File bugs for issues found
4. Plan remediation

---

## Notes

- This is a REFACTORING, not a rewrite
- No changes to data models or IPC signatures
- Backward compatible with existing conversations
- Follows "no fallbacks" principle - fail fast, fix issues
