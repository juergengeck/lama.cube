/**
 * Unified Plan System Integration for lama.cube
 *
 * Initializes the plan-based architecture with real ONE.core instance.
 * Coexists with existing IPC handlers during migration period.
 *
 * Architecture:
 * - PlanRegistry orchestrates all operations
 * - Plans are platform-agnostic business logic
 * - IPC transport bridges Electron renderer to plans
 * - Same plans work through HTTP, stdio, React Native (future)
 * - AssemblyPlan + StoryFactory for automatic audit trail
 */

import { StoryFactory } from '@refinio/refinio.api/plan-system';
import { AssemblyPlan } from '@assembly/core/plans/AssemblyPlan';
import type { NodeOneCore } from './types/one-core.js';

let assemblyPlan: AssemblyPlan | null = null;
let storyFactory: StoryFactory | null = null;

/**
 * Initialize the Unified Plan System with real ONE.core instance
 *
 * Called after nodeOneCore is provisioned and ready.
 */
export async function initializeUnifiedPlanSystem(nodeOneCore: NodeOneCore): Promise<{
    storyFactory: StoryFactory;
}> {
    console.log('[UnifiedPlanSystem] Initializing with ONE.core...');

    // Initialize AssemblyPlan + StoryFactory for audit trail (Phase 1-2)
    const { storeVersionedObject, getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { getObject } = await import('@refinio/one.core/lib/storage-unversioned-objects.js');

    // Create adapter for storeVersionedObject that includes versionHash
    const storeVersionedObjectAdapter = async (obj: any) => {
        const result = await storeVersionedObject(obj);
        return {
            ...result,
            versionHash: result.hash // versionHash is the same as hash for versioned objects
        };
    };

    assemblyPlan = new AssemblyPlan({
        oneCore: nodeOneCore,
        storeVersionedObject: storeVersionedObjectAdapter,
        getObjectByIdHash,
        getObject
    });
    storyFactory = new StoryFactory(assemblyPlan as any);

    console.log('[UnifiedPlanSystem] ✅ AssemblyPlan + StoryFactory initialized (Phase 1-2)');

    // Inject StoryFactory into existing Plans (Phase 3)
    await injectStoryFactoryIntoPlans(storyFactory);

    console.log('[UnifiedPlanSystem] ✅ Initialization complete (Phases 1-3)');

    return {
        storyFactory: storyFactory
    };
}

/**
 * Inject StoryFactory into all existing Plan instances
 * Called after unified plan system initialization
 */
async function injectStoryFactoryIntoPlans(factory: StoryFactory): Promise<void> {
    console.log('[UnifiedPlanSystem] Injecting StoryFactory into Plans...');

    try {
        // Import IPC plan modules (they export chatPlan, contactsPlan, etc.)
        const chatModule = await import('./ipc/plans/chat.js');
        const contactsModule = await import('./ipc/plans/contacts.js');
        const connectionModule = await import('./ipc/plans/connection.js');

        // Inject StoryFactory into each Plan
        if (chatModule.chatPlan && typeof chatModule.chatPlan.setStoryFactory === 'function') {
            chatModule.chatPlan.setStoryFactory(factory);
            console.log('[UnifiedPlanSystem] ✅ StoryFactory injected into ChatPlan');
        }

        if (contactsModule.contactsPlan && typeof contactsModule.contactsPlan.setStoryFactory === 'function') {
            contactsModule.contactsPlan.setStoryFactory(factory);
            console.log('[UnifiedPlanSystem] ✅ StoryFactory injected into ContactsPlan');
        }

        if (connectionModule.connectionPlan && typeof connectionModule.connectionPlan.setStoryFactory === 'function') {
            connectionModule.connectionPlan.setStoryFactory(factory);
            console.log('[UnifiedPlanSystem] ✅ StoryFactory injected into ConnectionPlan');
        }

        console.log('[UnifiedPlanSystem] StoryFactory injection complete');
    } catch (error) {
        console.error('[UnifiedPlanSystem] Failed to inject StoryFactory:', error);
        // Don't throw - this is optional functionality (gradual adoption)
    }
}


/**
 * Get the initialized StoryFactory
 */
export function getStoryFactory(): StoryFactory | null {
    return storyFactory;
}

/**
 * Get the initialized AssemblyPlan
 */
export function getAssemblyPlan(): AssemblyPlan | null {
    return assemblyPlan;
}

/**
 * Shutdown the plan system
 */
export async function shutdownUnifiedPlanSystem(): Promise<void> {
    console.log('[UnifiedPlanSystem] Shutting down...');

    assemblyPlan = null;
    storyFactory = null;

    console.log('[UnifiedPlanSystem] Shutdown complete');
}
