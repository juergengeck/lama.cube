/**
 * AI Message Listener for Node.js instance
 *
 * Based on LAMA's messageListener.ts, adapted for Node.js
 * Sets up channel listeners to detect new messages in AI topics
 * and trigger AI response generation.
 */

import { createAIMessage } from '../utils/message-utils.js'
import type { ChannelManager } from '@refinio/one.models/lib/models/index.js'
import type { LLMManager } from '../types/one-core.js'
import type { AIAssistantHandler } from '@lama/core/handlers/AIAssistantHandler.js'

class AIMessageListener {
  channelManager: ChannelManager;
  llmManager: LLMManager;
  aiAssistantModel: AIAssistantHandler | null;
  unsubscribe: (() => void) | null;
  debounceTimers: Map<string, NodeJS.Timeout>;
  DEBOUNCE_MS: number;
  pollInterval: NodeJS.Timeout | null;

  constructor(channelManager: ChannelManager, llmManager: LLMManager) {
    this.channelManager = channelManager
    this.llmManager = llmManager
    this.aiAssistantModel = null // Will be set after AIAssistantModel is initialized
    this.unsubscribe = null
    this.debounceTimers = new Map()
    this.DEBOUNCE_MS = 800 // Increased delay to ensure user message displays first
    this.pollInterval = null
}
  
  /**
   * Set the AI Assistant Handler reference
   */
  setAIAssistantModel(aiAssistantModel: AIAssistantHandler): void {
    this.aiAssistantModel = aiAssistantModel
    console.log('[AIMessageListener] AI Assistant Model reference set')
  }

