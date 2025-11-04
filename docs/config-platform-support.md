# Configuration Platform Support

How UserSettings work across different platforms (Electron, Web Browser, CLI).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     UserSettingsManager                          │
│                  (Platform-Agnostic Core)                        │
│  - getSettings()                                                 │
│  - updateAI/updateUI/updateProposals()                          │
│  - Validation & caching                                          │
│  - ONE.core storage                                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐      ┌────────────────────┐
│  IPC Layer   │      │   API Layer        │
│  (Electron)  │      │   (Web/CLI)        │
└──────┬───────┘      └────────┬───────────┘
       │                       │
       ▼                       ▼
┌──────────────┐      ┌────────────────────┐
│   Renderer   │      │  HTTP Client       │
│   Process    │      │  (Browser/CLI)     │
│   (React)    │      │                    │
└──────────────┘      └────────────────────┘
```

## Platform 1: Electron App (Current Implementation ✅)

### Architecture
- **Main Process**: UserSettingsManager + IPC Handlers
- **Renderer Process**: useSettings() hook + UI components
- **Communication**: Electron IPC (contextBridge)

### Flow
```typescript
// 1. Renderer calls IPC
const settings = await window.electronAPI.invoke('settings:get', {});

// 2. IPC handler delegates to manager
export default function createUserSettingsHandlers(nodeOneCore) {
    return {
        'settings:get': async () => {
            const manager = new UserSettingsManager(nodeOneCore, email);
            return await manager.getSettings();
        }
    };
}

