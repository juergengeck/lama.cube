/**
 * Electron-specific LLM Platform adapters
 * Implements interfaces from @lama/core/services/llm-platform
 */

import type { BrowserWindow } from 'electron';
import { ONNXTextGenerationProvider } from './local/ONNXTextGenerationProvider.js';
import { MODELS, getTextGenerationModels } from '@local/core';
import type { TextGenModelId, ChatMessage as LocalChatMessage } from '@local/core';

// Define interfaces locally (they're defined in lama.core but imports aren't working)
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LocalChatOptions {
  onStream?: (chunk: string) => void;
  temperature?: number;
  maxTokens?: number;
  format?: any;
  topicId?: string;
}

interface LLMPlatform {
  emitProgress(topicId: string, progress: number): void;
  emitError(topicId: string, error: Error): void;
  emitMessageUpdate(
    topicId: string,
    messageId: string,
    content: string | { thinking?: string; response: string; raw?: string },
    status: string,
    modelId?: string,
    modelName?: string
  ): void;
  emitStreamChunk?(data: { topicId: string; chunk: string; messageId?: string }): void;
  emitAnalysisUpdate?(topicId: string, updateType: 'subjects' | 'keywords' | 'both'): void;
  emitThinkingUpdate?(topicId: string, messageId: string, thinkingContent: string): void;
  emitThinkingStatus?(topicId: string, status: string): void;
  // Local text generation methods
  chatWithLocal?(modelId: string, messages: ChatMessage[], options: LocalChatOptions): Promise<string>;
  isLocalModelLoaded?(modelId: string): boolean;
  loadLocalModel?(modelId: string, onProgress?: (progress: number) => void): Promise<void>;
  unloadLocalModel?(modelId: string): Promise<void>;
  getAvailableLocalModels?(): Promise<Array<{ id: string; name: string; size: number; installed: boolean }>>;
}

interface LLMConfigAdapter {
  ollamaValidator: {
    testOllamaConnection: (server: string, authToken?: string, serviceName?: string) => Promise<any>;
    fetchOllamaModels: (server: string, authToken?: string) => Promise<any[]>;
  };
  configManager: {
    encryptToken: (token: string) => string;
    decryptToken: (encrypted: string) => string;
    computeBaseUrl: (modelType: string, baseUrl?: string) => string;
    isEncryptionAvailable: () => boolean;
  };
}

/**
 * Electron LLM Platform - uses BrowserWindow.webContents.send() to emit events
 */
export class ElectronLLMPlatform implements LLMPlatform {
  private textGenProvider: ONNXTextGenerationProvider | null = null;
  private loadedModelId: string | null = null;
  private unloadTimeout: NodeJS.Timeout | null = null;
  private readonly UNLOAD_DELAY_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private getWindow: () => BrowserWindow | null) {}

  emitProgress(topicId: string, progress: number): void {
    const window = this.getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('llm:progress', { topicId, progress });
    }
  }

  emitError(topicId: string, error: Error): void {
    const window = this.getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('llm:error', { topicId, error: error.message });
    }
  }

  emitMessageUpdate(
    topicId: string,
    messageId: string,
    content: string | { thinking?: string; response: string; raw?: string },
    status: string,
    modelId?: string,
    modelName?: string
  ): void {
    const window = this.getWindow();
    if (window && !window.isDestroyed()) {
      // Emit streaming updates for real-time UI feedback
      window.webContents.send('llm:message-update', {
        topicId,
        messageId,
        content,
        status,
        modelId,
        modelName
      });

      // When complete, also emit chat:newMessages to trigger message list refresh
      // This unifies LLM messages with P2P messages for the UI
      if (status === 'complete') {
        window.webContents.send('chat:newMessages', {
          conversationId: topicId,
          source: 'llm'
        });
      }
    }
  }

  emitStreamChunk(data: { topicId: string; chunk: string; messageId?: string }): void {
    const window = this.getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('llm:stream-chunk', data);
    }
  }

  emitAnalysisUpdate(topicId: string, updateType: 'subjects' | 'keywords' | 'both'): void {
    const window = this.getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('llm:analysis-update', { topicId, updateType });
    }
  }

  emitThinkingUpdate(topicId: string, messageId: string, thinkingContent: string): void {
    const window = this.getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('llm:thinking-update', { topicId, messageId, thinkingContent });
    }
  }

  emitThinkingStatus(topicId: string, status: string): void {
    const window = this.getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('llm:thinking-status', { topicId, status });
    }
  }

  // --- Local Text Generation Methods ---

  /**
   * Reset the unload timeout (called after each chat to keep model loaded)
   */
  private resetUnloadTimeout(): void {
    if (this.unloadTimeout) {
      clearTimeout(this.unloadTimeout);
    }
    this.unloadTimeout = setTimeout(() => {
      console.log('[ElectronLLMPlatform] Unloading model due to inactivity');
      this.unloadLocalModel(this.loadedModelId!).catch(console.error);
    }, this.UNLOAD_DELAY_MS);
  }

  /**
   * Chat with a local text generation model
   */
  async chatWithLocal(modelId: string, messages: ChatMessage[], options: LocalChatOptions): Promise<string> {
    console.log(`[ElectronLLMPlatform] chatWithLocal: ${modelId}, ${messages.length} messages`);

    // Load model if not loaded or different model requested
    if (!this.textGenProvider || this.loadedModelId !== modelId) {
      await this.loadLocalModel(modelId, (progress) => {
        if (options.topicId) {
          this.emitProgress(options.topicId, progress);
        }
      });
    }

    if (!this.textGenProvider) {
      throw new Error('Failed to load local model');
    }

    // Reset unload timeout
    this.resetUnloadTimeout();

    // Convert messages to local format
    const localMessages: LocalChatMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Generate response
    const response = await this.textGenProvider.chat(localMessages, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      onStream: options.onStream
    });

    return response;
  }

  /**
   * Check if a local model is loaded
   */
  isLocalModelLoaded(modelId: string): boolean {
    return this.loadedModelId === modelId && this.textGenProvider?.status === 'ready';
  }

  /**
   * Load a local text generation model
   */
  async loadLocalModel(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    console.log(`[ElectronLLMPlatform] Loading local model: ${modelId}`);

    // Unload existing model if different
    if (this.textGenProvider && this.loadedModelId !== modelId) {
      await this.unloadLocalModel(this.loadedModelId!);
    }

    // Validate model ID
    const modelInfo = MODELS[modelId as TextGenModelId];
    if (!modelInfo || modelInfo.type !== 'text-generation') {
      throw new Error(`Invalid text generation model: ${modelId}`);
    }

    // Create and load provider
    this.textGenProvider = new ONNXTextGenerationProvider(modelId as TextGenModelId);

    this.textGenProvider.onProgress = (progress) => {
      onProgress?.(progress.percent);
    };

    await this.textGenProvider.load();
    this.loadedModelId = modelId;

    console.log(`[ElectronLLMPlatform] Model loaded: ${modelId}`);
  }

  /**
   * Unload a local text generation model
   */
  async unloadLocalModel(modelId: string): Promise<void> {
    if (this.unloadTimeout) {
      clearTimeout(this.unloadTimeout);
      this.unloadTimeout = null;
    }

    if (this.textGenProvider && this.loadedModelId === modelId) {
      console.log(`[ElectronLLMPlatform] Unloading model: ${modelId}`);
      await this.textGenProvider.unload();
      this.textGenProvider = null;
      this.loadedModelId = null;
    }
  }

  /**
   * Get available local text generation models
   */
  async getAvailableLocalModels(): Promise<Array<{ id: string; name: string; size: number; installed: boolean }>> {
    const textGenModels = getTextGenerationModels();

    // TODO: Check which models are actually installed/downloaded
    // For now, return all with installed: false (download required)
    return textGenModels.map(model => ({
      id: model.id,
      name: model.name,
      size: model.sizeBytes,
      installed: false // Will need to check file system
    }));
  }
}

