import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { lamaBridge, type Message } from '@/bridge/lama-bridge'

export function useLamaMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(Date.now()) // Track updates
  const prevConversationIdRef = useRef<string>(conversationId)
  const loadMessagesRef = useRef<(() => Promise<void>) | null>(null)

  // Debug: log when messages state changes
  useEffect(() => {
    console.log('[useLamaMessages] 📊 Messages state updated:', messages.length, 'messages')
    if (messages.length > 0) {
      console.log('[useLamaMessages] 📊 First message:', messages[0])
    }
  }, [messages])

  // Load messages - useCallback to ensure stable reference
  const loadMessages = useCallback(async () => {
    console.log('[useLamaMessages] Loading messages for:', conversationId)

    try {
      setLoading(true)
      const msgs = await lamaBridge.getMessages(conversationId)
      console.log('[useLamaMessages] Loaded', msgs.length, 'messages')
      console.log('[useLamaMessages] Setting messages state with:', msgs)
      setMessages(msgs)
      setLastUpdate(Date.now()) // Force update
    } catch (err) {
      console.error('[useLamaMessages] Failed to load messages:', err)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  // Keep ref updated
  useEffect(() => {
    loadMessagesRef.current = loadMessages
  }, [loadMessages])

  // Load on mount and conversation change
  useEffect(() => {
    // Only clear messages when conversation ACTUALLY changes (not on every reload)
    // This prevents the annoying flash where messages disappear briefly
    const conversationChanged = prevConversationIdRef.current !== conversationId

    if (conversationChanged) {
      console.log('[useLamaMessages] 🔄 Conversation changed:', prevConversationIdRef.current, '→', conversationId)
      // Don't clear messages immediately - let loadMessages replace them
      // This prevents the empty state flash
      prevConversationIdRef.current = conversationId
    } else {
      console.log('[useLamaMessages] ♻️  Refreshing messages for:', conversationId)
    }

    loadMessages()
  }, [conversationId])

  // Listen for channel updates (messages changed)
  useEffect(() => {
    const handleChannelUpdated = async () => {
      if (loadMessagesRef.current) {
        await loadMessagesRef.current()
      }
    }

    lamaBridge.on('channel:updated', handleChannelUpdated)
    return () => {
      lamaBridge.off('channel:updated', handleChannelUpdated)
    }
  }, [conversationId])

  // Send message
  const sendMessage = async (topicId: string, content: string, attachments?: any[]) => {
    // Get current user for optimistic update
    const currentUser = await lamaBridge.getCurrentUser()

    // Optimistically add message to UI immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUser?.id || 'me',
      senderName: currentUser?.name || 'You',
      content,
      timestamp: new Date(),
      encrypted: false,
      isAI: false,
      topicId,
      attachments
    }

    setMessages(prev => [...prev, optimisticMessage])

    // Send message to backend
    const messageId = await lamaBridge.sendMessage(topicId, content, attachments)

    // Replace optimistic message with real one from backend
    await loadMessages()

    return messageId
  }

  return { messages, loading, sendMessage, loadMessages }
}