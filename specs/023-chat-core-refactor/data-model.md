# Data Model: Chat Core Refactoring

**Feature**: 023-chat-core-refactor
**Phase**: 1 (Design)
**Date**: 2025-11-05

## Overview

This document describes the entities involved in refactoring AI chat initialization. **NO NEW DATA STRUCTURES** are being created - this is a logic refactoring that uses existing ONE.core entities correctly.

## Existing ONE.core Entities (Unchanged)

These entities already exist in ONE.core and will continue to be used as-is:

### Topic

```typescript
type Topic = {
  $type$: 'Topic';
  id: string;  // Topic ID (e.g., "lama", "general", etc.)
  name?: string;
  description?: string;
  createdBy: SHA256IdHash<Person>;
  createdAt: number;  // Unix timestamp
};
```

**Usage**: Represents a conversation/chat topic. Unchanged.

**Storage**: Versioned ONE.core object, stored as content-addressed hash.

### Channel

```typescript
type Channel = {
  id: string;  // Same as Topic.id for group chats
  owner: SHA256IdHash<Person>;  // Participant who owns this channel
};
```

**Usage**: Each participant in a group chat has their own channel with the same topic ID. Messages are written to owner's channel and read from all channels.

**Storage**: Created by ChannelManager, referenced by channel info.

**CRITICAL**: In group chats, EVERY participant MUST have a channel. This is the bug being fixed.

###Person

```typescript
type Person = {
  $type$: 'Person';
  name: string;
  email?: string;
  publicKey: Uint8Array;
  // ... other fields
};
```

**Usage**: Represents chat participants (users and AI assistants).

**Storage**: Versioned ONE.core object with ID hash.

### Message

```typescript
type Message = {
  $type$: 'Message';
  content: string;
  author: SHA256IdHash<Person>;
  timestamp: number;
  // ... other fields
};
```

**Usage**: Chat messages written to channels.

**Storage**: Stored in channels, retrieved via TopicRoom.retrieveAllMessages().

### HashGroup (for access control)

```typescript
type HashGroup = {
  $type$: 'HashGroup';
  members: SHA256IdHash<Person>[];
  // ... other fields
};
```

**Usage**: Defines group membership for access control.

**Storage**: Must have AffirmationCertificate (trust.core requirement) to sync via CHUM.

## Refactoring Entities (Logic Changes Only)

These are NOT data structures - they are code entities being refactored:

### AITopicManager (lama.core)

**Before Refactoring**:
```typescript
class AITopicManager {
  async createAITopic(topicId: string, userPersonId: SHA256IdHash<Person>) {
    // WRONG: Calls TopicGroupManager directly
    // WRONG: Only includes AI in participants list
    const participants = [this.aiPersonId];  // ❌ Missing user!
    await this.topicGroupManager.createGroupTopic(topicId, participants);
  }
}
```

**After Refactoring**:
```typescript
class AITopicManager {
  constructor(
    private chatHandler: ChatHandler,  // From chat.core
    private aiContactManager: AIContactManager
  ) {}

  async createAITopic(topicId: string, userPersonId: SHA256IdHash<Person>) {
    // CORRECT: Delegates to chat.core
    // CORRECT: Includes ALL participants
    const aiPersonId = await this.aiContactManager.getAIPersonId();
    const participants = [userPersonId, aiPersonId];  // ✅ Complete list
    return this.chatHandler.createGroupTopic(topicId, participants);
  }
}
```

**Changes**:
- Dependency injection: `ChatHandler` instead of direct `TopicGroupManager`
- Complete participant list: `[user, AI]` instead of just `[AI]`
- Delegates to chat.core instead of bypassing it

### ChatHandler (chat.core - Already Exists)

```typescript
class ChatHandler {
  constructor(private nodeOneCore: OneInstanceTypes) {}

  async createGroupTopic(
    topicId: string,
    participants: SHA256IdHash<Person>[]
  ): Promise<void> {
    // INVARIANT ENFORCED: All participants MUST get channels
    for (const participant of participants) {
      await this.channelManager.createChannel({
        id: topicId,
        owner: participant
      });
    }

    // Create Topic object, access control, etc.
    // ...
  }
}
```

