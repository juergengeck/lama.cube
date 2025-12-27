// Bridge to integrate LAMA with Electron
// Browser uses IPC ONLY - NO ONE.core, NO AppModel

import { ipcStorage } from '../services/ipc-storage.js'
import { Events } from '@lama/core/events'

export interface LamaAPI {
  // Identity & Authentication
  createIdentity: (name: string, password: string) => Promise<string>
  login: (id: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<{ id: string; name: string } | null>

  // Messaging
  sendMessage: (recipientId: string, content: string, attachments?: any[]) => Promise<string>
  getMessages: (conversationId: string) => Promise<Message[]>
  createChannel: (name: string, members: string[]) => Promise<string>
  
  // P2P Networking
  connectToPeer: (peerId: string) => Promise<boolean>
  getPeerList: () => Promise<Peer[]>
  
  // Contacts
  getContacts: () => Promise<any[]>
  getOrCreateTopicForContact: (contactId: string) => Promise<string | null>
  
  // Local AI
  queryLocalAI: (prompt: string) => Promise<string>
  loadModel: (modelId: string) => Promise<boolean>
  getAvailableModels: () => Promise<any[]>
  getDefaultModel: () => Promise<string | null>
  setDefaultModel: (modelId: string) => Promise<boolean>
  switchAIModel: (aiPersonId: string, modelId: string) => Promise<boolean>
  getAIPersonForTopic: (topicId: string) => Promise<string | null>
  enableAIForTopic: (topicId: string) => Promise<boolean>
  disableAIForTopic: (topicId: string) => Promise<boolean>
  getBestModelForTask: (task: 'coding' | 'reasoning' | 'chat' | 'analysis') => Promise<any>
  getModelsByCapability: (capability: string) => Promise<any[]>
  
  // UDP Sockets
  createUdpSocket: (options: SocketOptions) => Promise<string>
  sendUdpMessage: (socketId: string, message: Buffer, port: number, address: string) => Promise<void>
  
  // Proposals
  updateProposalConfig: (config: { minJaccard?: number }) => Promise<void>

  // AI Settings
  setResponseLength: (maxTokens: number) => Promise<void>
  getResponseLength: () => Promise<number>
  stopStreaming: (topicId: string) => Promise<{ success: boolean }>

  // Topic Analysis
  getSubjects: (topicId: string) => Promise<{ success: boolean; data?: { subjects: any[] }; error?: string }>
  getKeywords: (topicId: string) => Promise<{ success: boolean; data?: { keywords: string[] }; error?: string }>

  // Memory & Knowledge Graph
  getKnowledgeGraph: () => Promise<{ success: boolean; data?: { nodes: any[]; edges: any[] }; error?: string }>

  // Events
  on: (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback: (...args: any[]) => void) => void

  // TTS (Text-to-Speech)
  ttsGetStatus: () => Promise<{ status: string; modelId: string | null; sampleRate: number | null }>
  ttsLoad: (modelId: string) => Promise<{ modelId: string; sampleRate: number }>
  ttsSynthesize: (text: string, options?: any) => Promise<{ audio: Float32Array; sampleRate: number }>
  ttsPreloadVoice: (audioUrl: string) => Promise<void>
  ttsUnload: () => Promise<void>
  ttsSupportsVoiceCloning: () => Promise<boolean>
}

export interface Message {
  id: string
  senderId: string
  senderName?: string
  content: string
  timestamp: Date
  encrypted: boolean
  isAI?: boolean
  isOwn?: boolean // Whether this message is from the current user (computed server-side)
  attachments?: any[] // Note: thinking/reasoning stored as CLOB attachment named 'thinking.txt'
  topicId?: string
  topicName?: string
}

export interface Peer {
  id: string
  name: string
  address: string
  status: 'connected' | 'disconnected' | 'connecting'
  lastSeen: Date
}

export interface SocketOptions {
  type: 'udp4' | 'udp6'
  port?: number
  address?: string
}

// IPC-only implementation - NO AppModel, NO ONE.core
class LamaBridge implements LamaAPI {
  private eventListeners = new Map<string, Set<Function>>()
  public ipcListenersSetup = false
  
