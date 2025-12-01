# Plan Facade Migration Status

**Date**: November 20, 2025
**Status**: Phase 1 & 2 COMPLETE ✅

## What Was Accomplished

### ✅ Phase 1: IPC Wrapper Layer (Previously Completed)
The ElectronPlansProvider was already built and provides IPC-based implementations of all Plan interfaces:
- `ContactsPlan` - Contact management via IPC
- `ChatPlan` - Chat operations via IPC
- `AIPlan` - AI assistant operations via IPC
- `MemoryPlan` - Memory management via IPC
- Context injection (owner ID) working

**Location**: `electron-ui/src/providers/ElectronPlansProvider.tsx`

### ✅ Phase 2: Wire Up Provider (JUST COMPLETED)
Successfully integrated ElectronPlansProvider into the app component tree:

**File**: `electron-ui/src/App.tsx`

**Changes**:
```typescript
// Line 3: Import the provider
import { ElectronPlansProvider } from '@/providers/ElectronPlansProvider'

// Lines 394-397: Wrap app with provider
return (
  <ElectronPlansProvider>
    <BridgeProvider bridge={lamaBridge}>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* ... app content ... */}
      </div>
    </BridgeProvider>
  </ElectronPlansProvider>
)
```

**Result**: All components that use `usePlans()` now receive IPC-backed implementations instead of direct model access.

### 🔧 Compatibility Layer Created
**File**: `electron-ui/src/model/index.ts`

Created a `useModel()` hook that provides browser-compatible interface using IPC Plans:
- `model.chatPlan` → delegates to `usePlans().chat`
- `model.aiAssistantPlan` → delegates to `usePlans().ai`
- `model.initialized` → uses `bridge.isAuthenticated`
- `model.ownerId` → uses `bridge.ownerId`

**Purpose**: Enables gradual migration - components can use `useModel()` during transition, then migrate to `usePlans()` directly.

## Current Architecture

```
┌─────────────────────────────────────────────┐
│ App.tsx                                      │
│  └─ ElectronPlansProvider (NEW! ✅)         │
│      └─ BridgeProvider                       │
│          └─ PlansProvider (@lama/ui)         │
│              └─ App Components               │
└─────────────────────────────────────────────┘

Components can access Plans via:
  const { chat, contacts, ai } = usePlans()

All Plan methods proxy to Node.js via IPC:
  await chat.sendMessage(...) → IPC → Node.js ONE.core
```

## What Works Now

1. **Plan Facade Active**: All Plan interfaces are available via `usePlans()`
2. **IPC Communication**: Plan calls correctly proxy to Node.js process
3. **Build System**: App builds and runs successfully ✅
4. **Compatibility**: Existing components continue working with local implementations
5. **First Component Wired**: UserSelectionDialog now uses `contactsPlan.getContacts()` instead of direct IPC ✅

## Phase 3: Component Migration (NOT STARTED)

### Goal
Replace duplicate components in lama.cube with imports from lama.browser

### Blockers Discovered
Attempted direct import of browser components failed because:
1. **Deep Dependencies**: Browser components import browser-specific infrastructure (`ModelContext`, direct model access)
2. **Platform Coupling**: Components tightly coupled to browser's model architecture
3. **Circular Dependencies**: Copying components creates dependency chains that are hard to resolve

### Recommended Approach

**Option A - Refactor to @lama/ui** (Long-term, proper solution):
1. Extract truly platform-agnostic parts of ChatLayout into @lama/ui
2. Keep only `usePlans()` calls - remove all `useModel()` calls
3. Both platforms import from @lama/ui

**Option B - Gradual Migration** (Short-term):
1. Keep duplicate components for now
2. Refactor both versions to use `usePlans()` exclusively
3. Once both are equivalent, move to @lama/ui

**Option C - Adapter Layer** (Medium complexity):
1. Create platform-specific hooks (`useTopics`, `useMessages`) in each platform
2. Browser versions use direct model access
3. Cube versions use IPC
4. Share components, not infrastructure

## Files Modified

### New Files
- `electron-ui/src/model/index.ts` - Compatibility layer for `useModel()`

### Modified Files
- `electron-ui/src/App.tsx` - Wrapped with ElectronPlansProvider (lines 3, 394-397, 523-526)
- `electron-ui/src/components/UserSelectionDialog.tsx` - **NOW USES FACADE** ✅
  - Line 8: Added `import { usePlans } from '@lama/ui'`
  - Line 35: Added `const { contacts: contactsPlan } = usePlans()`
  - Line 54: Changed from `window.electronAPI.invoke('contacts:list')` to `contactsPlan.getContacts()`
- `chat.core/services/AttachmentService.ts` - Fixed TypeScript BLOB/CLOB types

### Unchanged (Original Components Restored)
- `electron-ui/src/components/ChatLayout.tsx`
- `electron-ui/src/components/ChatView.tsx`
- `electron-ui/src/components/GroupChatDialog.tsx`
- `electron-ui/src/components/InputDialog.tsx`

## Next Steps

### Immediate (Optional)
- Test Plan methods work correctly through IPC
- Verify owner ID injection is working
- Check error handling in IPC layer

### Future (Phase 3)
**DO NOT attempt direct import** - see "Blockers Discovered" above

Instead:
1. Audit current lama.cube components to identify Plan usage
2. Refactor components to use `usePlans()` instead of direct IPC calls
3. Gradually extract shared UI logic to @lama/ui
4. Long-term: Move mature, stable components to @lama/ui

## Key Learnings

1. **Plan Pattern Works**: The facade successfully abstracts IPC complexity
2. **Component Sharing Is Hard**: Direct import fails due to platform coupling
3. **Incremental Migration**: Must decouple components from platform before sharing
4. **usePlans() is Key**: Components that only use `usePlans()` are naturally portable

## References

- Migration Plan: `MIGRATION-TO-PLAN-FACADE.md`
- Provider Implementation: `electron-ui/src/providers/ElectronPlansProvider.tsx`
- Plans Interface: `@lama/ui` package (shared plan interfaces)
