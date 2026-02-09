# Contact Detail Sections - Remaining Work

## Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Data Layer | ✅ Complete | TrustModel methods added |
| Phase 2: IPC Layer | ✅ Complete | Handlers in trust.ts, sharing.ts |
| Phase 3: Bridge Layer | ✅ Complete | Bridge methods added |
| Phase 4: UI Layer | 🔶 Partial | Sections added, not verified |

## Completed Tasks

### 1. ✅ Fix Build Errors (DONE)

**File:** `main/ipc/plans/journal.ts`
- Removed broken import from non-existent `@refinio/lama.core/plans/JournalPlan.js`
- Rewrote handlers to use `AssemblyManager` and `JournalModule`
- Added `getJournalPlan()` function for lama.core AIManager integration

### 2. ✅ Certificate Cache Population (DONE)

**File:** `trust.core/models/CAModel.ts`
- Added `cachesCertificate()` calls in `issueCertificate()`
- Added `cachesCertificate()` calls in `issueDeviceCertificate()`
- Added `cachesCertificate()` calls in `createRootCertificate()`
- Added `cachesCertificate()` calls in `loadRootCertificate()`

## Remaining Tasks

### 3. ✅ Wire Certificate Queries to CAModel (DONE)

**File:** `main/ipc/plans/trust.ts`
- Added `getCAModel()` getter to CAPlan
- Updated `getCertificatesFor` to use `nodeOneCore.getCAPlan().getCAModel()`
- Updated `getCertificatesBy` to use `nodeOneCore.getCAPlan().getCAModel()`
- Uses proper `SHA256IdHash<Person>` typing

**Note:** CAModel now caches certificates on issuance. For historical certificates
already stored before this fix, they won't appear until re-issued or manually loaded.

### 4. Proper Sharing Queries

**File:** `main/ipc/plans/sharing.ts`

Full implementation requires:
```typescript
// Get certs issued to this contact
const cert = await certificateIndex.getCertForSubject(personId);
const contexts = getCertificateContexts(cert);
const topicIds = extractTopicIds(contexts);

// Resolve to topic names
for (const topicId of topicIds) {
  const topic = await topicModel.findTopic(topicId);
  items.push({ type: 'topic', id: topicId, name: topic?.displayName });
}

// "May share" - topics where contact is NOT participant
const allTopics = await topicModel.topics.all();
for (const topic of allTopics) {
  const hashGroup = await getObject(topic.participants);
  if (!hashGroup.person.has(personId)) {
    mayShare.push(topic);
  }
}
```

### 5. UI Verification

**File:** `lama.ui/src/components/cards/ContactCard.tsx`

Verify:
- [x] Compiles without errors (fixed lama.ui imports to use local journal types)
- [ ] Three sections render correctly (manual testing needed)
- [ ] Lazy loading on section expand (manual testing needed)
- [ ] Empty states display properly (manual testing needed)
- [ ] Muted styling for "by contact" and "may share" sections (manual testing needed)

## Implementation Summary

1. ✅ Fixed journal.ts build error (rewrote to use AssemblyManager/JournalModule)
2. ✅ CAModel now caches certificates on issuance
3. ✅ Certificate queries wired to CAModel via CAPlan
4. 🔶 Sharing queries use simplified implementation (proper impl needs more work)
5. ✅ UI builds without errors

## Known Limitations

- **Sharing data**: Current implementation returns placeholder data. Full implementation
  requires CertificateIndex integration and proper topic participant queries.
- **Historical certificates**: Certificates issued before this fix won't appear until
  the CAModel cache is populated (requires re-issuance or manual loading).
