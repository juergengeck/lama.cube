/**
 * DiscoveryServiceBridge - Adapts connection.core's DiscoveryService to device.core's DiscoveryServiceAdapter interface
 *
 * This bridge allows QuicVCDiscoveryAdapter to work with connection.core's DiscoveryService
 * by converting between PeerIdentity (connection.core) and DiscoveredDevice (device.core) formats.
 */

import type { DiscoveryService, PeerIdentity } from '@refinio/connection.core'
import type { DiscoveryServiceAdapter, DiscoveredDevice, DeviceIdentityCredential } from '@refinio/device.core'

export class DiscoveryServiceBridge implements DiscoveryServiceAdapter {
  private discoveryService: DiscoveryService
  private deviceDiscoveredCallbacks: Array<(device: DiscoveredDevice) => void> = []
  private deviceLostCallbacks: Array<(deviceId: string) => void> = []

  constructor(discoveryService: DiscoveryService) {
    this.discoveryService = discoveryService
    this.setupEventListeners()
  }

  /**
   * Setup event listeners to bridge connection.core events to device.core callbacks
   * Uses OEvent pattern from connection.core
   */
  private setupEventListeners(): void {
    // Bridge peerDiscovered -> onDeviceDiscovered (OEvent pattern)
    this.discoveryService.onPeerDiscovered.listen((peer: PeerIdentity) => {
      const device = this.convertPeerToDevice(peer)
      this.deviceDiscoveredCallbacks.forEach(callback => callback(device))
    })

    // Bridge peerLost -> onDeviceLost (OEvent pattern)
    this.discoveryService.onPeerLost.listen((peer: PeerIdentity) => {
      this.deviceLostCallbacks.forEach(callback => callback(peer.id))
    })
  }

  /**
   * Register callback for device discovered events
   */
  onDeviceDiscovered(callback: (device: DiscoveredDevice) => void): void {
    this.deviceDiscoveredCallbacks.push(callback)
  }

  /**
   * Register callback for device lost events
   */
  onDeviceLost(callback: (deviceId: string) => void): void {
    this.deviceLostCallbacks.push(callback)
  }

  /**
   * Convert connection.core PeerIdentity to device.core DiscoveredDevice
   */
  private convertPeerToDevice(peer: PeerIdentity): DiscoveredDevice {
    // Convert credential format
    const credential: DeviceIdentityCredential = {
      id: peer.credential.id,
      $type$: peer.credential.type?.[0] || 'VerifiableCredential',
      credentialSubject: {
        id: peer.credential.credentialSubject.id,
        publicKeyHex: peer.publicKey,
        deviceId: peer.id
      },
      proof: peer.credential.proof ? {
        type: peer.credential.proof.type,
        proofValue: peer.credential.proof.proofValue,
        created: peer.credential.proof.created,
        proofPurpose: peer.credential.proof.proofPurpose
      } : undefined
    }

    // Map discovery method
    const discoveryMethod = peer.discoveryMethod === 'local'
      ? (peer.capabilities.includes('btle') ? 'btle' : 'udp')
      : 'manual'

    return {
      deviceId: peer.id,
      address: peer.address,
      port: 49498, // QuicVC default port
      credential,
      discoveryMethod,
      discoveredAt: peer.discoveredAt,
      lastSeen: peer.lastSeenAt
    }
  }

  /**
   * Start discovery service
   */
  async start(): Promise<void> {
    this.discoveryService.start()
  }

  /**
   * Stop discovery service
   */
  stop(): void {
    this.discoveryService.stop()
  }

  /**
   * Perform one-time scan
   */
  async scan(): Promise<void> {
    await this.discoveryService.scan()
  }
}
