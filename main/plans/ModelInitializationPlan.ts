/**
 * Model Initialization Plan
 *
 * Extracted from NodeOneCore.initializeModels()
 * Handles initialization of ONE.core models following proper sequence.
 *
 * Principles:
 * - Fail fast, no fallbacks
 * - Each step is required
 * - Proper dependency order
 */

import LeuteModel from '@refinio/one.models/lib/models/Leute/LeuteModel.js';
import ChannelManager from '@refinio/one.models/lib/models/ChannelManager.js';
import ConnectionsModel from '@refinio/one.models/lib/models/ConnectionsModel.js';
import TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';
import { objectEvents } from '@refinio/one.models/lib/misc/ObjectEventDispatcher.js';
import { LLMObjectManager } from '@lama/core/models/LLMObjectManager.js';
import { TTSObjectManager } from '@lama/core/models/TTSObjectManager.js';
import { STTObjectManager } from '@lama/core/models/STTObjectManager.js';
import { syncMonitor } from '../services/sync-monitor.js';
import type { SHA256IdHash, SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person, Group, BLOB } from '@refinio/one.core/lib/recipes.js';
import { FilterGate, ChumFilterAdapter, type EffectiveAccess } from '@filter/core';

export interface ModelInitContext {
  ownerId: SHA256IdHash<Person>;
  email: string;
  commServerUrl: string;
  onProgress?: (stage: string, percent: number, message: string) => void;
}

export interface InitializedModels {
  leuteModel: LeuteModel;
  connectionsModel: ConnectionsModel;
  channelManager: ChannelManager;
  topicModel: TopicModel;
  llmObjectManager: LLMObjectManager;
  ttsObjectManager: TTSObjectManager;
  sttObjectManager: STTObjectManager;
}

/**
 * Holder for TopicGroupManager - allows late binding of filters
 * TopicGroupManager is created after ConnectionsModel, so we use a holder
 * that delegates to TopicGroupManager when it becomes available.
 */
export interface TopicGroupManagerHolder {
  manager?: {
    isAllowedOutbound(hash: string): boolean;
    isAllowedInbound(hash: string): boolean;
  };
}

// Global holder that gets populated when TopicGroupManager is created
export const topicGroupManagerHolder: TopicGroupManagerHolder = {};

/**
 * Model Initialization Plan
 * Initializes ONE.core models in proper sequence
 */
export class ModelInitializationPlan {
  async execute(context: ModelInitContext): Promise<InitializedModels> {
    console.log('[ModelInitializationPlan] Initializing models...');

    // CRITICAL: Initialize ObjectEventDispatcher FIRST
    // This enables CHUM sync notifications - without this, when CHUM imports
    // new ChannelInfo versions, no events fire to notify ChannelManager.
    // ChannelManager registers listeners on objectEvents.onNewVersion.
    try {
      console.log('[ModelInitializationPlan] Initializing ObjectEventDispatcher...');
      await objectEvents.init();
      console.log('[ModelInitializationPlan] ✅ ObjectEventDispatcher initialized');

      // Initialize sync monitor to track CHUM activity for traffic light visualization
      await syncMonitor.init();
    } catch (e: any) {
      if (e.message?.includes('already initialized')) {
        console.log('[ModelInitializationPlan] ObjectEventDispatcher already initialized');
      } else {
        throw e;
      }
    }

    // Step 1: Initialize LeuteModel
    const leuteModel = await this.initializeLeuteModel(context);
    context.onProgress?.('leute', 30, 'Contact management initialized');

    // Step 2: Initialize ConnectionsModel (CRITICAL: Required for CHUM sync)
    // Must be initialized AFTER LeuteModel but BEFORE ChannelManager
    const connectionsModel = await this.initializeConnectionsModel(leuteModel, context.commServerUrl);
    context.onProgress?.('connections', 40, 'CHUM sync initialized');

    // Step 3: Initialize LLMObjectManager
    const llmObjectManager = await this.initializeLLMObjectManager(context);
    context.onProgress?.('llm', 50, 'LLM configuration loaded');

    // Step 4: Initialize ChannelManager (required for TopicModel)
    // CRITICAL: ChannelManager needs leuteModel to calculate default owners
    const channelManager = await this.initializeChannelManager(leuteModel, context.ownerId);
    context.onProgress?.('channels', 60, 'Channels initialized');

    // Step 5: Initialize TopicModel (owner-namespaced)
    const topicModel = await this.initializeTopicModel(channelManager, leuteModel);
    context.onProgress?.('topics', 70, 'Topics initialized');

    // Step 6: Initialize TTSObjectManager
    const ttsObjectManager = await this.initializeTTSObjectManager(context);
    context.onProgress?.('tts', 75, 'TTS configuration loaded');

    // Step 7: Initialize STTObjectManager
    const sttObjectManager = await this.initializeSTTObjectManager(context);
    context.onProgress?.('stt', 80, 'STT configuration loaded');

    console.log('[ModelInitializationPlan] ✅ All models initialized');

    return {
      leuteModel,
      connectionsModel,
      channelManager,
      topicModel,
      llmObjectManager,
      ttsObjectManager,
      sttObjectManager
    };
  }

