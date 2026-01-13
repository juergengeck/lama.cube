/**
 * Module Registry Initialization for lama.cube
 *
 * Uses shared modules from @lama/core with Electron-specific adapters
 * Replaces unified-plan-system-init.ts with ModuleRegistry pattern
 */

import { ModuleRegistry } from '@refinio/api/plan-system';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { createMessageBus } from '@refinio/one.core/lib/message-bus.js';
import { ExportPlan } from '@lama/core/plans/ExportPlan.js';

// Set up MessageBus listener for AI debug messages
// This captures MessageBus.send('debug', ...) calls from AITopicManager, AIMessageProcessor, etc.
const debugBus = createMessageBus('module-registry-init');
debugBus.on('debug', (src: string, ...messages: unknown[]) => {
  // Filter to AI and LLM-related modules only to avoid noise
  if (src.startsWith('AI') || src.startsWith('LLM') || src === 'AITopicManager' || src === 'AIMessageProcessor' || src === 'AIAssistantPlan') {
    console.log(`[${src}]`, ...messages);
  }
});

// Also capture error messages
debugBus.on('error', (src: string, ...messages: unknown[]) => {
  if (src.startsWith('AI') || src.startsWith('LLM') || src === 'AITopicManager' || src === 'AIMessageProcessor' || src === 'AIAssistantPlan') {
    console.error(`[${src}] ERROR:`, ...messages);
  }
});
import {
  // CoreModule IS the single source of model creation
  // It also sets up the shared channel update listener (onTopicUpdated)
  CoreModule,
  AIModule,
  ChatModule,
  TrustModule,
  ConnectionModule,
  AnalysisModule,
  MemoryModule,
  JournalModule,
  DeviceModule
} from '@lama/core/modules';
import { InstancePlan } from '@lama/core/plans/InstancePlan.js';
import { ElectronLLMPlatform, createElectronLLMConfigAdapter } from '../../adapters/electron-llm-platform.js';
import { UserSettingsManager } from '../core/user-settings-manager.js';
// FilterGate removed - ConnectionModule creates its own filters via TopicGroupManager
import type { NodeOneCore } from '../types/one-core.js';
import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';

// Singleton registry instance
let moduleRegistry: ModuleRegistry | null = null;

// Store module instances for later access
let coreModuleInstance: CoreModule | null = null;
let aiModuleInstance: AIModule | null = null;
let connectionModuleInstance: ConnectionModule | null = null;

// FilterGate factories removed - ConnectionModule creates its own filters via TopicGroupManager

// DISABLED: TTS moved to renderer process with WebGPU for better performance
// Node.js ONNX runs on CPU only (~13s for 9s audio)
// Browser WebGPU can use GPU acceleration
// See: electron-ui/src/hooks/useTTS.ts and workers/tts.worker.ts
/*
// TTS Provider singleton (pre-loaded during init)
let ttsProvider: any = null;

async function preloadTTSModel(): Promise<void> {
  try {
    const { ONNXTTSProvider } = await import('../adapters/local/ONNXTTSProvider.js');
    const modelId = 'chatterbox-turbo';

    console.log(`[ModuleRegistryInit] Pre-loading TTS model: ${modelId}`);
    ttsProvider = new ONNXTTSProvider(modelId as any);

    let lastLoggedPercent = -10;
    ttsProvider.onProgress = (progress: any) => {
      const percent = Math.floor(progress.percent ?? 0);
      if (percent >= lastLoggedPercent + 10) {
        lastLoggedPercent = percent;
        console.log(`[ModuleRegistryInit] TTS download: ${percent}%`);
      }
    };

    await ttsProvider.load();
    console.log(`[ModuleRegistryInit] ✅ TTS model pre-loaded: ${modelId}`);
  } catch (error) {
    console.error('[ModuleRegistryInit] TTS pre-load failed:', error);
    ttsProvider = null;
  }
}

export function getPreloadedTTSProvider(): any {
  return ttsProvider;
}
*/

/**
 * Setup event listeners for ConnectionModule to update Electron UI
 *
 * ConnectionModule emits events when contacts/topics/connections change.
 * We listen to these events and notify the renderer process via IPC.
 */
