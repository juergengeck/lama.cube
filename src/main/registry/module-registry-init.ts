/**
 * Module Registry Initialization for lama.cube
 *
 * Orchestrates module lifecycle using demand/supply pattern:
 *
 * PHASE 1: Supply platform adapters (LLMPlatform, FileSystemOps, etc.)
 * PHASE 2: Register modules (CoreModule, AIModule, etc.)
 * PHASE 3: Setup providers needed before init (QuicVC, mDNS, Device)
 * PHASE 4: Initialize all modules (topological sort, dependency injection)
 * PHASE 5: Post-init (load data, wire refs, start listeners)
 */

import fs from 'fs/promises';
import path from 'path';

import { ModuleRegistry } from '@refinio/api/plan-system';
import { storeVersionedObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { getOnlyLatestReferencingObjsHashAndId } from '@refinio/one.core/lib/reverse-map-query.js';
import { createCryptoApiFromDefaultKeys } from '@refinio/one.core/lib/keychain/keychain.js';
import { getInstanceOwnerEmail } from '@refinio/one.core/lib/instance.js';
import { createMessageBus } from '@refinio/one.core/lib/message-bus.js';
import { ExportPlan } from '@refinio/lama.core/plans/ExportPlan.js';
import { InstancePlan } from '@refinio/lama.core/plans/InstancePlan.js';
import { MeaningPlan } from '@refinio/lama.core/plans/MeaningPlan.js';
import { Meaning, EMBEDDING_MODEL } from '@refinio/meaning.core';
import { SemanticDimension } from '@refinio/cube.core';
import { setSemanticDimension } from '@refinio/lama.core/one-ai/models/Subject.js';
import { InstanceSettingsStorage, SettingsPlan } from '@refinio/settings.core';
import { registerLamaCoreSettings } from '@refinio/lama.core/settings/index.js';
import { QuicVCConnectionManager, MDNSDiscoveryAdapter, createConnectionFromQuicVC } from '@refinio/connection.core';
import { DevicePlan, type Device } from '@refinio/device.core';

import {
  CoreModule,
  AIModule,
  ChatModule,
  TrustModule,
  ConnectionModule,
  AnalysisModule,
  MemoryModule,
  JournalModule,
  DeviceModule,
  InstanceModule,
  KnowledgeNavigatorModule,
  BaileysModule
} from '@refinio/lama.core/modules';

import { BrowserWindow } from 'electron';
import dgram from 'dgram';
import { mcpManager } from '@refinio/mcp.core/local';
import llmManagerSingleton from '../services/llm-manager-singleton.js';
import { getTrustModel as getTrustModelFromPlans } from '../ipc/plans/trust.js';
import { wireModulesToRegistry, startMcpServer } from '../services/mcp-server-init.js';
import { broadcastMCPStatus } from '../ipc/plans/mcp.js';
import { setupBaileysEventForwarding as setupBaileysEvents } from '../ipc/plans/baileys.js';
import { ElectronLLMPlatform, createElectronLLMConfigAdapter } from '../adapters/electron-llm-platform.js';
import { getInferenceManager } from '../core/inference-manager.js';
import type { NodeOneCore } from '../types/one-core.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person, Instance, OneVersionedObjectTypeNames } from '@refinio/one.core/lib/recipes.js';
import type { QuicVCConnectFn } from '@refinio/one.models/lib/misc/ConnectionEstablishment/routes/OutgoingQuicVCRoute.js';

// =============================================================================
// DEBUG MESSAGE BUS SETUP
// =============================================================================

const debugBus = createMessageBus('module-registry');
const CHUM_DEBUG = true;

debugBus.on('debug', (src: string, ...messages: unknown[]) => {
  if (src.startsWith('AI') || src.startsWith('LLM') || src === 'AITopicManager' || src === 'AIMessageProcessor' || src === 'AIAssistantPlan') {
    console.log(`[${src}]`, ...messages);
  }
  if (CHUM_DEBUG && (src.includes('CHUM') || src.includes('Channel') || src.includes('Connection') || src.includes('Pairing') || src.includes('OBJECT_EVENTS') || src.includes('chum') || src.includes('WebSocket'))) {
    console.log(`[${src}]`, ...messages);
  }
});

debugBus.on('log', (src: string, ...messages: unknown[]) => {
  if (CHUM_DEBUG && (src.includes('CHUM') || src.includes('Channel') || src.includes('Connection') || src.includes('Pairing') || src.includes('chum') || src.includes('WebSocket') || src.includes('LeuteConnections'))) {
    console.log(`[${src}]`, ...messages);
  }
});

debugBus.on('error', (src: string, ...messages: unknown[]) => {
  if (src.startsWith('AI') || src.startsWith('LLM') || src === 'AITopicManager' || src === 'AIMessageProcessor' || src === 'AIAssistantPlan') {
    console.error(`[${src}] ERROR:`, ...messages);
  }
  if (src.includes('CHUM') || src.includes('Channel') || src.includes('Connection') || src.includes('Pairing')) {
    console.error(`[${src}] ERROR:`, ...messages);
  }
});

debugBus.on('ai-creation-progress', async (_src: string, data: { step: number; total: number; message: string; aiId: string; name: string }) => {
  try {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:creation-progress', data);
    }
  } catch {
    // Ignore - window may not exist yet
  }
});

