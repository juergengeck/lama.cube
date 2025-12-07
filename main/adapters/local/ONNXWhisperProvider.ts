/**
 * ONNX-based Whisper provider for Electron
 *
 * Uses transformers.js for local speech-to-text transcription.
 * Follows same pattern as ONNXEmbeddingProvider.
 */

import { app } from 'electron';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from '@xenova/transformers';
import type {
  LocalWhisperProvider,
  ModelId,
  ModelStatus,
  ModelLoadProgress,
  TranscribeResult,
  TranscribeOptions,
  TranscribeChunk
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
 */
function getBundledModelPath(huggingFaceRepo: string): string | null {
  const bundledDir = getBundledModelsDir();
  const [org, name] = huggingFaceRepo.split('/');
  const modelPath = join(bundledDir, org, name);

  if (!existsSync(modelPath)) return null;

  try {
    const files = readdirSync(modelPath);
    const hasOnnx = files.some(f => f.endsWith('.onnx') || f === 'onnx');
    return hasOnnx ? modelPath : null;
  } catch {
    return null;
  }
}

/**
 * ONNX Whisper Provider using transformers.js
 */
export class ONNXWhisperProvider implements LocalWhisperProvider {
  private transcriber: AutomaticSpeechRecognitionPipeline | null = null;
  private _status: ModelStatus = 'unloaded';

  readonly modelId: ModelId;

  onProgress?: (progress: ModelLoadProgress) => void;
  onError?: (error: Error) => void;

  constructor(modelId: ModelId = 'whisper-base') {
    this.modelId = modelId;
  }

  get status(): ModelStatus {
    return this._status;
  }

  async load(): Promise<void> {
    if (this._status === 'ready') {
      return;
    }

    if (this._status === 'loading') {
      throw new Error('Model is already loading');
    }

    try {
      this._status = 'loading';

      const modelInfo = MODELS[this.modelId];
      if (!modelInfo || modelInfo.type !== 'whisper') {
        throw new Error(`Invalid whisper model: ${this.modelId}`);
      }

      // Check for bundled model first
      if (modelInfo.bundled) {
        const bundledPath = getBundledModelPath(modelInfo.huggingFaceRepo);
        if (bundledPath) {
          console.log(`[ONNXWhisperProvider] Using bundled model: ${bundledPath}`);
          env.localModelPath = getBundledModelsDir();
        }
      }

      // Fall back to cache directory
      if (!env.localModelPath) {
        const cacheDir = `${app.getPath('userData')}/models`;
        env.cacheDir = cacheDir;
      }

      this.onProgress?.({ stage: 'load', percent: 0 });

      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        modelInfo.huggingFaceRepo,
        {
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
        }
      );

      this._status = 'ready';
      this.onProgress?.({ stage: 'warmup', percent: 100 });
      console.log(`[ONNXWhisperProvider] Model loaded: ${this.modelId}`);
    } catch (error) {
      this._status = 'error';
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  async transcribe(audio: Float32Array, options?: TranscribeOptions): Promise<TranscribeResult> {
    if (this._status !== 'ready' || !this.transcriber) {
      throw new Error('Model not loaded. Call load() first.');
    }

    console.log(`[ONNXWhisperProvider] Transcribing ${audio.length} samples`);

    const result = await this.transcriber(audio, {
      language: options?.language,
      task: options?.task || 'transcribe',
      return_timestamps: true
    });

    // Handle result format from transformers.js
    // Result can be string or object with text property
    const text = typeof result === 'string' ? result : (result as any).text || '';
    const chunks = typeof result === 'object' && !Array.isArray(result) ? (result as any).chunks : undefined;

    return {
      text: text.trim(),
      segments: chunks?.map((chunk: any) => ({
        start: chunk.timestamp?.[0] || 0,
        end: chunk.timestamp?.[1] || 0,
        text: chunk.text || ''
      }))
    };
  }

  async *transcribeStream(audio: AsyncIterable<Float32Array>): AsyncIterable<TranscribeChunk> {
    // For now, collect all chunks and transcribe at once
    // Streaming support can be added later
    const chunks: Float32Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const result = await this.transcribe(combined);
    yield { text: result.text, isFinal: true };
  }

  async unload(): Promise<void> {
    if (this.transcriber) {
      this.transcriber = null;
    }
    this._status = 'unloaded';
    console.log(`[ONNXWhisperProvider] Model unloaded: ${this.modelId}`);
  }
}