function setupConnectionModuleListeners(connectionModule: ConnectionModule, nodeOneCore: NodeOneCore): void {
  // Import Electron dynamically to avoid issues during module loading
  import('electron').then(({ BrowserWindow }) => {
    // Helper to notify all windows
    const notifyAllWindows = (channel: string, data: any) => {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send(channel, data);
        }
      });
    };

    // Listen for contact changes (new contact created via pairing)
    connectionModule.onContactsChanged(() => {
      console.log('[ModuleRegistryInit] ConnectionModule: contacts changed, notifying UI...');
      // Notify UI to refresh contacts (matches existing ContactsView.tsx listener)
      notifyAllWindows('contacts:updated', {});
    });

    // Listen for topic changes (new topic created via pairing)
    connectionModule.onTopicsChanged(() => {
      console.log('[ModuleRegistryInit] ConnectionModule: topics changed, notifying UI...');
      // Notify UI to refresh conversations (matches existing ChatLayout listener)
      notifyAllWindows('chat:conversationCreated', {});
    });

    // Listen for connection state changes (pairing complete)
    connectionModule.onConnectionsChanged(() => {
      console.log('[ModuleRegistryInit] ConnectionModule: pairing complete, notifying UI...');
      // Notify UI of both contacts and conversations update
      notifyAllWindows('contacts:updated', {});
      notifyAllWindows('chat:conversationCreated', {});
    });
  }).catch(err => {
    console.error('[ModuleRegistryInit] Failed to setup ConnectionModule listeners:', err);
  });
}

/**
 * Initialize ModuleRegistry with shared modules from lama.core
 *
 * This replaces the old unified-plan-system-init.ts with a proper
 * module-based architecture using dependency injection
 */
