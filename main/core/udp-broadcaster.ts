/**
 * UDP Broadcaster - Adapts QuicVCDiscovery to DiscoveryBroadcaster interface
 */

import type { DiscoveryBroadcaster, DiscoveryPacket } from '@lama/connection.core';
import { QuicVCDiscovery, type LocalPeerInfo } from './quicvc-discovery.js';

export class UdpBroadcaster implements DiscoveryBroadcaster {
  readonly type = 'udp' as const;

  private discovery: QuicVCDiscovery | null = null;
  private deviceId: string;
  private deviceName: string;
  private broadcasting: boolean = false;

  constructor(deviceId: string, deviceName: string) {
    this.deviceId = deviceId;
    this.deviceName = deviceName;
  }

  async startBroadcasting(packet: DiscoveryPacket): Promise<void> {
    if (this.broadcasting) {
      return;
    }

    // Create discovery instance with pubKey as deviceId for now
    // TODO: Include pubKey in discovery packet
    this.discovery = new QuicVCDiscovery(this.deviceId, this.deviceName);

    await this.discovery.start();
    this.broadcasting = true;
    console.log('[UdpBroadcaster] Started UDP broadcasting');
  }

  async stopBroadcasting(): Promise<void> {
    if (!this.broadcasting || !this.discovery) {
      return;
    }

    await this.discovery.stop();
    this.discovery = null;
    this.broadcasting = false;
    console.log('[UdpBroadcaster] Stopped UDP broadcasting');
  }

  isBroadcasting(): boolean {
    return this.broadcasting;
  }

  /**
   * Get discovered devices (for demand side)
   */
  getDiscoveredDevices() {
    return this.discovery?.getDiscoveredDevices() || [];
  }

  /**
   * Register callback for peer discovery
   */
  onPeerDiscovered(callback: (peer: LocalPeerInfo) => void): void {
    this.discovery?.onPeerDiscovered(callback);
  }
}
