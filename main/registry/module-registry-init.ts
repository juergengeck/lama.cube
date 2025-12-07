/**
 * Module Registry Initialization for lama.cube
 *
 * Uses shared modules from @lama/core with Electron-specific adapters
 * Replaces unified-plan-system-init.ts with ModuleRegistry pattern
 */

import { ModuleRegistry } from '@refinio/api/plan-system';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { ExportPlan } from '@lama/core/plans/ExportPlan.js';
import {
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
import { ElectronLLMPlatform, createElectronLLMConfigAdapter } from '../adapters/electron-llm-platform.js';
import type { NodeOneCore } from '../types/one-core.js';

// Singleton registry instance
let moduleRegistry: ModuleRegistry | null = null;

// Store AIModule instance for later access (e.g., to start message listener)
let aiModuleInstance: AIModule | null = null;

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

  // Supply NodeOneCore and its dependencies
  moduleRegistry.supply('OneCore', nodeOneCore);
  moduleRegistry.supply('LeuteModel', nodeOneCore.leuteModel);
  moduleRegistry.supply('ChannelManager', nodeOneCore.channelManager);
  moduleRegistry.supply('TopicModel', nodeOneCore.topicModel);
  moduleRegistry.supply('ConnectionsModel', nodeOneCore.connectionsModel);

  // Supply TopicAnalysisModel if available
  if ((nodeOneCore as any).topicAnalysisModel) {
    moduleRegistry.supply('TopicAnalysisModel', (nodeOneCore as any).topicAnalysisModel);
  }

  // Supply TopicGroupManager if available
  if ((nodeOneCore as any).topicGroupManager) {
    moduleRegistry.supply('TopicGroupManager', (nodeOneCore as any).topicGroupManager);
  }

  // Supply Settings (PropertyTreeStore) if available
  if ((nodeOneCore as any).settingsStore) {
    moduleRegistry.supply('Settings', (nodeOneCore as any).settingsStore);
  }

  // Supply ExportPlan (required by ChatModule)
  // ExportPlan from lama.core is self-contained (uses one.core implode directly)
  const exportPlan = new ExportPlan();
  moduleRegistry.supply('ExportPlan', exportPlan);

  // Register shared modules from lama.core
  console.log('[ModuleRegistryInit] Registering CoreModule...');
  moduleRegistry.register(new CoreModule(commServerUrl));

  console.log('[ModuleRegistryInit] Registering AIModule...');
  aiModuleInstance = new AIModule(llmPlatform, llmConfigAdapter);
  moduleRegistry.register(aiModuleInstance);

  console.log('[ModuleRegistryInit] Registering ChatModule...');
  moduleRegistry.register(new ChatModule());

  console.log('[ModuleRegistryInit] Registering TrustModule...');
  moduleRegistry.register(new TrustModule());

  console.log('[ModuleRegistryInit] Registering ConnectionModule...');
  // ConnectionModule needs commServerUrl and webUrl for Discovery and invitations
  const webUrl = 'https://app.lama.chat'; // Default web URL for invitations
  moduleRegistry.register(new ConnectionModule(commServerUrl, webUrl));

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
    aiModuleInstance = null;
    console.log('[ModuleRegistryInit] Module registry shutdown complete');
  }
}