// =============================================================================
// SINGLETON STATE
// =============================================================================

let moduleRegistry: ModuleRegistry | null = null;
let coreModuleInstance: CoreModule | null = null;
let aiModuleInstance: AIModule | null = null;
let connectionModuleInstance: ConnectionModule | null = null;
let instanceModuleInstance: InstanceModule | null = null;
let baileysModuleInstance: BaileysModule | null = null;
let localDevicePlan: DevicePlan | null = null;
let localDeviceIdHash: SHA256IdHash<Device> | null = null;

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Initialize ModuleRegistry with shared modules from lama.core.
 * Call after login when ONE.core is ready.
 */
export async function initializeModuleRegistry(nodeOneCore: NodeOneCore): Promise<ModuleRegistry> {
  // Tear down existing registry if re-initializing
  if (moduleRegistry) {
    console.log('[ModuleRegistry] Tearing down existing registry for clean re-init...');
    await shutdownModuleRegistry();
  }

  console.log('[ModuleRegistry] Initializing...');
  moduleRegistry = new ModuleRegistry();

  const commServerUrl = nodeOneCore.commServerUrl || 'wss://comm10.dev.refinio.one';

  // PHASE 1: Supply platform adapters
  await supplyPlatformAdapters(moduleRegistry, nodeOneCore);

  // PHASE 2: Register all modules
  registerModules(moduleRegistry, commServerUrl, nodeOneCore);

  // PHASE 3: Setup providers (QuicVC, mDNS, Device) - must be before initAll
  await setupProviders(moduleRegistry, nodeOneCore);

  // PHASE 4: Initialize all modules (dependency injection + init)
  console.log('[ModuleRegistry] Initializing modules...');
  await moduleRegistry.initAll();

  // PHASE 5: Post-init lifecycle
  await postInit(moduleRegistry, nodeOneCore);

  console.log('[ModuleRegistry] Initialization complete');
  return moduleRegistry;
}

// =============================================================================
// PHASE 1: SUPPLY PLATFORM ADAPTERS
// =============================================================================

