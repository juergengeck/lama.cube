/**
 * Chat IPC Handlers
 * Thin adapter that delegates to chat.core ChatPlan
 */

import type { IpcMainInvokeEvent } from 'electron';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import type { Topic } from '@refinio/one.models/lib/recipes/ChatRecipes.js';
import { ChatPlan } from '@refinio/chat.core/plans/ChatPlan.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import { getVersionsHashes, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import stateManager from '../../state/manager.js';
import nodeProvisioning from '../../services/node-provisioning.js';
import nodeOneCore from '../../core/node-one-core.js';
import { topicAccessManager } from '../../core/topic-access-manager.js';
import { MessageVersionManager } from '../../core/message-versioning.js';
import { MessageAssertionManager } from '../../core/message-assertion-certificates.js';
import localModelsPlans from './local-models.js';
import { getBaileysModule, getModuleRegistry } from '../../registry/module-registry-init.js';
import { createPlanCache } from './plan-cache.js';
import type { IndexModule } from '@refinio/lama.core/modules/IndexModule.js';
import electron from 'electron';
const { BrowserWindow } = electron;

// Epoch-aware cache: automatically discards stale plan when nodeOneCore re-initializes
const chatPlanCache = createPlanCache(() => {
  const messageVersionManager = nodeOneCore.channelManager
    ? new MessageVersionManager(nodeOneCore.channelManager)
    : null;
  const messageAssertionManager = nodeOneCore.leuteModel?.trust
    ? new MessageAssertionManager(nodeOneCore.leuteModel.trust, nodeOneCore.leuteModel)
    : null;
  const chatPlan = new ChatPlan(nodeOneCore, stateManager, messageVersionManager, messageAssertionManager);

  // Wire dimensions for O(1) lookups (when IndexModule has initialized)
  const registry = getModuleRegistry();
  if (registry) {
    const indexModule = registry.getModule<IndexModule>('IndexModule');
    if (indexModule?.contactDimension) {
      chatPlan.setContactDimension(indexModule.contactDimension);
    }
    if (indexModule?.topicDimension) {
      chatPlan.setTopicDimension(indexModule.topicDimension);
    }
    if (indexModule?.messageDimension) {
      chatPlan.setMessageDimension(indexModule.messageDimension);
    }
  }

  return chatPlan;
});

/**
 * @deprecated No longer needed - plan cache is epoch-aware and self-invalidates on re-init.
 */
export function resetChatPlanSingletons(): void {
  // No-op: plan cache invalidates automatically via initEpoch
}

/**
 * Get ChatPlan instance - creates on first use, auto-invalidates on re-init
 */
function getChatPlan(): ChatPlan {
  return chatPlanCache.get();
}

// Message managers are now created inside the plan cache factory.
// This function is kept for callers that still reference it.
async function initializeMessageManagers() {}

// IPC parameter interfaces
interface SendMessageParams {
  topicId: string;
  text: string;
  attachments?: any[];
  replyTo?: string;  // dataHash of message being replied to
}

interface GetMessagesParams {
  topicId: string;
  limit?: number;
  offset?: number;
  before?: number;  // Timestamp cursor for scroll-up
}

interface CreateConversationParams {
  type?: string;
  participants?: any[];
  name?: string | null;
  aiModelId?: string; // Optional: LLM model ID if creating conversation with LLM participant
}

interface GetConversationsParams {
  limit?: number;
  offset?: number;
}

interface GetConversationParams {
  topicId: string;
}

interface AddParticipantsParams {
  topicId: string;
  participantIds: string[];
}

interface ClearConversationParams {
  topicId: string;
}

interface EditMessageParams {
  messageId: string;
  topicId: string;
  newText: string;
  editReason?: string;
}

interface DeleteMessageParams {
  messageId: string;
  topicId: string;
  reason?: string;
}

interface GetMessageHistoryParams {
  messageId: string;
}

interface SetComposingParams {
  topicId: string;
  isComposing: boolean;
}

interface ExportMessageCredentialParams {
  messageId: string;
}

interface VerifyMessageAssertionParams {
  certificateHash: string;
  messageHash: string;
}

interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  messages?: any[];
  total?: number;
  hasMore?: boolean;
  message?: string;
  [key: string]: any;
}

