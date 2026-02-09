/**
 * CubeDiscoveryIdentityProvider - Provides discovery identity from user settings
 *
 * Implements DiscoveryIdentityProvider to supply identity for discovery broadcasts.
 * Users can configure which identity to present via DeviceSettings.discoveryIdentity.
 *
 * Default behavior: uses instance owner's identity if not configured.
 */

import type { DiscoveryIdentityProvider, DiscoveryIdentity } from '@refinio/connection.core';
import { createCryptoApiFromDefaultKeys } from '@refinio/one.core/lib/keychain/keychain.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type nodeOneCore from './node-one-core.js';
import type { SettingsPlan } from '@refinio/settings.core';
import type { DevicePlan } from '@refinio/device.core';

type NodeOneCore = typeof nodeOneCore;

export interface CubeDiscoveryIdentityProviderDeps {
  /** ONE.core node instance */
  nodeOneCore: NodeOneCore;
  /** Instance ID (from ONE.core) */
  instanceId: string;
  /** Settings plan for reading discoveryIdentity config */
  settingsPlan?: SettingsPlan;
  /** DevicePlan for reading Device.displayName */
  devicePlan?: DevicePlan;
  /** Local device ID hash for fetching current device */
  localDeviceIdHash?: string;
}

export class CubeDiscoveryIdentityProvider implements DiscoveryIdentityProvider {
  private nodeOneCore: NodeOneCore;
  private instanceId: string;
  private settingsPlan?: SettingsPlan;
  private devicePlan?: DevicePlan;
  private localDeviceIdHash?: string;
  private changeCallbacks: ((identity: DiscoveryIdentity) => void)[] = [];

  constructor(deps: CubeDiscoveryIdentityProviderDeps) {
    this.nodeOneCore = deps.nodeOneCore;
    this.instanceId = deps.instanceId;
    this.settingsPlan = deps.settingsPlan;
    this.devicePlan = deps.devicePlan;
    this.localDeviceIdHash = deps.localDeviceIdHash;
  }

  /**
   * Set settings plan after construction (for lazy initialization)
   */
  setSettingsPlan(plan: SettingsPlan): void {
    this.settingsPlan = plan;
  }

  /**
   * Set device plan and ID hash after construction (for lazy initialization)
   */
  setDevicePlan(plan: DevicePlan, localDeviceIdHash: string): void {
    this.devicePlan = plan;
    this.localDeviceIdHash = localDeviceIdHash;
  }

  /**
   * Get current discovery identity based on user settings
   *
   * Checks DeviceSettings.discoveryIdentity for configured identity.
   * Falls back to owner identity if not configured.
   */
  async getDiscoveryIdentity(): Promise<DiscoveryIdentity> {
    // Check settings for configured discovery identity
    if (this.settingsPlan?.getSection) {
      try {
        const response = await this.settingsPlan.getSection({ moduleId: 'device' });
        const discoveryConfig = (response.values as any)?.discoveryIdentity;

        if (discoveryConfig) {
          console.log('[DiscoveryIdentityProvider] Using configured discovery identity');
          const pubKey = discoveryConfig.pubKeyOverride || await this.getOwnerPublicKey();
          return {
            pubKey,
            deviceId: this.instanceId,
            displayName: discoveryConfig.displayName || await this.getDefaultDisplayName(),
          };
        }
      } catch (error) {
        console.warn('[DiscoveryIdentityProvider] Failed to read settings, using default:', error);
      }
    }

    // Fall back to default owner identity
    return await this.getDefaultIdentity();
  }

  /**
   * Get configured pairing identity (personId) from settings
   * Returns undefined if not configured (uses myMainIdentity)
   */
  async getPairingIdentity(): Promise<string | undefined> {
    if (!this.settingsPlan?.getSection) {
      return undefined;
    }

    try {
      const response = await this.settingsPlan.getSection({ moduleId: 'device' });
      const discoveryConfig = (response.values as any)?.discoveryIdentity;

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
   * Get the actual Ed25519 public sign key for the owner.
   * This is the real cryptographic key, not the person hash.
   */
  private async getOwnerPublicKey(): Promise<string> {
    const ownerId = this.nodeOneCore.ownerId;
    if (!ownerId) {
      return '';
    }

    try {
      const cryptoApi = await createCryptoApiFromDefaultKeys(ownerId as SHA256IdHash<Person>);
      return Buffer.from(cryptoApi.publicSignKey).toString('hex');
    } catch (error) {
      console.warn('[DiscoveryIdentityProvider] Failed to get public key, falling back to ownerId:', error);
      return ownerId;
    }
  }

  /**
   * Get default identity using the real Ed25519 public key
   */
  private async getDefaultIdentity(): Promise<DiscoveryIdentity> {
    const pubKey = await this.getOwnerPublicKey();
    return {
      pubKey,
      deviceId: this.instanceId,
      displayName: await this.getDefaultDisplayName(),
    };
  }

  /**
   * Get default display name from Device.displayName (single source of truth)
   */
  private async getDefaultDisplayName(): Promise<string> {
    // Try to get from Device.displayName (the single source of truth)
    if (this.devicePlan && this.localDeviceIdHash) {
      try {
        const result = await this.devicePlan.getDeviceWithNetworkInfo(this.localDeviceIdHash as SHA256IdHash<any>);
        if (result.success && result.device?.displayName) {
          return result.device.displayName;
        }
      } catch (error) {
        console.warn('[DiscoveryIdentityProvider] Failed to get Device.displayName:', error);
      }
    }
    // Fallback to instanceName or default
    return this.nodeOneCore.instanceName || 'LAMA Device';
  }
}
