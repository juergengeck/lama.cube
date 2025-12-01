/**
 * Module Registry Initialization for lama.cube
 *
 * Uses shared modules from @lama/core with Electron-specific adapters
 * Replaces unified-plan-system-init.ts with ModuleRegistry pattern
 */

import { ModuleRegistry } from '@refinio/refinio.api/plan-system';
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
import { ElectronLLMPlatform, createElectronLLMConfigAdapter } from '../adapters/electron-llm-platform.js';
import type { NodeOneCore } from '../types/one-core.js';

// Singleton registry instance
let moduleRegistry: ModuleRegistry | null = null;

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

  // Register shared modules from lama.core
  console.log('[ModuleRegistryInit] Registering CoreModule...');
  moduleRegistry.register(new CoreModule(commServerUrl));

  console.log('[ModuleRegistryInit] Registering AIModule...');
  moduleRegistry.register(new AIModule(llmPlatform, llmConfigAdapter));

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

  // Initialize all modules
  console.log('[ModuleRegistryInit] Initializing all modules...');
  await moduleRegistry.initAll();
  console.log('[ModuleRegistryInit] ✅ All modules initialized successfully');

  return moduleRegistry;
}

/**
 * Get the initialized module registry
 */
export function getModuleRegistry(): ModuleRegistry | null {
  return moduleRegistry;
}

/**
 * Shutdown the module registry
 */
export async function shutdownModuleRegistry(): Promise<void> {
  if (moduleRegistry) {
    console.log('[ModuleRegistryInit] Shutting down module registry...');
    await moduleRegistry.shutdownAll();
    moduleRegistry = null;
    console.log('[ModuleRegistryInit] Module registry shutdown complete');
  }
}
