/**
 * Chat IPC Handlers
 * Thin adapter that delegates to chat.core ChatPlan
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ChatPlan } from '@chat/core/plans/ChatPlan.js';
import stateManager from '../../state/manager.js';
import nodeProvisioning from '../../services/node-provisioning.js';
import nodeOneCore from '../../core/node-one-core.js';
import { MessageVersionManager } from '../../core/message-versioning.js';
import { MessageAssertionManager } from '../../core/message-assertion-certificates.js';
import localModelsPlans from './local-models.js';
import electron from 'electron';
const { BrowserWindow } = electron;

// Message version manager instance
let messageVersionManager: MessageVersionManager | null = null;

// Message assertion manager instance
let messageAssertionManager: MessageAssertionManager | null = null;

// Initialize ChatPlan with dependencies
// Note: ChatPlan auto-creates GroupPlan using nodeOneCore.topicModel when available
const chatPlan = new ChatPlan(nodeOneCore, stateManager, messageVersionManager, messageAssertionManager);

// Initialize message managers when they become available
async function initializeMessageManagers() {
  if (!messageVersionManager && nodeOneCore.channelManager) {
    messageVersionManager = new MessageVersionManager(nodeOneCore.channelManager);
  }
  if (!messageAssertionManager && nodeOneCore.leuteModel && nodeOneCore.leuteModel.trust) {
    messageAssertionManager = new MessageAssertionManager(nodeOneCore.leuteModel.trust, nodeOneCore.leuteModel);
  }
  if (messageVersionManager && messageAssertionManager) {
    chatPlan.setMessageManagers(messageVersionManager, messageAssertionManager);
  }
  // Note: GroupPlan is now auto-created by ChatPlan using TopicModel
  // No manual initialization needed
}

// IPC parameter interfaces
interface SendMessageParams {
  conversationId: string;
  text: string;
  attachments?: any[];
}

interface GetMessagesParams {
  conversationId: string;
  limit?: number;
  offset?: number;
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
  conversationId: string;
}

interface AddParticipantsParams {
  conversationId: string;
  participantIds: string[];
}

interface ClearConversationParams {
  conversationId: string;
}

interface EditMessageParams {
  messageId: string;
  conversationId: string;
  newText: string;
  editReason?: string;
}

interface DeleteMessageParams {
  messageId: string;
  conversationId: string;
  reason?: string;
}

interface GetMessageHistoryParams {
  messageId: string;
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

    const response = await chatPlan.uiReady({});
    return { success: response.success, error: response.error };
  },

  async sendMessage(event: IpcMainInvokeEvent, { conversationId, text, attachments = [] }: SendMessageParams): Promise<IpcResponse> {
    console.log(`[Chat] 📨 sendMessage called: conversationId="${conversationId}", text="${text.substring(0, 50)}..."`);

    // Start message persistence (don't await yet - let AI start in parallel)
    const savePromise = chatPlan.sendMessage({
      conversationId,
      content: text,  // Map 'text' to 'content'
      attachments
    });

    // Trigger AI response immediately if this is an AI topic
    // This runs in parallel with message persistence for lower latency
    if (nodeOneCore.aiAssistantModel?.isAITopic(conversationId)) {
      const senderId = nodeOneCore.ownerId;
      if (senderId) {
        console.log(`[Chat] 🤖 AI topic detected - triggering AI response in parallel`);
        // Fire and forget - don't await, let it run alongside persistence
        nodeOneCore.aiAssistantModel.processMessage(conversationId, text, senderId).catch(err => {
          console.error(`[Chat] ❌ AI processing error:`, err);
        });
      }
    }

    // Now await persistence
    const response = await savePromise;
    console.log(`[Chat] 📤 Message sent successfully: ${response.success}`);

    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getMessages(event: IpcMainInvokeEvent, { conversationId, limit = 50, offset = 0 }: GetMessagesParams): Promise<IpcResponse> {
    const response = await chatPlan.getMessages({ conversationId, limit, offset });
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
        const topic = await chatPlan.createGroupConversation(groupName, participants as any);
        // Extract topic ID from the topic object
        const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');
        const topicIdHash = await calculateIdHashOfObj(topic);
        response = {
          success: true,
          data: {
            id: topic.id || topicIdHash,
            name: topic.name || groupName,
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
      response = await chatPlan.createConversation({ type, participants, name });
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

    // Assembly creation is handled by ChatPlan → GroupPlan → StoryFactory (platform-agnostic)

    return {
      success: true,
      data: response.data,
      error: response.error
    };
  },

  async createP2PConversation(event: IpcMainInvokeEvent, { localPersonId, remotePersonId }: { localPersonId: any; remotePersonId: any }): Promise<IpcResponse> {
    console.log('[Chat IPC] createP2PConversation called');
    const response = await chatPlan.createP2PConversation({ localPersonId, remotePersonId });
    return {
      success: response.success,
      topicId: response.topicId,
      topicRoom: response.topicRoom,
      error: response.error
    };
  },

  async getConversations(event: IpcMainInvokeEvent, { limit = 20, offset = 0 }: GetConversationsParams = {}): Promise<IpcResponse> {
    const response = await chatPlan.getConversations({ limit, offset });
    console.log(`[Chat IPC] getConversations response: success=${response.success}, count=${response.data?.length || 0}`);
    if (response.data && response.data.length > 0) {
      console.log(`[Chat IPC] Conversations:`, response.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        participants: c.participants?.length || 0,
        isAITopic: c.isAITopic
      })));
    }

    // Enrich conversations with topic version history (using one.core directly)
    if (response.success && response.data && nodeOneCore.topicModel) {
      const { getVersionsHashes } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      const { getObject } = await import('@refinio/one.core/lib/storage-unversioned-objects.js');

      response.data = await Promise.all(response.data.map(async (conv: any) => {
        try {
          // Get topic idHash from conversation
          console.log(`[Chat IPC] Checking topic history for ${conv.id}, idHash: ${conv.topicIdHash?.substring(0, 16) || 'MISSING'}`);
          if (conv.topicIdHash) {
            const versionHashes = await getVersionsHashes(conv.topicIdHash);
            console.log(`[Chat IPC] Topic ${conv.id} has ${versionHashes?.length || 0} versions`);
            if (versionHashes && versionHashes.length > 1) {
              // Load all versions and build history
              const topicHistory = await Promise.all(versionHashes.map(async (hash: any, index: number) => {
                const topic = await getObject(hash) as any;
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
        const allModelsFromStorage = nodeOneCore.llmManager?.getAvailableModels() || [];
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

        // Import for getting Topic with aiParticipants
        const { getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

        // Use Promise.all since getModelIdForTopic is async
        response.data = await Promise.all(response.data.map(async (conv: any) => {
          const enriched = { ...conv };

          // Get Topic to access aiParticipants settings
          let topicAiParticipants: Map<string, any> | undefined;
          if (conv.topicIdHash) {
            try {
              const topicResult = await getObjectByIdHash(conv.topicIdHash) as any;
              topicAiParticipants = topicResult?.obj?.aiParticipants;
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

    console.log(`[Chat IPC] Returning ${response.data?.length || 0} conversations to UI`);
    if (response.data && response.data.length > 0) {
      console.log(`[Chat IPC] Final conversations:`, response.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        participants: c.participants?.length || 0,
        hasAIParticipant: c.hasAIParticipant
      })));
    }

    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getConversation(event: IpcMainInvokeEvent, { conversationId }: GetConversationParams): Promise<any> {
    const response = await chatPlan.getConversation({ conversationId });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getCurrentUser(event: IpcMainInvokeEvent): Promise<IpcResponse> {
    const response = await chatPlan.getCurrentUser({});
    return {
      success: response.success,
      user: response.user,
      error: response.error
    };
  },

  async addParticipants(event: IpcMainInvokeEvent, { conversationId, participantIds }: AddParticipantsParams): Promise<IpcResponse> {
    const response = await chatPlan.addParticipants({ conversationId, participantIds });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async clearConversation(event: IpcMainInvokeEvent, { conversationId }: ClearConversationParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatPlan.clearConversation({ conversationId });
    return {
      success: response.success,
      error: response.error
    };
  },

  async editMessage(event: IpcMainInvokeEvent, { messageId, conversationId, newText, editReason }: EditMessageParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatPlan.editMessage({ messageId, conversationId, newText, editReason });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async deleteMessage(event: IpcMainInvokeEvent, { messageId, conversationId, reason }: DeleteMessageParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatPlan.deleteMessage({ messageId, conversationId, reason });
    return {
      success: response.success,
      error: response.error
    };
  },

  async getMessageHistory(event: IpcMainInvokeEvent, { messageId }: GetMessageHistoryParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatPlan.getMessageHistory({ messageId });
    return {
      success: response.success,
      history: response.history,
      error: response.error
    };
  },

  async exportMessageCredential(event: IpcMainInvokeEvent, { messageId }: ExportMessageCredentialParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatPlan.exportMessageCredential({ messageId });
    return {
      success: response.success,
      credential: response.credential,
      error: response.error
    };
  },

  async verifyMessageAssertion(event: IpcMainInvokeEvent, { certificateHash, messageHash }: VerifyMessageAssertionParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatPlan.verifyMessageAssertion({ certificateHash, messageHash });
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

      // Get topic idHash from registry
      const topicIdHash = await nodeOneCore.topicModel.topics.queryIdHashById(topicId);
      console.log('[Chat IPC] topicIdHash from registry:', topicIdHash);
      if (!topicIdHash) {
        return { success: true, data: [] }; // No idHash = no history
      }

      // Get all versions using ONE.core
      const { getVersionsHashes } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
      const { getObject } = await import('@refinio/one.core/lib/storage-unversioned-objects.js');

      const versionHashes = await getVersionsHashes(topicIdHash);
      console.log('[Chat IPC] versionHashes:', versionHashes?.length, versionHashes);
      if (!versionHashes || versionHashes.length === 0) {
        return { success: true, data: [] };
      }

      // Load each version to get its name
      const history = await Promise.all(versionHashes.map(async (hash: any, index: number) => {
        const topic = await getObject(hash) as any;
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
  }
};

export { chatPlans, chatPlan };
