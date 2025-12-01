/**
 * useProposalDetails Hook
 * Fetches detailed content for a proposal on demand (when expanded)
 */

import { useState, useCallback } from 'react';
import type { ProposalDetails, GetProposalDetailsResponse } from '../types/proposals';

interface UseProposalDetailsResult {
  details: ProposalDetails | null;
  loading: boolean;
  error: string | null;
  fetchDetails: (pastSubjectIdHash: string, topicId: string) => Promise<void>;
  clearDetails: () => void;
}

export function useProposalDetails(): UseProposalDetailsResult {
  const [details, setDetails] = useState<ProposalDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async (pastSubjectIdHash: string, topicId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useProposalDetails] Fetching details for:', pastSubjectIdHash);
      const response: GetProposalDetailsResponse = await window.electronAPI!.invoke(
        'proposals:getDetails',
        { pastSubjectIdHash, topicId }
      );

      if (response.success) {
        setDetails(response.details);
      } else {
        setError('Failed to fetch proposal details');
      }
    } catch (err: any) {
      console.error('[useProposalDetails] Error:', err);
      setError(err.message || 'Failed to fetch details');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDetails = useCallback(() => {
    setDetails(null);
    setError(null);
  }, []);

  return {
    details,
    loading,
    error,
    fetchDetails,
    clearDetails,
  };
}
