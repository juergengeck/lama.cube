/**
 * AI Discovery Plan (Thin Orchestrator)
 *
 * Electron-specific orchestrator for AI initialization.
 * Delegates business logic to lama.core, injects platform dependencies.
 *
 * Principles:
 * - Import handler from lama.core
 * - Inject Electron/Node-specific dependencies (process.env, etc.)
 * - Minimal glue code only
 */

import { AIInitializationHandler } from '@lama/core/ai/AIInitializationHandler.js';
import type { UserSettingsManager } from '../core/user-settings-manager.js';

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

    // Create handler with injected Electron dependencies
    const handler = new AIInitializationHandler({
      storage: context.nodeOneCore,
      llmManager: context.llmManager,
      getEnvVar: (key: string) => process.env[key]  // Inject Node.js env access
    });

    // Delegate to platform-agnostic handler
    const result = await handler.initialize({
      email: context.email,
      channelManager: context.channelManager
    });

    console.log('[AIDiscoveryPlan] ✅ AI initialization complete (Electron)');

    return result;
  }
}
