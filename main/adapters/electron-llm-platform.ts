/**
 * Electron-specific LLM Platform adapters
 * Implements interfaces from @lama/core/services/llm-platform
 */

import type { BrowserWindow } from 'electron';

// Define interfaces locally (they're defined in lama.core but imports aren't working)
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
