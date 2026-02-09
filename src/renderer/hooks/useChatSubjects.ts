/**
 * useChatSubjects Hook
 * Fetches and manages subjects for a chat topic
 * Uses usePlans() for platform-agnostic access to topicAnalysis plan
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePlans } from '@refinio/ui.core';
import type { Subject } from '../types/topic-analysis';

// Stable empty array to prevent re-renders
const EMPTY_SUBJECTS: Subject[] = [];

export function useChatSubjects(topicId: string) {
  const { topicAnalysis } = usePlans();

  const [subjects, setSubjects] = useState<Subject[]>(EMPTY_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track and cancel stale requests
  const requestCounter = useRef(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track previous subject count for change detection
  const prevSubjectCountRef = useRef(0);

  // Fetch subjects using Plans (platform-agnostic)
  const fetchSubjects = useCallback(async () => {
    const currentRequest = ++requestCounter.current;

    try {
      if (loading) {
        return;
      }

      setLoading(true);

      console.log('[useChatSubjects] Calling topicAnalysis.getSubjects for:', topicId);
      const response = await topicAnalysis.getSubjects({
        topicId,
        includeArchived: false
      });

      console.log('[useChatSubjects] Response received:', response);

      // Only update if this is still the latest request
      if (currentRequest === requestCounter.current) {
        if (response.success && response.data?.subjects) {
          console.log('[useChatSubjects] ✅ Subjects loaded:', response.data.subjects.length, response.data.subjects);
          setSubjects(response.data.subjects);
          setError(null);
        } else {
          console.log('[useChatSubjects] ❌ No subjects in response:', response);
          setSubjects(EMPTY_SUBJECTS);
        }
      } else {
        console.log('[useChatSubjects] Ignoring stale response');
      }
    } catch (err) {
      if (currentRequest === requestCounter.current) {
        console.error('[useChatSubjects] Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subjects');
      }
    } finally {
      if (currentRequest === requestCounter.current) {
        setLoading(false);
      }
    }
  }, [topicId, topicAnalysis, loading]);

  // Listen for subject update events from backend (platform-specific: Electron IPC)
  useEffect(() => {
    if (!topicId || !window.electronAPI) return;

    const handleSubjectsUpdated = (data: any) => {
      if (data.topicId === topicId) {
        // Re-fetch subjects immediately
        fetchSubjects();
      }
    };

    // Subscribe to subjects:updated events - returns unsubscribe function
    const unsub = (window.electronAPI as any).on('subjects:updated', handleSubjectsUpdated) as (() => void) | undefined;
    return () => {
      if (unsub) unsub();
    };
  }, [topicId, fetchSubjects]);

  // Detect when subjects appear (0 -> N) and return flag
  const subjectsJustAppeared = prevSubjectCountRef.current === 0 && subjects.length > 0;

  // Only update ref when subjects count actually changes (not on every render)
  useEffect(() => {
    prevSubjectCountRef.current = subjects.length;
  }, [subjects.length]);

  // Load subjects when topicId changes
  useEffect(() => {
    // Don't clear subjects - just fetch new ones
    // Clearing causes subjectsJustAppeared to trigger incorrectly on topic switch
    setError(null);

    if (!topicId) {
      setSubjects(EMPTY_SUBJECTS);
      return;
    }

    // Cancel any pending debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the fetch
    debounceTimer.current = setTimeout(() => {
      fetchSubjects();
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [topicId, fetchSubjects]);

  return {
    subjects,
    loading,
    error,
    refetch: fetchSubjects,
    subjectsJustAppeared
  };
}
