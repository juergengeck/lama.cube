/**
 * ONE.core IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to service and handler methods.
 * Business logic distributed across:
 * - @chat/core/services/* (ContactService, ProfileService)
 * - @refinio/one.core/* (Native ONE.core storage)
 * - ./main/handlers/* (NodePlatformHandler)
 */

import { ContactService } from '@chat/core/services/ContactService.js';
import { ProfileService } from '@chat/core/services/ProfileService.js';
import { NodePlatformHandler } from '../../handlers/NodePlatformHandler.js';
import nodeOneCore from '../../core/node-one-core.js';
import stateManager from '../../state/manager.js';
import chumSettings from '../../services/chum-settings.js';
import credentialsManager from '../../services/credentials-manager.js';
import { clearAppDataShared } from '../../../lama-electron-shadcn.js';
import nodeProvisioning from '../../services/node-provisioning.js';
import type { IpcMainInvokeEvent } from 'electron';

// Lazy service instances - created after NodeOneCore is initialized
let contactService: ContactService | null = null;
let profileService: ProfileService | null = null;

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
  if (!contactService) {
    contactService = new ContactService(
      nodeOneCore.leuteModel,
      nodeOneCore.aiAssistantModel
    );
  }
  return contactService;
}

/**
 * Get ProfileService instance - creates on first use after NodeOneCore init
 */
function getProfileService(): ProfileService {
  if (!nodeOneCore.leuteModel) {
    throw new Error('NodeOneCore not initialized - leuteModel is null');
  }
  if (!profileService) {
    profileService = new ProfileService(nodeOneCore.leuteModel);
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
    console.log('[OneCoreElectronHandler] Initialize Node.js ONE.core instance:', name);

    try {
      const result = await nodeProvisioning.provision({
        user: { name, password }
      });
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
    const contacts = await getContactService().getContacts();
    return { success: true, contacts };
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
   * Store data securely using ONE.core versioned objects
   */
  async secureStore(event: IpcMainInvokeEvent, params: { key: string; value: any; encrypted?: boolean }) {
    console.log(`[OneCoreHandler] secureStore: ${params.key}`);

    try {
      if (params.key === 'claude_api_key') {
        // Store Claude API key as LLM object in ONE.core
        const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');

        const now = Date.now();
        const nowString = new Date(now).toISOString();

        const llmObj = {
          $type$: 'LLM' as const,
          name: 'claude',
          modelId: 'claude-api',
          provider: 'anthropic',
          filename: 'claude-api-config',
          modelType: 'remote' as const,
          baseUrl: 'https://api.anthropic.com',
          authType: 'bearer' as const,
          encryptedAuthToken: params.value,
          active: true,
          deleted: false,
          created: now,
          modified: now,
          createdAt: nowString,
          lastUsed: nowString
        };

        const result = await storeVersionedObject(llmObj);
        console.log(`[OneCoreHandler] Stored Claude API key with hash: ${result.hash}`);

        return {
          success: true,
          data: { stored: true, configHash: result.hash }
        };
      }

      throw new Error(`Unsupported secure storage key: ${params.key}`);
    } catch (error) {
      console.error('[OneCoreHandler] secureStore error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  /**
   * Retrieve data from ONE.core versioned objects
   */
  async secureRetrieve(event: IpcMainInvokeEvent, params: { key: string }) {
    console.log(`[OneCoreHandler] secureRetrieve: ${params.key}`);

    try {
      if (params.key === 'claude_api_key') {
        // Retrieve Claude API key from ONE.core LLM objects
        const iterator = nodeOneCore.channelManager.objectIteratorWithType('LLM', {
          channelId: 'lama'
        });

        for await (const llmObj of iterator) {
          if (llmObj?.data?.name === 'claude' && llmObj.data.active && !llmObj.data.deleted) {
            const apiKey = llmObj.data.encryptedAuthToken;
            return { success: true, value: apiKey };
          }
        }

        throw new Error('API key not found');
      }

      throw new Error(`Unsupported secure storage key: ${params.key}`);
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
    return { success: true, data: { name: params.name } };
  }
};

export default oneCoreHandlers;
