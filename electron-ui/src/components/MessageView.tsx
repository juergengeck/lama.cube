import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowDown } from 'lucide-react'
import { type Message, lamaBridge } from '@/bridge/lama-bridge'
import './MessageView.css'

// Import enhanced components
import { EnhancedMessageInput, type EnhancedAttachment } from './chat/EnhancedMessageInput'
import { EnhancedMessageBubble, type EnhancedMessageData } from './chat/EnhancedMessageBubble'

// Import attachment system
import { attachmentService } from '@/services/attachments/AttachmentService'
import { createAttachmentView } from '@lama/ui'
import type { MessageAttachment, BlobDescriptor } from '@/types/attachments'

// Import keyword detail panel
import { KeywordDetailPanel } from './KeywordDetail/KeywordDetailPanel'

// Import proposal carousel
import { ProposalCarousel } from './ProposalCarousel'
import { useProposals } from '@/hooks/useProposals'

interface MessageViewProps {
  messages: Message[]
  currentUserId?: string
  onSendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<void>
  onStopStreaming?: () => void // Stop AI streaming
  placeholder?: string
  showSender?: boolean
  loading?: boolean
  participants?: string[] // List of participant IDs to determine if multiple people
  isAIProcessing?: boolean // Show typing indicator when AI is processing
  aiStreamingContent?: string // Show partial AI response while streaming
  aiThinkingContent?: string // Show thinking/reasoning trace (for reasoning models)
  topicId?: string // Topic ID for context panel
  subjectsJustAppeared?: boolean // Flag indicating subjects just appeared
  chatHeaderRef?: React.RefObject<HTMLDivElement> // Ref to ChatHeader to measure height change
}

