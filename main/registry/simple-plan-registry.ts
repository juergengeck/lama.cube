/**
 * Simple Plan Registry for lama.cube
 *
 * Minimal implementation following ONE principles:
 * - Plan objects contain method and parameters
 * - Plans are evaluated and results captured in ExecutionResult
 *
 * This is a temporary inline version until we fully migrate to refinio.api package.
 */

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
