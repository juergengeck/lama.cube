/**
 * AI IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to AIAssistantHandler methods.
 * Uses the refactored AIAssistantHandler from nodeOneCore.aiAssistantModel
 */

import nodeOneCore from '../../core/node-one-core.js';
import llmManager from '../../services/llm-manager-singleton.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Topic } from '@refinio/one.models/lib/recipes/ChatRecipes.js';
import { mcpManager } from '@mcp/core/local';
import type { IpcMainInvokeEvent } from 'electron';
import electron from 'electron';
import localModelsPlans from './local-models.js';
import { AICreationService, type CreationContext } from '@lama/core/services/AICreateService.js';
import { CreationContextCollector, NodeCreationContextProvider } from '@lama/core/services/CreateContextCollector.js';
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
 * Thin IPC adapter - maps ipcMain.handle() calls to plan methods
 */
const aiPlans = {
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
    console.log('[AI IPC] ========== CHAT REQUEST ==========');
    console.log('[AI IPC] Received chat request');
    console.log('[AI IPC]   modelId:', modelId);
    console.log('[AI IPC]   stream:', stream);
    console.log('[AI IPC]   topicId:', topicId);
    console.log('[AI IPC]   messages:', messages?.length || 0);
    console.log('[AI IPC] ==========================================');

    // Delegate to llmManager for chat operations
    if (!modelId) {
      console.log('[AI IPC] ❌ No model ID provided');
      return { success: false, error: 'Model ID is required' };
    }

    try {
      // Build options object
      const options: any = {
        onStream: stream ? (chunk: string) => {
          console.log('[AI IPC] 📤 Streaming chunk (length:', chunk.length, ')');
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
            console.log('[AI IPC] ❌ Claude API key not configured');
            return { success: false, error: 'Claude API key not configured. Please add your Anthropic API key in settings.' };
          }
        } catch (error: any) {
          console.error('[AI IPC] Failed to retrieve Claude API key:', error);
          return { success: false, error: 'Failed to retrieve API key from settings' };
        }
      }

      console.log('[AI IPC] 🚀 Calling llmManager.chat()...');
      const response = await llmManager.chat(messages, modelId, options);
      console.log('[AI IPC] ✅ Got response from llmManager (length:', typeof response === 'string' ? response.length : 'not a string', ')');

      return {
        success: true,
        data: {
          response: response,
          modelId: modelId,
          streamed: stream
        }
      };
    } catch (error: any) {
      console.log('[AI IPC] ❌ Chat error:', error.message);
      console.log('[AI IPC] ❌ Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available AI models (cloud/server + local on-device)
   * Auto-discovers Ollama and Claude models before returning
   */
  async getModels(event: IpcMainInvokeEvent) {
    try {
      // Auto-discover Ollama models
      console.log('[AI IPC] getModels: discovering Ollama models...');
      try {
        await llmManager.discoverOllamaModels();
        console.log('[AI IPC] getModels: Ollama discovery complete');
      } catch (err: any) {
        console.log('[AI IPC] getModels: Ollama discovery failed:', err.message);
      }

      // Auto-discover Claude models if API key is available
      try {
        const settingsModule = await import('./user-settings.js');
        const handlers = settingsModule.default(nodeOneCore);
        const apiKey = await handlers['settings:getApiKey'](event, { provider: 'anthropic' });
        if (apiKey) {
          console.log('[AI IPC] getModels: discovering Claude models...');
          await llmManager.discoverClaudeModels(apiKey);
          console.log('[AI IPC] getModels: Claude discovery complete');
        }
      } catch (err: any) {
        console.log('[AI IPC] getModels: Claude discovery skipped:', err.message);
      }

      // Get local text-gen models first - we need their IDs to filter storage results
      const localResult = await localModelsPlans.listTextGenModels(event);
      const localModels = (localResult.success && localResult.data) ? localResult.data : [];
      const localModelIds = new Set(localModels.map(m => m.id));
      console.log('[AI IPC] getModels: local models:', localModels.length);

      const allModelsFromStorage = await llmManager.getAvailableModels();
      console.log('[AI IPC] getModels: models from storage/registry:', allModelsFromStorage.length, allModelsFromStorage.map((m: any) => m.id));

      // Filter out on-device models from storage - we get them fresh from localModelsPlans
      // This prevents duplicates since local models are also stored in ONE.core
      // Also filter by provider to catch models stored with wrong/missing inferenceType
      // Also filter out any models whose ID matches a known local model ID (catches corrupted ollama entries)
      const cloudAndServerModels = allModelsFromStorage.filter(m =>
        m.inferenceType !== 'ondevice' &&
        m.modelType !== 'ondevice' &&
        m.provider !== 'local-onnx' &&
        m.provider !== 'onnx' &&
        m.provider !== 'transformers' &&
        !localModelIds.has(m.id) // filter out any model with same ID as local model
      );

      // Get text-gen status to know which model is loaded
      const statusResult = await localModelsPlans.getTextGenStatus(event);
      const loadedModelId = statusResult.success ? statusResult.data?.modelId : null;

      // Filter to only available (installed/ready/loaded) local models
      const availableLocalModels = localModels.filter(m =>
        m.status === 'installed' || m.status === 'ready' || m.id === loadedModelId
      );

      // Map local models to the same format as cloud models
      // Note: Model IDs no longer use 'local:' prefix - routing is handled by LLM inferenceType field
      const localModelsFormatted = availableLocalModels.map(m => ({
        id: m.id,
        name: m.name,
        description: `On-device ${m.familyName || 'ONNX'} model`,
        provider: 'local-onnx',
        server: 'local',
        inferenceType: 'ondevice' as const,
        modelType: 'ondevice' as const,
        capabilities: ['chat', 'text-generation'],
        contextLength: m.contextLength || 2048,
        maxTokens: m.contextLength || 2048,
        size: m.sizeBytes || 0,
        isLoaded: m.id === loadedModelId,
        isDefault: false
      }));

      const allModels = [
        // Local on-device models first
        ...localModelsFormatted,
        // Then cloud/server models (on-device filtered out above)
        ...cloudAndServerModels.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description || '',
          provider: m.provider,
          server: m.server || '',
          inferenceType: m.inferenceType || 'cloud',
          modelType: m.modelType || 'unknown',
          capabilities: m.capabilities || [],
          contextLength: m.contextLength || 0,
          maxTokens: m.maxTokens || 0,
          size: m.size || 0,
          isLoaded: m.isLoaded || false,
          isDefault: m.isDefault || false
        }))
      ];

      console.log('[AI IPC] getModels: returning', allModels.length, 'models:', allModels.map(m => `${m.id}(${m.provider})`));

      return {
        success: true,
        data: {
          models: allModels
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Set default AI model
   * Creates AI Person with optional custom name/email from AI creation flow
   */
  async setDefaultModel(
    event: IpcMainInvokeEvent,
    { modelId, displayName, email }: { modelId: string; displayName?: string; email?: string }
  ) {
    try {
      console.log(`[AI IPC] Setting default model: ${modelId}, displayName: ${displayName}, email: ${email}`);
      const handler = getAIHandler();
      await handler.setDefaultModel(modelId, displayName, email);
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
   * Returns null if model is not available (e.g., Claude without API key)
   */
  'ai:getDefaultModel': async (event: IpcMainInvokeEvent): Promise<string | null> => {
    try {
      let modelId: string | null = null;

      // Get from AIAssistantHandler which loads from AISettingsManager
      if (nodeOneCore.aiAssistantModel?.getDefaultModel) {
        const model = await nodeOneCore.aiAssistantModel.getDefaultModel();
        if (model) {
          // Model can be string or object with id property
          modelId = typeof model === 'string' ? model : model.id;
        }
      }

      // Fallback: Read directly from AISettingsManager if aiAssistantModel not available
      if (!modelId) {
        const { AISettingsManager } = await import('@lama/core/models/settings/AISettingsManager.js');
        const settingsManager = new AISettingsManager(nodeOneCore);
        const settings = await settingsManager.getSettings();
        if (settings?.defaultModelId) {
          console.log('[AI IPC] getDefaultModel fallback - found modelId:', settings.defaultModelId);
          modelId = settings.defaultModelId;
        }
      }

      // CRITICAL: Verify the model is actually available
      // If model was stored but is no longer available (e.g., Claude without API key),
      // return null so ModelOnboarding shows again
      if (modelId) {
        const availableModels = await llmManager.getAvailableModels();
        const modelExists = availableModels.some((m: any) => m.id === modelId || m.modelId === modelId);
        if (!modelExists) {
          console.log(`[AI IPC] getDefaultModel: stored model ${modelId} not available, returning null`);
          return null;
        }
      }

      return modelId || null;
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
      const allModels = await llmManager.getAvailableModels();
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
   * Discover Ollama models from local Ollama instance
   * Called after Ollama config is saved to dynamically register available models
   */
  async discoverOllamaModels(
    event: IpcMainInvokeEvent,
    params?: { serverUrl?: string }
  ) {
    try {
      // Discover and register Ollama models
      await llmManager.discoverOllamaModels();

      // Get discovered Ollama models to return to UI
      const allModels = await llmManager.getAvailableModels();
      const ollamaModels = allModels.filter((m: any) => m.provider === 'ollama');

      return {
        success: true,
        data: {
          models: ollamaModels
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
   * Get the AI Person ID for a topic
   * Used by UI to pass to switchAIModel()
   */
  async getAIPersonForTopic(
    event: IpcMainInvokeEvent,
    { topicId }: { topicId: string }
  ) {
    try {
      const handler = getAIHandler();
      const aiPersonId = handler.getAIPersonForTopic(topicId);
      return { success: true, aiPersonId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get the default AI Person ID
   * Used by UI to add AI to topics via chat:addParticipants
   */
  async getDefaultAIPersonId(event: IpcMainInvokeEvent) {
    try {
      const handler = getAIHandler();
      const aiPersonId = handler.getDefaultAIPersonId?.();
      if (!aiPersonId) {
        return { success: false, error: 'No default AI Person configured' };
      }
      return { success: true, aiPersonId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Switch the model for an AI Person
   */
  async switchAIModel(
    event: IpcMainInvokeEvent,
    { aiPersonId, modelId }: { aiPersonId: string; modelId: string }
  ) {
    try {
      const handler = getAIHandler();
      await handler.switchAIModel(aiPersonId as any, modelId);
      console.log(`[AI IPC] Switched AI ${aiPersonId.substring(0, 8)}... to model ${modelId}`);

      // Emit event to notify UI that AI model changed
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send('ai:modelChanged', { aiPersonId, modelId });
      }

      return { success: true };
    } catch (error: any) {
      console.error('[AI IPC] Failed to switch AI model:', error);
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
  },

  /**
   * Set AI response length (in tokens)
   */
  async setResponseLength(
    event: IpcMainInvokeEvent,
    { maxTokens }: { maxTokens: number }
  ) {
    try {
      const handler = getAIHandler();
      await handler.setResponseLength(maxTokens);
      console.log(`[AI IPC] Response length set to ${maxTokens} tokens`);
      return { success: true };
    } catch (error: any) {
      console.error('[AI IPC] setResponseLength error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get AI response length (in tokens)
   */
  async getResponseLength(event: IpcMainInvokeEvent) {
    try {
      const handler = getAIHandler();
      const maxTokens = await handler.getResponseLength();
      return { success: true, data: maxTokens };
    } catch (error: any) {
      console.error('[AI IPC] getResponseLength error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set AI settings for a specific AI participant in a topic
   * Updates Topic.aiParticipants with the new setting value
   */
  async setAISettings(
    event: IpcMainInvokeEvent,
    { topicId, aiPersonId, setting, enabled }: {
      topicId: string;
      aiPersonId: string;
      setting: 'analyse' | 'respond' | 'mute' | 'ignore';
      enabled: boolean;
    }
  ) {
    try {
      console.log(`[AI IPC] setAISettings: topicId=${topicId}, aiPersonId=${aiPersonId.substring(0, 8)}..., ${setting}=${enabled}`);

      // Get TopicModel from nodeOneCore
      const topicModel = nodeOneCore.topicModel;
      if (!topicModel) {
        return { success: false, error: 'TopicModel not initialized' };
      }

      // Find the topic (topicId is stored as string but is actually SHA256IdHash)
      const topic = await topicModel.findTopic(topicId as SHA256IdHash<Topic>);
      if (!topic) {
        return { success: false, error: `Topic not found: ${topicId}` };
      }

      // Initialize aiParticipants if it doesn't exist
      if (!topic.aiParticipants) {
        topic.aiParticipants = new Map();
      }

      // Get or create settings for this AI participant
      let aiSettings = topic.aiParticipants.get(aiPersonId as any);
      if (!aiSettings) {
        aiSettings = {
          analyse: true,  // Default: run analytics
          respond: false, // Default: don't respond (unless first AI)
          mute: false,
          ignore: false,
          joinedAt: Date.now()
        };
      }

      // Update the specific setting
      aiSettings[setting] = enabled;

      // Store back in the map
      topic.aiParticipants.set(aiPersonId as any, aiSettings);

      // Store updated topic as new version using storeVersionedObject
      // Topic identity is (participants, originalName) - use correct property names
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      await storeVersionedObject({
        $type$: 'Topic',
        participants: topic.participants,
        originalName: topic.originalName,
        channel: topic.channel,
        displayName: topic.displayName,
        aiParticipants: topic.aiParticipants
      });

      console.log(`[AI IPC] ✅ AI settings updated: ${setting}=${enabled} for AI ${aiPersonId.substring(0, 8)}... in topic ${topicId.substring(0, 8)}...`);

      // Notify UI of settings change
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send('ai:settingsChanged', { topicId, aiPersonId, setting, enabled });
      }

      return { success: true };
    } catch (error: any) {
      console.error('[AI IPC] setAISettings error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Generate AI name
   * Called on first launch to create AI identity
   * @param modelId - Model ID to use for name generation (user's selected model)
   * @param _provider - Unused (LLM object's provider field is used from storage)
   */
  async generateAIName(
    event: IpcMainInvokeEvent,
    { modelId, provider: _provider }: { modelId: string; provider?: string }
  ): Promise<{
    success: boolean;
    data?: { name: string; email: string };
    error?: string;
  }> {
    console.log(`[AI IPC] Generating AI name with model: ${modelId}`);

    if (!modelId) {
      return {
        success: false,
        error: 'modelId is required - cannot generate name without selecting a model'
      };
    }

    try {
      // Collect context (device, locale, time)
      const contextProvider = new NodeCreationContextProvider();
      const contextCollector = new CreationContextCollector(contextProvider);
      const context = await contextCollector.collect();

      // On-device inference models (run locally, not through ONE.core storage)
      const isOnDeviceModel = modelId.startsWith('granite-');

      // Create service with llmManager chat wrapper
      // On-device models bypass storage; all others use storage (provider from LLM object)
      const creationService = new AICreationService(async (messages, reqModelId) => {
        let response: string;

        if (isOnDeviceModel) {
          // On-device models: bypass storage (local inference)
          response = await llmManager.chatLocalDirect(reqModelId, messages, { disableTools: true });
        } else {
          // All other models: use chat() which reads LLM object from storage
          // Provider is determined from the stored LLM object's provider field
          const result = await llmManager.chat(messages, reqModelId, { disableTools: true });
          if (typeof result === 'string') {
            response = result;
          } else if (result && typeof result === 'object' && 'content' in result) {
            response = (result as any).content || '';
          } else {
            response = JSON.stringify(result);
          }
        }

        return response;
      });

      // Generate name using the user's selected model
      const result = await creationService.generateName(context, modelId);

      console.log(`[AI IPC] AI name generated: ${result.name}`);

      return {
        success: true,
        data: {
          name: result.name,
          email: result.email
        }
      };
    } catch (error: any) {
      console.error('[AI IPC] Name generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

};

export default aiPlans;
