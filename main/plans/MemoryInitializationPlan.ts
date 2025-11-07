/**
 * Memory Initialization Plan (Thin Orchestrator)
 *
 * Electron-specific orchestrator for memory initialization.
 * Delegates business logic to memory.core, injects platform dependencies.
 *
 * Principles:
 * - Import plan from memory.core
 * - Inject Electron/Node-specific dependencies (path, setImmediate, etc.)
 * - Minimal glue code only
 */

import path from 'path';
import { MemoryServicesPlan } from '../../memory.core/dist/initialization/MemoryServicesPlan.js';
import type TopicAnalysisModel from '@lama/core/one-ai/models/TopicAnalysisModel.js';
import type ChannelManager from '@refinio/one.models/lib/models/ChannelManager.js';
import type TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';

export interface MemoryInitContext {
  channelManager: ChannelManager;
  topicModel: TopicModel;
  topicAnalysisModel: TopicAnalysisModel;
  nodeOneCore: any;
  llmManager: any;
  memoryStoragePath?: string;
}

export interface MemoryServices {
  memoryStoragePlan: any;
  fileStorageService: any;
  subjectPlan: any;
  chatMemoryPlan: any;
}

/**
 * Memory Initialization Plan
 * Thin Electron orchestrator - delegates to memory.core
 */
export class MemoryInitializationPlan {
  async execute(context: MemoryInitContext): Promise<MemoryServices> {
    console.log('[MemoryInitializationPlan] Orchestrating memory initialization (Electron)...');

    // Create plan with injected Electron/Node dependencies
    const plan = new MemoryServicesPlan({
      getStoragePath: () => {
        // Inject Node.js-specific path resolution
        return context.memoryStoragePath ||
          global.lamaConfig?.instance.memoryDirectory ||
          path.join(process.cwd(), 'memory');
      },
      setImmediate: (fn: () => Promise<void>) => {
        // Inject Node.js setImmediate
        setImmediate(fn);
      }
    });

    // Delegate to platform-agnostic plan
    const result = await plan.initialize(context);

    console.log('[MemoryInitializationPlan] ✅ Memory initialization complete (Electron)');

    return result;
  }
}
