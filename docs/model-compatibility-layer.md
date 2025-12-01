# Model Compatibility Layer

## Overview

lama.cube shares UI components with lama.browser. To enable this resource sharing, lama.cube provides a **compatibility layer** that mimics lama.browser's Model.ts interface but proxies all operations through IPC to the Node.js process.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ lama.browser (Pure Browser)                    │
│                                                 │
│  Model.ts                                       │
│  ├─ Direct ONE.core access (IndexedDB)         │
│  ├─ All models as properties                   │
│  └─ Exposes: leuteModel, chatPlan, etc.        │
│                                                 │
│  UI Components                                  │
│  └─ Access: model.leuteModel, model.chatPlan   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ lama.cube (Electron)                            │
│                                                 │
│  Renderer (Browser)                             │
│  │                                              │
│  ├─ useModel() compatibility hook               │
│  │  └─ Mimics Model.ts interface                │
│  │                                              │
│  └─ UI Components (shared from lama.browser)    │
│     └─ Access: model.leuteModel, model.chatPlan │
│                                                 │
│  Main Process (Node.js)                         │
│  │                                              │
│  └─ Full ONE.core instance                      │
│     └─ All models, plans, and services          │
└─────────────────────────────────────────────────┘
```

## Modular Architecture Migration

lama.browser is transitioning from a monolithic Model.ts to a **modular architecture** using ModuleRegistry:

### Before (Monolithic)
```typescript
// Model.ts - Direct properties
class Model {
  leuteModel: LeuteModel;
  chatPlan: ChatPlan;
  aiAssistantPlan: AIAssistantPlan;

  constructor() {
    this.leuteModel = new LeuteModel();
    this.chatPlan = new ChatPlan();
    // ... initialize 30+ services
  }
}
```

### After (Modular)
```typescript
// Model.ts - Delegated via modules
class Model {
  private modules: Map<string, any>;

  constructor() {
    this.modules.set('core', new CoreModule());
    this.modules.set('ai', new AIModule());
    this.modules.set('chat', new ChatModule());
    // ...
  }

  // Public interface preserved via getters
  get leuteModel() { return this.modules.get('core').leuteModel; }
  get chatPlan() { return this.modules.get('chat').chatPlan; }
  get aiAssistantPlan() { return this.modules.get('ai').aiAssistantPlan; }
}
```

**Key insight**: The public API stays the same! UI components still do `model.leuteModel` and `model.chatPlan`.

## lama.cube Adaptation

lama.cube's `useModel()` hook (in `/electron-ui/src/model/index.ts`) **must match the complete public interface** of lama.browser's Model.ts.

### Complete Interface Coverage

The compatibility layer now exposes all 30+ services that Model.ts provides:

**CoreModule services:**
- leuteModel, channelManager, topicModel, connections, settings

**AIModule services:**
- aiPlan, aiAssistantPlan, topicAnalysisPlan, llmConfigPlan, proposalsPlan
- llmManager, llmObjectManager, aiObjectManager, topicAnalysisModel

**ChatModule services:**
- chatPlan, groupPlan, contactsPlan, exportPlan, topicGroupManager

**ConnectionModule services:**
- connectionPlan, groupChatPlan

**TrustModule services:**
- trustModel, trustPlan

### Implementation Strategy

Each service is exposed as a **getter** that:
1. Returns a stub (null) if not yet implemented
2. Proxies through IPC when implemented
3. Maintains the same API signature as Model.ts

Example:
```typescript
export function useModel() {
  const plans = usePlans();
  const bridge = useBridge();

  return {
    // Already implemented via Plans
    chatPlan: plans.chat,
    aiAssistantPlan: plans.ai,

    // Stubs for future IPC implementation
    get leuteModel() {
      // TODO: Implement LeuteModel proxy via IPC
      return null;
    },
    get topicModel() {
      // TODO: Implement TopicModel proxy via IPC
      return null;
    },
    // ... etc for all 30+ services
  };
}
```

## Critical Principles

1. **Interface Parity**: useModel() MUST expose the same properties/methods as Model.ts
2. **Stay in Sync**: When Model.ts changes, useModel() must adapt
3. **Fail Gracefully**: Unimplemented services return null (UI should handle gracefully)
4. **No Direct ONE.core**: Renderer NEVER accesses ONE.core - everything via IPC

## Build Verification

Both builds must succeed:
```bash
# Main process (Node.js with ONE.core)
npm run build:main

# Renderer (Browser UI with compatibility layer)
cd electron-ui && npm run build
```

## Next Steps

As lama.browser's modular architecture stabilizes:
1. Add IPC handlers for missing services in lama.cube
2. Implement proxies in useModel() for each service
3. Test shared UI components work correctly via IPC
4. Document any behavioral differences between platforms

## References

- lama.browser Model.ts: `packages/lama.browser/browser-ui/src/model/Model.ts`
- lama.cube useModel(): `packages/lama.cube/electron-ui/src/model/index.ts`
- Modular architecture: `.worktrees/modular-architecture/packages/lama.browser/`
