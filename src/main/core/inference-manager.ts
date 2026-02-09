/**
 * Inference Manager for Local ML Models
 *
 * Manages local inference providers (embeddings, text generation) for the Electron app.
 *
 * Provider priority:
 * 1. Ollama LAN - powerful server on network (if configured)
 * 2. Ollama Local - desktop Ollama instance (localhost:11434)
 * 3. LlamaCpp - built-in, always works offline (last resort)
 */

import { OllamaEmbeddingProvider } from '../adapters/local/OllamaEmbeddingProvider.js';
import { OllamaTextGenProvider } from '../adapters/local/OllamaTextGenProvider.js';
import { LlamaCppEmbeddingProvider, LlamaCppTextGenProvider, ModelManager } from '@refinio/local.llama';
import type {
  LocalEmbeddingProvider,
  LocalTextGenerationProvider,
  ModelStatus,
  ModelLoadProgress
} from '@refinio/local.core';
import * as path from 'node:path';
import { app } from 'electron';

/**
 * Inference configuration
 */
export interface InferenceConfig {
  /** Ollama LAN URL (e.g., 'http://192.168.1.100:11434') */
  ollamaLanUrl?: string;
  /** Skip Ollama entirely and use llama.cpp */
  forceLlamaCpp?: boolean;
  /** Custom models directory */
  modelsDir?: string;
  /** Embedding model to use */
  embeddingModel?: string;
}

/**
 * Inference status for UI display
 */
export interface InferenceStatus {
  state: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  error?: string;
  provider?: 'ollama-lan' | 'ollama-local' | 'llama-cpp';
}

/**
 * Inference Manager
 *
 * Manages local inference providers with automatic fallback.
 *
 * @example
 * ```typescript
 * const inferenceManager = new InferenceManager();
 *
 * inferenceManager.onProgress = (progress) => {
 *   console.log(`Loading: ${progress.percent}%`);
 * };
 *
 * await inferenceManager.init({
 *   ollamaLanUrl: 'http://192.168.1.100:11434'
 * });
 *
 * const embeddings = inferenceManager.getEmbeddingProvider();
 * await inferenceManager.shutdown();
 * ```
 */
export class InferenceManager {
  private embeddingProvider: LocalEmbeddingProvider | null = null;
  private textGenProvider: LocalTextGenerationProvider | null = null;
  private modelManager: ModelManager | null = null;
  private _initialized = false;
  private _lastStatus: InferenceStatus = { state: 'idle', progress: 0 };
  private _activeProvider: 'ollama-lan' | 'ollama-local' | 'llama-cpp' | null = null;
  private _textGenActiveProvider: 'ollama-lan' | 'ollama-local' | 'llama-cpp' | null = null;

  /** Progress callback for model loading */
  onProgress?: (progress: ModelLoadProgress) => void;

  /** Error callback */
  onError?: (error: Error) => void;

  /**
   * Get the last emitted inference status
   */
  getLastStatus(): InferenceStatus {
    return { ...this._lastStatus };
  }

  /**
   * Update and store the current status
   */
  updateStatus(status: InferenceStatus): void {
    this._lastStatus = { ...status };
  }

  /**
   * Get the active provider type
   */
  get activeProvider(): string | null {
    return this._activeProvider;
  }

  /**
   * Initialize inference providers with automatic fallback
   *
   * Priority:
   * 1. Ollama LAN (if configured)
   * 2. Ollama Local (localhost:11434)
   * 3. LlamaCpp (last resort, always works)
   */
  async init(config: InferenceConfig = {}): Promise<void> {
    if (this._initialized) {
      console.log('[InferenceManager] Already initialized');
      return;
    }

    console.log('[InferenceManager] Initializing with config:', config);

    // Setup model manager for llama.cpp fallback
    const modelsDir = config.modelsDir || path.join(app.getPath('userData'), 'models');
    this.modelManager = new ModelManager(modelsDir);

    // Skip Ollama if forced to use llama.cpp
    if (!config.forceLlamaCpp) {
      // 1. Try Ollama LAN (if configured)
      if (config.ollamaLanUrl) {
        try {
          console.log('[InferenceManager] Trying Ollama LAN:', config.ollamaLanUrl);
          const provider = new OllamaEmbeddingProvider(config.ollamaLanUrl);
          this.wireCallbacks(provider);
          await provider.load();

          this.embeddingProvider = provider;
          this._activeProvider = 'ollama-lan';
          this._initialized = true;
          console.log('[InferenceManager] Using Ollama LAN');
          return;
        } catch (err) {
          console.warn('[InferenceManager] Ollama LAN unavailable:', (err as Error).message);
        }
      }

      // 2. Try Ollama Local (localhost)
      try {
        console.log('[InferenceManager] Trying local Ollama');
        const provider = new OllamaEmbeddingProvider('http://localhost:11434');
        this.wireCallbacks(provider);
        await provider.load();

        this.embeddingProvider = provider;
        this._activeProvider = 'ollama-local';
        this._initialized = true;
        console.log('[InferenceManager] Using local Ollama');
        return;
      } catch (err) {
        console.warn('[InferenceManager] Local Ollama unavailable:', (err as Error).message);
      }
    }

    // 3. Last resort: llama.cpp
    console.log('[InferenceManager] Falling back to llama.cpp');
    try {
      const provider = new LlamaCppEmbeddingProvider(this.modelManager);
      this.wireCallbacks(provider);
      await provider.load();

      this.embeddingProvider = provider;
      this._activeProvider = 'llama-cpp';
      this._initialized = true;
      console.log('[InferenceManager] Using llama.cpp');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onError?.(error);
      throw new Error(`All inference providers failed. Last error: ${error.message}`);
    }
  }