  private async initializeLeuteModel(context: ModelInitContext): Promise<LeuteModel> {
    console.log('[ModelInitializationPlan] Initializing LeuteModel...');

    // Verify owner ID exists
    const { getInstanceOwnerIdHash } = await import('@refinio/one.core/lib/instance.js');
    const currentOwnerId = getInstanceOwnerIdHash();

    if (!currentOwnerId) {
      throw new Error('Owner ID not available for LeuteModel initialization');
    }

    // Create and initialize LeuteModel
    const leuteModel = new LeuteModel(context.commServerUrl, true); // true = create everyone group
    (leuteModel as any).appId = 'one.leute';

    await leuteModel.init();
    console.log('[ModelInitializationPlan] ✅ LeuteModel initialized');

    // Create/update profile with display name
    await this.ensureProfileName(leuteModel, context.email);

    return leuteModel;
  }

  private async ensureProfileName(leuteModel: LeuteModel, email: string): Promise<void> {
    try {
      const me = await leuteModel.me();
      if (!me) return;

      const profile = await me.mainProfile();
      const hasName = profile.personDescriptions?.some((d: any) => d.$type$ === 'PersonName');

      if (!hasName) {
        // Extract username from email
        let displayName = 'LAMA User';
        if (email) {
          const emailParts = email.split('@');
          const userPart = emailParts[0];
          displayName = userPart.replace(/^node-/, '');
          displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }

        // Add PersonName to profile
        profile.personDescriptions = profile.personDescriptions || [];
        profile.personDescriptions.push({
          $type$: 'PersonName',
          name: displayName
        });

        await profile.saveAndLoad();
        console.log(`[ModelInitializationPlan] ✅ Profile updated with name: ${displayName}`);
      }
    } catch (error) {
      console.warn('[ModelInitializationPlan] Could not update profile:', error);
    }
  }

