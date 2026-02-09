/**
 * Molt IPC Handlers
 * Thin adapter that delegates to lama.core MoltPlan
 * Handles moltbook AI social network integration
 */

import type { IpcMainInvokeEvent } from 'electron';
import { app } from 'electron';
import { MoltPlan, type GetConfigResponse, type SetEnabledResponse, type SyncNowResponse, type GetMoltTopicResponse, type GetFeedResponse, type ShareToMoltRequest, type ShareToMoltResponse, type SyncWithAIResponse } from '@refinio/lama.core/plans/MoltPlan.js';
import fs from 'fs/promises';
import nodeOneCore from '../../core/node-one-core.js';
import { getChatPlan } from './chat.js';
import { getJournalPlan } from './journal.js';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

console.log('[Molt] Module loaded');

// Lazy-initialized MoltPlan - created after nodeOneCore is initialized
let moltPlan: MoltPlan | null = null;

// MoltbookAdapter instance (optional - only if glue.moltbook is available)
let moltbookAdapter: any = null;
let moltEpoch = -1;

/**
 * @deprecated No-op: plan cache invalidates automatically via initEpoch
 */
export function resetMoltPlanSingletons(): void {}

/**
 * Initialize the MoltbookAdapter if available
 */
async function initMoltbookAdapter(): Promise<any> {
  if (moltbookAdapter) return moltbookAdapter;

  try {
    // Dynamic import - glue.moltbook may not be installed
    const { MoltbookAdapter } = await import('@refinio/glue.moltbook');

    // Load credentials from package
    // In dev mode: app.getAppPath() points to lama.cube/out/main, go up to workspace
    // In packaged app: credentials would need to be bundled differently
    const appPath = app.getAppPath();
    // out/main -> lama.cube -> packages -> lama (workspace root)
    const workspaceRoot = resolve(appPath, '..', '..', '..');
    const credentialsPath = join(workspaceRoot, 'packages', 'glue.moltbook', 'credentials.json');
    console.log('[Molt] Looking for credentials at:', credentialsPath);
    let credentials = null;
    try {
      const data = await fs.readFile(credentialsPath, 'utf-8');
      credentials = JSON.parse(data);
    } catch {
      console.log('[Molt] No credentials found at', credentialsPath);
    }

    // Create adapter with minimal deps (we'll use it for direct API calls mostly)
    const aiTopicManager = nodeOneCore.aiAssistantModel?.getTopicManager();
    const channelManager = nodeOneCore.channelManager;

    if (!aiTopicManager || !channelManager) {
      console.log('[Molt] AITopicManager or ChannelManager not ready');
      return null;
    }

    moltbookAdapter = new MoltbookAdapter({
      getAgentName: () => credentials?.agent_name || 'GlueOne',
      getAgentDescription: () => 'LAMA AI - sharing from the ONE platform',
      storeCredentials: async (creds: any) => {
        await fs.writeFile(credentialsPath, JSON.stringify(creds, null, 2));
      },
      loadCredentials: async () => credentials,
      channelManager,
      getGlueTopicId: () => aiTopicManager.getMoltTopicId(),
      getGlueMessages: async () => [],  // Not used for now - we use direct API
      postToGlue: async () => ({ success: true }),  // Not used for now
    }, {
      defaultSubmolt: 'glueone',
    });

    // Initialize the adapter
    await moltbookAdapter.init();
    console.log('[Molt] MoltbookAdapter initialized');

    return moltbookAdapter;
  } catch (error) {
    console.log('[Molt] MoltbookAdapter not available:', error);
    return null;
  }
}

/**
 * Get MoltPlan instance - creates on first use after NodeOneCore init
 */
async function getMoltPlan(): Promise<MoltPlan> {
  if (!nodeOneCore.initialized) {
    throw new Error('NodeOneCore not initialized');
  }
  const aiTopicManager = nodeOneCore.aiAssistantModel?.getTopicManager();
  if (!aiTopicManager) {
    throw new Error('AITopicManager not initialized');
  }

  if (!moltPlan || moltEpoch !== nodeOneCore.initEpoch) {
    moltPlan = null;
    moltbookAdapter = null;
    // Try to initialize the adapter
    const adapter = await initMoltbookAdapter();

    moltPlan = new MoltPlan({
      aiTopicManager,
      chatPlan: getChatPlan(),
      ownerId: nodeOneCore.ownerId,
      moltbookAdapter: adapter || undefined,
      aiAssistantPlan: nodeOneCore.aiAssistantModel || undefined,
      // TODO: Add settingsStorage when available
    });
    moltEpoch = nodeOneCore.initEpoch;
  }
  return moltPlan;
}

// IPC parameter interfaces
interface GetConfigParams {
  // No parameters needed
}

interface SetEnabledParams {
  enabled: boolean;
}

interface SyncNowParams {
  // No parameters needed
}

interface GetMoltTopicParams {
  // No parameters needed
}

interface GetFeedParams {
  limit?: number;
}

interface ShareToMoltParams {
  message: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
    isOwn: boolean;
    topicName?: string;
    subjects?: string[];
    language?: string;
  };
  includeSourceTopic?: boolean;
}

