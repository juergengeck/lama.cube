/**
 * STUB: ONNX Whisper Provider (disabled)
 *
 * Main process speech-to-text is disabled because it requires onnxruntime-node
 * which cannot be bundled with electron-builder.
 *
 * Alternatives:
 * 1. Use Ollama with a Whisper model for local STT
 * 2. Use external STT APIs (Google, Azure, etc.)
 * 3. Implement a renderer-side STT worker using transformers.js web version
 */

import type {
  LocalWhisperProvider,
  ModelId,
  ModelStatus,
  ModelLoadProgress,
  TranscribeResult,
  TranscribeOptions,
  TranscribeChunk
} from '@refinio/local.core';

/**
 * STUB ONNX Whisper Provider - throws error explaining alternatives
 *
 * Main process STT is disabled. Use Ollama or external APIs instead.
 */
export class ONNXWhisperProvider implements LocalWhisperProvider {
  readonly modelId: ModelId;

  onProgress?: (progress: ModelLoadProgress) => void;
  onError?: (error: Error) => void;

  constructor(modelId: ModelId = 'whisper-base') {
    this.modelId = modelId;
  }

  get status(): ModelStatus {
    return 'unloaded';
  }

  async load(): Promise<void> {
    const error = new Error(
      'Main process STT (Whisper) is disabled because onnxruntime-node cannot be bundled. ' +
      'Alternatives: (1) Use Ollama with a Whisper model, (2) Use external STT APIs, ' +
      '(3) Implement renderer-side STT worker using transformers.js web/WASM version.'
    );
    this.onError?.(error);
    throw error;
  }

  async transcribe(_audio: Float32Array, _options?: TranscribeOptions): Promise<TranscribeResult> {
    throw new Error('Main process STT is disabled. Use Ollama or external APIs instead.');
  }

  async *transcribeStream(_audio: AsyncIterable<Float32Array>): AsyncIterable<TranscribeChunk> {
    throw new Error('Main process STT is disabled. Use Ollama or external APIs instead.');
  }

  async unload(): Promise<void> {
    // No-op
  }
}
