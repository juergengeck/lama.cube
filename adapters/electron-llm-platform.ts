/**
 * Electron LLM Platform Implementation
 *
 * Implements LLMPlatform interface for Electron using BrowserWindow for UI events.
 * This adapter bridges lama.core's platform-agnostic LLM operations with Electron's
 * IPC system.
 *
 * Uses centralized event registry from @lama/core/events for type-safe event names.
 */

import type { BrowserWindow } from 'electron';
import type { LLMPlatform, ChatMessage, LocalChatOptions } from '@lama/core/services/llm-platform.js';
import { Events } from '@lama/core/events';

export class ElectronLLMPlatform implements LLMPlatform {
  constructor(private getWindow: () => BrowserWindow | null) {}

  private get mainWindow(): BrowserWindow | null {
    return this.getWindow();
  }

  /**
   * Emit progress update via Electron IPC
   */
  emitProgress(topicId: string, progress: number): void {
    console.log(`[ElectronLLMPlatform] 🔄 emitProgress: ${Events.AI_RESPONDING} for topic ${topicId}`);

    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.log(`[ElectronLLMPlatform] ⚠️  Cannot emit - window destroyed`);
      return;
    }

    this.mainWindow.webContents.send(Events.AI_RESPONDING, {
      topicId,
      progress,
    });
  }

  /**
   * Emit error via Electron IPC
   */
  emitError(topicId: string, error: Error): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send(Events.AI_ERROR, {
      topicId,
      error: error.message,
    });
  }

  private lastChunkTime: number = 0;
  private chunkCount: number = 0;

  /**
   * Emit message update via Electron IPC
   */
  emitMessageUpdate(
    topicId: string,
    messageId: string,
    content: string | { thinking?: string; response: string; raw?: string; language?: string },
    status: string,
    modelId?: string,
    modelName?: string
  ): void {
    const startTime = performance.now();

    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // Extract text and language from content
    const text = typeof content === 'string' ? content : content.response;
    const language = typeof content === 'object' ? content.language : undefined;

    if (status === 'responding') {
      this.mainWindow.webContents.send(Events.AI_RESPONDING, {
        topicId,
        progress: 0,
      });
    } else if (status === 'streaming') {
      const now = performance.now();
      if (this.chunkCount === 0) {
        console.log(`[PERF] 🚀 First streaming chunk for ${topicId}`);
        this.lastChunkTime = now;
      } else {
        const timeSinceLastChunk = now - this.lastChunkTime;
        console.log(`[PERF] ⏱️  Chunk #${this.chunkCount} - ${timeSinceLastChunk.toFixed(2)}ms since last chunk (text length: ${text.length})`);
        this.lastChunkTime = now;
      }
      this.chunkCount++;

      const ipcStartTime = performance.now();
      this.mainWindow.webContents.send(Events.LLM_STREAM, {
        topicId,
        messageId,
        content: text,
        modelId,
        modelName,
      });
      const ipcTime = performance.now() - ipcStartTime;
      console.log(`[PERF] 📡 IPC send took ${ipcTime.toFixed(2)}ms`);
    } else if (status === 'complete' || status === 'error') {
      console.log(`[PERF] ✅ Streaming complete - total chunks: ${this.chunkCount}${language ? `, language: ${language}` : ''}`);
      this.chunkCount = 0;

      this.mainWindow.webContents.send(Events.LLM_COMPLETE, {
        topicId,
        messageId,
        content: text,
        language,
        status: status === 'error' ? 'error' : 'success',
        modelId,
        modelName,
      });
    }

    const totalTime = performance.now() - startTime;
    if (totalTime > 10) {
      console.log(`[PERF] ⚠️  emitMessageUpdate took ${totalTime.toFixed(2)}ms (unusually long!)`);
    }
  }

  /**
   * Start MCP server (Node.js child process)
   * TODO: Implement when MCP manager is refactored to lama.core
   */
  async startMCPServer(_modelId: string, _config: any): Promise<void> {
    throw new Error('MCP server management not yet implemented in refactored architecture');
  }

  /**
   * Stop MCP server
   * TODO: Implement when MCP manager is refactored to lama.core
   */
  async stopMCPServer(_modelId: string): Promise<void> {
    throw new Error('MCP server management not yet implemented in refactored architecture');
  }

  /**
   * Read model file from disk (Node.js file system)
   * TODO: Implement when needed for model loading
   */
  async readModelFile(_path: string): Promise<Buffer> {
    throw new Error('Model file reading not yet implemented in refactored architecture');
  }

  /**
   * Emit analysis update notification
   */
  emitAnalysisUpdate(topicId: string, analysisType: 'keywords' | 'subjects' | 'both'): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    console.log(`[ElectronLLMPlatform] Emitting analysis update for ${topicId}: ${analysisType}`);

    if (analysisType === 'keywords' || analysisType === 'both') {
      this.mainWindow.webContents.send(Events.KEYWORDS_UPDATED, { topicId });
    }

    if (analysisType === 'subjects' || analysisType === 'both') {
      this.mainWindow.webContents.send(Events.SUBJECTS_UPDATED, { topicId });
    }
  }

  /**
   * Emit thinking status update during AI response generation
   */
  emitThinkingStatus(topicId: string, status: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send(Events.LLM_STATUS, {
      topicId,
      status,
    });
  }

  /**
   * Emit thinking stream update (for reasoning models like DeepSeek R1, gpt-oss)
   */
  emitThinkingUpdate(topicId: string, messageId: string, thinkingContent: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn('[ElectronLLMPlatform] Cannot emit thinking - window destroyed');
      return;
    }

    console.log(`[ElectronLLMPlatform] 🧠 Emitting ${Events.LLM_THINKING}: ${thinkingContent.length} chars to topic ${topicId}`);
    this.mainWindow.webContents.send(Events.LLM_THINKING, {
      topicId,
      messageId,
      content: thinkingContent,
    });
  }

  /**
   * Get installed local text-generation models for ONE.core registration
   * Called by AIModule during init to register models in storage
   */
  async getInstalledTextGenModels(): Promise<Array<{
    id: string;
    name: string;
    sizeBytes: number;
    contextLength?: number;
    familyName?: string;
  }>> {
    // Dynamically import to avoid circular dependencies
    const { getTextGenerationModels } = await import('@local/core');
    const localModelsPlans = (await import('../main/ipc/plans/local-models.js')).default;

    const textGenModels = getTextGenerationModels();
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

    console.log(`[ElectronLLMPlatform] Found ${installedModels.length} installed text-gen models:`,
      installedModels.map(m => m.id).join(', '));

    return installedModels;
  }

  /**
   * Chat with local text generation model (granite, etc.)
   * Bridges to local-models ONNXTextGenerationProvider
   */
  async chatWithLocal(modelId: string, messages: ChatMessage[], options: LocalChatOptions): Promise<string> {
    console.log(`[ElectronLLMPlatform] chatWithLocal: ${modelId}, ${messages.length} messages`);

    // Dynamically import to avoid circular dependencies
    const { chatWithLocalDirect } = await import('../main/ipc/plans/local-models.js');

    return chatWithLocalDirect(modelId, messages, {
      onStream: options.onStream,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });
  }
}

