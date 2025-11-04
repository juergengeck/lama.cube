# Quickstart: Configuration Consolidation

**Feature**: Configuration Consolidation
**Branch**: `022-config-consolidation`
**Date**: 2025-11-03

## For Developers: Quick Reference

This guide helps you understand and use the new consolidated configuration system in under 10 minutes.

---

## The 3 Configuration Layers

### Layer 1: Bootstrap Config (File)
**When to use**: Startup parameters, network settings, instance identity
**File**: `lama.config.json`
**Loaded**: Once at startup

```json
{
  "instance": { "name": "...", "email": "...", "directory": "..." },
  "network": { "commServer": {...}, "direct": {...} },
  "logging": { "level": "info" }
}
```

### Layer 2: User Settings (ONE.core)
**When to use**: User preferences that sync across instances
**Type**: `UserSettings` object
**Access**: Via `UserSettingsManager`

```typescript
// Get settings
const settings = await userSettingsManager.getSettings();

// Update AI settings
await userSettingsManager.updateAI({ temperature: 0.8 });

// Update UI settings
await userSettingsManager.updateUI({ theme: 'light' });
```

### Layer 3: Entity Configs (ONE.core)
**When to use**: Per-entity configurations (servers, topics, models)
**Types**: `MCPServerConfig`, `MCPTopicConfig`, `LLM`
**Access**: Via dedicated managers

---

## Quick Decision Tree

**Where should I put this setting?**

```
┌─ Is it required before ONE.core starts?
│  └─ YES ───► LamaConfig (bootstrap)
│  └─ NO ────► Continue...
│
┌─ Does it belong to a specific entity (server/topic/model)?
│  └─ YES ───► Entity Config (MCPServerConfig, MCPTopicConfig, LLM)
│  └─ NO ────► Continue...
│
└─ Is it a user preference that should sync?
   └─ YES ───► UserSettings (ai/ui/proposals)
   └─ NO ────► Reconsider - might be LamaConfig
```

---

## Common Tasks

### Task 1: Add a New User Preference

**Example**: Add "show line numbers" UI preference

1. **Update UserSettings interface** (`@OneCoreTypes.d.ts`):
```typescript
export interface UserSettings {
  // ...
  ui: {
    theme: 'dark' | 'light';
    notifications: boolean;
    showLineNumbers: boolean;  // NEW
    wordCloud: {...};
  };
  // ...
}
```

2. **Update DEFAULT_USER_SETTINGS** (`contracts/user-settings-types.ts`):
```typescript
export const DEFAULT_USER_SETTINGS = {
  ui: {
    theme: 'dark',
    notifications: true,
    showLineNumbers: true,  // NEW - default value
    wordCloud: {...}
  }
};
```

3. **Update UserSettings recipe** (`main/recipes/user-settings-recipe.ts`):
```typescript
{
  itemprop: 'ui',
  itemtype: {
    type: 'object',
    rules: [
      // ...
      { itemprop: 'showLineNumbers', itemtype: { type: 'boolean' } },  // NEW
      // ...
    ]
  }
}
```

4. **Use in UI** (`electron-ui/src/components/`):
```typescript
const { settings } = useSettings();
const showLineNumbers = settings?.ui.showLineNumbers;

// Update
await updateUI({ showLineNumbers: false });
```

**That's it!** Setting automatically syncs via CHUM, persists in ONE.core, and is available everywhere.

---

### Task 2: Access Settings in Main Process

```typescript
// main/core/some-service.ts
import { UserSettingsManager } from './user-settings-manager.js';
import nodeOneCore from './node-one-core.js';

const settingsManager = new UserSettingsManager(nodeOneCore);

async function doSomething() {
  const settings = await settingsManager.getSettings();
  console.log('Current theme:', settings.ui.theme);
}
```

---

### Task 3: Access Settings in Renderer Process

```typescript
// electron-ui/src/components/MyComponent.tsx
import { useSettings } from '@/hooks/useSettings';

export function MyComponent() {
  const { settings, loading, updateAI } = useSettings();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Current model: {settings?.ai.defaultModelId}</p>
      <button onClick={() => updateAI({ temperature: 0.9 })}>
        Set Temperature
      </button>
    </div>
  );
}
```

---

### Task 4: Add Bootstrap Configuration

**Example**: Add "auto-update" setting to LamaConfig

1. **Update LamaConfig interface** (`main/config/lama-config.ts`):
```typescript
export interface LamaConfig {
  // ...
  instance: {
    name: string;
    email: string;
    secret: string;
    directory: string;
    wipeStorage?: boolean;
    autoUpdate?: boolean;  // NEW
  };
  // ...
}
```

2. **Add default value**:
```typescript
const defaultConfig: LamaConfig = {
  instance: {
    // ...
    autoUpdate: true  // NEW - default
  }
};
```

3. **Add environment variable support** (optional):
```typescript
if (process.env.LAMA_AUTO_UPDATE !== undefined) {
  config.instance.autoUpdate = process.env.LAMA_AUTO_UPDATE === 'true';
}
```

4. **Use in code**:
```typescript
import { loadConfig } from './config/lama-config.js';

const config = await loadConfig();
if (config.instance.autoUpdate) {
  // Auto-update logic
}
```

---

## Migration Guide (for Old Code)

### Migrating from AISettingsManager

**Before**:
```typescript
import { AISettingsManager } from './core/ai-settings-manager.js';

const aiSettingsManager = new AISettingsManager(nodeOneCore);
await aiSettingsManager.setDefaultModelId('qwen2.5:7b');
```

