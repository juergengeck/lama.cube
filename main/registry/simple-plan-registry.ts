/**
 * Simple Plan Registry for lama.cube
 *
 * Minimal implementation following ONE principles:
 * - Plan objects contain method and parameters
 * - Plans are evaluated and results stored in Story objects
 *
 * This is a temporary inline version until we fully migrate to refinio.api package.
 */

export interface StoryResult<T = any> {
  success: boolean;
  plan: {
    plan: string;
    method: string;
    params: any;
  };
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
  executionTime?: number;
}

export class SimplePlanRegistry {
  private plans = new Map<string, any>();

  register(name: string, plan: any) {
    this.plans.set(name, plan);
  }

  async execute<T = any>(planName: string, methodName: string, params?: any): Promise<StoryResult<T>> {
    const startTime = Date.now();
    const planTransaction = { plan: planName, method: methodName, params };

    try {
      const plan = this.plans.get(planName);
      if (!plan) {
        return {
          success: false,
          plan: planTransaction,
          error: { code: 'PLAN_NOT_FOUND', message: `Plan '${planName}' not found` },
          timestamp: Date.now(),
          executionTime: Date.now() - startTime
        };
      }

      const method = plan[methodName];
      if (typeof method !== 'function') {
        return {
          success: false,
          plan: planTransaction,
          error: { code: 'METHOD_NOT_FOUND', message: `Method '${methodName}' not found` },
          timestamp: Date.now(),
          executionTime: Date.now() - startTime
        };
      }

      const result = Array.isArray(params)
        ? await method.apply(plan, params)
        : await method.call(plan, params);

      return {
        success: true,
        plan: planTransaction,
        data: result,
        timestamp: Date.now(),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        plan: planTransaction,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        timestamp: Date.now(),
        executionTime: Date.now() - startTime
      };
    }
  }

  listPlans(): string[] {
    return Array.from(this.plans.keys());
  }

  proxy<T = any>(planName: string): T {
    const registry = this;
    return new Proxy({} as any, {
      get(_target, methodName: string) {
        return async (...args: any[]) => {
          const story = await registry.execute(planName, methodName, args);
          if (!story.success) {
            throw new Error(story.error?.message || 'Unknown error');
          }
          return story.data;
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
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      return await storeVersionedObject(obj);
    },
    async getObjectByIdHash(idHash: any) {
      const { getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      return await getObjectByIdHash(idHash);
    },
    async storeBlob(buffer: ArrayBuffer) {
      const { storeArrayBufferAsBlob } = await import('@refinio/one.core/lib/storage-blob.js');
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
    async createChannel(id: string) {
      return await deps.channelManager.createChannel(id);
    },
    async postToChannel(channelId: string, obj: any) {
      return await deps.channelManager.postToChannel(channelId, obj);
    },
    async listChannels() {
      return await deps.channelManager.getChannelInfos();
    }
  };

  // mcp.auth - MCP authentication operations
  const MCPAuthPlan = {
    async login(email: string, password: string) {
      // Delegate to the auth plan
      const { default: authPlans } = await import('../ipc/plans/auth.js');
      return await authPlans.login(null as any, { username: email, password });
    },
    async register(email: string, password: string) {
      const { default: authPlans } = await import('../ipc/plans/auth.js');
      return await authPlans.register(null as any, { username: email, password, email });
    },
    async logout() {
      const { default: authPlans } = await import('../ipc/plans/auth.js');
      return await authPlans.logout(null as any);
    },
    async checkAuth() {
      const { default: authPlans } = await import('../ipc/plans/auth.js');
      return await authPlans.checkAuth(null as any);
    }
  };

  registry.register('one.storage', OneStoragePlan);
  registry.register('one.leute', OneLeutePlan);
  registry.register('one.channels', OneChannelsPlan);
  registry.register('mcp.auth', MCPAuthPlan);

  return registry;
}
