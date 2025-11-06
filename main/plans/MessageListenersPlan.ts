/**
 * Message Listeners Plan
 *
 * Extracted from NodeOneCore.setupMessageSync() listener initialization
 * Handles creation and startup of AI and peer message listeners.
 *
 * Principles:
 * - Separate AI and peer message handling
 * - Fail fast if required dependencies missing
 * - Start listeners after full initialization
 */

import type ChannelManager from '@refinio/one.models/lib/models/ChannelManager.js';
import type TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';

export interface MessageListenersContext {
  channelManager: ChannelManager;
  topicModel: TopicModel;
  llmManager: any;
  aiAssistantModel: any;
  ownerId: SHA256IdHash<Person>;
}

export interface MessageListeners {
  aiMessageListener: any;
  peerMessageListener: any;
}

/**
 * Message Listeners Plan
 * Creates and starts message listeners for AI and peer messages
 */
export class MessageListenersPlan {
  async execute(context: MessageListenersContext): Promise<MessageListeners> {
    console.log('[MessageListenersPlan] Initializing message listeners...');

    // Step 1: Create AI message listener
    const aiMessageListener = await this.createAIMessageListener(context);

    // Step 2: Create peer message listener
    const peerMessageListener = await this.createPeerMessageListener(context);

    // Step 3: Connect AI assistant to listener
    aiMessageListener.setAIAssistantModel(context.aiAssistantModel);
    console.log('[MessageListenersPlan] ✅ Connected AI Assistant to listener');

    // Step 4: Start listeners
    await this.startListeners(aiMessageListener, peerMessageListener, context.ownerId);

    console.log('[MessageListenersPlan] ✅ All message listeners started');

    return {
      aiMessageListener,
      peerMessageListener
    };
  }

  private async createAIMessageListener(context: MessageListenersContext): Promise<any> {
    console.log('[MessageListenersPlan] Creating AI message listener...');

    const AIMessageListener = await import('../core/ai-message-listener.js');

    const aiMessageListener = new AIMessageListener.default(
      context.channelManager,
      context.llmManager
    );

    console.log('[MessageListenersPlan] ✅ AI message listener created');
    return aiMessageListener;
  }

  private async createPeerMessageListener(context: MessageListenersContext): Promise<any> {
    console.log('[MessageListenersPlan] Creating peer message listener...');

    const PeerMessageListener = await import('../core/peer-message-listener.js');

    const peerMessageListener = new PeerMessageListener.default(
      context.channelManager,
      context.topicModel
    );

    console.log('[MessageListenersPlan] ✅ Peer message listener created');
    return peerMessageListener;
  }

  private async startListeners(
    aiMessageListener: any,
    peerMessageListener: any,
    ownerId: SHA256IdHash<Person>
  ): Promise<void> {
    console.log('[MessageListenersPlan] Starting listeners...');

    // Start AI message listener
    aiMessageListener.start();

    // Configure peer message listener
    const { BrowserWindow } = await import('electron');
    const mainWindow = BrowserWindow.getAllWindows()[0];

    if (mainWindow) {
      peerMessageListener.setMainWindow(mainWindow);
    }

    peerMessageListener.setOwnerId(ownerId);
    peerMessageListener.start();

    console.log('[MessageListenersPlan] ✅ Listeners started');
  }
}
