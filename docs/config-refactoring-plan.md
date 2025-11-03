# Configuration Refactoring Plan

**Status**: Draft
**Author**: Claude Code
**Date**: 2025-11-03
**Estimated Effort**: 2 weeks

## Executive Summary

LAMA currently has 9+ overlapping configuration mechanisms spread across files, ONE.core objects, in-memory state, and encrypted storage. This refactoring consolidates them into 3 clean layers:

1. **Bootstrap Config** (file-based, required to start)
2. **User Settings** (ONE.core versioned, CHUM-synced)
3. **Entity Configs** (ONE.core versioned, per-entity)

**Benefits**:
- Single source of truth for user preferences
- Clear separation of concerns
- ~1000 lines of code removed
- Easier onboarding for new developers
- Better CHUM synchronization

**Risks**:
- Data migration required
- Medium refactoring scope
- 2-week timeline

---

## Current State (The Mess)

### Storage Mechanisms
1. File-based JSON (LamaConfig)
2. ONE.core versioned objects (GlobalLLMSettings, WordCloudSettings, ProposalConfig)
3. ONE.core SettingsStore (key-value pairs)
4. Encrypted storage (Ollama tokens via safeStorage)
5. In-memory runtime (ConnectionConfig, StateManager)
6. Per-entity configs (MCPServerConfig, MCPTopicConfig)

### Key Problems

#### 1. Redundant/Overlapping Values
```typescript
// Same commserver URL in 2 places:
LamaConfig.commServer.url          // File-based
ConnectionConfig.commServerUrl     // In-memory

// Model configuration scattered:
GlobalLLMSettings.defaultModelId   // ONE.core object
OllamaConfig.modelName             // LLM object
ClaudeConfig.apiKey                // In-memory
```

#### 2. Inconsistent Patterns
- **MCPServerConfig**: ONE.core object, has manager, versioned, userEmail as ID
- **OllamaConfig**: Stored in LLM objects, separate encryption manager, name as ID
- **ProposalConfig**: Type defined, recipe exists, **no implementation**
- **WordCloudSettings**: Full implementation with handler
- **LamaConfig**: File-based, completely different pattern

#### 3. Config vs Settings Confusion
- `GlobalLLMSettings` is actually config (which model to use)
- `MCPServerConfig` is config but stored like settings
- No clear rules on what goes where

#### 4. Missing Documentation
No single place that explains:
- "Here's what config you need to start the app"
- "Here's how to change user preferences"
- "Here's what gets synced via CHUM"
- "Here's what's encrypted"

---

## Target State (Clean Architecture)

### Tier 1: Bootstrap Config (File-Based)
**File**: `lama.config.json` or `~/.lama/config.json`
**Purpose**: Required to start the application
**Load**: Once at startup

```typescript
interface LamaConfig {
  instance: {
    name: string;
    email: string;
    secret: string;
    directory: string;
    wipeStorage?: boolean;
  };
  network: {
    commServer: { url: string; enabled: boolean; };
    direct: { enabled: boolean; endpoint: string; };
    priority: 'direct' | 'commserver' | 'both';
  };
  web: { url?: string; };
  logging: { level: 'debug' | 'info' | 'warn' | 'error'; };
}
```

### Tier 2: User Settings (ONE.core Versioned)
**Type**: `UserSettings` object
**Storage**: ONE.core with `userEmail` as ID
**Sync**: Via CHUM to all user instances

```typescript
interface UserSettings {
  $type$: 'UserSettings';
  userEmail: string;  // ID field

  ai: {
    defaultModelId?: string;
    temperature: number;
    maxTokens: number;
    defaultProvider: string;
    autoSelectBestModel: boolean;
    preferredModelIds: string[];
    systemPrompt?: string;
    streamResponses: boolean;
    autoSummarize: boolean;
    enableMCP: boolean;
  };

  ui: {
    theme: 'dark' | 'light';
    notifications: boolean;
    wordCloud: {
      maxWordsPerSubject: number;
      relatedWordThreshold: number;
      minWordFrequency: number;
      showSummaryKeywords: boolean;
      fontScaleMin: number;
      fontScaleMax: number;
      colorScheme: string;
      layoutDensity: string;
    };
  };

  proposals: {
    matchWeight: number;
    recencyWeight: number;
    recencyWindow: number;
    minJaccard: number;
    maxProposals: number;
  };

  updatedAt: number;
}
```