async function supplyPlatformAdapters(
  registry: ModuleRegistry,
  nodeOneCore: NodeOneCore
): Promise<void> {
  console.log('[ModuleRegistry] Phase 1: Supplying platform adapters...');

  // LLM Platform (Electron-specific streaming via IPC)
  const getWindow = () => global.mainWindow || null;
  const llmPlatform = new ElectronLLMPlatform(getWindow);
  const llmConfigAdapter = createElectronLLMConfigAdapter();
  registry.supply('LLMPlatform', llmPlatform);
  registry.supply('OllamaValidator', llmConfigAdapter.ollamaValidator);
  registry.supply('LLMConfigManager', llmConfigAdapter.configManager);

  // ONE.core instance
  registry.supply('OneCore', nodeOneCore);

  // MCP for tool injection
  await supplyMCPManager(registry);

  // LLMManager singleton (already initialized with Ollama models)
  await supplyLLMManager(registry);

  // Export plan (required by ChatModule)
  registry.supply('ExportPlan', new ExportPlan());

  // File system operations (Node.js implementation)
  registry.supply('FileSystemOps', createFileSystemOps());

  // Export directories for memory auto-export
  registry.supply('ExportDirectories', getExportDirectories());

  // Settings plan (requires instanceId)
  supplySettingsPlan(registry, nodeOneCore);

  // Semantic dimension for embeddings
  await supplySemanticDimension(registry);

  // StoryFactory for journal tracking
  registry.setStorageFunction(storeVersionedObject);
}

async function supplyMCPManager(registry: ModuleRegistry): Promise<void> {
  try {
    registry.supply('MCPManager', mcpManager);
    console.log('[ModuleRegistry] MCPManager supplied');
  } catch (error) {
    console.warn('[ModuleRegistry] MCPManager not available:', error);
  }
}

async function supplyLLMManager(registry: ModuleRegistry): Promise<void> {
  try {
    registry.supply('LLMManager', llmManagerSingleton);
    console.log('[ModuleRegistry] LLMManager singleton supplied');
  } catch (error) {
    console.warn('[ModuleRegistry] LLMManager singleton not available:', error);
  }
}

function createFileSystemOps() {
  return {
    mkdir: async (dirPath: string) => fs.mkdir(dirPath, { recursive: true }),
    writeFile: async (filePath: string, content: string) => fs.writeFile(filePath, content, 'utf-8'),
    exists: async (dirPath: string) => {
      try {
        await fs.access(dirPath);
        return true;
      } catch {
        return false;
      }
    },
    join: (...segments: string[]) => path.join(...segments)
  };
}

function getExportDirectories(): string[] {
  return global.lamaConfig?.instance?.exportDirectories || [];
}

function supplySettingsPlan(registry: ModuleRegistry, nodeOneCore: NodeOneCore): void {
  const instanceId = nodeOneCore.instanceId as SHA256IdHash<Instance>;
  if (!instanceId) {
    console.warn('[ModuleRegistry] Cannot create SettingsPlan - no instanceId');
    return;
  }

  if (nodeOneCore.settingsPlan) {
    registry.supply('SettingsPlan', nodeOneCore.settingsPlan);
    console.log('[ModuleRegistry] SettingsPlan already exists, supplied to registry');
    return;
  }

  try {
    registerLamaCoreSettings();
    const storage = new InstanceSettingsStorage({ instanceIdHash: instanceId });
    const settingsPlan = new SettingsPlan(storage);
    nodeOneCore.settingsPlan = settingsPlan;
    registry.supply('SettingsPlan', settingsPlan);
    console.log('[ModuleRegistry] SettingsPlan created and supplied');
  } catch (error) {
    console.warn('[ModuleRegistry] SettingsPlan creation failed:', error);
  }
}

async function supplySemanticDimension(registry: ModuleRegistry): Promise<void> {
  try {
    const inferenceManager = getInferenceManager();

    if (!inferenceManager.initialized) {
      console.log('[ModuleRegistry] Initializing InferenceManager...');
      await inferenceManager.init();
      console.log(`[ModuleRegistry] InferenceManager initialized with ${inferenceManager.activeProvider}`);
    }

    const localProvider = inferenceManager.getEmbeddingProvider();
    registry.supply('EmbeddingProvider', localProvider);

    const meaning = new Meaning();
    meaning.setProvider({
      embed: (text: string) => localProvider.embed(text),
      embedBatch: (texts: string[]) => localProvider.embedBatch(texts)
    });

    const semanticDimension = new SemanticDimension({ meaning });
    await semanticDimension.init();
    setSemanticDimension(semanticDimension);

    registry.supply('Meaning', meaning);
    registry.supply('SemanticDimension', semanticDimension);
    registry.supply('MeaningDimension', semanticDimension); // backward compat
    registry.supply('MeaningPlan', new MeaningPlan(semanticDimension, localProvider));

    // Wire to MCPManager for semantic search
    try {
      mcpManager.setSemanticDimension(semanticDimension, EMBEDDING_MODEL);
      console.log('[ModuleRegistry] SemanticDimension wired to MCPManager');
    } catch {
      // MCPManager may not be available
    }

    console.log('[ModuleRegistry] SemanticDimension supplied');
  } catch (error) {
    console.warn('[ModuleRegistry] SemanticDimension not available:', error);
    registry.supply('MeaningPlan', new MeaningPlan());
  }
}

