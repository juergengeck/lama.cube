/**
 * Sync Monitor - Tracks CHUM sync activity for traffic light visualization
 *
 * Monitors object events to track sync statistics:
 * - Objects received (from remote peers via CHUM)
 * - Objects sent (local objects synced to peers)
 * - Pending operations
 * - Failed operations
 *
 * Tracks both aggregate stats and per-peer stats.
 */

import { objectEvents } from '@refinio/one.models/lib/misc/ObjectEventDispatcher.js'
import { onChumStart, onChumEnd } from '@refinio/one.core/lib/chum-sync.js'

export interface SyncStats {
  /** Objects successfully sent */
  sent: number
  /** Objects successfully received */
  received: number
  /** Objects pending/in-progress */
  pending: number
  /** Objects that failed to transfer */
  failed: number
  /** Active sync in progress */
  syncing: boolean
  /** Last sync timestamp */
  lastSync?: number
}

export interface ConnectionStats {
  /** Peer person ID */
  peerId: string
  /** Peer display name */
  peerName: string
  /** Connection state */
  state: 'connected' | 'connecting' | 'disconnected'
  /** Transport type */
  transport?: 'websocket' | 'quicvc' | 'webrtc'
  /** Sync stats for this connection */
  syncStats: SyncStats
  /** Event history for timeline visualization */
  events: SyncEvent[]
}

export type SyncEventType = 'idle' | 'connecting' | 'syncing' | 'success' | 'failed' | 'disconnected'

export interface SyncEvent {
  /** Timestamp of the event */
  timestamp: number
  /** Event type */
  state: SyncEventType
  /** Number of objects transferred (if applicable) */
  objectCount?: number
  /** Error message (if failed) */
  error?: string
}

// Maximum events to keep per peer (1 hour at ~1 event per 10s = 360)
const MAX_EVENTS_PER_PEER = 500
// Event retention window (1 hour)
const EVENT_RETENTION_MS = 60 * 60 * 1000

class SyncMonitor {
  private stats: SyncStats = {
    sent: 0,
    received: 0,
    pending: 0,
    failed: 0,
    syncing: false,
    lastSync: undefined
  }

  // Per-peer stats
  private peerStats: Map<string, ConnectionStats> = new Map()

  // Global event history (for aggregate timeline)
  private globalEvents: SyncEvent[] = []

  // Track active CHUM sessions (remotePersonId -> session start time)
  private activeChumSessions: Map<string, number> = new Map()

  private initialized = false

  /**
   * Initialize sync monitor by hooking into ObjectEventDispatcher
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Track received objects (from CHUM sync)
      // During active CHUM sessions, new objects are attributed to the peer
      // API: onNewVersion(callback, description, type, idHash)
      objectEvents.onNewVersion((result: any) => {
        if (result.status === 'new') {
          // If we have active CHUM sessions, attribute to them
          if (this.activeChumSessions.size > 0) {
            // Attribute to all active sessions (could be multiple peers syncing)
            for (const [peerId] of this.activeChumSessions) {
              this.recordReceivedFromPeer(peerId, undefined, 1)
              console.log(`[SyncMonitor] Object received from peer ${peerId.substring(0, 8)}: type=${result.obj?.$type$}`)
            }
          } else {
            // No active CHUM - this is likely a local creation
            // Still count it but as a local event
            this.stats.received++
            this.stats.lastSync = Date.now()
          }
        }
      }, '[SyncMonitor] Track received versioned objects', '*', '*')

      // Track CHUM start/end for per-peer activity
      onChumStart.addListener((options: any) => {
        const remotePersonId = options.remotePersonId
        if (!remotePersonId) return

        console.log(`[SyncMonitor] CHUM START with peer: ${remotePersonId.substring(0, 8)}...`)

        // Track active session
        this.activeChumSessions.set(remotePersonId, Date.now())

        // Update peer state
        this.setPeerState(remotePersonId, 'connected', options.remoteInstanceName)
        this.recordPeerEvent(remotePersonId, 'syncing')
        this.stats.syncing = true
      })

      onChumEnd.addListener((options: any) => {
        const remotePersonId = options.remotePersonId
        if (!remotePersonId) return

        console.log(`[SyncMonitor] CHUM END with peer: ${remotePersonId.substring(0, 8)}...`)

        // Get session stats before clearing
        const peer = this.peerStats.get(remotePersonId)
        const sessionStart = this.activeChumSessions.get(remotePersonId)

        // Clear active session
        this.activeChumSessions.delete(remotePersonId)

        // Record sync completion with object count
        if (peer) {
          const objectCount = peer.syncStats.received + peer.syncStats.sent
          if (objectCount > 0) {
            this.recordPeerEvent(remotePersonId, 'success', objectCount)
          } else {
            // Sync completed but no objects transferred
            this.recordPeerEvent(remotePersonId, 'idle')
          }
        }

        this.stats.syncing = this.activeChumSessions.size > 0
      })

      this.initialized = true
      console.log('[SyncMonitor] Initialized')
    } catch (error) {
      console.error('[SyncMonitor] Failed to initialize:', error)
    }
  }

  /**
   * Record an object received from a specific peer
   */
  recordReceivedFromPeer(peerId: string, peerName?: string, count: number = 1): void {
    this.stats.received += count
    this.stats.lastSync = Date.now()

    const peer = this.getOrCreatePeer(peerId, peerName)
    peer.syncStats.received += count
    peer.syncStats.lastSync = Date.now()
  }

