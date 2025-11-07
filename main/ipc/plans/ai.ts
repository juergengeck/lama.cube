/**
 * AI IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to AIAssistantHandler methods.
 * Uses the refactored AIAssistantHandler from nodeOneCore.aiAssistantModel
 */

import nodeOneCore from '../../core/node-one-core.js';
import llmManager from '../../services/llm-manager-singleton.js';
import { mcpManager } from '@mcp/core';
import type { IpcMainInvokeEvent } from 'electron';
import electron from 'electron';
const { BrowserWindow } = electron;

/**
 * Get the AIAssistantHandler from nodeOneCore
 * This uses the refactored architecture with platform abstraction
 */
function getAIHandler() {
  if (!nodeOneCore.aiAssistantModel) {
    throw new Error('AI Assistant Handler not initialized - ONE.core not provisioned');
  }
  return nodeOneCore.aiAssistantModel;
}

/**
 * Thin IPC adapter - maps ipcMain.handle() calls to handler methods
 */
const aiHandlers = {
  /**
   * Chat with AI (with streaming support)
   */
  async chat(
    event: IpcMainInvokeEvent,
    { messages, modelId, stream = false, topicId }: {
      messages: Array<{ role: string; content: string }>;
      modelId?: string;
      stream?: boolean;
      topicId?: string;
    }
  ) {
    // Delegate to llmManager for chat operations
    if (!modelId) {
      return { success: false, error: 'Model ID is required' };
    }

    try {
      // Build options object
      const options: any = {
        onStream: stream ? (chunk: string) => {
          event.sender.send('ai:stream', { chunk, topicId });
        } : undefined
      };

      // Inject API key for Claude models
      if (modelId.startsWith('claude:')) {
        try {
          const settingsModule = await import('./user-settings.js');
          const handlers = settingsModule.default(nodeOneCore);
          const apiKey = await handlers['settings:getApiKey'](event, { provider: 'anthropic' });
          if (apiKey) {
            options.apiKey = apiKey;
          } else {
            return { success: false, error: 'Claude API key not configured. Please add your Anthropic API key in settings.' };
          }
        } catch (error: any) {
          console.error('[AI IPC] Failed to retrieve Claude API key:', error);
          return { success: false, error: 'Failed to retrieve API key from settings' };
        }
      }

      const response = await llmManager.chat(messages, modelId, options);

      return {
        success: true,
        data: {
          response: response,
          modelId: modelId,
          streamed: stream
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available AI models
   */
  async getModels(event: IpcMainInvokeEvent) {
    try {
      const models = llmManager.getAvailableModels();

      return {
        success: true,
        data: {
          models: models.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description || '',
            provider: m.provider,
            modelType: m.modelType || 'unknown',
            capabilities: m.capabilities || [],
            contextLength: m.contextLength || 0,
            size: m.size || 0,
            isLoaded: m.isLoaded || false,
            isDefault: m.isDefault || false
          }))
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Set default AI model
   * Note: LLMManager doesn't have default model concept, so this just validates the model exists
   */
  async setDefaultModel(
    event: IpcMainInvokeEvent,
    { modelId }: { modelId: string }
  ) {
    try {
      console.log(`[AI IPC] Setting default model: ${modelId}`);
      const handler = getAIHandler();
      await handler.setDefaultModel(modelId);
      console.log(`[AI IPC] ✅ Default model set successfully: ${modelId}`);
      return true;
    } catch (error: any) {
      console.error('[AI IPC] ❌ setDefaultModel error:', error);
      console.error('[AI IPC] ❌ Error stack:', error.stack);
      return false;
    }
  },

  /**
   * Set API key for a provider
   * DEPRECATED: Use 'settings:setApiKey' instead for proper UserSettings integration
   *
   * This method now delegates to settings:setApiKey for backward compatibility
   */
  async setApiKey(
    event: IpcMainInvokeEvent,
    { provider, apiKey }: { provider: string; apiKey: string }
  ) {
    try {
      // Delegate to settings:setApiKey for proper UserSettings storage
      const settingsModule = await import('./user-settings.js');
      const handlers = settingsModule.default(nodeOneCore);
      await handlers['settings:setApiKey'](event, { provider, apiKey });
      return { success: true };
    } catch (error: any) {
      console.error('[AI IPC] setApiKey failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available MCP tools
   */
  async getTools(event: IpcMainInvokeEvent) {
    try {
      const tools = llmManager.mcpTools;
      return {
        success: true,
        tools: Array.from(tools.values())
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Execute an MCP tool
   */
  async executeTool(
    event: IpcMainInvokeEvent,
    { toolName, parameters }: { toolName: string; parameters: any }
  ) {
    try {
      const result = await mcpManager.executeTool(toolName, parameters, {});
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Initialize LLM manager
   */
  async initializeLLM(event: IpcMainInvokeEvent) {
    try {
      await llmManager.init();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Debug MCP tools registration
   */
  async debugTools(event: IpcMainInvokeEvent) {
    return {
      success: true,
      toolCount: llmManager.mcpTools.size,
      tools: Array.from(llmManager.mcpTools.keys())
    };
  },

  /**
   * Get or create AI contact for a model
   */
  async getOrCreateContact(
    event: IpcMainInvokeEvent,
    { modelId }: { modelId: string }
  ) {
    try {
      const handler = getAIHandler();
      const personId = await handler.ensureAIContactForModel(modelId);
      return { success: true, data: { personId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Test an API key with the provider
   */
  async testApiKey(
    event: IpcMainInvokeEvent,
    { provider, apiKey }: { provider: string; apiKey: string }
  ) {
    // TODO: Implement API key testing for each provider
    return { success: true, valid: true };
  },

  /**
   * Get the default model ID from AI settings
   */
  'ai:getDefaultModel': async (event: IpcMainInvokeEvent): Promise<string | null> => {
    try {
      // Get from AIAssistantHandler which loads from AISettingsManager
      if (nodeOneCore.aiAssistantModel?.getDefaultModel) {
        const model = nodeOneCore.aiAssistantModel.getDefaultModel();
        if (model) {
          // Model can be string or object with id property
          const modelId = typeof model === 'string' ? model : model.id;
          // CRITICAL: Return null if modelId is undefined or empty
          // This ensures ModelOnboarding shows when no model is configured
          return modelId || null;
        }
      }
      return null;
    } catch (error: any) {
      console.error('[AI IPC] Error getting default model:', error);
      return null;
    }
  },


  /**
   * Discover Claude models from Anthropic API
   * Called after API key is saved to dynamically register available models
   */
  async discoverClaudeModels(
    event: IpcMainInvokeEvent,
    params?: { apiKey?: string }
  ) {
    try {
      let apiKey = params?.apiKey;

      // If no API key provided, try to get from UserSettings
      if (!apiKey) {
        try {
          const settingsModule = await import('./user-settings.js');
          const handlers = settingsModule.default(nodeOneCore);
          apiKey = await handlers['settings:getApiKey'](event, { provider: 'anthropic' });
        } catch (error) {
          console.log('[AI IPC] No stored API key found for anthropic');
        }
      }

      // Pass API key to discover models
      await llmManager.discoverClaudeModels(apiKey);

      // Get discovered Claude models to return to UI
      const allModels = llmManager.getModels();
      const claudeModels = allModels.filter((m: any) => m.provider === 'anthropic');

      return {
        success: true,
        data: {
          models: claudeModels
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if a topic is an AI topic
   */
  async isAITopic(
    event: IpcMainInvokeEvent,
    { topicId }: { topicId: string }
  ) {
    try {
      const handler = getAIHandler();
      const isAI = handler.isAITopic(topicId);
      return { success: true, isAI };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if a person is an AI contact
   */
  async isAIPerson(
    event: IpcMainInvokeEvent,
    { personId }: { personId: string }
  ) {
    try {
      const handler = getAIHandler();
      const isAI = handler.isAIPerson(personId);
      return { success: true, isAI };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get model ID for a topic
   */
  async getModelIdForTopic(
    event: IpcMainInvokeEvent,
    { topicId }: { topicId: string }
  ) {
    try {
      const handler = getAIHandler();
      const modelId = handler.getModelIdForTopic(topicId);
      return { success: true, modelId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get model ID for a person ID
   */
  async getModelIdForPersonId(
    event: IpcMainInvokeEvent,
    { personId }: { personId: string }
  ) {
    try {
      const handler = getAIHandler();
      const modelId = handler.getModelIdForPersonId(personId);
      return { success: true, modelId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all AI contacts
   */
  async getAllContacts(event: IpcMainInvokeEvent) {
    try {
      const handler = getAIHandler();
      const contacts = handler.getAllContacts();
      return { success: true, contacts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Process a message in an AI topic
   * Generates AI response with keyword/subject extraction
   */
  async processMessage(
    event: IpcMainInvokeEvent,
    { topicId, message, senderId }: { topicId: string; message: string; senderId: string }
  ) {
    try {
      const handler = getAIHandler();
      const response = await handler.processMessage(topicId, message, senderId);
      return { success: true, response };
    } catch (error: any) {
      console.error('[AI IPC] processMessage error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Stop streaming for a specific topic
   */
  async stopStreaming(
    event: IpcMainInvokeEvent,
    { topicId }: { topicId: string }
  ) {
    try {
      const cancelled = llmManager.stopStreaming(topicId);
      return { success: true, cancelled };
    } catch (error: any) {
      console.error('[AI IPC] stopStreaming error:', error);
      return { success: false, error: error.message };
    }
  }
};

export default aiHandlers;
