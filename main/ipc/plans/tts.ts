/**
 * TTS IPC Plan Handlers
 *
 * Provides IPC handlers for Text-to-Speech using ONNXTTSProvider.
 * Model files are stored as blobs in ONE.core for persistence.
 *
 * Uses platform-agnostic TTSModelDownloadPlan from lama.core with
 * Node.js-specific NodeBlobCaptureProvider for blob storage.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ONNXTTSProvider } from '../../adapters/local/ONNXTTSProvider.js';
import { getTTSModels, MODELS } from '@local/core';
import type { TTSModelId, TTSSynthesizeOptions, ModelId } from '@local/core';
import type { TTSObjectManager, TTSObject } from '@lama/core/models/TTSObjectManager.js';
import { TTSModelDownloadPlan } from '@lama/core/plans/TTSModelDownloadPlan.js';

// Singleton TTS provider instance
let ttsProvider: ONNXTTSProvider | null = null;

// TTSObjectManager instance (injected from node-one-core)
let ttsObjectManager: TTSObjectManager | null = null;

// TTSModelDownloadPlan instance (initialized when manager is set)
let downloadPlan: TTSModelDownloadPlan | null = null;

// Default TTS model to auto-load on startup
// Note: 'kokoro' is available and works; 'chatterbox-turbo' model is not available on HuggingFace
const DEFAULT_TTS_MODEL: TTSModelId = 'kokoro';

/**
 * Set the TTSObjectManager instance
 * Called during initialization from node-one-core
 */
export function setTTSObjectManager(manager: TTSObjectManager): void {
  ttsObjectManager = manager;
  downloadPlan = new TTSModelDownloadPlan({ ttsObjectManager: manager });
  console.log('[TTS IPC] TTSObjectManager and TTSModelDownloadPlan initialized');

  // Auto-load default TTS model in background
  autoLoadDefaultTTSModel().catch(err => {
    console.warn('[TTS IPC] Auto-load failed (will retry on demand):', err.message);
  });
}

/**
 * Auto-load the default TTS model on startup
 * Downloads if not installed, then loads the provider
 */
async function autoLoadDefaultTTSModel(): Promise<void> {
  const modelId = DEFAULT_TTS_MODEL;
  const modelInfo = MODELS[modelId];

  if (!modelInfo || modelInfo.type !== 'tts') {
    console.warn(`[TTS IPC] Invalid default TTS model: ${modelId}`);
    return;
  }

  console.log(`[TTS IPC] Auto-loading default TTS model: ${modelId}`);

  // Check if already loaded
  if (ttsProvider && ttsProvider.modelId === modelId && ttsProvider.status === 'ready') {
    console.log(`[TTS IPC] Default model already loaded: ${modelId}`);
    return;
  }

  // Download if not installed (TTSModelDownloadPlan handles checking if already downloaded)
  if (downloadPlan) {
    console.log(`[TTS IPC] Checking/downloading model: ${modelId}`);
    const downloadResult = await downloadPlan.download({
      id: modelId,
      name: modelInfo.name,
      huggingFaceRepo: modelInfo.huggingFaceRepo,
      sizeBytes: modelInfo.sizeBytes,
      sampleRate: modelInfo.sampleRate,
      supportsVoiceCloning: modelInfo.supportsVoiceCloning,
      defaultVoiceUrl: modelInfo.defaultVoiceUrl,
    });

    if (!downloadResult.success) {
      console.warn(`[TTS IPC] Download failed: ${downloadResult.error}`);
      // Don't throw - model will be downloaded on demand later
      return;
    }
  }

  // Create and load provider
  console.log(`[TTS IPC] Loading TTS provider: ${modelId}`);
  ttsProvider = new ONNXTTSProvider(modelId);
  await ttsProvider.load();

  console.log(`[TTS IPC] ✅ Default TTS model auto-loaded: ${modelId} (${ttsProvider.status})`);
}

interface TTSLoadParams {
  modelId: TTSModelId;
}

interface TTSSynthesizeParams {
  text: string;
  options?: TTSSynthesizeOptions;
}

