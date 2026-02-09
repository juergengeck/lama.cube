/**
 * Journal IPC Handlers
 *
 * Maps Electron IPC calls to Assembly-based journal operations.
 * Uses AssemblyManager for recording and JournalModule for queries.
 *
 * Records LLM interactions and AI contact creation as Assembly objects,
 * providing a comprehensive audit trail of AI operations.
 */

import type { IpcMainInvokeEvent } from 'electron';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import nodeOneCore from '../../core/node-one-core.js';
import { getModuleRegistry } from '../../registry/module-registry-init.js';
import assemblyManager from '../../services/assembly-manager-singleton.js';
import type { AssemblyQueryOptions } from '@refinio/assembly.core';

/**
 * LLM call metadata for journal recording
 */
export interface LLMCallMetadata {
    topicId?: string;
    modelId: string;
    provider: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    success: boolean;
    error?: string;
}

/**
 * Journal entry for contact creation
 */
interface ContactCreationEntry {
    contactType: string;
    personId: string;
    displayName: string;
    createdBy: string;
    source: string;
    [key: string]: unknown;
}

/**
 * Journal entry for trust certificate
 */
interface TrustCertificateEntry {
    action: string;
    certificateType: string;
    subject: string;
    issuer: string;
    certificateHash: string;
    [key: string]: unknown;
}

/**
 * Get journal plan interface for lama.core integration
 *
 * Provides recording methods expected by AIManager and other lama.core code.
 * Uses AssemblyManager for actual storage.
 */
export function getJournalPlan() {
    if (!nodeOneCore.initialized) {
        throw new Error('Journal plan not initialized - ONE.core not provisioned');
    }

    return {
        /**
         * Record contact creation in journal
         */
        async recordContactCreation(entry: ContactCreationEntry): Promise<void> {
            console.log('[JournalPlan] Recording contact creation:', {
                contactType: entry.contactType,
                personId: entry.personId,
                displayName: entry.displayName
            });

            // For AI contacts, use AssemblyManager
            if (entry.contactType === 'ai' && assemblyManager.isInitialized()) {
                try {
                    await assemblyManager.createAIContactAssembly(
                        entry.personId as SHA256IdHash<Person>,
                        entry.displayName,
                        'unknown' // modelId not in entry
                    );
                } catch (err) {
                    console.error('[JournalPlan] Failed to create AI contact assembly:', err);
                }
            }
        },

        /**
         * Record trust certificate in journal
         */
        async recordTrustCertificate(entry: TrustCertificateEntry): Promise<void> {
            console.log('[JournalPlan] Recording trust certificate:', {
                action: entry.action,
                certificateType: entry.certificateType,
                subject: entry.subject
            });

            // TODO: Create assembly for trust certificate events
            // For now, just log - full implementation requires trust-specific assembly plan
        },

        /**
         * Record API key configuration event
         */
        async recordApiKeyConfigured(provider: string, masked: string): Promise<void> {
            console.log('[JournalPlan] Recording API key configuration:', { provider });

            if (assemblyManager.isInitialized()) {
                try {
                    await assemblyManager.createSystemEventAssembly(
                        'config',
                        'api-key-configured',
                        `API Key Configured: ${provider}`,
                        { provider, keyMasked: masked }
                    );
                } catch (err) {
                    console.error('[JournalPlan] Failed to create API key config assembly:', err);
                }
            }
        },

        /**
         * Record moltbook activation event
         */
        async recordMoltActivated(agentName: string, profileUrl: string): Promise<void> {
            console.log('[JournalPlan] Recording moltbook activation:', { agentName });

            if (assemblyManager.isInitialized()) {
                try {
                    await assemblyManager.createSystemEventAssembly(
                        'integration',
                        'molt-activated',
                        `Moltbook Activated: ${agentName}`,
                        { agentName, profileUrl }
                    );
                } catch (err) {
                    console.error('[JournalPlan] Failed to create molt activation assembly:', err);
                }
            }
        },

        /**
         * Record moltbook sync event
         */
        async recordMoltSync(postsCount: number): Promise<void> {
            console.log('[JournalPlan] Recording moltbook sync:', { postsCount });

            if (assemblyManager.isInitialized()) {
                try {
                    await assemblyManager.createSystemEventAssembly(
                        'integration',
                        'molt-sync',
                        `Moltbook Synced: ${postsCount} posts`,
                        { postsCount, timestamp: new Date().toISOString() }
                    );
                } catch (err) {
                    console.error('[JournalPlan] Failed to create molt sync assembly:', err);
                }
            }
        },

        /**
         * Record share to glue.one event
         */
        async recordShareToGlue(messageId: string, topicName?: string): Promise<void> {
            console.log('[JournalPlan] Recording share to glue.one:', { messageId });

            if (assemblyManager.isInitialized()) {
                try {
                    await assemblyManager.createSystemEventAssembly(
                        'sharing',
                        'shared-to-glue',
                        `Shared to glue.one${topicName ? ` from "${topicName}"` : ''}`,
                        { messageId, topicName, timestamp: new Date().toISOString() }
                    );
                } catch (err) {
                    console.error('[JournalPlan] Failed to create glue share assembly:', err);
                }
            }
        },

        /**
         * Record share to moltbook event
         */
        async recordShareToMolt(messageId: string, postId?: string, topicName?: string): Promise<void> {
            console.log('[JournalPlan] Recording share to moltbook:', { messageId, postId });

            if (assemblyManager.isInitialized()) {
                try {
                    await assemblyManager.createSystemEventAssembly(
                        'sharing',
                        'shared-to-molt',
                        `Shared to moltbook${topicName ? ` from "${topicName}"` : ''}`,
                        { messageId, postId, topicName, timestamp: new Date().toISOString() }
                    );
                } catch (err) {
                    console.error('[JournalPlan] Failed to create molt share assembly:', err);
                }
            }
        }
    };
}