  /**
   * Start listening for messages in AI topics
   */
  async start(): Promise<any> {
    // Prevent multiple starts
    if (this.unsubscribe || this.pollInterval) {
      console.log('[AIMessageListener] Already started - skipping')
      return
    }

    console.log('[AIMessageListener] Starting message listener...')

    if (!this.channelManager) {
      console.error('[AIMessageListener] Cannot start - channelManager is undefined')
      return
    }

    if (!this.channelManager.onUpdated) {
      console.error('[AIMessageListener] Cannot start - channelManager.onUpdated is undefined')
      console.log('[AIMessageListener] Available channelManager methods:', Object.keys(this.channelManager))
      return
    }

    console.log('[AIMessageListener] Setting up channel update listener...')

    // No need to join - channel manager listener handles messages

    // Set up channel update listener - onUpdated is a function that takes a callback
    console.log('[AIMessageListener] 🎯🎯🎯 NODE: Registering channelManager.onUpdated callback')

    // Get instance to check our owner ID
    let ownerId: string | undefined;
    try {
      const nodeCore = await import('./node-one-core.js')
      ownerId = nodeCore.default?.ownerId || nodeCore.instance?.ownerId
    } catch (e: any) {
      console.log('[AIMessageListener] Could not get owner ID:', e.message)
    }
    console.log(`[AIMessageListener] Node owner ID: ${ownerId?.substring(0, 8)}`)

    // Check what channels we know about
    try {
      const channels = await this.channelManager.getMatchingChannelInfos({})
      console.log(`[AIMessageListener] Known channels at startup:`, channels.map(c => ({
        id: c.id,
        owner: c.owner?.substring(0, 8),
        isOurChannel: c.owner === ownerId
      })))

      // Check if ChannelManager is properly subscribed
      console.log('[AIMessageListener] 🔍 Checking ChannelManager subscription state...')
      if ((channels as any)?.length === 0) {
        console.warn('[AIMessageListener] ⚠️ No channels found - CHUM sync may not be working!')
      }
    } catch (err: any) {
      console.log('[AIMessageListener] Could not get channels:', err)
    }

    // Add periodic check for channels - save to this.pollInterval for cleanup
    this.pollInterval = setInterval(async () => {
      try {
        const channels = await this.channelManager.getMatchingChannelInfos({})
        console.log(`[AIMessageListener] 📊 Periodic channel check - found ${(channels as any)?.length} channels`)
        if ((channels as any)?.length > 0) {
          console.log('[AIMessageListener] Channel IDs:', channels.map(c => c.id))
        }
      } catch (err: any) {
        console.error('[AIMessageListener] Periodic check failed:', err)
      }
    }, 10000) // Check every 10 seconds
    
    // Use onUpdated as a function like other parts of the codebase
    this.unsubscribe = this.channelManager.onUpdated(async (
      channelInfoIdHash,
      channelId,
      channelOwner,
      timeOfEarliestChange,
      data
    ) => {
      const isOurChannel = channelOwner === ownerId
      console.log('[AIMessageListener] 🔔🔔🔔 NODE: Channel update received!', {
        channelId,
        channelOwner: channelOwner?.substring(0, 8),
        isOurChannel,
        nodeOwner: ownerId?.substring(0, 8),
        dataLength: data?.length,
        timeOfEarliestChange
      })

      // CRITICAL: Ignore updates from AI channels (those are AI's own responses)
      // In group chats, each participant has their own channel
      // We should only respond to messages in HUMAN participants' channels
      // Check if channel owner is an AI person, not just if it matches node owner
      const isAIChannel = channelOwner && this.aiAssistantModel && this.aiAssistantModel.isAIPerson(channelOwner)
      if (isAIChannel) {
        console.log(`[AIMessageListener] ⏭️  Ignoring update from AI channel: ${channelId}`)
        return
      }

      // Debounce frequent updates
      const existingTimer = (this.debounceTimers as any)?.get(channelId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timerId = setTimeout(async () => {
        this.debounceTimers.delete(channelId)

        // Process ALL channel updates - let AIAssistantModel decide if it should respond
        // This allows LLMs to participate in any conversation, and supports future
        // LLM capabilities like user support and indexing
        console.log(`[AIMessageListener] 📢 Channel update: ${channelId}`)
        console.log(`[AIMessageListener] Data entries: ${data ? (data as any)?.length : 0}`)

        try {
          // Process the channel update - AIAssistantModel will determine if response needed
          await this.handleChannelUpdate(channelId, {
            channelId,
            isChannelUpdate: true,
            timeOfEarliestChange,
            data
          })
        } catch (error) {
          console.error(`[AIMessageListener] Error processing channel update:`, error)
        }
      }, this.DEBOUNCE_MS)

      this.debounceTimers.set(channelId, timerId)
    })

    console.log('[AIMessageListener] Message listener started successfully')

    // Scan for unanswered messages on startup (non-blocking)
    // CRITICAL: Do NOT await - this would block event loop during initialization
    this.scanForUnansweredMessages(ownerId).catch(error => {
      console.error('[AIMessageListener] Error scanning for unanswered messages:', error)
    })
  }
  
  /**
   * Scan for unanswered messages on startup
   * Checks all AI topics and responds to any unanswered messages from users
   */
  async scanForUnansweredMessages(ownerId: string | undefined): Promise<void> {
    console.log('[AIMessageListener] 🔍 Scanning for unanswered messages on startup...')

    if (!this.aiAssistantModel) {
      console.log('[AIMessageListener] AIAssistantModel not available for scanning')
      return
    }

    // Get all AI topics using the public API method
    const aiTopics = this.aiAssistantModel.getAllAITopicIds()
    if (!aiTopics || aiTopics.length === 0) {
      console.log('[AIMessageListener] No AI topics registered yet')
      return
    }
    console.log(`[AIMessageListener] Found ${aiTopics.length} AI topics to scan:`, aiTopics)

    for (const topicId of aiTopics) {
      try {
        console.log(`[AIMessageListener] 🔍 Scanning topic: ${topicId}`)

        // Get the TopicModel
        const nodeCore = await import('./node-one-core.js')
        const topicModel = nodeCore.default?.topicModel
        if (!topicModel) {
          console.log(`[AIMessageListener] TopicModel not available`)
          continue
        }

        // Enter the topic room
        const topicRoom = await topicModel.enterTopicRoom(topicId)
        if (!topicRoom) {
          console.log(`[AIMessageListener] Could not enter topic room ${topicId}`)
          continue
        }

        // Get all messages
        const messages = await topicRoom.retrieveAllMessages()
        if (!messages || (messages as any)?.length === 0) {
          console.log(`[AIMessageListener] No messages in topic ${topicId}`)
          continue
        }

        // Get the last message
        const lastMessage = messages[(messages as any)?.length - 1]
        const messageText = lastMessage.data?.text
        const messageSender = lastMessage.data?.sender || lastMessage.author

        if (!messageText || !messageText.trim()) {
          console.log(`[AIMessageListener] Last message in ${topicId} has no text, skipping`)
          continue
        }

        // Check if the message is from an AI
        const isFromAI = this.isAIMessage(lastMessage)

        if (isFromAI) {
          console.log(`[AIMessageListener] ✅ Last message in ${topicId} is from AI, no need to respond`)
          continue
        }

        // Found an unanswered message from a user!
        console.log(`[AIMessageListener] 💬 Found unanswered message in ${topicId}: "${messageText.substring(0, 50)}..."`)
        console.log(`[AIMessageListener] 🤖 Generating response...`)

        // Process the message using AIAssistantHandler (modern approach)
        try {
          // Import the handler adapter
          const { getAIAssistantHandler } = await import('./ai-assistant-handler-adapter.js')
          const handler = getAIAssistantHandler()

          // Call processMessage on the handler
          await handler.processMessage(topicId, messageText, messageSender)
          console.log(`[AIMessageListener] ✅ Responded to unanswered message in ${topicId}`)
        } catch (error) {
          console.error(`[AIMessageListener] ⚠️  Failed to process unanswered message:`, error)
        }

      } catch (error) {
        console.error(`[AIMessageListener] Error scanning topic ${topicId}:`, error)
      }
    }

    console.log('[AIMessageListener] ✅ Finished scanning for unanswered messages')
  }

  /**
   * Stop listening for messages
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      console.log('[AIMessageListener] Polling stopped')
    }
    
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      console.log('[AIMessageListener] Message listener stopped')
    }
    
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
  
  /**
   * Register a topic as an AI topic with model mapping
   * @deprecated - AIAssistantHandler is the source of truth, delegate to it
   */
  registerAITopic(topicId: string, modelId: string): void {
    console.log(`[AIMessageListener] DEPRECATED: registerAITopic called, should use AIAssistantModel.registerAITopic instead`)
    // Delegate to AIAssistantModel if available
    if (this.aiAssistantModel) {
      this.aiAssistantModel.registerAITopic(topicId, modelId)
    } else {
      console.warn(`[AIMessageListener] Cannot register topic ${topicId} - AIAssistantModel not available`)
    }
  }

  /**
   * Check if a topic is an AI topic
   * AIAssistantHandler is the source of truth - always delegate to it
   */
  isAITopic(topicId: string): boolean {
    // AIAssistantModel is the source of truth
    if (this.aiAssistantModel && this.aiAssistantModel.isAITopic) {
      return this.aiAssistantModel.isAITopic(topicId)
    }

    // Fallback for 'default' channel if AIAssistantModel not available yet
    if (topicId === 'default') {
      return true
    }

    console.warn(`[AIMessageListener] AIAssistantModel not available, cannot check if ${topicId} is AI topic`)
    return false
  }
  
  /**
   * Decide if AI should respond to a message
   * This is where AI intelligence comes in - for now simple rules
   */
  shouldAIRespond(channelId: string, message: any): boolean {
    // Always respond in lama channel
    if (channelId === 'lama') return true
    
    // Could add more logic here:
    // - Check if message mentions AI
    // - Check if it's a question
    // - Check conversation context
    // - Check if AI is explicitly asked to respond
    
    // For now, respond to all messages in channels we're monitoring
    return true
  }
  
  /**
   * Handle channel update - check if any LLM participant should respond
   */
  async handleChannelUpdate(channelId: string, updateInfo: any): Promise<void> {
    console.log(`[AIMessageListener] Processing channel update for ${channelId}`)

    if (!this.aiAssistantModel) {
      console.log(`[AIMessageListener] AIAssistantModel not available, skipping`)
      return
    }

    // Get the TopicModel from the core instance
    let topicModel;
    try {
      const nodeCore = await import('./node-one-core.js')
      // The default export IS the instance
      topicModel = nodeCore.default?.topicModel

      if (!topicModel) {
        console.log('[AIMessageListener] TopicModel not on default, checking instance export...')
        topicModel = nodeCore.instance?.topicModel
      }
    } catch (e: any) {
      console.error('[AIMessageListener] Error importing node-one-core:', e)
      return
    }

    if (!topicModel) {
      const nodeCore = await import('./node-one-core.js')
      console.error('[AIMessageListener] TopicModel not available - instance:', !!nodeCore.default, 'topicModel:', !!topicModel)
      return
    }

    try {
      // Enter the topic room to get messages
      const topicRoom = await topicModel.enterTopicRoom(channelId)
      if (!topicRoom) {
        console.error(`[AIMessageListener] Could not enter topic room ${channelId}`)
        return
      }

      // Get all messages from the topic
      const messages = await topicRoom.retrieveAllMessages()
      console.log(`[AIMessageListener] Found ${(messages as any)?.length} messages in topic`)

      // If this is a new topic with no messages, skip processing
      // Welcome messages are handled during topic creation
      if ((messages as any)?.length === 0) {
        console.log(`[AIMessageListener] Empty topic ${channelId} - skipping`)
        return
      }

      // Check if any LLM participant should respond to the last message
      if ((messages as any)?.length > 0) {
        const lastMessage = messages[(messages as any)?.length - 1]
        const messageText = lastMessage.data?.text
        const messageSender = lastMessage.data?.sender || lastMessage.author

        if (!messageText || !messageText.trim()) {
          console.log(`[AIMessageListener] Last message has no text, skipping`)
          return
        }

        // Check if message is recent (within last 10 seconds)
        const messageAge = Date.now() - new Date(lastMessage.creationTime).getTime()
        const isRecent = messageAge < 10000

        if (!isRecent) {
          console.log(`[AIMessageListener] Message is old (${messageAge}ms), skipping`)
          return
        }

        // Check if message is from an LLM (don't respond to LLM messages)
        const isFromLLM = this.isAIMessage(lastMessage)
        if (isFromLLM) {
          console.log(`[AIMessageListener] Message is from LLM, skipping`)
          return
        }

        // Check if this conversation has any AI participants
        // Get all channels and filter by topic ID (one channel per participant)
        const allChannelInfos = await this.channelManager.getMatchingChannelInfos({})
        const channelInfos = allChannelInfos.filter((ch: any) => ch.id === channelId)

        // Extract unique participant IDs from channel owners
        const participantIds = [...new Set(channelInfos.map((ch: any) => ch.owner).filter(Boolean))]

        // Check if any participant is an AI person
        const hasAIParticipant = participantIds.some((participantId: any) =>
          this.aiAssistantModel.isAIPerson(participantId)
        )

        if (!hasAIParticipant) {
          console.log(`[AIMessageListener] Topic ${channelId} has no AI participants, skipping`)
          return
        }

        console.log(`[AIMessageListener] 💬 Processing message in topic ${channelId}: "${messageText.substring(0, 50)}..." (has AI participant)`)

        // Delegate to AIAssistantModel to process the message and generate response
        try {
          await this.aiAssistantModel.processMessage(channelId, messageText, messageSender)
          console.log(`[AIMessageListener] ✅ LLM response generated for topic ${channelId}`)
        } catch (error) {
          console.error(`[AIMessageListener] Failed to generate LLM response:`, error)
        }
      }
    } catch (error) {
      console.error(`[AIMessageListener] Error handling channel update:`, error)
    }
  }
  
  /**
   * Check if a message is from an AI
   */
  isAIMessage(message: any): boolean {
    // Check if the sender is an AI contact
    const sender = message.data?.sender || message.author
    if (!sender) return false

    // Use AI Assistant Model's isAIPerson method
    if (this.aiAssistantModel) {
      return this.aiAssistantModel.isAIPerson(sender)
    }

    throw new Error('AIAssistantModel not available - cannot determine if person is AI')
  }
  
  /**
   * Process a user message and generate AI response
   * @deprecated - Use AIAssistantHandler.processMessage instead
   */
  async processUserMessage(topicMessages: any, message: any, channelId: string, topicRoom: any): Promise<void> {
    // This method is deprecated - all processing should go through AIAssistantModel
    const messageText = message.data?.text || message.text
    const messageSender = message.data?.sender || message.author
    console.log(`[AIMessageListener] DEPRECATED: processUserMessage called, delegating to AIAssistantModel`)
    if (this.aiAssistantModel) {
      await this.aiAssistantModel.processMessage(channelId, messageText, messageSender)
    }
  }

  /**
   * Legacy method content - kept for reference
   * The actual logic has been moved to AIAssistantHandler.processMessage
   */
  async _legacyProcessUserMessage(): Promise<void> {
    // Original implementation moved to AIAssistantModel
    // This method is kept for reference only
  }
}

export default AIMessageListener;