// =============================================================================
// PHASE 2: REGISTER MODULES
// =============================================================================

function registerModules(
  registry: ModuleRegistry,
  commServerUrl: string,
  nodeOneCore: NodeOneCore
): void {
  console.log('[ModuleRegistry] Phase 2: Registering modules...');

  // Core models (LeuteModel, ChannelManager, TopicModel)
  coreModuleInstance = new CoreModule(commServerUrl);
  registry.register(coreModuleInstance);

  // AI functionality
  const getWindow = () => global.mainWindow || null;
  const llmPlatform = new ElectronLLMPlatform(getWindow);
  aiModuleInstance = new AIModule(llmPlatform, createElectronLLMConfigAdapter());
  registry.register(aiModuleInstance);

  // Chat functionality
  registry.register(new ChatModule());

  // Trust management
  registry.register(new TrustModule());

  // P2P connections
  const webUrl = global.lamaConfig?.web?.url;
  connectionModuleInstance = new ConnectionModule(commServerUrl, webUrl);
  registry.register(connectionModuleInstance);

  // Topic analysis
  registry.register(new AnalysisModule());

  // Memory management
  registry.register(new MemoryModule());

  // Knowledge navigation
  registry.register(new KnowledgeNavigatorModule());

  // Journal/audit trail
  registry.register(new JournalModule());

  // Device management
  registry.register(new DeviceModule());

  // WhatsApp integration (optional)
  registerBaileysModule(registry, nodeOneCore);

  // Instance registry
  instanceModuleInstance = new InstanceModule();
  if (nodeOneCore.instanceId) {
    instanceModuleInstance.setLocalInstance(
      nodeOneCore.instanceId,
      'cube',
      ['AIAssistantPlan', 'ChatPlan', 'ConnectionPlan', 'MemoryPlan']
    );
  }
  registry.register(instanceModuleInstance);

  // Check unsatisfied demands
  const unsatisfied = registry.getUnsatisfiedDemands();
  if (unsatisfied.length > 0) {
    console.warn('[ModuleRegistry] Unsatisfied demands:', unsatisfied.map(d => d.targetType));
  }
}

function registerBaileysModule(registry: ModuleRegistry, nodeOneCore: NodeOneCore): void {
  try {
    baileysModuleInstance = new BaileysModule();
    if (nodeOneCore.instanceId) {
      baileysModuleInstance.setInstanceId(nodeOneCore.instanceId);
    }
    registry.register(baileysModuleInstance);
    console.log('[ModuleRegistry] BaileysModule registered');
  } catch (error) {
    console.warn('[ModuleRegistry] BaileysModule not available:', (error as Error).message);
    baileysModuleInstance = null;
  }
}

// =============================================================================
// PHASE 3: SETUP PROVIDERS
// =============================================================================

async function setupProviders(
  registry: ModuleRegistry,
  nodeOneCore: NodeOneCore
): Promise<void> {
  console.log('[ModuleRegistry] Phase 3: Setting up providers...');

  if (!nodeOneCore.ownerId || !connectionModuleInstance) return;

  // QuicVC connection manager
  const quicManager = await setupQuicVC(registry, nodeOneCore);

  // TrustModel for public-key trust checks
  await setupTrustModel(registry);

  // Local device (mDNS name source of truth)
  if (nodeOneCore.instanceId) {
    await setupLocalDevice(nodeOneCore, nodeOneCore.instanceId as SHA256IdHash<Instance>);
  }

  // QuicVC connect function for route manager
  if (quicManager) {
    setupQuicVCConnectFn(quicManager);
  }
}

