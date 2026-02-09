/**
 * Simple Plan Registry for lama.cube
 *
 * Minimal implementation following ONE principles:
 * - Plan objects contain method and parameters
 * - Plans are evaluated and results captured in ExecutionResult
 *
 * This is a temporary inline version until we fully migrate to refinio.api package.
 */

import { storeVersionedObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { storeArrayBufferAsBlob } from '@refinio/one.core/lib/storage-blob.js';
import type { IpcMainInvokeEvent } from 'electron';
import authPlans from '../ipc/plans/auth.js';

/**
 * Execution Result - Plan + Product
 * On error, execute() throws - no error property needed.
 */
export interface ExecutionResult<T = any> {
  plan: {
    plan: string;
    method: string;
    params: any;
  };
  product: T;
  timestamp: number;
  executionTime?: number;
}

export class SimplePlanRegistry {
  private plans = new Map<string, any>();

  register(name: string, plan: any) {
    this.plans.set(name, plan);
  }

  async execute<T = any>(planName: string, methodName: string, params?: any): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const planTransaction = { plan: planName, method: methodName, params };

    const plan = this.plans.get(planName);
    if (!plan) {
      throw new Error(`Plan '${planName}' not found`);
    }

    const method = plan[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Method '${methodName}' not found on plan '${planName}'`);
    }

    const result = Array.isArray(params)
      ? await method.apply(plan, params)
      : await method.call(plan, params);

    return {
      plan: planTransaction,
      product: result,
      timestamp: Date.now(),
      executionTime: Date.now() - startTime
    };
  }

  listPlans(): string[] {
    return Array.from(this.plans.keys());
  }

  proxy<T = any>(planName: string): T {
    const registry = this;
    return new Proxy({} as any, {
      get(_target, methodName: string) {
        return async (...args: any[]) => {
          const result = await registry.execute(planName, methodName, args);
          return result.product;
        };
      }
    }) as T;
  }
}

/**
 * Create and initialize Plan Registry with ONE Plans
 */
export function createSimplePlanRegistry(deps: { leuteModel: any; channelManager: any }): SimplePlanRegistry {
  const registry = new SimplePlanRegistry();

  // Register ONE Plans with actual implementations
  // These will be minimal wrappers around existing NodeOneCore methods

  // one.storage - Storage operations
  const OneStoragePlan = {
    async storeVersionedObject(obj: any) {
      return await storeVersionedObject(obj);
    },
    async getObjectByIdHash(idHash: any) {
      return await getObjectByIdHash(idHash);
    },
    async storeBlob(buffer: ArrayBuffer) {
      return await storeArrayBufferAsBlob(buffer);
    }
  };

  // one.leute - Identity and contacts
  const OneLeutePlan = {
    async getOwnIdentity() {
      const me = await deps.leuteModel.me();
      return await me.mainIdentity();
    },
    async getContacts() {
      return await deps.leuteModel.others();
    }
  };

  // one.channels - Channel management
  const OneChannelsPlan = {
    async createChannel(participants: any[], owner?: any) {
      return await deps.channelManager.createChannel(participants, owner);
    },
    async postToChannel(participantsHash: any, obj: any, owner?: any) {
      return await deps.channelManager.postToChannel(participantsHash, obj, owner);
    },
    async listChannels() {
      return await deps.channelManager.getChannelInfos();
    }
  };

  // mcp.auth - MCP authentication operations
  // Auth plans require an IpcMainInvokeEvent but MCP calls don't have one.
  // Pass null with a cast since auth plans don't use the event parameter.
  const nullEvent = null as unknown as IpcMainInvokeEvent;
  const MCPAuthPlan = {
    async login(email: string, password: string) {
      return await authPlans.login(nullEvent, { username: email, password });
    },
    async register(email: string, password: string) {
      return await authPlans.register(nullEvent, { username: email, password, email });
    },
    async logout() {
      return await authPlans.logout(nullEvent);
    },
    async checkAuth() {
      return await authPlans.checkAuth(nullEvent);
    }
  };

  registry.register('one.storage', OneStoragePlan);
  registry.register('one.leute', OneLeutePlan);
  registry.register('one.channels', OneChannelsPlan);
  registry.register('mcp.auth', MCPAuthPlan);

  return registry;
}
