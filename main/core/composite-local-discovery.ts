/**
 * CompositeLocalDiscovery - Combines UDP and BTLE discovery for Electron
 *
 * Implements LocalDiscoveryProvider by aggregating discoveries from:
 * - UDPDiscoveryProvider (platform-agnostic UDP from connection.core)
 * - BTLEDiscoveryProvider (Bluetooth LE scanning)
 *
 * This ensures we can discover both desktop peers (UDP) and mobile peers (BTLE).
 *
 * Identity comes from DiscoveryIdentityProvider (user-configurable via settings).
 */

import type { LocalDiscoveryProvider, LocalPeerInfo, DiscoveryIdentityProvider } from '@lama/connection.core';
import { BTLEDiscoveryProvider, UDPDiscoveryProvider } from '@lama/connection.core';
import { NodeUDPSocketService } from './node-udp-socket-service.js';
import { getBTLEDiscoveryService } from './node-btle-service.js';

export class CompositeLocalDiscovery implements LocalDiscoveryProvider {
  private udpDiscovery: UDPDiscoveryProvider;
  private btleDiscovery: BTLEDiscoveryProvider | null = null;

  private discoveredCallbacks: ((peer: LocalPeerInfo) => void)[] = [];
  private lostCallbacks: ((peerId: string) => void)[] = [];
  private peers: Map<string, LocalPeerInfo> = new Map();
  private initialized = false;

  constructor(private identityProvider: DiscoveryIdentityProvider) {
    // Create platform-agnostic UDP provider with Node.js socket implementation
    const udpSocketService = new NodeUDPSocketService();
    this.udpDiscovery = new UDPDiscoveryProvider(udpSocketService, identityProvider);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize UDP discovery
    await this.udpDiscovery.initialize();
    this.setupUdpCallbacks();

    // Initialize BTLE discovery (may fail if no Bluetooth hardware)
    try {
      const btleService = getBTLEDiscoveryService();
      const btleInitialized = await btleService.initialize();

      if (btleInitialized) {
        this.btleDiscovery = new BTLEDiscoveryProvider(btleService);
        await this.btleDiscovery.initialize();
        this.setupBtleCallbacks();
        console.log('[CompositeLocalDiscovery] BTLE discovery initialized');
      } else {
        console.warn('[CompositeLocalDiscovery] BTLE not available');
      }
    } catch (error) {
      console.warn('[CompositeLocalDiscovery] Failed to initialize BTLE:', error);
    }

    this.initialized = true;
    console.log('[CompositeLocalDiscovery] Initialized with UDP' + (this.btleDiscovery ? ' + BTLE' : ''));
  }

  private setupUdpCallbacks(): void {
    this.udpDiscovery.onPeerDiscovered((peer) => {
      this.addOrUpdatePeer({
        ...peer,
        capabilities: [...(peer.capabilities || []), 'udp'],
      });
    });

    this.udpDiscovery.onPeerLost((peerId) => {
      this.removePeer(peerId);
    });
  }

  private setupBtleCallbacks(): void {
    if (!this.btleDiscovery) return;

    this.btleDiscovery.onPeerDiscovered((peer) => {
      this.addOrUpdatePeer({
        ...peer,
        capabilities: [...(peer.capabilities || []), 'btle'],
      });
    });

    this.btleDiscovery.onPeerLost((peerId) => {
      // Only remove if we don't also see this peer via UDP
      const existing = this.peers.get(peerId);
      if (existing && !existing.capabilities.includes('udp')) {
        this.removePeer(peerId);
      } else if (existing) {
        // Remove btle capability but keep the peer
        existing.capabilities = existing.capabilities.filter(c => c !== 'btle');
      }
    });
  }

  async startListening(): Promise<void> {
    const results = await Promise.allSettled([
      this.udpDiscovery.startListening(),
      this.btleDiscovery?.startListening(),
    ]);

    // Log any errors but don't fail completely
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const service = index === 0 ? 'UDP' : 'BTLE';
        console.warn(`[CompositeLocalDiscovery] ${service} failed to start:`, result.reason);
      }
    });
  }

  stopListening(): void {
    this.udpDiscovery.stopListening();
    this.btleDiscovery?.stopListening();
  }

  async scan(timeout: number): Promise<LocalPeerInfo[]> {
    // Scan on all transports in parallel
    const results = await Promise.allSettled([
      this.udpDiscovery.scan(timeout),
      this.btleDiscovery?.scan(timeout) ?? Promise.resolve([]),
    ]);

    // Collect all peers (deduplicated in addOrUpdatePeer)
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        for (const peer of result.value) {
          this.addOrUpdatePeer(peer);
        }
      }
    }

    return this.getDiscoveredPeers();
  }

  onPeerDiscovered(callback: (peer: LocalPeerInfo) => void): void {
    this.discoveredCallbacks.push(callback);
  }

  onPeerLost(callback: (peerId: string) => void): void {
    this.lostCallbacks.push(callback);
  }

  async shutdown(): Promise<void> {
    await this.udpDiscovery.shutdown();
    await this.btleDiscovery?.shutdown();

    this.peers.clear();
    this.discoveredCallbacks = [];
    this.lostCallbacks = [];
    this.initialized = false;

    console.log('[CompositeLocalDiscovery] Shutdown complete');
  }

  /**
   * Get all currently discovered peers
   */
  getDiscoveredPeers(): LocalPeerInfo[] {
    return Array.from(this.peers.values());
  }

  private addOrUpdatePeer(peer: LocalPeerInfo): void {
    const existing = this.peers.get(peer.id);

    if (existing) {
      // Update last seen and merge capabilities
      existing.lastSeenAt = Date.now();
      existing.capabilities = [...new Set([...existing.capabilities, ...peer.capabilities])];

      // Update address if we got a new one (prefer UDP address over BTLE)
      if (peer.capabilities.includes('udp') && peer.address) {
        existing.address = peer.address;
      }
    } else {
      // New peer
      this.peers.set(peer.id, peer);
      this.discoveredCallbacks.forEach(cb => cb(peer));
    }
  }

  private removePeer(peerId: string): void {
    if (this.peers.delete(peerId)) {
      this.lostCallbacks.forEach(cb => cb(peerId));
    }
  }
}