  /**
   * Record an object sent to a specific peer
   */
  recordSentToPeer(peerId: string, peerName?: string, count: number = 1): void {
    this.stats.sent += count
    this.stats.lastSync = Date.now()

    const peer = this.getOrCreatePeer(peerId, peerName)
    peer.syncStats.sent += count
    peer.syncStats.lastSync = Date.now()
  }

  /**
   * Record an object sent via CHUM sync (aggregate only)
   */
  recordSent(count: number = 1): void {
    this.stats.sent += count
    this.stats.lastSync = Date.now()
  }

  /**
   * Record a pending sync operation
   */
  recordPending(count: number = 1): void {
    this.stats.pending += count
  }

  /**
   * Record completion of pending operations
   */
  recordPendingComplete(count: number = 1): void {
    this.stats.pending = Math.max(0, this.stats.pending - count)
  }

  /**
   * Record a failed sync operation
   */
  recordFailed(count: number = 1): void {
    this.stats.failed += count
    this.stats.pending = Math.max(0, this.stats.pending - count)
  }

  /**
   * Record failed sync for a specific peer
   */
  recordFailedForPeer(peerId: string, peerName?: string, count: number = 1): void {
    this.stats.failed += count
    this.stats.pending = Math.max(0, this.stats.pending - count)

    const peer = this.getOrCreatePeer(peerId, peerName)
    peer.syncStats.failed += count
    peer.syncStats.pending = Math.max(0, peer.syncStats.pending - count)
  }

  /**
   * Set syncing state
   */
  setSyncing(syncing: boolean): void {
    this.stats.syncing = syncing
    if (syncing) {
      this.stats.lastSync = Date.now()
    }
  }

  /**
   * Update connection state for a peer
   */
  setPeerState(peerId: string, state: 'connected' | 'connecting' | 'disconnected', peerName?: string, transport?: 'websocket' | 'quicvc' | 'webrtc'): void {
    const peer = this.getOrCreatePeer(peerId, peerName)
    peer.state = state
    if (transport) {
      peer.transport = transport
    }
    peer.syncStats.syncing = state === 'connecting'
  }

  /**
   * Update peer name
   */
  setPeerName(peerId: string, peerName: string): void {
    const peer = this.peerStats.get(peerId)
    if (peer) {
      peer.peerName = peerName
    }
  }

  /**
   * Get current sync statistics (aggregate)
   */
  getStats(): SyncStats {
    return { ...this.stats }
  }

  /**
   * Get all connection stats
   */
  getConnections(): ConnectionStats[] {
    return Array.from(this.peerStats.values()).map(conn => ({
      ...conn,
      syncStats: { ...conn.syncStats }
    }))
  }

  /**
   * Get stats for a specific peer
   */
  getPeerStats(peerId: string): ConnectionStats | undefined {
    const peer = this.peerStats.get(peerId)
    if (peer) {
      return {
        ...peer,
        syncStats: { ...peer.syncStats }
      }
    }
    return undefined
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.stats = {
      sent: 0,
      received: 0,
      pending: 0,
      failed: 0,
      syncing: false,
      lastSync: undefined
    }
    this.peerStats.clear()
    this.activeChumSessions.clear()
    this.globalEvents = []
  }

