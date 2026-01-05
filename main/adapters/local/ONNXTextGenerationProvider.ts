/**
 * ONNX-based text generation provider for Electron
 *
 * Uses transformers.js with onnxruntime-node for local LLM inference.
 * Implements LocalTextGenerationProvider from @local/core.
 */

import { app } from 'electron';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { pipeline, env } from '@huggingface/transformers';
import type {
  LocalTextGenerationProvider,
  TextGenModelId,
  ModelStatus,
  ModelLoadProgress,
  ChatMessage,
  TextGenerationOptions
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
 * Apply chat template to messages for instruction-tuned models
 */
function applyChatTemplate(messages: ChatMessage[], modelId: string): string {
  // Simple chat template for instruction models
  // Most models expect: <|system|>\n{system}\n<|user|>\n{user}\n<|assistant|>\n
  let prompt = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      prompt += `<|system|>\n${msg.content}\n`;
    } else if (msg.role === 'user') {
      prompt += `<|user|>\n${msg.content}\n`;
    } else if (msg.role === 'assistant') {
      prompt += `<|assistant|>\n${msg.content}\n`;
    }
  }

  // Add assistant prefix for generation
  prompt += '<|assistant|>\n';

  return prompt;
}

/**
 * ONNX Text Generation Provider using transformers.js
 *
 * Provides local LLM chat capabilities without requiring external services.
 *
 * @example
 * ```typescript
 * const provider = new ONNXTextGenerationProvider('granite-3.3-2b-instruct');
 *
 * provider.onProgress = (progress) => {
 *   console.log(`Loading: ${progress.percent}%`);
 * };
 *
 * await provider.load();
 *
 * const response = await provider.chat([
 *   { role: 'user', content: 'Hello!' }
 * ], {
 *   onStream: (chunk) => console.log(chunk)
 * });
 *
 * await provider.unload();
 * ```
 */
export class ONNXTextGenerationProvider implements LocalTextGenerationProvider {
  private generator: any = null;
  private tokenizer: any = null;
  private _status: ModelStatus = 'unloaded';

  readonly modelId: TextGenModelId;

  onProgress?: (progress: ModelLoadProgress) => void;
  onError?: (error: Error) => void;

  constructor(modelId: TextGenModelId = 'granite-4.0-350m') {
    this.modelId = modelId;
  }

  get status(): ModelStatus {
    return this._status;
  }

  /**
   * Load the model into memory
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
      if (!modelInfo || modelInfo.type !== 'text-generation') {
        throw new Error(`Invalid text generation model: ${this.modelId}`);
      }

      // Check for bundled model first
      if (modelInfo.bundled) {
        const bundledPath = getBundledModelPath(modelInfo.huggingFaceRepo);
        if (bundledPath) {
          console.log(`[ONNXTextGenerationProvider] Using bundled model: ${bundledPath}`);
          env.localModelPath = getBundledModelsDir();
        }
      }

      // Fall back to cache directory for downloaded models
      if (!env.localModelPath) {
        const cacheDir = `${app.getPath('userData')}/models`;
        env.cacheDir = cacheDir;
      }

      this.onProgress?.({ stage: 'load', percent: 0 });

      console.log(`[ONNXTextGenerationProvider] Loading pipeline for: ${modelInfo.huggingFaceRepo}`);

      // Load text generation pipeline
      // Note: Type cast needed due to complex union types in transformers.js v3
      this.generator = await (pipeline as any)('text-generation', modelInfo.huggingFaceRepo, {
        progress_callback: (progress: { status: string; progress?: number; loaded?: number; total?: number; file?: string }) => {
          console.log(`[ONNXTextGenerationProvider] Progress: ${progress.status} ${progress.progress?.toFixed(1) ?? ''}% ${progress.file ?? ''}`);
          if (progress.status === 'download' || progress.status === 'progress') {
            this._status = 'downloading';
            this.onProgress?.({
              stage: 'download',
              percent: progress.progress ?? 0,
              bytesLoaded: progress.loaded,
              bytesTotal: progress.total
            });
          } else if (progress.status === 'ready' || progress.status === 'done') {
            this.onProgress?.({ stage: 'load', percent: 100 });
          }
        }
      });

      this._status = 'ready';
      this.onProgress?.({ stage: 'warmup', percent: 100 });
      console.log(`[ONNXTextGenerationProvider] Model loaded: ${this.modelId}`);
    } catch (error) {
      this._status = 'error';
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Unload the model from memory
   */
  async unload(): Promise<void> {
    if (this.generator) {
      // transformers.js doesn't have explicit dispose
      this.generator = null;
      this.tokenizer = null;
    }
    this._status = 'unloaded';
    console.log(`[ONNXTextGenerationProvider] Model unloaded: ${this.modelId}`);
  }

  /**
   * Generate a chat response
   *
   * Note: Streaming is not yet supported with @xenova/transformers.
   * The onStream callback option is ignored for now.
   */
  async chat(messages: ChatMessage[], options?: TextGenerationOptions): Promise<string> {
    if (this._status !== 'ready' || !this.generator) {
      throw new Error('Model not loaded. Call load() first.');
    }

    // Apply chat template to format messages
    const prompt = applyChatTemplate(messages, this.modelId);

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.95,
        top_k: options?.topK ?? 40,
        do_sample: true,
        // Stop at end of assistant response
        stop_strings: ['<|user|>', '<|system|>', '<|end|>'],
      }) as Array<{ generated_text: string }>;

      // Extract the generated text
      const generatedText = result[0].generated_text;

      // Remove the prompt from the response
      const responseStart = generatedText.lastIndexOf('<|assistant|>\n');
      if (responseStart !== -1) {
        const response = generatedText.slice(responseStart + '<|assistant|>\n'.length).trim();
        // Call onStream with the full response if provided (for compatibility)
        if (options?.onStream) {
          options.onStream(response);
        }
        return response;
      }

      const response = generatedText.slice(prompt.length).trim();
      if (options?.onStream) {
        options.onStream(response);
      }
      return response;
    } catch (error) {
      console.error('[ONNXTextGenerationProvider] Generation error:', error);
      throw error;
    }
  }

  /**
   * Check if structured output is supported
   */
  supportsStructuredOutput(): boolean {
    // transformers.js doesn't have native grammar-constrained generation yet
    // We can add JSON extraction post-processing if needed
    return false;
  }
}
