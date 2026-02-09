/**
 * GatedRegistry Setup for lama.cube
 *
 * Wraps the SimplePlanRegistry with access control in shadow mode.
 * Shadow mode logs all access decisions without enforcing them,
 * allowing monitoring before switching to enforcement.
 *
 * @example
 * ```typescript
 * import { setupGatedRegistry, getGatedRegistry } from './gated-registry-setup.js';
 *
 * // During initialization
 * const gatedRegistry = await setupGatedRegistry({
 *   planRegistry,
 *   myPersonId: ownerId,
 *   getCertIndex: () => certIndex
 * });
 *
 * // Later, get stats
 * console.log(gatedRegistry.getShadowSummary());
 * ```
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import type { SimplePlanRegistry } from './simple-plan-registry.js';

// Import GatedRegistry and TrustLevel from trust.core
import {
  GatedRegistry,
  type TrustLevel,
  type AccessChecker,
  type ShadowModeEvent,
  type ShadowModeListener
} from '@refinio/api/registry/GatedRegistry.js';

/** Singleton instance */
let gatedRegistryInstance: GatedRegistry | null = null;

/** Shadow mode event log file interval */
let logIntervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Configuration for GatedRegistry setup
 */
export interface GatedRegistrySetupConfig {
  /** The underlying plan registry to wrap */
  planRegistry: SimplePlanRegistry;

  /** Current user's person ID */
  myPersonId: SHA256IdHash<Person>;

  /** Optional: Get CertificateIndex for access checks */
  getCertIndex?: () => {
    hasTrustLevel(
      peer: SHA256IdHash<Person>,
      context: string,
      requiredLevel: TrustLevel
    ): Promise<boolean>;
  } | undefined;

  /** Enable shadow mode (default: true) */
  shadowMode?: boolean;

  /** Enable debug logging (default: true in development) */
  debug?: boolean;

  /** Log summary interval in ms (default: 60000 = 1 min) */
  logInterval?: number;
}

/**
 * Create a permissive access checker for shadow mode.
 *
 * This checker always returns true (grants access) but logs the check.
 * Used when no CertificateIndex is available yet.
 */
function createPermissiveChecker(): AccessChecker {
  return {
    async hasTrustLevel(
      peer: SHA256IdHash<Person>,
      context: string,
      requiredLevel: TrustLevel
    ): Promise<boolean> {
      // In shadow mode without cert index, always allow
      // The GatedRegistry will still emit events for monitoring
      console.log(
        `[GatedRegistry] Shadow check: ${peer.substring(0, 8)}... ` +
        `requires '${requiredLevel}' in ${context} → ALLOWED (no cert index)`
      );
      return true;
    }
  };
}

/**
 * Create an access checker that delegates to CertificateIndex.
 */
function createCertIndexChecker(
  getCertIndex: () => { hasTrustLevel: AccessChecker['hasTrustLevel'] } | undefined
): AccessChecker {
  return {
    async hasTrustLevel(
      peer: SHA256IdHash<Person>,
      context: string,
      requiredLevel: TrustLevel
    ): Promise<boolean> {
      const index = getCertIndex();
      if (!index) {
        // No index yet - allow in shadow mode
        return true;
      }
      return index.hasTrustLevel(peer, context, requiredLevel);
    }
  };
}

/**
 * Set up the GatedRegistry with shadow mode logging.
 *
 * This wraps the SimplePlanRegistry to add access control monitoring.
 * In shadow mode, all access is allowed but decisions are logged.
 */
