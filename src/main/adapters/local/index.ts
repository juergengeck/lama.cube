/**
 * Local inference adapters for Electron
 *
 * Platform-specific implementations of @refinio/local.core interfaces:
 * - Embeddings & Text Gen: Ollama → llama.cpp fallback (no ONNX)
 * - Whisper/TTS: transformers.js with onnxruntime-node
 */

export { OllamaEmbeddingProvider } from './OllamaEmbeddingProvider.js';
export { OllamaTextGenProvider } from './OllamaTextGenProvider.js';
export { ONNXWhisperProvider } from './ONNXWhisperProvider.js';
// Note: ONNXTTSProvider is separate, used for TTS synthesis

// Re-export types from @refinio/local.core for convenience
export type {
  LocalEmbeddingProvider,
  LocalWhisperProvider,
  LocalTextGenerationProvider,
  LocalInferenceProvider,
  ModelId,
  TextGenModelId,
  ModelStatus,
  ModelLoadProgress,
  EmbeddingModel,
  ModelInfo,
  ChatMessage,
  TextGenerationOptions,
  TranscribeOptions,
  TranscribeResult,
  TranscribeSegment,
  TranscribeChunk
} from '@refinio/local.core';

export { MODELS, getBundledModels, getDownloadableModels, getTextGenerationModels } from '@refinio/local.core';
