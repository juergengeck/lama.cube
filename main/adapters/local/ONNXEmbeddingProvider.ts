/**
 * ONNX-based embedding provider for Electron
 *
 * Uses transformers.js with onnxruntime-node for local embedding generation.
 * Implements LocalEmbeddingProvider from @local/core.
 */

import { app } from 'electron';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type {
  LocalEmbeddingProvider,
  ModelId,
  ModelStatus,
  ModelLoadProgress,
  EmbeddingModel
} from '@local/core';
import { MODELS } from '@local/core';

// Configure transformers.js for Electron Node.js environment
env.allowLocalModels = true;
env.useBrowserCache = false;

/**
 * Get path to bundled models directory
 */
function getBundledModelsDir(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return join(process.cwd(), 'models');
  }
  return join(process.resourcesPath, 'models');
}

/**
 * Check if bundled model exists and return its path
 * Models are stored as: models/Xenova/whisper-tiny
 */
function getBundledModelPath(huggingFaceRepo: string): string | null {
  const bundledDir = getBundledModelsDir();
  const [org, name] = huggingFaceRepo.split('/');
  const modelPath = join(bundledDir, org, name);

  if (!existsSync(modelPath)) return null;

  // Check for onnx files
  try {
    const files = readdirSync(modelPath);
    const hasOnnx = files.some(f => f.endsWith('.onnx') || f === 'onnx');
    return hasOnnx ? modelPath : null;
  } catch {
    return null;
  }
}

/**
 * ONNX Embedding Provider using transformers.js
 *
 * Provides local embedding generation without requiring external services.
 *
 * @example
 * ```typescript
 * const provider = new ONNXEmbeddingProvider('nomic-embed-text-v1.5-q4');
 *
 * provider.onProgress = (progress) => {
 *   console.log(`Loading: ${progress.percent}%`);
 * };
 *
 * await provider.load();
 *
 * const embedding = await provider.embed('Hello world');
 * console.log(embedding.length); // 768
 *
 * await provider.unload();
 * ```
 */
export class ONNXEmbeddingProvider implements LocalEmbeddingProvider {
  private extractor: FeatureExtractionPipeline | null = null;
  private _status: ModelStatus = 'unloaded';

  /** Model identifier for EmbeddingProvider interface */
  readonly model: EmbeddingModel;

  /** Model identifier for LocalInferenceProvider interface */
  readonly modelId: ModelId;

  /** Optional progress callback */
  onProgress?: (progress: ModelLoadProgress) => void;

  /** Optional error callback */
  onError?: (error: Error) => void;

  constructor(modelId: ModelId = 'all-MiniLM-L6-v2') {
    this.modelId = modelId;
    // Map to EmbeddingModel type (strips quantization suffix for compatibility)
    this.model = modelId.replace('-q4', '') as EmbeddingModel;
  }

  /** Current model status */
  get status(): ModelStatus {
    return this._status;
  }

  /**
   * Load the model into memory
   *
   * Downloads the model if not cached locally.
   * Model is cached in userData/models/ after first download.
   */
  async load(): Promise<void> {
    if (this._status === 'ready') {
      return; // Already loaded
    }

    if (this._status === 'loading') {
      throw new Error('Model is already loading');
    }

    try {
      this._status = 'loading';

      const modelInfo = MODELS[this.modelId];
      const hfModel = this.getHuggingFaceModel();

      // Check for bundled model first
      if (modelInfo.bundled) {
        const bundledPath = getBundledModelPath(modelInfo.huggingFaceRepo);
        if (bundledPath) {
          console.log(`[ONNXEmbeddingProvider] Using bundled model: ${bundledPath}`);
          env.localModelPath = getBundledModelsDir();
        }
      }

      // Fall back to cache directory for non-bundled or missing bundled
      if (!env.localModelPath) {
        const cacheDir = `${app.getPath('userData')}/models`;
        env.cacheDir = cacheDir;
      }

      this.onProgress?.({ stage: 'load', percent: 0 });

      // Note: Type cast needed due to complex union types in transformers.js v3
      this.extractor = await (pipeline as any)('feature-extraction', hfModel, {
        progress_callback: (progress: { status: string; progress?: number; loaded?: number; total?: number }) => {
          if (progress.status === 'download') {
            this._status = 'downloading';
            this.onProgress?.({
              stage: 'download',
              percent: progress.progress ?? 0,
              bytesLoaded: progress.loaded,
              bytesTotal: progress.total
            });
          } else if (progress.status === 'ready') {
            this.onProgress?.({ stage: 'load', percent: 100 });
          }
        }
      }) as FeatureExtractionPipeline;

      this._status = 'ready';
      this.onProgress?.({ stage: 'warmup', percent: 100 });
    } catch (error) {
      this._status = 'error';
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (this._status !== 'ready' || !this.extractor) {
      throw new Error('Model not loaded. Call load() first.');
    }

    const output = await this.extractor(text, {
      pooling: 'mean',
      normalize: true
    });

    // Convert Float32Array to regular array
    return Array.from(output.data as Float32Array);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (this._status !== 'ready' || !this.extractor) {
      throw new Error('Model not loaded. Call load() first.');
    }

    // Process in parallel for better performance
    const embeddings = await Promise.all(
      texts.map(text => this.embed(text))
    );

    return embeddings;
  }

  /**
   * Unload the model from memory
   */
  async unload(): Promise<void> {
    if (this.extractor) {
      // transformers.js doesn't have explicit dispose, but setting to null
      // allows garbage collection
      this.extractor = null;
    }
    this._status = 'unloaded';
  }

  /**
   * Map modelId to Hugging Face model identifier
   */
  private getHuggingFaceModel(): string {
    const modelInfo = MODELS[this.modelId];
    if (!modelInfo) {
      throw new Error(`Unknown model: ${this.modelId}`);
    }

    // Use huggingFaceRepo from registry
    return modelInfo.huggingFaceRepo;
  }
}
