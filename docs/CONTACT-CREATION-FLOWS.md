# Contact Creation Flows - AI & WhatsApp

This document traces both contact creation flows in detail, identifies where journal entries should be added for creation events, and where trust certificate journal entries should be added.

## Table of Contents

1. [AI Contact Creation Flow](#ai-contact-creation-flow)
2. [WhatsApp Contact Creation Flow](#whatsapp-contact-creation-flow)
3. [Trust Certificate Creation](#trust-certificate-creation)
4. [Journal Entry Integration Points](#journal-entry-integration-points)
5. [Proposed Journal Entry Schema](#proposed-journal-entry-schema)

---

## AI Contact Creation Flow

### Overview

AI contacts are created with full cryptographic identity, trust certificates, and immediate trust establishment - unlike regular contacts which require manual acceptance.

### Complete Call Chain

```
┌─ UI Layer ─────────────────────────────────────────────────────────────────┐
│                                                                             │
│  AddContactDialog (lama.ui)                                                 │
│  └─ User selects AI model, clicks "Add Contact"                            │
│  └─ Calls: contacts.addContact({ name, email, modelId })                   │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ plans.contacts.addContact()
                                    ▼
┌─ Platform Bridge ──────────────────────────────────────────────────────────┐
│                                                                             │
│  ContactsPlan (chat.core/plans/ContactsPlan.ts:488-567)                    │
│  └─ Detects modelId → delegates to AIAssistantPlan                         │
│  └─ Calls: aiAssistantModel.ensureAIForModel(modelId, name, email)         │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─ AI Creation Layer ────────────────────────────────────────────────────────┐
│                                                                             │
│  AIAssistantPlan (lama.core/plans/AIAssistantPlan.ts:694-827)              │
│  └─ Checks if AI already exists by aiId                                    │
│  └─ Calls: AIManager.ensureAIForModel()                                    │
│                                                                             │
│  AIManager.createAI() (lama.core/models/ai/AIManager.ts:224-422)           │
│  ├─ Step 1: Create Person with default keys (lines 253-256)                │
│  ├─ Step 2: Create PersonName PersonDescription (lines 265-272)            │
│  ├─ Step 3: Create SignKey PersonDescription (lines 274-282)               │
│  ├─ Step 4: Create Profile (lines 284-299)                                 │
│  ├─ Step 5: Create AI metadata object (lines 302-331)                      │
│  ├─ Step 6: Create Someone object (lines 333-345)                          │
│  ├─ Step 7: Create Trust Certificates (lines 347-396)                      │
│  │   ├─ TrustKeysCertificate (profile verification)                        │
│  │   ├─ AffirmationCertificate (identity affirmation)                      │
│  │   └─ Share certificates with everyone                                   │
│  └─ Step 8: Set trust level to 'high' (lines 398-408)                      │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─ ONE.core Storage ─────────────────────────────────────────────────────────┐
│                                                                             │
│  Objects Created:                                                          │
│  ├─ Person (versioned) - AI's cryptographic identity                       │
│  ├─ Keys (unversioned) - Public/private keypairs                           │
│  ├─ PersonName (unversioned) - Display name                                │
│  ├─ SignKey (unversioned) - Public signing key                             │
│  ├─ Profile (versioned) - Links Person to descriptions                     │
│  ├─ AI (versioned) - Metadata (modelId, traits, personality)               │
│  ├─ Someone (versioned) - Contact aggregator                               │
│  ├─ TrustKeysCertificate (versioned) - Signature verification              │
│  ├─ AffirmationCertificate (versioned) - Profile authentication            │
│  └─ AIList entry (versioned) - Registry of all AIs                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Files and Line Numbers

| Component | File | Lines |
|-----------|------|-------|
| UI Dialog | `lama.ui/src/components/contacts/AddContactDialog.tsx` | 91-144 |
| ContactsPlan | `chat.core/plans/ContactsPlan.ts` | 488-567 |
| IPC Adapter | `lama.cube/main/ipc/plans/contacts.ts` | 32-43, 100-103 |
| AIAssistantPlan | `lama.core/plans/AIAssistantPlan.ts` | 694-762, 775-827 |
| AIManager.createAI | `lama.core/models/ai/AIManager.ts` | 224-422 |
| Trust Creation | `lama.core/models/ai/AIManager.ts` | 347-408 |

### Trust Establishment Details

AI contacts receive **immediate trust** without user approval:

1. **SignKey in Profile** (lines 274-282)
   - Public key embedded in PersonDescription
   - Enables signature verification in group chats

2. **TrustKeysCertificate** (lines 357-364)
   ```typescript
   await this.leuteModel.trust.certify('TrustKeysCertificate', {
     profile: profileVersionHash
   })
   ```

3. **AffirmationCertificate** (lines 366-372)
   ```typescript
   await this.leuteModel.trust.affirm(profileVersionHash, personIdHash)
   ```

4. **Certificates Shared** (lines 375-385)
   - Via CHUM protocol to all peers
   - Enables distributed verification

5. **Trust Level Assignment** (lines 398-408)
   ```typescript
   this.deps.trustPlan.setTrustLevel({
     personId: personIdHash,
     trustLevel: 'high',
     establishedBy: myId,
     reason: `AI assistant: ${name}`
   })
   ```

---

## WhatsApp Contact Creation Flow

### Overview

WhatsApp contacts are created **automatically** during sync, with **no explicit trust system** - contacts are imported directly from WhatsApp without cryptographic verification.

### Complete Call Chain

```
┌─ UI Layer ─────────────────────────────────────────────────────────────────┐
│                                                                             │
│  useWhatsAppSync() hook (lama.cube/electron-ui/src/hooks/useWhatsAppSync.ts)│
│  └─ Listens: baileys:connectionChanged                                     │
│  └─ Listens: baileys:syncStats (contactsCount, chatsCount, messagesCount)  │
│  └─ Listens: baileys:messageReceived                                       │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ Events from BaileysModule
                                    ▼
┌─ IPC Handler Layer ────────────────────────────────────────────────────────┐
│                                                                             │
│  baileys.ts (lama.cube/main/ipc/plans/baileys.ts)                          │
│  ├─ connect() (lines 33-79) - Initiates WhatsApp connection                │
│  ├─ getStatus() (lines 107-125) - Returns connection status                │
│  └─ setupBaileysEventForwarding() (lines 249-336) - Event bridge           │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─ BaileysModule Layer ──────────────────────────────────────────────────────┐
│                                                                             │
│  BaileysModule (lama.core/modules/BaileysModule.ts:96-295)                 │
│  ├─ Creates ContactMapper, MessageMapper, AuthService                      │
│  ├─ onContactsUpdate → contactMapper.syncContacts(contacts)                │
│  └─ onHistorySync → messageMapper.mapIncomingMessage() (batch)             │
│                                                                             │
└─────────────────┬─────────────────────────────────────────┬─────────────────┘
                  │                                         │
        ┌─────────┴─────────┐                     ┌─────────┴─────────┐
        ▼                   ▼                     ▼                   ▼
┌─ Contact Path ────────────────────────┐  ┌─ Message Path ─────────────────┐
│                                        │  │                                │
│  BaileysContactMapper.ts              │  │  BaileysMessageMapper.ts       │
│                                        │  │                                │
│  syncContacts(contacts[])              │  │  mapIncomingMessage()          │
│  ├─ Batch size: 10 (Promise.all)      │  │  ├─ getOrCreateTopic()         │
│  └─ mapContact(waContact)              │  │  ├─ mapSender (contact)        │
│      ├─ extractPhoneNumber(jid)        │  │  └─ Post message to topic      │
│      ├─ Check shouldImportContacts()   │  │                                │
│      └─ ensurePersonExists()           │  │                                │
│                                        │  │                                │
│  createNewContact() uses model layer:  │  │                                │
│  ├─ 1. createPersonIfNotExist(email)   │  │                                │
│  ├─ 2. createDefaultKeysIfNotExist()   │  │                                │
│  ├─ 3. ProfileModel.constructWithNew   │  │                                │
│  │      Profile(personId, owner,       │  │                                │
│  │      profileId, [PhoneNumber],      │  │                                │
│  │      [PersonName])                  │  │                                │
│  │      → builds full graph in memory  │  │                                │
│  │      → single saveAndLoad()         │  │                                │
│  └─ 4. leuteModel.addProfile()        │  │                                │
│         → addProfileFromResult hook    │  │                                │
│         → creates Someone              │  │                                │
│         → adds to Leute.other          │  │                                │
│         → serialized via               │  │                                │
│           serializeWithType('addPro…') │  │                                │
│                                        │  │                                │
└────────────────────────────────────────┘  └────────────────────────────────┘
                  │
                  ▼
┌─ ONE.core Storage ─────────────────────────────────────────────────────────┐
│                                                                             │
│  Objects Created (via model layer):                                        │
│  ├─ Person (versioned) - Deterministic from phone number                   │
│  ├─ Keys (owner keys) - Default keys only                                  │
│  ├─ PersonName (unversioned) - via ProfileModel communicationEndpoints     │
│  ├─ PhoneNumber (unversioned) - via ProfileModel personDescriptions        │
│  ├─ Profile (versioned) - profileId: "wa:{phoneNumber}"                    │
│  ├─ Someone (versioned) - created by addProfileFromResult hook             │
│  ├─ WhatsAppEndpoint (versioned) - JID → Person mapping                    │
│  ├─ WhatsAppTopicMapping (versioned) - Chat JID → Topic                    │
│  └─ WhatsAppChatPreference (versioned) - Per-chat import settings          │
│                                                                             │
│  NOT Created:                                                              │
│  ├─ SignKey - No cryptographic verification                                │
│  ├─ TrustKeysCertificate - No trust system                                 │
│  └─ AffirmationCertificate - No trust system                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Files and Line Numbers

| Component | File | Lines |
|-----------|------|-------|
| UI Hook | `lama.cube/electron-ui/src/hooks/useWhatsAppSync.ts` | 33-176 |
| IPC Handler | `lama.cube/main/ipc/plans/baileys.ts` | 33-336 |
| Module Init | `lama.core/modules/BaileysModule.ts` | 96-295 |
| Contact Mapper | `chat.baileys/services/BaileysContactMapper.ts` | 149-464 |
| Message Mapper | `chat.baileys/services/BaileysMessageMapper.ts` | 238-293 |
| Chat Preferences | `chat.baileys/services/WhatsAppChatPreferenceService.ts` | 107-150 |

### WhatsApp-Specific Objects

| Recipe | File | Purpose |
|--------|------|---------|
| WhatsAppEndpoint | `chat.baileys/recipes/WhatsAppEndpointRecipe.ts` | JID → Person mapping |
| WhatsAppTopicMapping | `chat.baileys/recipes/WhatsAppTopicMappingRecipe.ts` | Chat JID → Topic |
| WhatsAppChatPreference | `chat.baileys/recipes/WhatsAppChatPreferenceRecipe.ts` | Import settings |
| WhatsAppStatus | `chat.baileys/recipes/WhatsAppStatusRecipe.ts` | Sync status tracking |

### Trust Difference from AI Contacts

| Aspect | AI Contact | WhatsApp Contact |
|--------|------------|------------------|
| Trust System | Full (certificates, verification) | None (implicit from sync) |
| Keys | Full keypair + SignKey | Owner keys only |
| Certificates | TrustKeysCertificate + AffirmationCertificate | None |
| Trust Level | Explicit 'high' assignment | No trust level |
| Sharing | Certificates shared with all peers | No sharing |
| Identity | Generated for AI | Deterministic from phone |

---

## Trust Certificate Creation

### Certificate Types in the System

| Certificate Type | File | Purpose |
|------------------|------|---------|
| AffirmationCertificate | `one.models/src/recipes/Certificates/AffirmationCertificate.ts` | Affirms data accuracy |
| TrustKeysCertificate | `trust.core/recipes/TrustKeysCertificate.ts` | Device key trust |
| AccessCertificate | `trust.abac/src/recipes/AccessCertificate.ts` | Access grants |
| TrustRelationship | `trust.core/recipes/TrustRelationship.ts` | Trust status tracking |

### Trust Certificate Creation Points

#### 1. AI Contact Creation (AIManager.createAI)

**File**: `lama.core/models/ai/AIManager.ts:347-396`

```typescript
// TrustKeysCertificate creation
const trustKeysCert = await this.leuteModel.trust.certify('TrustKeysCertificate', {
  profile: profileVersionHash
})

// AffirmationCertificate creation
const affirmationCert = await this.leuteModel.trust.affirm(
  profileVersionHash,
  personIdHash
)

// Share with everyone
await this.leuteModel.shareVersionsWithEveryone(profileIdHash)
await this.leuteModel.shareObjectWithEveryone(trustKeysCert.signature.hash)
await this.leuteModel.shareObjectWithEveryone(affirmationCert.hash)
```

#### 2. Device Pairing (pairing-trust-handler.ts)

**File**: `lama.cube/main/core/pairing-trust-handler.ts:231-321`

```typescript
// Step 1: Key Trust - TrustKeysCertificate
await trust.certify('TrustKeysCertificate', { profile: profile.loadedVersion })

// Step 1.5: AccessCertificate (via trust.abac)
const cert = await createPairingCertificate({
  localPersonId: myId,
  remotePersonId: remotePersonId,
  storeObject: storeVersionedObjectFn,
  trustLevel: 'trusted',
  contexts: ['*'],
  delegationAllowed: true
})
```

#### 3. Contact Acceptance (contact-trust-manager.ts)

**File**: `lama.cube/main/core/contact-trust-manager.ts:133-200`

- `createDiscoveryVC()` - For discovered contacts (DISCOVERED level)
- `createAcceptanceVC()` - When user accepts (ACCEPTED level)
- `createBlockVC()` - When user blocks (BLOCKED level)

### Trust Level Progression

```
DISCOVERED → PENDING → ACCEPTED → TRUSTED → (or BLOCKED)
     ↓           ↓          ↓          ↓
DiscoveryVC   [wait]   AcceptanceVC  TrustKeysCert
                                   + AccessCert
```

---

## Journal Entry Integration Points

### Current Journal System

The codebase has **two parallel journal systems**:

1. **Legacy (lama.core)**: Direct Plan/Story creation
2. **Modern (assembly.core)**: Plan/Story with AssemblyDimension indexing

**Key Files**:
- `lama.core/plans/JournalPlan.ts` - Legacy recording
- `assembly.core/plans/JournalPlan.ts` - Modern query facade
- `lama.core/modules/JournalModule.ts` - Module with persistence
- `lama.cube/main/ipc/plans/journal.ts` - IPC adapters

### Proposed Journal Entry Points

#### AI Contact Creation - Journal Entry Location

**File**: `lama.core/models/ai/AIManager.ts`

**Location**: After Step 8 (trust level assignment), around line 410

```typescript
// PROPOSED: Add journal entry for AI contact creation
// Location: lama.core/models/ai/AIManager.ts:~410

// After trust level assignment (line 408)
if (this.deps.trustPlan) {
  this.deps.trustPlan.setTrustLevel({...}).catch(...)
}

// ===== ADD JOURNAL ENTRY HERE =====
if (this.deps.journalPlan) {
  await this.deps.journalPlan.recordContactCreation({
    type: 'ai-contact-created',
    personId: personIdHash,
    displayName: name,
    email,
    modelId,
    aiId,
    personality: personality || null,
    createdBy: myId,
    timestamp: Date.now(),
    objects: {
      person: personIdHash,
      profile: profileIdHash,
      ai: aiIdHash,
      someone: someoneIdHash
    }
  })
}
// ===================================

return personIdHash
```

#### AI Contact Trust Certificates - Journal Entry Location

**File**: `lama.core/models/ai/AIManager.ts`

**Location**: Inside the trust certificate creation block, around line 390

```typescript
// PROPOSED: Add journal entry for trust certificate creation
// Location: lama.core/models/ai/AIManager.ts:~390

if (profileVersionHash && this.leuteModel.trust) {
  try {
    // Create TrustKeysCertificate
    const trustKeysCert = await this.leuteModel.trust.certify('TrustKeysCertificate', {
      profile: profileVersionHash
    })

    // ===== ADD JOURNAL ENTRY HERE =====
    if (this.deps.journalPlan) {
      await this.deps.journalPlan.recordTrustCertificate({
        type: 'trust-keys-certificate-created',
        certificateType: 'TrustKeysCertificate',
        subject: personIdHash,
        profile: profileVersionHash,
        certificateHash: trustKeysCert.signature.hash,
        issuer: myId,
        timestamp: Date.now(),
        context: 'ai-contact-creation'
      })
    }
    // ===================================

    // Create AffirmationCertificate
    const affirmationCert = await this.leuteModel.trust.affirm(
      profileVersionHash,
      personIdHash
    )

    // ===== ADD JOURNAL ENTRY HERE =====
    if (this.deps.journalPlan) {
      await this.deps.journalPlan.recordTrustCertificate({
        type: 'affirmation-certificate-created',
        certificateType: 'AffirmationCertificate',
        subject: personIdHash,
        profile: profileVersionHash,
        certificateHash: affirmationCert.hash,
        issuer: myId,
        timestamp: Date.now(),
        context: 'ai-contact-creation'
      })
    }
    // ===================================

    // Share with everyone...
  } catch (certError) {
    console.error('[AIManager] Certificate creation failed:', certError)
  }
}
```

#### WhatsApp Contact Creation - Journal Entry Location

**File**: `chat.baileys/services/BaileysContactMapper.ts`

**Location**: At the end of `createNewContact()`, after `leuteModel.addProfile()`

```typescript
// Journal entry for WhatsApp contact creation
// Location: chat.baileys/services/BaileysContactMapper.ts - createNewContact()

// After leuteModel.addProfile(profileModel.idHash) which triggers:
//   addProfileFromResult hook → creates Someone → adds to Leute.other

if (this.deps.journalPlan) {
  const someone = await this.leuteModel.getSomeone(personId);
  this.deps.journalPlan.recordContactCreation({
    contactType: 'whatsapp',
    personId: personId.toString(),
    displayName,
    createdBy: this.ownerId.toString(),
    source: 'whatsapp-sync',
    phoneNumber,
    jid,
    objects: {
      person: personId.toString(),
      profile: profileModel.idHash.toString(),
      someone: someone ? someone.idHash.toString() : 'unknown'
    }
  }).catch(...)
}
```

#### WhatsApp Contact - NO Trust Certificates

WhatsApp contacts currently have **no trust certificate creation** because they use implicit trust from the sync.

**If trust certificates were to be added**, the location would be after
`ProfileModel.constructWithNewProfile()` and before `leuteModel.addProfile()` in
`createNewContact()`. The profile version hash from `profileModel.loadedVersion`
would be passed to `leuteModel.trust.certify()`.

---

## Implementation Status

### Implemented

The journal entry system for contact creation and trust certificates has been implemented:

#### 1. JournalPlan Types and Methods (lama.core/plans/JournalPlan.ts)

- **New Types**:
  - `ContactCreationEntry` - For AI and WhatsApp contact creation
  - `TrustCertificateEntry` - For trust certificate creation/revocation

- **New Methods**:
  - `recordContactCreation(entry)` - Records contact creation events
  - `recordTrustCertificate(entry)` - Records trust certificate events

#### 2. AI Contact Journal Entries (lama.core/models/ai/AIManager.ts)

Added in `createAI()` method:
- **TrustKeysCertificate journal entry** - After line ~365
- **AffirmationCertificate journal entry** - After line ~385
- **Contact creation journal entry** - After line ~410

#### 3. WhatsApp Contact Journal Entries (chat.baileys/services/BaileysContactMapper.ts)

Added in `createNewContact()` method:
- **Contact creation journal entry** - After line ~350

#### 4. Dependency Wiring

- **AIManager**: `journalPlan` added to `AIManagerDeps` interface
- **BaileysContactMapper**: `journalPlan` added to `ContactMapperDeps` interface
- **ai-assistant-handler-adapter.ts**: Lazy getter for journalPlan in storageDeps
- **BaileysModule.ts**: JournalPlan created and passed to ContactMapper

---

## Journal Entry Schema

### Contact Creation Entry

```typescript
interface ContactCreationJournalEntry {
  type: 'ai-contact-created' | 'whatsapp-contact-created' | 'manual-contact-created';
  personId: SHA256IdHash<Person>;
  displayName: string;

  // AI-specific
  modelId?: string;
  aiId?: string;
  personality?: AIPersonality;

  // WhatsApp-specific
  phoneNumber?: string;
  jid?: string;

  // Common
  email?: string;
  createdBy: SHA256IdHash<Person>;
  timestamp: number;
  source: 'ui' | 'whatsapp-sync' | 'api';

  // Object references for audit trail
  objects: {
    person: SHA256IdHash<Person>;
    profile: SHA256IdHash<Profile>;
    someone: SHA256IdHash<Someone>;
    ai?: SHA256IdHash<AI>;
    whatsappEndpoint?: SHA256Hash<WhatsAppEndpoint>;
  };
}
```

### Trust Certificate Entry

```typescript
interface TrustCertificateJournalEntry {
  type:
    | 'trust-keys-certificate-created'
    | 'affirmation-certificate-created'
    | 'access-certificate-created'
    | 'trust-keys-certificate-revoked'
    | 'access-certificate-revoked';

  certificateType: 'TrustKeysCertificate' | 'AffirmationCertificate' | 'AccessCertificate';
  subject: SHA256IdHash<Person>;
  issuer: SHA256IdHash<Person>;
  certificateHash: SHA256Hash<any>;

  // Context-specific
  profile?: SHA256Hash<Profile>;
  trustLevel?: 'full' | 'limited' | 'temporary' | 'trusted' | 'low';

  // Audit
  timestamp: number;
  context: 'ai-contact-creation' | 'whatsapp-contact-creation' | 'device-pairing' | 'contact-acceptance';

  // For revocations
  revokedCertificateHash?: SHA256Hash<any>;
  revocationReason?: string;
}
```

### JournalPlan Methods to Add

```typescript
// In lama.core/plans/JournalPlan.ts

/**
 * Record a contact creation event
 */
async recordContactCreation(entry: ContactCreationJournalEntry): Promise<void> {
  const planIdHash = await this.createContactCreationPlan(entry);
  await this.createStory(planIdHash, {
    title: `Contact Created: ${entry.displayName}`,
    domain: 'contacts',
    metadata: entry
  });
}

/**
 * Record a trust certificate creation/revocation event
 */
async recordTrustCertificate(entry: TrustCertificateJournalEntry): Promise<void> {
  const planIdHash = await this.createTrustCertificatePlan(entry);
  await this.createStory(planIdHash, {
    title: `${entry.certificateType}: ${entry.type}`,
    domain: 'trust',
    metadata: entry
  });
}
```

---

## Summary

### Key Differences Between AI and WhatsApp Contact Creation

| Aspect | AI Contact | WhatsApp Contact |
|--------|------------|------------------|
| Trigger | User action in UI | Automatic sync |
| Identity | Generated for AI model | Deterministic from phone |
| Keys | Full keypair + SignKey | Owner keys only |
| Trust Certificates | Yes (TrustKeys + Affirmation) | No |
| Trust Level | Explicit 'high' | None |
| Sharing | Certificates shared | No sharing |
| Journal Entries (proposed) | Creation + 2 certificates | Creation only |

### Journal Entry Locations Summary

| Event | File | Line (approx) |
|-------|------|---------------|
| AI Contact Creation | `lama.core/models/ai/AIManager.ts` | ~410 |
| AI TrustKeysCertificate | `lama.core/models/ai/AIManager.ts` | ~365 |
| AI AffirmationCertificate | `lama.core/models/ai/AIManager.ts` | ~375 |
| WhatsApp Contact Creation | `chat.baileys/services/BaileysContactMapper.ts` | ~350 |
| WhatsApp Trust (if added) | `chat.baileys/services/BaileysContactMapper.ts` | ~337 |
| Device Pairing Trust | `lama.cube/main/core/pairing-trust-handler.ts` | ~265, ~280 |
| Contact Acceptance | `lama.cube/main/core/contact-trust-manager.ts` | ~165 |
