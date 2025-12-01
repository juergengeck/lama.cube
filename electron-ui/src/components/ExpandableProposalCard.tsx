/**
 * ExpandableProposalCard Component
 * Proposal card with expandable content selection for sharing
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Proposal, SharedContextAttachment } from '../types/proposals';
import { useProposalDetails } from '../hooks/useProposalDetails';

interface SelectionState {
  keywords: Set<string>;  // Set of keyword hashes
  messages: Set<string>;  // Set of message hashes
  memories: Set<string>;  // Set of memory hashes
  summary: boolean;
}

type BulkToggleState = 'all' | 'none' | 'default';

interface ExpandableProposalCardProps {
  proposal: Proposal;
  topicId: string;
  onShare: (attachment: SharedContextAttachment, displayText: string) => void;
  onDismiss: () => void;
}

export const ExpandableProposalCard: React.FC<ExpandableProposalCardProps> = ({
  proposal,
  topicId,
  onShare,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selection, setSelection] = useState<SelectionState>({
    keywords: new Set(),
    messages: new Set(),
    memories: new Set(),
    summary: false,
  });
  const [bulkState, setBulkState] = useState<BulkToggleState>('default');

  const { details, loading, error, fetchDetails, clearDetails } = useProposalDetails();

  // Fetch details when expanded
  const handleToggleExpand = useCallback(async () => {
    if (!isExpanded) {
      await fetchDetails(proposal.pastSubject, topicId);
    } else {
      clearDetails();
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, proposal.pastSubject, topicId, fetchDetails, clearDetails]);

  // Initialize smart defaults when details load
  useEffect(() => {
    if (details && bulkState === 'default') {
      const defaultKeywords = new Set(details.keywords.map(k => k.hash));
      const defaultMessages = new Set(
        details.messages.length > 0 ? [details.messages[details.messages.length - 1].hash] : []
      );
      setSelection({
        keywords: defaultKeywords,
        messages: defaultMessages,
        memories: new Set(),
        summary: false,
      });
    }
  }, [details, bulkState]);

  // Bulk toggle handler
  const handleBulkToggle = useCallback(() => {
    if (!details) return;

    if (bulkState === 'all' || bulkState === 'default') {
      // Go to none
      setSelection({
        keywords: new Set(),
        messages: new Set(),
        memories: new Set(),
        summary: false,
      });
      setBulkState('none');
    } else if (bulkState === 'none') {
      // Go to all
      setSelection({
        keywords: new Set(details.keywords.map(k => k.hash)),
        messages: new Set(details.messages.map(m => m.hash)),
        memories: new Set(details.memories.map(m => m.hash)),
        summary: !!details.summary,
      });
      setBulkState('all');
    }
  }, [details, bulkState]);

  // Reset to defaults
  const handleResetDefaults = useCallback(() => {
    if (!details) return;
    const defaultKeywords = new Set(details.keywords.map(k => k.hash));
    const defaultMessages = new Set(
      details.messages.length > 0 ? [details.messages[details.messages.length - 1].hash] : []
    );
    setSelection({
      keywords: defaultKeywords,
      messages: defaultMessages,
      memories: new Set(),
      summary: false,
    });
    setBulkState('default');
  }, [details]);

  // Toggle individual item
  const toggleKeyword = (hash: string) => {
    setSelection(prev => {
      const newSet = new Set(prev.keywords);
      if (newSet.has(hash)) newSet.delete(hash);
      else newSet.add(hash);
      return { ...prev, keywords: newSet };
    });
  };

  const toggleMessage = (hash: string) => {
    setSelection(prev => {
      const newSet = new Set(prev.messages);
      if (newSet.has(hash)) newSet.delete(hash);
      else newSet.add(hash);
      return { ...prev, messages: newSet };
    });
  };

  const toggleMemory = (hash: string) => {
    setSelection(prev => {
      const newSet = new Set(prev.memories);
      if (newSet.has(hash)) newSet.delete(hash);
      else newSet.add(hash);
      return { ...prev, memories: newSet };
    });
  };

  const toggleSummary = () => {
    setSelection(prev => ({ ...prev, summary: !prev.summary }));
  };

  // Build attachment from selection
  const buildAttachment = useCallback((): SharedContextAttachment | null => {
    if (!details) return null;

    const attachment: SharedContextAttachment = {
      type: 'shared-context',
      subject: {
        hash: details.subject.hash,
        name: details.subject.name,
        description: details.subject.description,
      },
    };

    if (selection.keywords.size > 0) {
      attachment.keywords = details.keywords
        .filter(k => selection.keywords.has(k.hash))
        .map(k => ({ hash: k.hash, value: k.value }));
    }

    if (selection.messages.size > 0) {
      attachment.messages = details.messages
        .filter(m => selection.messages.has(m.hash));
    }

    if (selection.memories.size > 0) {
      attachment.memories = details.memories
        .filter(m => selection.memories.has(m.hash));
    }

    if (selection.summary && details.summary) {
      attachment.summary = details.summary;
    }

    return attachment;
  }, [details, selection]);

  // Get display text (most detailed selected item)
  const getDisplayText = useCallback((): string => {
    if (!details) return proposal.pastSubjectName;

    // Priority: message > subject > summary
    if (selection.messages.size > 0) {
      const selectedMsg = details.messages.find(m => selection.messages.has(m.hash));
      if (selectedMsg) return `"${selectedMsg.text.slice(0, 100)}${selectedMsg.text.length > 100 ? '...' : ''}"`;
    }

    if (details.subject.name) {
      return details.subject.name;
    }

    if (selection.summary && details.summary) {
      return details.summary.text.slice(0, 100);
    }

    return proposal.pastSubjectName;
  }, [details, selection, proposal.pastSubjectName]);

  // Handle share
  const handleShare = useCallback(() => {
    const attachment = buildAttachment();
    if (attachment) {
      onShare(attachment, getDisplayText());
    }
  }, [buildAttachment, getDisplayText, onShare]);

  // Bulk toggle icon based on state
  const getBulkToggleIcon = () => {
    switch (bulkState) {
      case 'all': return 'None';
      case 'none': return 'All';
      default: return 'Reset';
    }
  };

  return (
    <div className="expandable-proposal-card bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm hover:shadow-md transition-shadow w-full">
      {/* Collapsed Header */}
      <div className="flex items-center gap-2 p-2 min-h-0">
        {/* Chevron toggle */}
        <button
          onClick={handleToggleExpand}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Subject name */}
        <span
          className="text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap overflow-hidden text-ellipsis flex-1"
          title={proposal.pastSubjectDescription || proposal.pastSubjectName}
        >
          {proposal.pastSubjectDescription || proposal.pastSubjectName}
        </span>

        {/* Bulk toggle (only when expanded) */}
        {isExpanded && details && (
          <button
            onClick={bulkState === 'default' ? handleResetDefaults : handleBulkToggle}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
          >
            {getBulkToggleIcon()}
          </button>
        )}

        {/* Matched keywords (collapsed only) */}
        {!isExpanded && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {proposal.matchedKeywords.slice(0, 3).map((keyword, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded whitespace-nowrap"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* Relevance score */}
        {!isExpanded && (
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {Math.round(proposal.relevanceScore * 100)}%
          </span>
        )}

        {/* Quick share (collapsed only) */}
        {!isExpanded && (
          <button
            onClick={() => onShare({ type: 'shared-context', subject: { hash: proposal.pastSubject, name: proposal.pastSubjectName } }, proposal.pastSubjectName)}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors whitespace-nowrap"
          >
            Share
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-blue-200 dark:border-blue-700 p-3">
          {loading && (
            <div className="text-center text-gray-500 py-4">Loading...</div>
          )}

          {error && (
            <div className="text-center text-red-500 py-4">{error}</div>
          )}

          {details && !loading && (
            <div className="space-y-3">
              {/* Subject header - always show */}
              <div className="pb-2 border-b border-gray-200 dark:border-gray-600">
                <div className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {details.subject.name}
                </div>
                {details.subject.description && details.subject.description !== details.subject.name && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {details.subject.description}
                  </div>
                )}
              </div>

              {/* Keywords section */}
              {details.keywords.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {details.keywords.map(kw => (
                      <label key={kw.hash} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selection.keywords.has(kw.hash)}
                          onChange={() => toggleKeyword(kw.hash)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{kw.value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages section */}
              {details.messages.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Messages</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {details.messages.map(msg => (
                      <label key={msg.hash} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selection.messages.has(msg.hash)}
                          onChange={() => toggleMessage(msg.hash)}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          <span className="text-gray-400">[{msg.role}]</span> "{msg.text.slice(0, 80)}{msg.text.length > 80 ? '...' : ''}"
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Memories section */}
              {details.memories.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Memory</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {details.memories.map(mem => (
                      <label key={mem.hash} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selection.memories.has(mem.hash)}
                          onChange={() => toggleMemory(mem.hash)}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          "{mem.content.slice(0, 80)}{mem.content.length > 80 ? '...' : ''}"
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary section */}
              {details.summary && (
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selection.summary}
                      onChange={toggleSummary}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Summary</div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {details.summary.text.slice(0, 100)}{details.summary.text.length > 100 ? '...' : ''}
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Empty state when only subject is available */}
              {details.keywords.length === 0 && details.messages.length === 0 &&
               details.memories.length === 0 && !details.summary && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No additional context available for this subject.
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
