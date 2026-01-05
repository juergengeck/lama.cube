/**
 * Local Models IPC Handlers
 * Manages embedding and speech-to-text model lifecycle
 */

import { IpcMainInvokeEvent, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { MODELS, getTextGenerationModels } from '@local/core';
import type { ModelId, TextGenModelId, ChatMessage, TextGenerationOptions } from '@local/core';
import { ONNXTextGenerationProvider } from '../../adapters/local/ONNXTextGenerationProvider.js';
import { getInferenceManager, type InferenceStatus } from '../../core/inference-manager.js';
import { ONNXWhisperProvider } from '../../adapters/local/ONNXWhisperProvider.js';

interface LocalModelState {
  id: string;
  name: string;
  type: 'embedding' | 'whisper' | 'text-generation' | 'tts';
  sizeBytes: number;
  status: 'not_installed' | 'downloading' | 'installed' | 'loading' | 'ready' | 'error';
  downloadProgress?: number;
  error?: string;
  bundled: boolean;
  familyName?: string;
  contextLength?: number;
}

// Track model states
const modelStates = new Map<string, LocalModelState>();

// User's download directory for additional models
function getModelsDir(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'models');
}

// Bundled models directory (in app resources)
function getBundledModelsDir(): string {
  // In production: resources/models
  // In development: ./models
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(process.cwd(), 'models');
  }
  return path.join(process.resourcesPath, 'models');
}

// transformers.js cache directory (where models are actually stored)
// In Node.js/Electron, transformers.js caches to: node_modules/@huggingface/transformers/.cache/
function getTransformersCacheDir(): string {
  // Find the @huggingface/transformers package cache directory
  // Using process.cwd() to find the project root, then navigate to the cache
  try {
    const isDev = !app.isPackaged;

    if (isDev) {
      // Dev mode: go up from packages/lama.cube to find node_modules at root
      // e.g., /Users/gecko/src/lama/packages/lama.cube -> /Users/gecko/src/lama
      const cwd = process.cwd();
      const projectRoot = path.resolve(cwd, '..', '..');
      return path.join(projectRoot, 'node_modules', '@huggingface', 'transformers', '.cache');
    } else {
      // Production: use userData path
      return path.join(app.getPath('userData'), 'models');
    }
  } catch {
    // Fallback to userData path if something fails
    return path.join(app.getPath('userData'), 'models');
  }
}

/**
 * Check if a bundled model exists
 * Bundled models are stored as: models/Xenova/whisper-tiny
 */
async function checkBundledModel(huggingFaceRepo: string): Promise<string | null> {
  try {
    const bundledDir = getBundledModelsDir();
    const [org, name] = huggingFaceRepo.split('/');
    const modelPath = path.join(bundledDir, org, name);

    const stat = await fs.stat(modelPath);
    if (!stat.isDirectory()) return null;

    // Check for onnx files
    const files = await fs.readdir(modelPath);
    const hasOnnx = files.some(f => f.endsWith('.onnx') || f === 'onnx');
    return hasOnnx ? modelPath : null;
  } catch {
    return null;
  }
}

function getModelPath(modelId: string): string {
  return path.join(getModelsDir(), modelId);
}

