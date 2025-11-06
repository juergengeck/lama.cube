# API Contracts: Chat Core Refactoring

**Feature**: 023-chat-core-refactor
**Phase**: 1 (Design)
**Date**: 2025-11-05

## Overview

This document defines the API contracts for components involved in the chat.core refactoring. These are EXISTING contracts being clarified and properly used.

---

## 1. ChatHandler (lama.core)

**Location**: `lama.core/services/ai/ChatHandler.ts`

### Purpose
Platform-agnostic business logic for AI chat operations using proper chat.core initialization.

### Constructor Dependencies
```typescript
interface ChatHandlerDeps {
  nodeOneCore: OneInstanceTypes;
  topicManager: AITopicManager;
  contactManager: AIContactManager;
  promptBuilder: SystemPromptBuilder;
  messageProcessor: AIMessageProcessor;
  llmManager: LLMManager;
  chatCore: typeof ChatCore; // chat.core module
}
```

### Public Methods

#### createConversation
```typescript
async createConversation(params: {
  contactIdHash: SHA256IdHash<Person>;
  modelId?: string;
}): Promise<{
  topicId: string;
  topicHash: SHA256IdHash<Topic>;
  channelHash: SHA256Hash<Channel>;
}>
```

**Behavior**:
1. Resolves AI contact
2. Gets user identity from nodeOneCore
3. Calls `chat.core.startConversation()` with proper participants
4. Returns topic metadata

**Error Cases**:
- Contact not found → throw
- User not authenticated → throw
- chat.core initialization failure → throw

#### sendMessage
```typescript
async sendMessage(params: {
  topicId: string;
  content: string;
  attachments?: Attachment[];
}): Promise<void>
```

**Behavior**:
1. Validates topic exists
2. Posts user message via chat.core
3. Triggers AI response via AIMessageProcessor
4. Returns immediately (streaming handled separately)

**Error Cases**:
- Topic not found → throw
- Message creation failure → throw

---

## 2. chat.core Integration

**Module**: `@refinio/chat.core`

### startConversation

```typescript
async function startConversation(
  one: OneInstanceTypes,
  participants: SHA256IdHash<Person>[],
  topicId: string,
  initialMessage?: string
): Promise<{
  topicHash: SHA256IdHash<Topic>;
  channelHash: SHA256Hash<Channel>;
}>
```

**Contract**:
- Creates Topic object with topicId
- For 2 participants: Creates single shared channel (P2P)
- For 3+ participants: Creates channel per participant (group)
- Grants proper access (person-based for P2P, group-based for groups)
- Returns topic and channel hashes

**Critical Requirements**:
1. Must grant access to BOTH Topic object AND channels
2. Must use consistent participant ordering for P2P
3. Must handle AI contacts same as human contacts
4. NO special treatment for AI participants

### postMessage

```typescript
async function postMessage(
  one: OneInstanceTypes,
  topicId: string,
  author: SHA256IdHash<Person>,
  content: string,
  attachments?: Attachment[]
): Promise<SHA256IdHash<Message>>
```

**Contract**:
- Creates Message object in proper channel
- P2P: Posts to shared channel
- Group: Posts to author's own channel
- Returns message hash

**Critical Requirements**:
1. Must write to correct channel (shared for P2P, own for group)
2. Must set proper author
3. Must handle attachments if provided

---

## 3. AIMessageListener

**Location**: `lama.core/services/ai/AIMessageListener.ts`

### Purpose
Listens for messages in AI conversations and triggers responses.

### Interface Changes

#### Constructor
```typescript
constructor(deps: {
  nodeOneCore: OneInstanceTypes;
  aiContactManager: AIContactManager;
  messageProcessor: AIMessageProcessor;
  chatCore: typeof ChatCore;
})
```

**New Dependency**: Requires `chatCore` for proper message querying.

#### onChannelUpdate
```typescript
private async onChannelUpdate(
  channelHash: SHA256Hash<Channel>,
  topicId: string
): Promise<void>
```

**Behavior Changes**:
1. Query messages using `chat.core.retrieveMessages(topicId)`
2. Filter for messages NOT authored by AI
3. Check if AI has responded to latest message
4. If not, trigger response via messageProcessor

**Critical**:
- Must use chat.core for message retrieval (not manual queries)
- Must check ALL channels for topic (chat.core handles aggregation)
- Must filter by author to avoid responding to own messages

---

## 4. IPC Handler (lama.cube)

**Location**: `lama.cube/main/ipc/handlers/chat.ts`

### Purpose
Electron-specific IPC bridge to ChatHandler.

