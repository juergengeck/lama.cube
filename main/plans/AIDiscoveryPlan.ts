/**
 * AI Discovery Plan (Thin Orchestrator)
 *
 * Electron-specific orchestrator for AI initialization.
 * Delegates business logic to lama.core, injects platform dependencies.
 *
 * Principles:
 * - Import handler/plan from lama.core
 * - Inject Electron/Node-specific dependencies (process.env, etc.)
 * - Minimal glue code only
 */

import { AIInitializationPlan } from '@lama/core/ai/AIInitializationPlan.js';
import { UserSettingsManager } from '../core/user-settings-manager.js';
import { initializeAIAssistantHandler } from '../core/ai-assistant-handler-adapter.js';

export interface AIDiscoveryContext {
  nodeOneCore: any;
  llmManager: any;
  email: string;
  channelManager: any;
}

export interface AIServices {
  userSettingsManager: UserSettingsManager;
  aiAssistantModel: any;
  anthropicApiKey?: string;
}

/**
 * AI Discovery Plan
 * Thin Electron orchestrator - delegates to lama.core
 */
export class AIDiscoveryPlan {
  async execute(context: AIDiscoveryContext): Promise<AIServices> {
    console.log('[AIDiscoveryPlan] Orchestrating AI initialization (Electron)...');

    // Create plan with injected Electron dependencies
    const plan = new AIInitializationPlan({
      storage: context.nodeOneCore,
      llmManager: context.llmManager,
      getEnvVar: (key: string) => process.env[key],  // Inject Node.js env access
      createUserSettingsManager: (storage: any, email: string) => {
        // Factory for UserSettingsManager
        return new UserSettingsManager(storage, email, storage.ownerId);
      },
      initializeAIAssistant: async (storage: any, llmManager: any) => {
        // Factory for AI Assistant
        return await initializeAIAssistantHandler(storage, llmManager);
      }
    });

    // Delegate to platform-agnostic plan
    const result = await plan.initialize({
      email: context.email,
      channelManager: context.channelManager
    });

    console.log('[AIDiscoveryPlan] ✅ AI initialization complete (Electron)');

    return result;
  }
}
