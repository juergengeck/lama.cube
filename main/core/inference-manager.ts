/**
 * Inference Manager for Local ML Models
 *
 * Manages local inference providers (embeddings, speech-to-text) for the Electron app.
 * Provides a unified interface to switch between ONNX (bundled) and Ollama providers.
 */

import { ONNXEmbeddingProvider } from '../adapters/local/ONNXEmbeddingProvider.js';
import type {
  LocalEmbeddingProvider,
  ModelId,
  ModelStatus,
  ModelLoadProgress
} from '@local/core';

/**
 * Inference configuration
 */
export interface InferenceConfig {
  /** Use local ONNX models (true) or Ollama (false) */
  preferLocal: boolean;
  /** Model ID for embeddings */
  embeddingModel?: ModelId;
}

/**
 * Inference Manager
 *
 * Manages local inference providers with lifecycle management.
 *
 * @example
 * ```typescript
 * const inferenceManager = new InferenceManager();
 *
 * // Listen for progress
 * inferenceManager.onProgress = (progress) => {
 *   console.log(`Loading: ${progress.percent}%`);
 * };
 *
 * // Initialize with local ONNX models
 * await inferenceManager.init({ preferLocal: true });
 *
 * // Get embedding provider for MeaningDimension
 * const embeddings = inferenceManager.getEmbeddingProvider();
 *
 * // Cleanup
 * await inferenceManager.shutdown();
 * ```
 */
export class InferenceManager {
  private embeddingProvider: LocalEmbeddingProvider | null = null;
  private _initialized = false;

  /** Progress callback for model loading */
  onProgress?: (progress: ModelLoadProgress) => void;

  /** Error callback */
  onError?: (error: Error) => void;

  /**
   * Initialize inference providers
   *
   * @param config Configuration for provider selection
   */
  async init(config: InferenceConfig): Promise<void> {
    if (this._initialized) {
      console.log('[InferenceManager] Already initialized');
      return;
    }

    console.log('[InferenceManager] Initializing with config:', config);

    if (config.preferLocal) {
      // Use bundled ONNX model - works offline, no setup required
      const modelId = config.embeddingModel || 'nomic-embed-text-v1.5-q4';
      console.log(`[InferenceManager] Using local ONNX model: ${modelId}`);

      this.embeddingProvider = new ONNXEmbeddingProvider(modelId);

      // Wire up progress and error callbacks
      if (this.onProgress) {
        this.embeddingProvider.onProgress = this.onProgress;
      }
      if (this.onError) {
        this.embeddingProvider.onError = this.onError;
      }

      await this.embeddingProvider.load();
      console.log('[InferenceManager] ONNX embedding provider loaded');
    } else {
      // Future: Use OllamaLocalProvider
      // For now, just use ONNX as fallback
      console.log('[InferenceManager] Ollama not yet implemented, using ONNX fallback');
      const modelId = config.embeddingModel || 'nomic-embed-text-v1.5-q4';
      this.embeddingProvider = new ONNXEmbeddingProvider(modelId);

      if (this.onProgress) {
        this.embeddingProvider.onProgress = this.onProgress;
      }
      if (this.onError) {
        this.embeddingProvider.onError = this.onError;
      }

      await this.embeddingProvider.load();
    }

    this._initialized = true;
    console.log('[InferenceManager] Initialization complete');
  }

  /**
   * Check if manager is initialized
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Get current embedding provider status
   */
  get status(): ModelStatus {
    return this.embeddingProvider?.status ?? 'unloaded';
  }

  /**
   * Get the embedding provider
   *
   * Returns the current embedding provider for use with MeaningDimension
   * or other embedding consumers.
   *
   * @throws Error if not initialized
   */
  getEmbeddingProvider(): LocalEmbeddingProvider {
    if (!this._initialized || !this.embeddingProvider) {
      throw new Error('InferenceManager not initialized. Call init() first.');
    }
    return this.embeddingProvider;
  }

  /**
   * Generate embedding for text (convenience method)
   *
   * @param text Text to embed
   * @returns Embedding vector
   */
  async embed(text: string): Promise<number[]> {
    return this.getEmbeddingProvider().embed(text);
  }

  /**
   * Generate embeddings for multiple texts (convenience method)
   *
   * @param texts Texts to embed
   * @returns Array of embedding vectors
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.getEmbeddingProvider().embedBatch(texts);
  }

  /**
   * Shutdown and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('[InferenceManager] Shutting down...');

    if (this.embeddingProvider) {
      await this.embeddingProvider.unload();
      this.embeddingProvider = null;
    }

    this._initialized = false;
    console.log('[InferenceManager] Shutdown complete');
  }
}

// Singleton instance
let inferenceManagerInstance: InferenceManager | null = null;

/**
 * Get the singleton InferenceManager instance
 */
export function getInferenceManager(): InferenceManager {
  if (!inferenceManagerInstance) {
    inferenceManagerInstance = new InferenceManager();
  }
  return inferenceManagerInstance;
}

export default getInferenceManager;