export async function initializeModuleRegistry(nodeOneCore: NodeOneCore): Promise<ModuleRegistry> {
  // Return existing registry if already initialized
  if (moduleRegistry) {
    console.log('[ModuleRegistryInit] Module registry already initialized');
    return moduleRegistry;
  }

  console.log('[ModuleRegistryInit] Initializing module registry with shared modules...');

  // Create new registry
  moduleRegistry = new ModuleRegistry();

  // Get commServerUrl from nodeOneCore
  const commServerUrl = (nodeOneCore as any).commServerUrl || 'wss://comm10.dev.refinio.one';

  // Supply Electron-specific adapters
  const getWindow = () => global.mainWindow || null;
  const llmPlatform = new ElectronLLMPlatform(getWindow);
  const llmConfigAdapter = createElectronLLMConfigAdapter();

  moduleRegistry.supply('LLMPlatform', llmPlatform);
  moduleRegistry.supply('OllamaValidator', llmConfigAdapter.ollamaValidator);
  moduleRegistry.supply('LLMConfigManager', llmConfigAdapter.configManager);

  // Supply NodeOneCore as OneCore - CoreModule will create the other models
  // CONSOLIDATED ARCHITECTURE: CoreModule is THE single source of model creation
  // Models (LeuteModel, ChannelManager, TopicModel, ConnectionsModel, Settings)
  // are created by CoreModule and supplied via emitSupplies()
  moduleRegistry.supply('OneCore', nodeOneCore);

  // NOTE: TopicAnalysisModel is created and supplied by AnalysisModule
  // AnalysisModule.init() creates it, emitSupplies() supplies it to the registry
  // AIModule demands TopicAnalysisModel and receives it from AnalysisModule
  // After initializeModuleRegistry returns, node-one-core.ts gets it from AnalysisModule

  // NOTE: TopicGroupManager is created by ChatModule and set on oneCore
  // ChatModule.emitSupplies() supplies it to the registry

  // NOTE: Settings is now created by CoreModule (not duplicated here)

  // CRITICAL: Create and attach UserSettingsManager for API key management
  // This is needed for LLMManager to inject API keys into cloud provider calls
  if (!(nodeOneCore as any).userSettingsManager && nodeOneCore.email) {
    console.log('[ModuleRegistryInit] Creating UserSettingsManager...');
    const userSettingsManager = new UserSettingsManager(
      nodeOneCore,
      nodeOneCore.email,
      nodeOneCore.ownerId
    );
    (nodeOneCore as any).userSettingsManager = userSettingsManager;
    console.log('[ModuleRegistryInit] ✅ UserSettingsManager created and attached to nodeOneCore');
  } else if ((nodeOneCore as any).userSettingsManager) {
    console.log('[ModuleRegistryInit] UserSettingsManager already exists on nodeOneCore');
  } else {
    console.warn('[ModuleRegistryInit] Cannot create UserSettingsManager - email not available');
  }

  // Supply ExportPlan (required by ChatModule)
  // ExportPlan from lama.core is self-contained (uses one.core implode directly)
  const exportPlan = new ExportPlan();
  moduleRegistry.supply('ExportPlan', exportPlan);

  // Supply MCPManager for AIToolExecutor (optional - auto-wires when available)
  try {
    const { default: mcpManager } = await import('../services/mcp-manager.js');
    moduleRegistry.supply('MCPManager', mcpManager);
    console.log('[ModuleRegistryInit] MCPManager supplied for AIToolExecutor');
  } catch (error) {
    console.warn('[ModuleRegistryInit] MCPManager not available:', error);
  }

  // Supply the singleton LLMManager (already initialized with Ollama models in app.ts)
  // This ensures AIModule uses the same LLMManager instance with discovered models
  try {
    const { default: llmManager } = await import('../services/llm-manager-singleton.js');
    moduleRegistry.supply('LLMManager', llmManager);
    console.log('[ModuleRegistryInit] Singleton LLMManager supplied (has discovered models)');
  } catch (error) {
    console.warn('[ModuleRegistryInit] LLMManager singleton not available:', error);
  }

  // DISABLED: TTS moved to renderer with WebGPU
  // Pre-load TTS model so it's ready when UI needs it (non-blocking)
  // This avoids "Model not ready" errors when user clicks TTS button
  // console.log('[ModuleRegistryInit] Pre-loading TTS model (async)...');
  // preloadTTSModel().catch(error => {
  //   console.warn('[ModuleRegistryInit] TTS pre-load failed (non-critical):', error);
  // });

  // Register CoreModule - THE single source of model creation
  // CoreModule also sets up the shared channel update listener (onTopicUpdated)
  console.log('[ModuleRegistryInit] Registering CoreModule...');
  coreModuleInstance = new CoreModule(commServerUrl);
  moduleRegistry.register(coreModuleInstance);

  console.log('[ModuleRegistryInit] Registering AIModule...');
  aiModuleInstance = new AIModule(llmPlatform, llmConfigAdapter);
  moduleRegistry.register(aiModuleInstance);

  console.log('[ModuleRegistryInit] Registering ChatModule...');
  moduleRegistry.register(new ChatModule());

  console.log('[ModuleRegistryInit] Registering TrustModule...');
  moduleRegistry.register(new TrustModule());

  console.log('[ModuleRegistryInit] Registering ConnectionModule...');
  // ConnectionModule needs commServerUrl and webUrl for Discovery and invitations
  // webUrl from config, or undefined to let ConnectionPlan use its fallback (https://lama.one)
  const webUrl = (global as any).lamaConfig?.web?.url;
  connectionModuleInstance = new ConnectionModule(commServerUrl, webUrl);
  moduleRegistry.register(connectionModuleInstance);

  console.log('[ModuleRegistryInit] Registering AnalysisModule...');
  moduleRegistry.register(new AnalysisModule());

  console.log('[ModuleRegistryInit] Registering MemoryModule...');
  moduleRegistry.register(new MemoryModule());

  console.log('[ModuleRegistryInit] Registering JournalModule...');
  moduleRegistry.register(new JournalModule());

  console.log('[ModuleRegistryInit] Registering DeviceModule...');
  moduleRegistry.register(new DeviceModule());

  // Check for unsatisfied demands before initialization
  const unsatisfied = moduleRegistry.getUnsatisfiedDemands();
  if (unsatisfied.length > 0) {
    console.warn('[ModuleRegistryInit] Warning: Unsatisfied demands:', unsatisfied.map(d => d.targetType));
  }

  // Create StoryFactory and auto-supply to all modules that demand it
  // This must be done before initAll() so JournalModule, AIModule, ChatModule receive it
  console.log('[ModuleRegistryInit] Setting up StoryFactory...');
  moduleRegistry.setStorageFunction(storeVersionedObject);

  // Initialize all modules
  console.log('[ModuleRegistryInit] Initializing all modules...');
  await moduleRegistry.initAll();
  console.log('[ModuleRegistryInit] ✅ All modules initialized successfully');

  // CRITICAL: Set nodeOneCore.topicGroupManager from ChatModule
  // Note: ChatModule may or may not have topicGroupManager depending on architecture version
  // ChatPlan checks nodeOneCore.topicGroupManager for group chat creation
  const chatModule = moduleRegistry.getModule<ChatModule>('ChatModule');
  if ((chatModule as any)?.topicGroupManager) {
    (nodeOneCore as any).topicGroupManager = (chatModule as any).topicGroupManager;
    console.log('[ModuleRegistryInit] ✅ TopicGroupManager set on nodeOneCore');
  } else {
    console.warn('[ModuleRegistryInit] ChatModule.topicGroupManager not available');
  }

  // CRITICAL: Wire userSettingsManager to AIModule's llmManager for API key injection
  // AIModule creates its own llmManager, but userSettingsManager is Electron-specific
  // This enables Claude API key auto-injection in llmManager.chat()
  const userSettingsManager = (nodeOneCore as any).userSettingsManager;
  if (userSettingsManager && aiModuleInstance?.llmManager) {
    console.log('[ModuleRegistryInit] Wiring userSettingsManager to AIModule llmManager...');
    aiModuleInstance.llmManager.updateSystemPromptDependencies(
      userSettingsManager,
      (nodeOneCore as any).topicAnalysisModel,
      nodeOneCore.channelManager
    );
    console.log('[ModuleRegistryInit] ✅ UserSettingsManager wired to AIModule llmManager');
  } else {
    console.warn('[ModuleRegistryInit] Cannot wire userSettingsManager - userSettingsManager:', !!userSettingsManager, 'llmManager:', !!aiModuleInstance?.llmManager);
  }

  // Setup ConnectionModule event listeners for UI updates
  // ConnectionModule handles pairing via registerPairingHandler() and emits events when contacts/topics change
  if (connectionModuleInstance) {
    console.log('[ModuleRegistryInit] Setting up ConnectionModule event listeners for UI updates...');
    setupConnectionModuleListeners(connectionModuleInstance, nodeOneCore);
    console.log('[ModuleRegistryInit] ✅ ConnectionModule event listeners registered');
  }

  // Create retroactive Assemblies for Instance and Owner (bootstrap problem: created before StoryFactory)
  // Now that StoryFactory is ready, record instance creation in journal
  // ONLY if assemblies don't already exist (idempotent)
  try {
    const storyFactory = moduleRegistry.getStoryFactory();
    if (storyFactory && nodeOneCore.ownerId && nodeOneCore.instanceId && nodeOneCore.instanceName) {
      // Check if assemblies already exist for Instance and Owner
      const journalModule = moduleRegistry.getModule<JournalModule>('JournalModule');
      const assemblyDimension = journalModule?.assemblyDimension;

      let hasInstanceAssembly = false;
      let hasOwnerAssembly = false;

      if (assemblyDimension) {
        // Query for existing assemblies by entity
        const existingAssemblies = assemblyDimension.query({
          entities: [nodeOneCore.instanceId, nodeOneCore.ownerId]
        });

        for (const indexed of existingAssemblies) {
          const entityStr = indexed.assembly.entity?.toString();
          if (entityStr === nodeOneCore.instanceId.toString()) {
            hasInstanceAssembly = true;
          }
          if (entityStr === nodeOneCore.ownerId.toString()) {
            hasOwnerAssembly = true;
          }
        }

        console.log(`[ModuleRegistryInit] Existing assemblies - Instance: ${hasInstanceAssembly}, Owner: ${hasOwnerAssembly}`);
      }

      // Only create if they don't already exist
      if (!hasInstanceAssembly || !hasOwnerAssembly) {
        const instancePlan = new InstancePlan({
          storyFactory,
          ownerId: nodeOneCore.ownerId,
          instanceId: nodeOneCore.instanceId,
          instanceName: nodeOneCore.instanceName
        });
        await instancePlan.init();
        await instancePlan.recordInstanceCreation();
        console.log('[ModuleRegistryInit] ✅ Instance and Owner assemblies created in journal');
      } else {
        console.log('[ModuleRegistryInit] ✅ Instance and Owner assemblies already exist - skipping creation');
      }
    } else {
      console.warn('[ModuleRegistryInit] Cannot record instance creation - missing StoryFactory or nodeOneCore info');
      console.warn('[ModuleRegistryInit] ownerId:', !!nodeOneCore.ownerId, 'instanceId:', !!nodeOneCore.instanceId, 'instanceName:', !!nodeOneCore.instanceName);
    }
  } catch (error) {
    console.error('[ModuleRegistryInit] Failed to record instance creation:', error);
    // Non-critical - continue without instance assembly
  }

  return moduleRegistry;
}

/**
 * Get the initialized module registry
 */
export function getModuleRegistry(): ModuleRegistry | null {
  return moduleRegistry;
}

/**
 * Get the CoreModule instance (for onTopicUpdated events)
 */
export function getCoreModule(): CoreModule | null {
  return coreModuleInstance;
}

/**
 * Get the AIModule instance (for starting message listener after init)
 */
export function getAIModule(): AIModule | null {
  return aiModuleInstance;
}

/**
 * Shutdown the module registry
 */
export async function shutdownModuleRegistry(): Promise<void> {
  if (moduleRegistry) {
    console.log('[ModuleRegistryInit] Shutting down module registry...');
    await moduleRegistry.shutdownAll();
    moduleRegistry = null;
    coreModuleInstance = null;
    aiModuleInstance = null;
    console.log('[ModuleRegistryInit] Module registry shutdown complete');
  }
}
