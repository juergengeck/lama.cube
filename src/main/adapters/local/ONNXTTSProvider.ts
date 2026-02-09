/**
 * STUB: ONNX TTS Provider (disabled)
 *
 * Main process TTS is disabled because it requires onnxruntime-node which cannot be
 * bundled with electron-builder. Use the renderer-side TTS worker instead
 * (src/renderer/workers/tts.worker.ts) which uses WebAssembly.
 *
 * The renderer TTS worker uses kokoro-js with WebGPU/WASM and works in packaged apps.
 */

import type {
  LocalTTSProvider,
  TTSModelId,
  ModelStatus,
  ModelLoadProgress,
  TTSSynthesizeOptions,
  TTSSynthesizeResult
} from '@refinio/local.core';

/**
 * STUB ONNX TTS Provider - throws error directing users to renderer TTS
 *
 * Main process TTS is disabled. Use renderer-side TTS worker instead.
 */
export class ONNXTTSProvider implements LocalTTSProvider {
  readonly modelId: TTSModelId;
  private _sampleRate = 24000;

  onProgress?: (progress: ModelLoadProgress) => void;
  onError?: (error: Error) => void;

  constructor(modelId: TTSModelId = 'kokoro' as TTSModelId) {
    this.modelId = modelId;
  }

  get status(): ModelStatus {
    return 'unloaded';
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  async load(): Promise<void> {
    const error = new Error(
      'Main process TTS is disabled. Use renderer-side TTS worker instead. ' +
      'See src/renderer/workers/tts.worker.ts for browser-based TTS with WebGPU/WASM support.'
    );
    this.onError?.(error);
    throw error;
  }

  async unload(): Promise<void> {
    // No-op
  }

  async synthesize(_text: string, _options?: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    throw new Error('Main process TTS is disabled. Use renderer-side TTS worker instead.');
  }

  async preloadVoice(_audioUrl: string): Promise<void> {
    throw new Error('Main process TTS is disabled. Use renderer-side TTS worker instead.');
  }

  supportsVoiceCloning(): boolean {
    return false;
  }
}
