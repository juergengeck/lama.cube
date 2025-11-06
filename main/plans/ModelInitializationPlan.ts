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
import TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';
import { LLMObjectManager } from '@lama/core/models/LLMObjectManager.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';

export interface ModelInitContext {
  ownerId: SHA256IdHash<Person>;
  email: string;
  commServerUrl: string;
  connectionsModel: any;
  onProgress?: (stage: string, percent: number, message: string) => void;
}

export interface InitializedModels {
  leuteModel: LeuteModel;
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
    context.onProgress?.('leute', 40, 'Contact management initialized');

    // Step 2: Initialize LLMObjectManager
    const llmObjectManager = await this.initializeLLMObjectManager();
    context.onProgress?.('llm', 50, 'LLM configuration loaded');

    // Step 3: Initialize ChannelManager (required for TopicModel)
    const channelManager = await this.initializeChannelManager(context.connectionsModel);
    context.onProgress?.('channels', 60, 'Channels initialized');

    // Step 4: Initialize TopicModel (requires ChannelManager and LeuteModel)
    const topicModel = await this.initializeTopicModel(channelManager, leuteModel);
    context.onProgress?.('topics', 70, 'Chat topics initialized');

    console.log('[ModelInitializationPlan] ✅ All models initialized');

    return {
      leuteModel,
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

  private async initializeLLMObjectManager(): Promise<LLMObjectManager> {
    console.log('[ModelInitializationPlan] Initializing LLMObjectManager...');

    const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { createAccess } = await import('@refinio/one.core/lib/access.js');

    const llmObjectManager = new LLMObjectManager(
      {
        storeVersionedObject,
        createAccess: async (accessRequests: any[]) => {
          await createAccess(accessRequests);
        }
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

  private async initializeChannelManager(connectionsModel: any): Promise<ChannelManager> {
    console.log('[ModelInitializationPlan] Initializing ChannelManager...');

    const channelManager = new ChannelManager(connectionsModel);
    await channelManager.init();
    console.log('[ModelInitializationPlan] ✅ ChannelManager initialized');

    return channelManager;
  }
}