async function setupQuicVC(
  registry: ModuleRegistry,
  nodeOneCore: NodeOneCore
): Promise<QuicVCConnectionManager | null> {
  try {
    const QUICVC_PORT = 49497;
    const connectionManager = QuicVCConnectionManager.getInstance(nodeOneCore.ownerId as SHA256IdHash<Person>);

    if (!connectionManager.isInitialized()) {
      // Create dedicated UDP socket for QuicVC
      const quicSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      await new Promise<void>((resolve, reject) => {
        quicSocket.bind(QUICVC_PORT, () => {
          console.log('[ModuleRegistry] QuicVC transport bound to port', QUICVC_PORT);
          resolve();
        });
        quicSocket.on('error', reject);
      });

      const messageHandlers: ((data: Uint8Array, rinfo: any) => void)[] = [];
      quicSocket.on('message', (msg, rinfo) => {
        const data = new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength);
        messageHandlers.forEach(handler => handler(data, rinfo));
      });

      const transport = {
        send: async (data: Uint8Array, address: string, port: number): Promise<void> => {
          return new Promise((resolve, reject) => {
            quicSocket.send(Buffer.from(data), port, address, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        },
        on: (event: string, handler: (data: Uint8Array, rinfo: any) => void): void => {
          if (event === 'message') {
            messageHandlers.push(handler);
          }
        }
      };

      const cryptoApi = await createCryptoApiFromDefaultKeys(nodeOneCore.ownerId as SHA256IdHash<Person>);
      const ownPubKey = Buffer.from(cryptoApi.publicSignKey).toString('hex');
      const deviceId = nodeOneCore.instanceId || 'cube';

      await connectionManager.initialize(transport, {
        id: deviceId,
        credentialSubject: { id: deviceId, publicKeyHex: ownPubKey }
      });
      console.log('[ModuleRegistry] QuicVCConnectionManager initialized');
    }

    registry.supply('QuicVCProvider', connectionManager);
    console.log('[ModuleRegistry] QuicVCProvider supplied');
    return connectionManager;
  } catch (error) {
    console.warn('[ModuleRegistry] QuicVCProvider setup failed:', error);
    return null;
  }
}

async function setupTrustModel(registry: ModuleRegistry): Promise<void> {
  try {
    const trustModel = getTrustModelFromPlans();
    registry.supply('TrustModel', trustModel);
    console.log('[ModuleRegistry] TrustModel supplied');
  } catch (error) {
    console.warn('[ModuleRegistry] TrustModel setup failed:', error);
  }
}

async function setupLocalDevice(
  nodeOneCore: NodeOneCore,
  instanceId: SHA256IdHash<Instance>
): Promise<void> {
  if (!connectionModuleInstance) return;

  try {
    const cryptoApi = await createCryptoApiFromDefaultKeys(nodeOneCore.ownerId as SHA256IdHash<Person>);
    const pubKey = Buffer.from(cryptoApi.publicSignKey).toString('hex');
    const email = getInstanceOwnerEmail();

    if (!email) throw new Error('Owner email not available');

    // DevicePlan dependencies
    const devicePlanDeps = {
      storeVersionedObject,
      getObjectByIdHash,
      getObject,
      getReverseMapEntries: async (key: any, type: string) =>
        getOnlyLatestReferencingObjsHashAndId(key, type as OneVersionedObjectTypeNames)
    };

    const devicePlan = new DevicePlan(devicePlanDeps);
    const result = await devicePlan.getOrCreateLocalDevice(
      instanceId,
      nodeOneCore.ownerId as SHA256IdHash<Person>,
      'LAMA Cube'
    );

    if (!result.success || !result.device) {
      throw new Error(result.error || 'Failed to get/create device');
    }

    localDevicePlan = devicePlan;
    localDeviceIdHash = result.device.idHash;

    // Store on nodeOneCore for IPC handlers
    nodeOneCore.devicePlan = devicePlan;
    nodeOneCore.localDeviceIdHash = result.device.idHash;

    const displayName = result.device.displayName;
    console.log(`[ModuleRegistry] Device: ${result.created ? 'created' : 'found'}, name="${displayName}"`);

    // Setup mDNS discovery provider
    const deviceType = getDeviceType();
    const mdnsAdapter = new MDNSDiscoveryAdapter({
      deviceId: instanceId,
      pubKey,
      email,
      displayName,
      deviceType,
      quicvcPort: 49497
    });
    connectionModuleInstance.setLocalDiscoveryProvider(mdnsAdapter, true);
    console.log(`[ModuleRegistry] MDNSAdapter set (type=${deviceType}, name="${displayName}")`);
  } catch (error) {
    console.warn('[ModuleRegistry] Device/mDNS setup failed:', error);
  }
}

function getDeviceType(): string {
  switch (process.platform) {
    case 'darwin': return 'macbook';
    case 'linux': return 'linux';
    case 'win32': return 'windows';
    default: return 'unknown';
  }
}

function setupQuicVCConnectFn(quicManager: QuicVCConnectionManager): void {
  if (!connectionModuleInstance) return;

  const connectFn: QuicVCConnectFn = async (address, port) => {
    const deviceId = `${address}:${port}`;

    if (quicManager.isConnected(deviceId)) {
      // ConnectionLike (connection.core) vs Connection (one.models) - cross-package type mismatch
      return createConnectionFromQuicVC(deviceId, quicManager) as any;
    }

    const credential = quicManager.ownCredential;
    if (!credential) throw new Error('QuicVC not initialized');

    await quicManager.connect(deviceId, address, port, credential);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        disconnect();
        reject(new Error(`QuicVC timeout: ${deviceId}`));
      }, 10000);

      const disconnect = quicManager.onConnectionEstablished.listen((event) => {
        if (event.address === address && event.port === port) {
          clearTimeout(timeout);
          disconnect();
          // ConnectionLike vs Connection - cross-package type mismatch
          resolve(createConnectionFromQuicVC(event.deviceId, quicManager) as any);
        }
      });
    });
  };

  connectionModuleInstance.setQuicVCConnectFn(connectFn);
  console.log('[ModuleRegistry] QuicVC connect function set');
}

