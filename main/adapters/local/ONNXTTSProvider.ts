/**
 * ONNX-based TTS provider for Electron
 *
 * Uses transformers.js v4 for local text-to-speech synthesis.
 * Supports ChatterBox models with voice cloning.
 */

import { app } from 'electron';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ChatterboxModel, ChatterboxProcessor, env } from '@huggingface/transformers';
import type {
  LocalTTSProvider,
  TTSModelId,
  ModelStatus,
  ModelLoadProgress,
  TTSSynthesizeOptions,
  TTSSynthesizeResult
} from '@local/core';

// Configure transformers.js for Electron Node.js environment
env.allowLocalModels = true;
env.useBrowserCache = false;

/**
 * Load WAV audio from URL for Node.js environment
 * transformers.js read_audio() doesn't work with URLs in Node.js
 */
async function loadAudioFromUrl(url: string, targetSampleRate: number): Promise<Float32Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return decodeWav(arrayBuffer, targetSampleRate);
}

/**
 * Decode WAV file to Float32Array
 */
function decodeWav(buffer: ArrayBuffer, targetSampleRate: number): Float32Array {
  const view = new DataView(buffer);

  // Parse WAV header
  // RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Not a valid WAV file');

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') throw new Error('Not a valid WAV file');

  // Find fmt chunk
  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset < buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
  }

  if (dataOffset === 0) throw new Error('No data chunk found');
  // audioFormat: 1 = PCM integer, 3 = IEEE float
  if (audioFormat !== 1 && audioFormat !== 3) throw new Error(`Unsupported WAV format: ${audioFormat}. Only PCM (1) and float (3) are supported.`);

  // Extract samples
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = dataSize / (bytesPerSample * numChannels);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const byteOffset = dataOffset + (i * numChannels + ch) * bytesPerSample;
      if (audioFormat === 3) {
        // IEEE float format - samples are already normalized
        if (bitsPerSample === 32) {
          sample += view.getFloat32(byteOffset, true);
        } else if (bitsPerSample === 64) {
          sample += view.getFloat64(byteOffset, true);
        }
      } else {
        // PCM integer format
        if (bitsPerSample === 16) {
          sample += view.getInt16(byteOffset, true) / 32768;
        } else if (bitsPerSample === 8) {
          sample += (view.getUint8(byteOffset) - 128) / 128;
        } else if (bitsPerSample === 32) {
          sample += view.getInt32(byteOffset, true) / 2147483648;
        }
      }
    }
    samples[i] = sample / numChannels; // Average channels to mono
  }

  // Resample if needed
  if (sampleRate !== targetSampleRate) {
    return resample(samples, sampleRate, targetSampleRate);
  }

  return samples;
}

/**
 * Simple linear resampling
 */
function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const t = srcIndex - srcIndexFloor;
    result[i] = samples[srcIndexFloor] * (1 - t) + samples[srcIndexCeil] * t;
  }

  return result;
}

// TTS Model registry - ChatterBox models for v4
const TTS_MODELS: Record<string, {
  huggingFaceRepo: string;
  sampleRate: number;
  supportsVoiceCloning: boolean;
  defaultVoiceUrl?: string;
  dtype?: string | Record<string, string>;  // Quantization dtype for model loading
}> = {
  'chatterbox-turbo': {
    huggingFaceRepo: 'spacekaren/chatterbox-turbo-webgpu',  // WebGPU-compatible with int64->int32 conversion
    sampleRate: 24000,
    supportsVoiceCloning: true,
    defaultVoiceUrl: 'https://huggingface.co/onnx-community/chatterbox-ONNX/resolve/main/default_voice.wav',
    dtype: 'q4f16'  // All components are q4f16 quantized
  },
  'chatterbox': {
    huggingFaceRepo: 'onnx-community/chatterbox-ONNX',
    sampleRate: 24000,
    supportsVoiceCloning: true,
    defaultVoiceUrl: 'https://huggingface.co/onnx-community/chatterbox-ONNX/resolve/main/default_voice.wav',
    dtype: { language_model: 'q4' }  // Only language_model has quantized version
  }
};

// Default model
const DEFAULT_MODEL: TTSModelId = 'chatterbox-turbo' as TTSModelId;

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
 * ONNX TTS Provider using transformers.js ChatterBox models
 */
export class ONNXTTSProvider implements LocalTTSProvider {
  private model: any = null;
  private processor: any = null;
  private cachedSpeakerAudio: Float32Array | null = null;
  private _status: ModelStatus = 'unloaded';
  private _sampleRate: number;

