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
import type { UserSettingsManager } from './user-settings-manager.js';

type NodeOneCore = typeof nodeOneCore;

export interface CubeDiscoveryIdentityProviderDeps {
  /** ONE.core node instance */
  nodeOneCore: NodeOneCore;
  /** Instance ID (from ONE.core) */
  instanceId: string;
  /** User settings manager for reading discoveryIdentity config */
  userSettingsManager?: UserSettingsManager;
}

export class CubeDiscoveryIdentityProvider implements DiscoveryIdentityProvider {
  private nodeOneCore: NodeOneCore;
  private instanceId: string;
  private userSettingsManager?: UserSettingsManager;
  private changeCallbacks: ((identity: DiscoveryIdentity) => void)[] = [];

  constructor(deps: CubeDiscoveryIdentityProviderDeps) {
    this.nodeOneCore = deps.nodeOneCore;
    this.instanceId = deps.instanceId;
    this.userSettingsManager = deps.userSettingsManager;
  }

  /**
   * Set user settings manager after construction (for lazy initialization)
   */
  setUserSettingsManager(manager: UserSettingsManager): void {
    this.userSettingsManager = manager;
  }

  /**
   * Get current discovery identity based on user settings
   *
   * Checks DeviceSettings.discoveryIdentity for configured identity.
   * Falls back to owner identity if not configured.
   */
  async getDiscoveryIdentity(): Promise<DiscoveryIdentity> {
    // Check user settings for configured discovery identity
    if (this.userSettingsManager) {
      try {
        const settings = await this.userSettingsManager.getSettings();
        const discoveryConfig = (settings as any).device?.discoveryIdentity;

        if (discoveryConfig) {
          console.log('[DiscoveryIdentityProvider] Using configured discovery identity');
          return {
            pubKey: discoveryConfig.pubKeyOverride || discoveryConfig.profileId || this.nodeOneCore.ownerId || '',
            deviceId: this.instanceId,
            displayName: discoveryConfig.displayName || this.getDefaultDisplayName(),
          };
        }
      } catch (error) {
        console.warn('[DiscoveryIdentityProvider] Failed to read settings, using default:', error);
      }
    }

    // Fall back to default owner identity
    return this.getDefaultIdentity();
  }

  /**
   * Get configured pairing identity (personId) from settings
   * Returns undefined if not configured (uses myMainIdentity)
   */
  async getPairingIdentity(): Promise<string | undefined> {
    if (!this.userSettingsManager) {
      return undefined;
    }

    try {
      const settings = await this.userSettingsManager.getSettings();
      const discoveryConfig = (settings as any).device?.discoveryIdentity;

      // profileId maps to a Person ID for pairing
      return discoveryConfig?.profileId;
    } catch (error) {
      console.warn('[DiscoveryIdentityProvider] Failed to read pairing identity:', error);
      return undefined;
    }
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
