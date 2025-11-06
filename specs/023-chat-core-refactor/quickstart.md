# Quick Start: Chat Core Refactoring Implementation

**Feature**: 023-chat-core-refactor
**Last Updated**: 2025-11-05

## Overview

This guide provides step-by-step instructions for implementing the chat.core integration refactoring.

## Prerequisites

Before starting:
- ✅ Read [spec.md](./spec.md) - understand the problem and requirements
- ✅ Read [research.md](./research.md) - understand architectural decisions
- ✅ Read [data-model.md](./data-model.md) - understand entities and data flow
- ✅ Review connection.core tests: `node_modules/@lama/connection.core/test/integration/group-chat.test.js`

## Implementation Steps

### Step 1: Refactor lama.core AITopicManager

**Location**: `@lama/core/ai/AITopicManager.ts` (external package)

**Changes**:
1. Add `ChatHandler` dependency via constructor injection
2. Change `createAITopic()` to include ALL participants
3. Delegate to `chatHandler.createGroupTopic()` instead of calling `TopicGroupManager` directly

**Before**:
```typescript
class AITopicManager {
  async createAITopic(topicId: string, userPersonId: SHA256IdHash<Person>) {
    const participants = [this.aiPersonId];  // ❌ Incomplete
    await this.topicGroupManager.createGroupTopic(topicId, participants);
  }
}
```

**After**:
```typescript
class AITopicManager {
  constructor(
    private chatHandler: ChatHandler,
    private aiContactManager: AIContactManager
  ) {}

  async createAITopic(topicId: string, userPersonId: SHA256IdHash<Person>) {
    const aiPersonId = await this.aiContactManager.getAIPersonId();
    const participants = [userPersonId, aiPersonId];  // ✅ Complete
    return this.chatHandler.createGroupTopic(topicId, participants);
  }
}
```

### Step 2: Update lama.cube IPC Handlers

**Location**: `lama.cube/main/ipc/handlers/chat.ts`

**Changes**:
1. Import `ChatHandler` from `@chat/core`
2. Instantiate `ChatHandler` with `nodeOneCore` dependency
3. Pass `chatHandler` to `AITopicManager` constructor

**Code**:
```typescript
import { ChatHandler } from '@chat/core';
import { AITopicManager } from '@lama/core/ai/AITopicManager';

// In initialization function
const chatHandler = new ChatHandler(nodeOneCore);
const aiTopicManager = new AITopicManager(chatHandler, aiContactManager);

// IPC handler remains unchanged - uses injected dependencies
export default {
  'chat:createAITopic': async (event, { topicId, userPersonId }) => {
    return await aiTopicManager.createAITopic(topicId, userPersonId);
  }
};
```

### Step 3: Write Integration Tests

**Location**: `lama.cube/tests/integration/chat-core-integration.test.ts`

**Pattern**: Follow connection.core test structure (group-chat.test.js)

**Test Cases**:
```typescript
describe('AI Chat Core Integration', () => {
  it('creates channels for all participants', async () => {
    // Arrange
    const topicId = 'lama';
    const userPersonId = await createTestUser();
    const aiPersonId = await aiContactManager.getAIPersonId();

    // Act
    await aiTopicManager.createAITopic(topicId, userPersonId);

    // Assert
    const userChannel = await getChannel(topicId, userPersonId);
    const aiChannel = await getChannel(topicId, aiPersonId);
    expect(userChannel).toBeDefined();
    expect(userChannel.owner).toBe(userPersonId);
    expect(aiChannel).toBeDefined();
    expect(aiChannel.owner).toBe(aiPersonId);
  });

  it('persists AI responses after streaming', async () => {
    // Test that messages survive streaming completion
    // Verify messages still exist after retrieveAllMessages()
  });

  it('maintains backward compatibility with existing chats', async () => {
    // Test that existing Topic/Channel objects still work
  });
});
```

### Step 4: Run Tests and Verify

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run full test suite
npm test

