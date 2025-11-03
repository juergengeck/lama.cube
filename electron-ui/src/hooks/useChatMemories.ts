/**
 * Hook for chat memory management
 * Provides toggle control and status for automatic memory extraction
 */

import { useState, useEffect, useCallback } from 'react';

export interface ChatMemoryStatus {
  enabled: boolean;
  config?: {
    autoExtract: boolean;
    updateInterval?: number;
    minConfidence?: number;
    keywords?: string[];
  };
}

export interface UseChatMemoriesResult {
  isEnabled: boolean;
  loading: boolean;
  error: string | null;
  toggle: () => Promise<void>;
  enable: (autoExtract?: boolean, keywords?: string[]) => Promise<void>;
  disable: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook to manage chat memory extraction for a topic
 */
export function useChatMemories(topicId: string): UseChatMemoriesResult {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!topicId) return;

    try {
      setLoading(true);
      setError(null);

      // Call IPC to get status
      const status = await (window as any).electronAPI?.invoke('memory:getStatus', { topicId });

      if (status && typeof status.enabled === 'boolean') {
        setIsEnabled(status.enabled);
      }
    } catch (err) {
      console.error('[useChatMemories] Error refreshing status:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  // Load initial status
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const toggle = useCallback(async () => {
    if (!topicId || loading) return;

    try {
      setLoading(true);
      setError(null);

      // Call IPC to toggle
      const result = await (window as any).electronAPI?.invoke('memory:toggle', { topicId });

      if (typeof result.enabled === 'boolean') {
        setIsEnabled(result.enabled);
      }
    } catch (err) {
      console.error('[useChatMemories] Error toggling memories:', err);
      setError((err as Error).message);
      // Refresh status on error
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }, [topicId, loading, refreshStatus]);

  const enable = useCallback(
    async (autoExtract = true, keywords: string[] = []) => {
      if (!topicId || loading) return;

      try {
        setLoading(true);
        setError(null);

        // Call IPC to enable
        await (window as any).electronAPI?.invoke('memory:enable', {
          topicId,
          autoExtract,
          keywords
        });

        setIsEnabled(true);
      } catch (err) {
        console.error('[useChatMemories] Error enabling memories:', err);
        setError((err as Error).message);
        // Refresh status on error
        await refreshStatus();
      } finally {
        setLoading(false);
      }
    },
    [topicId, loading, refreshStatus]
  );

  const disable = useCallback(async () => {
    if (!topicId || loading) return;

    try {
      setLoading(true);
      setError(null);

      // Call IPC to disable
      await (window as any).electronAPI?.invoke('memory:disable', { topicId });

      setIsEnabled(false);
    } catch (err) {
      console.error('[useChatMemories] Error disabling memories:', err);
      setError((err as Error).message);
      // Refresh status on error
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }, [topicId, loading, refreshStatus]);

  return {
    isEnabled,
    loading,
    error,
    toggle,
    enable,
    disable,
    refreshStatus
  };
}

/**
 * Hook to find related memories by keywords
 */
export function useRelatedMemories(topicId: string, keywords: string[], limit = 5) {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    if (!topicId || keywords.length === 0) {
      setMemories([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await (window as any).electronAPI?.invoke('memory:find', {
        topicId,
        keywords,
        limit
      });

      if (result && Array.isArray(result.memories)) {
        setMemories(result.memories);
      }
    } catch (err) {
      console.error('[useRelatedMemories] Error loading memories:', err);
      setError((err as Error).message);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, [topicId, keywords, limit]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  return {
    memories,
    loading,
    error,
    reload: loadMemories
  };
}

/**
 * Hook to extract subjects from chat history
 */
export function useExtractSubjects(topicId: string) {
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(
    async (limit = 50) => {
      if (!topicId || extracting) return;

      try {
        setExtracting(true);
        setError(null);

        const response = await (window as any).electronAPI?.invoke('memory:extract', {
          topicId,
          limit
        });

        setResult(response);
      } catch (err) {
        console.error('[useExtractSubjects] Error extracting subjects:', err);
        setError((err as Error).message);
      } finally {
        setExtracting(false);
      }
    },
    [topicId, extracting]
  );

  return {
    extract,
    extracting,
    result,
    error
  };
}
