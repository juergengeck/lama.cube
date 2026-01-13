/**
 * Peer Message Listener for Node.js instance
 *
 * Subscribes to CoreModule's onTopicUpdated event and notifies
 * the UI when messages change in any topic (via CHUM sync or local).
 */

import { getCoreModule } from '../registry/module-registry-init.js';

class PeerMessageListener {
  public topicModel: any;
  public unsubscribe: (() => void) | null = null;
  public mainWindow: any;
  public ownerId: any;
  public lastMessageCounts: Map<string, number> = new Map();
  public pendingNotifications: Array<{ topicId: string; messages: any[] }> = [];

  constructor(_channelManager: any, topicModel: any) {
    // Note: channelManager not needed - we use CoreModule's onTopicUpdated
    this.topicModel = topicModel;
    this.mainWindow = null;
    this.ownerId = null;
}
  
  /**
   * Set the main window for IPC communication
   */
  setMainWindow(mainWindow: any): any {
    this.mainWindow = mainWindow
    console.log('[PeerMessageListener] Main window reference set')

    // Set up listener for when webContents becomes ready
    if (mainWindow.webContents) {
      mainWindow.webContents.on('did-finish-load', () => {
        this.flushPendingNotifications()
      })
    }
  }

  /**
   * Flush any pending notifications that were queued while webContents was loading
   */
  flushPendingNotifications(): void {
    if (this.pendingNotifications.length === 0) return;

    console.log(`[PeerMessageListener] Flushing ${this.pendingNotifications.length} pending notifications`);
    const pending = [...this.pendingNotifications];
    this.pendingNotifications = [];

    for (const { topicId, messages } of pending) {
      this.notifyUI(topicId, messages);
    }
  }
  
  /**
   * Set the owner ID to filter out our own messages
   */
  setOwnerId(ownerId: any): any {
    this.ownerId = ownerId
    console.log(`[PeerMessageListener] Owner ID set: ${ownerId?.substring(0, 8)}`)
  }

  /**
   * Start listening for peer messages via CoreModule's onTopicUpdated
   */
  async start(): Promise<void> {
    console.log('[PeerMessageListener] Starting peer message listener...');

    const coreModule = getCoreModule();
    if (!coreModule) {
      console.error('[PeerMessageListener] Cannot start - CoreModule not initialized');
      return;
    }

    console.log('[PeerMessageListener] 🎯 Subscribing to CoreModule.onTopicUpdated...');

    // Subscribe to CoreModule's topic update events
    this.unsubscribe = coreModule.onTopicUpdated(async (topicId: string) => {
      try {
        await this.handleTopicUpdate(topicId);
      } catch (error) {
        console.error(`[PeerMessageListener] Error processing topic update:`, error);
      }
    });

    console.log('[PeerMessageListener] ✅ Peer message listener started successfully');
  }
  
  /**
   * Handle topic updates and detect new peer messages
   */
  async handleTopicUpdate(topicId: string): Promise<void> {
    // Skip if no main window to notify
    if (!this.mainWindow) {
      return;
    }

    console.log(`[PeerMessageListener] 📨 Topic update for: ${topicId}`);

    try {
      if (!this.topicModel) {
        console.log('[PeerMessageListener] TopicModel not available yet');
        return;
      }

      // Get the topic room to check for new messages
      const topicRoom = await this.topicModel.enterTopicRoom(topicId);
      if (!topicRoom) {
        return;
      }

      // Get all messages in the topic
      const messages = await topicRoom.retrieveAllMessages();
      const validMessages = messages.filter((msg: any) =>
        msg.data?.text && typeof msg.data.text === 'string' && msg.data.text.trim() !== ''
      );

      // Check if we have new messages
      const previousCount = this.lastMessageCounts.get(topicId) || 0;
      const currentCount = validMessages.length;

      if (currentCount > previousCount) {
        console.log(`[PeerMessageListener] 🆕 New messages in ${topicId}: ${currentCount - previousCount} new`);

        // Get the new messages
        const newMessages = validMessages.slice(previousCount);

        // Check if any new messages are from peers (not from us)
        const peerMessages = newMessages.filter((msg: any) => {
          const senderId = msg.data?.sender || msg.data?.author || msg.author;
          return senderId !== this.ownerId;
        });

        if (peerMessages.length > 0) {
          console.log(`[PeerMessageListener] 📬 ${peerMessages.length} peer messages in ${topicId}`);
          this.notifyUI(topicId, peerMessages);
        }

        this.lastMessageCounts.set(topicId, currentCount);
      }
    } catch (error) {
      if (!(error as Error).message?.includes('not found')) {
        console.error(`[PeerMessageListener] Error checking topic ${topicId}:`, (error as Error).message);
      }
    }
  }
  
  /**
   * Notify the UI about new peer messages
   */
  notifyUI(topicId: string, newMessages: any[]): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // HashGroup-based topic IDs are already deterministic
    const normalizedTopicId = topicId;

    // Ensure webContents is ready - if not, queue the notification
    if (!this.mainWindow.webContents || this.mainWindow.webContents.isLoading()) {
      console.log('[PeerMessageListener] WebContents not ready, queuing notification');
      this.pendingNotifications.push({ topicId: normalizedTopicId, messages: newMessages });
      return;
    }

    // Send IPC event to renderer
    const eventData = {
      conversationId: normalizedTopicId,
      messages: newMessages.map((msg: any, index: number) => ({
        id: msg.id || msg.channelEntryHash || `msg-${Date.now()}-${index}`,
        conversationId: normalizedTopicId,
        text: msg.data?.text || '',
        sender: msg.data?.sender || msg.data?.author || msg.author,
        timestamp: msg.creationTime ? new Date(msg.creationTime).toISOString() : new Date().toISOString(),
        status: 'received',
        isAI: false
      }))
    };

    console.log(`[PeerMessageListener] 📤📤📤 Sending chat:newMessages for: ${eventData.conversationId}`);
    this.mainWindow.webContents.send('chat:newMessages', eventData);
  }
  
  /**
   * Stop listening for messages
   */
  stop(): void {
    console.log('[PeerMessageListener] Stopping peer message listener...');

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.lastMessageCounts.clear();
    this.pendingNotifications = [];

    console.log('[PeerMessageListener] Peer message listener stopped');
  }
}

export default PeerMessageListener;