# Research: Configuration Consolidation

**Feature**: Configuration Consolidation
**Branch**: `022-config-consolidation`
**Date**: 2025-11-03

## Purpose

This document consolidates technical research and decisions made during Phase 0 planning. All "NEEDS CLARIFICATION" items from the Technical Context have been resolved through analysis of the existing LAMA codebase and ONE.core documentation.

---

## Decision 1: Migration Strategy for GlobalLLMSettings

### Context
GlobalLLMSettings is currently stored as a ONE.core versioned object with `name` (instance name) as the ID field. It contains AI/LLM preferences like default model, temperature, max tokens, etc.

### Decision
Migrate GlobalLLMSettings to UserSettings.ai using automated migration script during startup.

### Rationale
1. **Automatic migration**: Runs once on first startup after upgrade, no user intervention
2. **Backward compatibility**: AISettingsManager acts as bridge for deprecated API calls
3. **Type safety**: UserSettings.ai has identical fields to GlobalLLMSettings (1:1 mapping)
4. **Zero data loss**: Migration queries existing object by ID hash, falls back to defaults on error

### Implementation Approach
```typescript
// main/migrations/migrate-global-llm-settings.ts
async function migrateGlobalLLMSettings(nodeOneCore) {
  const idHash = await calculateIdHashOfObj({
    $type$: 'GlobalLLMSettings',
    name: instanceName
  });

  try {
    const result = await getObjectByIdHash(idHash);
    const oldSettings = result.obj;

    await userSettingsManager.updateAI({
      defaultModelId: oldSettings.defaultModelId,
      temperature: oldSettings.temperature,
      // ... all fields
    });

    console.log('[Migration] ✅ GlobalLLMSettings migrated');
  } catch (error) {
    console.log('[Migration] No GlobalLLMSettings found, using defaults');
  }
}
```

### Alternatives Considered
- **Manual migration**: Rejected - requires user intervention, poor UX
- **Prompt user for confirmation**: Rejected - adds friction, delays startup
- **Keep both in parallel**: Rejected - doubles complexity, defeats consolidation goal

### Risks & Mitigations
- **Risk**: Migration fails partway through
- **Mitigation**: Wrap in try/catch, fall back to defaults, log error without crashing

---

## Decision 2: Migration Strategy for WordCloudSettings

### Context
WordCloudSettings is stored as a ONE.core versioned object with `creator` as an identifier. It contains visualization preferences for keyword clouds.

### Decision
Migrate WordCloudSettings to UserSettings.ui.wordCloud using similar pattern to GlobalLLMSettings migration.

### Rationale
1. **Consistency**: Same migration pattern across all settings types
2. **Completeness**: Preserves all 8 word cloud preferences (maxWordsPerSubject, colorScheme, etc.)
3. **Nested structure**: Naturally fits in UserSettings.ui hierarchy

### Implementation Approach
```typescript
// main/migrations/migrate-word-cloud-settings.ts
async function migrateWordCloudSettings(nodeOneCore) {
  // Query for existing WordCloudSettings by creator
  const settings = await findWordCloudSettings(nodeOneCore.ownerId);

  if (settings) {
    await userSettingsManager.updateUI({
      wordCloud: {
        maxWordsPerSubject: settings.maxWordsPerSubject,
        relatedWordThreshold: settings.relatedWordThreshold,
        // ... all 8 fields
      }
    });
  }
}
```

### Alternatives Considered
- **Skip word cloud migration**: Rejected - user customizations would be lost
- **Merge multiple WordCloudSettings if found**: Rejected - unclear merge semantics, use latest only

---

## Decision 3: CHUM Sync Behavior for UserSettings

### Context
UserSettings must sync across user instances via CHUM protocol. Need to understand conflict resolution and update propagation.

### Decision
Use ONE.core's standard CHUM sync with last-write-wins conflict resolution.

### Rationale
1. **Standard ONE.core behavior**: Last-write-wins is the default for versioned objects
2. **Simple semantics**: No complex merge logic needed
3. **Eventually consistent**: All instances converge to latest version within CHUM propagation window
4. **Atomic updates**: Each updateAI()/updateUI() call creates a new version with incremented version number