export function MessageView({
  messages,
  currentUserId = 'user-1',
  onSendMessage,
  onStopStreaming,
  placeholder = 'Type a message...',
  showSender = true,
  loading = false,
  participants = [],
  isAIProcessing = false,
  aiStreamingContent = '',
  aiThinkingContent = '',
  topicId,
  subjectsJustAppeared = false,
  chatHeaderRef
}: MessageViewProps) {
  // console.log('[MessageView] 🎨 Rendering with', messages.length, 'messages')
  // if (messages.length > 0) {
  //   console.log('[MessageView] First message:', messages[0])
  //   console.log('[MessageView] Last message:', messages[messages.length - 1])
  // }
  const [contactNames, setContactNames] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)

  // Store attachment descriptors for display
  const [attachmentDescriptors, setAttachmentDescriptors] = useState<Map<string, BlobDescriptor>>(new Map())

  // Keyword detail dialog state
  const [showKeywordDetail, setShowKeywordDetail] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)

  // Proposal carousel
  const {
    proposals,
    currentIndex,
    loading: proposalsLoading,
    error: proposalsError,
    nextProposal,
    previousProposal,
    dismissProposal,
    shareProposal,
    refreshForInput
  } = useProposals({
    topicId: topicId || '',
    autoRefresh: true
  })

  // Debounced input tracking for real-time proposals
  const inputDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Input pre-fill state for shared proposals
  const [inputPrefillText, setInputPrefillText] = useState<string>('')

  // Clear prefill text after it's been applied
  useEffect(() => {
    if (inputPrefillText) {
      // Clear after a short delay to ensure the input component has received it
      const timer = setTimeout(() => {
        setInputPrefillText('')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [inputPrefillText])

  // Handle input text change with debouncing
  const handleInputTextChange = useCallback((text: string) => {
    // Clear existing timer
    if (inputDebounceTimerRef.current) {
      clearTimeout(inputDebounceTimerRef.current)
    }

    // Set new timer to fetch proposals after 500ms of no typing
    const timer = setTimeout(() => {
      console.log('[MessageView] Debounced input:', text)
      if (text && text.trim().length >= 3) {
        refreshForInput(text)
      }
    }, 500)

    inputDebounceTimerRef.current = timer
  }, [refreshForInput])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (inputDebounceTimerRef.current) {
        clearTimeout(inputDebounceTimerRef.current)
      }
    }
  }, [])

  // Load contact names
  useEffect(() => {
    const loadContactNames = async () => {
      try {
        const contacts = await lamaBridge.getContacts()
        const names: Record<string, string> = {}
        
        // Map contact IDs to names
        for (const contact of contacts) {
          if (contact.id) {
            names[contact.id] = contact.displayName || contact.name || 'Unknown'
          }
        }
        
        // Don't add "You" label - users aren't idiots
        
        setContactNames(names)
      } catch (error) {
        console.error('Failed to load contact names:', error)
      }
    }
    
    loadContactNames()
  }, [currentUserId])
  
  // Track user scroll position
  const handleScroll = () => {
    if (!scrollAreaRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Consider user at bottom if within 50px
    setIsUserScrolledUp(distanceFromBottom > 50)
  }

  // Adjust scroll position when subjects appear to compensate for header height change
  useEffect(() => {
    if (subjectsJustAppeared && chatHeaderRef?.current && scrollAreaRef.current) {
      // Only adjust scroll if user is at the bottom (not scrolled up)
      // This respects user scroll position while fixing layout shift for those at bottom
      if (isUserScrolledUp) {
        // User has scrolled up - don't adjust, keep their position
        return
      }

      // User is at bottom - adjust scroll to stay at bottom after header grows
      requestAnimationFrame(() => {
        if (!messagesEndRef.current) return
        messagesEndRef.current.scrollIntoView({
          behavior: 'instant',
          block: 'end'
        })
      })
    }
  }, [subjectsJustAppeared, chatHeaderRef, isUserScrolledUp])

  // Track previous streaming state to detect when streaming just ended
  const prevStreamingRef = useRef(false)
  const hasScrolledInitiallyRef = useRef(false)

  // Reset scroll tracking when topic changes
  useEffect(() => {
    hasScrolledInitiallyRef.current = false
    setIsUserScrolledUp(false)
  }, [topicId])

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    // Only consider it streaming when we have actual content to display
    // (not just "thinking" state with no content yet)
    const isStreaming = !!aiStreamingContent
    const wasStreaming = prevStreamingRef.current

    // Update ref for next render
    prevStreamingRef.current = isStreaming

    // On first render with messages, scroll immediately to bottom
    if (messages.length > 0 && !hasScrolledInitiallyRef.current) {
      hasScrolledInitiallyRef.current = true
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'instant',
            block: 'end'
          })
        }
      })
      return
    }

    // If streaming just ended, scroll to show the final persisted message
    // Use instant scroll to avoid jumping up/down during rerender
    if (wasStreaming && !isStreaming) {
      console.log('[MessageView] Streaming ended, scrolling to final message')
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'instant',
            block: 'end'
          })
        }
      })
      return
    }

    // During streaming, only auto-scroll if user is at bottom
    // This allows users to scroll up to read previous messages during streaming
    if (isStreaming) {
      // Only auto-scroll during streaming if user hasn't scrolled up
      if (isUserScrolledUp) return

      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'instant',
            block: 'end'
          })
        }
      })
      return
    }

    // For normal messages (not streaming), respect user scroll position
    if (isUserScrolledUp) return

    // Use requestAnimationFrame to ensure DOM has finished rendering before scrolling
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        })
      }
    })
  }, [messages, aiStreamingContent, isUserScrolledUp])



  // Enhanced send handler with proper attachment storage
  const handleEnhancedSend = async (text: string, attachments?: EnhancedAttachment[]) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) {
      // console.log('[MessageView] Empty message, not sending')
      return
    }

    try {
      // console.log('[MessageView] 🎯 Enhanced send with:', text, attachments?.length, 'attachments')

      // Extract hashtags from text
      const hashtagRegex = /#[\w-]+/g
      const hashtags = text.match(hashtagRegex) || []
      // console.log('[MessageView] Extracted hashtags:', hashtags)

      let messageContent = text
      const messageAttachments: MessageAttachment[] = []

      // Process and store attachments using AttachmentService
      if (attachments && attachments.length > 0) {
        // console.log('[MessageView] Processing attachments with AttachmentService')

        for (const attachment of attachments) {
          try {
            // Convert File to ArrayBuffer first
            const arrayBuffer = await attachment.file.arrayBuffer()

            // Store attachment in ONE platform
            const result = await attachmentService.storeAttachment(arrayBuffer, {
              name: attachment.file.name,
              mimeType: attachment.file.type || 'application/octet-stream',
              size: attachment.file.size
            })

            // Extract hash from result
            const hash = result.hash || result.id || result

            // Create message attachment reference
            const messageAttachment: MessageAttachment = {
              hash,
              type: 'blob',
              mimeType: attachment.file.type,
              name: attachment.file.name,
              size: attachment.file.size
            }
            messageAttachments.push(messageAttachment)

            // Cache the descriptor for immediate display
            const descriptor: BlobDescriptor = {
              data: await attachment.file.arrayBuffer(),
              type: attachment.file.type,
              name: attachment.file.name,
              size: attachment.file.size,
              lastModified: attachment.file.lastModified
            }
            setAttachmentDescriptors(prev => {
              const newMap = new Map(prev)
              newMap.set(hash, descriptor)
              return newMap
            })

            // console.log(`[MessageView] Stored attachment ${attachment.file.name} with hash: ${hash}`)
          } catch (error) {
            console.error(`[MessageView] Failed to store attachment ${attachment.file.name}:`, error)
          }
        }
      }

      // Send the message with attachments
      await onSendMessage(messageContent, messageAttachments.length > 0 ? messageAttachments : undefined)

      // Reset scroll position tracking and force instant scroll to bottom after sending
      setIsUserScrolledUp(false)
      // Use double requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'instant', block: 'end' })
          }
        })
      })

    } catch (error) {
      console.error('Failed to send enhanced message:', error)
    }
  }

  // Handle hashtag clicks - open keyword detail dialog
  const handleHashtagClick = (hashtag: string) => {
    // console.log('[MessageView] Hashtag/keyword clicked:', hashtag, '| topicId:', topicId)

    if (topicId) {
      // Open keyword detail dialog
      setSelectedKeyword(hashtag)
      setShowKeywordDetail(true)
    } else {
      // No topicId available - can't show context-specific details
      console.warn('[MessageView] Cannot show keyword detail - no topicId available')
      alert(`Search for #${hashtag} - Feature coming soon!`)
    }
  }

  const handleCloseKeywordDetail = () => {
    setShowKeywordDetail(false)
    setSelectedKeyword(null)
  }

  // Handle attachment clicks
  const handleAttachmentClick = (attachmentId: string) => {
    console.log('[MessageView] Attachment clicked:', attachmentId)
    // TODO: Implement attachment viewer
  }

  // Handle attachment downloads
  const handleDownloadAttachment = (attachmentId: string) => {
    console.log('[MessageView] Download attachment:', attachmentId)
    // TODO: Implement attachment download
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    )
  }

  // Determine if we should show sender labels (only when multiple other participants)
  const otherParticipants = participants.filter(p => p !== currentUserId)
  const shouldShowSenderLabels = otherParticipants.length > 1

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Keyword Detail Panel - Inline at top */}
      {showKeywordDetail && selectedKeyword && topicId && (
        <div className="border-b border-gray-700 bg-gray-900/50 max-h-[25vh] overflow-y-auto">
          <KeywordDetailPanel
            keyword={selectedKeyword}
            topicId={topicId}
            onClose={handleCloseKeywordDetail}
          />
        </div>
      )}

      <div className="flex-1 px-4 py-2 overflow-y-auto" ref={scrollAreaRef} onScroll={handleScroll} style={{ minHeight: 0 }}>
        <div className="space-y-4" style={{ paddingBottom: proposals.length > 0 ? '120px' : '0' }}>
          {messages.length === 0 && !loading && !isAIProcessing && !aiStreamingContent && (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          )}
          {messages.map((message) => {
            // Check if this is the current user's message
            const isCurrentUser = message.senderId === 'user' || message.senderId === currentUserId
            // Use the isAI flag from the message
            const isAIMessage = message.isAI === true
            // console.log(`[MessageView] Rendering message - senderId: "${message.senderId}", currentUserId: "${currentUserId}", isCurrentUser: ${isCurrentUser}, isAI: ${isAIMessage}, content: "${message.content.substring(0, 50)}..."`)

            // Always use EnhancedMessageBubble for consistent rendering and features
            // Extract hashtags from message content
            const hashtagRegex = /#[\w-]+/g
            const hashtags = message.content.match(hashtagRegex) || []
            const subjects = hashtags.map(tag => tag.slice(1)) // Remove # prefix



            const enhancedMessage: EnhancedMessageData = {
              id: message.id,
              text: message.content, // Use cleaned text without attachment references
              senderId: message.senderId,
              senderName: message.senderName || contactNames[message.senderId] || 'Unknown',
              timestamp: message.timestamp,
              isOwn: isCurrentUser,
              subjects: subjects,
              trustLevel: 3, // Default colleague level
              attachments: message.attachments, // Pass through directly - EnhancedMessageBubble will handle transformation
              topicName: message.topicName, // Pass topic name to enhanced bubble
              format: message.format || 'markdown', // Use message format if available, otherwise markdown
              thinking: message.thinking // Pass thinking trace if present
            }

            // console.log(`[MessageView] Passing to EnhancedMessageBubble:`, {
            //   id: enhancedMessage.id,
            //   hasText: !!enhancedMessage.text,
            //   textLength: enhancedMessage.text?.length,
            //   format: enhancedMessage.format
            // })

            return (
              <EnhancedMessageBubble
                key={message.id}
                message={enhancedMessage}
                onHashtagClick={handleHashtagClick}
                onAttachmentClick={handleAttachmentClick}
                onDownloadAttachment={handleDownloadAttachment}
                theme="dark"
                attachmentDescriptors={attachmentDescriptors}
              />
            )
          })}
          
          {/* AI Typing Indicator or Streaming Content */}
          {(isAIProcessing || aiStreamingContent) && (
            <>
              {aiStreamingContent ? (
                // Use EnhancedMessageBubble for streaming content to ensure consistent markdown rendering
                <>
                  <EnhancedMessageBubble
                    message={{
                      id: 'streaming-ai-message',
                      text: aiStreamingContent,
                      senderId: 'ai',
                      senderName: 'AI Assistant',
                      timestamp: new Date(),
                      isOwn: false,
                      subjects: [],
                      trustLevel: 5,
                      format: 'markdown', // Ensure markdown format for proper rendering
                      thinking: aiThinkingContent // Pass thinking content for reasoning models
                    }}
                    onHashtagClick={handleHashtagClick}
                    onAttachmentClick={handleAttachmentClick}
                    onDownloadAttachment={handleDownloadAttachment}
                    theme="dark"
                    attachmentDescriptors={attachmentDescriptors}
                  />
                  {/* Character count indicator */}
                  <div className="text-xs text-muted-foreground ml-12 -mt-2 mb-2">
                    Streaming... {aiStreamingContent.length} characters
                    {aiThinkingContent && ` | Thinking: ${aiThinkingContent.length} chars`}
                  </div>
                </>
              ) : (
                // Show typing indicator with proper AI message styling
                <div className="flex gap-2 mb-2 justify-start">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <div className="message-bubble message-bubble-ai">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      AI is thinking...
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button - Shows when user scrolls up */}
      {isUserScrolledUp && (
        <div className={`absolute right-6 pointer-events-none ${proposals.length > 0 ? 'bottom-32' : 'bottom-20'}`}>
          <Button
            size="icon"
            variant="secondary"
            className="pointer-events-auto rounded-full shadow-lg h-10 w-10 bg-primary/90 hover:bg-primary"
            onClick={() => {
              setIsUserScrolledUp(false)
              requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                  })
                }
              })
            }}
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Proposal Carousel - Absolutely positioned above message input */}
      {proposals.length > 0 && (
        <div className="absolute bottom-16 left-0 right-0 px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <ProposalCarousel
              proposals={proposals}
              currentIndex={currentIndex}
              onNext={nextProposal}
              onPrevious={previousProposal}
              onShare={async (proposalId, pastSubjectIdHash) => {
                const result = await shareProposal(proposalId, pastSubjectIdHash, false)
                if (result.success && result.sharedContent) {
                  // Pre-fill input with description (if available) or keywords as fallback
                  const contextMessage = result.sharedContent.description || result.sharedContent.keywords.join(', ')
                  setInputPrefillText(contextMessage)
                  // Dismiss the proposal after sharing
                  dismissProposal(proposalId)
                }
              }}
              onDismiss={dismissProposal}
            />
          </div>
        </div>
      )}

      {/* Message input */}
      <EnhancedMessageInput
        onSendMessage={handleEnhancedSend}
        onStopStreaming={onStopStreaming}
        onHashtagClick={handleHashtagClick}
        onTextChange={handleInputTextChange}
        placeholder={placeholder}
        theme="dark"
        conversationId={topicId}
        isStreaming={isAIProcessing}
        initialText={inputPrefillText}
      />
    </div>
  )
}