// =============================================================================
// PHASE 5: POST-INIT
// =============================================================================

async function postInit(registry: ModuleRegistry, nodeOneCore: NodeOneCore): Promise<void> {
  console.log('[ModuleRegistry] Phase 5: Post-init...');

  // Wire MCP server
  await wireMcpServer(registry);

  // Wire references to nodeOneCore for backward compat
  wireToNodeOneCore(registry, nodeOneCore);

  // Wire StoryFactory and CoreMemoryPlan to AnalysisModule
  await wireAnalysisModuleDependencies(registry);

  // Setup ConnectionModule event listeners for UI
  setupConnectionModuleListeners(connectionModuleInstance!, nodeOneCore);

  // Setup BaileysModule event forwarding
  await setupBaileysEventForwarding();

  // Create instance assemblies for journal
  await createInstanceAssemblies(registry, nodeOneCore);
}

async function wireMcpServer(registry: ModuleRegistry): Promise<void> {
  try {
    wireModulesToRegistry(registry);
    await startMcpServer();
    broadcastMCPStatus();
  } catch (error) {
    console.warn('[ModuleRegistry] MCP server failed to start:', error);
  }
}

/**
 * Wire module outputs to nodeOneCore for handler access.
 * TODO: Handlers should use registry.getModule() instead.
 */
