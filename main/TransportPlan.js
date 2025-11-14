/**
 * TransportPlan - Base class for transport implementations
 *
 * Provides common functionality for routing operations through plan registry.
 */

/**
 * Base Transport Plan
 *
 * Handles operation invocation, error formatting, and request tracking.
 */
export class TransportPlan {
    registry;
    config;
    requestCounter = 0;

    constructor(registry, config = {}) {
        this.registry = registry;
        this.config = config;
    }

    /**
     * Invoke an operation through the plan registry
     */
    async invokeOperation(operation, request, context, requestId) {
        try {
            // Extract auth context (transport-specific)
            const authContext = await this.extractAuthContext(context);

            // Log the invocation if in dev mode
            if (this.config.devMode) {
                console.log(`[Transport] Invoking: ${operation}`);
            }

            // Invoke through registry
            const result = await this.registry.invoke(operation, request, authContext);

            // Return success response
            return {
                success: true,
                requestId,
                operation,
                result
            };
        } catch (error) {
            // Return formatted error
            return this.formatError(error, requestId, operation);
        }
    }

    /**
     * Format error response
     */
    formatError(error, requestId, operation) {
        return {
            success: false,
            requestId,
            operation,
            error: {
                message: error.message,
                code: error.code || 'UNKNOWN_ERROR',
                stack: this.config.devMode ? error.stack : undefined
            }
        };
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req-${Date.now()}-${++this.requestCounter}`;
    }

    /**
     * Extract auth context from transport-specific context
     * (To be overridden by specific transport implementations)
     */
    async extractAuthContext(context) {
        // Default: dev mode with full access
        return {
            userId: 'dev-user',
            sessionId: 'dev-session',
            capabilities: ['*']
        };
    }

    /**
     * Start the transport (to be overridden)
     */
    async start() {
        throw new Error('start() must be implemented by transport');
    }

    /**
     * Stop the transport (to be overridden)
     */
    async stop() {
        throw new Error('stop() must be implemented by transport');
    }
}
