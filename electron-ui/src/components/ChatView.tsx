import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageView } from './MessageView'
import { useLamaMessages } from '@/hooks/useLamaMessages'
import { useLamaAuth, useLamaPeers } from '@/hooks/useLama'
import { lamaBridge } from '@/bridge/lama-bridge'
import { topicAnalysisService } from '@/services/topic-analysis-service'
import { useChatSubjects } from '@/hooks/useChatSubjects'
import { useChatKeywords } from '@/hooks/useChatKeywords'
import { ChatHeader, KeywordLine, SubjectDetailPanel } from '@lama/ui'
import { KeywordDetailPanel } from './KeywordDetail/KeywordDetailPanel'
import { usePlans } from '@ui/core'

export const ChatView = memo(function ChatView({
  conversationId = 'lama',
  onProcessingChange,
  onMessageUpdate,
  isInitiallyProcessing = false,
  hasAIParticipant: hasAIParticipantProp,
  onAddUsers
}: {
  conversationId?: string
  onProcessingChange?: (isProcessing: boolean) => void
  onMessageUpdate?: (lastMessage: string) => void
  isInitiallyProcessing?: boolean
  hasAIParticipant?: boolean
  onAddUsers?: () => void
}) {
  const { ai } = usePlans()
  const { messages, loading, sendMessage, loadMessages } = useLamaMessages(conversationId)
  const { user } = useLamaAuth()
  const { subjects, subjectsJustAppeared } = useChatSubjects(conversationId)
  const { keywords } = useChatKeywords(conversationId, messages)
  const chatHeaderRef = useRef<HTMLDivElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Debug: log messages received from hook
  // console.log('[ChatView] Received from hook - messages:', messages?.length || 0, 'loading:', loading)
  // if (messages && messages.length > 0) {
  //   console.log('[ChatView] First message in ChatView:', messages[0])
  // }

  // Separate effect for updating parent
  useEffect(() => {
    if (messages.length > 0 && onMessageUpdate) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.content) {
        onMessageUpdate(lastMessage.content)
      }
    }
  }, [messages, onMessageUpdate]) // Proper dependencies

  const { peers } = useLamaPeers()
  const [conversationName, setConversationName] = useState<string>('Messages')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAIProcessing, setIsAIProcessing] = useState(isInitiallyProcessing)
  const [isAIStreaming, setIsAIStreaming] = useState(false)  // Track streaming separately from thinking
  const [aiStreamingContent, setAiStreamingContent] = useState('')
  const [aiThinkingContent, setAiThinkingContent] = useState('')  // For reasoning models
  const [lastAnalysisMessageCount, setLastAnalysisMessageCount] = useState(0)
  const [showSubjects, setShowSubjects] = useState(false)
  const [showSubjectDetail, setShowSubjectDetail] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null)
  const thinkingStartTimeRef = useRef<number | null>(null)
  const streamingStartTimeRef = useRef<number | null>(null)
  const lastLogTimeRef = useRef<number>(0)
  const [thinkingStatus, setThinkingStatus] = useState<string>('')
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([])

  // Check if this is an AI conversation
  // Use the authoritative value from backend conversation metadata
  const hasAIParticipant = hasAIParticipantProp || false

  // Load available models for LLM error recovery
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await lamaBridge.getAvailableModels()
        setAvailableModels(models)
      } catch (error) {
        console.error('[ChatView] Failed to load available models:', error)
      }
    }
    loadModels()
  }, [])

  // Handle model switching - find AI participant and update their model
  const handleSwitchModel = useCallback(async (newModelId: string) => {
    try {
      // Find an AI message to get the AI Person ID
      const aiMessage = messages.find((m: any) => m.isAI === true)
      if (!aiMessage?.senderId) {
        console.error('[ChatView] No AI participant found in messages')
        return
      }
      await lamaBridge.switchAIModel(aiMessage.senderId, newModelId)
      console.log(`[ChatView] Switched AI ${aiMessage.senderId.substring(0, 8)}... to model ${newModelId}`)
    } catch (error) {
      console.error('[ChatView] Failed to switch model:', error)
    }
  }, [messages])


  // Analysis is handled automatically by chatWithAnalysis() in ai-assistant-model.ts
  // Keywords and subjects are extracted from each AI response in the background
  // Listen for analysis completion events
  useEffect(() => {
    if (!window.electronAPI) return

    const handleSubjectsUpdated = (data: any) => {
      if (data?.conversationId === conversationId || data?.topicId === conversationId) {
        console.log(`[Progress] Analysis complete: subjects updated for conversation ${conversationId}`, {
          subjectCount: subjects.length
        })
        setIsAnalyzing(false)
      }
    }

    const unsubSubjects = lamaBridge.on('subjects:updated', handleSubjectsUpdated)

    return () => {
      if (unsubSubjects) unsubSubjects()
    }
  }, [conversationId, subjects.length])

  // Set analyzing flag when AI response completes (analysis happens in background)
  useEffect(() => {
    if (!isAIStreaming && messages.length > 0 && hasAIParticipant) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.isAI) {
        console.log(`[Progress] Starting background analysis for conversation ${conversationId}`)
        setIsAnalyzing(true)
        // Analysis will complete and trigger subjects:updated event
      }
    }
  }, [isAIStreaming, messages.length, conversationId, hasAIParticipant])

  // Initialize AI processing state when conversation changes
  // ONLY when the conversationId actually changes (not when hasAIParticipant updates)
  useEffect(() => {
    console.log(`[ChatView] Conversation changed to: ${conversationId}, resetting AI state`)
    // Reset state when switching conversations
    setIsAIProcessing(isInitiallyProcessing)
    setIsAIStreaming(false)
    setAiStreamingContent('')
  }, [conversationId])  // Only depend on conversationId, not hasAIParticipant!

  // Listen for AI streaming events
  useEffect(() => {
    if (!window.electronAPI) return
    
    // Handle llm:progress - shows thinking indicator (topicId, progress)
    const handleProgress = (data: any) => {
      console.log(`[ChatView] 📨 llm:progress received:`, {
        topicId: data.topicId,
        currentConversationId: conversationId,
        matches: data.topicId === conversationId
      })

      if (data.topicId === conversationId) {
        const startTime = Date.now()
        thinkingStartTimeRef.current = startTime
        streamingStartTimeRef.current = null
        lastLogTimeRef.current = 0
        setThinkingStatus('processing')
        console.log(`[Progress] T+0ms AI thinking started | conversation: ${conversationId}`)
        setIsAIProcessing(true)
        setIsAIStreaming(false)  // Don't show stop button until streaming actually starts
        setAiStreamingContent('')
        onProcessingChange?.(true) // Update parent state
        console.log(`[ChatView] ✅ isAIProcessing set to TRUE`)
      }
    }

    // Handle llm:thinking-status - intermediate status updates (topicId, status)
    const handleThinkingStatus = (data: any) => {
      if (data.topicId === conversationId && thinkingStartTimeRef.current) {
        const elapsed = Date.now() - thinkingStartTimeRef.current
        setThinkingStatus(data.status || '')
        console.log(`[Progress] T+${elapsed}ms ${data.status}`)
      }
    }

    // Handle llm:thinking-update - thinking stream for reasoning models (topicId, messageId, thinkingContent)
    const handleThinkingUpdate = (data: any) => {
      console.log(`[ThinkingStream] 🧠 llm:thinking-update received:`, {
        topicId: data.topicId,
        currentConversationId: conversationId,
        matches: data.topicId === conversationId,
        thinkingLength: data.thinkingContent?.length || 0,
        messageId: data.messageId
      })
      if (data.topicId === conversationId) {
        console.log(`[ThinkingStream] 🧠 Setting aiThinkingContent (${data.thinkingContent?.length || 0} chars)`)
        setAiThinkingContent(data.thinkingContent || '')
      }
    }

    // Handle llm:message-update - streaming content and completion (topicId, messageId, content, status, modelId, modelName)
    const handleMessageUpdate = (data: any) => {
      if (data.topicId === conversationId) {
        // Extract content (handles both string and { response: string } formats)
        const content = typeof data.content === 'string'
          ? data.content
          : data.content?.response || ''

        if (data.status === 'complete') {
          // Message complete
          const totalElapsed = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : 0
          console.log(`[Progress] T+${totalElapsed}ms COMPLETE | Total response time: ${totalElapsed}ms`)
          setIsAIProcessing(false)
          setIsAIStreaming(false)  // Clear streaming state - hide stop button
          setAiThinkingContent('')  // Clear thinking when complete
          thinkingStartTimeRef.current = null
          streamingStartTimeRef.current = null
          lastLogTimeRef.current = 0
          setThinkingStatus('')
          onProcessingChange?.(false) // Update parent state

          // Reload messages from storage to display the final persisted message
          console.log(`[Progress] Reloading messages from storage...`)
          const currentMessageCount = messages.length
          loadMessages().then(() => {
            if (messages.length > currentMessageCount) {
              console.log(`[Progress] New message found in storage, clearing streaming content`)
              setAiStreamingContent('')
            } else {
              console.log(`[Progress] No new messages yet, keeping streaming content visible`)
              setTimeout(() => {
                loadMessages().then(() => {
                  console.log(`[Progress] Second attempt - clearing streaming content`)
                  setAiStreamingContent('')
                })
              }, 100)
            }
          })
        } else {
          // Streaming update
          const now = Date.now()

          // Log FIRST CHUNK only once
          if (!streamingStartTimeRef.current) {
            streamingStartTimeRef.current = now
            const thinkingElapsed = thinkingStartTimeRef.current ? now - thinkingStartTimeRef.current : 0
            console.log(`[Progress] T+${thinkingElapsed}ms FIRST CHUNK | Thinking took ${thinkingElapsed}ms`)
          }

          setIsAIProcessing(false)  // Stop showing "thinking" indicator
          setIsAIStreaming(true)     // Keep streaming state (and stop button) visible
          setAiStreamingContent(content)
        }
      }
    }

    // Subscribe to LLM events directly via lamaBridge
    const unsubProgress = lamaBridge.on('llm:progress', handleProgress)
    const unsubThinkingStatus = lamaBridge.on('llm:thinking-status', handleThinkingStatus)
    const unsubThinkingUpdate = lamaBridge.on('llm:thinking-update', handleThinkingUpdate)
    const unsubMessageUpdate = lamaBridge.on('llm:message-update', handleMessageUpdate)

    return () => {
      if (unsubProgress) unsubProgress()
      if (unsubThinkingStatus) unsubThinkingStatus()
      if (unsubThinkingUpdate) unsubThinkingUpdate()
      if (unsubMessageUpdate) unsubMessageUpdate()
    }
  }, [conversationId])
  
  useEffect(() => {
    // Get the conversation/contact name
    const loadConversationDetails = async () => {
      try {
        // Check if this is the Hi introductory chat
        if (conversationId === 'hi') {
          setConversationName('Hi')
          return
        }

        // Check if this is an AI conversation
        if (conversationId === 'lama' || conversationId === 'ai-chat') {
          // For the lama conversation, check if it's with the AI
          // based on message content
          if (messages.length > 0) {
            const aiMessage = messages.find(m => 
              m.sender?.toLowerCase().includes('ai') || 
              m.sender?.toLowerCase().includes('local') ||
              m.sender?.toLowerCase().includes('ollama') ||
              m.content?.includes('Ollama') ||
              m.content?.includes('AI assistant')
            )
            if (aiMessage) {
              // It's an AI conversation - try to get the model name
              // Try to get AI model name from IPC (future enhancement)
              // For now, use fallback logic
              
              // Fallback based on message content
              if (messages[0]?.content?.toLowerCase().includes('ollama')) {
                setConversationName('Ollama')
              } else {
                setConversationName('AI Assistant')
              }
              return
            }
          }
          
          // No messages yet, but it's the lama conversation
          setConversationName('LAMA')
          return
        }
        
        // Try to find the peer/contact for this conversation
        const peer = peers.find(p => p.id === conversationId)
        if (peer) {
          setConversationName(peer.name)
          return
        }
        
        // Try to get contact info via IPC (future enhancement)
        // For now, use peer name or fallback
        
        // Default fallback
        setConversationName('Messages')
      } catch (error) {
        console.error('[ChatView] Failed to load conversation details:', error)
        setConversationName('Messages')
      }
    }

    loadConversationDetails()
  }, [conversationId, messages, peers])

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    setIsProcessing(true)
    onProcessingChange?.(true)

    // Don't set isAIProcessing here - let message:thinking event handle it
    // This avoids race condition where finally block clears it before thinking event fires

    try {
      await sendMessage(conversationId, content, attachments)

      // Update last message preview with the sent message
      if (onMessageUpdate) {
        onMessageUpdate(content)
      }
    } finally {
      setIsProcessing(false)
      onProcessingChange?.(false)
      // AI processing indicator will be cleared by streaming events
    }
  }

  const handleStopStreaming = async () => {
    console.log('[ChatView] Stopping streaming for:', conversationId)
    try {
      const result = await ai.stopStreaming({ topicId: conversationId })
      console.log('[ChatView] Stop streaming result:', result)
      if (result.success) {
        setIsAIProcessing(false)
        setIsAIStreaming(false)  // Clear streaming state
        setAiStreamingContent('')
        onProcessingChange?.(false)
      }
    } catch (error) {
      console.error('[ChatView] Failed to stop streaming:', error)
    }
  }

  // Test function to trigger message update
  const testMessageUpdate = useCallback(async () => {
    console.log('[ChatView] TEST: Triggering message update for:', conversationId)
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.invoke('test:triggerMessageUpdate', { conversationId })
        console.log('[ChatView] TEST: Trigger result:', result)
      } catch (error) {
        console.error('[ChatView] TEST: Failed to trigger:', error)
      }
    } else {
      console.error('[ChatView] TEST: No electronAPI available')
    }
  }, [conversationId])

  // Add test function to window for debugging
  useEffect(() => {
    (window as any).testMessageUpdate = testMessageUpdate
    console.log('[ChatView] Test function available: window.testMessageUpdate()')
    return () => {
      delete (window as any).testMessageUpdate
    }
  }, [testMessageUpdate])
  
  const handleClearConversation = async () => {
    if (confirm('Clear all messages in this conversation? This cannot be undone.')) {
      await lamaBridge.clearConversation(conversationId)
      // Reload the page to reset everything
      window.location.reload()
    }
  }

  // Memoized callbacks for ChatHeader to prevent re-renders
  const handleToggleSubjects = useCallback(() => {
    setShowSubjects(prev => !prev)
  }, [])

  const handleSubjectClick = useCallback((subject: any) => {
    setSelectedSubject(subject)
    setShowSubjectDetail(true)
  }, [])

  return (
    <Card className="h-full w-full flex flex-col">
      <div ref={chatHeaderRef}>
        <ChatHeader
          conversationName={conversationName}
          subtitle={messages.length > 0 ? messages[messages.length - 1]?.content?.substring(0, 60) + (messages[messages.length - 1]?.content?.length > 60 ? '...' : '') : `${messages.length} messages`}
          conversationId={conversationId}
          subjects={subjects}
          messageCount={messages.length}
          hasAI={hasAIParticipant}
          showSubjects={showSubjects}
          onToggleSubjects={handleToggleSubjects}
          onAddUsers={onAddUsers}
          onSubjectClick={handleSubjectClick}
        />
      </div>

      <CardContent className="flex-1 p-0 min-h-0 flex flex-col">
        {/* Keywords Line - Shows current chat keywords */}
        {keywords.length > 0 && hasAIParticipant && (
          <KeywordLine keywords={keywords} maxLines={1} />
        )}

        {/* Subject Detail Panel */}
        {showSubjectDetail && selectedSubject && (
          <SubjectDetailPanel
            selectedSubject={selectedSubject}
            allSubjects={subjects}
            onClose={() => setShowSubjectDetail(false)}
            topicId={conversationId}
          />
        )}

        {/* Messages */}
        <MessageView
          messages={messages}
          currentUserId={user?.id}
          onSendMessage={handleSendMessage}
          onSwitchModel={handleSwitchModel}
          onStopStreaming={handleStopStreaming}
          placeholder="Type a message..."
          showSender={true}
          loading={loading}
          isAIProcessing={isAIProcessing || isAIStreaming}  // Show spinner during thinking or streaming
          aiStreamingContent={aiStreamingContent}
          aiThinkingContent={aiThinkingContent}
          topicId={conversationId}
          subjectsJustAppeared={subjectsJustAppeared}
          chatHeaderRef={chatHeaderRef}
          availableModels={availableModels}
        />
      </CardContent>
    </Card>
  )
})