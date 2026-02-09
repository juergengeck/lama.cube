/**
 * Glue IPC Handlers
 * Thin adapter that delegates to lama.core GluePlan
 * Handles sharing messages to the public glue.one topic
 */

import type { IpcMainInvokeEvent } from 'electron';
import { GluePlan, type GlueMessageData, type ShareToGlueRequest, type ShareToGlueResponse, type GetGlueTopicResponse } from '@refinio/lama.core/plans/GluePlan.js';
import nodeOneCore from '../../core/node-one-core.js';
import { getChatPlan } from './chat.js';
import { getJournalPlan } from './journal.js';

console.log('[Glue] Module loaded');

// Epoch-aware: automatically recreated when nodeOneCore re-initializes
let gluePlan: GluePlan | null = null;
let gluePlanEpoch = -1;

/** @deprecated No-op: plan cache invalidates automatically via initEpoch */
export function resetGluePlanSingleton(): void {}

function getGluePlan(): GluePlan {
  if (!nodeOneCore.initialized) {
    throw new Error('NodeOneCore not initialized');
  }
  const aiTopicManager = nodeOneCore.aiAssistantModel?.getTopicManager();
  if (!aiTopicManager) {
    throw new Error('AITopicManager not initialized');
  }
  if (!gluePlan || gluePlanEpoch !== nodeOneCore.initEpoch) {
    gluePlan = new GluePlan({
      aiTopicManager,
      chatPlan: getChatPlan(),
      ownerId: nodeOneCore.ownerId
    });
    gluePlanEpoch = nodeOneCore.initEpoch;
  }
  return gluePlan;
}

// IPC parameter interfaces
interface ShareToGlueParams {
  message: GlueMessageData;
  attribution?: string;
  includeSourceTopic?: boolean;
}

interface GetGlueTopicParams {
  // No parameters needed
}

/**
 * Share a message to glue.one
 */
async function shareToGlue(
  _event: IpcMainInvokeEvent,
  params: ShareToGlueParams
): Promise<ShareToGlueResponse> {
  console.log('[Glue] shareToGlue called:', { messageId: params.message.id });

  try {
    const plan = getGluePlan();
    const result = await plan.shareToGlue(params);

    if (result.success) {
      console.log('[Glue] Message shared successfully to:', result.glueTopicId);

      // Record share in journal
      try {
        const journalPlan = getJournalPlan();
        await journalPlan.recordShareToGlue(
          params.message.id,
          params.message.topicName
        );
      } catch (journalErr) {
        console.warn('[Glue] Failed to record share in journal:', journalErr);
      }
    } else {
      console.error('[Glue] Failed to share message:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[Glue] Error sharing to glue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get the glue topic ID
 */
async function getGlueTopic(
  _event: IpcMainInvokeEvent,
  _params: GetGlueTopicParams
): Promise<GetGlueTopicResponse> {
  console.log('[Glue] getGlueTopic called');

  try {
    const plan = getGluePlan();
    return await plan.getGlueTopic();
  } catch (error) {
    console.error('[Glue] Error getting glue topic:', error);
    return {
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reset the plan instance (for hot reload)
 */
export function resetGluePlan(): void {
  gluePlan = null;
}

// Export the plan handlers
export const gluePlans = {
  'glue:shareToGlue': shareToGlue,
  'glue:getGlueTopic': getGlueTopic
};

export default gluePlans;