const chatPlans = {
  // NOTE: initializeDefaultChats removed - default chats are created automatically
  // by AIAssistantHandler.init() in node-one-core.ts during ONE.core initialization

  async uiReady(event: IpcMainInvokeEvent): Promise<IpcResponse> {
    // Platform-specific: Update PeerMessageListener with current window
    if (nodeOneCore.peerMessageListener) {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        nodeOneCore.peerMessageListener.setMainWindow(mainWindow);
        console.log('[ChatHandler] Updated PeerMessageListener with current window');
      }
    }

    const response = await getChatPlan().uiReady({});
    return { success: response.success, error: response.error };
  },

  async sendMessage(event: IpcMainInvokeEvent, { topicId, text, attachments = [], replyTo }: SendMessageParams): Promise<IpcResponse> {
    console.log(`[Chat] 📨 sendMessage called: topicId="${topicId}", text="${text.substring(0, 50)}..."`);

    // CRITICAL: Save message FIRST to ensure channel is in consistent state
    // This fixes race condition where AI processing reads incomplete channel data
    // The latency tradeoff is acceptable - correctness > speed
    const response = await getChatPlan().sendMessage({
      topicId,
      content: text,  // Map 'text' to 'content'
      attachments,
      replyTo
    });
    console.log(`[Chat] 📤 Message saved successfully: ${response.success}`);

    // Bridge to WhatsApp if this is a WhatsApp-linked topic
    if (response.success) {
      try {
        const baileysModule = getBaileysModule();
        if (baileysModule.getClient().isConnected()) {
          const jid = await baileysModule.getMessageMapper().getJidForTopic(topicId as SHA256IdHash<Topic>);
          if (jid) {
            const waResult = await baileysModule.messagePlan.sendMessageToJid(jid, text);
            console.log(`[Chat] 📲 WhatsApp bridge: ${waResult.success ? 'sent' : waResult.error}`);
          }
        }
      } catch {
        // Not a WhatsApp topic or module not ready — ignore
      }
    }

    // AI response is triggered by AIMessageListener when channel update fires
    // AIMessageListener handles both local and remote messages

    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getMessages(event: IpcMainInvokeEvent, { topicId, limit = 50, offset = 0, before }: GetMessagesParams): Promise<IpcResponse> {
    const response = await getChatPlan().getMessages({ topicId, limit, offset, before });
    // Note: per-message debug logging removed to reduce noise during bulk import
    return {
      success: response.success,
      messages: response.messages,
      total: response.total,
      hasMore: response.hasMore,
      error: response.error
    };
  },

  async createConversation(event: IpcMainInvokeEvent, { type = 'direct', participants = [], name = null, aiModelId }: CreateConversationParams): Promise<IpcResponse> {
    console.error(`[Chat IPC] createConversation called with ${participants.length} participants:`, participants, 'aiModelId:', aiModelId);

    // Track the AI Person ID for topic registration
    let detectedAIPersonId: string | null = null;
    let detectedAIModelId = aiModelId;

    // If aiModelId is provided, ensure LLM contact exists and add to participants
    if (aiModelId && nodeOneCore.aiAssistantModel) {
      try {
        const aiPersonId = await nodeOneCore.aiAssistantModel.ensureAIContactForModel(aiModelId);
        detectedAIPersonId = String(aiPersonId);  // Capture for topic registration
        // Add LLM participant to the list if not already present
        if (!participants.includes(detectedAIPersonId)) {
          participants.push(detectedAIPersonId);
        }
      } catch (error) {
        console.error('[Chat IPC] Failed to ensure AI contact:', error);
        return {
          success: false,
          error: `Failed to create LLM participant: ${(error as Error).message}`
        };
      }
    }

    // If aiModelId not provided but participants include AI, auto-detect the model and AI person
    if (!detectedAIModelId && nodeOneCore.aiAssistantModel && participants.length > 0) {
      for (const participantId of participants) {
        if (nodeOneCore.aiAssistantModel.isAIPerson(participantId)) {
          detectedAIModelId = nodeOneCore.aiAssistantModel.getModelIdForPersonId(participantId);
          if (detectedAIModelId) {
            detectedAIPersonId = participantId;
            console.error(`[Chat IPC] Auto-detected AI participant: ${participantId.substring(0, 8)} with model: ${detectedAIModelId}`);
            break; // Use first AI participant found
          }
        }
      }
    }

    // Use createGroupConversation for group chats (proper Group/HashGroup structure)
    // Use createConversation for direct chats
    let response: any;
    if (type === 'group' && participants.length > 0) {
      // Group chat: use new createGroupConversation API with proper access control
      const groupName = name || `Group ${Date.now()}`;
      try {
        const topic = await getChatPlan().createGroupConversation(groupName, participants as SHA256IdHash<Person>[]);
        // Extract topic ID from the topic object
        const topicIdHash = await calculateIdHashOfObj(topic);
        response = {
          success: true,
          data: {
            id: topicIdHash,
            name: topic.displayName ?? topic.originalName ?? groupName,
            type: 'group',
            participants,
            topicIdHash: String(topicIdHash)
          }
        };
        console.log(`[Chat IPC] Created group conversation via createGroupConversation: ${response.data.id}`);
      } catch (error) {
        console.error('[Chat IPC] createGroupConversation failed:', error);
        return {
          success: false,
          error: `Failed to create group conversation: ${(error as Error).message}`
        };
      }
    } else {
      // Direct chat: use existing createConversation API
      response = await getChatPlan().createConversation({ type, participants, name });
    }

    console.error(`[Chat IPC] createConversation response:`, JSON.stringify(response, null, 2));

    if (!response.success || !response.data) {
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }

    console.error(`[Chat IPC] Created conversation with ID: ${response.data.id}, type: ${typeof response.data.id}`);

    // Register AI topic with AI Person ID (not model ID!)
    if (detectedAIPersonId && response.data.id && nodeOneCore.aiAssistantModel) {
      try {
        await nodeOneCore.aiAssistantModel.registerAITopic(response.data.id, detectedAIPersonId);
        console.error(`[Chat IPC] ✅ Registered AI topic: ${response.data.id} with AI Person: ${detectedAIPersonId.substring(0, 8)} (model: ${detectedAIModelId})`);

      } catch (error) {
        console.error('[Chat IPC] Failed to register AI topic:', error);
        // Non-fatal: conversation was created successfully
      }
    }

    // Issue topic-specific access certificates to participants
    // This enables per-topic access control instead of wildcard chat:* access
    if (response.data.id && participants.length > 0 && topicAccessManager.isReady()) {
      try {
        await topicAccessManager.grantTopicAccessToParticipants(
          response.data.id,
          participants as SHA256IdHash<Person>[]
        );
        console.log(`[Chat IPC] ✅ Issued topic access certificates for ${participants.length} participants`);
      } catch (error) {
        console.error('[Chat IPC] Failed to issue topic access certificates:', error);
        // Non-fatal: ONE.core object access still works
      }
    }

    // Assembly creation is handled by ChatPlan → GroupPlan → StoryFactory (platform-agnostic)

    return {
      success: true,
      data: response.data,
      error: response.error
    };
  },

  async createP2PConversation(event: IpcMainInvokeEvent, { localPersonId, remotePersonId }: { localPersonId: any; remotePersonId: any }): Promise<IpcResponse> {
    console.log('[Chat IPC] createP2PConversation called');
    const response = await getChatPlan().createP2PConversation({ localPersonId, remotePersonId });
    return {
      success: response.success,
      topicId: response.topicId,
      topicRoom: response.topicRoom,
      error: response.error
    };
  },

  async getConversations(event: IpcMainInvokeEvent, { limit = 20, offset = 0 }: GetConversationsParams = {}): Promise<IpcResponse> {
    const response = await getChatPlan().getConversations({ limit, offset });

    // Enrich conversations with topic version history (using one.core directly)
    if (response.success && response.data && nodeOneCore.topicModel) {
      response.data = await Promise.all(response.data.map(async (conv: any) => {
        try {
          if (conv.topicIdHash) {
            const versionHashes = await getVersionsHashes(conv.topicIdHash);
            if (versionHashes && versionHashes.length > 1) {
              // Load all versions and build history
              const topicHistory = await Promise.all(versionHashes.map(async (hash: any, index: number) => {
                const topic = await getObject(hash) as { screenName?: string; name?: string; aiParticipants?: Map<string, unknown> };
                const displayName = topic?.screenName || topic?.name || 'Untitled';
                return {
                  hash: String(hash),
                  displayName,
                  isCurrent: index === versionHashes.length - 1
                };
              }));
              return { ...conv, topicHistory };
            }
          }
        } catch (err) {
          // Non-fatal: continue without history if version lookup fails
          console.warn(`[Chat IPC] Failed to get topic history for ${conv.id}:`, err);
        }
        return conv;
      }));
    }

    // Enrich conversations with LLM participant metadata (coordination layer)
    if (response.success && response.data && nodeOneCore.aiAssistantModel) {
      try {
        // Get local text-gen models first - we need their IDs to filter storage results
        let localModelsFormatted: any[] = [];
        let localModelIds = new Set<string>();
        try {
          const localResult = await localModelsPlans.listTextGenModels(event);
          const localModels = (localResult.success && localResult.data) ? localResult.data : [];
          localModelIds = new Set(localModels.map((m: any) => m.id));

          // Get text-gen status to know which model is loaded
          const statusResult = await localModelsPlans.getTextGenStatus(event);
          const loadedModelId = statusResult.success ? statusResult.data?.modelId : null;

          // Filter to only available (installed/ready/loaded) local models
          const availableLocalModels = localModels.filter((m: any) =>
            m.status === 'installed' || m.status === 'ready' || m.id === loadedModelId
          );

          // Map local models to the same format as cloud models
          // Note: Model IDs no longer use 'local:' prefix - routing is handled by LLM inferenceType field
          localModelsFormatted = availableLocalModels.map((m: any) => ({
            id: m.id,
            name: m.name,
            displayName: m.name,
            description: `On-device ${m.familyName || 'ONNX'} model`,
            provider: 'local-onnx',
            inferenceType: 'ondevice', // Used by LLM adapter registry for routing
          }));
        } catch (localErr) {
          // Non-fatal: continue without local models if they fail to load
          console.warn('[Chat IPC] Failed to load local models for enrichment:', localErr);
        }

        // Get models from storage, filtering out on-device (they come fresh from localModelsPlans)
        // Also filter by provider to catch models stored with wrong/missing inferenceType
        // Also filter out any models whose ID matches a known local model ID (catches corrupted entries)
        const allModelsFromStorage = await nodeOneCore.llmManager?.getAvailableModels() || [];
        const cloudModels = allModelsFromStorage.filter((m: any) =>
          m.inferenceType !== 'ondevice' &&
          m.modelType !== 'ondevice' &&
          m.provider !== 'local-onnx' &&
          m.provider !== 'onnx' &&
          m.provider !== 'transformers' &&
          !localModelIds.has(m.id) // filter out any model with same ID as local model
        );

        // Combine cloud and local models
        const availableModels = [...localModelsFormatted, ...cloudModels];

        // Use Promise.all since getModelIdForTopic is async
        response.data = await Promise.all(response.data.map(async (conv: any) => {
          const enriched = { ...conv };

          // Get Topic to access aiParticipants settings
          let topicAiParticipants: Map<string, any> | undefined;
          if (conv.topicIdHash) {
            try {
              const topicResult = await getObjectByIdHash(conv.topicIdHash);
              topicAiParticipants = (topicResult?.obj as { aiParticipants?: Map<string, any> })?.aiParticipants;
            } catch (e) {
              // Non-fatal: continue without AI settings
            }
          }

          // Enrich participants with LLM info and AI settings
          if (conv.participants && Array.isArray(conv.participants)) {
            enriched.participants = conv.participants.map((p: any) => {
              const isLLM = nodeOneCore.aiAssistantModel.isAIPerson(p.id);
              // Look up AI settings from Topic.aiParticipants
              const aiSettings = topicAiParticipants?.get(p.id);
              return {
                ...p,
                isLLM,
                ...(aiSettings && { aiSettings })
              };
            });

            // Check if any participant is an LLM - this IS the source of truth
            enriched.hasAIParticipant = enriched.participants.some((p: any) => p.isLLM);

            // Get model info - prefer topic manager (current model) over participant (static)
            if (enriched.hasAIParticipant) {
              // First try to get model ID from topic manager (current model for this conversation)
              const topicModelId = await nodeOneCore.aiAssistantModel.getModelIdForTopic(conv.id);

              if (topicModelId) {
                enriched.aiModelId = topicModelId;
                // Look up display name from available models
                // Model IDs no longer use prefixes - lookup directly by ID
                const model = availableModels.find((m: any) => m.id === topicModelId);
                enriched.modelName = model?.displayName || model?.name || topicModelId;
              } else {
                // Fallback to participant-based lookup (for legacy conversations)
                const llmParticipant = enriched.participants.find((p: any) => p.isLLM);
                if (llmParticipant) {
                  const modelId = nodeOneCore.aiAssistantModel.getModelIdForPersonId(llmParticipant.id);
                  enriched.aiModelId = modelId;
                  // Look up display name from available models
                  // Model IDs no longer use prefixes - lookup directly by ID
                  const model = availableModels.find((m: any) => m.id === modelId);
                  enriched.modelName = model?.displayName || model?.name || modelId;
                }
              }
            }
          }

          return enriched;
        }));
      } catch (error) {
        console.error('[Chat IPC] Failed to enrich conversations with LLM metadata:', error);
        // Non-fatal - return conversations without enrichment
      }
    }

    // Source enrichment is now handled by IndexModule.sourceResolver → TopicDimension.source
    // No post-hoc enrichment needed.

    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getConversation(event: IpcMainInvokeEvent, { topicId }: GetConversationParams): Promise<any> {
    const response = await getChatPlan().getConversation({ topicId });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getCurrentUser(event: IpcMainInvokeEvent): Promise<IpcResponse> {
    const response = await getChatPlan().getCurrentUser({});
    return {
      success: response.success,
      user: response.user,
      error: response.error
    };
  },

  async addParticipants(event: IpcMainInvokeEvent, { topicId, participantIds }: AddParticipantsParams): Promise<IpcResponse> {
    const response = await getChatPlan().addParticipants({ topicId, participantIds });

    // Issue topic-specific access certificates to new participants
    if (response.success && participantIds.length > 0 && topicAccessManager.isReady()) {
      try {
        await topicAccessManager.grantTopicAccessToParticipants(
          topicId,
          participantIds as SHA256IdHash<Person>[]
        );
        console.log(`[Chat IPC] ✅ Issued topic access certificates for ${participantIds.length} new participants`);
      } catch (error) {
        console.error('[Chat IPC] Failed to issue topic access certificates:', error);
        // Non-fatal: ONE.core object access still works
      }
    }

    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async clearConversation(event: IpcMainInvokeEvent, { topicId }: ClearConversationParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await getChatPlan().clearConversation({ topicId });
    return {
      success: response.success,
      error: response.error
    };
  },

  async editMessage(event: IpcMainInvokeEvent, { messageId, topicId, newText, editReason }: EditMessageParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await getChatPlan().editMessage({ messageId, topicId, newText, editReason });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async deleteMessage(event: IpcMainInvokeEvent, { messageId, topicId, reason }: DeleteMessageParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await getChatPlan().deleteMessage({ messageId, topicId, reason });
    return {
      success: response.success,
      error: response.error
    };
  },

  async getMessageHistory(event: IpcMainInvokeEvent, { messageId }: GetMessageHistoryParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await getChatPlan().getMessageHistory({ messageId });
    return {
      success: response.success,
      history: response.history,
      error: response.error
    };
  },

  async exportMessageCredential(event: IpcMainInvokeEvent, { messageId }: ExportMessageCredentialParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await getChatPlan().exportMessageCredential({ messageId });
    return {
      success: response.success,
      credential: response.credential,
      error: response.error
    };
  },

  async verifyMessageAssertion(event: IpcMainInvokeEvent, { certificateHash, messageHash }: VerifyMessageAssertionParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await getChatPlan().verifyMessageAssertion({ certificateHash, messageHash });
    return {
      success: response.success,
      valid: response.valid,
      error: response.error
    };
  },

  async getTopicHistory(event: IpcMainInvokeEvent, { topicId }: { topicId: string }): Promise<IpcResponse> {
    try {
      if (!nodeOneCore.topicModel) {
        return { success: false, error: 'TopicModel not initialized' };
      }

      console.log('[Chat IPC] getTopicHistory called with topicId:', topicId);

      // topicId IS the idHash (stored as string but is actually SHA256IdHash)
      const topicIdHash = topicId as SHA256IdHash<Topic>;
      console.log('[Chat IPC] topicIdHash:', topicIdHash);

      // Get all versions using ONE.core
      const versionHashes = await getVersionsHashes(topicIdHash);
      console.log('[Chat IPC] versionHashes:', versionHashes?.length, versionHashes);
      if (!versionHashes || versionHashes.length === 0) {
        return { success: true, data: [] };
      }

      // Load each version to get its name
      const history = await Promise.all(versionHashes.map(async (hash: any, index: number) => {
        const topic = await getObject(hash) as { screenName?: string; name?: string; aiParticipants?: Map<string, unknown> };
        console.log('[Chat IPC] version', index, 'topic:', topic?.name, 'aiParticipants:', topic?.aiParticipants?.size);
        return {
          hash: String(hash),
          name: topic?.name || 'Untitled',
          isCurrent: index === versionHashes.length - 1
        };
      }));

      console.log('[Chat IPC] returning history:', history);
      return { success: true, data: history };
    } catch (error) {
      console.error('[Chat IPC] getTopicHistory error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  async setComposing(event: IpcMainInvokeEvent, { topicId, isComposing }: SetComposingParams): Promise<IpcResponse> {
    try {
      if (!nodeOneCore.topicModel) {
        return { success: false, error: 'TopicModel not initialized' };
      }
      if (!nodeOneCore.leuteModel) {
        return { success: false, error: 'LeuteModel not initialized' };
      }

      const myId = await nodeOneCore.leuteModel.myMainIdentity();
      const topicIdHash = topicId as SHA256IdHash<Topic>;

      await nodeOneCore.topicModel.setComposing(topicIdHash, myId, isComposing);

      return { success: true };
    } catch (error) {
      console.error('[Chat IPC] setComposing error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
};

export { chatPlans, getChatPlan };
