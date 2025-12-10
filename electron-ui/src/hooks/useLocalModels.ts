/**
 * Hook for managing local text generation models
 */
import { useState, useEffect, useCallback } from 'react';

interface LocalModelState {
  id: string;
  name: string;
  type: 'embedding' | 'whisper' | 'text-generation';
  sizeBytes: number;
  status: 'not_installed' | 'downloading' | 'installed' | 'loading' | 'ready' | 'error';
  downloadProgress?: number;
  error?: string;
  bundled: boolean;
  familyName?: string;
  contextLength?: number;
}

interface TextGenStatus {
  loaded: boolean;
  modelId: string | null;
  status: string;
}

interface UseLocalModelsResult {
  // Text generation models
  textGenModels: LocalModelState[];
  textGenStatus: TextGenStatus | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadModel: (modelId: string) => Promise<void>;
  unloadModel: () => Promise<void>;
  downloadModel: (modelId: string) => Promise<void>;
  refreshModels: () => Promise<void>;

  // Chat with model
  chat: (modelId: string, messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options?: { temperature?: number; maxTokens?: number }) => Promise<string>;
}

export function useLocalModels(): UseLocalModelsResult {
  const [textGenModels, setTextGenModels] = useState<LocalModelState[]>([]);
  const [textGenStatus, setTextGenStatus] = useState<TextGenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshModels = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      setError(null);

      // Get text generation models
      const result = await window.electronAPI.invoke('localModels:listTextGen');
      if (result.success && result.data) {
        setTextGenModels(result.data);
      }

      // Get current status
      const statusResult = await window.electronAPI.invoke('localModels:getTextGenStatus');
      if (statusResult.success && statusResult.data) {
        setTextGenStatus(statusResult.data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load models on mount
  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  // Listen for progress updates
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleProgress = (data: { modelId: string; progress: number }) => {
      setTextGenModels(prev => prev.map(m =>
        m.id === data.modelId
          ? { ...m, downloadProgress: data.progress, status: 'loading' as const }
          : m
      ));
    };

    const cleanup = window.electronAPI.on('localModels:textGenProgress', handleProgress);
    return cleanup;
  }, []);

  const loadModel = useCallback(async (modelId: string) => {
    if (!window.electronAPI) throw new Error('Electron API not available');

    setTextGenModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, status: 'loading' as const } : m
    ));

    const result = await window.electronAPI.invoke('localModels:loadTextGen', { modelId });

    if (!result.success) {
      setTextGenModels(prev => prev.map(m =>
        m.id === modelId ? { ...m, status: 'error' as const, error: result.error } : m
      ));
      throw new Error(result.error);
    }

    setTextGenModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, status: 'ready' as const } : m
    ));

    setTextGenStatus({ loaded: true, modelId, status: 'ready' });
  }, []);

  const unloadModel = useCallback(async () => {
    if (!window.electronAPI) throw new Error('Electron API not available');

    const result = await window.electronAPI.invoke('localModels:unloadTextGen');

    if (!result.success) {
      throw new Error(result.error);
    }

    // Update status
    await refreshModels();
  }, [refreshModels]);

  const downloadModel = useCallback(async (modelId: string) => {
    if (!window.electronAPI) throw new Error('Electron API not available');

    setTextGenModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, status: 'downloading' as const, downloadProgress: 0 } : m
    ));

    const result = await window.electronAPI.invoke('localModels:download', { modelId });

    if (!result.success) {
      setTextGenModels(prev => prev.map(m =>
        m.id === modelId ? { ...m, status: 'error' as const, error: result.error } : m
      ));
      throw new Error(result.error);
    }

    setTextGenModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, status: 'installed' as const, downloadProgress: undefined } : m
    ));
  }, []);

  const chat = useCallback(async (
    modelId: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> => {
    if (!window.electronAPI) throw new Error('Electron API not available');

    const result = await window.electronAPI.invoke('localModels:chatTextGen', {
      modelId,
      messages,
      options
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data.response;
  }, []);

  return {
    textGenModels,
    textGenStatus,
    loading,
    error,
    loadModel,
    unloadModel,
    downloadModel,
    refreshModels,
    chat
  };
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
