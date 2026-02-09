/**
 * Ollama-based embedding provider for Electron
 *
 * Wraps Ollama's /api/embed endpoint with the LocalEmbeddingProvider interface.
 * Uses the standard embedding model (nomic-embed-text, 768 dimensions).
 */

import fetch from 'node-fetch';
import type {
  LocalEmbeddingProvider,
  ModelId,
  ModelStatus,
  ModelLoadProgress
} from '@refinio/local.core';
import { getDefaultOllamaUrl } from '../../services/ollama-config-manager.js';

/**
 * Standard Ollama embedding model (768 dimensions)
 */
const OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Ollama Embedding Provider
 *
 * Uses Ollama's /api/embed endpoint for embedding generation.
 * Requires Ollama to be running with the nomic-embed-text model available.
 *
 * @example
 * ```typescript
 * const provider = new OllamaEmbeddingProvider();
 *
 * provider.onProgress = (progress) => {
 *   console.log(`Status: ${progress.stage}`);
 * };
 *
 * await provider.load(); // Verifies Ollama is running
 *
 * const embedding = await provider.embed('Hello world');
 * console.log(embedding.length); // 768
 *
 * await provider.unload();
 * ```
 */
export class OllamaEmbeddingProvider implements LocalEmbeddingProvider {
  private _status: ModelStatus = 'unloaded';
  private baseUrl: string;

  /** Model identifier for LocalInferenceProvider interface */
  readonly modelId: ModelId = 'nomic-embed-text-v1.5';

  /** Optional progress callback */
  onProgress?: (progress: ModelLoadProgress) => void;

  /** Optional error callback */
  onError?: (error: Error) => void;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getDefaultOllamaUrl();
  }

  /** Current model status */
  get status(): ModelStatus {
    return this._status;
  }

  /**
   * Load/verify the model
   *
   * For Ollama, this verifies the service is running and the model is available.
   * The actual model loading happens on first inference if not already loaded.
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

      // Verify the model exists
      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = data.models || [];
      const hasModel = models.some(m =>
        m.name === OLLAMA_EMBEDDING_MODEL ||
        m.name.startsWith(`${OLLAMA_EMBEDDING_MODEL}:`)
      );

      if (!hasModel) {
        console.warn(
          `[OllamaEmbedding] Model '${OLLAMA_EMBEDDING_MODEL}' not found. ` +
          `Available: ${models.map(m => m.name).join(', ')}. ` +
          `Pull with: ollama pull ${OLLAMA_EMBEDDING_MODEL}`
        );
        // Don't fail - model might be pulled on first use
      }

      this._status = 'ready';
      this.onProgress?.({ stage: 'warmup', percent: 100 });
      console.log(`[OllamaEmbedding] Connected to Ollama at ${this.baseUrl}`);
    } catch (error) {
      this._status = 'error';
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Generate embedding for a single text (768-dim vector)
   */
  async embed(text: string): Promise<number[]> {
    if (this._status !== 'ready') {
      throw new Error('Provider not loaded. Call load() first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_EMBEDDING_MODEL,
          input: text
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embed failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as { embeddings?: number[][] };

      if (!data.embeddings || data.embeddings.length === 0) {
        throw new Error('Ollama returned no embeddings');
      }

      return data.embeddings[0];
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (this._status !== 'ready') {
      throw new Error('Provider not loaded. Call load() first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_EMBEDDING_MODEL,
          input: texts
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embed batch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as { embeddings?: number[][] };

      if (!data.embeddings || data.embeddings.length !== texts.length) {
        throw new Error(`Ollama returned ${data.embeddings?.length ?? 0} embeddings, expected ${texts.length}`);
      }

      return data.embeddings;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Unload/disconnect from Ollama
   */
  async unload(): Promise<void> {
    // Ollama doesn't require explicit unloading
    this._status = 'unloaded';
    console.log('[OllamaEmbedding] Disconnected');
  }
}