/**
 * Electron Ollama Validator
 */
export const electronOllamaValidator = {
  async testOllamaConnection(server: string, authToken?: string, serviceName?: string): Promise<any> {
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
  encryptToken(token: string): string {
    try {
      const { safeStorage } = require('electron');
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = safeStorage.encryptString(token);
        return buffer.toString('base64');
      }
    } catch (error) {
      console.warn('[ElectronConfigManager] safeStorage not available, using base64');
    }
    return Buffer.from(token).toString('base64');
  },

  decryptToken(encrypted: string): string {
    try {
      const { safeStorage } = require('electron');
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encrypted, 'base64');
        return safeStorage.decryptString(buffer);
      }
    } catch (error) {
      console.warn('[ElectronConfigManager] safeStorage not available, using base64');
    }
    return Buffer.from(encrypted, 'base64').toString();
  },

  computeBaseUrl(modelType: string, baseUrl?: string): string {
    if (baseUrl) return baseUrl;
    switch (modelType) {
      case 'ollama': return 'http://localhost:11434';
      case 'lmstudio': return 'http://localhost:1234';
      case 'openai': return 'https://api.openai.com/v1';
      case 'anthropic': return 'https://api.anthropic.com/v1';
      default: return 'http://localhost:11434';
    }
  },

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
export function createElectronLLMConfigAdapter() {
  return {
    ollamaValidator: electronOllamaValidator,
    configManager: electronConfigManager
  };
}
