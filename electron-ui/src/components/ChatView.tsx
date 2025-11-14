import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageView } from './MessageView'
import { useLamaMessages } from '@/hooks/useLamaMessages'
import { useLamaAuth, useLamaPeers } from '@/hooks/useLama'
import { lamaBridge } from '@/bridge/lama-bridge'
import { topicAnalysisService } from '@/services/topic-analysis-service'
import { useChatSubjects } from '@/hooks/useChatSubjects'
import { useChatKeywords } from '@/hooks/useChatKeywords'
import { ChatHeader } from './chat/ChatHeader'
import { ChatContext } from './chat/ChatContext'
import { KeywordDetailPanel } from './KeywordDetail/KeywordDetailPanel'
import { KeywordLine } from './chat/KeywordLine'

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
  const [showSummary, setShowSummary] = useState(false)
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

  // Handle model switching
  const handleSwitchModel = useCallback(async (newModelId: string) => {
    try {
      await lamaBridge.switchTopicModel(conversationId, newModelId)
      console.log(`[ChatView] Switched to model ${newModelId} for topic ${conversationId}`)
    } catch (error) {
      console.error('[ChatView] Failed to switch model:', error)
    }
  }, [conversationId])


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
    
    // Handle thinking indicator (used for all AI messages including welcome)
    const handleThinking = (data: any) => {
      console.log(`[ChatView] 📨 handleThinking received:`, {
        eventConversationId: data.conversationId,
        currentConversationId: conversationId,
        matches: data.conversationId === conversationId
      })

      if (data.conversationId === conversationId) {
        const startTime = Date.now()
        thinkingStartTimeRef.current = startTime
        streamingStartTimeRef.current = null
        lastLogTimeRef.current = 0
        setThinkingStatus(data.status || '')
        console.log(`[Progress] T+0ms AI thinking started | conversation: ${conversationId}`)
        setIsAIProcessing(true)
        setIsAIStreaming(false)  // Don't show stop button until streaming actually starts
        setAiStreamingContent('')
        onProcessingChange?.(true) // Update parent state
        console.log(`[ChatView] ✅ isAIProcessing set to TRUE`)
      }
    }

    // Handle thinking status updates (new event for intermediate states)
    const handleThinkingStatus = (data: any) => {
      if (data.conversationId === conversationId && thinkingStartTimeRef.current) {
        const elapsed = Date.now() - thinkingStartTimeRef.current
        setThinkingStatus(data.status || '')
        console.log(`[Progress] T+${elapsed}ms ${data.status}`)
      }
    }

    // Handle thinking stream (for reasoning models)
    const handleThinkingStream = (data: any) => {
      console.log(`[ThinkingStream] 🧠 RAW EVENT RECEIVED:`, {
        eventConversationId: data.conversationId,
        currentConversationId: conversationId,
        matches: data.conversationId === conversationId,
        thinkingLength: data.thinking?.length || 0,
        messageId: data.messageId
      })
      if (data.conversationId === conversationId) {
        console.log(`[ThinkingStream] 🧠 Setting aiThinkingContent (${data.thinking?.length || 0} chars)`)
        setAiThinkingContent(data.thinking || '')
      }
    }

    // Handle streaming chunks
    const handleStream = (data: any) => {
      if (data.conversationId === conversationId) {
        const now = Date.now()
        const contentLength = (data.partial || '').length

        // Log FIRST CHUNK only once
        if (!streamingStartTimeRef.current) {
          streamingStartTimeRef.current = now
          const thinkingElapsed = thinkingStartTimeRef.current ? now - thinkingStartTimeRef.current : 0
          console.log(`[Progress] T+${thinkingElapsed}ms FIRST CHUNK | Thinking took ${thinkingElapsed}ms`)
        }

        setIsAIProcessing(false)  // Stop showing "thinking" indicator
        setIsAIStreaming(true)     // Keep streaming state (and stop button) visible
        setAiStreamingContent(data.partial || '')
      }
    }

    // Handle message complete
    const handleComplete = (data: any) => {
      if (data.conversationId === conversationId) {
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
        // Keep aiStreamingContent displayed until reload completes to avoid flicker
        console.log(`[Progress] Reloading messages from storage...`)
        const currentMessageCount = messages.length
        loadMessages().then(() => {
          // Only clear streaming content if we actually got new messages
          // This prevents the message from disappearing if storage hasn't been updated yet
          if (messages.length > currentMessageCount) {
            console.log(`[Progress] New message found in storage, clearing streaming content`)
            setAiStreamingContent('')
          } else {
            console.log(`[Progress] No new messages yet, keeping streaming content visible`)
            // Try again after a short delay to catch late-persisted messages
            setTimeout(() => {
              loadMessages().then(() => {
                console.log(`[Progress] Second attempt - clearing streaming content`)
                setAiStreamingContent('')
              })
            }, 100)
          }
        })
      }
    }

    // Subscribe to streaming events via lamaBridge
    const unsubThinking = lamaBridge.on('message:thinking', handleThinking)
    const unsubThinkingStatus = lamaBridge.on('message:thinkingStatus', handleThinkingStatus)
    const unsubThinkingStream = lamaBridge.on('message:thinkingStream', handleThinkingStream)
    const unsubStream = lamaBridge.on('message:stream', handleStream)
    const unsubComplete = lamaBridge.on('message:updated', handleComplete)

    return () => {
      if (unsubThinking) unsubThinking()
      if (unsubThinkingStatus) unsubThinkingStatus()
      if (unsubThinkingStream) unsubThinkingStream()
      if (unsubStream) unsubStream()
      if (unsubComplete) unsubComplete()
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
      const result = await window.electronAPI.invoke('ai:stopStreaming', { topicId: conversationId })
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

  return (
    <Card className="h-full w-full flex flex-col">
      <div ref={chatHeaderRef}>
        <ChatHeader
          conversationName={conversationName}
          conversationId={conversationId}
          subjects={subjects}
          messageCount={messages.length}
          hasAI={hasAIParticipant}
          showSummary={showSummary}
          onToggleSummary={() => setShowSummary(!showSummary)}
          onAddUsers={onAddUsers}
          isAnalyzing={isAnalyzing}
          onSubjectClick={(subject) => {
            console.log('[ChatView] Subject clicked:', subject)
            setSelectedSubject(subject)
            setShowSubjectDetail(true)
          }}
        />
      </div>

      <CardContent className="flex-1 p-0 min-h-0 flex flex-col">
        {/* Keywords Line - Shows current chat keywords */}
        {keywords.length > 0 && hasAIParticipant && (
          <KeywordLine keywords={keywords} maxLines={1} />
        )}

        {/* AI Summary Panel - Shows at top when visible */}
        {showSummary && hasAIParticipant && (
          <div className="border-b bg-muted/30">
            <ChatContext
              topicId={conversationId}
              messages={messages}
              messageCount={messages.length}
              className="border-0"
            />
          </div>
        )}

        {/* Subject Detail Panel - Shows ALL subjects with the same name */}
        {showSubjectDetail && selectedSubject && (() => {
          // Find all subjects with the same name as the selected one
          const selectedName = selectedSubject.id || selectedSubject.name || 'Subject';
          const matchingSubjects = subjects.filter(s =>
            (s.id || s.name) === selectedName
          );

          return (
            <div className="border-b bg-muted/30 max-h-[40vh] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedName}</h3>
                    {matchingSubjects.length > 1 && (
                      <span className="text-xs text-muted-foreground">
                        {matchingSubjects.length} versions
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSubjectDetail(false)}
                  >
                    ×
                  </Button>
                </div>

                {/* List all matching subjects */}
                <div className="space-y-3">
                  {matchingSubjects.map((subject, idx) => (
                    <div key={idx} className="p-3 bg-background/50 rounded border">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-sm">Keywords:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {subject.keywords?.map((kw: string, kwIdx: number) => {
                              // if (kw.length === 64 && /^[0-9a-f]+$/.test(kw)) {
                              //   console.warn('[ChatView] Keyword is still a hash:', kw);
                              // }
                              return (
                                <Badge key={kwIdx} variant="secondary" className="text-xs">
                                  {kw}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span><span className="font-medium">Messages:</span> {subject.messageCount}</span>
                          <span><span className="font-medium">Last:</span> {new Date(subject.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

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