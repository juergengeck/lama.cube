/**
 * ProposalCarousel Component
 * Swipeable carousel for navigating through proposals
 *
 * Reference: /specs/019-above-the-chat/plan.md line 128
 * Reference: /specs/019-above-the-chat/research.md lines 32-45
 */

import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { ExpandableProposalCard } from './ExpandableProposalCard';
import type { Proposal, SharedContextAttachment } from '../types/proposals';

interface ProposalCarouselProps {
  proposals: Proposal[];
  currentIndex: number;
  topicId: string;
  onNext: () => void;
  onPrevious: () => void;
  onShare: (proposalId: string, pastSubjectIdHash: string, attachment: SharedContextAttachment, displayText: string) => Promise<void>;
  onDismiss: (proposalId: string, pastSubjectIdHash: string) => Promise<void>;
}

export const ProposalCarousel: React.FC<ProposalCarouselProps> = ({
  proposals,
  currentIndex,
  topicId,
  onNext,
  onPrevious,
  onShare,
  onDismiss,
}) => {
  const currentProposal = proposals[currentIndex];

  // Configure swipeable handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => onNext(),
    onSwipedRight: () => onPrevious(),
    preventScrollOnSwipe: true,
    trackMouse: true, // Enable mouse drag for desktop
  });

  if (!currentProposal || proposals.length === 0) {
    return null;
  }

  const handleShare = async (attachment: SharedContextAttachment, displayText: string) => {
    await onShare(currentProposal.id, currentProposal.pastSubject, attachment, displayText);
  };

  const handleDismiss = async () => {
    await onDismiss(currentProposal.id, currentProposal.pastSubject);
  };

  return (
    <div className="proposal-carousel" {...handlers}>
      <ExpandableProposalCard
        proposal={currentProposal}
        topicId={topicId}
        onShare={handleShare}
        onDismiss={handleDismiss}
      />
    </div>
  );
};
