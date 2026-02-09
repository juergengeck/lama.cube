/**
 * Marketplace IPC Handlers
 * Thin adapter that delegates to one.knowledge MarketplacePlan
 *
 * Exposes marketplace operations for supply/demand matching via IPC.
 */

import type { IpcMainInvokeEvent } from 'electron';
import type { SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { TrustLevel } from '@refinio/one.knowledge/lib/services/MarketplaceMatchingService.js';
import { MarketplacePlan, type MarketplacePlanDependencies } from '@refinio/one.knowledge/lib/plans/MarketplacePlan.js';
import { MarketplaceMatchingService } from '@refinio/one.knowledge/lib/services/MarketplaceMatchingService.js';
import { Meaning } from '@refinio/meaning.core';
import { SemanticDimension } from '@refinio/cube.core';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import nodeOneCore from '../../core/node-one-core.js';
import { getInferenceManager } from '../../core/inference-manager.js';

// Lazy-initialized components
let marketplacePlan: MarketplacePlan | null = null;
let semanticDimension: SemanticDimension | null = null;
let initializingPromise: Promise<void> | null = null;

/**
 * Initialize SemanticDimension for semantic marketplace matching
 * Uses InferenceManager for embeddings (same pattern as proposals.ts)
 */
async function initSemanticDimension(): Promise<SemanticDimension> {
    if (semanticDimension) {
        return semanticDimension;
    }

    if (initializingPromise) {
        await initializingPromise;
        if (semanticDimension) {
            return semanticDimension;
        }
        throw new Error('SemanticDimension initialization failed');
    }

    initializingPromise = (async () => {
        console.log('[Marketplace] Initializing SemanticDimension...');

        const inferenceManager = getInferenceManager();

        // Initialize InferenceManager if needed
        if (!inferenceManager.initialized) {
            console.log('[Marketplace] Initializing InferenceManager...');
            await inferenceManager.init();
        }

        const localProvider = inferenceManager.getEmbeddingProvider();
        console.log('[Marketplace] Creating SemanticDimension with embedding provider');

        // Adapt LocalEmbeddingProvider to meaning.core's EmbeddingProvider interface
        const embeddingProvider = {
            embed: (text: string) => localProvider.embed(text),
            embedBatch: (texts: string[]) => localProvider.embedBatch(texts)
        };

        // Create Meaning service and SemanticDimension
        const meaning = new Meaning();
        meaning.setProvider(embeddingProvider);

        semanticDimension = new SemanticDimension({ meaning });
        await semanticDimension.init();
        console.log('[Marketplace] SemanticDimension initialized');
    })();

    await initializingPromise;
    initializingPromise = null;

    if (!semanticDimension) {
        throw new Error('Failed to initialize SemanticDimension');
    }

    return semanticDimension;
}

/**
 * Get or create MarketplacePlan instance
 * Lazily initializes with SemanticDimension for embeddings
 */
async function getMarketplacePlan(): Promise<MarketplacePlan> {
    if (!nodeOneCore.initialized) {
        throw new Error('NodeOneCore not initialized');
    }

    if (!marketplacePlan) {
        const semDim = await initSemanticDimension();

        // Create matching service with meaning dimension
        const matchingService = new MarketplaceMatchingService({
            meaningDimension: {
                getEmbedding: async (text: string) => {
                    return semDim.generateEmbedding(text);
                },
                query: async (embedding: number[], k: number) => {
                    return semDim.queryWithScores({ embedding, k });
                }
            }
        });

        // Create dependencies for MarketplacePlan
        const deps: MarketplacePlanDependencies = {
            matchingService,
            meaningDimension: {
                getEmbedding: async (text: string) => {
                    return semDim.generateEmbedding(text);
                }
            },
            storeObject: async (obj: any) => {
                // Use one.core versioned storage
                const result = await storeVersionedObject(obj);
                return String(result.idHash || result.hash);
            },
            getObject: async (hash: string) => {
                return getObject(hash as SHA256Hash);
            },
            getCurrentOwnerId: () => {
                if (!nodeOneCore.ownerId) {
                    throw new Error('Owner ID not available');
                }
                return String(nodeOneCore.ownerId);
            }
        };

        marketplacePlan = new MarketplacePlan(deps);
    }

    return marketplacePlan;
}

// IPC Parameter interfaces
interface PublishSupplyParams {
    memoryId: string;
    trustLevel: TrustLevel;
    domain?: string;
    keywords?: string[];
    description?: string;
}

interface CreateDemandParams {
    query: string;
    keywords?: string[];
    trustRequired: TrustLevel;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    purpose?: string;
}

interface MatchDemandParams {
    demandId: string;
    config?: {
        semanticWeight?: number;
        keywordWeight?: number;
        semanticThreshold?: number;
        maxResults?: number;
    };
}

interface SearchSuppliesParams {
    query: string;
    filters?: {
        keywords?: string[];
        domain?: string;
        trustRequired?: TrustLevel;
    };
    config?: {
        semanticWeight?: number;
        keywordWeight?: number;
        semanticThreshold?: number;
        maxResults?: number;
    };
}

interface IpcResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Marketplace IPC handlers
 */
export const marketplacePlans = {
    /**
     * Publish a memory as a supply in the marketplace
     */
    'marketplace:publishSupply': async (
        event: IpcMainInvokeEvent,
        params: PublishSupplyParams
    ): Promise<IpcResponse<{ supplyId: string }>> => {
        try {
            const plan = await getMarketplacePlan();
            const result = await plan.publishSupply(params);
            return { success: true, data: result };
        } catch (error) {
            console.error('[Marketplace IPC] publishSupply error:', error);
            return { success: false, error: (error as Error).message };
        }
    },

    /**
     * Create a demand (knowledge request)
     */
    'marketplace:createDemand': async (
        event: IpcMainInvokeEvent,
        params: CreateDemandParams
    ): Promise<IpcResponse<{ demandId: string }>> => {
        try {
            const plan = await getMarketplacePlan();
            const result = await plan.createDemand(params);
            return { success: true, data: result };
        } catch (error) {
            console.error('[Marketplace IPC] createDemand error:', error);
            return { success: false, error: (error as Error).message };
        }
    },

    /**
     * Match a demand against available supplies
     */
    'marketplace:matchDemand': async (
        event: IpcMainInvokeEvent,
        params: MatchDemandParams
    ): Promise<IpcResponse<{ matches: any[] }>> => {
        try {
            const plan = await getMarketplacePlan();
            const result = await plan.matchDemand(params);
            return { success: true, data: result };
        } catch (error) {
            console.error('[Marketplace IPC] matchDemand error:', error);
            return { success: false, error: (error as Error).message };
        }
    },

    /**
     * Search supplies directly with a query
     */
    'marketplace:searchSupplies': async (
        event: IpcMainInvokeEvent,
        params: SearchSuppliesParams
    ): Promise<IpcResponse<{ matches: any[] }>> => {
        try {
            const plan = await getMarketplacePlan();
            const result = await plan.searchSupplies(params);
            return { success: true, data: result };
        } catch (error) {
            console.error('[Marketplace IPC] searchSupplies error:', error);
            return { success: false, error: (error as Error).message };
        }
    },

    /**
     * Get all supplies for the current owner
     */
    'marketplace:getMySupplies': async (
        event: IpcMainInvokeEvent
    ): Promise<IpcResponse<{ supplies: any[] }>> => {
        try {
            const plan = await getMarketplacePlan();
            const result = await plan.getMySupplies();
            return { success: true, data: result };
        } catch (error) {
            console.error('[Marketplace IPC] getMySupplies error:', error);
            return { success: false, error: (error as Error).message };
        }
    },

    /**
     * Get all demands for the current requester
     */
    'marketplace:getMyDemands': async (
        event: IpcMainInvokeEvent
    ): Promise<IpcResponse<{ demands: any[] }>> => {
        try {
            const plan = await getMarketplacePlan();
            const result = await plan.getMyDemands();
            return { success: true, data: result };
        } catch (error) {
            console.error('[Marketplace IPC] getMyDemands error:', error);
            return { success: false, error: (error as Error).message };
        }
    }
};

export default marketplacePlans;
