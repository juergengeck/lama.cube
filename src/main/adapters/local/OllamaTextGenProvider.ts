/**
 * Ollama-based text generation provider for Electron
 *
 * Wraps Ollama's /api/chat endpoint with the LocalTextGenerationProvider interface.
 * Uses a configurable model (default: llama3.2).
 */

import fetch from 'node-fetch';
import type {
  LocalTextGenerationProvider,
  TextGenModelId,
  ModelStatus,
  ModelLoadProgress,
  ChatMessage,
  TextGenerationOptions
} from '@refinio/local.core';
import { getDefaultOllamaUrl } from '../../services/ollama-config-manager.js';

/**
 * Default Ollama chat model
 */
const DEFAULT_OLLAMA_CHAT_MODEL = 'llama3.2';

/**
 * Ollama Text Generation Provider
 *
 * Uses Ollama's /api/chat endpoint for text generation.
 * Requires Ollama to be running with an available chat model.
 *
 * @example
 * ```typescript
 * const provider = new OllamaTextGenProvider();
 *
 * provider.onProgress = (progress) => {
 *   console.log(`Status: ${progress.stage}`);
 * };
 *
 * await provider.load(); // Verifies Ollama is running
 *
 * const response = await provider.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * console.log(response);
 *
 * await provider.unload();
 * ```
 */
export class OllamaTextGenProvider implements LocalTextGenerationProvider {
  private _status: ModelStatus = 'unloaded';
  private baseUrl: string;
  private ollamaModel: string;

  /** Model identifier for LocalTextGenerationProvider interface */
  readonly modelId: TextGenModelId = 'phi-3.5-mini-instruct';

  /** Optional progress callback */
  onProgress?: (progress: ModelLoadProgress) => void;

  /** Optional error callback */
  onError?: (error: Error) => void;

  constructor(baseUrl?: string, ollamaModel: string = DEFAULT_OLLAMA_CHAT_MODEL) {
    this.baseUrl = baseUrl || getDefaultOllamaUrl();
    this.ollamaModel = ollamaModel;
  }

  /** Current model status */
  get status(): ModelStatus {
    return this._status;
  }

  /**
   * Load/verify the model
   *
   * For Ollama, this verifies the service is running and a chat model is available.
   */
  async load(): Promise<void> {
    if (this._status === 'ready') {
      return; // Already connected
    }

    if (this._status === 'loading') {
      throw new Error('Already loading');
    }

    try {
      this._status = 'loading';
      this.onProgress?.({ stage: 'load', percent: 0 });

      // Check if Ollama is running
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Ollama not responding: ${response.statusText}`);
      }

      this.onProgress?.({ stage: 'load', percent: 50 });

      // Verify some chat model exists
      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = data.models || [];
      const hasModel = models.some(m =>
        m.name === this.ollamaModel ||
        m.name.startsWith(`${this.ollamaModel}:`)
      );

      if (!hasModel) {
        // Check for any available chat model
        const chatModels = models.filter(m =>
          !m.name.includes('embed') &&
          !m.name.includes('nomic')
        );

        if (chatModels.length > 0) {
          // Use first available chat model
          this.ollamaModel = chatModels[0].name.split(':')[0];
          console.log(`[OllamaTextGen] Using available model: ${this.ollamaModel}`);
        } else {
          console.warn(
            `[OllamaTextGen] No chat model found. ` +
            `Available: ${models.map(m => m.name).join(', ')}. ` +
            `Pull with: ollama pull ${DEFAULT_OLLAMA_CHAT_MODEL}`
          );
          throw new Error(`No chat model available in Ollama`);
        }
      }

      this._status = 'ready';
      this.onProgress?.({ stage: 'warmup', percent: 100 });
      console.log(`[OllamaTextGen] Connected to Ollama at ${this.baseUrl}, model: ${this.ollamaModel}`);
    } catch (error) {
      this._status = 'error';
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Generate a chat response
   */
  async chat(messages: ChatMessage[], options?: TextGenerationOptions): Promise<string> {
    if (this._status !== 'ready') {
      throw new Error('Provider not loaded. Call load() first.');
    }

    try {
      // Convert to Ollama format
      const ollamaMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const body: Record<string, unknown> = {
        model: this.ollamaModel,
        messages: ollamaMessages,
        stream: !!options?.onStream,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 512
        }
      };

      if (options?.topP !== undefined) {
        (body.options as Record<string, unknown>).top_p = options.topP;
      }
      if (options?.topK !== undefined) {
        (body.options as Record<string, unknown>).top_k = options.topK;
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000) // 2 minute timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama chat failed: ${response.statusText} - ${errorText}`);
      }

      if (options?.onStream && response.body) {
        // Streaming response
        let fullResponse = '';
        const decoder = new TextDecoder();

        for await (const chunk of response.body) {
          const text = decoder.decode(chunk as Buffer, { stream: true });
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
              if (data.message?.content) {
                fullResponse += data.message.content;
                options.onStream(data.message.content);
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }

        return fullResponse;
      } else {
        // Non-streaming response
        const data = await response.json() as { message?: { content?: string } };

        if (!data.message?.content) {
          throw new Error('Ollama returned no response');
        }

        return data.message.content;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Check if structured output is supported
   */
  supportsStructuredOutput(): boolean {
    // Ollama supports JSON mode via format parameter
    return true;
  }

  /**
   * Unload/disconnect from Ollama
   */
  async unload(): Promise<void> {
    this._status = 'unloaded';
    console.log('[OllamaTextGen] Disconnected');
  }
}
