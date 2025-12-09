/**
 * useChatKeywords Hook
 * Non-blocking real-time single-word keyword extraction
 * Uses usePlans() for platform-agnostic access to topicAnalysis plan
 */

import { useState, useEffect, useRef } from 'react';
import { usePlans } from '@ui/core';
import type { Keyword } from '../types/topic-analysis.js';

interface Message {
  id?: string;
  content?: string;
  text?: string;
  sender?: string;
  timestamp?: number | string;
}

export function useChatKeywords(topicId: string, messages: Message[] = []) {
  // Use Plans for platform-agnostic operations
  const { topicAnalysis } = usePlans();

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track and cancel stale requests
  const extractionInProgress = useRef(false);
  const requestCounter = useRef(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track previous keyword count for change detection
  const prevKeywordCountRef = useRef(0);

  // Listen for keyword update events from backend (platform-specific: Electron IPC)
  useEffect(() => {
    if (!topicId || !window.electronAPI) return;

    const handleKeywordsUpdated = (data: { topicId: string }) => {
      if (data.topicId === topicId) {
        // Trigger a refresh by incrementing request counter
        requestCounter.current++;
        // Re-fetch keywords immediately using Plans
        const fetchKeywords = async () => {
          try {
            const response = await topicAnalysis.getKeywords({
              topicId,
              limit: 15
            });
            if (response.success && response.data?.keywords) {
              const fetchedKeywords = response.data.keywords as Keyword[];
              setKeywords(fetchedKeywords);
            }
          } catch (err) {
            console.error(`[useChatKeywords-${topicId}] Error refreshing keywords:`, err);
          }
        };
        fetchKeywords();
      }
    };

    // Subscribe to keywords:updated events - returns unsubscribe function
    const unsub = (window.electronAPI as any).on('keywords:updated', handleKeywordsUpdated) as (() => void) | undefined;
    return () => {
      if (unsub) unsub();
    };
  }, [topicId, topicAnalysis]);

  // Detect when keywords appear (0 -> N) and return flag
  const keywordsJustAppeared = prevKeywordCountRef.current === 0 && keywords.length > 0;
  prevKeywordCountRef.current = keywords.length;

  // Non-blocking keyword extraction
  useEffect(() => {
    // CRITICAL: Clear keywords immediately when topicId changes to prevent stale data
    setKeywords([]);

    if (!topicId) {
      return;
    }

    // Cancel any pending debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the extraction to avoid too many calls
    debounceTimer.current = setTimeout(() => {
      // Increment request counter to track current request
      const currentRequest = ++requestCounter.current;

      // Don't wait for extraction, fire and forget
      const performExtraction = async () => {
        // Skip if another extraction is already in progress
        if (extractionInProgress.current) {
          return;
        }

        extractionInProgress.current = true;

        try {
          // Only show loading for initial load, not updates
          if (keywords.length === 0) {
            setLoading(true);
          }

          if (messages && messages.length > 0) {
            // Get keywords from storage using Plans (platform-agnostic)
            const response = await topicAnalysis.getKeywords({
              topicId,
              limit: 15
            });

            // Only update if this is still the latest request
            if (currentRequest === requestCounter.current) {
              if (response.success && response.data?.keywords) {
                const keywords = response.data.keywords as Keyword[];
                setKeywords(keywords);
                setError(null);
              }
            }
          } else if (keywords.length === 0) {
            // Only try fallback if we have no keywords yet
            const subjectsResponse = await topicAnalysis.getSubjects({
              topicId,
              includeArchived: false
            });

            // Only update if this is still the latest request
            if (currentRequest === requestCounter.current) {
              if (subjectsResponse.success && subjectsResponse.data?.subjects) {
                const allKeywordTerms = new Set<string>();

                subjectsResponse.data.subjects.forEach((subject: { keywords?: string[] }) => {
                  if (subject.keywords && Array.isArray(subject.keywords)) {
                    subject.keywords.forEach((keyword: string) => {
                      // Only include single words
                      if (!keyword.includes(' ') && !keyword.includes('+')) {
                        allKeywordTerms.add(keyword);
                      }
                    });
                  }
                });

                // Create keyword objects from terms
                const keywordArray = Array.from(allKeywordTerms).slice(0, 15).map(term => ({
                  $type$: 'Keyword' as const,
                  term,
                  frequency: 1,
                  subjects: [],
                  createdAt: Date.now(),
                  lastSeen: Date.now()
                }));
                setKeywords(keywordArray);
              }
            }
          }
        } catch (err) {
          // Only update error if this is still the latest request
          if (currentRequest === requestCounter.current) {
            console.error('[useChatKeywords] Extraction error:', err);
            setError(err instanceof Error ? err.message : 'Failed to extract keywords');
          }
        } finally {
          extractionInProgress.current = false;
          if (currentRequest === requestCounter.current) {
            setLoading(false);
          }
        }
      };

      // Start extraction without blocking
      performExtraction();
    }, 300); // 300ms debounce

    // Cleanup function
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [topicId, messages.length, topicAnalysis]); // Added topicAnalysis dependency

  // Non-blocking update for new message
  const updateKeywordsForNewMessage = (messageText: string) => {
    if (!messageText) return;

    // Increment request counter
    const currentRequest = ++requestCounter.current;

    // Fire and forget - don't block on this
    const performUpdate = async () => {
      try {
        console.log('[useChatKeywords] Updating keywords for new message (non-blocking)');

        // Convert Keyword[] to string[] for API
        const existingTerms = keywords.map(k => k.term);

        const response = await topicAnalysis.extractRealtimeKeywords({
          text: messageText,
          existingKeywords: existingTerms,
          maxKeywords: 15
        });

        // Only update if this is still the latest request
        if (currentRequest === requestCounter.current) {
          if (response.success && response.data?.keywords) {
            // Convert string[] back to Keyword[]
            const newKeywords: Keyword[] = response.data.keywords.map((term: string) => ({
              $type$: 'Keyword' as const,
              term,
              frequency: 1,
              subjects: [],
              createdAt: Date.now(),
              lastSeen: Date.now()
            }));
            setKeywords(newKeywords);
          }
        }
      } catch (err) {
        console.error('[useChatKeywords] Update error (non-blocking):', err);
        // Don't set error state for non-blocking updates
      }
    };

    // Start update without blocking
    performUpdate();
  };

  return {
    keywords,
    loading,
    error,
    updateKeywordsForNewMessage,
    keywordsJustAppeared
  };
}
