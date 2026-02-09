/**
 * TypeScript type definitions for Proposal System
 * Used by UI components
 *
 * Architecture: Plan/Response Pattern
 * - Proposal: Immutable recommendation (system suggests linking subjects)
 * - ProposalInteractionPlan: User's intent (view/dismiss/share)
 * - ProposalInteractionResponse: Result of executing the plan
 */

export interface Proposal {
  id: string;
  pastSubject: string; // SHA256IdHash<Subject>
  currentSubject?: string; // SHA256IdHash<Subject> (optional for topic-level)
  matchedKeywords: string[];
  relevanceScore: number;
  sourceTopicId: string;
  pastSubjectName: string;
  pastSubjectDescription?: string; // LLM-generated description
  createdAt: number;
}

export interface ProposalConfig {
  userEmail: string;
  matchWeight: number;
  recencyWeight: number;
  recencyWindow: number;
  minJaccard: number;
  maxProposals: number;
  updated: number;
}

export interface GetProposalsResponse {
  proposals: Proposal[];
  count: number;
  cached: boolean;
  computeTimeMs: number;
}

export interface UpdateConfigResponse {
  success: boolean;
  config: ProposalConfig;
  versionHash?: string;
}

export interface GetConfigResponse {
  config: ProposalConfig;
  isDefault: boolean;
}

export interface ProposalInteractionPlan {
  userEmail: string;
  proposalIdHash: string; // SHA256IdHash<Proposal>
  action: 'view' | 'dismiss' | 'share';
  topicId: string;
  createdAt: number;
}

export interface ProposalInteractionResponse {
  plan: string; // SHA256IdHash<ProposalInteractionPlan>
  success: boolean;
  executedAt: number;
  sharedToTopicId?: string; // For 'share' actions
  viewDuration?: number; // For 'view' actions (milliseconds)
  error?: string; // If success = false
}

// Legacy response types for UI backward compatibility
export interface DismissProposalResponse {
  success: boolean;
  remainingCount: number;
  response?: ProposalInteractionResponse;
}

export interface SharedContent {
  subjectName: string;
  description?: string; // Human-readable description of the subject
  keywords: string[];
  messages?: any[];
}

export interface ShareProposalResponse {
  success: boolean;
  sharedContent: SharedContent;
  response?: ProposalInteractionResponse;
}

/**
 * Traceable item with hash for lookup
 */
export interface TrackedKeyword {
  hash: string;  // SHA256IdHash for lookup
  value: string;
}

export interface TrackedMessage {
  hash: string;  // SHA256IdHash<Message>
  conversationHash: string;  // Topic/conversation ID
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface TrackedMemory {
  hash: string;  // SHA256IdHash<Memory>
  content: string;
  timestamp?: string;
}

export interface TrackedSummary {
  hash: string;  // SHA256IdHash<Summary>
  text: string;
}

/**
 * Structured context attachment for sharing proposals
 * All items include hashes for traceability
 */
export interface SharedContextAttachment {
  type: 'shared-context';

  subject?: {
    hash: string;  // SHA256IdHash<Subject>
    name: string;
    description?: string;
  };

  keywords?: TrackedKeyword[];
  messages?: TrackedMessage[];
  memories?: TrackedMemory[];
  summary?: TrackedSummary;
}

/**
 * Expanded proposal details (fetched on demand)
 */
export interface ProposalDetails {
  subject: {
    hash: string;
    name: string;
    description?: string;
  };
  keywords: TrackedKeyword[];
  messages: TrackedMessage[];
  memories: TrackedMemory[];
  summary?: TrackedSummary;
}

export interface GetProposalDetailsResponse {
  success: boolean;
  details: ProposalDetails;
}
