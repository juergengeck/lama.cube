/**
 * Local inference adapters for Electron
 *
 * Platform-specific implementations of @local/core interfaces
 * using transformers.js with onnxruntime-node.
 */

export { ONNXEmbeddingProvider } from './ONNXEmbeddingProvider.js';
export { OllamaEmbeddingProvider } from './OllamaEmbeddingProvider.js';
export { ONNXWhisperProvider } from './ONNXWhisperProvider.js';

// Re-export types from @local/core for convenience
export type {
  LocalEmbeddingProvider,
  LocalWhisperProvider,
  LocalInferenceProvider,
  ModelId,
  ModelStatus,
  ModelLoadProgress,
  EmbeddingModel,
  ModelInfo,
  TranscribeOptions,
  TranscribeResult,
  TranscribeSegment,
  TranscribeChunk
} from '@local/core';

export { MODELS, getBundledModels, getDownloadableModels } from '@local/core';
