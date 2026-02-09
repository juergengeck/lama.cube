/**
 * React hook for Text-to-Speech using Electron IPC
 *
 * Drop-in replacement for useTTS from @refinio/lama.ui that uses
 * IPC to communicate with the main process ONNXTTSProvider
 * instead of Web Workers.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { lamaBridge } from '../bridge/lama-bridge';
import type { TTSModelId, TTSSynthesizeOptions } from '@refinio/local.core';

export type TTSStatus = 'idle' | 'loading' | 'ready' | 'synthesizing' | 'error';

export interface TTSState {
  status: TTSStatus;
  modelId: TTSModelId | null;
  device: 'cpu' | null; // Electron uses CPU (no WebGPU in Node)
  progress: number;
  error: string | null;
  sampleRate: number | null;
}

export interface UseTTSElectronResult {
  state: TTSState;
  loadModel: (modelId: TTSModelId) => Promise<void>;
  synthesize: (text: string, options?: TTSSynthesizeOptions) => Promise<AudioBuffer | null>;
  preloadVoice: (audioUrl: string) => Promise<void>;
  unload: () => void;
  playAudio: (audioBuffer: AudioBuffer) => void;
  stopAudio: () => void;
}

/**
 * Convert Float32Array to AudioBuffer
 */
function createAudioBuffer(audioData: Float32Array, sampleRate: number): AudioBuffer {
  const audioContext = new AudioContext({ sampleRate });
  const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
  const channelData = new Float32Array(audioData.length);
  channelData.set(audioData);
  audioBuffer.copyToChannel(channelData, 0);
  return audioBuffer;
}

/**
 * Hook for Text-to-Speech functionality via Electron IPC
 */