interface TTSPreloadVoiceParams {
  audioUrl: string;
}

/**
 * Get current TTS status
 */
async function getStatus(_event: IpcMainInvokeEvent): Promise<{
  status: string;
  modelId: string | null;
  sampleRate: number | null;
}> {
  return {
    status: ttsProvider?.status ?? 'unloaded',
    modelId: ttsProvider?.modelId ?? null,
    sampleRate: ttsProvider?.sampleRate ?? null
  };
}

/**
 * Load TTS model
 */
async function load(
  event: IpcMainInvokeEvent,
  params: TTSLoadParams
): Promise<{ modelId: string; sampleRate: number }> {
  const { modelId } = params;

  console.log(`[TTS IPC] Loading model: ${modelId}`);

  // Check if already loaded with same model
  if (ttsProvider && ttsProvider.modelId === modelId && ttsProvider.status === 'ready') {
    console.log(`[TTS IPC] Model already loaded: ${modelId}`);
    return {
      modelId: ttsProvider.modelId,
      sampleRate: ttsProvider.sampleRate
    };
  }

  // Unload existing provider if different model
  if (ttsProvider && ttsProvider.modelId !== modelId) {
    await ttsProvider.unload();
    ttsProvider = null;
  }

  // Create new provider if needed
  if (!ttsProvider) {
    ttsProvider = new ONNXTTSProvider(modelId);

    // Set up progress callback to send updates to renderer
    ttsProvider.onProgress = (progress) => {
      event.sender.send('tts:progress', {
        stage: progress.stage,
        percent: progress.percent
      });
    };

    ttsProvider.onError = (error) => {
      console.error('[TTS IPC] Provider error:', error);
      event.sender.send('tts:error', { message: error.message });
    };
  }

  // Load if not ready
  if (ttsProvider.status !== 'ready') {
    // Update status in ONE.core
    if (ttsObjectManager) {
      await ttsObjectManager.updateStatus(modelId, 'loading');
    }

    await ttsProvider.load();

    // Mark as ready and track usage
    if (ttsObjectManager) {
      await ttsObjectManager.updateStatus(modelId, 'ready');
      await ttsObjectManager.markUsed(modelId);
    }
  }

  return {
    modelId: ttsProvider.modelId,
    sampleRate: ttsProvider.sampleRate
  };
}

/**
 * Synthesize speech from text
 */
async function synthesize(
  _event: IpcMainInvokeEvent,
  params: TTSSynthesizeParams
): Promise<{ audio: Float32Array; sampleRate: number }> {
  const { text, options } = params;

  if (!ttsProvider || ttsProvider.status !== 'ready') {
    throw new Error('TTS model not loaded. Call tts:load first.');
  }

  console.log(`[TTS IPC] Synthesizing: "${text.substring(0, 50)}..."`);

  const result = await ttsProvider.synthesize(text, options);

  return {
    audio: result.audio,
    sampleRate: result.sampleRate
  };
}

/**
 * Pre-load a voice for faster synthesis
 */
async function preloadVoice(
  _event: IpcMainInvokeEvent,
  params: TTSPreloadVoiceParams
): Promise<void> {
  const { audioUrl } = params;

  if (!ttsProvider || ttsProvider.status !== 'ready') {
    throw new Error('TTS model not loaded. Call tts:load first.');
  }

  await ttsProvider.preloadVoice(audioUrl);
}

/**
 * Unload TTS model
 */
async function unload(_event: IpcMainInvokeEvent): Promise<void> {
  if (ttsProvider) {
    const modelId = ttsProvider.modelId;
    await ttsProvider.unload();
    ttsProvider = null;

    // Update status in ONE.core
    if (ttsObjectManager && modelId) {
      await ttsObjectManager.updateStatus(modelId, 'installed');
    }
  }
  console.log('[TTS IPC] Model unloaded');
}

/**
 * Check if voice cloning is supported
 */
async function supportsVoiceCloning(_event: IpcMainInvokeEvent): Promise<boolean> {
  return ttsProvider?.supportsVoiceCloning() ?? false;
}

// ==================== Model Management ====================

