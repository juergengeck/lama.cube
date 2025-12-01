# Migration to Plan Facade Architecture

**Status**: Phase 1 Complete ✅ | Phases 2-4 Pending ⏳

**Goal**: Eliminate architectural violations by using shared UI components from lama.browser and plan facade from ui.core.

**See**: `../../ui.core/ARCHITECTURE.md` for complete architecture documentation.

---

## Phase 1: Create IPC Wrapper Layer ✅

**Status**: Complete

**What was done**:
- ✅ Created `electron-ui/src/providers/ElectronPlansProvider.tsx`
- ✅ Implemented IPC wrappers for all Plans from ui.core/types/plans.ts
- ✅ Wrappers match Plan interfaces (ContactsPlan, ChatPlan, AIPlan, etc.)

**Result**: `usePlans()` hook can now work in lama.cube

---

## Phase 2: Wire Up ElectronPlansProvider

**Goal**: Make ElectronPlansProvider available to all components

### Steps:

1. **Update App.tsx to use ElectronPlansProvider**:
   ```bash
   # Edit: electron-ui/src/App.tsx
   ```

   ```typescript
   // Add import
   import { ElectronPlansProvider } from './providers/ElectronPlansProvider'

   // Wrap entire app
   function App() {
     return (
       <ElectronPlansProvider>
         {/* Existing app content */}
       </ElectronPlansProvider>
     )
   }
   ```

2. **Test that usePlans() works**:
   ```typescript
   // In any component
   import { usePlans } from '@lama/ui'

   function TestComponent() {
     const { contacts } = usePlans()
     console.log('usePlans() works!', contacts)
   }
   ```

**Expected**: No errors, `usePlans()` returns plan objects

---

## Phase 3: Replace Duplicated Components

**Goal**: Delete lama.cube copies, import from lama.browser

### Components to Replace:

#### 3.1 ChatLayout
**Current**: `electron-ui/src/components/ChatLayout.tsx` (DUPLICATE ❌)
**Source**: `lama.browser/browser-ui/src/components/ChatLayout.tsx` (SOURCE OF TRUTH ✅)

**Steps**:
1. Backup current ChatLayout (optional):
   ```bash
   mv electron-ui/src/components/ChatLayout.tsx electron-ui/src/components/ChatLayout.tsx.backup
   ```

2. Update imports in App.tsx:
   ```typescript
   // OLD ❌
   import { ChatLayout } from './components/ChatLayout'

   // NEW ✅
   import { ChatLayout } from '@lama/browser/browser-ui/src/components/ChatLayout'
   ```

3. Verify it compiles and runs

4. Delete backup once confirmed working:
   ```bash
   rm electron-ui/src/components/ChatLayout.tsx.backup
   ```

#### 3.2 ChatHeader
**Current**: `electron-ui/src/components/chat/ChatHeader.tsx` (DUPLICATE ❌)
**Source**: Use from lama.ui package (if exported) OR lama.browser

**Steps**:
1. Check if ChatHeader is exported from `@lama/ui`:
   ```bash
   grep "ChatHeader" ../lama.ui/src/index.ts
   ```

2. If yes, update import:
   ```typescript
   // NEW ✅
   import { ChatHeader } from '@lama/ui'
   ```

3. If no, import from lama.browser:
   ```typescript
   // NEW ✅
   import { ChatHeader } from '@lama/browser/browser-ui/src/components/chat/ChatHeader'
   ```

4. Delete duplicate:
   ```bash
   rm electron-ui/src/components/chat/ChatHeader.tsx
   ```

#### 3.3 ParticipantAvatars
**Current**: `electron-ui/src/components/ParticipantAvatars.tsx` (DUPLICATE ❌)
**Source**: Exported from `@lama/ui`

**Steps**:
1. Update all imports:
   ```typescript
   // OLD ❌
   import { ParticipantAvatars } from './ParticipantAvatars'

   // NEW ✅
   import { ParticipantAvatars } from '@lama/ui'
   ```

2. Delete duplicate:
   ```bash
   rm electron-ui/src/components/ParticipantAvatars.tsx
   ```

### Other Potentially Duplicated Components:

Search for duplicates:
```bash
# Find components that exist in both packages
for file in electron-ui/src/components/**/*.tsx; do
  basename=$(basename "$file")
  if [ -f "../lama.browser/browser-ui/src/components/$basename" ] || [ -f "../lama.ui/src/components/$basename" ]; then
    echo "DUPLICATE: $file"
  fi
done
```

**Rule**: If it exists in lama.ui or lama.browser, DELETE the lama.cube copy and import it.

---

## Phase 4: Verify AI Title Fix

**Goal**: Confirm the bug is fixed

### The Bug:
- **Before**: AI names showed as "Contact abc123..." or raw IDs
- **After**: AI names show correctly (e.g., "Claude", "GPT-4")

### Why It Works Now:

1. **lama.browser's ChatLayout** loads contacts via `usePlans()`:
   ```typescript
   const { contacts } = usePlans()
   const response = await contacts.getContacts()  // ← Gets contact info including names
   ```

2. **Builds contactsMap** with personId → {name, isAI, color}:
   ```typescript
   const map = new Map()
   for (const contact of response.contacts) {
     map.set(contact.personId, {
       name: contact.name,
       isAI: contact.isAI,
       color: contact.color
     })
   }
   ```

