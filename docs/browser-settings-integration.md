# Browser Platform Settings Integration

Analysis of what's needed to integrate the refactored UserSettings system with lama.browser.

## Current State: lama.browser Architecture

### Platform Details

**From lama.browser/CLAUDE.md:**
- **Location**: `/browser-ui/`
- **Platform**: Browser (IndexedDB storage)
- **Execution**: ONE.core runs directly in browser main thread (NO Electron, NO Node.js, NO workers)
- **Models**: SingleUserNoAuth, LeuteModel, ChannelManager, TopicModel, TopicAnalysisModel
- **Storage**: IndexedDB (owner-specific, created after login)

### Existing Handlers (Platform-Agnostic)

From `browser-ui/src/model/Model.ts`, lama.browser already uses:

**LAMA Core Handlers** (AI-related):
- `AIHandler` - AI operations
- `AIAssistantHandler` - AI assistant management
- `TopicAnalysisHandler` - Topic analysis
- `ProposalsHandler` - Context-aware proposals
- `KeywordDetailHandler` - Keyword details
- `WordCloudSettingsHandler` - Word cloud settings ✅ (partial settings support!)
- `LLMConfigHandler` - LLM configuration
- `CryptoHandler` - Cryptographic operations
- `AuditHandler` - Audit logging

**Chat Core Handlers**:
- `ChatHandler` - Chat operations
- `ContactsHandler` - Contact management
- `ExportHandler` - Data export
- `FeedForwardHandler` - Feed forward
- `IOMHandler` - Information over messages

### Current Settings Story

**What Exists:**
1. ✅ **WordCloudSettingsHandler** - Handles word cloud preferences
   - Location: `lama.core/handlers/WordCloudSettingsHandler.ts`
   - Uses ONE.core recipes for storage
   - Platform-agnostic (works in browser)

2. ✅ **LLMConfigHandler** - Handles LLM configuration
   - Browser-specific adapter: `adapters/browser-llm-config`
   - Manages Ollama validation and config

**What's Missing:**
1. ❌ **UserSettingsHandler** - Unified settings management (our new system)
2. ❌ **UserSettings Recipe** - Not registered in browser Model.ts
3. ❌ **UserSettingsManager** - Not instantiated in browser
4. ❌ **Settings UI** - Browser-specific settings components

## Gap Analysis: What's Needed

### 1. Add UserSettings Support to lama.browser

#### Step 1: Register UserSettings Recipe

**File**: `lama.browser/browser-ui/src/model/Model.ts`

**Current recipes** (lines 130-140):
```typescript
this.one = new MultiUser({
    directory: 'lama.browser.storage',
    recipes: [
        ...RecipesStable,
        ...RecipesExperimental,
        // LAMA recipes
        SubjectRecipe,
        KeywordRecipe,
        SummaryRecipe,
        KeywordAccessStateRecipe,
        WordCloudSettingsRecipe,
        LLMRecipe
    ],
    // ...
});
```

**Needed**: Add UserSettingsRecipe
```typescript
import {UserSettingsRecipe} from '@lama/core/recipes/UserSettingsRecipe'; // Or wherever it is

this.one = new MultiUser({
    // ...
    recipes: [
        // ... existing recipes
        UserSettingsRecipe  // Add this!
    ]
});
```

#### Step 2: Create UserSettingsHandler Instance

**File**: `lama.browser/browser-ui/src/model/Model.ts`

**Current handler instantiation** (lines 201-244):
```typescript
// LAMA handlers (AI-related)
this.aiHandler = new AIHandler(this);
this.aiAssistantModel = new AIAssistantHandler({...});
// ... other handlers
this.wordCloudSettingsHandler = new WordCloudSettingsHandler(this);
```

**Needed**: Add UserSettingsHandler
```typescript
import {UserSettingsHandler} from '@lama/core/handlers/UserSettingsHandler'; // If it exists
// OR create a new handler that uses UserSettingsManager

// Option A: If UserSettingsHandler exists in lama.core
this.userSettingsHandler = new UserSettingsHandler(this);

// Option B: Create wrapper that uses UserSettingsManager
this.userSettingsManager = new UserSettingsManager(
    this, // oneCore instance
    this.one.email || 'unknown' // user email (after login)
);
```

#### Step 3: Initialize After Login

**File**: `lama.browser/browser-ui/src/model/Model.ts`