# Manual verification
npm run electron
# 1. Log in as demo/demo
# 2. Create AI chat "test"
# 3. Send message "Hello"
# 4. Verify AI response appears
# 5. Restart app
# 6. Verify messages persist
```

### Step 5: Update Agent Context

**Run script**:
```bash
./.specify/scripts/bash/update-agent-context.sh claude
```

This updates `.specify/memory/agent-contexts/claude.md` with technologies from this feature.

## Common Pitfalls

### ❌ DON'T: Call TopicGroupManager Directly
```typescript
// WRONG
await topicGroupManager.createGroupTopic(topicId, [aiPersonId]);
```

### ✅ DO: Use ChatHandler
```typescript
// CORRECT
await chatHandler.createGroupTopic(topicId, [userPersonId, aiPersonId]);
```

### ❌ DON'T: Forget Participants
```typescript
// WRONG - missing user
const participants = [aiPersonId];
```

### ✅ DO: Include ALL Participants
```typescript
// CORRECT
const participants = [userPersonId, aiPersonId];
```

### ❌ DON'T: Use Global Singletons
```typescript
// WRONG
const chatHandler = ChatHandler.getInstance();
```

### ✅ DO: Use Dependency Injection
```typescript
// CORRECT
constructor(private chatHandler: ChatHandler) {}
```

## Debugging Tips

### Messages Disappearing

**Symptom**: AI responses show during streaming but disappear after.

**Diagnosis**:
```typescript
// Check if BOTH channels exist
const channels = await getMatchingChannelInfos(topicId);
console.log('Channels:', channels.length);  // Should be 2 for AI chat
```

**Fix**: Ensure `createAITopic()` includes both user and AI in participants list.

### Channel Creation Failing

**Symptom**: Error "Cannot create channel" or similar.

**Diagnosis**:
```typescript
// Check if trust layer initialized
const hasAttestation = await checkAffirmationCertificate(groupHash);
console.log('Has attestation:', hasAttestation);  // Should be true
```

**Fix**: Ensure connection → trust → chat phase order is followed.

### TypeScript Errors

**Symptom**: "Cannot find module '@chat/core'"

**Fix**: Ensure chat.core is in dependencies:
```bash
npm install @chat/core
# or
npm link @chat/core  # if developing locally
```

## Key Files Reference

### Read These First
- `@chat/core` - Existing package with ChatHandler, TopicGroupManager
- `node_modules/@lama/connection.core/test/integration/group-chat.test.js` - Test patterns
- `node_modules/@lama/connection.core/test/test-object-filter.js` - Architecture phases

### Modify These
- `@lama/core/ai/AITopicManager.ts` - Add ChatHandler dependency
- `lama.cube/main/ipc/handlers/chat.ts` - Inject dependencies
- `lama.cube/tests/integration/chat-core-integration.test.ts` - New tests

### Don't Modify These
- `@chat/core` - Use as-is
- `@lama/connection.core` - External dependency
- `@lama/trust.core` - External dependency

## Architecture Diagram

```
┌─────────────────────────────────────┐
│      UI (Electron Renderer)         │
│   User creates AI chat "lama"       │
└─────────────────┬───────────────────┘
                  │ IPC
┌─────────────────▼───────────────────┐
│   lama.cube (IPC Handlers)          │
│   chat.ts: createAITopic()          │
└─────────────────┬───────────────────┘
                  │ calls
┌─────────────────▼───────────────────┐
│  lama.core (AITopicManager)         │
│  Prepares: [userPersonId, aiPersonId]│
└─────────────────┬───────────────────┘
                  │ delegates to
┌─────────────────▼───────────────────┐
│  chat.core (ChatHandler)            │
│  Enforces: All participants get     │
│  channels                           │
└─────────────────┬───────────────────┘
                  │ uses
┌─────────────────▼───────────────────┐
│  ONE.core (TopicGroupManager)       │
│  Creates: Topics, Channels,         │
│  HashGroups                         │
└─────────────────────────────────────┘
```

## Next Steps

After implementation:
1. Run tests (unit + integration)
2. Manual verification in Electron app
3. Code review focusing on:
   - All participants included in arrays
   - ChatHandler used (not TopicGroupManager)
   - Dependency injection (no globals)
4. Create tasks using `/speckit.tasks` (NOT part of `/speckit.plan`)

## Summary

**Key Changes**:
- ✅ AITopicManager uses ChatHandler (not TopicGroupManager directly)
- ✅ Include ALL participants: `[userPersonId, aiPersonId]`
- ✅ Dependency injection (constructor parameters)
- ✅ Integration tests matching connection.core patterns
- ✅ NO data migration (logic-only refactor)

**Success Metrics**:
- ✅ AI responses persist after streaming
- ✅ Messages survive app restarts
- ✅ All participants have channels (verified by tests)
- ✅ Clean architecture layers (connection → trust → chat → AI)