interface TTSModelState {
  id: string;
  name: string;
  sizeBytes: number;
  status: 'not_installed' | 'downloading' | 'installed' | 'loading' | 'ready';
  downloadProgress?: number;
}

/**
 * List available TTS models with their status
 * Uses TTSObjectManager to check installation status from ONE.core
 */
async function listModels(_event: IpcMainInvokeEvent): Promise<{
  success: boolean;
  data?: TTSModelState[];
  error?: string;
}> {
  try {
    const ttsModels = getTTSModels();
    const models: TTSModelState[] = [];

    for (const model of ttsModels) {
      // Check ONE.core for installation status
      let status: TTSModelState['status'] = 'not_installed';
      let storedObject: TTSObject | null = null;

      if (ttsObjectManager) {
        storedObject = await ttsObjectManager.getByName(model.id);
        if (storedObject) {
          status = storedObject.status as TTSModelState['status'];
        }
      }

      // Check if currently loaded
      const isLoaded = ttsProvider?.modelId === model.id && ttsProvider?.status === 'ready';
      if (isLoaded) {
        status = 'ready';
      }

      models.push({
        id: model.id,
        name: model.name,
        sizeBytes: model.sizeBytes,
        status,
        downloadProgress: storedObject?.downloadProgress
      });
    }

    return { success: true, data: models };
  } catch (error) {
    console.error('[TTS] Failed to list models:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Download a TTS model using platform-agnostic TTSModelDownloadPlan
 */
async function download(
  event: IpcMainInvokeEvent,
  params: { modelId: string }
): Promise<{ success: boolean; error?: string }> {
  const { modelId } = params;
  const modelInfo = MODELS[modelId as ModelId];

  if (!modelInfo || modelInfo.type !== 'tts') {
    return { success: false, error: `Invalid TTS model: ${modelId}` };
  }

  if (!downloadPlan) {
    return { success: false, error: 'TTSModelDownloadPlan not initialized' };
  }

  // Set up callbacks for this request
  downloadPlan.setCallbacks({
    onProgress: (progress) => {
      if (progress.stage === 'downloading') {
        event.sender.send('tts:downloadProgress', { modelId, progress: progress.percent });
      }
    },
    onError: (error) => {
      console.error(`[TTS IPC] Download error:`, error);
      event.sender.send('tts:error', { message: error.message });
    },
  });

  // Use the platform-agnostic download plan
  const result = await downloadPlan.download({
    id: modelId,
    name: modelInfo.name,
    huggingFaceRepo: modelInfo.huggingFaceRepo,
    sampleRate: modelInfo.sampleRate,
    sizeBytes: modelInfo.sizeBytes,
    supportsVoiceCloning: modelInfo.supportsVoiceCloning,
    defaultVoiceUrl: modelInfo.defaultVoiceUrl,
  });

  if (result.success) {
    event.sender.send('tts:downloadProgress', { modelId, progress: 100 });
  }

  return result;
}

/**
 * Delete a TTS model (remove from ONE.core)
 */
async function deleteModel(
  _event: IpcMainInvokeEvent,
  params: { modelId: string }
): Promise<{ success: boolean; error?: string }> {
  const { modelId } = params;

  if (!ttsObjectManager) {
    return { success: false, error: 'TTSObjectManager not initialized' };
  }

  try {
    // Unload if currently loaded
    if (ttsProvider?.modelId === modelId) {
      await ttsProvider.unload();
      ttsProvider = null;
    }

    // Delete from ONE.core
    await ttsObjectManager.delete(modelId);

    console.log(`[TTS] Deleted model: ${modelId}`);
    return { success: true };
  } catch (error) {
    console.error(`[TTS] Delete failed for ${modelId}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

// Export all handlers
export const ttsPlans = {
  'tts:getStatus': getStatus,
  'tts:load': load,
  'tts:synthesize': synthesize,
  'tts:preloadVoice': preloadVoice,
  'tts:unload': unload,
  'tts:supportsVoiceCloning': supportsVoiceCloning,
  'tts:listModels': listModels,
  'tts:download': download,
  'tts:delete': deleteModel
};

export default ttsPlans;
