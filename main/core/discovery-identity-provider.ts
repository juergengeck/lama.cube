/**
 * CubeDiscoveryIdentityProvider - Provides discovery identity from user settings
 *
 * Implements DiscoveryIdentityProvider to supply identity for discovery broadcasts.
 * Users can configure which identity to present via DeviceSettings.discoveryIdentity.
 *
 * Default behavior: uses instance owner's identity if not configured.
 */

import type { DiscoveryIdentityProvider, DiscoveryIdentity } from '@lama/connection.core';
import type nodeOneCore from './node-one-core.js';

type NodeOneCore = typeof nodeOneCore;

export interface CubeDiscoveryIdentityProviderDeps {
  /** ONE.core node instance */
  nodeOneCore: NodeOneCore;
  /** Instance ID (from ONE.core) */
  instanceId: string;
}

export class CubeDiscoveryIdentityProvider implements DiscoveryIdentityProvider {
  private nodeOneCore: NodeOneCore;
  private instanceId: string;
  private changeCallbacks: ((identity: DiscoveryIdentity) => void)[] = [];

  constructor(deps: CubeDiscoveryIdentityProviderDeps) {
    this.nodeOneCore = deps.nodeOneCore;
    this.instanceId = deps.instanceId;
  }

  /**
   * Get current discovery identity based on user settings
   *
   * Note: Device-specific discovery settings (custom displayName, pubKeyOverride)
   * are not yet implemented in UserSettings. This method returns the default
   * owner identity. When device settings are added to UserSettings, this can
   * be extended to support custom discovery identities.
   */
  async getDiscoveryIdentity(): Promise<DiscoveryIdentity> {
    // TODO: When device settings are added to UserSettings, check for:
    // - settings.device?.discoveryIdentity?.pubKeyOverride
    // - settings.device?.discoveryIdentity?.displayName
    // - settings.device?.discoveryIdentity?.profileId
    //
    // For now, use default owner identity
    return this.getDefaultIdentity();
  }

  /**
   * Subscribe to identity changes
   */
  onIdentityChanged(callback: (identity: DiscoveryIdentity) => void): () => void {
    this.changeCallbacks.push(callback);

    // Subscribe to settings changes if available
    // TODO: Wire up settings change subscription when userSettingsManager supports it

    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index >= 0) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of identity change
   */
  notifyIdentityChanged(identity: DiscoveryIdentity): void {
    this.changeCallbacks.forEach(cb => cb(identity));
  }

  /**
   * Get default identity (owner-based)
   */
  private getDefaultIdentity(): DiscoveryIdentity {
    return {
      pubKey: this.nodeOneCore.ownerId || '',
      deviceId: this.instanceId,
      displayName: this.getDefaultDisplayName(),
    };
  }

  /**
   * Get default display name
   */
  private getDefaultDisplayName(): string {
    return this.nodeOneCore.instanceName || 'LAMA Device';
  }
}