### Research Findings
From ONE.core documentation and existing LAMA CHUM usage:
- **Propagation time**: Typically <30 seconds under normal network conditions
- **Conflict resolution**: Later timestamp wins (versioned object's `updatedAt` field)
- **Automatic**: No manual sync calls needed - CHUM handles it transparently
- **Reliable**: CHUM retries failed transmissions, queues updates while offline

### Edge Cases Handled
- **Offline instance**: Queues updates locally, syncs when reconnected
- **Simultaneous updates**: Last-write-wins based on timestamp
- **Corrupted sync**: ONE.core's content addressing detects corruption, refuses to apply

### Testing Approach
```typescript
// Integration test
test('UserSettings syncs via CHUM', async () => {
  // Instance A updates setting
  await instanceA.userSettingsManager.updateAI({ temperature: 0.9 });

  // Wait for CHUM propagation
  await waitForCHUMSync(30_000);

  // Instance B should have the update
  const settingsB = await instanceB.userSettingsManager.getSettings();
  expect(settingsB.ai.temperature).toBe(0.9);
});
```

---

## Decision 4: Caching Strategy for Performance

### Context
UserSettings will be accessed frequently (on every settings UI render, AI message, etc.). Need to minimize ONE.core storage reads while ensuring cache consistency.

### Decision
Implement in-memory LRU cache in UserSettingsManager with invalidation on updates.

### Rationale
1. **Fast reads**: Cache hit = <1ms O(1) map lookup (vs ~10-20ms ONE.core storage read)
2. **Write-through**: Updates invalidate cache immediately, next read fetches fresh data
3. **Simple implementation**: Single cached object per user, no complex eviction logic needed
4. **Correctness**: Cache invalidation on every update ensures consistency

### Implementation Approach
```typescript
class UserSettingsManager {
  private cachedSettings?: UserSettings;

  async getSettings(): Promise<UserSettings> {
    if (this.cachedSettings) {
      return this.cachedSettings; // <1ms cache hit
    }

    // Cache miss - fetch from ONE.core
    const settings = await loadFromStorage();
    this.cachedSettings = settings;
    return settings;
  }

  async updateSettings(updates): Promise<UserSettings> {
    const updated = { ...currentSettings, ...updates };
    await storeVersionedObject(updated);

    // Invalidate cache
    this.cachedSettings = undefined;

    return updated;
  }
}
```

### Performance Targets
- **Cache hit rate**: >95% (most access patterns are reads)
- **Cache miss penalty**: ~15ms (ONE.core storage read + object parsing)
- **Memory overhead**: ~2KB per cached UserSettings object (negligible)

### Alternatives Considered
- **No caching**: Rejected - too slow for frequent reads (UI would lag)
- **TTL-based cache**: Rejected - adds complexity, write-through is simpler and always correct
- **Global settings cache**: Rejected - UserSettingsManager already scoped to one user

---

## Decision 5: Rollback and Error Handling Patterns

### Context
Need robust error handling for migration failures, storage errors, and ability to rollback if critical issues found.

### Decision
Implement defensive error handling with graceful degradation and documented rollback procedure.

### Error Handling Strategy
```typescript
// Migration error handling
try {
  await migrateGlobalLLMSettings(nodeOneCore);
  await migrateWordCloudSettings(nodeOneCore);
} catch (error) {
  console.error('[Migration] FAILED:', error);
  // Continue with defaults - do not crash
  // User can manually reconfigure if needed
}

// Settings load error handling
try {
  const settings = await getObjectByIdHash(idHash);
  return settings.obj;
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    // First time - create defaults
    return await createDefaultSettings();
  }
  // Corrupted data - log and use defaults
  console.error('[UserSettings] Load failed:', error);
  return DEFAULT_USER_SETTINGS;
}
```

### Rollback Procedure
Documented in spec.md and config-refactoring-plan.md:
1. **Immediate rollback**: `git revert <commit-range>`
2. **Data restoration**: `cp OneDB.backup OneDB -r` (user must backup before upgrade)
3. **Revert to previous release**: Install previous version from dist/
4. **Report issue**: Include logs from `OneDB/logs/` for debugging

### Fail-Safe Mechanisms
- **No destructive operations**: Old GlobalLLMSettings/WordCloudSettings remain in storage (not deleted)
- **Migration idempotency**: Can re-run migrations without corruption
- **Default fallback**: Every load failure falls back to sensible defaults
- **Startup time limit**: Migration timeout after 5 seconds to prevent UI blocking

---

## Decision 6: Deprecation Timeline and Backward Compatibility

### Context
Need to phase out old APIs (AISettingsManager, ConnectionConfig, etc.) without breaking existing code immediately.

### Decision
2-release deprecation cycle with console warnings and adapter pattern.

### Deprecation Timeline
- **Release N (refactor release)**:
  - Mark APIs as @deprecated in JSDoc
  - Log console warnings on usage
  - Provide adapters that delegate to new APIs
  - Update documentation with migration guides

- **Release N+1**:
  - Continue warnings
  - Update all internal usage to new APIs

- **Release N+2**:
  - Remove deprecated code
  - Error if old APIs called (fail fast)

### Adapter Pattern Example
```typescript
/**
 * @deprecated Use UserSettingsManager.updateAI() instead
 * This class will be removed in release N+2
 */
export class AISettingsManager {
  private userSettingsManager: UserSettingsManager;

  async setDefaultModelId(modelId: string) {
    console.warn('[DEPRECATED] AISettingsManager - use UserSettingsManager.updateAI()');
    await this.userSettingsManager.updateAI({ defaultModelId: modelId });
  }
}
```

### Migration Guide Sections
1. **What Changed**: List of deprecated APIs and replacements
2. **Migration Examples**: Side-by-side old/new code
3. **Timeline**: When deprecations take effect
4. **Rollback Instructions**: How to revert if issues found

### Rationale
- **2 releases**: Gives developers time to update without urgency
- **Console warnings**: Visible feedback during development
- **Adapters**: Zero-downtime migration for internal code
- **Documentation**: Clear path forward for all developers

---

## Research Summary

All technical decisions resolved:

| Topic | Decision | Confidence |
|-------|----------|------------|
| GlobalLLMSettings migration | Automated script, 1:1 field mapping | High |
| WordCloudSettings migration | Same pattern, nested in UI | High |
| CHUM sync | Standard last-write-wins | High |
| Caching | Write-through cache, invalidate on update | High |
| Error handling | Fail gracefully, default fallback | High |
| Deprecation | 2-release cycle with adapters | High |

**Next Phase**: Generate data-model.md, contracts/, and quickstart.md (Phase 1).
