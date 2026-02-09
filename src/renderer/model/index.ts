/**
 * Model compatibility layer for lama.cube
 *
 * Provides a useModel() hook that matches lama.browser's modular Model interface.
 * This allows lama.browser components to work in lama.cube by providing
 * the same interface they expect, but backed by IPC instead of direct model access.
 *
 * CRITICAL: This must stay in sync with lama.browser's Model.ts public interface.
 * When Model.ts changes (e.g., modular architecture restructuring), this layer must adapt.
 */

import { usePlans } from '@refinio/ui.core';
import { useBridge } from '@/bridge/lama-bridge';

/**
 * Hook that provides model-like interface matching lama.browser's modular Model.ts
 *
 * Matches the public API exposed by Model.ts getters (lines 191-236 in modular architecture).
 * All services are accessed via IPC in lama.cube (Electron), not direct ONE.core access.
 */
export function useModel() {
  const plans = usePlans();
  const bridge = useBridge();

  return {
    // ===== Core state (Model.ts properties) =====
    initialized: bridge.isAuthenticated,
    ownerId: bridge.ownerId,

    // ===== Initialization events =====
    onOneModelsReady: {
      listen: (handler: () => void) => {
        if (bridge.isAuthenticated) {
          handler();
        }
        return () => {};
      }
    },
    onContactsChanged: {
      listen: (handler: () => void) => {
        // TODO: Implement contact change events via IPC
        return () => {};
      }
    },
    onTopicsChanged: {
      listen: (handler: () => void) => {
        // TODO: Implement topic change events via IPC
        return () => {};
      }
    },
    onConnectionsChanged: {
      listen: (handler: () => void) => {
        // TODO: Implement connection change events via IPC
        return () => {};
      }
    },

    // ===== CoreModule services =====
    // These are accessed via IPC in lama.cube
    get leuteModel() {
      // TODO: Implement LeuteModel proxy via IPC
      return null;
    },
    get channelManager() {
      // TODO: Implement ChannelManager proxy via IPC
      return null;
    },
    get topicModel() {
      // TODO: Implement TopicModel proxy via IPC
      return null;
    },
    get connections() {
      // TODO: Implement ConnectionsModel proxy via IPC
      return null;
    },
    get connectionsModel() {
      // Alias for compatibility
      return this.connections;
    },
    get settings() {
      // TODO: Implement settings proxy via IPC
      return null;
    },

    // ===== AIModule services =====
    aiAssistantPlan: plans.ai, // Already connected via usePlans()

    get aiPlan() {
      // TODO: Implement AIPlan proxy via IPC
      return null;
    },
    get topicAnalysisPlan() {
      // TODO: Implement TopicAnalysisPlan proxy via IPC
      return null;
    },
    get llmConfigPlan() {
      // TODO: Implement LLMConfigPlan proxy via IPC
      return null;
    },
    get proposalsPlan() {
      // TODO: Implement ProposalsPlan proxy via IPC
      return null;
    },
    get keywordDetailPlan() {
      // TODO: Implement KeywordDetailPlan proxy via IPC
      return null;
    },
    get wordCloudSettingsPlan() {
      // TODO: Implement WordCloudSettingsPlan proxy via IPC
      return null;
    },
    get cryptoPlan() {
      // TODO: Implement CryptoPlan proxy via IPC
      return null;
    },
    get auditPlan() {
      // TODO: Implement AuditPlan proxy via IPC
      return null;
    },
    get subjectsPlan() {
      // TODO: Implement SubjectsPlan proxy via IPC
      return null;
    },
    get llmManager() {
      return {
        getAvailableModels: async () => {
          // TODO: Implement via IPC
          return [];
        }
      };
    },
    get llmObjectManager() {
      // TODO: Implement LLMObjectManager proxy via IPC
      return null;
    },
    get aiObjectManager() {
      // TODO: Implement AIObjectManager proxy via IPC
      return null;
    },
    get topicAnalysisModel() {
      // TODO: Implement TopicAnalysisModel proxy via IPC
      return null;
    },
    get aiMessageListener() {
      // TODO: Implement AIMessageListener proxy via IPC
      return null;
    },

    // ===== ChatModule services =====
    chatPlan: plans.chat, // Already connected via usePlans()

    get groupPlan() {
      // TODO: Implement GroupPlan proxy via IPC
      return null;
    },
    get contactsPlan() {
      // TODO: Implement ContactsPlan proxy via IPC
      return null;
    },
    get exportPlan() {
      // TODO: Implement ExportPlan proxy via IPC
      return null;
    },
    get feedForwardPlan() {
      // TODO: Implement FeedForwardPlan proxy via IPC
      return null;
    },
    get topicGroupManager() {
      // TODO: Implement TopicGroupManager proxy via IPC
      return null;
    },

    // ===== ConnectionModule services =====
    get connectionPlan() {
      // TODO: Implement ConnectionPlan proxy via IPC
      return null;
    },
    get groupChatPlan() {
      // TODO: Implement GroupChatPlan proxy via IPC
      return null;
    },

    // ===== TrustModule services =====
    get trustModel() {
      // TODO: Implement TrustModel proxy via IPC
      return null;
    },
    get trustPlan() {
      // TODO: Implement TrustPlan proxy via IPC
      return null;
    },

    // ===== Additional services =====
    get journalPlan() {
      // TODO: Implement JournalPlan proxy via IPC
      return null;
    },
    get cubeStorage() {
      // TODO: Implement CubeStorage proxy via IPC
      return null;
    },

    // ===== Model methods =====
    switchAIModel: async (aiPersonId: string, modelId: string) => {
      // TODO: Implement via IPC
      console.log('[useModel] switchAIModel not yet implemented:', { aiPersonId, modelId });
    },

    // ===== Compatibility aliases =====
    // Used by some UI components expecting older Model.ts interface
    get aiAssistantModel() {
      return {
        topicManager: {
          isTopicLoading: (topicId: string) => {
            // TODO: Track topic loading state via IPC
            return false;
          }
        }
      };
    },
    get llmHandler() {
      // Alias for llmConfigPlan
      return this.llmConfigPlan;
    }
  };
}