// 3. Manager accesses ONE.core
async getSettings(): Promise<UserSettings> {
    const idHash = calculateIdHashOfObj({ userEmail });
    return await getObjectByIdHash(idHash);
}
```

### Files
- **Manager**: `main/core/user-settings-manager.ts`
- **IPC**: `main/ipc/handlers/user-settings.ts`
- **Hook**: `electron-ui/src/hooks/useSettings.ts`
- **UI**: `electron-ui/src/components/settings/*.tsx`

## Platform 2: Web Browser (Via refinio.api) 🚧

### Architecture
- **Server**: UserSettingsManager + SettingsHandler (REST API)
- **Browser**: HTTP client + React hook
- **Communication**: HTTPS/QUIC (refinio.api)

### Flow
```typescript
// 1. Browser makes HTTP request
const response = await fetch('https://api.lama.local/settings', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer <token>' }
});

// 2. SettingsHandler delegates to manager
export class SettingsHandler {
    async getSettings(request: APIRequest): Promise<APIResponse> {
        const manager = this.getManager();
        const settings = await manager.getSettings();
        return { statusCode: 200, body: { success: true, data: settings } };
    }
}

// 3. Manager accesses ONE.core (same as Electron)
```

### Files (To Be Created)
- **Handler**: `main/api/handlers/SettingsHandler.ts` ✅ Created
- **Server Integration**: Enable in `refinio-api-server.ts` (currently disabled)
- **Browser Hook**: `web/src/hooks/useSettings.ts` (needs HTTP client version)
- **Web UI**: Same components as Electron (React)

### API Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/settings` | Get all settings | - | `UserSettings` |
| PUT | `/settings/ai` | Update AI settings | `Partial<AISettings>` | `UserSettings` |
| PUT | `/settings/ui` | Update UI settings | `Partial<UISettings>` | `UserSettings` |
| PUT | `/settings/proposals` | Update proposal settings | `Partial<ProposalSettings>` | `UserSettings` |
| PUT | `/settings/default-model` | Set default model | `{ modelId: string }` | `UserSettings` |
| PUT | `/settings/theme` | Set theme | `{ theme: 'dark' \| 'light' }` | `UserSettings` |
| PUT | `/settings` | Batch update all | `Partial<UserSettings>` | `UserSettings` |

### Example: Browser Hook (HTTP-based)

```typescript
// web/src/hooks/useSettings.ts (HTTP version)
export function useSettings(): UseSettingsResult {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadSettings = async () => {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success) {
            setSettings(data.data);
        } else {
            throw new Error(data.error);
        }
    };

    const updateAI = async (updates: Partial<AISettings>) => {
        const response = await fetch('/api/settings/ai', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const data = await response.json();
        if (data.success) {
            setSettings(data.data);
            return data.data;
        }
        throw new Error(data.error);
    };

    // ... similar for updateUI, updateProposals

    useEffect(() => {
        loadSettings();
    }, []);

    return { settings, loading, error, updateAI, updateUI, updateProposals };
}
```

## Platform 3: CLI Tools (Via refinio.api) 🚧

### Architecture
- **Server**: Same as Web Browser (SettingsHandler)
- **CLI**: HTTP client (Node.js/curl)
- **Communication**: HTTPS/QUIC (refinio.api)

### Example: CLI Usage

```bash
# Get all settings
curl https://api.lama.local/settings \
  -H "Authorization: Bearer <token>"

# Update AI temperature
curl -X PUT https://api.lama.local/settings/ai \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"temperature": 0.9, "maxTokens": 4096}'

# Set theme
curl -X PUT https://api.lama.local/settings/theme \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'
```

## Integration with refinio.api

### Current Status
The `refinio-api-server.ts` is currently **disabled**. To enable web/CLI support:

1. **Enable API Server** (`main/api/refinio-api-server.ts.disabled`)
   ```typescript
   // Add SettingsHandler to server initialization
   import { SettingsHandler } from './handlers/SettingsHandler.js';

   const settingsHandler = new SettingsHandler(nodeOneCore);
   server.registerHandler(settingsHandler);
   ```

2. **Start QuicVC Server** (in Node.js main process)
   ```typescript
   const server = new QuicVCServer({
       port: 8443,
       host: 'localhost'
   });

   await server.start();
   console.log('API server listening on https://localhost:8443');
   ```

3. **Authentication** (via InstanceAuthManager)
   - Clients authenticate using Instance credentials
   - Bearer tokens for HTTP requests
   - Same auth as existing AIHandler

### Example: Server Initialization

```typescript
// main/api/refinio-api-server.ts
export async function startAPIServer(nodeOneCore: any) {
    const transport = new QuicTransport();
    const auth = new InstanceAuthManager(nodeOneCore);

    const server = new QuicVCServer({
        transport,
        auth,
        port: 8443
    });

    // Register handlers
    const aiHandler = new AIHandler(nodeOneCore, nodeOneCore.aiAssistantModel);
    const settingsHandler = new SettingsHandler(nodeOneCore);

    server.registerHandler(aiHandler);
    server.registerHandler(settingsHandler);

    await server.start();

    console.log('[API] Server running on https://localhost:8443');
    console.log('[API] Available endpoints:');
    console.log('  - GET  /ai/models');
    console.log('  - GET  /settings');
    console.log('  - PUT  /settings/ai');
    console.log('  - PUT  /settings/ui');

    return server;
}
```

## CHUM Sync Across All Platforms

**Important**: Regardless of platform, settings sync via CHUM protocol:

1. **Electron** updates settings → stored in ONE.core → CHUM sync
2. **Web Browser** updates settings → stored in ONE.core → CHUM sync
3. **CLI** updates settings → stored in ONE.core → CHUM sync

All changes propagate to all connected instances within 30 seconds (CHUM sync interval).

## Comparison: IPC vs API

| Aspect | IPC (Electron) | API (Web/CLI) |
|--------|----------------|---------------|
| **Transport** | Electron contextBridge | HTTPS/QUIC |
| **Authentication** | Implicit (same process) | Bearer tokens |
| **Latency** | <1ms (in-process) | ~10-50ms (network) |
| **Security** | Sandboxed IPC | TLS + auth tokens |
| **Clients** | Electron renderer only | Any HTTP client |
| **Implementation** | IPC handlers | REST endpoints |
| **Code Sharing** | 90% shared (UserSettingsManager) | 90% shared (UserSettingsManager) |

## Next Steps: Enabling Web/CLI Support

### Priority 1: Enable API Server
1. Rename `refinio-api-server.ts.disabled` → `refinio-api-server.ts`
2. Import and start in `main/core/node-one-core.ts`
3. Register SettingsHandler with QuicVC server

### Priority 2: Create Browser Hook
1. Create `web/src/hooks/useSettings.ts` (HTTP client version)
2. Use same interface as Electron hook (transparent to UI)
3. Point to API server endpoint

### Priority 3: Documentation
1. API endpoint documentation (OpenAPI/Swagger)
2. CLI usage examples
3. Authentication guide for web clients

### Priority 4: Testing
1. Multi-platform integration tests
2. CHUM sync verification (Electron ↔ Web)
3. Performance benchmarks (IPC vs API)

## Summary

✅ **What Works Now**: Electron app with full settings management via IPC
🚧 **What's Ready**: SettingsHandler for API access (needs server enabled)
⏳ **What's Needed**: Enable refinio.api server, create browser HTTP hook

The architecture is platform-agnostic - 90% of the code (UserSettingsManager) is shared. Only the transport layer differs (IPC vs HTTP).