  /**
   * Wire up progress and error callbacks to a provider
   */
  private wireCallbacks(provider: LocalEmbeddingProvider | LocalTextGenerationProvider): void {
    if (this.onProgress) {
      provider.onProgress = this.onProgress;
    }
    if (this.onError) {
      provider.onError = this.onError;
    }
  }

  /**
   * Initialize text generation provider with automatic fallback
   *
   * Priority: Ollama LAN → Ollama Local → LlamaCpp
   * Called on-demand when text generation is first requested.
   */
  async initTextGen(config: InferenceConfig = {}): Promise<void> {
    if (this.textGenProvider && this.textGenProvider.status === 'ready') {
      return; // Already initialized
    }

    console.log('[InferenceManager] Initializing text generation...');

    // Ensure model manager exists
    if (!this.modelManager) {
      const modelsDir = config.modelsDir || path.join(app.getPath('userData'), 'models');
      this.modelManager = new ModelManager(modelsDir);
    }

    // Skip Ollama if forced to use llama.cpp
    if (!config.forceLlamaCpp) {
      // 1. Try Ollama LAN (if configured)
      if (config.ollamaLanUrl) {
        try {
          console.log('[InferenceManager] Trying Ollama LAN for text gen:', config.ollamaLanUrl);
          const provider = new OllamaTextGenProvider(config.ollamaLanUrl);
          this.wireCallbacks(provider);
          await provider.load();

          this.textGenProvider = provider;
          this._textGenActiveProvider = 'ollama-lan';
          console.log('[InferenceManager] Using Ollama LAN for text gen');
          return;
        } catch (err) {
          console.warn('[InferenceManager] Ollama LAN text gen unavailable:', (err as Error).message);
        }
      }

      // 2. Try Ollama Local (localhost)
      try {
        console.log('[InferenceManager] Trying local Ollama for text gen');
        const provider = new OllamaTextGenProvider('http://localhost:11434');
        this.wireCallbacks(provider);
        await provider.load();

        this.textGenProvider = provider;
        this._textGenActiveProvider = 'ollama-local';
        console.log('[InferenceManager] Using local Ollama for text gen');
        return;
      } catch (err) {
        console.warn('[InferenceManager] Local Ollama text gen unavailable:', (err as Error).message);
      }
    }

    // 3. Last resort: llama.cpp
    console.log('[InferenceManager] Falling back to llama.cpp for text gen');
    try {
      const provider = new LlamaCppTextGenProvider(this.modelManager);
      this.wireCallbacks(provider);
      await provider.load();

      this.textGenProvider = provider;
      this._textGenActiveProvider = 'llama-cpp';
      console.log('[InferenceManager] Using llama.cpp for text gen');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onError?.(error);
      throw new Error(`All text gen providers failed. Last error: ${error.message}`);
    }
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
   */
  async embed(text: string): Promise<number[]> {
    return this.getEmbeddingProvider().embed(text);
  }

  /**
   * Generate embeddings for multiple texts (convenience method)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.getEmbeddingProvider().embedBatch(texts);
  }

  /**
   * Get the model manager (for UI to list/manage models)
   */
  getModelManager(): ModelManager | null {
    return this.modelManager;
  }

  /**
   * Get the text generation provider
   *
   * @throws Error if not initialized (call initTextGen first)
   */
  getTextGenProvider(): LocalTextGenerationProvider {
    if (!this.textGenProvider) {
      throw new Error('Text generation not initialized. Call initTextGen() first.');
    }
    return this.textGenProvider;
  }

  /**
   * Check if text generation is available
   */
  get textGenReady(): boolean {
    return this.textGenProvider !== null && this.textGenProvider.status === 'ready';
  }

  /**
   * Get the active text generation provider type
   */
  get textGenActiveProvider(): string | null {
    return this._textGenActiveProvider;
  }

  /**
   * Shutdown text generation provider
   */
  async shutdownTextGen(): Promise<void> {
    if (this.textGenProvider) {
      console.log('[InferenceManager] Shutting down text gen...');
      await this.textGenProvider.unload();
      this.textGenProvider = null;
      this._textGenActiveProvider = null;
    }
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

    if (this.textGenProvider) {
      await this.textGenProvider.unload();
      this.textGenProvider = null;
    }

    this._initialized = false;
    this._activeProvider = null;
    this._textGenActiveProvider = null;
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

/**
 * Reset the InferenceManager singleton for re-initialization
 * Called during app data clear to allow fresh login without process restart
 */
export async function resetInferenceManager(): Promise<void> {
  console.log('[InferenceManager] Resetting singleton...');

  if (inferenceManagerInstance) {
    // Shutdown the existing instance first
    await inferenceManagerInstance.shutdown();
    // Null out the singleton so next getInferenceManager() creates fresh instance
    inferenceManagerInstance = null;
  }

  console.log('[InferenceManager] Singleton reset complete');
}

export default getInferenceManager;
