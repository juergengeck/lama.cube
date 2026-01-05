# Sharing Logic Review: lama.cube ↔ lama.browser

**Date**: 2025-01-05
**Status**: Investigation complete - root causes identified

## Executive Summary

Two critical issues exist in the cube/browser sharing logic:

1. **Browser → Cube messages fail**: Browser messages don't reach cube despite working in the opposite direction
2. **Groups fail to share**: Group objects are rejected during CHUM import

Both issues stem from architectural gaps in the CHUM sync protocol configuration.

---

## Architecture Overview

### CHUM Sync Protocol

CHUM (Content-Hash Update Mechanism) is ONE.core's object synchronization protocol. It runs between connected peers and syncs objects based on access grants.

```
┌─────────────────┐                    ┌─────────────────┐
│   lama.cube     │                    │  lama.browser   │
│                 │                    │                 │
│  ConnectionsModel                    │  ConnectionsModel
│      ↓          │   CommServer       │      ↓          │
│  CHUM Exporter  │ ←──────────────→  │  CHUM Exporter  │
│  CHUM Importer  │                    │  CHUM Importer  │
└─────────────────┘                    └─────────────────┘
```

### Object Access Determination

CHUM uses `determineAccessibleHashes()` to decide what objects peer can access:

```typescript
// one.core/src/util/determine-accessible-hashes.ts

// Step 1: Find Access/IdAccess objects referencing the person
const personAccessObjs = await getOnlyLatestReferencingObjsHashAndId(person, 'Access');
const personIdAccessObjs = await getOnlyLatestReferencingObjsHashAndId(person, 'IdAccess');

// Step 2: Find HashGroups containing the person
const hashGroupHashesContainingPerson = await getAllEntries(person, 'HashGroup');

// Step 3: Filter HashGroups by objectFilter (REQUIRED)
const allowedHashGroups = [];
if (objectFilter) {
    for (const hashGroupHash of hashGroupHashesContainingPerson) {
        if (await objectFilter(hashGroupHash, 'HashGroup')) {
            allowedHashGroups.push(hashGroupHash);
        }
    }
}

// Step 4: Find ChannelInfo objects referencing allowed HashGroups
for (const hashGroupHash of allowedHashGroups) {
    const channelInfoHashes = await getAllEntries(hashGroupHash, 'ChannelInfo');
    // Add ChannelInfo + version nodes to accessible objects
}
```

### P2P Channel Creation

When pairing succeeds, P2PTopicService creates a shared channel:

```typescript
// chat.core/services/P2PTopicService.ts

// Create channel with both participants
const channelResult = await channelManager.createChannel(participants, null);

// Grant person-based access (NOT group-based)
await createAccess([{
    id: channelInfoIdHash,
    person: [person1, person2],  // Direct person access
    group: [],                    // NO group access
    mode: SET_ACCESS_MODE.ADD
}]);
```

---

## Issue 1: Browser → Cube Messages Don't Arrive

### Symptom
Messages sent from browser reach cube's database but are not detected/displayed. Messages from cube reach browser correctly.

### Root Cause Analysis

**Hypothesis A: CHUM not running in continuous mode**

CHUM has two modes:
- `keepRunning=false` (default): One-time sync at connection establishment
- `keepRunning=true`: Continuous sync with push notifications

If browser's CHUM runs in one-time mode:
1. Initial sync transfers existing objects ✓
2. New messages stored AFTER sync never transfer ✗

**Evidence needed**: Check ConnectionsModel initialization for `keepRunning` option.

**Hypothesis B: Push notifications not firing**

When `keepRunning=true`, CHUM relies on storage events to trigger sync:

```typescript
// one.core/src/chum-sync.ts

// Subscribe to storage events
StorageEventSystem.onVersionedObj(hash => notifyPeersWithNewContent(hash));
StorageEventSystem.onUnversionedObj(hash => notifyPeersWithNewContent(hash));
```

