/**
 * IPC plans for document ingestion
 *
 * Thin wrapper around memory.core's IngestionPlan.
 * Injects platform dependencies and exposes via IPC.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { IngestionPlan, type IngestionParams } from '@refinio/memory.core';
import nodeOneCore from '../../core/node-one-core.js';
import { getAIModule } from '../../registry/module-registry-init.js';

// Lazily initialized ingestion plan
let ingestionPlan: IngestionPlan | null = null;

/**
 * Get or create the IngestionPlan instance
 */
function getIngestionPlan(): IngestionPlan {
  if (!ingestionPlan) {
    if (!nodeOneCore.initialized) {
      throw new Error('NodeOneCore not initialized');
    }

    const aiModule = getAIModule();
    if (!aiModule) {
      throw new Error('AIModule not initialized');
    }

    ingestionPlan = new IngestionPlan({
      topicModel: nodeOneCore.topicModel,
      leuteModel: nodeOneCore.leuteModel,
      aiAssistantPlan: nodeOneCore.aiAssistantModel,
      aiPlan: aiModule.aiPlan
    });
  }
  return ingestionPlan;
}

export default function registerIngestionPlans(handle: (channel: string, handler: any) => void) {
  /**
   * Start a document ingestion session
   * Creates a new topic with the document as the first message
   */
  handle(
    'ingestion:startIngestion',
    async (_event: IpcMainInvokeEvent, params: IngestionParams & { documentBlob?: ArrayBuffer | number[] }) => {
      try {
        console.log('[IPC:ingestion] Starting ingestion for:', params.title);

        const plan = getIngestionPlan();

        // Convert documentBlob from number[] if serialized over IPC
        let documentBlob: ArrayBuffer | undefined;
        if (params.documentBlob) {
          if (Array.isArray(params.documentBlob)) {
            documentBlob = new Uint8Array(params.documentBlob).buffer;
          } else {
            documentBlob = params.documentBlob;
          }
        }

        const result = await plan.startIngestion({
          ...params,
          documentBlob
        });

        if (result.success) {
          console.log('[IPC:ingestion] Created ingestion topic:', result.topicId);
        }

        return result;
      } catch (error) {
        console.error('[IPC:ingestion] Error starting ingestion:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  console.log('[IPC] ✅ Ingestion plans registered');
}