interface SyncWithAIParams {
  postToMoltbook?: boolean;
  /** What we're currently working on - shared naturally in conversation */
  activity?: string;
  /** Additional capabilities to mention (merged with built-in LAMA capabilities) */
  capabilities?: Array<{ name: string; description: string }>;
}

/**
 * Get moltbook configuration
 */
async function getConfig(
  _event: IpcMainInvokeEvent,
  _params: GetConfigParams
): Promise<GetConfigResponse> {
  console.log('[Molt] getConfig called');

  try {
    const plan = await getMoltPlan();
    return await plan.getConfig();
  } catch (error) {
    console.error('[Molt] Error getting config:', error);
    return {
      success: false,
      config: {
        enabled: false,
        agentName: null,
        profileUrl: null,
        submoltUrl: null,
        claimed: false,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enable or disable moltbook integration
 */
async function setEnabled(
  _event: IpcMainInvokeEvent,
  params: SetEnabledParams
): Promise<SetEnabledResponse> {
  console.log('[Molt] setEnabled called:', params.enabled);

  try {
    const plan = await getMoltPlan();
    const result = await plan.setEnabled(params.enabled);

    // Record activation in journal when enabled successfully
    if (result.success && params.enabled) {
      try {
        const config = await plan.getConfig();
        if (config.config.agentName) {
          const journalPlan = getJournalPlan();
          await journalPlan.recordMoltActivated(
            config.config.agentName,
            config.config.profileUrl || ''
          );
        }
      } catch (journalErr) {
        console.warn('[Molt] Failed to record activation in journal:', journalErr);
      }
    }

    return result;
  } catch (error) {
    console.error('[Molt] Error setting enabled:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger a manual sync with moltbook
 */
async function syncNow(
  _event: IpcMainInvokeEvent,
  _params: SyncNowParams
): Promise<SyncNowResponse> {
  console.log('[Molt] syncNow called');

  try {
    const plan = await getMoltPlan();
    const result = await plan.syncNow();

    // Record sync in journal
    if (result.success) {
      try {
        const journalPlan = getJournalPlan();
        await journalPlan.recordMoltSync(result.syncedPosts || 0);
      } catch (journalErr) {
        console.warn('[Molt] Failed to record sync in journal:', journalErr);
      }
    }

    return result;
  } catch (error) {
    console.error('[Molt] Error syncing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the molt topic ID
 */
async function getMoltTopic(
  _event: IpcMainInvokeEvent,
  _params: GetMoltTopicParams
): Promise<GetMoltTopicResponse> {
  console.log('[Molt] getMoltTopic called');

  try {
    const plan = await getMoltPlan();
    return await plan.getMoltTopic();
  } catch (error) {
    console.error('[Molt] Error getting molt topic:', error);
    return {
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the moltbook feed
 */
async function getFeed(
  _event: IpcMainInvokeEvent,
  params: GetFeedParams
): Promise<GetFeedResponse> {
  console.log('[Molt] getFeed called');

  try {
    const plan = await getMoltPlan();
    return await plan.getFeed(params.limit);
  } catch (error) {
    console.error('[Molt] Error getting feed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Share a message to moltbook
 */
async function shareToMolt(
  _event: IpcMainInvokeEvent,
  params: ShareToMoltParams
): Promise<ShareToMoltResponse> {
  console.log('[Molt] shareToMolt called');

  try {
    const plan = await getMoltPlan();
    const result = await plan.shareToMolt(params);

    // Record share in journal
    if (result.success) {
      try {
        const journalPlan = getJournalPlan();
        await journalPlan.recordShareToMolt(
          params.message.id,
          result.postId,
          params.message.topicName
        );
      } catch (journalErr) {
        console.warn('[Molt] Failed to record share in journal:', journalErr);
      }
    }

    return result;
  } catch (error) {
    console.error('[Molt] Error sharing to moltbook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync with moltbook and have AI respond intelligently
 * This is the "interesting" version - AI reads feed, summarizes, and responds
 */
async function syncWithAI(
  _event: IpcMainInvokeEvent,
  params: SyncWithAIParams
): Promise<SyncWithAIResponse> {
  console.log('[Molt] syncWithAI called');

  try {
    const plan = await getMoltPlan();
    const result = await plan.syncWithAI({
      postToMoltbook: params.postToMoltbook,
      activity: params.activity,
      capabilities: params.capabilities,
    });

    // Record in journal if successful
    if (result.success) {
      try {
        const journalPlan = getJournalPlan();
        await journalPlan.recordMoltSync(result.postedToMoltbook ? 1 : 0);
      } catch (journalErr) {
        console.warn('[Molt] Failed to record AI sync in journal:', journalErr);
      }
    }

    return result;
  } catch (error) {
    console.error('[Molt] Error in syncWithAI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * @deprecated No-op: plan cache invalidates automatically via initEpoch
 */
export function resetMoltPlan(): void {}

// Export the plan handlers
export const moltPlans = {
  'molt:getConfig': getConfig,
  'molt:setEnabled': setEnabled,
  'molt:syncNow': syncNow,
  'molt:syncWithAI': syncWithAI,
  'molt:getMoltTopic': getMoltTopic,
  'molt:getFeed': getFeed,
  'molt:shareToMolt': shareToMolt,
};

export default moltPlans;