/**
 * Electron Ollama Validator
 */
export const electronOllamaValidator = {
  async testOllamaConnection(server: string, authToken?: string, serviceName?: string): Promise<any> {
    // Use node-fetch for HTTP requests
    const fetch = (await import('node-fetch')).default;

    try {
      const url = `${server}/api/tags`;
      const headers: Record<string, string> = {};

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        // @ts-ignore - node-fetch timeout option
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      return {
        success: true,
        models: data.models || [],
        serviceName: serviceName || 'Ollama'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  async fetchOllamaModels(server: string, authToken?: string): Promise<any[]> {
    const fetch = (await import('node-fetch')).default;

    try {
      const url = `${server}/api/tags`;
      const headers: Record<string, string> = {};

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        // @ts-ignore - node-fetch timeout option
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('[ElectronOllamaValidator] Failed to fetch models:', error);
      return [];
    }
  }
};

/**
 * Electron LLM Config Manager
 */
export const electronConfigManager = {
  /**
   * Encrypt a token using Electron's safeStorage (if available)
   * Falls back to base64 encoding if safeStorage is not available
   */
  encryptToken(token: string): string {
    try {
      // Try to use Electron's safeStorage for encryption
      const { safeStorage } = require('electron');
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = safeStorage.encryptString(token);
        return buffer.toString('base64');
      }
    } catch (error) {
      console.warn('[ElectronConfigManager] safeStorage not available, using base64');
    }

    // Fallback to base64 encoding
    return Buffer.from(token).toString('base64');
  },

  /**
   * Decrypt a token using Electron's safeStorage (if available)
   * Falls back to base64 decoding if safeStorage is not available
   */
  decryptToken(encrypted: string): string {
    try {
      // Try to use Electron's safeStorage for decryption
      const { safeStorage } = require('electron');
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encrypted, 'base64');
        return safeStorage.decryptString(buffer);
      }
    } catch (error) {
      console.warn('[ElectronConfigManager] safeStorage not available, using base64');
    }

    // Fallback to base64 decoding
    return Buffer.from(encrypted, 'base64').toString();
  },

  /**
   * Compute base URL for a given model type
   */
  computeBaseUrl(modelType: string, baseUrl?: string): string {
    // If explicit baseUrl provided, use it
    if (baseUrl) {
      return baseUrl;
    }

    // Default URLs for common providers
    switch (modelType) {
      case 'ollama':
        return 'http://localhost:11434';
      case 'lmstudio':
        return 'http://localhost:1234';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      default:
        return 'http://localhost:11434'; // Default to Ollama
    }
  },

  /**
   * Check if encryption is available
   */
  isEncryptionAvailable(): boolean {
    try {
      const { safeStorage } = require('electron');
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }
};

/**
 * Create LLMConfigAdapter for AIModule
 */
export function createElectronLLMConfigAdapter(): LLMConfigAdapter {
  return {
    ollamaValidator: electronOllamaValidator,
    configManager: electronConfigManager
  };
}