async function ensureModelsDir(): Promise<void> {
  const dir = getModelsDir();
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Check if a model is installed in the transformers.js cache
 * In Node.js, models are stored as: {org}/{model-name}/ with onnx/ subdirectory
 */
async function checkModelInTransformersCache(huggingFaceRepo: string): Promise<boolean> {
  try {
    const cacheDir = getTransformersCacheDir();
    // transformers.js stores models as: {org}/{model-name}/
    // e.g., onnx-community/granite-4.0-350m-ONNX-web/onnx/
    const [org, name] = huggingFaceRepo.split('/');
    const modelCachePath = path.join(cacheDir, org, name);

    const stat = await fs.stat(modelCachePath);
    if (!stat.isDirectory()) return false;

    // Check if there's an onnx/ directory with model files
    const onnxPath = path.join(modelCachePath, 'onnx');
    try {
      const onnxStat = await fs.stat(onnxPath);
      if (onnxStat.isDirectory()) {
        const files = await fs.readdir(onnxPath);
        return files.some(f => f.endsWith('.onnx'));
      }
    } catch {
      // Try checking for .onnx files directly in the model directory
      const files = await fs.readdir(modelCachePath);
      return files.some(f => f.endsWith('.onnx'));
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if model is installed (bundled, transformers cache, or custom dir)
 */
async function checkModelInstalled(modelId: string): Promise<boolean> {
  const modelInfo = MODELS[modelId as ModelId];
  if (!modelInfo) return false;

  // Check bundled models first (for bundled models)
  if (modelInfo.bundled) {
    const bundledPath = await checkBundledModel(modelInfo.huggingFaceRepo);
    if (bundledPath) return true;
  }

  // Check transformers.js cache (where downloaded models live)
  if (await checkModelInTransformersCache(modelInfo.huggingFaceRepo)) {
    return true;
  }

  // Fallback: check our custom download directory
  try {
    const modelPath = getModelPath(modelId);
    const stat = await fs.stat(modelPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function initializeModelStates(): Promise<void> {
  const allModels = Object.values(MODELS);

  for (const model of allModels) {
    const installed = await checkModelInstalled(model.id);
    modelStates.set(model.id, {
      id: model.id,
      name: model.name,
      type: model.type,
      sizeBytes: model.sizeBytes,
      status: installed ? 'installed' : 'not_installed',
      bundled: model.bundled,
      familyName: model.familyName,
      contextLength: model.contextLength
    });
  }

  console.log('[LocalModels] Initialized model states:',
    Array.from(modelStates.values()).map(m => `${m.id}: ${m.status}`).join(', '));
}

// Initialize on module load
void initializeModelStates();

// Singleton Whisper provider for transcription
let whisperProvider: ONNXWhisperProvider | null = null;

// Singleton text generation provider
let textGenProvider: ONNXTextGenerationProvider | null = null;
let loadedTextGenModelId: string | null = null;
let textGenUnloadTimeout: NodeJS.Timeout | null = null;
const TEXT_GEN_UNLOAD_DELAY_MS = 5 * 60 * 1000; // 5 minutes

const localModelsPlans = {
  /**
   * List all available local models with their status
   */
  async list(event: IpcMainInvokeEvent): Promise<{ success: boolean; data?: LocalModelState[]; error?: string }> {
    try {
      // Refresh install status
      for (const [id, state] of modelStates) {
        if (state.status !== 'downloading' && state.status !== 'loading') {
          const installed = await checkModelInstalled(id);
          state.status = installed ? 'installed' : 'not_installed';
        }
      }

      const models = Array.from(modelStates.values());
      return { success: true, data: models };
    } catch (error) {
      console.error('[LocalModels] Failed to list models:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Download a model from HuggingFace using transformers.js
   *
   * Note: transformers.js automatically downloads models on first use.
   * This function triggers that download by attempting to load the model.
   */
  async download(
    event: IpcMainInvokeEvent,
    params: { modelId: string }
  ): Promise<{ success: boolean; error?: string }> {
    const { modelId } = params;
    const modelInfo = MODELS[modelId as ModelId];

    if (!modelInfo) {
      return { success: false, error: `Unknown model: ${modelId}` };
    }

    const state = modelStates.get(modelId);
    if (!state) {
      return { success: false, error: `Model state not found: ${modelId}` };
    }

    if (state.status === 'downloading') {
      return { success: false, error: 'Download already in progress' };
    }

    try {
      state.status = 'downloading';
      state.downloadProgress = 0;
      event.sender.send('localModels:progress', { modelId, progress: 0 });

      console.log(`[LocalModels] Starting download: ${modelId} from ${modelInfo.huggingFaceRepo}`);

      // Import transformers.js dynamically
      const { pipeline, env } = await import('@huggingface/transformers');

      // Configure transformers.js
      env.allowLocalModels = true;
      env.useBrowserCache = false;

      // Check for bundled model first
      if (modelInfo.bundled) {
        const bundledPath = await checkBundledModel(modelInfo.huggingFaceRepo);
        if (bundledPath) {
          console.log(`[LocalModels] Using bundled model: ${bundledPath}`);
          // Set localModelPath to use bundled models
          env.localModelPath = getBundledModelsDir();
        }
      }

      // Set up progress callback
      const progressCallback = (progress: any) => {
        if (progress.status === 'progress' && progress.progress !== undefined) {
          const percent = Math.round(progress.progress);
          state.downloadProgress = percent;
          event.sender.send('localModels:progress', { modelId, progress: percent });
        }
      };

      // Load the model - this triggers the download
      if (modelInfo.type === 'embedding') {
        await pipeline('feature-extraction', modelInfo.huggingFaceRepo, {
          progress_callback: progressCallback
        });
      } else if (modelInfo.type === 'whisper') {
        await pipeline('automatic-speech-recognition', modelInfo.huggingFaceRepo, {
          progress_callback: progressCallback
        });
      } else if (modelInfo.type === 'tts') {
        // TTS models are handled via tts:download IPC handler in tts.ts
        throw new Error('Use tts:download instead of localModels:download for TTS models');
      }

      state.status = 'installed';
      state.downloadProgress = undefined;
      event.sender.send('localModels:progress', { modelId, progress: 100 });

      console.log(`[LocalModels] Download complete: ${modelId}`);
      return { success: true };
    } catch (error) {
      console.error(`[LocalModels] Download failed for ${modelId}:`, error);
      state.status = 'error';
      state.error = (error as Error).message;
      state.downloadProgress = undefined;
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Delete a downloaded model
   */
  async delete(
    event: IpcMainInvokeEvent,
    params: { modelId: string }
  ): Promise<{ success: boolean; error?: string }> {
    const { modelId } = params;
    const state = modelStates.get(modelId);

    if (!state) {
      return { success: false, error: `Model not found: ${modelId}` };
    }

    if (state.bundled) {
      return { success: false, error: 'Cannot delete bundled models' };
    }

    try {
      const modelPath = getModelPath(modelId);
      await fs.rm(modelPath, { recursive: true, force: true });

      state.status = 'not_installed';
      state.error = undefined;

      console.log(`[LocalModels] Deleted model: ${modelId}`);
      return { success: true };
    } catch (error) {
      console.error(`[LocalModels] Failed to delete ${modelId}:`, error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Get status of a specific model
   */
  async getStatus(
    event: IpcMainInvokeEvent,
    params: { modelId: string }
  ): Promise<{ success: boolean; data?: LocalModelState; error?: string }> {
    const { modelId } = params;
    const state = modelStates.get(modelId);

    if (!state) {
      return { success: false, error: `Model not found: ${modelId}` };
    }

    // Refresh install status if not actively downloading/loading
    if (state.status !== 'downloading' && state.status !== 'loading') {
      const installed = await checkModelInstalled(modelId);
      state.status = installed ? 'installed' : 'not_installed';
    }

    return { success: true, data: state };
  },

  /**
   * Get current inference status (for renderer to request on mount)
   * Fixes race condition where status events are sent before React mounts
   */
  async getInferenceStatus(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; data: InferenceStatus }> {
    try {
      const inferenceManager = getInferenceManager();
      return { success: true, data: inferenceManager.getLastStatus() };
    } catch {
      return { success: true, data: { state: 'idle', progress: 0 } };
    }
  },

  /**
   * Check if Whisper model is ready for transcription
   */
  async whisperIsReady(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; data: boolean; error?: string }> {
    try {
      // Check if whisper provider exists and is ready
      if (!whisperProvider) {
        // Try to initialize with default whisper model
        const whisperModelId = 'whisper-base' as ModelId;
        const modelInfo = MODELS[whisperModelId];

        if (!modelInfo || modelInfo.type !== 'whisper') {
          return { success: true, data: false };
        }

        // Check if model is installed before loading
        const installed = await checkModelInstalled(whisperModelId);
        if (!installed) {
          console.log('[LocalModels] Whisper model not installed yet');
          return { success: true, data: false };
        }

        // Create and load the provider
        console.log('[LocalModels] Initializing whisper provider...');
        whisperProvider = new ONNXWhisperProvider(whisperModelId);
        await whisperProvider.load();
        console.log('[LocalModels] Whisper provider ready');
      }

      return { success: true, data: whisperProvider.status === 'ready' };
    } catch (error) {
      console.error('[LocalModels] Failed to check whisper status:', error);
      return { success: false, data: false, error: (error as Error).message };
    }
  },

  /**
   * Transcribe audio using local Whisper model
   */
  async whisperTranscribe(
    _event: IpcMainInvokeEvent,
    params: { audio: number[]; language?: string }
  ): Promise<{
    success: boolean;
    data?: {
      text: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };
    error?: string;
  }> {
    try {
      if (!whisperProvider || whisperProvider.status !== 'ready') {
        return { success: false, error: 'Whisper model not loaded. Call whisperIsReady first.' };
      }

      const { audio, language } = params;

      // Convert number array to Float32Array
      const audioData = new Float32Array(audio);

      console.log(`[LocalModels] Transcribing ${audioData.length} samples...`);

      const result = await whisperProvider.transcribe(audioData, {
        language,
        task: 'transcribe'
      });

      console.log(`[LocalModels] Transcription complete: "${result.text.substring(0, 50)}..."`);

      return {
        success: true,
        data: {
          text: result.text,
          segments: result.segments
        }
      };
    } catch (error) {
      console.error('[LocalModels] Transcription failed:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // ==================== TEXT GENERATION ====================

  /**
   * List available text generation models
   */
  async listTextGenModels(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; data?: LocalModelState[]; error?: string }> {
    try {
      const textGenModels = getTextGenerationModels();
      const models: LocalModelState[] = [];

      for (const model of textGenModels) {
        const state = modelStates.get(model.id);
        if (state) {
          // Ensure loaded model shows as 'ready', not just 'installed'
          if (loadedTextGenModelId === model.id && textGenProvider?.status === 'ready') {
            state.status = 'ready';
          }
          models.push(state);
        }
      }

      return { success: true, data: models };
    } catch (error) {
      console.error('[LocalModels] Failed to list text gen models:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Load a text generation model
   */
  async loadTextGenModel(
    event: IpcMainInvokeEvent,
    params: { modelId: string }
  ): Promise<{ success: boolean; error?: string }> {
    const { modelId } = params;

    try {
      // Clear any pending unload
      if (textGenUnloadTimeout) {
        clearTimeout(textGenUnloadTimeout);
        textGenUnloadTimeout = null;
      }

      // If same model already loaded, return success
      if (textGenProvider && loadedTextGenModelId === modelId && textGenProvider.status === 'ready') {
        console.log(`[LocalModels] Text gen model already loaded: ${modelId}`);
        return { success: true };
      }

      // Unload existing model if different
      if (textGenProvider && loadedTextGenModelId !== modelId) {
        console.log(`[LocalModels] Unloading current model: ${loadedTextGenModelId}`);
        await textGenProvider.unload();
        textGenProvider = null;
        loadedTextGenModelId = null;
      }

      const modelInfo = MODELS[modelId as ModelId];
      if (!modelInfo || modelInfo.type !== 'text-generation') {
        return { success: false, error: `Invalid text generation model: ${modelId}` };
      }

      console.log(`[LocalModels] Loading text gen model: ${modelId}`);
      const state = modelStates.get(modelId);
      if (state) {
        state.status = 'loading';
      }

      textGenProvider = new ONNXTextGenerationProvider(modelId as TextGenModelId);

      // Set up progress callback
      textGenProvider.onProgress = (progress) => {
        event.sender.send('localModels:textGenProgress', { modelId, progress: progress.percent });
        if (state) {
          state.downloadProgress = progress.percent;
        }
      };

      await textGenProvider.load();
      loadedTextGenModelId = modelId;

      if (state) {
        state.status = 'ready';
        state.downloadProgress = undefined;
      }

      console.log(`[LocalModels] Text gen model loaded: ${modelId}`);
      return { success: true };
    } catch (error) {
      console.error(`[LocalModels] Failed to load text gen model ${modelId}:`, error);
      const state = modelStates.get(modelId);
      if (state) {
        state.status = 'error';
        state.error = (error as Error).message;
      }
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Unload current text generation model
   */
  async unloadTextGenModel(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (textGenUnloadTimeout) {
        clearTimeout(textGenUnloadTimeout);
        textGenUnloadTimeout = null;
      }

      if (textGenProvider) {
        const modelId = loadedTextGenModelId;
        console.log(`[LocalModels] Unloading text gen model: ${modelId}`);
        await textGenProvider.unload();
        textGenProvider = null;
        loadedTextGenModelId = null;

        if (modelId) {
          const state = modelStates.get(modelId);
          if (state) {
            state.status = 'installed';
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[LocalModels] Failed to unload text gen model:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Chat with local text generation model
   */
  async chatWithTextGen(
    event: IpcMainInvokeEvent,
    params: {
      modelId: string;
      messages: ChatMessage[];
      options?: {
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
      };
    }
  ): Promise<{ success: boolean; data?: { response: string; modelId: string }; error?: string }> {
    const { modelId, messages, options = {} } = params;

    try {
      // Load model if needed
      if (!textGenProvider || loadedTextGenModelId !== modelId) {
        const loadResult = await localModelsPlans.loadTextGenModel(event, { modelId });
        if (!loadResult.success) {
          return { success: false, error: loadResult.error };
        }
      }

      if (!textGenProvider || textGenProvider.status !== 'ready') {
        return { success: false, error: 'Text generation model not ready' };
      }

      // Reset unload timeout
      if (textGenUnloadTimeout) {
        clearTimeout(textGenUnloadTimeout);
      }
      textGenUnloadTimeout = setTimeout(async () => {
        console.log('[LocalModels] Auto-unloading text gen model due to inactivity');
        await localModelsPlans.unloadTextGenModel(event);
      }, TEXT_GEN_UNLOAD_DELAY_MS);

      console.log(`[LocalModels] Generating response with ${modelId}, ${messages.length} messages`);

      // Generate response
      const response = await textGenProvider.chat(messages, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        onStream: options.stream
          ? (chunk: string) => {
              event.sender.send('localModels:textGenStream', { modelId, chunk });
            }
          : undefined
      });

      console.log(`[LocalModels] Generated response: ${response.substring(0, 50)}...`);

      return {
        success: true,
        data: {
          response,
          modelId: loadedTextGenModelId!
        }
      };
    } catch (error) {
      console.error('[LocalModels] Text generation failed:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Get current text generation model status
   */
  async getTextGenStatus(
    _event: IpcMainInvokeEvent
  ): Promise<{
    success: boolean;
    data?: {
      loaded: boolean;
      modelId: string | null;
      status: string;
    };
    error?: string;
  }> {
    return {
      success: true,
      data: {
        loaded: textGenProvider !== null && textGenProvider.status === 'ready',
        modelId: loadedTextGenModelId,
        status: textGenProvider?.status ?? 'unloaded'
      }
    };
  }
};

export default localModelsPlans;

/**
 * Direct chat function for use by ElectronLLMPlatform (bypasses IPC)
 * This allows llm-manager to call local text generation directly
 */
export async function chatWithLocalDirect(
  modelId: string,
  messages: ChatMessage[],
  options: {
    onStream?: (chunk: string) => void;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  // Load model if needed
  if (!textGenProvider || loadedTextGenModelId !== modelId) {
    console.log(`[LocalModels] Loading text gen model for direct chat: ${modelId}`);

    const modelInfo = MODELS[modelId as ModelId];
    if (!modelInfo || modelInfo.type !== 'text-generation') {
      throw new Error(`Invalid text generation model: ${modelId}`);
    }

    // Unload existing model if different
    if (textGenProvider && loadedTextGenModelId !== modelId) {
      await textGenProvider.unload();
      textGenProvider = null;
      loadedTextGenModelId = null;
    }

    textGenProvider = new ONNXTextGenerationProvider(modelId as TextGenModelId);
    await textGenProvider.load();
    loadedTextGenModelId = modelId;
  }

  if (!textGenProvider || textGenProvider.status !== 'ready') {
    throw new Error('Text generation model not ready');
  }

  // Reset unload timeout
  if (textGenUnloadTimeout) {
    clearTimeout(textGenUnloadTimeout);
  }
  textGenUnloadTimeout = setTimeout(async () => {
    console.log('[LocalModels] Auto-unloading text gen model due to inactivity');
    if (textGenProvider) {
      await textGenProvider.unload();
      textGenProvider = null;
      loadedTextGenModelId = null;
    }
  }, TEXT_GEN_UNLOAD_DELAY_MS);

  console.log(`[LocalModels] Direct chat with ${modelId}, ${messages.length} messages`);

  const response = await textGenProvider.chat(messages, {
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    onStream: options.onStream
  });

  return response;
}
