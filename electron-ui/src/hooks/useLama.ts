import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { lamaBridge, type Message, type Peer } from '@/bridge/lama-bridge'

// Main hook to access the bridge
export function useLama() {
  return {
    bridge: lamaBridge
  }
}

export function useLamaMessages(conversationId: string) {
  console.log('[useLamaMessages] 🎯 Hook called with conversationId:', conversationId)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])

  // Load messages from backend
  const loadMessages = useCallback(async () => {
    console.log('🔄 Loading messages for:', conversationId)

    try {
      setLoading(true)
      const msgs = await lamaBridge.getMessages(conversationId)
      console.log('✅ Loaded', msgs.length, 'messages')
      setMessages(msgs)
      setOptimisticMessages([])
    } catch (err) {
      console.error('❌ Failed to load messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  // Initial load
  useEffect(() => {
    loadMessages()
  }, [conversationId]) // Only reload when conversation changes

  // Listen for channel updates (messages changed)
  // Refresh on ANY channel:updated - message retrieval aggregates all relevant channels
  useEffect(() => {
    const handleChannelUpdated = () => {
      // Forward log to main process for debugging
      if ((window as any).electronAPI?.invoke) {
        (window as any).electronAPI.invoke('debug:log', `[useLamaMessages] 🔄 callback fired for: ${conversationId?.substring(0, 20)}`).catch(() => {})
      }
      console.log('[useLamaMessages] 🔄 channel:updated, reloading messages for:', conversationId?.substring(0, 20))
      lamaBridge.getMessages(conversationId).then((msgs: any) => {
        if ((window as any).electronAPI?.invoke) {
          (window as any).electronAPI.invoke('debug:log', `[useLamaMessages] ✅ setMessages called with ${msgs?.length} messages`).catch(() => {})
        }
        setMessages(msgs)
      }).catch((err: any) => {
        console.error('[useLamaMessages] Failed to refresh:', err)
      })
    }

    lamaBridge.on('channel:updated', handleChannelUpdated)
    return () => {
      lamaBridge.off('channel:updated', handleChannelUpdated)
    }
  }, [conversationId])

  const sendMessage = useCallback(async (topicId: string, content: string, attachments?: any[]) => {
    try {
      console.log('[useLama] 📤 Sending message to:', topicId)

      // Add optimistic message for instant UI feedback
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        senderId: 'user',
        content,
        timestamp: new Date(),
        encrypted: false,
        isAI: false,
        attachments,
        topicId
      }
      setOptimisticMessages([optimisticMessage])

      // Send the actual message
      const messageId = await lamaBridge.sendMessage(topicId, content, attachments)
      console.log('[useLama] ✅ Message sent:', messageId)

      // Refresh messages
      const msgs = await lamaBridge.getMessages(topicId)
      setMessages(msgs)
      setOptimisticMessages([])

      return messageId
    } catch (err) {
      console.error('[useLama] ❌ Send failed:', err)
      setOptimisticMessages([])
      throw err
    }
  }, [])

  // Combine real and optimistic messages
  const allMessages = useMemo(() => {
    return [...messages, ...optimisticMessages]
  }, [messages, optimisticMessages])

  return { messages: allMessages, loading, error, sendMessage }
}

export function useLamaPeers() {
  const [peers, setPeers] = useState<Peer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPeers = async () => {
      try {
        setLoading(true)
        const peerList = await lamaBridge.getPeerList()
        setPeers(peerList)
      } catch (err) {
        console.error('Failed to load peers:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPeers()

    // Listen for peer updates
    const handlePeerUpdate = () => {
      loadPeers()
    }

    lamaBridge.on('peer:connected', handlePeerUpdate)
    lamaBridge.on('peer:disconnected', handlePeerUpdate)

    return () => {
      lamaBridge.off('peer:connected', handlePeerUpdate)
      lamaBridge.off('peer:disconnected', handlePeerUpdate)
    }
  }, [])

  const connectToPeer = useCallback(async (peerId: string) => {
    return await lamaBridge.connectToPeer(peerId)
  }, [])

  return { peers, loading, connectToPeer }
}

export function useLamaAI() {
  const [processing, setProcessing] = useState(false)
  const [response, setResponse] = useState<string | null>(null)

  useEffect(() => {
    const handleProcessing = () => setProcessing(true)
    const handleComplete = () => setProcessing(false)

    lamaBridge.on('ai:processing', handleProcessing)
    lamaBridge.on('ai:complete', handleComplete)

    return () => {
      lamaBridge.off('ai:processing', handleProcessing)
      lamaBridge.off('ai:complete', handleComplete)
    }
  }, [])

  const query = useCallback(async (prompt: string) => {
    try {
      setProcessing(true)
      const result = await lamaBridge.queryLocalAI(prompt)
      setResponse(result)
      return result
    } finally {
      setProcessing(false)
    }
  }, [])

  return { query, processing, response }
}

export function useLamaAuth() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await lamaBridge.getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        console.error('Failed to get current user:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (id: string, password: string) => {
    const success = await lamaBridge.login(id, password)
    if (success) {
      const currentUser = await lamaBridge.getCurrentUser()
      setUser(currentUser)
    }
    return success
  }, [])

  const logout = useCallback(async () => {
    await lamaBridge.logout()
    setUser(null)
  }, [])

  const createIdentity = useCallback(async (name: string, password: string) => {
    return await lamaBridge.createIdentity(name, password)
  }, [])

  return { user, loading, login, logout, createIdentity }
}