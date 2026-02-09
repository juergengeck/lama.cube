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
import { ipcMain } from 'electron';
import { TransportPlan } from '../TransportPlan.js';
import { UnauthorizedError } from '../errors.js';
/**
 * IPC Transport Plan (Main Process)
 *
 * Registers IPC handlers and routes operations to plan registry.
 */
export class IPCTransportPlan extends TransportPlan {
    channel;
    getUserFromSession;
    running = false;
    constructor(registry, config = {}) {
        super(registry, config);
        this.channel = config.channel || 'plan:invoke';
        this.getUserFromSession = config.getUserFromSession;
    }
    /**
     * Start the IPC transport
     *
     * Registers universal IPC handler for all operations.
     */
    async start() {
        if (this.running) {
            throw new Error('IPC transport already running');
        }
        // Register universal handler
        ipcMain.handle(this.channel, async (event, operation, request) => {
            try {
                const requestId = this.generateRequestId();
                const response = await this.invokeOperation(operation, request, event, requestId);
                return response;
            }
            catch (error) {
                // This should not happen as invokeOperation catches everything,
                // but just in case...
                return this.formatError(error);
            }
        });
        this.running = true;
        console.log(`IPC transport started on channel: ${this.channel}`);
    }
    /**
     * Stop the IPC transport
     *
     * Removes IPC handlers.
     */
    async stop() {
        if (!this.running) {
            return;
        }
        ipcMain.removeHandler(this.channel);
        this.running = false;
        console.log('IPC transport stopped');
    }
    /**
     * Check if transport is running
     */
    isRunning() {
        return this.running;
    }
    /**
     * Extract auth context from Electron IPC event
     *
     * Uses the provided getUserFromSession function if available,
     * otherwise returns a default context (for development/testing).
     */
    async extractAuthContext(event) {
        if (this.getUserFromSession) {
            const user = await this.getUserFromSession(event);
            if (!user) {
                return null;
            }
            return {
                userId: user.userId,
                sessionId: user.sessionId,
                capabilities: user.capabilities
            };
        }
        // Development mode: allow all operations
        // In production, you MUST provide getUserFromSession
        if (this.config.devMode) {
            console.warn('IPC transport running without authentication (devMode)');
            return {
                userId: 'dev-user', // Cast for development
                sessionId: 'dev-session',
                capabilities: ['*'] // Full access in dev mode
            };
        }
        // Production mode without auth function: reject
        throw new UnauthorizedError('Authentication not configured');
    }
}
//# sourceMappingURL=IPCTransportPlan.js.map