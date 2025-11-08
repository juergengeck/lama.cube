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
 */

import { PlanRegistry } from '@refinio/api/plan-system';
import { IPCTransportPlan } from '@refinio/api/transports/IPCTransportPlan.js';
import { ExportPlanSimple } from '@chat/core/plans/ExportPlanSimple.js';
import type { NodeOneCore } from './types/one-core.js';

let planRegistry: PlanRegistry | null = null;
let ipcTransport: IPCTransportPlan | null = null;

/**
 * Initialize the Unified Plan System with real ONE.core instance
 *
 * Called after nodeOneCore is provisioned and ready.
 */
export async function initializeUnifiedPlanSystem(nodeOneCore: NodeOneCore): Promise<{
    registry: PlanRegistry;
    transport: IPCTransportPlan;
}> {
    console.log('[UnifiedPlanSystem] Initializing with ONE.core...');

    // Create PlanRegistry
    planRegistry = new PlanRegistry({
        devMode: process.env.NODE_ENV !== 'production'
    });

    console.log('[UnifiedPlanSystem] Registry created');

    // Register ExportPlan with real dependencies
    const exportPlan = new ExportPlanSimple(nodeOneCore);

    planRegistry.register({
        domain: 'chat',
        method: 'exportHistory',
        plan: exportPlan,
        version: '1.0.0',
        description: 'Export chat history in various formats (JSON, Markdown, HTML)',
        requiredCapability: 'chat:export'
    });

    console.log('[UnifiedPlanSystem] Registered operations:');
    const operations = planRegistry.list();
    operations.forEach(op => {
        console.log(`  - ${op.operation} (v${op.version}): ${op.description}`);
    });

    // Create IPC transport
    ipcTransport = new IPCTransportPlan(planRegistry, {
        channel: 'plan:invoke'
    });

    // Start IPC transport
    await ipcTransport.start();

    console.log('[UnifiedPlanSystem] IPC transport started on channel: plan:invoke');
    console.log('[UnifiedPlanSystem] Initialization complete');

    return {
        registry: planRegistry,
        transport: ipcTransport
    };
}

/**
 * Get the initialized plan registry
 */
export function getPlanRegistry(): PlanRegistry | null {
    return planRegistry;
}

/**
 * Get the initialized IPC transport
 */
export function getIPCTransport(): IPCTransportPlan | null {
    return ipcTransport;
}

/**
 * Shutdown the plan system
 */
export async function shutdownUnifiedPlanSystem(): Promise<void> {
    console.log('[UnifiedPlanSystem] Shutting down...');

    if (ipcTransport) {
        await ipcTransport.stop();
        ipcTransport = null;
    }

    planRegistry = null;

    console.log('[UnifiedPlanSystem] Shutdown complete');
}
