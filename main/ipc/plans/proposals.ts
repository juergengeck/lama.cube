/**
 * Proposals IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to ProposalsHandler methods.
 * Business logic lives in ../../../lama.core/handlers/ProposalsHandler.ts
 *
 * Implements Phase 2 (IPC Layer) for spec 019-above-the-chat
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ProposalsPlan } from '@lama/core/plans/ProposalsPlan.js';
import { SemanticProposalEngine } from '@lama/core/services/semantic-proposal-engine.js';
import { ProposalEngine } from '../../services/proposal-engine.js';
import { ProposalRanker } from '../../services/proposal-ranker.js';
import { ProposalCache } from '../../services/proposal-cache.js';
import type { ProposalConfig } from '../../services/proposal-engine.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Subject } from '@lama/core/one-ai/types/Subject.js';
import nodeOneCoreInstance from '../../core/node-one-core.js';
import { MeaningDimension } from '@cube/meaning.core';
import { getInferenceManager } from '../../core/inference-manager.js';

// Initialize services
let proposalEngine: ProposalEngine | null = null;
const proposalRanker = new ProposalRanker();
const proposalCache = new ProposalCache(50, 60000); // 50 entries, 60s TTL

// Semantic engine components
let meaningDimension: MeaningDimension | null = null;
let semanticEngine: SemanticProposalEngine | null = null;
let meaningDimensionInitializing = false;

// Singleton handler instance
let proposalsHandler: ProposalsPlan | null = null;

/**
 * Initialize MeaningDimension for semantic proposals
 * Non-blocking - continues without semantic engine if InferenceManager not ready
 */
async function initMeaningDimension(): Promise<void> {
  if (meaningDimension || meaningDimensionInitializing) return;
  meaningDimensionInitializing = true;

  try {
    const inferenceManager = getInferenceManager();
    if (!inferenceManager.initialized) {
      console.log('[Proposals] InferenceManager not ready, semantic proposals disabled');
      return;
    }

    const localProvider = inferenceManager.getEmbeddingProvider();
    console.log('[Proposals] Creating MeaningDimension with embedding provider');

    // Adapt LocalEmbeddingProvider to meaning.core's EmbeddingProvider interface
    const embeddingProvider = {
      model: 'all-MiniLM-L6-v2' as const,  // Canonical model name for meaning.core
      embed: (text: string) => localProvider.embed(text),
      embedBatch: (texts: string[]) => localProvider.embedBatch(texts)
    };

    meaningDimension = new MeaningDimension({
      model: 'all-MiniLM-L6-v2',  // Matches ONNX model
      embeddingProvider
    });

    await meaningDimension.init();
    console.log('[Proposals] MeaningDimension initialized');

    semanticEngine = new SemanticProposalEngine(meaningDimension);
    console.log('[Proposals] SemanticProposalEngine ready');

    // Recreate handler with semantic engine
    if (proposalsHandler && proposalEngine) {
      proposalsHandler = new ProposalsPlan(
        nodeOneCoreInstance,
        nodeOneCoreInstance.topicAnalysisModel,
        proposalEngine,
        proposalRanker,
        proposalCache,
        semanticEngine
      );
      console.log('[Proposals] ProposalsPlan upgraded with semantic engine');
    }
  } catch (error) {
    console.error('[Proposals] Failed to init MeaningDimension:', error);
  } finally {
    meaningDimensionInitializing = false;
  }
}

/**
 * Initialize ProposalEngine and handler
 */
function getProposalsHandler(): ProposalsPlan {
  // Initialize ProposalEngine if needed
  if (!proposalEngine && nodeOneCoreInstance.topicAnalysisModel && nodeOneCoreInstance.channelManager) {
    proposalEngine = new ProposalEngine(
      nodeOneCoreInstance.topicAnalysisModel,
      nodeOneCoreInstance.channelManager,
      (nodeOneCoreInstance as any).subjectPlan  // Pass memory plan for memory-based proposals
    );
  }
  if (!proposalEngine) {
    throw new Error('ProposalEngine not initialized - nodeOneCore not ready');
  }

  // Initialize handler if needed
  if (!proposalsHandler) {
    proposalsHandler = new ProposalsPlan(
      nodeOneCoreInstance,
      nodeOneCoreInstance.topicAnalysisModel,
      proposalEngine,
      proposalRanker,
      proposalCache,
      semanticEngine ?? undefined
    );

    // Try to init semantic engine in background
    initMeaningDimension().catch(err => {
      console.error('[Proposals] Background semantic init failed:', err);
    });
  }

  return proposalsHandler;
}