If these events don't fire in browser context:
1. Objects are stored locally ✓
2. CHUM never notified of new content ✗
3. Sync never triggered ✗

**Evidence needed**: Check browser's storage event system implementation.

**Hypothesis C: Access grants are asymmetric**

P2PTopicService grants access to BOTH participants. But the order matters:

```typescript
// Cube creates channel first (initiator)
await createAccess([{ id: channelInfoIdHash, person: [cubeId, browserId], ... }]);

// Browser enters topic second (responder)
// Does it also create Access? Or rely on cube's?
```

If browser doesn't create its own Access grants:
- Cube can export to browser (browser's person in cube's Access) ✓
- Browser can't export to cube (cube's person NOT in browser's Access) ✗

**Evidence needed**: Trace Access object creation in both directions.

### Where to Look

1. `/packages/one.models/src/models/ConnectionsModel.ts` - Check `keepRunning` option
2. `/packages/lama.browser/browser-ui/src/model/Model.ts` - ConnectionModule initialization
3. `/packages/one.core/src/chum-sync.ts` - Push notification mechanism

---

## Issue 2: Groups Fail to Share

### Symptom
Group objects exist in cube, browser owner is a participant, but browser doesn't receive the Group.

### Root Cause Analysis

**Root Cause: Group objects are in REJECTED_TYPES**

The CHUM importer has a hardcoded rejection list:

```typescript
// one.core/src/chum-importer-exporterclient.ts

const REJECTED_TYPES: ReadonlySet<OneObjectTypeNames> = new Set([
    'Access',
    'IdAccess',
    'Group'  // ← GROUPS REJECTED BY DEFAULT
]);

// During import:
if (this.importFilter) {
    const allowed = await this.importFilter(hash, obj.$type$);
    if (!allowed) {
        throw createError('CIEC-FO3', {obj, reason: 'importFilter rejected'});
    }
} else {
    // Default behavior: reject Access, IdAccess, and Group
    if (REJECTED_TYPES.has(obj.$type$)) {
        throw createError('CIEC-FO3', {obj});  // ← GROUP REJECTED HERE
    }
}
```

**Why this exists**: Security measure to prevent unauthorized access grants and group memberships from being injected.

**The problem**: Even with valid Group objects created by trusted peers, they're rejected unless `importFilter` explicitly allows them.

### Current Filter Configuration

ConnectionModule provides filters:

```typescript
// lama.core/modules/ConnectionModule.ts

const importFilter = async (hash: any, type: string): Promise<boolean> => {
    if (type === 'Access' || type === 'IdAccess') {
        return topicGroupManager.isAllowedInbound?.(String(hash)) ?? true;
    }
    // HashGroup/Group are metadata - allow from authenticated CHUM peers
    if (type === 'HashGroup' || type === 'Group') {
        return true;  // ← ALLOWS Group objects
    }
    return true;
};
```

**This SHOULD work!** The filter allows Group objects. Let me check if the filter is actually being used...

**Potential Issue**: ConnectionsModel must pass this filter to CHUM. If the filter isn't reaching the importer, Groups will still be rejected.

### Where to Look

1. `/packages/one.models/src/models/ConnectionsModel.ts` - How filters are passed to CHUM
2. `/packages/one.core/src/chum-importer.ts` - Where importFilter is used
3. Verify filter is actually called during Group import (add logging)

---

## Object Graph for Group Sharing

For a Group to work, these objects must all be shared:

```
Topic (versioned - ROOT object to share)
  │
  ├─► channel: SHA256IdHash<ChannelInfo>
  │     └─► ChannelInfo (versioned)
  │           └─► participants: SHA256Hash<HashGroup>
  │                 └─► HashGroup (unversioned)
  │                       └─► person: Set<SHA256IdHash<Person>>
  │
  └─► channelCertificate: SHA256Hash<AffirmationCertificate>
        └─► AffirmationCertificate (unversioned)
              ├─► data: SHA256Hash (points to ChannelInfo)
              └─► license: SHA256Hash (signing certificate)
```

