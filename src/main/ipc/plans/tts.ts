/**
 * TTS IPC Plan Handlers (STUB)
 *
 * Main process TTS is disabled because it requires onnxruntime-node which cannot
 * be bundled with Electron. Use the renderer-side TTS worker instead:
 *   src/renderer/workers/tts.worker.ts
 *
 * The renderer TTS worker uses kokoro-js with WebGPU/WASM and works in packaged apps.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ONNXTTSProvider } from '../../adapters/local/ONNXTTSProvider.js';
import { getTTSModels } from '@refinio/local.core';
import type { TTSModelId, TTSSynthesizeOptions } from '@refinio/local.core';
import type { TTSObjectManager, TTSObject } from '@refinio/lama.core/models/TTSObjectManager.js';

// Note: TTSModelDownloadPlan is NOT imported because it uses kokoro-js which
// depends on onnxruntime-node. Use renderer-side TTS worker instead.

// Singleton TTS provider instance (stub)
let ttsProvider: ONNXTTSProvider | null = null;

// TTSObjectManager instance (injected from node-one-core)
let ttsObjectManager: TTSObjectManager | null = null;

// Default TTS model (used for metadata only, actual TTS is in renderer)
const DEFAULT_TTS_MODEL: TTSModelId = 'kokoro';

/**
 * Set the TTSObjectManager instance
 * Called during initialization from node-one-core
 */
export function setTTSObjectManager(manager: TTSObjectManager): void {
  ttsObjectManager = manager;
  console.log('[TTS IPC] TTSObjectManager initialized (main process TTS disabled, use renderer worker)');
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
    status: 'disabled',
    modelId: null,
    sampleRate: null
  };
}

/**
 * Load TTS model (STUB - returns error)
 */
async function load(
  _event: IpcMainInvokeEvent,
  _params: TTSLoadParams
): Promise<{ modelId: string; sampleRate: number }> {
  throw new Error(
    'Main process TTS is disabled. Use renderer-side TTS worker instead. ' +
    'See src/renderer/workers/tts.worker.ts for WebGPU/WASM-based TTS.'
  );
}

/**
 * Synthesize speech from text (STUB - returns error)
 */
async function synthesize(
  _event: IpcMainInvokeEvent,
  _params: TTSSynthesizeParams
): Promise<{ audio: Float32Array; sampleRate: number }> {
  throw new Error(
    'Main process TTS is disabled. Use renderer-side TTS worker instead. ' +
    'See src/renderer/workers/tts.worker.ts for WebGPU/WASM-based TTS.'
  );
}

/**
 * Pre-load a voice for faster synthesis (STUB - returns error)
 */
async function preloadVoice(
  _event: IpcMainInvokeEvent,
  _params: TTSPreloadVoiceParams
): Promise<void> {
  throw new Error('Main process TTS is disabled. Use renderer-side TTS worker instead.');
}

/**
 * Unload TTS model (no-op since disabled)
 */
async function unload(_event: IpcMainInvokeEvent): Promise<void> {
  ttsProvider = null;
  console.log('[TTS IPC] Unload called (no-op, main process TTS is disabled)');
}

/**
 * Check if voice cloning is supported (always false since disabled)
 */
async function supportsVoiceCloning(_event: IpcMainInvokeEvent): Promise<boolean> {
  return false;
}

// ==================== Model Management ====================

interface TTSModelState {
  id: string;
  name: string;
  sizeBytes: number;
  status: 'not_installed' | 'downloading' | 'installed' | 'loading' | 'ready' | 'disabled';
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
      let status: TTSModelState['status'] = 'disabled';
      let storedObject: TTSObject | null = null;

      if (ttsObjectManager) {
        storedObject = await ttsObjectManager.getByName(model.id);
        // Mark as disabled since main process TTS doesn't work
        status = 'disabled';
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
 * Download a TTS model (STUB - returns error)
 *
 * Main process model downloading is disabled because kokoro-js/transformers.js
 * requires onnxruntime-node which cannot be bundled with Electron.
 */
async function download(
  _event: IpcMainInvokeEvent,
  params: { modelId: string }
): Promise<{ success: boolean; error?: string }> {
  const { modelId } = params;

  return {
    success: false,
    error:
      `Main process TTS model downloading is disabled. ` +
      `Reason: kokoro-js requires onnxruntime-node which cannot be bundled with Electron. ` +
      `Use the renderer-side TTS worker instead (src/renderer/workers/tts.worker.ts) ` +
      `which uses WebGPU/WASM and works in packaged apps.`
  };
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
