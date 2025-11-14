/**
 * IPCTransportPlan - Electron IPC transport implementation
 *
 * Provides transport between Electron main process and renderer process
 * using ipcMain.handle() for the backend side.
 *
 * Key features:
 * - Single universal handler: 'plan:invoke'
 * - Extracts auth from Electron session
 * - Routes all operations through plan registry
 * - Formats responses for IPC protocol
 */
import type { IpcMainInvokeEvent } from 'electron';
import { TransportPlan } from '../TransportPlan.js';
import type { TransportConfig } from '../TransportPlan.js';
import type { PlanRegistry } from '../PlanRegistry.js';
import type { AuthContext } from '../types/context.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
/**
 * IPC transport configuration
 */
export interface IPCTransportConfig extends TransportConfig {
    /**
     * IPC channel name for operation invocation
     */
    channel?: string;
    /**
     * Function to get authenticated user from session
     *
     * This should be provided by the Electron app to extract
     * the current user from the session/window context.
     */
    getUserFromSession?: (event: IpcMainInvokeEvent) => Promise<{
        userId: SHA256IdHash<Person>;
        sessionId: string;
        capabilities: string[];
    } | null>;
}
/**
 * IPC Transport Plan (Main Process)
 *
 * Registers IPC handlers and routes operations to plan registry.
 */
export declare class IPCTransportPlan extends TransportPlan {
    private channel;
    private getUserFromSession?;
    private running;
    constructor(registry: PlanRegistry, config?: IPCTransportConfig);
    /**
     * Start the IPC transport
     *
     * Registers universal IPC handler for all operations.
     */
    start(): Promise<void>;
    /**
     * Stop the IPC transport
     *
     * Removes IPC handlers.
     */
    stop(): Promise<void>;
    /**
     * Check if transport is running
     */
    isRunning(): boolean;
    /**
     * Extract auth context from Electron IPC event
     *
     * Uses the provided getUserFromSession function if available,
     * otherwise returns a default context (for development/testing).
     */
    protected extractAuthContext(event: IpcMainInvokeEvent): Promise<AuthContext | null>;
}
//# sourceMappingURL=IPCTransportPlan.d.ts.map