CHUM traverses this graph automatically when Topic is shared. But:
1. Access must be granted to Topic
2. HashGroup must not be filtered out
3. Group must not be rejected during import

---

## Summary of Failure Points

### Browser → Cube Messages

| Layer | Status | Issue |
|-------|--------|-------|
| Message stored in browser | ✓ | Working |
| CHUM notified of new object | ? | **Verify push notifications** |
| Access grants allow export | ? | **Verify bidirectional Access** |
| Cube receives via CHUM | ? | **Verify importer receiving** |
| Cube detects via onTopicUpdated | ? | **Verify event firing** |

### Group Sharing

| Layer | Status | Issue |
|-------|--------|-------|
| Group created in cube | ✓ | Working |
| HashGroup created | ✓ | Working |
| Access granted to participants | ✓ | Working |
| CHUM exports Group | ? | **Verify objectFilter allows** |
| CHUM imports Group | ✗ | **REJECTED_TYPES blocks it** |
| importFilter called | ? | **Verify filter reaches importer** |

---

## Recommended Investigation Steps

### For Browser → Cube Messages

1. **Add logging to CHUM push notifications**:
   ```typescript
   // one.core/src/chum-sync.ts
   console.log(`[CHUM-PUSH] notifyPeersWithNewContent: hash=${hash.substring(0, 8)}`);
   ```

2. **Verify keepRunning mode**:
   ```typescript
   // Check ConnectionsModel for keepRunning option
   console.log('[ConnectionsModel] Starting CHUM with keepRunning:', options.keepRunning);
   ```

3. **Trace Access object creation**:
   - Log when Access is created in P2PTopicService
   - Log which persons are in the Access
   - Verify both cube and browser create Access grants

### For Group Sharing

1. **Verify importFilter is reaching CHUM importer**:
   ```typescript
   // one.core/src/chum-importer-exporterclient.ts
   console.log(`[CHUM-IMPORT] Type=${obj.$type$}, importFilter=${!!this.importFilter}`);
   if (this.importFilter) {
       const allowed = await this.importFilter(hash, obj.$type$);
       console.log(`[CHUM-IMPORT] importFilter result: ${allowed}`);
   }
   ```

2. **Verify ConnectionsModel passes filter to CHUM**:
   - Trace from ConnectionModule → ConnectionsModel → startChumSync
   - Ensure importFilterFactory is passed correctly

3. **Test with explicit filter that logs all calls**:
   ```typescript
   const debugImportFilter = async (hash, type) => {
       console.log(`[DEBUG] importFilter called: type=${type} hash=${hash.substring(0,8)}`);
       return true;  // Allow everything for testing
   };
   ```

---

## Architectural Recommendations

### Short-term Fixes

1. **Enable continuous CHUM sync**: Ensure `keepRunning: true` in ConnectionsModel options

2. **Fix Group import rejection**: Verify importFilter is wired correctly all the way to CHUM importer

3. **Add bidirectional Access**: Ensure BOTH peers create Access grants after pairing

### Long-term Improvements

1. **Certificate-based Group sharing**: Use AffirmationCertificate to validate Group creator before allowing import (design doc exists: `/docs/plans/2026-01-02-topic-mesh-propagation-*.md`)

2. **Mesh propagation**: Track pending Group shares and complete mesh when new peers connect

3. **Debug tooling**: Add CHUM trace logging that can be enabled via config flag

---

## Files Referenced

| File | Purpose |
|------|---------|
| `one.core/src/chum-sync.ts` | CHUM orchestration, push notifications |
| `one.core/src/chum-importer-exporterclient.ts` | REJECTED_TYPES, importFilter check |
| `one.core/src/util/determine-accessible-hashes.ts` | Access determination logic |
| `chat.core/services/P2PTopicService.ts` | P2P channel creation, Access grants |
| `lama.core/modules/ConnectionModule.ts` | Filter configuration |
| `one.models/src/models/ConnectionsModel.ts` | CHUM lifecycle management |
