/**
 * Chat IPC Handlers
 * Thin adapter that delegates to chat.core ChatHandler
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ChatHandler } from '@chat/core/handlers/ChatHandler.js';
import stateManager from '../../state/manager.js';
import nodeProvisioning from '../../services/node-provisioning.js';
import nodeOneCore from '../../core/node-one-core.js';
import { MessageVersionManager } from '../../core/message-versioning.js';
import { MessageAssertionManager } from '../../core/message-assertion-certificates.js';
import electron from 'electron';
const { BrowserWindow } = electron;

// Message version manager instance
let messageVersionManager: MessageVersionManager | null = null;

// Message assertion manager instance
let messageAssertionManager: MessageAssertionManager | null = null;

// Initialize ChatHandler with dependencies
const chatHandler = new ChatHandler(nodeOneCore, stateManager, messageVersionManager, messageAssertionManager);

// Initialize message managers when they become available
function initializeMessageManagers() {
  if (!messageVersionManager && nodeOneCore.channelManager) {
    messageVersionManager = new MessageVersionManager(nodeOneCore.channelManager);
  }
  if (!messageAssertionManager && nodeOneCore.leuteModel && nodeOneCore.leuteModel.trust) {
    messageAssertionManager = new MessageAssertionManager(nodeOneCore.leuteModel.trust, nodeOneCore.leuteModel);
  }
  if (messageVersionManager && messageAssertionManager) {
    chatHandler.setMessageManagers(messageVersionManager, messageAssertionManager);
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

const chatHandlers = {
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

    const response = await chatHandler.uiReady({});
    return { success: response.success, error: response.error };
  },

  async sendMessage(event: IpcMainInvokeEvent, { conversationId, text, attachments = [] }: SendMessageParams): Promise<IpcResponse> {
    console.log(`[Chat] 📨 sendMessage called: conversationId="${conversationId}", text="${text.substring(0, 50)}..."`);

    const response = await chatHandler.sendMessage({
      conversationId,
      content: text,  // Map 'text' to 'content'
      attachments
    });

    console.log(`[Chat] 📤 Message sent successfully: ${response.success}`);

    // NOTE: AI responses are handled automatically by AIMessageListener via channel updates
    // No manual processMessage() call needed - AIMessageListener listens for new messages
    // and triggers AI responses when appropriate

    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getMessages(event: IpcMainInvokeEvent, { conversationId, limit = 50, offset = 0 }: GetMessagesParams): Promise<IpcResponse> {
    const response = await chatHandler.getMessages({ conversationId, limit, offset });
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

    // Create conversation via chat.core (generic operation)
    const response = await chatHandler.createConversation({ type, participants, name });

    if (!response.success || !response.data) {
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }

    // Register AI topic with model ID if aiModelId was provided
    if (aiModelId && response.data.id && nodeOneCore.aiAssistantModel) {
      try {
        await nodeOneCore.aiAssistantModel.registerAITopic(response.data.id, aiModelId);
        console.error(`[Chat IPC] ✅ Registered AI topic: ${response.data.id} with model: ${aiModelId}`);
      } catch (error) {
        console.error('[Chat IPC] Failed to register AI topic:', error);
        // Non-fatal: conversation was created successfully
      }
    }

    return {
      success: true,
      data: response.data,
      error: response.error
    };
  },

  async getConversations(event: IpcMainInvokeEvent, { limit = 20, offset = 0 }: GetConversationsParams = {}): Promise<IpcResponse> {
    const response = await chatHandler.getConversations({ limit, offset });

    // Enrich conversations with LLM participant metadata (coordination layer)
    if (response.success && response.data && nodeOneCore.aiAssistantModel) {
      try {
        response.data = response.data.map((conv: any) => {
          const enriched = { ...conv };

          // Check if this topic is registered as an AI topic
          enriched.isAITopic = nodeOneCore.aiAssistantModel.isAITopic(conv.id);
          if (enriched.isAITopic) {
            enriched.aiModelId = nodeOneCore.aiAssistantModel.getModelIdForTopic(conv.id);
          }

          // Enrich participants with LLM info
          if (conv.participants && Array.isArray(conv.participants)) {
            enriched.participants = conv.participants.map((p: any) => {
              const isLLM = nodeOneCore.aiAssistantModel.isAIPerson(p.id);
              return {
                ...p,
                isLLM
              };
            });

            // Check if any participant is an LLM
            enriched.hasLLMParticipant = enriched.participants.some((p: any) => p.isLLM);
          }

          return enriched;
        });
      } catch (error) {
        console.error('[Chat IPC] Failed to enrich conversations with LLM metadata:', error);
        // Non-fatal - return conversations without enrichment
      }
    }

    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getConversation(event: IpcMainInvokeEvent, { conversationId }: GetConversationParams): Promise<any> {
    const response = await chatHandler.getConversation({ conversationId });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async getCurrentUser(event: IpcMainInvokeEvent): Promise<IpcResponse> {
    const response = await chatHandler.getCurrentUser({});
    return {
      success: response.success,
      user: response.user,
      error: response.error
    };
  },

  async addParticipants(event: IpcMainInvokeEvent, { conversationId, participantIds }: AddParticipantsParams): Promise<IpcResponse> {
    const response = await chatHandler.addParticipants({ conversationId, participantIds });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async clearConversation(event: IpcMainInvokeEvent, { conversationId }: ClearConversationParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatHandler.clearConversation({ conversationId });
    return {
      success: response.success,
      error: response.error
    };
  },

  async editMessage(event: IpcMainInvokeEvent, { messageId, conversationId, newText, editReason }: EditMessageParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatHandler.editMessage({ messageId, conversationId, newText, editReason });
    return {
      success: response.success,
      data: response.data,
      error: response.error
    };
  },

  async deleteMessage(event: IpcMainInvokeEvent, { messageId, conversationId, reason }: DeleteMessageParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatHandler.deleteMessage({ messageId, conversationId, reason });
    return {
      success: response.success,
      error: response.error
    };
  },

  async getMessageHistory(event: IpcMainInvokeEvent, { messageId }: GetMessageHistoryParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatHandler.getMessageHistory({ messageId });
    return {
      success: response.success,
      history: response.history,
      error: response.error
    };
  },

  async exportMessageCredential(event: IpcMainInvokeEvent, { messageId }: ExportMessageCredentialParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatHandler.exportMessageCredential({ messageId });
    return {
      success: response.success,
      credential: response.credential,
      error: response.error
    };
  },

  async verifyMessageAssertion(event: IpcMainInvokeEvent, { certificateHash, messageHash }: VerifyMessageAssertionParams): Promise<IpcResponse> {
    // Initialize message managers if needed
    initializeMessageManagers();

    const response = await chatHandler.verifyMessageAssertion({ certificateHash, messageHash });
    return {
      success: response.success,
      valid: response.valid,
      error: response.error
    };
  }
};

export { chatHandlers, chatHandler };