**Manager**: `UserSettingsManager`
**Replaces**: GlobalLLMSettings, WordCloudSettings, ProposalConfig

### Tier 3: Entity Configs (ONE.core Versioned)
**Keep These** (already well-designed):
- `MCPServerConfig` - User's MCP servers (ID: userEmail)
- `MCPTopicConfig` - Per-conversation MCP settings (ID: topicId)
- `MCPServer` - Individual server configs (ID: name)
- `LLM` - Per-model configs with encrypted tokens (ID: name)

**Reason**: These are entity-specific and properly scoped

---

## Migration Strategy

### What Gets Migrated

| Old Type | New Location | Migration Required |
|----------|--------------|-------------------|
| GlobalLLMSettings | UserSettings.ai | Yes - automatic |
| WordCloudSettings | UserSettings.ui.wordCloud | Yes - automatic |
| ProposalConfig | UserSettings.proposals | No (never implemented) |
| ConnectionConfig | LamaConfig.network | Yes - code changes |
| StateManager.settings | UserSettings.ui | No (ephemeral) |

### What Stays

| Type | Reason |
|------|--------|
| LamaConfig (file) | Bootstrap config - correct pattern |
| MCPServerConfig | Entity-specific - correct pattern |
| MCPTopicConfig | Entity-specific - correct pattern |
| LLM objects | Security requirement - encrypted tokens |
| OllamaConfig | Security requirement - encrypted tokens |

### What Gets Deleted

| Type | When | Replacement |
|------|------|-------------|
| AISettingsManager | After 1 release | UserSettingsManager.updateAI() |
| ConnectionConfig | Immediately | LamaConfig.network |
| settings-replication.ts | Immediately | (Never fully implemented) |
| chum-settings.ts | Immediately | UserSettings (CHUM-synced) |

---

## Implementation Phases

### Phase 0: Preparation (6 hours)
**No code changes - foundation work**

- [ ] **P0.1**: Document current state (2h)
  - Create `docs/config-refactor-inventory.md`
  - List every config type and its usage
  - Map all files that read/write config
  - Document current IPC handlers

- [ ] **P0.2**: Add comprehensive tests (4h)
  - Create `tests/integration/config-current-behavior.test.ts`
  - Test LamaConfig loading with precedence
  - Test GlobalLLMSettings store/retrieve
  - Test OllamaConfig encryption
  - Test MCPServerConfig management
  - Baseline for regression testing

**Deliverables**: Documentation + test suite
**Risk**: Low

---

### Phase 1: Consolidate Bootstrap Config (4 hours)

- [ ] **P1.1**: Extend LamaConfig type (1h)
  - Add `network.direct` section
  - Add `network.priority` field
  - Keep all existing fields (additive only)
  - File: `main/config/lama-config.ts`

- [ ] **P1.2**: Deprecate ConnectionConfig (30min)
  - Add deprecation warnings
  - Create adapter function mapping LamaConfig → ConnectionConfig
  - File: `electron-ui/src/config/connection-config.ts`

- [ ] **P1.3**: Update ConnectionConfig consumers (2h)
  - Find all imports: `grep -r "connection-config" electron-ui/src/`
  - Replace with `lamaConfig.network`
  - Test all connection flows

- [ ] **P1.4**: Delete ConnectionConfig (5min)
  - Remove `electron-ui/src/config/connection-config.ts`
  - Remove from git history

**Deliverables**: Single bootstrap config source
**Risk**: Medium (connection changes)

---

### Phase 2: Create Unified UserSettings (14 hours)

- [ ] **P2.1**: Define UserSettings type and recipe (3h)
  - Add interface to `@OneCoreTypes.d.ts`
  - Create `main/recipes/user-settings-recipe.ts`
  - Define nested object rules (ai, ui, proposals)
  - Register in `main/recipes/index.ts`

- [ ] **P2.2**: Create UserSettingsManager (2h)
  - File: `main/core/user-settings-manager.ts`
  - Methods: getSettings(), updateSettings(), updateAI(), updateUI(), updateProposals()
  - Add caching for performance
  - Default values for new users