  constructor() {
    // console.log('[LamaBridge] IPC-only mode initialized')
    // console.log('[LamaBridge] window.electronAPI exists:', !!window.electronAPI)

    // Set up IPC event listeners to forward Node.js events to UI
    if (window.electronAPI) {
      // console.log('[LamaBridge] Setting up IPC event listeners...')

      // Helper function to handle IPC events consistently
      // The preload script now properly strips the IPC event and passes only data
      const createIPCHandler = (eventName: string, emitName?: string) => {
        return (data: any) => {
          // console.log(`[LamaBridge] IPC event received: ${eventName}`, data)
          this.emit(emitName || eventName, data)
        }
      }

      // Register all IPC event listeners using centralized event registry

      // AI assistant events
      window.electronAPI.on(Events.AI_RESPONDING, createIPCHandler(Events.AI_RESPONDING))
      window.electronAPI.on(Events.AI_ERROR, (data: any) => {
        console.error('[LamaBridge] AI error:', data)
        this.emit(Events.AI_ERROR, data)
      })

      // Analysis data events
      window.electronAPI.on(Events.SUBJECTS_UPDATED, createIPCHandler(Events.SUBJECTS_UPDATED))
      window.electronAPI.on(Events.KEYWORDS_UPDATED, createIPCHandler(Events.KEYWORDS_UPDATED))

      // LLM model events
      window.electronAPI.on(Events.LLM_STREAM, createIPCHandler(Events.LLM_STREAM))
      window.electronAPI.on(Events.LLM_COMPLETE, createIPCHandler(Events.LLM_COMPLETE))
      window.electronAPI.on(Events.LLM_THINKING, createIPCHandler(Events.LLM_THINKING))
      window.electronAPI.on(Events.LLM_STATUS, createIPCHandler(Events.LLM_STATUS))

      // Contact events
      window.electronAPI.on(Events.CONTACT_ADDED, createIPCHandler(Events.CONTACT_ADDED))

      // Conversation events
      window.electronAPI.on(Events.CHAT_CONVERSATION_CREATED, createIPCHandler('conversation:created'))

      // Message events
      window.electronAPI.on(Events.CHAT_NEW_MESSAGES, (data: any) => {
        this.emit(Events.CHAT_NEW_MESSAGES, data)
      })

      // Channel update events
      window.electronAPI.on(Events.CHANNEL_UPDATED, (data: any) => {
        console.log('[LamaBridge] 📡 channel:updated received:', data?.channelId?.substring(0, 16))
        if (window.electronAPI.invoke) {
          window.electronAPI.invoke('debug:log', `[LamaBridge] 📡 channel:updated ACK for ${data?.channelId?.substring(0, 16)}...`).catch(() => {})
        }
        this.emit(Events.CHANNEL_UPDATED, data)
      })

      // Navigation events
      window.electronAPI.on(Events.NAVIGATE, createIPCHandler(Events.NAVIGATE))

      // TTS events
      window.electronAPI.on(Events.TTS_PROGRESS, createIPCHandler(Events.TTS_PROGRESS))
      window.electronAPI.on(Events.TTS_ERROR, createIPCHandler(Events.TTS_ERROR))

      // console.log('[LamaBridge] IPC event listeners registered successfully')
      this.ipcListenersSetup = true
    } else {
      console.warn('[LamaBridge] No window.electronAPI - IPC not available')
    }
  }
  
  async createIdentity(name: string, password: string): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('onecore:createIdentity', { name, password })
    if (!result.success) {
      throw new Error(result.error || 'Failed to create identity')
    }
    return result.id
  }
  