function wireToNodeOneCore(registry: ModuleRegistry, nodeOneCore: NodeOneCore): void {
  // Core models
  if (coreModuleInstance?.leuteModel) nodeOneCore.leuteModel = coreModuleInstance.leuteModel;
  if (coreModuleInstance?.channelManager) nodeOneCore.channelManager = coreModuleInstance.channelManager;
  if (coreModuleInstance?.topicModel) nodeOneCore.topicModel = coreModuleInstance.topicModel;

  // Connection model
  if (connectionModuleInstance?.connectionsModel) {
    nodeOneCore.connectionsModel = connectionModuleInstance.connectionsModel;
  }

  // AI
  if (aiModuleInstance?.aiAssistantPlan) {
    nodeOneCore.aiAssistantModel = aiModuleInstance.aiAssistantPlan;
  }
  if (aiModuleInstance?.llmManager) {
    nodeOneCore.llmManager = aiModuleInstance.llmManager;
  }

  // Note: TopicGroupManager was removed from ChatModule. No wiring needed.

  // Memory
  const memoryModule = registry.getModule<MemoryModule>('MemoryModule');
  if (memoryModule?.chatMemoryPlan) nodeOneCore.chatMemoryHandler = memoryModule.chatMemoryPlan;
  if (memoryModule?.memoryPlan) nodeOneCore.memoryPlan = memoryModule.memoryPlan;
  if (memoryModule?.sessionMemoryPlan) nodeOneCore.sessionMemoryPlan = memoryModule.sessionMemoryPlan;

  // Analysis
  const analysisModule = registry.getModule<AnalysisModule>('AnalysisModule');
  if (analysisModule?.topicAnalysisModel) {
    nodeOneCore.topicAnalysisModel = analysisModule.topicAnalysisModel;
    aiModuleInstance?.setDependency('TopicAnalysisModel', analysisModule.topicAnalysisModel);
  }

  // Wire SettingsPlan to LLMManager for API key injection
  const settingsPlan = nodeOneCore.settingsPlan;
  if (settingsPlan && aiModuleInstance?.llmManager) {
    aiModuleInstance.llmManager.updateSystemPromptDependencies(
      settingsPlan,
      nodeOneCore.topicAnalysisModel,
      nodeOneCore.channelManager
    );
    console.log('[ModuleRegistry] SettingsPlan wired to LLMManager');
  }

  console.log('[ModuleRegistry] References wired to nodeOneCore');
}

async function wireAnalysisModuleDependencies(registry: ModuleRegistry): Promise<void> {
  const analysisModule = registry.getModule<AnalysisModule>('AnalysisModule');
  if (!analysisModule?.topicAnalysisModel) return;

  const storyFactory = registry.getStoryFactory();
  if (storyFactory) {
    await analysisModule.topicAnalysisModel.setStoryFactory(storyFactory);
    console.log('[ModuleRegistry] StoryFactory wired to TopicAnalysisModel');
  }

  const memoryModule = registry.getModule<MemoryModule>('MemoryModule');
  // coreMemoryPlan is private on MemoryModule - needs public getter (TODO: add to MemoryModule)
  const coreMemoryPlan = (memoryModule as any)?.coreMemoryPlan;
  if (coreMemoryPlan) {
    analysisModule.topicAnalysisModel.setMemoryPlan(coreMemoryPlan);
    console.log('[ModuleRegistry] CoreMemoryPlan wired to TopicAnalysisModel');
  }
}

function setupConnectionModuleListeners(connectionModule: ConnectionModule, _nodeOneCore: NodeOneCore): void {
  const notifyAllWindows = (channel: string, data: any) => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  };

  connectionModule.onContactsChanged(() => {
    console.log('[ModuleRegistry] Contacts changed, notifying UI...');
    notifyAllWindows('contacts:updated', {});
  });

  connectionModule.onTopicsChanged(() => {
    console.log('[ModuleRegistry] Topics changed, notifying UI...');
    notifyAllWindows('chat:conversationCreated', {});
  });

  connectionModule.onConnectionsChanged(() => {
    console.log('[ModuleRegistry] Connections changed, notifying UI...');
    notifyAllWindows('contacts:updated', {});
    notifyAllWindows('chat:conversationCreated', {});
  });

  console.log('[ModuleRegistry] ConnectionModule event listeners set');
}