**Current init flow** (line 248):
```typescript
// Setup event handler that initialize the models when somebody logged in
this.one.onLogin(this.init.bind(this));
```

**Needed**: Initialize settings manager with user email
```typescript
public async init() {
    // ... existing initialization

    // Initialize UserSettingsManager with logged-in user email
    if (this.one.email) {
        this.userSettingsManager = new UserSettingsManager(
            this,
            this.one.email
        );
        console.log('[Model] UserSettingsManager initialized for', this.one.email);
    }

    // ... rest of init
}
```

### 2. Create Browser-Specific Hook

**Current**: lama.cube has `electron-ui/src/hooks/useSettings.ts` (IPC version)

**Needed**: `lama.browser/browser-ui/src/hooks/useSettings.ts` (direct access version)

```typescript
// lama.browser/browser-ui/src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { model } from '../model/browser-model'; // Global model instance
import type { UserSettings, AISettings, UISettings, ProposalSettings } from '@lama/core/types/user-settings-types';

interface UseSettingsResult {
    settings: UserSettings | null;
    loading: boolean;
    error: Error | null;
    updateAI: (updates: Partial<AISettings>) => Promise<UserSettings>;
    updateUI: (updates: Partial<UISettings>) => Promise<UserSettings>;
    updateProposals: (updates: Partial<ProposalSettings>) => Promise<UserSettings>;
    setDefaultModel: (modelId: string | null) => Promise<UserSettings>;
    setTheme: (theme: 'dark' | 'light') => Promise<UserSettings>;
    reload: () => Promise<void>;
}

export function useSettings(): UseSettingsResult {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadSettings = useCallback(async () => {
        // CRITICAL: Do not call before model is initialized
        if (!model.initialized || !model.userSettingsManager) {
            console.log('[useSettings] Skipping - model not initialized');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Direct access to UserSettingsManager (no IPC needed!)
            const result = await model.userSettingsManager.getSettings();
            setSettings(result);
        } catch (err) {
            console.error('[useSettings] Failed to load:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    const updateAI = useCallback(async (updates: Partial<AISettings>): Promise<UserSettings> => {
        if (!model.userSettingsManager) {
            throw new Error('UserSettingsManager not initialized');
        }
        const result = await model.userSettingsManager.updateAI(updates);
        setSettings(result);
        return result;
    }, []);

    const updateUI = useCallback(async (updates: Partial<UISettings>): Promise<UserSettings> => {
        if (!model.userSettingsManager) {
            throw new Error('UserSettingsManager not initialized');
        }
        const result = await model.userSettingsManager.updateUI(updates);
        setSettings(result);
        return result;
    }, []);

    const updateProposals = useCallback(async (updates: Partial<ProposalSettings>): Promise<UserSettings> => {
        if (!model.userSettingsManager) {
            throw new Error('UserSettingsManager not initialized');
        }
        const result = await model.userSettingsManager.updateProposals(updates);
        setSettings(result);
        return result;
    }, []);

    const setDefaultModel = useCallback(async (modelId: string | null): Promise<UserSettings> => {
        if (!model.userSettingsManager) {
            throw new Error('UserSettingsManager not initialized');
        }
        const result = await model.userSettingsManager.updateAI({
            defaultModelId: modelId || undefined
        });
        setSettings(result);
        return result;
    }, []);

    const setTheme = useCallback(async (theme: 'dark' | 'light'): Promise<UserSettings> => {
        if (!model.userSettingsManager) {
            throw new Error('UserSettingsManager not initialized');
        }
        const result = await model.userSettingsManager.updateUI({ theme });
        setSettings(result);
        return result;
    }, []);

    const reload = useCallback(async () => {
        await loadSettings();
    }, [loadSettings]);

    // Load settings when model becomes ready
    useEffect(() => {
        if (model.initialized) {
            void loadSettings();
        }

        // Listen for model initialization
        const handleReady = () => {
            console.log('[useSettings] Model ready, loading settings');
            void loadSettings();
        };
        model.onOneModelsReady(handleReady);

        return () => {
            // Cleanup listener if needed
        };
    }, [loadSettings]);

    return {
        settings,
        loading,
        error,
        updateAI,
        updateUI,
        updateProposals,
        setDefaultModel,
        setTheme,
        reload
    };
}
```

### 3. Reuse Existing UI Components

**Good News**: The UI components we created for Electron can be reused!

