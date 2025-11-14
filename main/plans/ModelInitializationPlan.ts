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
import { LLMObjectManager } from '@lama/core/models/LLMObjectManager.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person, Group } from '@refinio/one.core/lib/recipes.js';

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
}

/**
 * Model Initialization Plan
 * Initializes ONE.core models in proper sequence
 */
export class ModelInitializationPlan {
  async execute(context: ModelInitContext): Promise<InitializedModels> {
    console.log('[ModelInitializationPlan] Initializing models...');

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

    // Step 5: Initialize TopicModel (requires ChannelManager and LeuteModel)
    const topicModel = await this.initializeTopicModel(channelManager, leuteModel);
    context.onProgress?.('topics', 70, 'Chat topics initialized');

    console.log('[ModelInitializationPlan] ✅ All models initialized');

    return {
      leuteModel,
      connectionsModel,
      channelManager,
      topicModel,
      llmObjectManager
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
        }
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

  private async initializeConnectionsModel(leuteModel: LeuteModel, commServerUrl: string): Promise<ConnectionsModel> {
    console.log('[ModelInitializationPlan] Initializing ConnectionsModel...');

    // Create ConnectionsModel with configuration
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
      noExport: false
    });

    // Initialize ConnectionsModel (blacklist group is optional)
    await connectionsModel.init();
    console.log('[ModelInitializationPlan] ✅ ConnectionsModel initialized - CHUM sync active');

    return connectionsModel;
  }

  private async initializeChannelManager(leuteModel: LeuteModel, ownerId: SHA256IdHash<Person>): Promise<ChannelManager> {
    console.log('[ModelInitializationPlan] Initializing ChannelManager...');

    // ChannelManager constructor takes leuteModel (not connectionsModel!)
    const channelManager = new ChannelManager(leuteModel);
    await channelManager.init();
    console.log('[ModelInitializationPlan] ✅ ChannelManager initialized');

    // Create the 'lama' channel for LLM config storage
    // Use ownerId as the channel owner since LLM config is per-user
    await channelManager.createChannel('lama', ownerId);
    console.log('[ModelInitializationPlan] ✅ Created lama channel for LLM config storage');

    return channelManager;
  }
}