/**
 * Get proposals for a specific topic
 * Handler: proposals:getForTopic
 */
async function getForTopic(
  event: IpcMainInvokeEvent,
  {
    topicId,
    currentSubjects,
    forceRefresh,
  }: {
    topicId: string;
    currentSubjects?: SHA256IdHash<Subject>[];
    forceRefresh?: boolean;
  }
) {
  const handler = getProposalsHandler();
  return await handler.getForTopic({ topicId, currentSubjects, forceRefresh });
}

/**
 * Update user's proposal configuration
 * Handler: proposals:updateConfig
 */
async function updateConfig(
  event: IpcMainInvokeEvent,
  { config }: { config: Partial<ProposalConfig> }
) {
  const handler = getProposalsHandler();
  return await handler.updateConfig({ config });
}

/**
 * Get current user's proposal configuration
 * Handler: proposals:getConfig
 */
async function getConfig(event: IpcMainInvokeEvent) {
  const handler = getProposalsHandler();
  return await handler.getConfig({});
}

/**
 * Dismiss a proposal for the current session
 * Handler: proposals:dismiss
 */
async function dismiss(
  event: IpcMainInvokeEvent,
  {
    proposalId,
    topicId,
    pastSubjectIdHash,
  }: {
    proposalId: string;
    topicId: string;
    pastSubjectIdHash: string;
  }
) {
  const handler = getProposalsHandler();
  return await handler.dismiss({ proposalId, topicId, pastSubjectIdHash });
}

/**
 * Share a proposal into the current conversation
 * Handler: proposals:share
 */
async function share(
  event: IpcMainInvokeEvent,
  {
    proposalId,
    topicId,
    pastSubjectIdHash,
    includeMessages,
  }: {
    proposalId: string;
    topicId: string;
    pastSubjectIdHash: SHA256IdHash<Subject>;
    includeMessages?: boolean;
  }
) {
  const handler = getProposalsHandler();
  return await handler.share({ proposalId, topicId, pastSubjectIdHash, includeMessages });
}

/**
 * Get proposals based on user's current input text (real-time)
 * Handler: proposals:getForInput
 */
async function getForInput(
  event: IpcMainInvokeEvent,
  {
    topicId,
    inputText,
  }: {
    topicId: string;
    inputText: string;
  }
) {
  if (!proposalEngine) {
    throw new Error('ProposalEngine not initialized');
  }

  // Get user config
  const handler = getProposalsHandler();
  const configResponse = await handler.getConfig({});
  const config = configResponse.config;

  // Generate proposals from input text
  const startTime = Date.now();
  const proposals = await proposalEngine.getProposalsForInput(topicId, inputText, config);
  const computeTimeMs = Date.now() - startTime;

  // Rank proposals
  const rankedProposals = proposalRanker.rankProposals(proposals, config);

  return {
    proposals: rankedProposals,
    count: rankedProposals.length,
    cached: false,
    computeTimeMs,
  };
}

/**
 * Get detailed content for a proposal (on-demand)
 * Handler: proposals:getDetails
 */
async function getDetails(
  event: IpcMainInvokeEvent,
  {
    pastSubjectIdHash,
    topicId,
  }: {
    pastSubjectIdHash: string;
    topicId: string;
  }
) {
  const handler = getProposalsHandler();
  return await handler.getDetails({ pastSubjectIdHash: pastSubjectIdHash as any, topicId });
}

/**
 * Export proposal plans
 */
export const proposalPlans = {
  'proposals:getForTopic': getForTopic,
  'proposals:updateConfig': updateConfig,
  'proposals:getConfig': getConfig,
  'proposals:dismiss': dismiss,
  'proposals:share': share,
  'proposals:getForInput': getForInput,
  'proposals:getDetails': getDetails,
};