export function useTTSElectron(): UseTTSElectronResult {
  const [state, setState] = useState<TTSState>({
    status: 'idle',
    modelId: null,
    device: null,
    progress: 0,
    error: null,
    sampleRate: null
  });

  // Use a ref to track status synchronously to avoid stale closure issues
  // when calling synthesize immediately after loadModel
  const statusRef = useRef<TTSStatus>('idle');

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Check if model is already loaded (e.g., from pre-loading) on mount
  useEffect(() => {
    lamaBridge.ttsGetStatus().then(status => {
      if (status.status === 'ready' && status.modelId) {
        statusRef.current = 'ready';
        setState(prev => ({
          ...prev,
          status: 'ready',
          modelId: status.modelId as TTSModelId,
          device: 'cpu',
          sampleRate: status.sampleRate,
          progress: 100
        }));
        console.log('[useTTSElectron] Model already ready from pre-load:', status.modelId);
      }
    }).catch(err => {
      console.warn('[useTTSElectron] Failed to check initial status:', err);
    });
  }, []);

  // Listen for progress events from main process
  useEffect(() => {
    const handleProgress = (data: { stage: string; percent: number }) => {
      setState(prev => ({ ...prev, progress: data.percent }));
    };

    const handleError = (data: { message: string }) => {
      statusRef.current = 'error';
      setState(prev => ({ ...prev, status: 'error', error: data.message }));
    };

    const cleanupProgress = lamaBridge.on('tts:progress', handleProgress);
    const cleanupError = lamaBridge.on('tts:error', handleError);

    return () => {
      cleanupProgress();
      cleanupError();
    };
  }, []);

  /**
   * Load a TTS model (idempotent - safe to call multiple times)
   */
  const loadModel = useCallback(async (modelId: TTSModelId): Promise<void> => {
    // Already ready, nothing to do
    if (statusRef.current === 'ready') {
      return;
    }

    // Already loading, wait for it to complete
    if (statusRef.current === 'loading') {
      return new Promise<void>((resolve, reject) => {
        const checkReady = () => {
          if (statusRef.current === 'ready') {
            resolve();
          } else if (statusRef.current === 'error') {
            reject(new Error('Model failed to load'));
          } else if (statusRef.current === 'loading') {
            setTimeout(checkReady, 100);
          } else {
            // Status changed to idle (unloaded), reject
            reject(new Error('Model was unloaded'));
          }
        };
        setTimeout(checkReady, 100);
      });
    }

    statusRef.current = 'loading';
    setState(prev => ({ ...prev, status: 'loading', progress: 0, error: null }));

    try {
      const result = await lamaBridge.ttsLoad(modelId);
      statusRef.current = 'ready';
      setState(prev => ({
        ...prev,
        status: 'ready',
        modelId: result.modelId as TTSModelId,
        device: 'cpu',
        sampleRate: result.sampleRate,
        progress: 100,
        error: null
      }));
    } catch (error) {
      statusRef.current = 'error';
      const message = error instanceof Error ? error.message : 'Failed to load model';
      setState(prev => ({
        ...prev,
        status: 'error',
        error: message
      }));
      throw error;
    }
  }, []);

  /**
   * Synthesize speech from text
   */
  const synthesize = useCallback(async (
    text: string,
    options: TTSSynthesizeOptions = {}
  ): Promise<AudioBuffer | null> => {
    if (statusRef.current !== 'ready') {
      throw new Error('Model not ready');
    }

    statusRef.current = 'synthesizing';
    setState(prev => ({ ...prev, status: 'synthesizing' }));

    try {
      const result = await lamaBridge.ttsSynthesize(text, options);
      statusRef.current = 'ready';
      setState(prev => ({ ...prev, status: 'ready' }));

      // Debug: log what we received
      console.log('[useTTSElectron] Result type:', typeof result.audio);
      console.log('[useTTSElectron] Is Float32Array:', result.audio instanceof Float32Array);
      console.log('[useTTSElectron] Is Array:', Array.isArray(result.audio));
      console.log('[useTTSElectron] Sample rate:', result.sampleRate);
      if (result.audio) {
        console.log('[useTTSElectron] Audio length:', result.audio.length ?? Object.keys(result.audio).length);
      }

      // Convert Float32Array to AudioBuffer
      // Note: IPC transfers Float32Array as a regular array
      let audioData: Float32Array;
      if (result.audio instanceof Float32Array) {
        audioData = result.audio;
      } else if (Array.isArray(result.audio)) {
        audioData = new Float32Array(result.audio);
      } else {
        // Object with numeric keys from IPC serialization
        const values = Object.values(result.audio) as number[];
        audioData = new Float32Array(values);
      }

      console.log('[useTTSElectron] Final audioData length:', audioData.length);
      console.log('[useTTSElectron] First 5 samples:', audioData.slice(0, 5));

      return createAudioBuffer(audioData, result.sampleRate);
    } catch (error) {
      statusRef.current = 'ready';
      setState(prev => ({ ...prev, status: 'ready' }));
      throw error;
    }
  }, []);

  /**
   * Pre-load a custom voice
   */
  const preloadVoice = useCallback(async (audioUrl: string): Promise<void> => {
    await lamaBridge.ttsPreloadVoice(audioUrl);
  }, []);

  /**
   * Unload the current model
   */
  const unload = useCallback((): void => {
    lamaBridge.ttsUnload().catch(console.error);
    statusRef.current = 'idle';
    setState({
      status: 'idle',
      modelId: null,
      device: null,
      progress: 0,
      error: null,
      sampleRate: null
    });
  }, []);

  /**
   * Play audio buffer
   */
  const playAudio = useCallback((audioBuffer: AudioBuffer): void => {
    // Stop any currently playing audio
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }

    // Create or reuse audio context
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: audioBuffer.sampleRate });
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();

    currentSourceRef.current = source;

    source.onended = () => {
      currentSourceRef.current = null;
    };
  }, []);

  /**
   * Stop currently playing audio
   */
  const stopAudio = useCallback((): void => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
  }, []);

  return {
    state,
    loadModel,
    synthesize,
    preloadVoice,
    unload,
    playAudio,
    stopAudio
  };
}

export default useTTSElectron;