**Usage**: chat.core enforces "all participants get channels" invariant. This ALREADY EXISTS and works correctly - we just need to USE it.

**No Changes Needed**: chat.core is correct. The bug is in bypassing it.

## Data Flow (Before vs After)

### Before (WRONG - Current Bug)

```
User creates AI chat "lama"
     ↓
lama.cube IPC handler
     ↓
AITopicManager.createAITopic()
     ↓
TopicGroupManager.createGroupTopic([aiPersonId])  ❌ Direct call, incomplete list
     ↓
Creates channel ONLY for AI  ❌ User has no channel
     ↓
Result: User messages disappear, AI responses don't persist
```

### After (CORRECT - Refactored)

```
User creates AI chat "lama"
     ↓
lama.cube IPC handler
     ↓
AITopicManager.createAITopic()
     ↓
ChatHandler.createGroupTopic([userPersonId, aiPersonId])  ✅ Delegates to chat.core
     ↓
chat.core enforces invariant:
  - Creates channel {id: "lama", owner: userPersonId}  ✅
  - Creates channel {id: "lama", owner: aiPersonId}    ✅
     ↓
Result: Both participants have channels, messages persist
```

## Channel Creation Rules

### Group Chats (3+ participants including AI)

**Rule**: Each participant gets their OWN channel with same topic ID.

**Example**: Topic "project-alpha" with 3 participants

```typescript
const participants = [alice, bob, ai];

// chat.core creates 3 channels:
{ id: "project-alpha", owner: alice }  // Alice's channel
{ id: "project-alpha", owner: bob }    // Bob's channel
{ id: "project-alpha", owner: ai }     // AI's channel
```

**Writing**: Each writes ONLY to their own channel.
**Reading**: `TopicRoom.retrieveAllMessages("project-alpha")` aggregates from all 3 channels.

### P2P Chats (2 participants)

**Rule**: ONE shared channel, owner is null/undefined.

**Example**: P2P chat between Alice and Bob

```typescript
const channelId = `${alice}<->${bob}`;  // Lexicographically sorted
{ id: channelId, owner: null }  // Shared channel
```

**IMPORTANT**: AI chats are GROUP chats (user + AI = 2+ participants), so they use group chat rules, NOT P2P rules.

## Validation Rules

### MUST Enforce (chat.core Invariants)

1. **All participants get channels**: `participants.length === channels.length`
2. **Each channel has correct owner**: `channel.owner === participant`
3. **All channels share topic ID**: `channels.every(c => c.id === topicId)`
4. **Trust established before chat**: HashGroup has AffirmationCertificate (trust.core)

### MUST NOT Do (Architectural Violations)

1. **AI code calling TopicGroupManager directly**: Use chat.core instead
2. **Incomplete participant lists**: Always include ALL participants
3. **Manual channel creation**: Let chat.core handle it
4. **Bypassing trust layer**: Ensure AffirmationCertificates exist

## State Transitions

### Topic Creation Flow

```
State 0: No topic exists
     ↓ [createGroupTopic called]
State 1: Topic object created
     ↓ [for each participant]
State 2: Channels created for ALL participants
     ↓ [access control setup]
State 3: HashGroup created with AffirmationCertificate
     ↓ [CHUM sync]
State 4: Topic ready for messages
```

**Rollback**: If any step fails, throw error (NO FALLBACKS - fail fast).

## Migration Strategy

**NO DATA MIGRATION NEEDED**: This is a logic-only refactor.

- Existing Topics: Continue working unchanged
- Existing Channels: Remain as-is
- Existing Messages: No modifications
- Existing AI chats: May have missing channels (user must recreate chat)

**Future chats**: Use refactored code, channels created correctly.

## Summary

- **NO NEW DATA STRUCTURES**: All entities already exist in ONE.core
- **LOGIC REFACTORING ONLY**: Change code to use chat.core correctly
- **BACKWARD COMPATIBLE**: Existing data unchanged
- **KEY CHANGE**: AITopicManager delegates to ChatHandler instead of bypassing it
- **INVARIANT ENFORCED**: chat.core guarantees all participants get channels

**Next**: See [quick start.md](./quickstart.md) for implementation guide.