  readonly modelId: TTSModelId;

  onProgress?: (progress: ModelLoadProgress) => void;
  onError?: (error: Error) => void;

  constructor(modelId: TTSModelId = DEFAULT_MODEL) {
    this.modelId = modelId;
    const modelInfo = TTS_MODELS[modelId];
    this._sampleRate = modelInfo?.sampleRate ?? 24000;
  }

  get status(): ModelStatus {
    return this._status;
  }

  get sampleRate(): number {
    return this._sampleRate;
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

      const modelInfo = TTS_MODELS[this.modelId];
      if (!modelInfo) {
        throw new Error(`Invalid TTS model: ${this.modelId}. Available: ${Object.keys(TTS_MODELS).join(', ')}`);
      }

      // Check for bundled model first
      const bundledPath = getBundledModelPath(modelInfo.huggingFaceRepo);
      if (bundledPath) {
        console.log(`[ONNXTTSProvider] Using bundled model: ${bundledPath}`);
        env.localModelPath = getBundledModelsDir();
      }

      console.log(`[ONNXTTSProvider] Loading model: ${this.modelId} (${modelInfo.huggingFaceRepo})`);
      console.log(`[ONNXTTSProvider] dtype: ${JSON.stringify(modelInfo.dtype)}`);

      // Try to use GPU acceleration
      // Note: CoreML models require different ONNX format, so we use auto-detection
      // ONNX Runtime will use best available: CoreML (macOS), CUDA (NVIDIA), DirectML (Windows), CPU (fallback)
      const loadOptions: any = {
        // Let ONNX Runtime auto-select the best execution provider
        // device: 'auto' is not valid, so we omit it and let onnxruntime choose
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && typeof progress.progress === 'number') {
            this.onProgress?.({
              stage: 'download',
              percent: progress.progress
            });
          }
        }
      };

      // Add dtype if specified (for quantized models)
      if (modelInfo.dtype) {
        loadOptions.dtype = modelInfo.dtype;
      }

      console.log(`[ONNXTTSProvider] Loading with options:`, { dtype: loadOptions.dtype });

      // Load model and processor in parallel
      const [loadedModel, loadedProcessor] = await Promise.all([
        ChatterboxModel.from_pretrained(modelInfo.huggingFaceRepo, loadOptions),
        ChatterboxProcessor.from_pretrained(modelInfo.huggingFaceRepo)
      ]);

      this.model = loadedModel;
      this.processor = loadedProcessor;

      // Pre-load default speaker audio if available
      if (modelInfo.defaultVoiceUrl) {
        try {
          console.log(`[ONNXTTSProvider] Pre-loading default speaker audio...`);
          this.cachedSpeakerAudio = await loadAudioFromUrl(modelInfo.defaultVoiceUrl, this._sampleRate);
          console.log(`[ONNXTTSProvider] Default speaker audio loaded (${this.cachedSpeakerAudio.length} samples)`);
        } catch (e) {
          console.warn(`[ONNXTTSProvider] Failed to pre-load speaker audio:`, e);
        }
      }

      this._sampleRate = modelInfo.sampleRate;
      this._status = 'ready';
      console.log(`[ONNXTTSProvider] Model loaded: ${this.modelId}`);
    } catch (error) {
      this._status = 'error';
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
      throw err;
    }
  }

  async unload(): Promise<void> {
    this.model = null;
    this.processor = null;
    this.cachedSpeakerAudio = null;
    this._status = 'unloaded';
    console.log('[ONNXTTSProvider] Model unloaded');
  }

  async synthesize(text: string, options: TTSSynthesizeOptions = {}): Promise<TTSSynthesizeResult> {
    if (this._status !== 'ready' || !this.model || !this.processor) {
      throw new Error('Model not ready. Call load() first.');
    }

    // Sanitize text: remove emojis and special characters that may cause issues
    const sanitizedText = text
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/\s+/g, ' ')                    // Normalize whitespace
      .trim();

    if (!sanitizedText) {
      throw new Error('Text is empty after sanitization');
    }

    console.log(`[ONNXTTSProvider] Synthesizing: "${sanitizedText.substring(0, 50)}..."`);

    // Get speaker audio for voice cloning
    let speakerAudio = this.cachedSpeakerAudio;
    if (options.referenceAudioUrl) {
      speakerAudio = await loadAudioFromUrl(options.referenceAudioUrl, this._sampleRate);
    } else if (options.referenceAudioData) {
      speakerAudio = options.referenceAudioData;
    }

    // Process inputs with optional speaker audio
    const inputs = await this.processor(sanitizedText, speakerAudio);

    // Rename input_values to audio_values (processor/model key mismatch)
    if (inputs.input_values && !inputs.audio_values) {
      inputs.audio_values = inputs.input_values;
      delete inputs.input_values;
    }

    // Generate audio
    // Estimate tokens needed: ~10 tokens per word, ~5 chars per word
    // So roughly 2 tokens per character, with minimum of 256 tokens
    const estimatedTokens = Math.max(256, Math.min(1024, sanitizedText.length * 2));
    console.log(`[ONNXTTSProvider] Text length: ${sanitizedText.length}, estimated tokens: ${estimatedTokens}`);

    const generateParams = {
      ...inputs,
      max_new_tokens: estimatedTokens,
      exaggeration: options.exaggeration ?? 0.5
    };
    console.log(`[ONNXTTSProvider] Generate params:`, {
      max_new_tokens: generateParams.max_new_tokens,
      exaggeration: generateParams.exaggeration,
      inputKeys: Object.keys(inputs)
    });

    const startTime = Date.now();
    console.log(`[ONNXTTSProvider] Starting generation at ${new Date().toISOString()}`);

    const output = await this.model.generate(generateParams);

    const elapsed = Date.now() - startTime;
    console.log(`[ONNXTTSProvider] Generation took ${elapsed}ms (${(elapsed/1000).toFixed(1)}s)`);

    console.log('[ONNXTTSProvider] Generate output keys:', Object.keys(output));
    // Debug: log the structure of ort_tensor if present
    if (output.ort_tensor) {
      console.log('[ONNXTTSProvider] ort_tensor keys:', Object.keys(output.ort_tensor));
      console.log('[ONNXTTSProvider] ort_tensor.dims:', output.ort_tensor.dims);
      console.log('[ONNXTTSProvider] ort_tensor.size:', output.ort_tensor.size);
    }

    // Extract audio data - handle different output structures
    let audioData: Float32Array;
    if (output.audio?.data) {
      audioData = output.audio.data instanceof Float32Array
        ? output.audio.data
        : new Float32Array(output.audio.data);
    } else if (output.waveform?.data) {
      audioData = output.waveform.data instanceof Float32Array
        ? output.waveform.data
        : new Float32Array(output.waveform.data);
    } else if (output.ort_tensor?.cpuData) {
      // ONNX runtime tensor format (transformers.js v4+)
      audioData = output.ort_tensor.cpuData instanceof Float32Array
        ? output.ort_tensor.cpuData
        : new Float32Array(output.ort_tensor.cpuData);
    } else if (output.ort_tensor?.data) {
      audioData = output.ort_tensor.data instanceof Float32Array
        ? output.ort_tensor.data
        : new Float32Array(output.ort_tensor.data);
    } else if (output.data) {
      audioData = output.data instanceof Float32Array
        ? output.data
        : new Float32Array(output.data);
    } else {
      console.error('[ONNXTTSProvider] Unexpected output structure:', JSON.stringify(Object.keys(output)));
      // Try to find any Float32Array-like data
      for (const key of Object.keys(output)) {
        const val = output[key];
        if (val?.cpuData instanceof Float32Array) {
          console.log(`[ONNXTTSProvider] Found audio in ${key}.cpuData`);
          audioData = val.cpuData;
          break;
        }
        if (val?.data instanceof Float32Array) {
          console.log(`[ONNXTTSProvider] Found audio in ${key}.data`);
          audioData = val.data;
          break;
        }
      }
      if (!audioData!) {
        throw new Error('TTS generation returned unexpected output structure');
      }
    }

    console.log(`[ONNXTTSProvider] Generated ${audioData.length} samples at ${this._sampleRate}Hz`);

    return {
      audio: audioData,
      sampleRate: this._sampleRate
    };
  }

  async preloadVoice(audioUrl: string): Promise<void> {
    if (this._status !== 'ready') {
      throw new Error('Model not ready. Call load() first.');
    }
    this.cachedSpeakerAudio = await loadAudioFromUrl(audioUrl, this._sampleRate);
    console.log(`[ONNXTTSProvider] Voice preloaded from: ${audioUrl}`);
  }

  supportsVoiceCloning(): boolean {
    const modelInfo = TTS_MODELS[this.modelId];
    return modelInfo?.supportsVoiceCloning ?? false;
  }
}
