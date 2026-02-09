import { useState, useEffect, useCallback, useRef } from 'react'
import { lamaBridge, type Message } from '@/bridge/lama-bridge'

export function useLamaMessages(topicId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const prevConversationIdRef = useRef<string>(topicId)
  const loadMessagesRef = useRef<(() => Promise<void>) | null>(null)

  // Debug: log when messages state changes (only for non-empty updates)
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[useLamaMessages] Messages updated:', messages.length)
    }
  }, [messages])

  // Load messages (most recent page) - useCallback to ensure stable reference
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      const result = await lamaBridge.getMessages(topicId)
      setMessages(result.messages)
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('[useLamaMessages] Failed to load messages:', err)
    } finally {
      setLoading(false)
    }
  }, [topicId])

  // Load older messages (scroll-up / load-more)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return

    // Use the oldest loaded message's timestamp as the cursor
    const oldestTimestamp = messages[0]?.timestamp
    if (!oldestTimestamp) return

    const before = oldestTimestamp instanceof Date
      ? oldestTimestamp.getTime()
      : new Date(oldestTimestamp).getTime()

    try {
      setLoadingMore(true)
      const result = await lamaBridge.getMessages(topicId, { before })
      if (result.messages.length > 0) {
        // Prepend older messages
        setMessages(prev => [...result.messages, ...prev])
      }
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('[useLamaMessages] Failed to load more messages:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [topicId, hasMore, loadingMore, messages])

  // Keep ref updated
  useEffect(() => {
    loadMessagesRef.current = loadMessages
  }, [loadMessages])

  // Load on mount and conversation change
  useEffect(() => {
    const conversationChanged = prevConversationIdRef.current !== topicId

    if (conversationChanged) {
      console.log('[useLamaMessages] Conversation changed:', prevConversationIdRef.current, '->', topicId)
      prevConversationIdRef.current = topicId
    } else {
      console.log('[useLamaMessages] Refreshing messages for:', topicId)
    }

    loadMessages()
  }, [topicId])

  // Listen for channel updates (messages changed) - debounced to avoid spam during bulk import
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const handleChannelUpdated = () => {
      if (debounceTimer) return // Already scheduled
      debounceTimer = setTimeout(async () => {
        debounceTimer = null
        if (loadMessagesRef.current) {
          await loadMessagesRef.current()
        }
      }, 1000) // Debounce 1s - during bulk import, coalesces many events into one fetch
    }

    lamaBridge.on('channel:updated', handleChannelUpdated)
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      lamaBridge.off('channel:updated', handleChannelUpdated)
    }
  }, [topicId])

  // Send message
  const sendMessage = async (topicId: string, content: string, attachments?: any[], replyTo?: string) => {
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
    const messageId = await lamaBridge.sendMessage(topicId, content, attachments, replyTo)

    // Replace optimistic message with real one from backend
    await loadMessages()

    return messageId
  }

  return { messages, loading, loadingMore, hasMore, sendMessage, loadMessages, loadMore }
}