- [ ] **P2.3**: Migrate GlobalLLMSettings data (2h)
  - File: `main/migrations/migrate-global-llm-settings.ts`
  - Query for existing GlobalLLMSettings
  - Transform to UserSettings.ai format
  - Store new UserSettings object
  - Test with real data

- [ ] **P2.4**: Migrate WordCloudSettings data (1h)
  - File: `main/migrations/migrate-word-cloud-settings.ts`
  - Query for existing WordCloudSettings
  - Transform to UserSettings.ui.wordCloud format
  - Similar pattern to P2.3

- [ ] **P2.5**: Run migrations on startup (30min)
  - Hook into `node-one-core.ts` initialization
  - Run after models initialized
  - Log migration results
  - Handle errors gracefully

- [ ] **P2.6**: Update AISettingsManager (1h)
  - Add deprecation warnings
  - Delegate to UserSettingsManager
  - Maintain old API for compatibility
  - File: `main/core/ai-settings-manager.ts`

- [ ] **P2.7**: Update AISettingsManager consumers (3h)
  - Find all usages
  - Replace with UserSettingsManager
  - Test all flows
  - Update IPC handlers

- [ ] **P2.8**: Mark for deletion (1h, later)
  - Add @deprecated JSDoc tags
  - Schedule deletion for next release
  - Document in migration guide

**Deliverables**: Unified settings object + migrations
**Risk**: High (data migration + many consumers)

---

### Phase 3: Clean Up Entity Configs (1.5 hours)

- [ ] **P3.1**: Review entity configs (0h)
  - MCPServerConfig ✅ Keep
  - MCPTopicConfig ✅ Keep
  - LLM objects ✅ Keep
  - OllamaConfig encryption ✅ Keep

- [ ] **P3.2**: Delete obsolete types (1h)
  - Remove GlobalLLMSettings from `@OneCoreTypes.d.ts`
  - Remove WordCloudSettings from `@OneCoreTypes.d.ts`
  - Remove ProposalConfig from `@OneCoreTypes.d.ts`
  - Delete `main/recipes/llm-recipes.ts`
  - Delete `main/recipes/word-cloud-recipes.ts`
  - Delete `main/recipes/proposal-recipes.ts`

- [ ] **P3.3**: Update recipe exports (30min)
  - File: `main/recipes/index.ts`
  - Remove old recipes
  - Add UserSettingsRecipe
  - Test recipe loading

**Deliverables**: Cleaner type system
**Risk**: Low (after migration complete)

---

### Phase 4: Update IPC Handlers (7.5 hours)

- [ ] **P4.1**: Create unified settings IPC handler (2h)
  - File: `main/ipc/handlers/user-settings.ts`
  - Handlers: getSettings, updateAI, updateUI, updateProposals
  - Convenience methods: setDefaultModel, setTheme
  - Error handling

- [ ] **P4.2**: Register IPC handlers (30min)
  - File: `main/ipc/controller.ts`
  - Register: settings:get, settings:updateAI, settings:updateUI, etc.
  - Remove old handlers (after deprecation period)

- [ ] **P4.3**: Create React hook (2h)
  - File: `electron-ui/src/hooks/useSettings.ts`
  - useState for settings object
  - Methods: updateAI, updateUI, setDefaultModel
  - Auto-reload on changes

- [ ] **P4.4**: Update SettingsView component (3h)
  - File: `electron-ui/src/components/SettingsView.tsx`
  - Replace scattered useState with useSettings()
  - Update all form controls
  - Test all settings interactions

**Deliverables**: Unified IPC + React integration
**Risk**: Medium (UI changes)

---

### Phase 5: Documentation & Cleanup (4 hours)

- [ ] **P5.1**: Update CLAUDE.md (2h)
  - Add "Configuration Architecture" section
  - Document 3-tier system
  - Show code examples
  - Migration notes

- [ ] **P5.2**: Create migration guide (1h)
  - File: `docs/config-migration-guide.md`
  - User section: What changed, no action required
  - Developer section: Deprecated APIs, new patterns
  - IPC changes table

