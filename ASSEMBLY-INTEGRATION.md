# Assembly System Integration - lama.cube

## What Was Integrated

The Assembly infrastructure (knowledge extraction + Supply/Demand markets) has been fully integrated into lama.cube. This connects conversations in the journal to assemblies with trust-based information sharing.

## Files Created/Modified

### Core Package (`packages/one.knowledge/`)

**Created:**
- `src/recipes/Supply.ts` - Supply objects with trust levels
- `src/recipes/Demand.ts` - Demand objects with matching
- `src/models/AssemblyManager.ts` - Orchestrates assembly lifecycle
- Exports in `src/index.ts`

**Updated:**
- `src/recipes/Assembly.ts` - Added `supplyId`, `demandIds`, `storyRef` fields

### lama.cube Integration

**Created:**
- `main/services/assembly-manager-singleton.ts` - Singleton wrapper for AssemblyManager
- `main/ipc/plans/assembly.ts` - IPC handlers for assembly operations

**Modified:**
- `main/app.ts` - Imported assemblyManagerSingleton
- `main/ipc/controller.ts` - Registered assembly IPC handlers
- `main/services/node-provisioning.ts` - Initialize AssemblyManager after node provision

### Documentation

- `/docs/ASSEMBLY-WIRING-GUIDE.md` - Complete integration guide
- `/lama.cube/ASSEMBLY-INTEGRATION.md` - This file

## How It Works

```
User has conversation
         ↓
KnowledgeAssembly extracts subjects & keywords
         ↓
AssemblyManager creates Assembly with history
         ↓
Supply auto-created if ≥3 keywords
         ↓
Trust levels from contacts filter access
         ↓
Demand matching finds relevant supplies
         ↓
AssemblySupplyView displays your offerings
```

## Initialization Flow

1. User logs in via UI
2. Browser sends provisioning to main process (`provision:node` IPC)
3. `node-provisioning.ts` initializes Node.js ONE.core
4. After node init, **AssemblyManager initializes**:
   - Creates `KnowledgeAssembly` with TopicModel & LeuteModel
   - Sets up auto-supply creation (min 3 keywords)
   - Configures trust-based filtering (default: 'medium')
5. Assembly system listens to topic updates
6. When user sends messages, knowledge extraction happens automatically

## Available IPC Handlers

### Assembly Operations

```typescript
// Get all assemblies
window.electronAPI.invoke('assembly:list')
// Returns: { success: boolean, assemblies: Array<AssemblyInfo> }

// Get specific assembly
window.electronAPI.invoke('assembly:get', assemblyId)
// Returns: { success: boolean, assembly: AssemblyData }

// Get all active supplies
window.electronAPI.invoke('assembly:supplies:list')
// Returns: { success: boolean, supplies: SupplyData[] }

// Get supplies for specific identity
window.electronAPI.invoke('assembly:supplies:for-identity', identityId)
// Returns: { success: boolean, supplies: SupplyData[] }
```

### Demand Operations

```typescript
// Create a demand
window.electronAPI.invoke('assembly:demand:create', {
  keywords: ['hash1', 'hash2'],  // Keyword SHA256 hashes
  subjects: ['subjectHash1'],     // Optional
  domain: 'health',               // Optional
  query: 'Looking for...',        // Optional
  trustRequired: 'medium',        // Optional: me|high|medium|low
  urgency: 'high'                 // Optional: low|medium|high|critical
})
// Returns: { success: boolean, demand: DemandData }
```

### Trust Management

```typescript
// Set trust level for an identity
window.electronAPI.invoke('assembly:trust:set', identityId, 'trusted')
// Returns: { success: boolean }

// Get trust level
window.electronAPI.invoke('assembly:trust:get', identityId)
// Returns: { success: boolean, trustLevel: TrustLevel }

// Get all trust levels
window.electronAPI.invoke('assembly:trust:list')
// Returns: { success: boolean, trustLevels: Record<string, TrustLevel> }
```

## Trust Levels

Four levels control information flow:

- **`me`** (4) - Private, IoM only (Internet of Me)
  - Never propagates beyond your devices
  - Share settings level

- **`high`** (3) - Trusted contacts
  - Shared with explicitly trusted identities
  - Close friends, family

- **`medium`** (2) - Verified contacts
  - Shared with verified identities
  - Professional contacts

- **`low`** (1) - Public
  - Broadcasts widely
  - Public information

Access hierarchy: `me` > `high` > `medium` > `low`

A supply with `trustLevel: 'high'` can only be accessed by identities with trust level `me` or `high`.

## Automatic Behavior

### On Conversation

When user sends messages in a topic:
1. KnowledgeAssembly extracts subjects & keywords
2. If ≥3 keywords extracted → Assembly created
3. AssemblyManager auto-creates Supply (if `autoCreateSupply: true`)
4. Supply includes:
   - All extracted keywords
   - All extracted subjects
   - Trust level: `medium` (default)
   - Domain: `general` (default)
   - Status: `active`

### On Demand Creation

When demand is created:
1. AssemblyManager matches against all active supplies
2. Calculates match score (keyword overlap + subject match)
3. Filters by trust level (requester must have sufficient trust)
4. Returns sorted matches (highest score first)
5. Only returns matches above threshold (default: 0.5)

## Configuration

In `AssemblyManagerConfig` (main/services/assembly-manager-singleton.ts):

```typescript
{
  defaultTrustLevel: 'medium',    // Default for new supplies
  autoCreateSupply: true,          // Auto-create from assemblies
  minKeywordsForSupply: 3,         // Min keywords required
  matchScoreThreshold: 0.5         // Min match score (0-1)
}
```