  async login(id: string, password: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('onecore:login', { id, password })
    return result.success
  }
  
  async logout(): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    await window.electronAPI.invoke('onecore:logout')
  }
  
  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('chat:getCurrentUser')
    if (!result?.success || !result.user) {
      return null
    }
    return {
      id: result.user.id,
      name: result.user.name || 'User'
    }
  }
  
  async sendMessage(recipientId: string, content: string, attachments?: any[]): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }

    // console.log('[LamaBridge] Sending message via IPC:', { recipientId, content })

    const result = await window.electronAPI.invoke('chat:sendMessage', {
      conversationId: recipientId,
      text: content,
      attachments: attachments || []
    })

    if (result.success) {
      // console.log('[LamaBridge] Message sent via IPC:', result.data.id)
      // Emit local event for UI update
      this.emit('message:sent', { 
        id: result.data.id, 
        recipientId, 
        content,
        timestamp: new Date()
      })
      return result.data.id
    } else {
      throw new Error(result.error || 'Failed to send message')
    }
  }
  
  async getMessages(conversationId: string): Promise<Message[]> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }

    const result = await window.electronAPI.invoke('chat:getMessages', { 
      conversationId, 
      limit: 100,
      offset: 0 
    })
    
    if (!result?.success || !result.messages) {
      // console.error('[LamaBridge] Failed to get messages from Node')
      return []
    }

    // console.log(`[LamaBridge] Got ${result.messages.length} messages from Node via IPC`)
    
    // Transform Node messages to our Message format
    return result.messages.map((msg: any) => ({
      id: msg.id || `msg-${Date.now()}-${Math.random()}`,
      senderId: msg.sender || msg.author || 'unknown',
      senderName: msg.senderName,
      content: msg.text || msg.content || '',
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      encrypted: false,
      isAI: msg.isAI || false,
      isOwn: msg.isOwn || false, // Server-computed ownership flag
      topicId: conversationId,
      topicName: 'Chat',
      attachments: msg.attachments
    }))
  }
  
  async createChannel(name: string, members: string[]): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('onecore:createChannel', { name, members })
    if (!result.success) {
      throw new Error(result.error || 'Failed to create channel')
    }
    return result.channelId
  }
  
  async connectToPeer(peerId: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('onecore:connectToPeer', { peerId })
    return result.success
  }
  
  async getPeerList(): Promise<Peer[]> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('onecore:getPeerList')
    if (!result.success) {
      return []
    }
    return result.peers || []
  }
  
  async queryLocalAI(prompt: string): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:query', { prompt })
    if (!result.success) {
      throw new Error(result.error || 'AI query failed')
    }
    return result.response
  }
  
  async loadModel(modelId: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:loadModel', { modelId })
    return result.success
  }
  
  async getAvailableModels(): Promise<any[]> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:getModels')
    if (!result.success) {
      return []
    }
    // Handler returns result.data.models, not result.models
    return result.data?.models || []
  }

  async getDefaultModel(): Promise<string | null> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    try {
      const result = await window.electronAPI.invoke('ai:getDefaultModel')
      return result || null
    } catch (error) {
      console.error('[LamaBridge] Failed to get default model:', error)
      return null
    }
  }
  
  async setDefaultModel(modelId: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:setDefaultModel', { modelId })
    return result.success
  }

  async switchAIModel(aiPersonId: string, modelId: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:switchAIModel', { aiPersonId, modelId })
    return result.success
  }

  async getAIPersonForTopic(topicId: string): Promise<string | null> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:getAIPersonForTopic', { topicId })
    if (result.success) {
      return result.aiPersonId || null
    }
    return null
  }

  async enableAIForTopic(topicId: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:enableForTopic', { topicId })
    return result.success
  }
  
  async disableAIForTopic(topicId: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:disableForTopic', { topicId })
    return result.success
  }
  
  async getBestModelForTask(task: 'coding' | 'reasoning' | 'chat' | 'analysis'): Promise<any> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:getBestModelForTask', { task })
    if (!result.success) {
      return null
    }
    return result.model
  }
  
  async getModelsByCapability(capability: string): Promise<any[]> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:getModelsByCapability', { capability })
    if (!result.success) {
      return []
    }
    return result.models || []
  }
  
  async getContacts(): Promise<any[]> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('onecore:getContacts')
    if (!result.success) {
      throw new Error(result.error || 'Failed to get contacts')
    }
    return result.contacts || []
  }
  
  async getOrCreateTopicForContact(contactId: string): Promise<string | null> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('onecore:getOrCreateTopicForContact', contactId)
    if (result.success && result.topicId) {
      return result.topicId
    }
    return null
  }
  
  async createUdpSocket(options: SocketOptions): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('udp:createSocket', options)
    if (!result.success) {
      throw new Error(result.error || 'Failed to create UDP socket')
    }
    return result.socketId
  }
  
  async sendUdpMessage(socketId: string, message: Buffer, port: number, address: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('udp:sendMessage', {
      socketId,
      message: Array.from(message), // Convert Buffer to array for IPC
      port,
      address
    })
    if (!result.success) {
      throw new Error(result.error || 'Failed to send UDP message')
    }
  }
  
  on(event: string, callback: (...args: any[]) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
    // console.log(`[LamaBridge] ON: Added listener for ${event}, total listeners: ${this.eventListeners.get(event)!.size}`)

    // Return cleanup function
    return () => {
      this.off(event, callback)
    }
  }

  off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
      // console.log(`[LamaBridge] OFF: Removed listener for ${event}, remaining: ${listeners.size}`)
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event)
    // console.log(`[LamaBridge] EMIT event: ${event}, listeners count: ${listeners?.size || 0}`)
    // if (event === 'chat:newMessages') {
    //   console.log('[LamaBridge] chat:newMessages data:', args[0])
    // }
    if (listeners) {
      listeners.forEach(callback => {
        // console.log(`[LamaBridge] Calling listener for ${event}`)
        callback(...args)
      })
    } else {
      // console.log(`[LamaBridge] NO LISTENERS for event: ${event}`)
    }
  }
  
  async clearConversation(conversationId: string = 'default'): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('chat:clearConversation', { conversationId })
    if (!result.success) {
      throw new Error(result.error || 'Failed to clear conversation')
    }
  }
  
  async setConversationModel(conversationId: string, modelId: string): Promise<void> {
    // Store locally for UI purposes
    await ipcStorage.setItem(`conv-model-${conversationId}`, modelId)
  }
  
  async getInstanceInfo(): Promise<any> {
    if (!window.electronAPI) {
      return {
        success: true,
        instance: {
          id: 'browser-instance',
          name: 'Browser UI',
          platform: 'browser',
          role: 'client',
          initialized: true,
          capabilities: {
            network: false,
            storage: false,
            llm: false
          }
        }
      }
    }
    return await window.electronAPI.invoke('instance:info')
  }
  
  async getConnectedDevices(): Promise<any> {
    if (!window.electronAPI) {
      return { success: true, devices: [] }
    }
    return await window.electronAPI.invoke('devices:connected')
  }
  
  async createInvitation(mode?: 'IoM' | 'IoP'): Promise<any> {
    if (!window.electronAPI) {
      return {
        success: false,
        error: 'Invitations require Electron environment'
      }
    }
    return await window.electronAPI.invoke('invitation:create', mode)
  }

  async updateProposalConfig(config: { minJaccard?: number }): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('proposals:updateConfig', { config })
    if (!result.success) {
      throw new Error(result.error || 'Failed to update proposal config')
    }
  }

  async setResponseLength(maxTokens: number): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:setResponseLength', { maxTokens })
    if (!result.success) {
      throw new Error(result.error || 'Failed to set response length')
    }
  }

  async getResponseLength(): Promise<number> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:getResponseLength')
    if (!result.success) {
      return 800 // Default response length
    }
    return result.data || 800
  }

  async stopStreaming(topicId: string): Promise<{ success: boolean }> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('ai:stopStreaming', { topicId })
    return { success: result?.success || false }
  }

  async getSubjects(topicId: string): Promise<{ success: boolean; data?: { subjects: any[] }; error?: string }> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    return await window.electronAPI.invoke('topicAnalysis:getSubjects', { topicId, includeArchived: false })
  }

  async getKeywords(topicId: string): Promise<{ success: boolean; data?: { keywords: string[] }; error?: string }> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    return await window.electronAPI.invoke('topicAnalysis:getKeywords', { topicId })
  }

  async getKnowledgeGraph(): Promise<{ success: boolean; data?: { nodes: any[]; edges: any[] }; error?: string }> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    return await window.electronAPI.invoke('memory:getKnowledgeGraph')
  }

  // TTS methods
  async ttsGetStatus(): Promise<{ status: string; modelId: string | null; sampleRate: number | null }> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('tts:getStatus')
    if (!result) {
      throw new Error('TTS getStatus returned no result')
    }
    if (!result.success) {
      throw new Error(result.error || 'Failed to get TTS status')
    }
    return result.data
  }

  async ttsLoad(modelId: string): Promise<{ modelId: string; sampleRate: number }> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('tts:load', { modelId })
    if (!result) {
      throw new Error('TTS load returned no result')
    }
    if (!result.success) {
      throw new Error(result.error || 'Failed to load TTS model')
    }
    if (!result.data) {
      throw new Error('TTS load returned no model info')
    }
    return result.data
  }

  async ttsSynthesize(text: string, options?: any): Promise<{ audio: Float32Array; sampleRate: number }> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('tts:synthesize', { text, options })
    if (!result) {
      throw new Error('TTS synthesize returned no result - is the TTS model loaded?')
    }
    if (!result.success) {
      throw new Error(result.error || 'Failed to synthesize speech')
    }
    if (!result.data) {
      throw new Error('TTS synthesize returned no audio data')
    }
    return result.data
  }

  async ttsPreloadVoice(audioUrl: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('tts:preloadVoice', { audioUrl })
    if (!result) {
      throw new Error('TTS preloadVoice returned no result')
    }
    if (!result.success) {
      throw new Error(result.error || 'Failed to preload voice')
    }
  }

  async ttsUnload(): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('tts:unload')
    if (!result) {
      throw new Error('TTS unload returned no result')
    }
    if (!result.success) {
      throw new Error(result.error || 'Failed to unload TTS model')
    }
  }

  async ttsSupportsVoiceCloning(): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('tts:supportsVoiceCloning')
    if (!result) {
      return false
    }
    if (!result.success) {
      return false
    }
    return result.data ?? false
  }

  // Attachment methods
  async getAttachment(hash: string): Promise<{ data: ArrayBuffer; type: string; name: string; size: number } | null> {
    if (!window.electronAPI) {
      throw new Error('IPC not available')
    }
    const result = await window.electronAPI.invoke('attachment:get', { hash })
    if (!result || !result.success || !result.data) {
      console.warn('[LamaBridge] Failed to get attachment:', hash, result?.error)
      return null
    }
    // IPC returns base64-encoded data, convert to ArrayBuffer
    const base64 = result.data.data
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return {
      data: bytes.buffer,
      type: result.data.metadata?.type || 'application/octet-stream',
      name: result.data.metadata?.name || 'attachment',
      size: bytes.length
    }
  }
}

// Create singleton instance
const instance = new LamaBridge()

export const lamaBridge = instance

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).lamaBridge = lamaBridge
}

// Type declarations for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      platform: string
      isElectron: boolean
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, callback: (...args: any[]) => void) => void
      off: (channel: string, callback: (...args: any[]) => void) => void
    }
  }
}