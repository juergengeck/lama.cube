/**
 * LLM Operations Adapter for lama.cube
 *
 * Wraps Electron IPC calls to provide LLMConfigOperations and AIOperations
 * interfaces expected by lama.ui components (ModelOnboarding, LLMSettings).
 *
 * This adapter follows the dependency injection pattern from POC-LLMSETTINGS-MIGRATION.md
 */

import type {
  LLMConfigOperations,
  AIOperations,
  ModelOption
} from '@lama/core/ui/types/llm'

/**
 * Create LLM config operations adapter for Electron IPC
 */
export function createLLMConfigOperations(): LLMConfigOperations {
  return {
    async getAllConfigs() {
      const response = await window.electronAPI.invoke('llm:getOllamaConfig', {})
      // TODO: This returns a single config, need to adapt to array
      // For now, return empty array if no config exists
      if (response.success && response.data) {
        return [{
          id: response.data.id || '',
          modelId: response.data.modelName || '',
          modelName: response.data.modelName || '',
          provider: 'ollama',
          systemPrompt: undefined,
          active: true,
          created: Date.now(),
          modified: Date.now(),
          encryptedApiKey: undefined
        }]
      }
      return []
    },

    async updateSystemPrompt(params) {
      // TODO: Implement when system prompt support is added to LLMConfigPlan
      console.warn('[LLMOperations] updateSystemPrompt not yet implemented')
    },

    async regenerateSystemPrompt(params) {
      // TODO: Implement when system prompt support is added
      console.warn('[LLMOperations] regenerateSystemPrompt not yet implemented')
      return { success: false, error: 'Not implemented' }
    },

    async updateApiKey(params) {
      // TODO: Implement when API key management is added
      console.warn('[LLMOperations] updateApiKey not yet implemented')
    },

    async testConnection(params) {
      const response = await window.electronAPI.invoke('llm:testOllamaConnection', {
        baseUrl: params.baseUrl,
        authToken: params.authToken
      })
      return {
        success: response.success,
        error: response.error,
        errorCode: response.errorCode,
        models: response.models  // Direct access - not wrapped in data
      }
    },

    async testConnectionAndDiscoverModels(params) {
      const response = await window.electronAPI.invoke('llm:testConnectionAndDiscoverModels', {
        server: params.server,
        authToken: params.authToken,
        serviceName: params.serviceName
      })
      return {
        success: response.success,
        version: response.version,
        error: response.error,
        errorCode: response.errorCode,
        models: response.models,
        needsSetup: response.needsSetup
      }
    },

    async getAvailableModels(params) {
      const response = await window.electronAPI.invoke('llm:getAvailableModels', {
        baseUrl: params?.baseUrl,
        authToken: params?.authToken
      })
      return {
        success: response.success,
        models: response.models,  // Direct access - not wrapped in data
        error: response.error,
        errorCode: response.errorCode
      }
    },

    async setConfig(params) {
      const response = await window.electronAPI.invoke('llm:setOllamaConfig', {
        modelType: params.modelType,
        modelName: params.modelName,
        baseUrl: params.server,  // Map 'server' to 'baseUrl' for IPC
        authToken: params.authToken,
        setAsActive: params.setAsActive,
        apiKey: params.apiKey
      })
      return {
        success: response.success,
        configHash: response.configHash,  // Direct access - not wrapped in data
        error: response.error,
        errorCode: response.errorCode
      }
    }
  }
}

/**
 * Create AI operations adapter for Electron IPC
 */
export function createAIOperations(): AIOperations {
  return {
    async setDefaultModel(modelId: string) {
      const success = await window.electronAPI.invoke('ai:setDefaultModel', { modelId })
      if (!success) {
        throw new Error('Failed to set default model')
      }
    },

    async getDefaultModel() {
      const result = await window.electronAPI.invoke('ai:getDefaultModel')
      // Handle wrapped response from IPC controller
      return result?.data !== undefined ? result.data : result
    }
  }
}

/**
 * Default model options for cloud/API providers
 * These complement the locally detected Ollama models
 */
export const CLOUD_MODEL_OPTIONS: ModelOption[] = [
  // Anthropic Models (2025)
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    size: 'Cloud',
    description: 'Best coding model. Strongest for complex agents and computer use.',
    requiresDownload: false,
    apiKey: true,
    provider: 'anthropic'
  },
  {
    id: 'claude-opus-4-1',
    name: 'Claude Opus 4.1',
    size: 'Cloud',
    description: 'Highest capability. Best for agentic tasks and advanced reasoning.',
    requiresDownload: false,
    apiKey: true,
    provider: 'anthropic'
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    size: 'Cloud',
    description: 'Fast and affordable. Similar coding to Sonnet 4 at 1/3 cost.',
    requiresDownload: false,
    apiKey: true,
    provider: 'anthropic'
  },

  // OpenAI Models (2025)
  {
    id: 'gpt-5',
    name: 'GPT-5',
    size: 'Cloud',
    description: 'OpenAI\'s most powerful reasoning model. Best for complex tasks.',
    requiresDownload: false,
    apiKey: true,
    provider: 'openai'
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    size: 'Cloud',
    description: 'Latest GPT-4 series. Excellent coding and 1M token context.',
    requiresDownload: false,
    apiKey: true,
    provider: 'openai'
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    size: 'Cloud',
    description: 'Latest reasoning model. Enhanced reasoning at lower cost.',
    requiresDownload: false,
    apiKey: true,
    provider: 'openai'
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    size: 'Cloud',
    description: 'Fast and affordable. Outperforms GPT-4o mini.',
    requiresDownload: false,
    apiKey: true,
    provider: 'openai'
  },

  // DeepSeek Models (2025)
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3.2',
    size: 'Cloud',
    description: 'Latest DeepSeek model. 50% cheaper with sparse attention.',
    requiresDownload: false,
    apiKey: true,
    provider: 'deepseek'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    size: 'Cloud',
    description: 'Advanced reasoning. Excellent for math and complex problems.',
    requiresDownload: false,
    apiKey: true,
    provider: 'deepseek'
  },

  // Qwen Models (2025)
  {
    id: 'qwen-max',
    name: 'Qwen3 Max',
    size: 'Cloud',
    description: 'Latest Qwen flagship. Most capable multilingual model.',
    requiresDownload: false,
    apiKey: true,
    provider: 'qwen'
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    size: 'Cloud',
    description: 'Fast and affordable. Good for general tasks.',
    requiresDownload: false,
    apiKey: true,
    provider: 'qwen'
  }
]