async function setupBaileysEventForwarding(): Promise<void> {
  if (!baileysModuleInstance) return;

  try {
    const getWindow = () => global.mainWindow || null;
    setupBaileysEvents(getWindow);
    console.log('[ModuleRegistry] BaileysModule event listeners set');
  } catch (error) {
    console.warn('[ModuleRegistry] BaileysModule event setup failed:', error);
  }
}

async function createInstanceAssemblies(registry: ModuleRegistry, nodeOneCore: NodeOneCore): Promise<void> {
  try {
    const storyFactory = registry.getStoryFactory();
    const ownerId = nodeOneCore.ownerId;
    const instanceId = nodeOneCore.instanceId;
    const instanceName = nodeOneCore.instanceName;

    if (!storyFactory || !ownerId || !instanceId || !instanceName) return;

    const journalModule = registry.getModule<JournalModule>('JournalModule');
    const assemblyDimension = journalModule?.assemblyDimension;

    if (assemblyDimension) {
      const existing = assemblyDimension.query({ entities: [instanceId, ownerId] });
      const hasInstance = existing.some(i => i.assembly.entity?.toString() === instanceId.toString());
      const hasOwner = existing.some(i => i.assembly.entity?.toString() === ownerId.toString());

      if (hasInstance && hasOwner) {
        console.log('[ModuleRegistry] Instance assemblies exist');
        return;
      }
    }

    const instancePlan = new InstancePlan({ storyFactory, ownerId, instanceId, instanceName });
    await instancePlan.init();
    await instancePlan.recordInstanceCreation();
    console.log('[ModuleRegistry] Instance assemblies created');
  } catch (error) {
    console.warn('[ModuleRegistry] Instance assemblies failed:', error);
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Load module data from storage - MUST be called AFTER login returns to browser.
 * Phase 2 of initialization after initializeModuleRegistry().
 */
export async function loadModuleData(): Promise<void> {
  console.log('[ModuleRegistry] loadModuleData() - Loading data from storage...');

  if (aiModuleInstance) {
    try {
      await aiModuleInstance.loadData();
      console.log('[ModuleRegistry] AI data loaded');
    } catch (error) {
      console.error('[ModuleRegistry] Failed to load AI data:', error);
    }
  }

  console.log('[ModuleRegistry] loadModuleData() complete');
}

export function getModuleRegistry(): ModuleRegistry | null {
  return moduleRegistry;
}

export function getCoreModule(): CoreModule | null {
  return coreModuleInstance;
}

export function getAIModule(): AIModule | null {
  return aiModuleInstance;
}

export function getConnectionModule(): ConnectionModule | null {
  return connectionModuleInstance;
}

export function getInstanceModule(): InstanceModule | null {
  return instanceModuleInstance;
}

export function getBaileysModule(): BaileysModule | null {
  return baileysModuleInstance;
}

export function getTrustModule(): TrustModule | null {
  return moduleRegistry?.getModule<TrustModule>('TrustModule') || null;
}

export function getTrustModel(): any {
  return getTrustModule()?.trustModel || null;
}

export function getLocalDevicePlan(): DevicePlan | null {
  return localDevicePlan;
}

export function getLocalDeviceIdHash(): SHA256IdHash<Device> | null {
  return localDeviceIdHash;
}

export async function shutdownModuleRegistry(): Promise<void> {
  if (!moduleRegistry) return;

  console.log('[ModuleRegistry] Shutting down...');
  try {
    await moduleRegistry.shutdownAll();
  } catch (error) {
    console.error('[ModuleRegistry] Shutdown error:', error);
    try {
      await coreModuleInstance?.shutdown();
    } catch {}
  } finally {
    moduleRegistry = null;
    coreModuleInstance = null;
    aiModuleInstance = null;
    connectionModuleInstance = null;
    instanceModuleInstance = null;
    baileysModuleInstance = null;
    localDevicePlan = null;
    localDeviceIdHash = null;
    console.log('[ModuleRegistry] Shutdown complete');
  }
}
