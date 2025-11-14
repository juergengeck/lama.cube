/**
 * useProposals Hook
 * React hook to manage proposal state and interactions
 *
 * Reference: /specs/019-above-the-chat/plan.md line 133
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Proposal,
  GetProposalsResponse,
  DismissProposalResponse,
  ShareProposalResponse,
} from '../types/proposals';

interface UseProposalsOptions {
  topicId: string;
  currentSubjects?: string[];
  autoRefresh?: boolean;
  mode?: 'subject' | 'input'; // 'subject' = based on extracted subjects, 'input' = based on user input
  inputText?: string; // For input-based mode
}

interface UseProposalsResult {
  proposals: Proposal[];
  currentIndex: number;
  currentProposal: Proposal | null;
  loading: boolean;
  error: string | null;
  nextProposal: () => void;
  previousProposal: () => void;
  dismissProposal: (proposalId: string, pastSubjectIdHash: string) => Promise<void>;
  shareProposal: (
    proposalId: string,
    pastSubjectIdHash: string,
    includeMessages?: boolean
  ) => Promise<ShareProposalResponse>;
  refresh: () => Promise<void>;
  refreshForInput: (inputText: string) => Promise<void>; // New: fetch proposals for input text
}

export function useProposals({
  topicId,
  currentSubjects,
  autoRefresh = true,
  mode = 'subject',
  inputText = '',
}: UseProposalsOptions): UseProposalsResult {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch proposals from IPC handler (subject-based mode)
   */
  const fetchProposals = useCallback(
    async (forceRefresh = false) => {
      if (!topicId) {
        console.log('[useProposals] Skipping fetch - no topicId');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('[useProposals] Fetching proposals for topic:', topicId, 'currentSubjects:', currentSubjects);
        const ipcResponse: any = await window.electronAPI.invoke(
          'proposals:getForTopic',
          {
            topicId,
            currentSubjects,
            forceRefresh,
          }
        );

        console.log('[useProposals] Received IPC response:', ipcResponse);

        // Unwrap the IPC response (controller wraps with {success, data})
        const response: GetProposalsResponse = ipcResponse.success ? ipcResponse.data : ipcResponse;

        console.log('[useProposals] Unwrapped response:', response);
        setProposals(response.proposals || []);
        setCurrentIndex(0); // Reset to first proposal

        // Log performance metrics
        if (response.count === 0) {
          console.log('[useProposals] No proposals found for topic:', topicId);
        } else if (response.computeTimeMs) {
          console.log(
            `[useProposals] Fetched ${response.count} proposals in ${response.computeTimeMs}ms (cached: ${response.cached})`
          );
        }
      } catch (err: any) {
        console.error('[useProposals] Error fetching proposals:', err);
        setError(err.message || 'Failed to fetch proposals');
        setProposals([]);
      } finally {
        setLoading(false);
      }
    },
    [topicId, currentSubjects]
  );

  /**
   * Fetch proposals based on input text (input-based mode)
   */
  const fetchProposalsForInput = useCallback(
    async (text: string) => {
      if (!topicId || !text || text.trim().length < 3) {
        console.log('[useProposals] Skipping input fetch - no topicId or text too short');
        setProposals([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('[useProposals] Fetching proposals for input:', text);
        const ipcResponse: any = await window.electronAPI.invoke(
          'proposals:getForInput',
          {
            topicId,
            inputText: text,
          }
        );

        // Unwrap the IPC response
        const response: GetProposalsResponse = ipcResponse.success ? ipcResponse.data : ipcResponse;

        console.log('[useProposals] Input proposals response:', response);
        setProposals(response.proposals || []);
        setCurrentIndex(0);

        if (response.count > 0 && response.computeTimeMs) {
          console.log(
            `[useProposals] Found ${response.count} input proposals in ${response.computeTimeMs}ms`
          );
        }
      } catch (err: any) {
        console.error('[useProposals] Error fetching input proposals:', err);
        setError(err.message || 'Failed to fetch input proposals');
        setProposals([]);
      } finally {
        setLoading(false);
      }
    },
    [topicId]
  );

  /**
   * Auto-refresh when current subjects change
   * Note: We don't require currentSubjects because the IPC handler will query them
   */
  useEffect(() => {
    if (autoRefresh && topicId) {
      console.log('[useProposals] Auto-refreshing proposals for topic:', topicId);
      fetchProposals();
    }
  }, [autoRefresh, topicId, fetchProposals]);

  /**
   * Navigate to next proposal
   */
  const nextProposal = useCallback(() => {
    if (proposals.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % proposals.length);
  }, [proposals.length]);

  /**
   * Navigate to previous proposal
   */
  const previousProposal = useCallback(() => {
    if (proposals.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + proposals.length) % proposals.length);
  }, [proposals.length]);

  /**
   * Dismiss a proposal
   */
  const dismissProposal = useCallback(
    async (proposalId: string, pastSubjectIdHash: string) => {
      try {
        const response: DismissProposalResponse = await window.electronAPI.invoke(
          'proposals:dismiss',
          {
            proposalId,
            topicId,
            pastSubjectIdHash,
          }
        );

        if (response.success) {
          // Remove dismissed proposal from local state
          setProposals((prev) => prev.filter((p) => p.id !== proposalId));

          // Adjust current index if needed
          setCurrentIndex((prev) => {
            if (prev >= proposals.length - 1) {
              return Math.max(0, proposals.length - 2);
            }
            return prev;
          });
        }
      } catch (err: any) {
        console.error('[useProposals] Error dismissing proposal:', err);
        throw err;
      }
    },
    [topicId, proposals.length]
  );

  /**
   * Share a proposal
   */
  const shareProposal = useCallback(
    async (
      proposalId: string,
      pastSubjectIdHash: string,
      includeMessages = false
    ): Promise<ShareProposalResponse> => {
      try {
        const response: ShareProposalResponse = await window.electronAPI.invoke(
          'proposals:share',
          {
            proposalId,
            topicId,
            pastSubjectIdHash,
            includeMessages,
          }
        );

        if (response.success) {
          // Remove shared proposal from local state (auto-dismissed)
          setProposals((prev) => prev.filter((p) => p.id !== proposalId));

          // Adjust current index if needed
          setCurrentIndex((prev) => {
            if (prev >= proposals.length - 1) {
              return Math.max(0, proposals.length - 2);
            }
            return prev;
          });
        }

        return response;
      } catch (err: any) {
        console.error('[useProposals] Error sharing proposal:', err);
        throw err;
      }
    },
    [topicId, proposals.length]
  );

  /**
   * Manually refresh proposals (subject-based)
   */
  const refresh = useCallback(async () => {
    await fetchProposals(true);
  }, [fetchProposals]);

  /**
   * Manually refresh proposals for input text
   */
  const refreshForInput = useCallback(async (text: string) => {
    await fetchProposalsForInput(text);
  }, [fetchProposalsForInput]);

  const currentProposal = proposals[currentIndex] || null;

  return {
    proposals,
    currentIndex,
    currentProposal,
    loading,
    error,
    nextProposal,
    previousProposal,
    dismissProposal,
    shareProposal,
    refresh,
    refreshForInput,
  };
}