**After**:
```typescript
import { UserSettingsManager } from './core/user-settings-manager.js';

const settingsManager = new UserSettingsManager(nodeOneCore);
await settingsManager.updateAI({ defaultModelId: 'qwen2.5:7b' });
```

### Migrating from ConnectionConfig

**Before**:
```typescript
import { getConnectionConfig } from '@/config/connection-config';

const config = getConnectionConfig();
if (config.useDirectConnection) {
  // ...
}
```

**After**:
```typescript
import { lamaConfig } from '@/bridge/lama-bridge';

if (lamaConfig.network.direct.enabled) {
  // ...
}
```

### Migrating from WordCloudSettings IPC

**Before**:
```typescript
const settings = await window.electronAPI.invoke('wordCloud:getSettings');
await window.electronAPI.invoke('wordCloud:updateSettings', { maxWords: 200 });
```

**After**:
```typescript
const settings = await window.electronAPI.invoke('settings:get');
await window.electronAPI.invoke('settings:updateUI', {
  wordCloud: { maxWordsPerSubject: 200 }
});
```

---

## Testing Your Changes

### Unit Test (Settings Manager)

```typescript
// tests/unit/user-settings-manager.test.ts
import { UserSettingsManager } from '@/main/core/user-settings-manager';

test('updates AI settings', async () => {
  const manager = new UserSettingsManager(mockNodeOneCore);

  await manager.updateAI({ temperature: 0.9 });

  const settings = await manager.getSettings();
  expect(settings.ai.temperature).toBe(0.9);
});
```

### Integration Test (CHUM Sync)

```typescript
// tests/integration/user-settings-sync.test.ts
test('settings sync via CHUM', async () => {
  // Instance A updates
  await instanceA.userSettingsManager.updateAI({ temperature: 0.9 });

  // Wait for CHUM propagation
  await waitForCHUMSync(30_000);

  // Instance B receives update
  const settingsB = await instanceB.userSettingsManager.getSettings();
  expect(settingsB.ai.temperature).toBe(0.9);
});
```

---

## Troubleshooting

### Settings not syncing across instances?

1. **Check CHUM connection**: Verify instances are connected via commserver
2. **Check timing**: CHUM sync takes up to 30 seconds
3. **Check logs**: Look for "[UserSettings]" log messages
4. **Force refresh**: Restart the second instance to trigger re-sync

### Migration didn't run?

1. **Check logs**: Look for "[Migration]" messages during startup
2. **Check UserSettings exists**: Query ONE.core for UserSettings object
3. **Re-run migration**: Delete UserSettings and restart (dev/testing only)

### Cache not invalidating?

1. **Check UserSettingsManager**: Ensure `cachedSettings = undefined` on update
2. **Force reload**: Call `settingsManager.clearCache()` to reset

---

## API Reference

### UserSettingsManager

```typescript
class UserSettingsManager {
  // Get all settings (cached)
  async getSettings(): Promise<UserSettings>

  // Update AI settings
  async updateAI(updates: Partial<AISettings>): Promise<UserSettings>

  // Update UI settings
  async updateUI(updates: Partial<UISettings>): Promise<UserSettings>

  // Update proposal settings
  async updateProposals(updates: Partial<ProposalSettings>): Promise<UserSettings>

  // Update all settings
  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings>

  // Clear cache (force reload on next access)
  clearCache(): void
}
```

### IPC Channels

| Channel | Request | Response |
|---------|---------|----------|
| `settings:get` | `{}` | `UserSettings` |
| `settings:updateAI` | `{ updates: Partial<AISettings> }` | `UserSettings` |
| `settings:updateUI` | `{ updates: Partial<UISettings> }` | `UserSettings` |
| `settings:updateProposals` | `{ updates: Partial<ProposalSettings> }` | `UserSettings` |
| `settings:setDefaultModel` | `{ modelId: string \| null }` | `UserSettings` |
| `settings:setTheme` | `{ theme: 'dark' \| 'light' }` | `UserSettings` |

### React Hook

```typescript
function useSettings() {
  return {
    settings: UserSettings | null,
    loading: boolean,
    updateAI: (updates: Partial<AISettings>) => Promise<UserSettings>,
    updateUI: (updates: Partial<UISettings>) => Promise<UserSettings>,
    updateProposals: (updates: Partial<ProposalSettings>) => Promise<UserSettings>,
    setDefaultModel: (modelId: string | null) => Promise<UserSettings>,
    reload: () => Promise<void>
  };
}
```

---

## Performance Notes

- **Cache hit**: <1ms (O(1) map lookup)
- **Cache miss**: ~15ms (ONE.core storage read)
- **IPC call**: <10ms (main → renderer)
- **CHUM sync**: <30 seconds (across instances)
- **Migration**: <2 seconds (all migrations combined)

---

## Key Files

| File | Purpose |
|------|---------|
| `main/core/user-settings-manager.ts` | Main settings manager |
| `main/recipes/user-settings-recipe.ts` | ONE.core recipe definition |
| `main/ipc/handlers/user-settings.ts` | IPC handlers |
| `electron-ui/src/hooks/useSettings.ts` | React hook |
| `@OneCoreTypes.d.ts` | Type definitions |
| `specs/022-.../contracts/` | API contracts |

---

## Next Steps

1. **Read**: `spec.md` for full requirements
2. **Read**: `data-model.md` for entity details
3. **Read**: `research.md` for technical decisions
4. **Implement**: Follow `tasks.md` (generated by `/speckit.tasks`)

**Questions?** Check `docs/config-migration-guide.md` or CLAUDE.md.