- [ ] **P5.3**: Delete deprecated files (1h, later)
  - After 1-2 release cycles
  - Remove ai-settings-manager.ts
  - Remove connection-config.ts
  - Remove word-cloud-settings.ts handler
  - Remove settings-replication.ts
  - Remove chum-settings.ts

**Deliverables**: Complete documentation
**Risk**: None

---

## Testing Strategy

### Unit Tests
```typescript
// tests/unit/user-settings-manager.test.ts
describe('UserSettingsManager', () => {
  test('creates default settings on first access');
  test('updates AI settings');
  test('updates UI settings');
  test('caches settings for performance');
  test('clears cache on update');
});
```

### Integration Tests
```typescript
// tests/integration/config-refactor.test.ts
describe('Config Refactor Integration', () => {
  test('LamaConfig loads with network section');
  test('UserSettings migrates from GlobalLLMSettings');
  test('UserSettings migrates from WordCloudSettings');
  test('Settings sync via CHUM');
  test('IPC handlers work with new structure');
});
```

### Migration Tests
```typescript
// tests/integration/migrations.test.ts
describe('Configuration Migrations', () => {
  test('migrates GlobalLLMSettings to UserSettings.ai');
  test('migrates WordCloudSettings to UserSettings.ui');
  test('handles missing old settings gracefully');
  test('does not re-run migrations');
});
```

### Manual Testing Checklist
- [ ] Fresh install creates default settings
- [ ] Existing install migrates settings correctly
- [ ] All settings save and load
- [ ] CHUM sync works for settings
- [ ] Encrypted tokens still work
- [ ] Connection config works
- [ ] UI reflects all changes
- [ ] No data loss

---

## Rollback Plan

### If Migrations Fail
1. Stop app immediately
2. Restore backup: `cp OneDB.backup OneDB -r`
3. Revert to previous release
4. Collect logs from `OneDB/logs/`
5. Report issue with reproduction steps

### If Breaking Changes Found
1. Add compatibility shim:
```typescript
// Temporary bridge for old code
export function getLegacySettings() {
  const settings = await userSettingsManager.getSettings();
  return {
    defaultModelId: settings.ai.defaultModelId,
    temperature: settings.ai.temperature,
    // Map to old format
  };
}
```
2. Fix consumers in next patch release
3. Remove shim 2 releases later
4. Document in changelog

### Emergency Revert
```bash
git revert <commit-range>
npm install  # Restore old dependencies
npm run build
```

---

## Timeline & Resources

| Phase | Duration | Risk | Can Parallelize |
|-------|----------|------|-----------------|
| P0: Preparation | 6 hours | Low | No |
| P1: Bootstrap Config | 4 hours | Low | No |
| P2: UserSettings | 14 hours | Medium | Partially (P2.3 + P2.4) |
| P3: Cleanup | 1.5 hours | Low | Yes |
| P4: IPC Handlers | 7.5 hours | Medium | Partially (P4.1 + P4.3) |
| P5: Documentation | 4 hours | None | Yes |

**Total Estimated**: ~37 hours
**With Testing & Buffer**: 2 weeks
**Resources Required**: 1 developer, full-time

---

## Success Criteria

### Functional ✅
- [ ] All existing features work
- [ ] Settings persist across restarts
- [ ] CHUM sync works for settings
- [ ] No data loss during migration
- [ ] Encrypted tokens still work
- [ ] Connections still work

### Code Quality ✅
- [ ] Single source of truth for user settings
- [ ] Clear separation: bootstrap vs settings vs entity configs
- [ ] ≤3 storage mechanisms (down from 6+)
- [ ] Consistent patterns across codebase
- [ ] No redundant code

### Developer Experience ✅
- [ ] Clear documentation of config architecture
- [ ] One obvious place to look for settings
- [ ] Obvious where to add new settings
- [ ] Migration guides exist
- [ ] New devs can understand config in <10 minutes

### Performance ✅
- [ ] Settings cached in memory
- [ ] No redundant storage operations
- [ ] Fast IPC handlers (<10ms)
- [ ] Minimal overhead from managers

---

## Post-Refactor Benefits

### For Users
- **Consistent behavior**: Settings sync reliably across instances
- **Better performance**: Cached settings, fewer lookups
- **No data loss**: Migrations preserve all preferences

