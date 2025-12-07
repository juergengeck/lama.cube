/**
 * Local inference adapters for Electron
 *
 * Platform-specific implementations of @local/core interfaces
 * using transformers.js with onnxruntime-node.
 */

export { ONNXEmbeddingProvider } from './ONNXEmbeddingProvider.js';

// Re-export types from @local/core for convenience
export type {
  LocalEmbeddingProvider,
  LocalInferenceProvider,
  ModelId,
  ModelStatus,
  ModelLoadProgress,
  EmbeddingModel,
  ModelInfo
} from '@local/core';

export { MODELS, getBundledModels, getDownloadableModels } from '@local/core';
