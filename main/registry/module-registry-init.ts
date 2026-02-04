/**
 * Module Registry Initialization for lama.cube
 *
 * Uses shared modules from @refinio/lama.core with Electron-specific adapters
 * Replaces unified-plan-system-init.ts with ModuleRegistry pattern
 */

import { ModuleRegistry } from '@refinio/api/plan-system';
import { storeVersionedObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { createMessageBus } from '@refinio/one.core/lib/message-bus.js';
import { ExportPlan } from '@refinio/lama.core/plans/ExportPlan.js';

// Set up MessageBus listener for debug messages
// This captures MessageBus.send('debug', ...) calls from various modules
const debugBus = createMessageBus('module-registry-init');

// CHUM/Connection debug filter - set to true to enable verbose CHUM sync logging
const CHUM_DEBUG = true;

debugBus.on('debug', (src: string, ...messages: unknown[]) => {
  // AI and LLM-related modules
  if (src.startsWith('AI') || src.startsWith('LLM') || src === 'AITopicManager' || src === 'AIMessageProcessor' || src === 'AIAssistantPlan') {
    console.log(`[${src}]`, ...messages);
  }
  // CHUM, Channel, Connection, and Pairing modules (when CHUM_DEBUG enabled)
  if (CHUM_DEBUG && (
    src.includes('CHUM') ||
    src.includes('Channel') ||
    src.includes('Connection') ||
    src.includes('Pairing') ||
    src.includes('OBJECT_EVENTS') ||
    src.includes('chum') ||
    src.includes('WebSocket')
  )) {
    console.log(`[${src}]`, ...messages);
  }
});

// Also capture log messages for connection flow
debugBus.on('log', (src: string, ...messages: unknown[]) => {
  if (CHUM_DEBUG && (
    src.includes('CHUM') ||
    src.includes('Channel') ||
    src.includes('Connection') ||
    src.includes('Pairing') ||
    src.includes('chum') ||
    src.includes('WebSocket') ||
    src.includes('LeuteConnections')
  )) {
    console.log(`[${src}]`, ...messages);
  }
});

// Also capture error messages
debugBus.on('error', (src: string, ...messages: unknown[]) => {
  if (src.startsWith('AI') || src.startsWith('LLM') || src === 'AITopicManager' || src === 'AIMessageProcessor' || src === 'AIAssistantPlan') {
    console.error(`[${src}] ERROR:`, ...messages);
  }
  // Always log CHUM/Connection errors
  if (src.includes('CHUM') || src.includes('Channel') || src.includes('Connection') || src.includes('Pairing')) {
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
  DeviceModule,
  InstanceModule,
  KnowledgeNavigatorModule,
  BaileysModule
} from '@refinio/lama.core/modules';
import { InstancePlan } from '@refinio/lama.core/plans/InstancePlan.js';
import { ElectronLLMPlatform, createElectronLLMConfigAdapter } from '../../adapters/electron-llm-platform.js';
import { MeaningPlan } from '@refinio/lama.core/plans/MeaningPlan.js';
import { InstanceSettingsStorage, SettingsPlan } from '@refinio/settings.core';
import { registerLamaCoreSettings } from '@refinio/lama.core/settings/index.js';
import { getInferenceManager } from '../core/inference-manager.js';
import { Meaning, EMBEDDING_MODEL } from '@refinio/meaning.core';
import { SemanticDimension } from '@refinio/cube.core';
import { setSemanticDimension } from '@refinio/lama.core/one-ai/models/Subject.js';
// FilterGate removed - ConnectionModule creates its own filters via TopicGroupManager
import type { NodeOneCore } from '../types/one-core.js';
import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person, Instance } from '@refinio/one.core/lib/recipes.js';

// Singleton registry instance
let moduleRegistry: ModuleRegistry | null = null;

// Store module instances for later access
let coreModuleInstance: CoreModule | null = null;
let aiModuleInstance: AIModule | null = null;
let connectionModuleInstance: ConnectionModule | null = null;
let instanceModuleInstance: InstanceModule | null = null;
let baileysModuleInstance: BaileysModule | null = null;

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

  // CRITICAL: Create and attach SettingsPlan for API key management and settings
  // This is needed for LLMManager to inject API keys into cloud provider calls
  if (!(nodeOneCore as any).settingsPlan && nodeOneCore.instanceId) {
    console.log('[ModuleRegistryInit] Creating SettingsPlan...');

    // Register settings sections before creating storage
    registerLamaCoreSettings();

    // Create InstanceSettingsStorage with instanceIdHash
    const instanceSettingsStorage = new InstanceSettingsStorage({
      instanceIdHash: nodeOneCore.instanceId as SHA256IdHash<Instance>
    });

    // Create SettingsPlan
    const settingsPlan = new SettingsPlan(instanceSettingsStorage);
    (nodeOneCore as any).settingsPlan = settingsPlan;

    // Supply SettingsPlan to module registry for MemoryModule and others
    moduleRegistry.supply('SettingsPlan', settingsPlan);
    console.log('[ModuleRegistryInit] ✅ SettingsPlan created, attached to nodeOneCore, and supplied to registry');
  } else if ((nodeOneCore as any).settingsPlan) {
    // Already exists - still supply it to the registry
    moduleRegistry.supply('SettingsPlan', (nodeOneCore as any).settingsPlan);
    console.log('[ModuleRegistryInit] SettingsPlan already exists on nodeOneCore, supplied to registry');
  } else {
    console.warn('[ModuleRegistryInit] Cannot create SettingsPlan - instanceId not available');
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

  // Supply FileSystemOps for memory auto-export (Node.js implementation)
  const fs = await import('fs/promises');
  const path = await import('path');
  const fileSystemOps = {
    mkdir: async (dirPath: string) => {
      await fs.mkdir(dirPath, { recursive: true });
    },
    writeFile: async (filePath: string, content: string) => {
      await fs.writeFile(filePath, content, 'utf-8');
    },
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
  moduleRegistry.supply('FileSystemOps', fileSystemOps);
  console.log('[ModuleRegistryInit] FileSystemOps supplied for memory auto-export');

  // Supply ExportDirectories from config (directories outside app data that survive deletion)
  const exportDirectories = (global as any).lamaConfig?.instance?.exportDirectories || [];
  if (exportDirectories.length > 0) {
    moduleRegistry.supply('ExportDirectories', exportDirectories);
    console.log(`[ModuleRegistryInit] ExportDirectories supplied: ${exportDirectories.length} directories`);
  } else {
    console.log('[ModuleRegistryInit] No ExportDirectories configured - auto-export disabled');
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

  // Supply EmbeddingProvider and MeaningDimension for semantic memory search
  // Initialize InferenceManager if needed (may not be initialized yet during provisioning flow)
  try {
    const inferenceManager = getInferenceManager();

    // Initialize InferenceManager if not yet ready (blocking to ensure embeddings available)
    if (!inferenceManager.initialized) {
      console.log('[ModuleRegistryInit] Initializing InferenceManager for semantic memory...');
      await inferenceManager.init();
      console.log(`[ModuleRegistryInit] ✅ InferenceManager initialized with ${inferenceManager.activeProvider}`);
    }

    const localProvider = inferenceManager.getEmbeddingProvider();
    moduleRegistry.supply('EmbeddingProvider', localProvider);
    console.log('[ModuleRegistryInit] ✅ EmbeddingProvider supplied for semantic memory search');

    // Create Meaning service for embedding generation
    // Adapt LocalEmbeddingProvider to meaning.core's EmbeddingProvider interface
    const meaningEmbeddingProvider = {
      embed: (text: string) => localProvider.embed(text),
      embedBatch: (texts: string[]) => localProvider.embedBatch(texts)
    };

    const meaning = new Meaning();
    meaning.setProvider(meaningEmbeddingProvider);
    console.log('[ModuleRegistryInit] ✅ Meaning service created for embedding generation');

    // Create SemanticDimension for cube-based HNSW indexing
    const semanticDimension = new SemanticDimension({ meaning });

    // Initialize SemanticDimension (blocking to ensure ready for MemoryModule)
    await semanticDimension.init();
    console.log('[ModuleRegistryInit] ✅ SemanticDimension initialized for cube-based memory indexing');

    // Wire up SemanticDimension to Subject model for automatic embedding indexing
    setSemanticDimension(semanticDimension);
    console.log('[ModuleRegistryInit] ✅ SemanticDimension wired to Subject model for embeddings');

    // Supply both Meaning and SemanticDimension
    moduleRegistry.supply('Meaning', meaning);
    moduleRegistry.supply('SemanticDimension', semanticDimension);
    // Also supply as 'MeaningDimension' for backward compatibility
    moduleRegistry.supply('MeaningDimension', semanticDimension);
    console.log('[ModuleRegistryInit] ✅ Meaning + SemanticDimension supplied for semantic memory');

    // Create and supply MeaningPlan (wraps SemanticDimension for KnowledgeNavigatorModule)
    const meaningPlan = new MeaningPlan(semanticDimension, localProvider);
    moduleRegistry.supply('MeaningPlan', meaningPlan);
    console.log('[ModuleRegistryInit] ✅ MeaningPlan supplied');

    // Wire up SemanticDimension to MCPManager for semantic memory search and embedding generation
    try {
      const { default: mcpManager } = await import('../services/mcp-manager.js');
      mcpManager.setSemanticDimension(semanticDimension, EMBEDDING_MODEL);
      console.log('[ModuleRegistryInit] ✅ SemanticDimension wired to MCPManager for semantic search and embedding generation');
    } catch (mcpError) {
      console.warn('[ModuleRegistryInit] Could not wire SemanticDimension to MCPManager:', mcpError);
    }
  } catch (error) {
    console.warn('[ModuleRegistryInit] EmbeddingProvider/MeaningDimension not available:', error);
    console.log('[ModuleRegistryInit] ℹ️ Memory will use keyword search');
  }

  console.log('[ModuleRegistryInit] Registering MemoryModule...');
  moduleRegistry.register(new MemoryModule());

  console.log('[ModuleRegistryInit] Registering KnowledgeNavigatorModule...');
  moduleRegistry.register(new KnowledgeNavigatorModule());

  console.log('[ModuleRegistryInit] Registering JournalModule...');
  moduleRegistry.register(new JournalModule());

  console.log('[ModuleRegistryInit] Registering DeviceModule...');
  moduleRegistry.register(new DeviceModule());

  // BaileysModule is optional - only register if WhatsApp integration is enabled
  // It will fail gracefully if Baileys dependencies are not installed
  try {
    console.log('[ModuleRegistryInit] Registering BaileysModule (WhatsApp)...');
    baileysModuleInstance = new BaileysModule();
    // Set instance ID for session persistence (must be called before init)
    if (nodeOneCore.instanceId) {
      baileysModuleInstance.setInstanceId(nodeOneCore.instanceId);
      console.log('[ModuleRegistryInit] BaileysModule instanceId set to:', nodeOneCore.instanceId);
    }
    moduleRegistry.register(baileysModuleInstance);
    console.log('[ModuleRegistryInit] ✅ BaileysModule registered');
  } catch (error) {
    console.warn('[ModuleRegistryInit] BaileysModule not available (WhatsApp integration disabled):', (error as Error).message);
    baileysModuleInstance = null;
  }

  console.log('[ModuleRegistryInit] Registering InstanceModule...');
  instanceModuleInstance = new InstanceModule();
  // Configure local instance info before init
  if (nodeOneCore.instanceId) {
    instanceModuleInstance.setLocalInstance(
      nodeOneCore.instanceId,
      'cube',
      ['AIAssistantPlan', 'ChatPlan', 'ConnectionPlan', 'MemoryPlan']  // Capabilities
    );
  }
  moduleRegistry.register(instanceModuleInstance);

  // Check for unsatisfied demands before initialization
  const unsatisfied = moduleRegistry.getUnsatisfiedDemands();
  if (unsatisfied.length > 0) {
    console.warn('[ModuleRegistryInit] Warning: Unsatisfied demands:', unsatisfied.map(d => d.targetType));
  }

  // Create StoryFactory and auto-supply to all modules that demand it
  // This must be done before initAll() so JournalModule, AIModule, ChatModule receive it
  console.log('[ModuleRegistryInit] Setting up StoryFactory...');
  moduleRegistry.setStorageFunction(storeVersionedObject);

  // Supply platform-specific QuicVCProvider with dedicated transport on port 49497
  if (nodeOneCore.ownerId) {
    try {
      const dgram = await import('dgram');
      const { QuicVCConnectionManager } = await import('@refinio/connection.core');

      const QUICVC_PORT = 49497;
      const connectionManager = QuicVCConnectionManager.getInstance(nodeOneCore.ownerId as SHA256IdHash<Person>);

      if (!connectionManager.isInitialized()) {
        // Create dedicated UDP socket for QuicVC on port 49497
        const quicSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        await new Promise<void>((resolve, reject) => {
          quicSocket.bind(QUICVC_PORT, () => {
            console.log('[ModuleRegistryInit] QuicVC transport bound to port', QUICVC_PORT);
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
          },
        };

        // Get own Ed25519 public key for credential
        const { createCryptoApiFromDefaultKeys } = await import('@refinio/one.core/lib/keychain/keychain.js');
        const cryptoApi = await createCryptoApiFromDefaultKeys(nodeOneCore.ownerId as SHA256IdHash<Person>);
        const ownPubKey = Buffer.from(cryptoApi.publicSignKey).toString('hex');
        const deviceId = nodeOneCore.instanceId || 'cube';

        await connectionManager.initialize(transport, {
          id: deviceId,
          credentialSubject: { id: deviceId, publicKeyHex: ownPubKey }
        });
        console.log('[ModuleRegistryInit] QuicVCConnectionManager initialized on port', QUICVC_PORT);
      }

      moduleRegistry.supply('QuicVCProvider', connectionManager);
      console.log('[ModuleRegistryInit] QuicVCProvider supplied');
    } catch (error) {
      console.warn('[ModuleRegistryInit] Failed to supply QuicVCProvider:', error);
    }
  }

  // Supply TrustModel for public-key-based trust checks
  // Uses the same singleton as trust.ts IPC handlers
  if (nodeOneCore.ownerId) {
    try {
      const { getTrustModel } = await import('../ipc/plans/trust.js');
      const trustModel = getTrustModel();
      moduleRegistry.supply('TrustModel', trustModel);
      console.log('[ModuleRegistryInit] TrustModel supplied');
    } catch (error) {
      console.warn('[ModuleRegistryInit] Failed to supply TrustModel:', error);
    }
  }

  // Supply MDNSDiscovery as LocalDiscoveryProvider for ConnectionModule
  // Use Device.displayName as the single source of truth for mDNS name
  if (nodeOneCore.ownerId && nodeOneCore.instanceId && connectionModuleInstance) {
    try {
      const { MDNSDiscoveryAdapter } = await import('@refinio/connection.core');
      const { DevicePlan } = await import('@refinio/device.core');
      const { createCryptoApiFromDefaultKeys } = await import('@refinio/one.core/lib/keychain/keychain.js');
      // storeVersionedObject and getObjectByIdHash are imported statically at module level
      const { getObject } = await import('@refinio/one.core/lib/storage-unversioned-objects.js');
      const { getOnlyLatestReferencingObjsHashAndId } = await import('@refinio/one.core/lib/reverse-map-query.js');

      const cryptoApi = await createCryptoApiFromDefaultKeys(nodeOneCore.ownerId as SHA256IdHash<Person>);
      const pubKey = Buffer.from(cryptoApi.publicSignKey).toString('hex');
      const deviceId = nodeOneCore.instanceId;

      // Detect device type based on platform
      let deviceType = 'unknown';
      const platform = process.platform;
      if (platform === 'darwin') {
        deviceType = 'macbook';
      } else if (platform === 'linux') {
        deviceType = 'linux';
      } else if (platform === 'win32') {
        deviceType = 'windows';
      }

      // Create ONE.core adapter for DevicePlan (it expects these as methods)
      const oneCoreAdapter = {
        storeVersionedObject,
        getObjectByIdHash,
        getObject,
        getReverseMapEntries: async (key: any, type: string) => {
          // Returns array of {hash, idHash, timestamp}
          return await getOnlyLatestReferencingObjsHashAndId(key, type as any);
        }
      };

      // Get or create local Device object - single source of truth for displayName
      const devicePlan = new DevicePlan(oneCoreAdapter);
      const localDeviceResult = await devicePlan.getOrCreateLocalDevice(
        nodeOneCore.instanceId as SHA256IdHash<Instance>,
        nodeOneCore.ownerId as SHA256IdHash<Person>,
        'LAMA Cube'  // Default display name for new devices
      );

      if (!localDeviceResult.success || !localDeviceResult.device) {
        throw new Error(localDeviceResult.error || 'Failed to get/create local device');
      }

      const displayName = localDeviceResult.device.displayName;
      console.log(`[ModuleRegistryInit] Local Device: ${localDeviceResult.created ? 'created' : 'found'}, displayName="${displayName}"`);

      // Store devicePlan on nodeOneCore for updateName IPC handler
      (nodeOneCore as any).devicePlan = devicePlan;
      (nodeOneCore as any).localDeviceIdHash = localDeviceResult.device.idHash;

      // Get owner email for mDNS broadcast (receivers derive personId from email)
      const { getInstanceOwnerEmail } = await import('@refinio/one.core/lib/instance.js');
      const email = getInstanceOwnerEmail();
      if (!email) {
        throw new Error('Owner email not available for mDNS discovery');
      }

      const mdnsAdapter = new MDNSDiscoveryAdapter({
        deviceId,
        pubKey,
        email,
        displayName,
        deviceType,
        quicvcPort: 49497
      });
      connectionModuleInstance.setLocalDiscoveryProvider(mdnsAdapter, true);
      console.log(`[ModuleRegistryInit] ✅ MDNSDiscoveryAdapter set (deviceType=${deviceType}, displayName="${displayName}", autoStart=true)`);
    } catch (error) {
      console.warn('[ModuleRegistryInit] Failed to setup MDNSDiscovery:', error);
    }
  }

  // Initialize all modules
  console.log('[ModuleRegistryInit] Initializing all modules...');
  await moduleRegistry.initAll();
  console.log('[ModuleRegistryInit] ✅ All modules initialized successfully');

  // Wire modules to HandlerRegistry for MCP/transport access
  const { wireModulesToRegistry, startMcpServer } = await import('../services/mcp-server-init.js');
  wireModulesToRegistry(moduleRegistry);

  // Start MCP server (stdio) - exposes handlers to Claude Code
  // Note: Only start if running with --mcp-stdio flag or similar
  // For now, always start - can be gated later
  try {
    await startMcpServer();
  } catch (error) {
    console.warn('[ModuleRegistryInit] MCP server failed to start:', error);
    // Non-critical - continue without MCP
  }

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

  // CRITICAL: Set nodeOneCore.chatMemoryHandler from MemoryModule
  // IPC handlers for memory operations use nodeOneCore.chatMemoryHandler
  const memoryModule = moduleRegistry.getModule<MemoryModule>('MemoryModule');
  if (memoryModule?.chatMemoryPlan) {
    (nodeOneCore as any).chatMemoryHandler = memoryModule.chatMemoryPlan;
    console.log('[ModuleRegistryInit] ✅ ChatMemoryHandler set on nodeOneCore');
  } else {
    console.warn('[ModuleRegistryInit] MemoryModule.chatMemoryPlan not available');
  }

  // CRITICAL: Wire userSettingsManager to AIModule's llmManager for API key injection
  // AIModule creates its own llmManager, but userSettingsManager is Electron-specific
  // This enables Claude API key auto-injection in llmManager.chat()
  // Use settingsPlan for wiring to LLM manager
  const settingsPlan = (nodeOneCore as any).settingsPlan;
  if (settingsPlan && aiModuleInstance?.llmManager) {
    console.log('[ModuleRegistryInit] Wiring SettingsPlan to AIModule llmManager...');
    aiModuleInstance.llmManager.updateSystemPromptDependencies(
      settingsPlan,
      (nodeOneCore as any).topicAnalysisModel,
      nodeOneCore.channelManager
    );
    console.log('[ModuleRegistryInit] ✅ SettingsPlan wired to AIModule llmManager');
  } else {
    console.warn('[ModuleRegistryInit] Cannot wire SettingsPlan - settingsPlan:', !!settingsPlan, 'llmManager:', !!aiModuleInstance?.llmManager);
  }

  // Wire StoryFactory and CoreMemoryPlan to AnalysisModule for Subject → Journal + Memory integration
  // This must be done post-init because MemoryModule (which supplies CoreMemoryPlan) depends on TopicAnalysisModel
  // from AnalysisModule, creating a circular dependency that we resolve here
  const analysisModule = moduleRegistry.getModule<AnalysisModule>('AnalysisModule');
  if (analysisModule?.topicAnalysisModel) {
    const storyFactory = moduleRegistry.getStoryFactory();
    if (storyFactory) {
      await analysisModule.topicAnalysisModel.setStoryFactory(storyFactory);
      console.log('[ModuleRegistryInit] ✅ StoryFactory wired to TopicAnalysisModel for Journal visibility');
    }

    // Get CoreMemoryPlan from MemoryModule (now initialized)
    if (memoryModule) {
      const coreMemoryPlan = (memoryModule as any).coreMemoryPlan;
      if (coreMemoryPlan) {
        analysisModule.topicAnalysisModel.setMemoryPlan(coreMemoryPlan);
        console.log('[ModuleRegistryInit] ✅ CoreMemoryPlan wired to TopicAnalysisModel for Memory visibility');
      }
    }
  }

  // Setup ConnectionModule event listeners for UI updates
  // ConnectionModule handles pairing via registerPairingHandler() and emits events when contacts/topics change
  if (connectionModuleInstance) {
    console.log('[ModuleRegistryInit] Setting up ConnectionModule event listeners for UI updates...');
    setupConnectionModuleListeners(connectionModuleInstance, nodeOneCore);
    console.log('[ModuleRegistryInit] ✅ ConnectionModule event listeners registered');
  }

  // Setup BaileysModule event listeners for UI updates (WhatsApp QR codes, messages, etc.)
  if (baileysModuleInstance) {
    try {
      const { setupBaileysEventForwarding } = await import('../ipc/plans/baileys.js');
      const getWindow = () => global.mainWindow || null;
      setupBaileysEventForwarding(getWindow);
      console.log('[ModuleRegistryInit] ✅ BaileysModule event listeners registered');
    } catch (error) {
      console.warn('[ModuleRegistryInit] Failed to setup BaileysModule event listeners:', error);
    }
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
 * Get the ConnectionModule instance (for wiring discovery events)
 */
export function getConnectionModule(): ConnectionModule | null {
  return connectionModuleInstance;
}

/**
 * Get the BaileysModule instance (for WhatsApp integration)
 */
export function getBaileysModule(): BaileysModule | null {
  return baileysModuleInstance;
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
    connectionModuleInstance = null;
    instanceModuleInstance = null;
    baileysModuleInstance = null;
    console.log('[ModuleRegistryInit] Module registry shutdown complete');
  }
}