### For Developers
- **Clear patterns**: New settings go in one place (UserSettings)
- **Less confusion**: No more "where do I put this?"
- **Better testing**: Single manager to mock
- **Easier onboarding**: 3-tier system is simple to explain
- **Less code**: ~1000 lines removed

### For the Project
- **Better architecture**: Clear separation of concerns
- **Maintainable**: Consistent patterns
- **Extensible**: Easy to add new settings
- **Documented**: CLAUDE.md + migration guide

---

## Risks & Mitigations

### Risk: Data Migration Fails
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Comprehensive migration tests
- Backup before migration
- Graceful fallback to defaults
- Clear error messages
- Rollback plan documented

### Risk: Breaking Changes in UI
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Deprecation period for old APIs
- Compatibility shims
- Comprehensive UI testing
- Beta testing period

### Risk: Performance Regression
**Probability**: Low
**Impact**: Low
**Mitigation**:
- Settings caching
- Performance tests
- Benchmarking before/after

### Risk: Timeline Overrun
**Probability**: Medium
**Impact**: Low
**Mitigation**:
- Buffer time (2 weeks vs 1 week estimate)
- Can ship phases incrementally
- Phase 5 can be delayed if needed

---

## Decision Log

### Why Unified UserSettings?
**Decision**: Consolidate GlobalLLMSettings, WordCloudSettings, ProposalConfig into UserSettings

**Rationale**:
- All are user preferences
- All should sync via CHUM
- Single object reduces complexity
- Easier to reason about

**Alternatives Considered**:
- Keep separate: Rejected - too many objects
- Use key-value store: Rejected - no versioning/CHUM

### Why Keep Entity Configs Separate?
**Decision**: Keep MCPServerConfig, MCPTopicConfig, LLM objects separate

**Rationale**:
- Different ID fields (not userEmail)
- Different lifecycles
- Security requirements (LLM tokens)
- Already well-designed

### Why File-Based Bootstrap?
**Decision**: Keep LamaConfig as file-based

**Rationale**:
- Required before ONE.core initialized
- Needs to work without database
- Standard pattern for apps
- Environment variable support

---

## Open Questions

1. **Should ProposalConfig have defaults?**
   - Current: Not implemented
   - Proposal: Add sensible defaults in UserSettings.proposals
   - Resolution: Yes, add defaults (70/30 match/recency split)

2. **Migration error handling?**
   - Question: What if GlobalLLMSettings is corrupted?
   - Proposal: Fall back to defaults, log warning
   - Resolution: TBD - test with corrupted data

3. **CHUM sync behavior?**
   - Question: What if UserSettings conflicts on two instances?
   - Proposal: Last-write-wins (standard ONE.core behavior)
   - Resolution: TBD - verify with ONE.core team

4. **Deprecation timeline?**
   - Question: How long before deleting old APIs?
   - Proposal: 2 releases (1 month in fast iteration)
   - Resolution: TBD - discuss with team

---

## References

### Related Documents
- `CLAUDE.md` - Project guidelines
- `@OneCoreTypes.d.ts` - Type definitions
- `main/config/lama-config.ts` - Current bootstrap config
- `specs/019-above-the-chat/` - ProposalConfig spec

### ONE.core Documentation
- Versioned objects: `@refinio/one.core/lib/storage-versioned-objects.js`
- Recipes: `@refinio/one.core/lib/recipes.js`
- CHUM sync: `@refinio/one.models/lib/models/ConnectionsModel.js`

### External Resources
- Electron safeStorage: https://www.electronjs.org/docs/latest/api/safe-storage
- ONE.core README: `node_modules/@refinio/one.core/README.md`

---

## Approval & Sign-off

- [ ] **Technical Lead**: Architecture reviewed
- [ ] **Product Owner**: User impact acceptable
- [ ] **QA Lead**: Testing strategy sufficient
- [ ] **DevOps**: Rollback plan viable

**Approved By**: _________________
**Date**: _________________

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-03 | 0.1 | Initial draft | Claude Code |
| | | | |
| | | | |

---

**Next Steps**: Review this plan, get approval, then start Phase 0 (Preparation).