const journalHandlers = {
    /**
     * Record an LLM call with all its properties
     *
     * TODO: Implement LLM call recording via AssemblyManager
     * For now, logs but doesn't persist (feature not yet implemented)
     */
    async recordLLMCall(_event: IpcMainInvokeEvent, metadata: LLMCallMetadata) {
        try {
            // Log for debugging - actual persistence not yet implemented
            console.log('[Journal IPC] LLM call recorded (logging only):', {
                modelId: metadata.modelId,
                provider: metadata.provider,
                success: metadata.success,
                tokens: { input: metadata.inputTokens, output: metadata.outputTokens }
            });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[Journal IPC] Error recording LLM call:', error);
            return {
                success: false,
                error: message
            };
        }
    },

    /**
     * Record AI contact creation
     *
     * Uses AssemblyManager to create an Assembly for the AI contact.
     */
    async recordAIContactCreation(
        _event: IpcMainInvokeEvent,
        {
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
            if (!assemblyManager.isInitialized()) {
                console.warn('[Journal IPC] AssemblyManager not initialized, skipping AI contact recording');
                return { success: true };
            }

            await assemblyManager.createAIContactAssembly(aiPersonId, displayName, modelId);
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[Journal IPC] Error recording AI contact creation:', error);
            return {
                success: false,
                error: message
            };
        }
    },

    /**
     * Get journal entries for a specific entity
     *
     * Uses JournalModule to query assemblies by entity.
     */
    async getCallEntries(
        _event: IpcMainInvokeEvent,
        { planIdHash }: { planIdHash: SHA256IdHash<any> }
    ) {
        try {
            const registry = getModuleRegistry();
            if (!registry) {
                return { success: true, entries: {} };
            }

            const journalModule = registry.getModule<any>('JournalModule');
            if (!journalModule?.journalPlan) {
                return { success: true, entries: {} };
            }

            const assemblies = await journalModule.journalPlan.getByEntity(planIdHash);
            const entries: Record<string, unknown> = {};
            for (const asm of assemblies) {
                entries[asm.assembly.entity as string] = asm;
            }

            return {
                success: true,
                entries
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[Journal IPC] Error getting call entries:', error);
            return {
                success: false,
                error: message,
                entries: {}
            };
        }
    },

    /**
     * Get conversation history from journal
     *
     * Uses JournalModule to query assemblies by topic.
     */
    async getConversationHistory(
        _event: IpcMainInvokeEvent,
        { topicId }: { topicId: string }
    ) {
        try {
            const registry = getModuleRegistry();
            if (!registry) {
                return { success: true, history: [] };
            }

            const journalModule = registry.getModule<any>('JournalModule');
            if (!journalModule?.journalPlan) {
                return { success: true, history: [] };
            }

            const assemblies = await journalModule.journalPlan.queryAssemblies({
                topicId,
                sortBy: 'created',
                order: 'asc'
            });

            return {
                success: true,
                history: assemblies
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[Journal IPC] Error getting conversation history:', error);
            return {
                success: false,
                error: message,
                history: []
            };
        }
    },

    /**
     * Get all journal entries with optional filters
     *
     * Uses JournalModule to query assemblies with filtering.
     */
    async getAllEntries(
        _event: IpcMainInvokeEvent,
        params: {
            topicId?: string;
            type?: Array<'conversation' | 'memory' | 'llm-call' | 'ai-contact' | 'system-event'>;
            limit?: number;
            offset?: number;
        }
    ) {
        try {
            const registry = getModuleRegistry();
            if (!registry) {
                return [];
            }

            const journalModule = registry.getModule<any>('JournalModule');
            if (!journalModule?.journalPlan) {
                return [];
            }

            // Map legacy type filters to domain filters
            const domains: string[] = [];
            if (params.type?.includes('ai-contact')) domains.push('ai');
            if (params.type?.includes('conversation')) domains.push('chat');

            const queryOptions: AssemblyQueryOptions = {
                limit: params.limit,
                order: 'desc'
            };

            if (params.topicId) {
                queryOptions.topicId = params.topicId;
            }
            if (domains.length > 0) {
                queryOptions.domains = domains;
            }

            const assemblies = await journalModule.journalPlan.queryAssemblies(queryOptions);
            return assemblies;
        } catch (error: unknown) {
            console.error('[Journal IPC] Error getting all entries:', error);
            throw error;
        }
    },

    /**
     * Query Assemblies for journal display
     *
     * Uses JournalModule to query assemblies with full filtering support.
     */
    async queryAssemblies(
        _event: IpcMainInvokeEvent,
        options: AssemblyQueryOptions
    ) {
        console.log('[Journal IPC] queryAssemblies called with options:', options);
        try {
            const registry = getModuleRegistry();
            if (!registry) {
                console.error('[Journal IPC] ModuleRegistry not initialized');
                throw new Error('ModuleRegistry not initialized');
            }

            const journalModule = registry.getModule<any>('JournalModule');

            if (!journalModule) {
                console.warn('[Journal IPC] JournalModule not found in registry');
                return {
                    success: true,
                    data: []
                };
            }

            if (!journalModule.journalPlan) {
                console.warn('[Journal IPC] JournalModule.journalPlan not initialized yet');
                return {
                    success: true,
                    data: []
                };
            }

            const stats = journalModule.assemblyDimension?.getStats?.();
            console.log(`[Journal IPC] AssemblyDimension stats:`, stats);

            const assembliesWithStories = await journalModule.journalPlan.queryAssemblies(options);

            console.log(`[Journal IPC] Queried ${assembliesWithStories.length} assemblies`);

            return {
                success: true,
                data: assembliesWithStories
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[Journal IPC] Error querying assemblies:', error);
            return {
                success: false,
                error: message,
                data: []
            };
        }
    }
};

export default journalHandlers;
