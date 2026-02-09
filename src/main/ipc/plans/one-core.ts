/**
 * ONE.core IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to service and handler methods.
 * Business logic distributed across:
 * - @refinio/chat.core/services/* (ContactService, ProfileService)
 * - @refinio/one.core/* (Native ONE.core storage)
 * - ./main/handlers/* (NodePlatformHandler)
 */

import { ContactService } from '@refinio/chat.core/services/ContactService.js';
import { ProfileService } from '@refinio/chat.core/services/ProfileService.js';
import { NodePlatformHandler } from '../../handlers/NodePlatformHandler.js';
import nodeOneCore from '../../core/node-one-core.js';
import stateManager from '../../state/manager.js';
import chumSettings from '../../services/chum-settings.js';
import credentialsManager from '../../services/credentials-manager.js';
import { clearAppDataShared } from '../../utils/clear-app-data.js';
import nodeProvisioning from '../../services/node-provisioning.js';
import { SettingsStore } from '@refinio/one.core/lib/system/settings-store.js';
import { CubeDiscoveryIdentityProvider } from '../../core/discovery-identity-provider.js';
import type { IpcMainInvokeEvent } from 'electron';

// Epoch-aware: automatically recreated when nodeOneCore re-initializes
let contactService: ContactService | null = null;
let profileService: ProfileService | null = null;
let oneCoreEpoch = -1;

/** @deprecated No-op: plan cache invalidates automatically via initEpoch */
export function resetOneCorePlanSingletons(): void {}

// Platform handler can be created immediately (doesn't depend on models)
const platformHandler = new NodePlatformHandler(
  nodeOneCore,
  stateManager,
  chumSettings,
  credentialsManager
);

/**
 * Get ContactService instance - creates on first use after NodeOneCore init
 */
function getContactService(): ContactService {
  if (!nodeOneCore.leuteModel) {
    throw new Error('NodeOneCore not initialized - leuteModel is null');
  }
  if (!contactService || oneCoreEpoch !== nodeOneCore.initEpoch) {
    contactService = new ContactService(
      nodeOneCore.leuteModel,
      nodeOneCore.aiAssistantModel
    );
    profileService = null; // invalidate together
    oneCoreEpoch = nodeOneCore.initEpoch;
  }
  return contactService;
}

export function getProfileService(): ProfileService {
  if (!nodeOneCore.leuteModel) {
    throw new Error('NodeOneCore not initialized - leuteModel is null');
  }
  if (!profileService || oneCoreEpoch !== nodeOneCore.initEpoch) {
    profileService = new ProfileService(nodeOneCore.leuteModel);
    oneCoreEpoch = nodeOneCore.initEpoch;
  }
  return profileService;
}


// Export function to invalidate cache when contacts change
export function invalidateContactsCache(): void {
  getContactService().invalidateContactsCache();
}

/**
 * Thin IPC adapter - maps ipcMain.handle() calls to handler methods
 */
