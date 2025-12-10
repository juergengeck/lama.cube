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
import { getTextGenerationModels } from '@local/core';
import localModelsPlans from '../ipc/plans/local-models.js';

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

    // Discover local on-device models (Electron-specific)
    await this.discoverLocalModels(context.llmManager);

    console.log('[AIDiscoveryPlan] ✅ AI initialization complete (Electron)');

    return result;
  }

  /**
   * Discover and register installed local text-generation models
   */
  private async discoverLocalModels(llmManager: any): Promise<void> {
    console.log('[AIDiscoveryPlan] Discovering local on-device models...');

    try {
      // Get list of text-generation models from local.core registry
      const textGenModels = getTextGenerationModels();

      // Check which are installed using localModelsPlans
      const installedModels: Array<{
        id: string;
        name: string;
        sizeBytes: number;
        contextLength?: number;
        familyName?: string;
      }> = [];

      for (const model of textGenModels) {
        // Use localModelsPlans to check if model is installed
        const statusResult = await localModelsPlans.getStatus(
          { sender: { send: () => {} } } as any,
          { modelId: model.id }
        );

        if (statusResult.success && statusResult.data?.status === 'installed') {
          installedModels.push({
            id: model.id,
            name: model.name,
            sizeBytes: model.sizeBytes,
            contextLength: model.contextLength,
            familyName: model.familyName
          });
        }
      }

      if (installedModels.length === 0) {
        console.log('[AIDiscoveryPlan] No local text-generation models installed');
        return;
      }

      console.log(`[AIDiscoveryPlan] Found ${installedModels.length} installed local models`);

      // Register with LLMManager
      await llmManager.discoverLocalModels(installedModels);
    } catch (error) {
      console.warn('[AIDiscoveryPlan] Local model discovery failed (non-fatal):', error);
    }
  }
}
