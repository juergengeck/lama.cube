/**
 * Trace IPC Plans
 *
 * Provides API endpoints for fetching trace data by messageId.
 * TraceContent objects are stored as versioned objects with messageId as identity.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { TraceContent } from '@refinio/assembly.core/recipes/TraceContentRecipe.js';

const tracePlans = {
    /**
     * Get trace by message ID
     *
     * TraceContent uses messageId as its identity field, so we can
     * calculate the ID hash from a TraceContent object with just the messageId.
     */
    async getByMessageId(
        _event: IpcMainInvokeEvent,
        { messageId }: { messageId: string }
    ): Promise<{ success: boolean; data?: TraceContent; error?: string }> {
        try {
            if (!messageId) {
                return { success: false, error: 'messageId is required' };
            }

            console.log(`[Trace IPC] Looking up trace for messageId: ${messageId.substring(0, 16)}...`);

            // Create a minimal object to calculate its ID hash
            // ID hash is computed from only the isId properties (messageId)
            // Cast to any because ONE.core calculates idHash from isId fields only
            const traceIdObj = {
                $type$: 'TraceContent' as const,
                messageId
            } as unknown as TraceContent;

            const idHash = await calculateIdHashOfObj(traceIdObj) as SHA256IdHash<TraceContent>;
            console.log(`[Trace IPC] Calculated idHash: ${idHash.substring(0, 16)}...`);

            // Get the latest version of the trace
            const result = await getObjectByIdHash(idHash);

            if (!result || !result.obj) {
                // No trace found - not an error, just no data
                console.log(`[Trace IPC] No trace found for messageId: ${messageId.substring(0, 16)}`);
                return { success: true, data: undefined };
            }

            console.log(`[Trace IPC] ✅ Found trace for messageId: ${messageId.substring(0, 16)}, processingTime: ${(result.obj as TraceContent & { processingTimeMs?: number }).processingTimeMs}ms`);
            return {
                success: true,
                data: result.obj as TraceContent
            };
        } catch (error: any) {
            // If the error is "object not found", return success with no data
            if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
                return { success: true, data: undefined };
            }

            console.error('[Trace IPC] Error fetching trace:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

export default tracePlans;
