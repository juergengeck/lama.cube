/**
 * Journal IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to JournalPlan methods.
 * Business logic lives in ../../../lama.core/plans/JournalPlan.ts (legacy)
 * and @assembly/core/plans/JournalPlan.ts (new Assembly-based queries)
 *
 * JournalPlan records LLM interactions and AI contact creation as Assembly objects,
 * providing a comprehensive audit trail of AI operations.
 */

import { JournalPlan } from '@lama/core/plans/JournalPlan.js';
import type { LLMCallMetadata } from '@lama/core/plans/JournalPlan.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getInstanceIdHash } from '@refinio/one.core/lib/instance.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import nodeOneCore from '../../core/node-one-core.js';
import type { IpcMainInvokeEvent } from 'electron';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import { getModuleRegistry } from '../../registry/module-registry-init.js';
import type { AssemblyQueryOptions } from '@assembly/core';

// Plan instance (legacy lama.core)
let journalPlan: JournalPlan | null = null;

/**
 * Get or create journal plan instance
 */
function getJournalPlan(): JournalPlan {
    if (!journalPlan && nodeOneCore.initialized) {
        journalPlan = new JournalPlan({
            storeVersionedObject,
            getInstanceIdHash,
            calculateIdHashOfObj
        });
    }

    if (!journalPlan) {
        throw new Error('Journal plan not initialized - ONE.core not provisioned');
    }

    return journalPlan;
}

const journalHandlers = {
    /**
     * Record an LLM call with all its properties
     */
    async recordLLMCall(event: IpcMainInvokeEvent, metadata: LLMCallMetadata) {
        try {
            await getJournalPlan().recordLLMCall(metadata);
            return { success: true };
        } catch (error: any) {
            console.error('[Journal IPC] Error recording LLM call:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Record AI contact creation
     */
    async recordAIContactCreation(
        event: IpcMainInvokeEvent,
        {
            userId,
            aiPersonId,
            modelId,
            displayName
        }: {
            userId: SHA256IdHash<Person>;
            aiPersonId: SHA256IdHash<Person>;
            modelId: string;
            displayName: string;
        }
    ) {
        try {
            await getJournalPlan().recordAIContactCreation(
                userId,
                aiPersonId,
                modelId,
                displayName
            );
            return { success: true };
        } catch (error: any) {
            console.error('[Journal IPC] Error recording AI contact creation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Get journal entries for a specific LLM call
     */
    async getCallEntries(
        event: IpcMainInvokeEvent,
        { planIdHash }: { planIdHash: SHA256IdHash<any> }
    ) {
        try {
            const entries = await getJournalPlan().getCallEntries(planIdHash);
            return {
                success: true,
                entries: Object.fromEntries(entries)
            };
        } catch (error: any) {
            console.error('[Journal IPC] Error getting call entries:', error);
            return {
                success: false,
                error: error.message,
                entries: {}
            };
        }
    },

    /**
     * Get conversation history from journal
     */
    async getConversationHistory(
        event: IpcMainInvokeEvent,
        { conversationId }: { conversationId: string }
    ) {
        try {
            const history = await getJournalPlan().getConversationHistory(conversationId);
            return {
                success: true,
                history
            };
        } catch (error: any) {
            console.error('[Journal IPC] Error getting conversation history:', error);
            return {
                success: false,
                error: error.message,
                history: []
            };
        }
    },

    /**
     * Get all journal entries with optional filters (LEGACY - uses lama.core JournalPlan)
     */
    async getAllEntries(
        event: IpcMainInvokeEvent,
        params: {
            conversationId?: string;
            type?: Array<'conversation' | 'memory' | 'llm-call' | 'ai-contact' | 'system-event'>;
            limit?: number;
            offset?: number;
        }
    ) {
        try {
            const entries = await getJournalPlan().getAllEntries(params);
            return entries;
        } catch (error: any) {
            console.error('[Journal IPC] Error getting all entries:', error);
            throw error;
        }
    },

    /**
     * Query Assemblies for journal display (NEW - uses assembly.core JournalPlan)
     */
    async queryAssemblies(
        event: IpcMainInvokeEvent,
        options: AssemblyQueryOptions
    ) {
        try {
            const registry = getModuleRegistry();
            if (!registry) {
                throw new Error('ModuleRegistry not initialized');
            }

            // Get JournalPlan from registry
            const journalModule = (registry as any).modules?.find((m: any) => m.name === 'JournalModule');
            const assemblyJournalPlan = journalModule?.journalPlan;

            if (!assemblyJournalPlan) {
                throw new Error('JournalModule not initialized in registry');
            }

            const assembliesWithStories = await assemblyJournalPlan.queryAssemblies(options);

            console.log(`[Journal IPC] Queried ${assembliesWithStories.length} assemblies`);

            return {
                success: true,
                data: assembliesWithStories
            };
        } catch (error: any) {
            console.error('[Journal IPC] Error querying assemblies:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }
};

export default journalHandlers;
