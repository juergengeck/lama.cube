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
 * - AssemblyListener connects StoryFactory to Assembly creation
 * - JournalPlan provides Assembly queries for journal display
 */

import { StoryFactory } from '@refinio/refinio.api/plan-system';
import { AssemblyPlan, AssemblyListener, JournalPlan } from '@assembly/core';
import type { NodeOneCore } from './types/one-core.js';

let assemblyPlan: AssemblyPlan | null = null;
let storyFactory: StoryFactory | null = null;
let assemblyListener: AssemblyListener | null = null;
let journalPlan: JournalPlan | null = null;

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

    // Create adapter for storeVersionedObject
    // For AssemblyPlan: must include versionHash (which equals hash for versioned objects)
    // For StoryFactory: only needs hash and idHash (StoryFactory ignores versionHash)
    const storeVersionedObjectAdapter = async (obj: any) => {
        const result = await storeVersionedObject(obj);
        return {
            hash: result.hash,
            idHash: result.idHash,
            versionHash: result.hash // versionHash is the same as hash for versioned objects
        };
    };

    // Create adapter for getObjectByIdHash that returns the unwrapped object
    const getObjectByIdHashAdapter = async (idHash: any) => {
        const result = await getObjectByIdHash(idHash);
        return result.obj;
    };

    // Create adapter for getObject that returns the unwrapped object
    const getObjectAdapter = async (hash: any) => {
        const result = await getObject(hash);
        return result;
    };

    assemblyPlan = new AssemblyPlan({
        oneCore: nodeOneCore,
        storeVersionedObject: storeVersionedObjectAdapter,
        getObjectByIdHash: getObjectByIdHashAdapter,
        getObject: getObjectAdapter
    });
    storyFactory = new StoryFactory(storeVersionedObjectAdapter);

    console.log('[UnifiedPlanSystem] ✅ AssemblyPlan + StoryFactory initialized (Phase 1-2)');

    // Inject StoryFactory into existing Plans (Phase 3)
    await injectStoryFactoryIntoPlans(storyFactory);

    console.log('[UnifiedPlanSystem] ✅ Initialization complete (Phases 1-3)');

    // Phase 4: Journal-Assembly Integration
    // Create AssemblyListener to connect StoryFactory to Assembly creation
    assemblyListener = new AssemblyListener({
        storyFactory,
        assemblyPlan
    });

    // Initialize the listener to start listening to Story creation events
    assemblyListener.init();
    console.log('[UnifiedPlanSystem] ✅ AssemblyListener initialized and listening (Phase 4)');

    // Phase 5: Create JournalPlan for journal queries
    journalPlan = new JournalPlan({
        // getAllAssemblies: query all Assembly objects from storage
        // TODO: Implement proper querying once Assembly objects are being created
        // For now, return empty array as no Assemblies exist yet
        getAllAssemblies: async () => {
            // Future implementation will query all Assembly objects from ONE.core storage
            // This could use ObjectEventDispatcher or a custom query mechanism
            return [];
        },
        // getStory: retrieve Story by ID hash (use the adapter with type cast)
        getStory: async (idHash) => {
            return await getObjectByIdHashAdapter(idHash) as any;
        }
    });
    console.log('[UnifiedPlanSystem] ✅ JournalPlan created for journal queries (Phase 5)');

    console.log('[UnifiedPlanSystem] ✅ Full initialization complete (Phases 1-5)');

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
 * Get the initialized AssemblyListener
 */
export function getAssemblyListener(): AssemblyListener | null {
    return assemblyListener;
}

/**
 * Get the initialized JournalPlan
 */
export function getJournalPlan(): JournalPlan | null {
    return journalPlan;
}

/**
 * Shutdown the plan system
 */
export async function shutdownUnifiedPlanSystem(): Promise<void> {
    console.log('[UnifiedPlanSystem] Shutting down...');

    // Cleanup AssemblyListener
    if (assemblyListener) {
        assemblyListener.destroy();
        console.log('[UnifiedPlanSystem] AssemblyListener destroyed');
    }

    assemblyPlan = null;
    storyFactory = null;
    assemblyListener = null;
    journalPlan = null;

    console.log('[UnifiedPlanSystem] Shutdown complete');
}