### Handler Methods

#### chat:createConversation
```typescript
handler: async (event, params: {
  contactIdHash: SHA256IdHash<Person>;
  modelId?: string;
}) => Promise<{
  topicId: string;
  topicHash: SHA256IdHash<Topic>;
  channelHash: SHA256Hash<Channel>;
}>
```

**Implementation**:
```typescript
return await chatHandler.createConversation(params);
```

#### chat:sendMessage
```typescript
handler: async (event, params: {
  topicId: string;
  content: string;
  attachments?: Attachment[];
}) => Promise<void>
```

**Implementation**:
```typescript
return await chatHandler.sendMessage(params);
```

**No Changes Required**: IPC signatures remain identical.

---

## 5. System Components (Unchanged)

These components are used but NOT modified:

### AIContactManager
- `getAIContact(idHash)` - Resolves AI contact
- `listAIContacts()` - Lists available AI assistants

### AITopicManager
- `getOrCreateTopicId(participants)` - Gets/creates topic ID
- `getTopicMetadata(topicId)` - Retrieves topic info

### SystemPromptBuilder
- `buildSystemPrompt(context)` - Generates AI system prompt

### AIMessageProcessor
- `processMessage(topic, message)` - Handles AI response generation
- Streams responses back to UI

### LLMManager
- `chat(params)` - Sends request to LLM provider
- Handles streaming, structured output, etc.

---

## 6. Data Flow Contracts

### Creating Conversation

```
UI → IPC(chat:createConversation)
  → ChatHandler.createConversation()
    → aiContactManager.getAIContact()
    → chat.core.startConversation([user, ai], topicId)
      → Creates Topic object
      → Creates Channel(s) based on participant count
      → Grants access (person or group based)
    → Returns {topicId, topicHash, channelHash}
  → IPC returns to UI
UI → Updates state, shows conversation
```

### Sending Message

```
UI → IPC(chat:sendMessage)
  → ChatHandler.sendMessage()
    → chat.core.postMessage(topicId, user, content)
      → Creates Message in proper channel
    → messageProcessor.processMessage()
      → Triggers AI response
      → Streams response chunks to UI
  → IPC returns
```

### Receiving AI Response

```
AI channel updated
  → AIMessageListener.onChannelUpdate()
    → chat.core.retrieveMessages(topicId)
    → Filter for non-AI messages
    → Check if AI responded
    → If not: messageProcessor.processMessage()
      → Generates AI response
      → Posts via chat.core.postMessage()
      → Streams to UI
```

---

## 7. Error Handling Contracts

### ChatHandler
- **Throw on error** - No fallbacks, fail fast
- Errors propagate to IPC layer
- IPC returns error to UI

### chat.core Functions
- Throw on invalid input
- Throw on access violations
- Throw on storage failures

### AIMessageListener
- Log errors but continue listening
- Failed responses do NOT crash listener
- Retry logic handled by AIMessageProcessor

---

## 8. Testing Contracts

### Unit Test Requirements

#### ChatHandler.createConversation
- Mock all dependencies
- Verify chat.core.startConversation called with correct participants
- Verify proper participant ordering (sorted for P2P)
- Verify topic metadata returned

#### ChatHandler.sendMessage
- Mock chat.core.postMessage
- Mock messageProcessor.processMessage
- Verify correct topicId, author, content passed

#### AIMessageListener
- Mock chat.core.retrieveMessages
- Verify author filtering works
- Verify response triggered for unanswered messages
- Verify no response for already-answered messages

### Integration Test Requirements

#### End-to-End Conversation
1. Create conversation via IPC
2. Send message via IPC
3. Verify AI responds
4. Verify message persists
5. Restart app
6. Verify messages still visible

#### Multi-Participant Groups
1. Create group with 3+ participants
2. Verify each has own channel
3. Verify messages visible to all
4. Verify AI responds appropriately

---

## 9. Migration Contract

### Backward Compatibility
- Existing conversations remain readable
- New conversations use chat.core
- NO migration of old conversations required
- Both paths coexist during transition

### Deprecation Path
1. Phase 1: Implement chat.core path (this feature)
2. Phase 2: Switch all new conversations to chat.core
3. Phase 3: Deprecate legacy initialization (future feature)
4. Phase 4: Remove legacy code (future feature)

---

## Summary

This refactoring:
- Uses EXISTING chat.core APIs correctly
- Changes NO public IPC signatures
- Fixes initialization to be architecture-compliant
- Maintains backward compatibility
- Follows "no fallbacks" principle

All contracts are implementation details - external APIs remain unchanged.