## Console Output

When working correctly, you'll see:

```
[AssemblyManager] Initialized successfully
[AssemblyManager] Assembly created: { id: '...', subjects: 2, keywords: 5, complexity: 3.2 }
[AssemblyManager] Supply created: { domain: 'general', trustLevel: 'medium', keywords: 5 }
[AssemblyManager] Demand matched: { keywords: 3, matches: 2, topMatch: 0.85 }
```

## Events

AssemblyManager emits events you can listen to:

- `onAssemblyCreated` - New assembly from conversation
- `onSupplyCreated` - New supply offering created
- `onDemandMatched` - Demand matched to supplies
- `onMarketUpdate` - General market state changed

Access via `nodeOneCore.assemblyManager`:

```typescript
nodeOneCore.assemblyManager.onSupplyCreated.listen((supply) => {
  console.log('New supply:', supply.domain)
})
```

## UI Integration

### UnifiedDevicesView

Already set up to show contacts with trust levels. To sync with AssemblyManager:

```typescript
// In DevicePlatformAdapter implementation
setTrustLevel: async (instanceId, trustLevel) => {
  // Call assembly IPC to sync trust
  await window.electronAPI.invoke('assembly:trust:set', instanceId, trustLevel)

  // Also update your contacts model
  await yourContactsModel.setTrust(instanceId, trustLevel)

  return { success: true }
}
```

### AssemblySupplyView

To display active supplies in your UI:

```typescript
import { AssemblySupplyView } from '@lama/lama.ui'

function MySuppliesPage() {
  const [supplies, setSupplies] = useState([])

  useEffect(() => {
    loadSupplies()
  }, [])

  async function loadSupplies() {
    const result = await window.electronAPI.invoke('assembly:supplies:list')
    if (result.success) {
      setSupplies(result.supplies)
    }
  }

  return (
    <AssemblySupplyView
      assemblies={supplies.map(s => ({
        id: s.ownerId,
        storyRef: '',
        supply: s,
        created: s.createdAt.getTime(),
        status: s.status
      }))}
      resolveKeyword={async (hash) => {
        // Load keyword by hash and return human-readable term
        return await loadKeywordTerm(hash)
      }}
      resolveSubject={async (hash) => {
        // Load subject by hash and return title
        return await loadSubjectTitle(hash)
      }}
    />
  )
}
```

## Testing

To test the integration:

### 1. Start the app

```bash
cd lama.cube
npm run electron:src
```

### 2. Watch logs

Look for:
```
[NodeProvisioning] Initializing AssemblyManager...
[AssemblyManager] Initialized successfully
```

### 3. Have a conversation

Send several messages about a topic (e.g., "climate policy"). Look for:

```
[KnowledgeAssembly] Processing topic update
[AssemblyManager] Assembly created: { subjects: 1, keywords: 4 }
[AssemblyManager] Supply created: { domain: 'general', keywords: 4 }
```

### 4. Query supplies

From browser console:
```javascript
const result = await window.electronAPI.invoke('assembly:supplies:list')
console.log(result.supplies)
```

### 5. Create demand

```javascript
const demand = await window.electronAPI.invoke('assembly:demand:create', {
  keywords: ['<hash1>', '<hash2>'],
  trustRequired: 'medium',
  urgency: 'high'
})
// Should match your supply
```

## Troubleshooting

### "AssemblyManager not initialized"

- Check node is provisioned (user logged in)
- Look for init errors in logs
- Verify `nodeOneCore.initialized === true`

### No supplies created

- Check keyword count (need ≥3 by default)
- Verify `autoCreateSupply: true` in config
- Check KnowledgeAssembly is extracting keywords

### Demand not matching

- Check trust levels (supply.trustLevel vs demand.trustRequired)
- Verify keyword overlap (need >50% match by default)
- Check supply status is 'active'

### Events not firing

- Ensure AssemblyManager initialized
- Check event listeners are connected
- Verify `nodeOneCore.assemblyManager` is set

## Next Steps

1. **Persistence** - Store assemblies/supplies in ONE storage
2. **Network Sync** - Replicate supplies across federation
3. **UI Components** - Build journal views that show assemblies
4. **Reputation** - Calculate reputation scores from interactions
5. **Story Integration** - Connect to Story objects (Plan/Story memoization)

## Architecture Notes

### Why Singleton?

`assembly-manager-singleton.ts` wraps AssemblyManager because:
- ONE.core models (TopicModel, LeuteModel) are singletons
- Need single source of truth for trust levels
- Simplifies IPC - no need to pass instance references

### Why in node-provisioning.ts?

AssemblyManager init happens in `node-provisioning.ts` because:
- Needs TopicModel & LeuteModel (available after provision)
- Needs ownerId (identity hash)
- Part of core initialization sequence

### IPC Pattern

Following lama.cube convention:
- IPC handlers in `main/ipc/plans/assembly.ts`
- Business logic in `packages/one.knowledge`
- Singleton service in `main/services/`
- Thin IPC adapters, fat business logic

## Summary

✅ AssemblyManager singleton created
✅ IPC handlers registered
✅ Initialization wired into node-provisioning
✅ Trust levels ready for contact integration
✅ Auto-supply creation on conversations
✅ Demand matching with trust filtering

The system is **ready to use**. Conversations automatically create assemblies and supplies. Trust levels control who can access information. Demands match to supplies based on keywords and trust.

Next: Build UI components to display supplies and create demands interactively.
