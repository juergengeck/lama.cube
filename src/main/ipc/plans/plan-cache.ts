/**
 * Epoch-aware plan cache for IPC handlers.
 *
 * IPC plan files lazily create plan instances that hold references to
 * nodeOneCore's models. When nodeOneCore re-initializes (e.g. after data
 * clear), these cached plans become stale. This cache ties each plan
 * instance to nodeOneCore.initEpoch and automatically discards it when
 * the epoch changes.
 *
 * Usage:
 *   const cache = createPlanCache(() => new ChatPlan(nodeOneCore, ...));
 *   // In IPC handler:
 *   const plan = cache.get();  // creates or returns cached instance
 */

import nodeOneCore from '../../core/node-one-core.js';

export interface PlanCache<T> {
  /** Get the cached plan, creating a new one if stale or missing. */
  get(): T;
}

/**
 * Create an epoch-aware plan cache.
 * @param factory - called to create a fresh plan instance when cache is stale
 */
export function createPlanCache<T>(factory: () => T): PlanCache<T> {
  let cached: T | null = null;
  let cachedEpoch = -1;

  return {
    get(): T {
      if (!nodeOneCore.initialized) {
        throw new Error('NodeOneCore not initialized');
      }
      if (!cached || cachedEpoch !== nodeOneCore.initEpoch) {
        cached = factory();
        cachedEpoch = nodeOneCore.initEpoch;
      }
      return cached;
    }
  };
}