export async function setupGatedRegistry(
  config: GatedRegistrySetupConfig
): Promise<GatedRegistry> {
  const {
    planRegistry,
    myPersonId,
    getCertIndex,
    shadowMode = true,
    debug = process.env.NODE_ENV !== 'production',
    logInterval = 60000
  } = config;

  console.log('[GatedRegistry] Setting up with shadow mode:', shadowMode);

  // Create access checker
  const accessChecker = getCertIndex
    ? createCertIndexChecker(getCertIndex)
    : createPermissiveChecker();

  // Adapt SimplePlanRegistry to PlanRegistry interface
  const planRegistryAdapter = {
    execute: planRegistry.execute.bind(planRegistry),
    register: planRegistry.register.bind(planRegistry),
    unregister: () => false, // SimplePlanRegistry doesn't support unregister
    getPlan: () => undefined, // SimplePlanRegistry doesn't expose plans
    hasPlan: (name: string) => planRegistry.listPlans().includes(name),
    listPlans: planRegistry.listPlans.bind(planRegistry)
  };

  // Create GatedRegistry
  // planRegistryAdapter adapts SimplePlanRegistry to GatedRegistry's PlanRegistry interface
  const gatedRegistry = new GatedRegistry(
    planRegistryAdapter as unknown as ConstructorParameters<typeof GatedRegistry>[0],
    accessChecker,
    myPersonId,
    {
      shadowMode,
      debug,
      maxRecentEvents: 200
    }
  );

  // Set up shadow mode event listener
  const unsubscribe = gatedRegistry.onShadowEvent((event: ShadowModeEvent) => {
    if (event.type === 'access_denied') {
      console.warn(
        `[GatedRegistry] 🚫 WOULD BLOCK: ${event.planName}.${event.methodName} ` +
        `for peer ${event.peer.substring(0, 8)}... ` +
        `(needs '${event.requiredTrustLevel}' trust level in ${event.requiredContext})`
      );
    }
  });

  // Set up periodic summary logging
  if (logInterval > 0) {
    logIntervalHandle = setInterval(() => {
      const stats = gatedRegistry.getShadowStats();
      if (stats.totalEvents > 0) {
        console.log('\n' + gatedRegistry.getShadowSummary() + '\n');
      }
    }, logInterval);
  }

  // Store singleton
  gatedRegistryInstance = gatedRegistry;

  console.log('[GatedRegistry] ✅ Shadow mode monitoring active');

  return gatedRegistry;
}

/**
 * Get the GatedRegistry instance.
 */
export function getGatedRegistry(): GatedRegistry | null {
  return gatedRegistryInstance;
}

/**
 * Add gates to the registry for specific plans.
 *
 * Call this after registering plans to add access control.
 */
export function addDefaultGates(gatedRegistry: GatedRegistry): void {
  // Chat operations require trusted level
  gatedRegistry.addGate('chat', 'sendMessage', {
    context: 'chat',
    requiredTrustLevel: 'trusted'
  });
  gatedRegistry.addGate('chat', 'createTopic', {
    context: 'chat',
    requiredTrustLevel: 'trusted'
  });

  // Storage operations require trusted level
  gatedRegistry.addGate('one.storage', 'storeVersionedObject', {
    context: '*',
    requiredTrustLevel: 'trusted'
  });

  // Channel operations
  gatedRegistry.addGate('one.channels', 'postToChannel', {
    context: 'channel',
    requiredTrustLevel: 'trusted'
  });

  // AI operations
  gatedRegistry.addGate('ai', 'generateResponse', {
    context: 'ai',
    requiredTrustLevel: 'trusted'
  });

  console.log('[GatedRegistry] Default gates added:', gatedRegistry.getStats().totalGates);
}

/**
 * Shutdown the GatedRegistry and clean up resources.
 */
export function shutdownGatedRegistry(): void {
  if (logIntervalHandle) {
    clearInterval(logIntervalHandle);
    logIntervalHandle = null;
  }

  if (gatedRegistryInstance) {
    // Log final summary
    const stats = gatedRegistryInstance.getShadowStats();
    if (stats.totalEvents > 0) {
      console.log('\n=== Final Shadow Mode Summary ===');
      console.log(gatedRegistryInstance.getShadowSummary());
    }
    gatedRegistryInstance = null;
  }

  console.log('[GatedRegistry] Shutdown complete');
}