  /**
   * Simulate sync activity for testing visualization
   * Creates fake events over the past timeWindow
   */
  simulateActivity(peerId: string, peerName: string, timeWindow: number = 10 * 60 * 1000): void {
    console.log(`[SyncMonitor] Simulating activity for peer ${peerName}`)

    const now = Date.now()
    const peer = this.getOrCreatePeer(peerId, peerName)
    peer.state = 'connected'

    // Generate random events over the time window
    const numEvents = 15 + Math.floor(Math.random() * 10)
    const states: SyncEventType[] = ['idle', 'connecting', 'syncing', 'success', 'failed', 'disconnected']

    for (let i = 0; i < numEvents; i++) {
      const timestamp = now - timeWindow + (i * timeWindow / numEvents)
      const state = states[Math.floor(Math.random() * states.length)]
      const objectCount = state === 'success' ? Math.floor(Math.random() * 20) + 1 : undefined

      peer.events.push({
        timestamp,
        state,
        objectCount
      })

      // Update stats based on state
      if (state === 'success' && objectCount) {
        peer.syncStats.received += Math.floor(objectCount / 2)
        peer.syncStats.sent += Math.ceil(objectCount / 2)
      }
    }

    peer.syncStats.lastSync = now
    this.stats.lastSync = now
  }

  /**
   * Record an event for a specific peer
   */
  recordPeerEvent(peerId: string, state: SyncEventType, objectCount?: number, error?: string): void {
    const peer = this.getOrCreatePeer(peerId)
    const event: SyncEvent = {
      timestamp: Date.now(),
      state,
      objectCount,
      error
    }
    peer.events.push(event)
    this.globalEvents.push(event)

    // Trim old events periodically
    this.trimOldEvents(peer)
  }

  /**
   * Record a global event (not tied to a specific peer)
   */
  recordGlobalEvent(state: SyncEventType, objectCount?: number, error?: string): void {
    const event: SyncEvent = {
      timestamp: Date.now(),
      state,
      objectCount,
      error
    }
    this.globalEvents.push(event)
    this.trimGlobalEvents()
  }

  /**
   * Get global event history
   */
  getGlobalEvents(timeWindow?: number): SyncEvent[] {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0
    return this.globalEvents.filter(e => e.timestamp >= cutoff)
  }

  /**
   * Get event history for a specific peer
   */
  getPeerEvents(peerId: string, timeWindow?: number): SyncEvent[] {
    const peer = this.peerStats.get(peerId)
    if (!peer) return []

    const cutoff = timeWindow ? Date.now() - timeWindow : 0
    return peer.events.filter(e => e.timestamp >= cutoff)
  }

  /**
   * Trim old events for a peer
   */
  private trimOldEvents(peer: ConnectionStats): void {
    const cutoff = Date.now() - EVENT_RETENTION_MS
    peer.events = peer.events.filter(e => e.timestamp >= cutoff)

    // Also limit by count
    if (peer.events.length > MAX_EVENTS_PER_PEER) {
      peer.events = peer.events.slice(-MAX_EVENTS_PER_PEER)
    }
  }

  /**
   * Trim old global events
   */
  private trimGlobalEvents(): void {
    const cutoff = Date.now() - EVENT_RETENTION_MS
    this.globalEvents = this.globalEvents.filter(e => e.timestamp >= cutoff)

    // Also limit by count
    if (this.globalEvents.length > MAX_EVENTS_PER_PEER * 2) {
      this.globalEvents = this.globalEvents.slice(-MAX_EVENTS_PER_PEER * 2)
    }
  }

  /**
   * Get or create peer stats entry
   */
  private getOrCreatePeer(peerId: string, peerName?: string): ConnectionStats {
    let peer = this.peerStats.get(peerId)
    if (!peer) {
      peer = {
        peerId,
        peerName: peerName || `Peer ${peerId.substring(0, 8)}`,
        state: 'disconnected',
        syncStats: {
          sent: 0,
          received: 0,
          pending: 0,
          failed: 0,
          syncing: false,
          lastSync: undefined
        },
        events: []
      }
      this.peerStats.set(peerId, peer)
    } else if (peerName) {
      peer.peerName = peerName
    }
    return peer
  }
}

// Export singleton instance
export const syncMonitor = new SyncMonitor()
