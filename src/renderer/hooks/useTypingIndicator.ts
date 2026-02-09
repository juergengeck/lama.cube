import { useState, useEffect, useCallback, useRef } from 'react'
import { lamaBridge } from '@/bridge/lama-bridge'

interface ComposingUser {
  personId: string
  name: string
  since: number
}

interface ComposingChangedEvent {
  topicId: string
  personId: string
  isComposing: boolean
  timestamp?: number
}

interface UseTypingIndicatorReturn {
  /** Users currently composing in this topic */
  composingUsers: ComposingUser[]
  /** Set local user's composing state (debounced) */
  setLocalComposing: (isComposing: boolean) => void
}

// Stale timeout - clear composing state after 5 seconds of no refresh
const STALE_TIMEOUT_MS = 5000

// Debounce for local composing - don't spam the server
const DEBOUNCE_MS = 300

/**
 * Hook to track typing indicators for a topic.
 *
 * Listens for composing state changes from other users and provides
 * a debounced function to update local composing state.
 *
 * @param topicId - The topic to track composing for
 * @returns composingUsers array and setLocalComposing function
 */
export function useTypingIndicator(topicId: string): UseTypingIndicatorReturn {
  // Map of personId -> { name, since }
  const [composingMap, setComposingMap] = useState<Map<string, { name: string; since: number }>>(new Map())

  // Refs for cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const staleTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const lastLocalComposingRef = useRef<boolean>(false)

  // Handle composing changed events from IPC
  const handleComposingChanged = useCallback((event: ComposingChangedEvent) => {
    // Only process events for this topic
    if (event.topicId !== topicId) return

    setComposingMap(prev => {
      const next = new Map(prev)

      if (event.isComposing) {
        // Add or update composing user
        next.set(event.personId, {
          name: event.personId.substring(0, 8), // TODO: resolve person name
          since: event.timestamp || Date.now()
        })

        // Set stale timeout to auto-remove if no refresh
        const existingTimer = staleTimersRef.current.get(event.personId)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }
        const timer = setTimeout(() => {
          setComposingMap(current => {
            const updated = new Map(current)
            updated.delete(event.personId)
            return updated
          })
          staleTimersRef.current.delete(event.personId)
        }, STALE_TIMEOUT_MS)
        staleTimersRef.current.set(event.personId, timer)
      } else {
        // Remove composing user
        next.delete(event.personId)

        // Clear stale timer
        const existingTimer = staleTimersRef.current.get(event.personId)
        if (existingTimer) {
          clearTimeout(existingTimer)
          staleTimersRef.current.delete(event.personId)
        }
      }

      return next
    })
  }, [topicId])

  // Subscribe to composing events
  useEffect(() => {
    lamaBridge.on('chat:composingChanged', handleComposingChanged)

    return () => {
      lamaBridge.off('chat:composingChanged', handleComposingChanged)

      // Cleanup stale timers
      for (const timer of staleTimersRef.current.values()) {
        clearTimeout(timer)
      }
      staleTimersRef.current.clear()
    }
  }, [handleComposingChanged])

  // Clear composing state when topic changes
  useEffect(() => {
    setComposingMap(new Map())
    lastLocalComposingRef.current = false

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [topicId])

  // Set local composing state (debounced)
  const setLocalComposing = useCallback((isComposing: boolean) => {
    // Skip if state hasn't changed
    if (lastLocalComposingRef.current === isComposing) return

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce the IPC call
    debounceTimerRef.current = setTimeout(async () => {
      try {
        lastLocalComposingRef.current = isComposing
        await window.electronAPI?.invoke('chat:setComposing', { topicId, isComposing })
      } catch (error) {
        console.error('[useTypingIndicator] Failed to set composing state:', error)
      }
    }, isComposing ? DEBOUNCE_MS : 0) // Immediate for stop, debounced for start
  }, [topicId])

  // Cleanup on unmount - send stop composing
  useEffect(() => {
    return () => {
      if (lastLocalComposingRef.current) {
        window.electronAPI?.invoke('chat:setComposing', { topicId, isComposing: false })
          .catch(() => {}) // Ignore errors on unmount
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [topicId])

  // Convert map to array
  const composingUsers: ComposingUser[] = Array.from(composingMap.entries()).map(([personId, data]) => ({
    personId,
    name: data.name,
    since: data.since
  }))

  return { composingUsers, setLocalComposing }
}