  private async initializeLLMObjectManager(context: ModelInitContext): Promise<LLMObjectManager> {
    console.log('[ModelInitializationPlan] Initializing LLMObjectManager...');

    const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { createAccess } = await import('@refinio/one.core/lib/access.js');
    const { getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');

    // Capture ownerId for closure
    const ownerId = context.ownerId;

    const llmObjectManager = new LLMObjectManager(
      {
        storeVersionedObject,
        createAccess: async (accessRequests: any[]) => {
          await createAccess(accessRequests);
        },
        getOwnerId: async () => ownerId
        // queryAllLLMObjects not provided - will be handled by AIAssistantHandler
      },
      undefined  // No group for now
    );

    await llmObjectManager.initialize();
    console.log('[ModelInitializationPlan] ✅ LLMObjectManager initialized');

    return llmObjectManager;
  }

  private async initializeTopicModel(channelManager: ChannelManager, leuteModel: LeuteModel): Promise<TopicModel> {
    console.log('[ModelInitializationPlan] Initializing TopicModel...');

    const topicModel = new TopicModel(channelManager, leuteModel);
    await topicModel.init();
    console.log('[ModelInitializationPlan] ✅ TopicModel initialized');

    return topicModel;
  }

  private async initializeTTSObjectManager(context: ModelInitContext): Promise<TTSObjectManager> {
    console.log('[ModelInitializationPlan] Initializing TTSObjectManager...');

    const { storeVersionedObject, getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { storeArrayBufferAsBlob, readBlobAsArrayBuffer } = await import('@refinio/one.core/lib/storage-blob.js');

    // Capture ownerId for closure
    const ownerId = context.ownerId;

    const ttsObjectManager = new TTSObjectManager({
      storeVersionedObject,
      getObjectByIdHash,
      storeArrayBufferAsBlob,
      readBlobAsArrayBuffer,
      getOwnerId: async () => ownerId
      // queryAllTTSObjects not provided yet - will add when needed
    });

    await ttsObjectManager.initialize();
    console.log('[ModelInitializationPlan] ✅ TTSObjectManager initialized');

    return ttsObjectManager;
  }

  private async initializeSTTObjectManager(context: ModelInitContext): Promise<STTObjectManager> {
    console.log('[ModelInitializationPlan] Initializing STTObjectManager...');

    const { storeVersionedObject, getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { storeArrayBufferAsBlob, readBlobAsArrayBuffer } = await import('@refinio/one.core/lib/storage-blob.js');

    // Capture ownerId for closure
    const ownerId = context.ownerId;

    const sttObjectManager = new STTObjectManager({
      storeVersionedObject,
      getObjectByIdHash,
      storeArrayBufferAsBlob,
      readBlobAsArrayBuffer,
      getOwnerId: async () => ownerId
      // queryAllSTTObjects not provided yet - will add when needed
    });

    await sttObjectManager.initialize();
    console.log('[ModelInitializationPlan] ✅ STTObjectManager initialized');

    return sttObjectManager;
  }

  private async initializeConnectionsModel(leuteModel: LeuteModel, commServerUrl: string): Promise<ConnectionsModel> {
    console.log('[ModelInitializationPlan] Initializing ConnectionsModel...');

    // Create FilterGate in SHADOW MODE for parallel evaluation
    // Shadow mode logs decisions without affecting actual filtering
    const filterGate = new FilterGate({
      getEffectiveAccess: async (subject: SHA256IdHash<Person>): Promise<EffectiveAccess | undefined> => {
        // TODO: Replace with FilterModel.getEffectiveAccess once certificates are deployed
        // For now, return a permissive default access that allows everything
        // This lets us observe what FilterGate WOULD decide with real certificate data
        return {
          $type$: 'EffectiveAccess',
          id: subject,
          subject,
          trustLevel: 'high', // Default to high trust in shadow mode
          contextPermissions: JSON.stringify({ '*': ['read', 'write'] }),
          delegationAllowed: true,
          computedAt: Date.now(),
          basedOn: '[]',
          chainDepth: 0,
          source: 'direct'
        };
      },
      shadowMode: true // Enable shadow mode - log but don't enforce
    });
    console.log('[ModelInitializationPlan] FilterGate created in SHADOW MODE');

    // Create ChumFilterAdapter wrapping FilterGate
    const filterAdapter = new ChumFilterAdapter({
      filterGate,
      loadObject: async (hash: SHA256Hash | SHA256IdHash) => {
        // TODO: Implement actual object loading from ONE.core
        // For shadow mode, we return a minimal object with just the type
        // The type will be extracted from the CHUM filter call
        return undefined; // Objects loaded on-demand in filter functions
      },
      logDecisions: true // Enable logging for shadow mode observation
    });

    // Object filter for CHUM sync (what we SEND to peers)
    // Security model:
    // - HashGroup/Group are metadata - allow freely
    // - Access/IdAccess grant actual permissions - check against allowlist
    const objectFilter = async (hash: any, type: string): Promise<boolean> => {
      // HashGroup and Group are just metadata - allow freely
      if (type === 'HashGroup' || type === 'Group') {
        console.log(`[ConnectionsModel] objectFilter: ✅ ${type} ${String(hash).substring(0, 8)} (metadata)`);
        return true;
      }

      // Access/IdAccess grant permissions - check against allowlist
      if (type === 'Access' || type === 'IdAccess') {
        if (topicGroupManagerHolder.manager) {
          const allowed = topicGroupManagerHolder.manager.isAllowedOutbound(String(hash));
          console.log(`[ConnectionsModel] objectFilter: ${allowed ? '✅' : '❌'} ${type} ${String(hash).substring(0, 8)} (allowlist)`);
          return allowed;
        }
        // TopicGroupManager not ready yet - allow (permissive during init)
        console.log(`[ConnectionsModel] objectFilter: ✅ ${type} ${String(hash).substring(0, 8)} (TGM not ready)`);
        return true;
      }

      // All other object types allowed freely
      return true;
    };

    // Import filter for CHUM sync (what we ACCEPT from peers)
    // Delegates to TopicGroupManager when available
    const importFilter = async (hash: any, type: string): Promise<boolean> => {
      // Access/IdAccess grant permissions - check against allowlist
      if (type === 'Access' || type === 'IdAccess') {
        if (topicGroupManagerHolder.manager) {
          const allowed = topicGroupManagerHolder.manager.isAllowedInbound(String(hash));
          console.log(`[ConnectionsModel] importFilter: ${allowed ? '✅' : '❌'} ${type} ${String(hash).substring(0, 8)} (allowlist)`);
          return allowed;
        }
        // TopicGroupManager not ready yet - allow (permissive during init)
        console.log(`[ConnectionsModel] importFilter: ✅ ${type} ${String(hash).substring(0, 8)} (TGM not ready)`);
        return true;
      }
      // HashGroup/Group are metadata - allow from authenticated CHUM peers
      if (type === 'HashGroup' || type === 'Group') {
        console.log(`[ConnectionsModel] importFilter: ✅ ${type} ${String(hash).substring(0, 8)} (metadata)`);
        return true;
      }
      // All other object types allowed
      return true;
    };

    // Factory functions that create per-peer filters with FilterGate shadow evaluation
    const objectFilterFactory = (remotePersonId: SHA256IdHash<Person>) => {
      // Get a FilterGate-aware filter for this specific peer
      const filterGateFilter = filterAdapter.createExportFilter(remotePersonId);

      return async (hash: SHA256Hash | SHA256IdHash, type: string): Promise<boolean> => {
        // Run FilterGate in shadow mode (logs but doesn't affect decision)
        // This runs in parallel to observe what FilterGate would decide
        filterGateFilter(hash, type).catch(err => {
          console.log(`[FilterGate:Shadow] Error evaluating export for ${type}: ${err.message}`);
        });

        // Use existing filter logic for actual decision
        return objectFilter(hash, type);
      };
    };

    const importFilterFactory = (remotePersonId: SHA256IdHash<Person>) => {
      // Get a FilterGate-aware filter for this specific peer
      const filterGateFilter = filterAdapter.createImportFilter(remotePersonId);

      return async (hash: SHA256Hash | SHA256IdHash, type: string): Promise<boolean> => {
        // Run FilterGate in shadow mode (logs but doesn't affect decision)
        filterGateFilter(hash, type).catch(err => {
          console.log(`[FilterGate:Shadow] Error evaluating import for ${type}: ${err.message}`);
        });

        // Use existing filter logic for actual decision
        return importFilter(hash, type);
      };
    };

    // Create ConnectionsModel with factory-based filtering for peer-aware FilterGate
    const connectionsModel = new ConnectionsModel(leuteModel, {
      commServerUrl,
      acceptIncomingConnections: true,
      acceptUnknownInstances: true,       // Accept new instances via pairing
      acceptUnknownPersons: false,        // Require pairing for new persons
      allowPairing: true,                 // Enable pairing protocol
      establishOutgoingConnections: true,  // Auto-connect to discovered endpoints
      allowDebugRequests: true,
      pairingTokenExpirationDuration: 60000 * 15,  // 15 minutes
      noImport: false,
      noExport: false,
      objectFilterFactory,  // Per-peer factory with shadow mode FilterGate
      importFilterFactory   // Per-peer factory with shadow mode FilterGate
    });

    // Initialize ConnectionsModel (blacklist group is optional)
    await connectionsModel.init();
    console.log('[ModelInitializationPlan] ✅ ConnectionsModel initialized - CHUM sync active');
    console.log('[ModelInitializationPlan] Pairing available:', !!(connectionsModel as any).pairing);

    return connectionsModel;
  }

  private async initializeChannelManager(leuteModel: LeuteModel, ownerId: SHA256IdHash<Person>): Promise<ChannelManager> {
    console.log('[ModelInitializationPlan] Initializing ChannelManager...');

    // ChannelManager constructor takes leuteModel (not connectionsModel!)
    const channelManager = new ChannelManager(leuteModel);
    await channelManager.init();
    console.log('[ModelInitializationPlan] ✅ ChannelManager initialized');

    // Create a channel for LLM config storage (owner as sole participant)
    // Using [ownerId] as participants - ChannelManager.createChannel now takes participants array
    await channelManager.createChannel([ownerId], ownerId);
    console.log('[ModelInitializationPlan] ✅ Created LLM config channel for owner');

    return channelManager;
  }
}