Files to copy/adapt from lama.cube:
- `electron-ui/src/components/settings/AISettingsPanel.tsx` ✅ (works as-is!)
- `electron-ui/src/components/settings/UISettingsPanel.tsx` ✅ (works as-is!)
- `electron-ui/src/components/settings/ProposalSettingsPanel.tsx` ✅ (works as-is!)
- `electron-ui/src/components/settings/SettingsErrorBoundary.tsx` ✅ (works as-is!)

**Why they work**: These components only depend on `useSettings()` hook, which has the same interface in both platforms.

### 4. Update TypeScript Ambient Declarations

**File**: `lama.browser/browser-ui/src/types/@OneObjectInterfaces.d.ts`

**Current** (partial):
```typescript
declare module '@OneObjectInterfaces' {
    export interface OneVersionedObjectInterfaces {
        Subject: Subject;
        Keyword: Keyword;
        Summary: Summary;
        WordCloudSettings: WordCloudSettings;
        // ... more types
    }
}
```

**Needed**: Add UserSettings
```typescript
import type { UserSettings } from '@lama/core/types/user-settings-types';

declare module '@OneObjectInterfaces' {
    export interface OneVersionedObjectInterfaces {
        // ... existing types
        UserSettings: UserSettings; // Add this!
    }
}
```

## Architecture Comparison

### lama.cube (Electron) - Current

```
┌─────────────────────────────────────────┐
│     Main Process (Node.js)              │
│  ┌───────────────────────────────────┐  │
│  │  UserSettingsManager              │  │
│  │  - ONE.core storage               │  │
│  │  - Validation                     │  │
│  │  - Caching                        │  │
│  └─────────────┬─────────────────────┘  │
│                │                         │
│  ┌─────────────▼─────────────────────┐  │
│  │  IPC Handlers                     │  │
│  │  - settings:get                   │  │
│  │  - settings:updateAI              │  │
│  └───────────────────────────────────┘  │
└─────────────────┬───────────────────────┘
                  │ IPC
┌─────────────────▼───────────────────────┐
│     Renderer Process (Browser)          │
│  ┌───────────────────────────────────┐  │
│  │  useSettings() hook               │  │
│  │  - window.electronAPI.invoke()    │  │
│  └─────────────┬─────────────────────┘  │
│                │                         │
│  ┌─────────────▼─────────────────────┐  │
│  │  Settings UI Components           │  │
│  │  - AISettingsPanel                │  │
│  │  - UISettingsPanel                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### lama.browser - Proposed

```
┌─────────────────────────────────────────┐
│     Browser Main Thread                 │
│  ┌───────────────────────────────────┐  │
│  │  Model (ONE.core + Handlers)      │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ UserSettingsManager         │  │  │
│  │  │ - IndexedDB storage         │  │  │
│  │  │ - Validation                │  │  │
│  │  │ - Caching                   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └─────────────┬─────────────────────┘  │
│                │ Direct Access          │
│  ┌─────────────▼─────────────────────┐  │
│  │  useSettings() hook               │  │
│  │  - model.userSettingsManager.*    │  │
│  └─────────────┬─────────────────────┘  │
│                │                         │
│  ┌─────────────▼─────────────────────┐  │
│  │  Settings UI Components           │  │
│  │  - AISettingsPanel (reused!)      │  │
│  │  - UISettingsPanel (reused!)      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Key Difference**: Browser has **direct access** to UserSettingsManager (no IPC layer needed).

## Implementation Checklist

### Phase 1: Core Integration (Backend)

- [ ] **T001**: Create `UserSettingsRecipe` in lama.core (if not exists)
  - Location: `lama.core/recipes/UserSettingsRecipe.ts`
  - Export from lama.core

- [ ] **T002**: Import and register `UserSettingsRecipe` in `Model.ts`
  - File: `lama.browser/browser-ui/src/model/Model.ts`
  - Add to `recipes` array (line ~139)

- [ ] **T003**: Create `UserSettingsManager` instance in `Model.ts`
  - Instantiate in constructor (lazy init)
  - Initialize with email in `init()` method

- [ ] **T004**: Add TypeScript ambient declaration
  - File: `lama.browser/browser-ui/src/types/@OneObjectInterfaces.d.ts`
  - Add `UserSettings: UserSettings` to interface

### Phase 2: Frontend Integration

- [ ] **T005**: Create browser `useSettings()` hook
  - File: `lama.browser/browser-ui/src/hooks/useSettings.ts`
  - Direct access to `model.userSettingsManager`
  - Same interface as Electron version