3. **Enriches participants** using the map:
   ```typescript
   const enrichedParticipants = topic.participants.map(participantId => {
     const contactInfo = contactsMap.get(participantId)  // ← Lookup!
     return {
       id: participantId,
       name: contactInfo?.name || `Contact ${participantId.substring(0, 8)}`,  // ← Real name
       isAI: contactInfo?.isAI || false,
       color: contactInfo?.color
     }
   })
   ```

4. **lama.cube's OLD ChatLayout** was NOT doing this lookup, so names were missing.

### Test Steps:

1. **Start lama.cube**:
   ```bash
   npm run electron
   ```

2. **Open chat with AI assistant**

3. **Verify chat header shows**:
   - ✅ AI name (e.g., "Claude", "Llama 3.1", "GPT-4")
   - ✅ NOT "Contact 1a2b3c4d..."
   - ✅ NOT raw hash/ID

4. **Hover over participant avatars**:
   - ✅ Shows contact name
   - ✅ Shows correct AI/human indicator

5. **Check browser console**:
   - ✅ No errors from usePlans()
   - ✅ Contact data loads successfully
   - ✅ Participants enriched with contact info

### If It Still Doesn't Work:

**Debug Checklist**:
- [ ] ElectronPlansProvider is wrapping App in App.tsx
- [ ] Using ChatLayout from lama.browser (NOT local copy)
- [ ] IPC handler `contacts:list` returns contacts with `isAI` flag
- [ ] Browser console shows contact data loading
- [ ] contactsMap is being built correctly

**Common Issues**:
1. **Still using old ChatLayout**: Check import path
2. **usePlans() throws**: ElectronPlansProvider not wrapping app
3. **Contacts not loading**: IPC handler issue, check main process logs
4. **Names still wrong**: Contact data missing `name` field, check backend

---

## Phase 5: Clean Up (Future)

**After migration is stable**:

### Delete Obsolete Files:
```bash
# Backup old components
mkdir -p electron-ui/src/components/.deprecated
mv electron-ui/src/components/ChatLayout.tsx electron-ui/src/components/.deprecated/
mv electron-ui/src/components/chat/ChatHeader.tsx electron-ui/src/components/.deprecated/

# After confirming everything works, delete backups
rm -rf electron-ui/src/components/.deprecated
```

### Update CLAUDE.md:
Add architecture section:
```markdown
## Plan Facade Architecture

lama.cube uses the Plan Facade pattern:
- UI components: Imported from lama.browser (SHARED)
- Business logic: Plans from @chat/core, @lama/core (SHARED)
- Platform adapter: ElectronPlansProvider (IPC wrappers)

See: ui.core/ARCHITECTURE.md
```

### Add Architecture Tests:
```typescript
// electron-ui/tests/architecture.test.ts
import { electronPlans } from '../src/providers/ElectronPlansProvider'
import type { LAMAPlans } from '@lama/ui'

describe('Architecture compliance', () => {
  it('ElectronPlansProvider exports electronPlans matching LAMAPlans', () => {
    // Check all required plans exist
    expect(electronPlans.contacts).toBeDefined()
    expect(electronPlans.chat).toBeDefined()
    expect(electronPlans.ai).toBeDefined()
    expect(electronPlans.llmConfig).toBeDefined()
  })

  it('ChatLayout is imported from lama.browser', async () => {
    const appSource = await fs.promises.readFile('src/App.tsx', 'utf-8')
    expect(appSource).toMatch(/@lama\/browser\/browser-ui\/src\/components\/ChatLayout/)
    expect(appSource).not.toMatch(/\.\/components\/ChatLayout/)
  })
})
```

---

## Rollback Plan

**If migration causes issues**:

1. **Restore old ChatLayout**:
   ```bash
   git checkout electron-ui/src/components/ChatLayout.tsx
   ```

2. **Remove ElectronPlansProvider from App.tsx**:
   ```typescript
   // Unwrap
   function App() {
     return (
       // ElectronPlansProvider removed
       <ChatLayout />
     )
   }
   ```

3. **File issue** with details:
   - Error message
   - Console logs
   - Steps to reproduce

---

## Success Criteria

**Phase 2** ✅:
- [ ] App.tsx wraps with ElectronPlansProvider
- [ ] No errors on startup
- [ ] usePlans() returns plan objects in any component

**Phase 3** ✅:
- [ ] ChatLayout imported from lama.browser
- [ ] No duplicate components in lama.cube
- [ ] All imports updated

**Phase 4** ✅:
- [ ] AI names display correctly in chat headers
- [ ] Participant avatars show real names
- [ ] No "Contact abc123..." placeholders

**Overall** ✅:
- [ ] Architecture complies with ui.core/ARCHITECTURE.md
- [ ] Single source of truth for UI components
- [ ] Plan facade working correctly

---

## Next Steps

1. **Execute Phase 2**: Wire up ElectronPlansProvider in App.tsx
2. **Execute Phase 3**: Replace ChatLayout and other duplicated components
3. **Execute Phase 4**: Test and verify AI title fix
4. **Close architectural violation ticket**

---

**Last Updated**: 2025-11-20
**Assigned To**: Development Team
**Priority**: High (Architectural Compliance)