const oneCoreHandlers = {
  /**
   * Initialize Node.js ONE.core instance
   * Platform-specific: Uses nodeProvisioning from lama.electron
   */
  async initializeNode(event: IpcMainInvokeEvent, params: any) {
    const { name, password } = params.user || params;
    const t0 = performance.now();
    console.log('[OneCoreElectronHandler] ⏱️ IPC initializeNode received at', t0.toFixed(1), 'ms');
    console.log('[OneCoreElectronHandler] Initialize Node.js ONE.core instance:', name);

    try {
      const result = await nodeProvisioning.provision({
        user: { name, password }
      });
      const t1 = performance.now();
      console.log('[OneCoreElectronHandler] ⏱️ IPC initializeNode completed after', (t1-t0).toFixed(1), 'ms');
      return result;
    } catch (error) {
      console.error('[OneCoreElectronHandler] Failed to initialize Node:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  /**
   * Create local invite for browser connection
   */
  async createLocalInvite(event: IpcMainInvokeEvent, options: any = {}) {
    return await platformHandler.createLocalInvite(options);
  },

  /**
   * Create pairing invitation for browser instance
   */
  async createBrowserPairingInvite(event: IpcMainInvokeEvent) {
    return await platformHandler.createBrowserPairingInvite();
  },

  /**
   * Get stored browser pairing invitation
   */
  async getBrowserPairingInvite(event: IpcMainInvokeEvent) {
    return await platformHandler.getBrowserPairingInvite();
  },

  /**
   * Create network invite for remote connections
   */
  async createNetworkInvite(event: IpcMainInvokeEvent, options: any = {}) {
    return await platformHandler.createNetworkInvite(options);
  },

  /**
   * List all active invites
   */
  async listInvites(event: IpcMainInvokeEvent) {
    return await platformHandler.listInvites();
  },

  /**
   * Revoke an invite
   */
  async revokeInvite(event: IpcMainInvokeEvent, { inviteId }: { inviteId: string }) {
    return await platformHandler.revokeInvite(inviteId);
  },

  /**
   * Get Node instance status
   */
  async getNodeStatus(event: IpcMainInvokeEvent) {
    return await platformHandler.getNodeStatus();
  },

  /**
   * Set Node instance configuration state
   */
  async setNodeState(event: IpcMainInvokeEvent, params: { key: string; value: any }) {
    return await platformHandler.setNodeState(params);
  },

  /**
   * Get Node instance configuration state
   */
  async getNodeState(event: IpcMainInvokeEvent, params: { key: string }) {
    return await platformHandler.getNodeState(params);
  },

  /**
   * Get Node instance full configuration
   */
  async getNodeConfig(event: IpcMainInvokeEvent) {
    return await platformHandler.getNodeConfig();
  },

  /**
   * Get contacts from Node.js ONE.core instance
   */
  async getContacts(event?: IpcMainInvokeEvent) {
    try {
      const contacts = await getContactService().getContacts();

      // Enrich with AI/LLM flags
      const enrichedContacts = contacts.map((contact: any) => {
        const isAI = nodeOneCore.aiAssistantModel?.isAIPerson(contact.id) || false;
        return {
          ...contact,
          isAI,
          isLLM: isAI  // Backward compatibility
        };
      });

      return { success: true, contacts: enrichedContacts };
    } catch (error) {
      // Handle race condition where leuteModel isn't initialized yet
      if (error instanceof Error && error.message.includes('state machine')) {
        console.warn('[OneCoreIPC] getContacts called before leuteModel initialized, returning empty array');
        return { success: true, contacts: [] };
      }
      throw error;
    }
  },

  /**
   * Test settings replication with credentials
   */
  async testSettingsReplication(event: IpcMainInvokeEvent, params: { category: string; data: any }) {
    return await platformHandler.testSettingsReplication(params.category, params.data);
  },

  /**
   * Sync connection settings to peers
   */
  async syncConnectionSettings(event: IpcMainInvokeEvent, connectionSettings: any) {
    return await platformHandler.syncConnectionSettings(connectionSettings);
  },

  /**
   * Get credentials status and trust information
   */
  async getCredentialsStatus(event: IpcMainInvokeEvent) {
    return await platformHandler.getCredentialsStatus();
  },

  /**
   * Get shared credentials for browser IoM setup
   */
  async getBrowserCredentials(event: IpcMainInvokeEvent) {
    return await platformHandler.getBrowserCredentials();
  },

  /**
   * Get list of connected peers
   */
  async getPeerList(event: IpcMainInvokeEvent) {
    return await getContactService().getPeerList();
  },

  /**
   * Store data securely using ONE.core SettingsStore
   */
  async secureStore(event: IpcMainInvokeEvent, params: { key: string; value: any; encrypted?: boolean }) {
    console.log(`[OneCoreHandler] secureStore: ${params.key}`);

    try {
      await SettingsStore.setItem(params.key, params.value);
      console.log(`[OneCoreHandler] Stored ${params.key} in SettingsStore`);

      return {
        success: true,
        data: { stored: true }
      };
    } catch (error) {
      console.error('[OneCoreHandler] secureStore error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  /**
   * Retrieve data from ONE.core SettingsStore
   */
  async secureRetrieve(event: IpcMainInvokeEvent, params: { key: string }) {
    console.log(`[OneCoreHandler] secureRetrieve: ${params.key}`);

    try {
      const value = await SettingsStore.getItem(params.key);

      if (value !== null && value !== undefined) {
        console.log(`[OneCoreHandler] Found ${params.key} in SettingsStore`);
        return { success: true, value };
      }

      console.log(`[OneCoreHandler] ${params.key} not found in SettingsStore`);
      return { success: false, error: 'Key not found' };
    } catch (error) {
      console.error('[OneCoreHandler] secureRetrieve error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  /**
   * Clear storage
   */
  async clearStorage(event: IpcMainInvokeEvent) {
    return await platformHandler.clearStorage(clearAppDataShared);
  },

  /**
   * Restart Node.js ONE.core instance
   */
  async restartNode(event: IpcMainInvokeEvent) {
    return await platformHandler.restartNode();
  },

  /**
   * Get user's current mood
   */
  async getMood(event: IpcMainInvokeEvent) {
    const me = await nodeOneCore.leuteModel.me();
    const personId = await me.mainIdentity();
    const data = await getProfileService().getMood(personId);
    return data;
  },

  /**
   * Update user's mood
   */
  async updateMood(event: IpcMainInvokeEvent, params: { mood: string }) {
    const me = await nodeOneCore.leuteModel.me();
    const personId = await me.mainIdentity();
    const data = await getProfileService().updateMood(personId, params.mood);
    return { success: true, data };
  },

  /**
   * Check if the current user has a PersonName set in their profile
   */
  async hasPersonName(event: IpcMainInvokeEvent) {
    const me = await nodeOneCore.leuteModel.me();
    const personId = await me.mainIdentity();
    const result = await getProfileService().hasPersonName(personId);
    return { success: true, ...result };
  },

  /**
   * Set PersonName for the current user's profile
   */
  async setPersonName(event: IpcMainInvokeEvent, params: { name: string }) {
    const me = await nodeOneCore.leuteModel.me();
    const personId = await me.mainIdentity();
    await getProfileService().setPersonName(personId, params.name);

    // Update mDNS discovery display name
    nodeOneCore.updateDiscoveryDisplayName(params.name);

    return { success: true, data: { name: params.name } };
  },

  /**
   * Get owner ID (main identity of current user)
   */
  async getOwnerId(event: IpcMainInvokeEvent) {
    if (!nodeOneCore.leuteModel) {
      throw new Error('NodeOneCore not initialized - leuteModel is null');
    }

    try {
      const me = await nodeOneCore.leuteModel.me();
      const ownerId = await me.mainIdentity();
      return { success: true, ownerId };
    } catch (error) {
      console.error('[OneCoreHandler] getOwnerId error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  /**
   * Get my profile info (for Settings page)
   */
  async getMyProfile(event: IpcMainInvokeEvent) {
    if (!nodeOneCore.leuteModel) {
      throw new Error('NodeOneCore not initialized - leuteModel is null');
    }

    try {
      const me = await nodeOneCore.leuteModel.me();
      const personId = await me.mainIdentity();
      const nameResult = await getProfileService().hasPersonName(personId);
      const displayName = nameResult?.name || '';

      // Get public key from discovery identity provider
      let publicKey = '';
      try {
        const provider = new CubeDiscoveryIdentityProvider({
          nodeOneCore,
          instanceId: nodeOneCore.instanceId || 'unknown',
          devicePlan: nodeOneCore.devicePlan,
          localDeviceIdHash: nodeOneCore.localDeviceIdHash,
        });
        const identity = await provider.getDiscoveryIdentity();
        publicKey = identity.pubKey || '';
      } catch (e) {
        console.error('[OneCoreHandler] Failed to get public key:', e);
      }

      return {
        success: true,
        data: {
          displayName,
          publicKey
        }
      };
    } catch (error) {
      console.error('[OneCoreHandler] getMyProfile error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
};

export default oneCoreHandlers;