- [ ] **T006**: Copy settings UI components from lama.cube
  - Source: `lama.cube/electron-ui/src/components/settings/`
  - Destination: `lama.browser/browser-ui/src/components/settings/`
  - Files: AISettingsPanel, UISettingsPanel, ProposalSettingsPanel, SettingsErrorBoundary
  - **Note**: Components work as-is! No changes needed.

- [ ] **T007**: Update SettingsView to use new panels
  - File: `lama.browser/browser-ui/src/components/SettingsView.tsx`
  - Add tab navigation (if not exists)
  - Integrate panels

### Phase 3: Testing & Validation

- [ ] **T008**: Test settings persistence in IndexedDB
  - Verify settings survive page refresh
  - Check owner-specific storage

- [ ] **T009**: Test CHUM sync between browser instances
  - Open two browser tabs
  - Change settings in one
  - Verify sync to other within 30 seconds

- [ ] **T010**: Test migration from old settings format
  - If WordCloudSettings exists separately
  - Migrate to unified UserSettings

## Key Insights

### 1. Platform-Agnostic Design Pays Off

**UserSettingsManager** is platform-agnostic by design:
- ✅ No Node.js dependencies
- ✅ No Electron dependencies
- ✅ Only ONE.core abstractions (works in browser!)
- ✅ Dependency injection pattern

**Result**: 90% of code can be reused without changes!

### 2. Browser is Simpler Than Electron

**Electron** needs:
- Main process (Node.js)
- Renderer process (Browser)
- IPC communication
- contextBridge for security

**Browser** needs:
- Single thread (main thread)
- Direct function calls
- No IPC overhead

**Result**: Browser integration is actually EASIER than Electron!

### 3. Existing Handlers Prove the Pattern

lama.browser already uses 14+ platform-agnostic handlers from lama.core and chat.core:
- AIHandler ✅
- ChatHandler ✅
- WordCloudSettingsHandler ✅
- ... and more

**Pattern is proven**: Just add UserSettingsManager/Handler to the list!

### 4. UI Components Are Truly Reusable

The React components we built for Electron:
- Only depend on `useSettings()` hook interface
- No Electron-specific code
- No platform-specific imports

**Result**: Copy-paste works! Just change the hook implementation.

## Migration Strategy

### Option A: Gradual Migration (Recommended)

1. Keep existing `WordCloudSettingsHandler` working
2. Add `UserSettingsManager` alongside it
3. Migrate UI to use unified settings
4. Deprecate old handler

**Pros**: Low risk, backwards compatible
**Cons**: Temporary duplication

### Option B: Big Bang Migration

1. Remove `WordCloudSettingsHandler`
2. Implement `UserSettingsManager` fully
3. Update all UI at once

**Pros**: Clean architecture immediately
**Cons**: Higher risk, requires data migration

## Summary

### What Works Today

- ✅ Platform-agnostic handlers pattern (proven with 14+ handlers)
- ✅ ONE.core storage in browser (IndexedDB)
- ✅ Recipe system working
- ✅ CHUM sync working

### What's Needed

- 🔧 Register UserSettings recipe (1 line)
- 🔧 Instantiate UserSettingsManager (3 lines)
- 🔧 Create browser useSettings() hook (~100 lines)
- 🔧 Copy UI components (0 changes needed!)
- 🔧 Add TypeScript declarations (2 lines)

### Estimated Effort

- **Backend Integration**: 1-2 hours
- **Frontend Integration**: 2-3 hours
- **Testing**: 2-3 hours
- **Total**: ~1 day of focused work

### Risk Assessment

**Low Risk** because:
- Pattern is proven with existing handlers
- UserSettingsManager has no platform dependencies
- UI components are platform-agnostic
- No new ONE.core features needed
- CHUM sync already working

**Highest risk area**: Data migration from WordCloudSettings → UserSettings (if needed)

## Next Steps

1. **Verify**: Check if `UserSettingsRecipe` exists in lama.core
   - If not, need to move it from lama.cube

2. **Verify**: Check if `UserSettingsManager` is in lama.core or lama.cube
   - If in lama.cube, need to move to lama.core (it should be platform-agnostic)

3. **Verify**: Check lama.browser's current settings story
   - What happens with WordCloudSettings today?
   - Is there any other settings management?

4. **Decision**: Choose migration strategy (A or B above)

5. **Implement**: Follow checklist above

The architecture is sound and the implementation path is clear!
