/**
 * Relay Broadcaster - Registers presence with CommServer
 *
 * Uses spare connection mechanism to maintain presence.
 * Other clients can query CommServer for registered pubKeys.
 */

import type { DiscoveryBroadcaster, DiscoveryPacket } from '@lama/connection.core';

const PRESENCE_REFRESH_INTERVAL = 30000; // 30s refresh

export class RelayBroadcaster implements DiscoveryBroadcaster {
  readonly type = 'relay' as const;

  private commServerUrl: string;
  private presenceTTL: number;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private broadcasting: boolean = false;
  private currentPacket: DiscoveryPacket | null = null;

  constructor(commServerUrl: string, presenceTTL: number = 60000) {
    this.commServerUrl = commServerUrl;
    this.presenceTTL = presenceTTL;
  }

  async startBroadcasting(packet: DiscoveryPacket): Promise<void> {
    if (this.broadcasting) {
      return;
    }

    if (!this.commServerUrl) {
      console.warn('[RelayBroadcaster] No CommServer URL configured, skipping');
      return;
    }

    this.currentPacket = packet;

    // Register presence immediately
    await this.registerPresence();

    // Refresh periodically before TTL expires
    this.refreshInterval = setInterval(() => {
      void this.registerPresence();
    }, PRESENCE_REFRESH_INTERVAL);

    this.broadcasting = true;
    console.log('[RelayBroadcaster] Started presence registration');
  }

  async stopBroadcasting(): Promise<void> {
    if (!this.broadcasting) {
      return;
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Unregister presence
    await this.unregisterPresence();

    this.broadcasting = false;
    this.currentPacket = null;
    console.log('[RelayBroadcaster] Stopped presence registration');
  }

  isBroadcasting(): boolean {
    return this.broadcasting;
  }

  /**
   * Register presence with CommServer
   * Uses WebSocket to maintain connection for presence
   */
  private async registerPresence(): Promise<void> {
    if (!this.currentPacket || !this.commServerUrl) {
      return;
    }

    try {
      // For now, use HTTP endpoint if available
      // CommServer doesn't have a presence API yet - this is a placeholder
      // The actual implementation will depend on extending CommServer
      console.log(`[RelayBroadcaster] Would register presence for ${this.currentPacket.pubKey.substring(0, 16)}...`);

      // TODO: When CommServer presence API is implemented:
      // await fetch(`${this.commServerUrl}/presence`, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     pubKey: this.currentPacket.pubKey,
      //     transports: this.currentPacket.transports,
      //     ttl: this.presenceTTL,
      //   }),
      // });
    } catch (error) {
      console.error('[RelayBroadcaster] Failed to register presence:', error);
    }
  }

  /**
   * Unregister presence from CommServer
   */
  private async unregisterPresence(): Promise<void> {
    if (!this.currentPacket || !this.commServerUrl) {
      return;
    }

    try {
      console.log(`[RelayBroadcaster] Would unregister presence for ${this.currentPacket.pubKey.substring(0, 16)}...`);

      // TODO: When CommServer presence API is implemented:
      // await fetch(`${this.commServerUrl}/presence/${this.currentPacket.pubKey}`, {
      //   method: 'DELETE',
      // });
    } catch (error) {
      console.error('[RelayBroadcaster] Failed to unregister presence:', error);
    }
  }

  /**
   * Query CommServer for a specific pubKey's presence
   */
  async queryPresence(pubKey: string): Promise<DiscoveryPacket | null> {
    if (!this.commServerUrl) {
      return null;
    }

    try {
      console.log(`[RelayBroadcaster] Would query presence for ${pubKey.substring(0, 16)}...`);

      // TODO: When CommServer presence API is implemented:
      // const response = await fetch(`${this.commServerUrl}/presence/${pubKey}`);
      // if (response.ok) {
      //   return await response.json();
      // }
      return null;
    } catch (error) {
      console.error('[RelayBroadcaster] Failed to query presence:', error);
      return null;
    }
  }
}
