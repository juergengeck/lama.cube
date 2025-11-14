/**
 * Electron LLM Platform Implementation
 *
 * Implements LLMPlatform interface for Electron using BrowserWindow for UI events.
 * This adapter bridges lama.core's platform-agnostic LLM operations with Electron's
 * IPC system.
 */

import type { BrowserWindow } from 'electron';
import type { LLMPlatform } from '@lama/core/services/llm-platform.js';

export class ElectronLLMPlatform implements LLMPlatform {
  constructor(private mainWindow: BrowserWindow) {}

  /**
   * Emit progress update via Electron IPC
   * Maps to 'message:thinking' event for UI
   */
  emitProgress(topicId: string, progress: number): void {
    console.log(`[ElectronLLMPlatform] 🔄 emitProgress called for topic ${topicId}, progress: ${progress}`);

    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.log(`[ElectronLLMPlatform] ⚠️  Cannot emit progress - window destroyed`);
      return;
    }

    console.log(`[ElectronLLMPlatform] 📡 Sending IPC 'message:thinking' event to renderer`);
    this.mainWindow.webContents.send('message:thinking', {
      conversationId: topicId,
      progress,
    });
  }

  /**
   * Emit error via Electron IPC
   * Maps to 'ai:error' event for UI
   */
  emitError(topicId: string, error: Error): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('ai:error', {
      conversationId: topicId,
      error: error.message,
    });
  }

  private lastChunkTime: number = 0;
  private chunkCount: number = 0;

  /**
   * Emit message update via Electron IPC
   * Maps to 'message:stream' (streaming) or 'message:updated' (complete) events
   */
  emitMessageUpdate(
    topicId: string,
    messageId: string,
    text: string,
    status: string
  ): void {
    const startTime = performance.now();

    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    if (status === 'streaming') {
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
      this.mainWindow.webContents.send('message:stream', {
        conversationId: topicId,
        messageId,
        chunk: text,
        partial: text,
      });
      const ipcTime = performance.now() - ipcStartTime;
      console.log(`[PERF] 📡 IPC send took ${ipcTime.toFixed(2)}ms`);
    } else if (status === 'complete' || status === 'error') {
      console.log(`[PERF] ✅ Streaming complete - total chunks: ${this.chunkCount}`);
      this.chunkCount = 0;

      this.mainWindow.webContents.send('message:updated', {
        conversationId: topicId,
        message: {
          id: messageId,
          conversationId: topicId,
          text,
          status: status === 'error' ? 'error' : 'sent',
          timestamp: new Date().toISOString(),
        },
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
   * Maps to 'keywords:updated' and/or 'subjects:updated' events for UI
   */
  emitAnalysisUpdate(topicId: string, analysisType: 'keywords' | 'subjects' | 'both'): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    console.log(`[ElectronLLMPlatform] Emitting analysis update for ${topicId}: ${analysisType}`);

    if (analysisType === 'keywords' || analysisType === 'both') {
      this.mainWindow.webContents.send('keywords:updated', {
        topicId,
      });
    }

    if (analysisType === 'subjects' || analysisType === 'both') {
      this.mainWindow.webContents.send('subjects:updated', {
        topicId,
      });
    }
  }

  /**
   * Emit thinking status update during AI response generation
   * Maps to 'message:thinkingStatus' event for UI
   */
  emitThinkingStatus(topicId: string, status: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('message:thinkingStatus', {
      conversationId: topicId,
      status,
    });
  }

  /**
   * Emit thinking stream update (for reasoning models like DeepSeek R1, gpt-oss)
   * Streams the internal reasoning/thinking process to the UI in real-time
   * Maps to 'message:thinkingStream' event for UI
   */
  emitThinkingUpdate(topicId: string, messageId: string, thinkingContent: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn('[ElectronLLMPlatform] Cannot emit thinking - window destroyed');
      return;
    }

    console.log(`[ElectronLLMPlatform] 🧠 Emitting thinking stream IPC: ${thinkingContent.length} chars to topic ${topicId}`);
    this.mainWindow.webContents.send('message:thinkingStream', {
      conversationId: topicId,
      messageId,
      thinking: thinkingContent,
    });
  }
}
