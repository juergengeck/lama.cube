/**
 * Chat IPC Handlers
 * Thin adapter that delegates to chat.core ChatPlan
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ChatPlan } from '@chat/core/plans/ChatPlan.js';
import { GroupPlan } from '@chat/core/plans/GroupPlan.js';
import stateManager from '../../state/manager.js';
import nodeProvisioning from '../../services/node-provisioning.js';
import nodeOneCore from '../../core/node-one-core.js';
import { MessageVersionManager } from '../../core/message-versioning.js';
import { MessageAssertionManager } from '../../core/message-assertion-certificates.js';
import { StoryFactory, AssemblyPlan } from '@refinio/api/plan-system';
import electron from 'electron';
const { BrowserWindow } = electron;

// Message version manager instance
let messageVersionManager: MessageVersionManager | null = null;

// Message assertion manager instance
let messageAssertionManager: MessageAssertionManager | null = null;

// GroupPlan instance (for Story/Assembly tracking)
let groupPlan: GroupPlan | null = null;

// Initialize ChatPlan with dependencies
const chatPlan = new ChatPlan(nodeOneCore, stateManager, messageVersionManager, messageAssertionManager, groupPlan);

// Initialize message managers and GroupPlan when they become available
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

  // Initialize GroupPlan when TopicGroupManager is available
  if (!groupPlan && nodeOneCore.topicGroupManager) {
    console.log('[Chat IPC] Initializing GroupPlan with TopicGroupManager and StoryFactory');

    // Import ONE.core storage functions for AssemblyPlan
    const { storeVersionedObject, getObjectByIdHash } =
      await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { storeUnversionedObject } =
      await import('@refinio/one.core/lib/storage-unversioned-objects.js');

    // Create AssemblyPlan (connects to ONE.core)
    const assemblyPlan = new AssemblyPlan({
      storeVersionedObject,
      storeUnversionedObject,
      getObjectByIdHash
    });

    // Create StoryFactory with AssemblyPlan
    const storyFactory = new StoryFactory(assemblyPlan);

    console.log('[Chat IPC] ✅ StoryFactory created with AssemblyPlan');

    groupPlan = new GroupPlan(
      nodeOneCore.topicGroupManager,
      nodeOneCore,
      storyFactory
    );

    chatPlan.setGroupPlan(groupPlan);
    console.log('[Chat IPC] ✅ GroupPlan initialized with StoryFactory and injected into ChatPlan');
  }
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

    const response = await chatPlan.sendMessage({
      conversationId,
      content: text,  // Map 'text' to 'content'
      attachments
    });

    console.log(`[Chat] 📤 Message sent successfully: ${response.success}`);

    // For local AI topics, trigger AI response immediately
    console.log(`[Chat] Checking if topic "${conversationId}" has LLM participants...`);
    console.log(`[Chat] nodeOneCore.aiAssistantModel exists:`, !!nodeOneCore.aiAssistantModel);

    if (nodeOneCore.aiAssistantModel) {
      // Check if topic has LLM participants (not just cache)
      const hasLLM = await nodeOneCore.aiAssistantModel.topicHasLLMParticipant(conversationId);
      console.log(`[Chat] topicHasLLMParticipant("${conversationId}") returned:`, hasLLM);

      if (response.success && hasLLM) {
        console.log(`[Chat] 🤖 Triggering AI response for topic: ${conversationId}`);
        setImmediate(async () => {
          try {
            // Get owner person ID (our own ID)
            const ownerPersonId = nodeOneCore.ownerId;
            if (!ownerPersonId) {
              console.error(`[Chat] Cannot trigger AI: owner person ID not available`);
              return;
            }

            console.log(`[Chat] Calling processMessage with topicId="${conversationId}", message="${text.substring(0, 50)}...", senderId="${ownerPersonId.substring(0, 8)}..."`);

            // Pass message text (not messageId) and sender ID
            await nodeOneCore.aiAssistantModel.processMessage(conversationId, text, ownerPersonId);
            console.log(`[Chat] ✅ AI response triggered for topic: ${conversationId}`);
          } catch (error) {
            console.error(`[Chat] Failed to trigger AI response:`, error);
          }
        });
      }
    }

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

    // If aiModelId is provided, ensure LLM contact exists and add to participants
    if (aiModelId && nodeOneCore.aiAssistantModel) {
      try {
        const aiPersonId = await nodeOneCore.aiAssistantModel.ensureAIContactForModel(aiModelId);
        // Add LLM participant to the list if not already present
        if (!participants.includes(String(aiPersonId))) {
          participants.push(String(aiPersonId));
        }
      } catch (error) {
        console.error('[Chat IPC] Failed to ensure AI contact:', error);
        return {
          success: false,
          error: `Failed to create LLM participant: ${(error as Error).message}`
        };
      }
    }

    // If aiModelId not provided but participants include AI, auto-detect the model
    let detectedAIModelId = aiModelId;
    if (!detectedAIModelId && nodeOneCore.aiAssistantModel && participants.length > 0) {
      for (const participantId of participants) {
        if (nodeOneCore.aiAssistantModel.isAIPerson(participantId)) {
          detectedAIModelId = nodeOneCore.aiAssistantModel.getModelIdForPersonId(participantId);
          if (detectedAIModelId) {
            console.error(`[Chat IPC] Auto-detected AI participant: ${participantId.substring(0, 8)} with model: ${detectedAIModelId}`);
            break; // Use first AI participant found
          }
        }
      }
    }

    // Create conversation via chat.core (generic operation)
    const response = await chatPlan.createConversation({ type, participants, name });

    console.error(`[Chat IPC] createConversation response:`, JSON.stringify(response, null, 2));

    if (!response.success || !response.data) {
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }

    console.error(`[Chat IPC] Created conversation with ID: ${response.data.id}, type: ${typeof response.data.id}`);

    // Register AI topic with model ID (use detected or provided)
    if (detectedAIModelId && response.data.id && nodeOneCore.aiAssistantModel) {
      try {
        await nodeOneCore.aiAssistantModel.registerAITopic(response.data.id, detectedAIModelId);
        console.error(`[Chat IPC] ✅ Registered AI topic: ${response.data.id} with model: ${detectedAIModelId}`);
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

    // Enrich conversations with LLM participant metadata (coordination layer)
    if (response.success && response.data && nodeOneCore.aiAssistantModel) {
      try {
        response.data = response.data.map((conv: any) => {
          const enriched = { ...conv };

          // Enrich participants with LLM info
          if (conv.participants && Array.isArray(conv.participants)) {
            enriched.participants = conv.participants.map((p: any) => {
              const isLLM = nodeOneCore.aiAssistantModel.isAIPerson(p.id);
              return {
                ...p,
                isLLM
              };
            });

            // Check if any participant is an LLM - this IS the source of truth
            enriched.hasAIParticipant = enriched.participants.some((p: any) => p.isLLM);

            // Get model ID from the LLM participant
            if (enriched.hasAIParticipant) {
              const llmParticipant = enriched.participants.find((p: any) => p.isLLM);
              if (llmParticipant) {
                const modelId = nodeOneCore.aiAssistantModel.getModelIdForPersonId(llmParticipant.id);
                enriched.aiModelId = modelId;

                // Set modelName from the LLM participant's name (which shows the model)
                enriched.modelName = llmParticipant.name;
              }
            }
          }

          return enriched;
        });
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
  }
};

export { chatPlans, chatPlan };
