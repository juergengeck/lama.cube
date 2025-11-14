/**
 * Group Chat IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to GroupChatPlan methods.
 * Implements the 5-phase group chat establishment protocol with certificate-based access.
 *
 * Prerequisites: P2P connections must exist between all members before creating group
 *
 * See: connection.core/docs/GROUP-CHAT-CERTIFICATE-FLOW.md
 */

import type { IpcMainInvokeEvent } from 'electron';
import { GroupChatPlan, type GroupChatPlanDependencies } from '@lama/connection.core';
import nodeOneCore from '../../core/node-one-core.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { storeUnversionedObject, getObject as getUnversionedObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';

// Singleton handler instance
let groupChatHandler: GroupChatPlan | null = null;

/**
 * Grant read access to a hash for a person
 * Uses dynamic import to get access control API from ONE.core
 */
async function grantReadAccessWrapper(hash: any, personId: any): Promise<void> {
  try {
    // Dynamic import to match what the integration test does
    // @ts-expect-error - Module exists at runtime, TypeScript cannot resolve it statically
    const { grantReadAccess } = await import('@refinio/one.core/lib/access-control/access-control-api.js');
    await grantReadAccess(hash, personId);
  } catch (error) {
    console.error('[GroupChat] Failed to grant read access:', error);
    throw error;
  }
}

/**
 * Get GroupChatPlan handler instance (creates on first use)
 */
function getHandler(): GroupChatPlan {
  if (!groupChatHandler) {
    const deps: GroupChatPlanDependencies = {
      // ONE.core storage functions
      storeVersionedObject,
      storeUnversionedObject,
      getObjectByIdHash,
      calculateIdHashOfObj,

      // Access control
      grantReadAccess: grantReadAccessWrapper,

      // Leute model for trust and identity
      leuteModel: {
        myMainIdentity: async () => nodeOneCore.leuteModel.myMainIdentity(),
        others: async () => {
          const others = await nodeOneCore.leuteModel.others();
          // Convert SomeoneModel[] to SHA256IdHash<Person>[] by extracting person IDs
          return others.map((someone: any) => someone.personId) as any[];
        },
        trust: {
          certify: (certType: 'AffirmationCertificate', params: any) => nodeOneCore.leuteModel.trust.certify(certType, params),
          isAffirmedBy: (hash: any, affirmerId: any) => nodeOneCore.leuteModel.trust.isAffirmedBy(hash, affirmerId),
          affirmedBy: (hash: any) => nodeOneCore.leuteModel.trust.affirmedBy(hash),
          refreshCaches: () => nodeOneCore.leuteModel.trust.refreshCaches()
        }
      },

      // Channel manager for group chat channels
      channelManager: {
        getOrCreateChannel: async (channelId: string, owner: any) => {
          // Get existing channels
          const existingChannels = await nodeOneCore.channelManager.channels();
          const existing = existingChannels.find((ch: any) => ch.id === channelId && ch.owner === owner);
          if (existing) return existing;
          // Create new channel
          return nodeOneCore.channelManager.createChannel(channelId, owner);
        },
        postToChannel: (topicId: string, message: any, owner?: any) =>
          nodeOneCore.channelManager.postToChannel(topicId, message, owner)
      }
    };

    groupChatHandler = new GroupChatPlan(deps);
  }

  return groupChatHandler;
}

/**
 * Create group with attestation certificate
 *
 * Phase 2 of group chat establishment.
 * Does NOT distribute yet - use distributeGroup() separately.
 *
 * @param event - IPC event
 * @param groupName - Name of the group
 * @param memberPersonIds - All members (including creator)
 * @returns Group metadata and certificate hashes
 */
async function createGroup(
  event: IpcMainInvokeEvent,
  groupName: string,
  memberPersonIds: string[]
) {
  const handler = getHandler();
  // Cast string[] to SHA256IdHash<Person>[] (IPC layer works with strings)
  return await handler.createGroup(groupName, memberPersonIds as any);
}

/**
 * Distribute group and certificate to all members
 *
 * Phase 3 of group chat establishment.
 * Grants access so certificate syncs via P2P CHUM.
 *
 * @param event - IPC event
 * @param groupResult - Result from createGroup()
 * @param memberPersonIds - All members to grant access
 */
async function distributeGroup(
  event: IpcMainInvokeEvent,
  groupResult: any,
  memberPersonIds: string[]
) {
  const handler = getHandler();
  // Cast string[] to SHA256IdHash<Person>[] (IPC layer works with strings)
  await handler.distributeGroup(groupResult, memberPersonIds as any);
  return { success: true };
}

/**
 * Initialize complete group chat (high-level orchestrator)
 *
 * Orchestrates full group chat setup:
 * - Creates group with attestation
 * - Distributes certificates via P2P
 * - Sets up topic and channels
 * - Optionally sends welcome message
 *
 * Prerequisites: P2P connections must already exist
 *
 * @param event - IPC event
 * @param options - Group chat initialization options
 * @returns Group metadata and topic info
 */
async function initializeGroupChat(
  event: IpcMainInvokeEvent,
  options: {
    groupName: string;
    memberPersonIds: string[];
    topicId?: string;
    sendWelcomeMessage?: boolean;
  }
) {
  const handler = getHandler();
  // Cast string[] to SHA256IdHash<Person>[] (IPC layer works with strings)
  return await handler.initializeGroupChat({
    ...options,
    memberPersonIds: options.memberPersonIds as any
  });
}

/**
 * Join an existing group chat
 *
 * Called by non-creator members after receiving group.
 * Prerequisites:
 * - P2P connection with creator exists
 * - Certificate has synced via P2P CHUM
 * - Group object has synced
 *
 * @param event - IPC event
 * @param options - Join options
 * @returns Join result with group info
 */
async function joinGroupChat(
  event: IpcMainInvokeEvent,
  options: {
    groupIdHash: string;
    topicId: string;
    waitForSync?: boolean;
    syncTimeout?: number;
  }
) {
  const handler = getHandler();
  // Cast string to SHA256IdHash (IPC layer works with strings)
  return await handler.joinGroupChat({
    ...options,
    groupIdHash: options.groupIdHash as any
  });
}

/**
 * Wait for group to sync to local storage
 *
 * Polls for group object with timeout.
 *
 * @param event - IPC event
 * @param groupIdHash - Group ID hash to wait for
 * @param timeoutMs - Maximum wait time (default: 15000ms)
 * @returns Whether group is present
 */
async function waitForGroupSync(
  event: IpcMainInvokeEvent,
  groupIdHash: string,
  timeoutMs: number = 15000
) {
  const handler = getHandler();
  // Cast string to SHA256IdHash (IPC layer works with strings)
  const synced = await handler.waitForGroupSync(groupIdHash as any, timeoutMs);
  return { synced };
}

/**
 * Validate group certificate
 *
 * Checks if a group is affirmed by a trusted person.
 *
 * @param event - IPC event
 * @param groupIdHash - Group ID hash to validate
 * @returns Whether group has valid certificate
 */
async function validateGroupCertificate(
  event: IpcMainInvokeEvent,
  groupIdHash: string
) {
  const handler = getHandler();
  // Cast string to SHA256IdHash (IPC layer works with strings)
  const valid = await handler.validateGroupCertificate(groupIdHash as any);
  return { valid };
}

/**
 * Check if group has synced
 *
 * @param event - IPC event
 * @param groupIdHash - Group ID hash to check
 * @returns Whether group is present
 */
async function hasGroup(
  event: IpcMainInvokeEvent,
  groupIdHash: string
) {
  const handler = getHandler();
  // Cast string to SHA256IdHash (IPC layer works with strings)
  const has = await handler.hasGroup(groupIdHash as any);
  return { hasGroup: has };
}

/**
 * Get group object
 *
 * @param event - IPC event
 * @param groupIdHash - Group ID hash
 * @returns Group object or null
 */
async function getGroup(
  event: IpcMainInvokeEvent,
  groupIdHash: string
) {
  const handler = getHandler();
  // Cast string to SHA256IdHash (IPC layer works with strings)
  const group = await handler.getGroup(groupIdHash as any);
  return { group };
}

/**
 * Get HashGroup members for a group
 *
 * @param event - IPC event
 * @param hashGroupHash - HashGroup hash from Group object
 * @returns Member person IDs
 */
async function getGroupMembers(
  event: IpcMainInvokeEvent,
  hashGroupHash: string
) {
  try {
    // Cast string to SHA256Hash (IPC layer works with strings)
    const hashGroup: any = await getUnversionedObject(hashGroupHash as any);
    return {
      memberPersonIds: hashGroup.person || []
    };
  } catch (error: any) {
    console.error('[GroupChat] Failed to get group members:', error);
    throw new Error(`Failed to get group members: ${error.message}`);
  }
}

export default {
  createGroup,
  distributeGroup,
  initializeGroupChat,
  joinGroupChat,
  waitForGroupSync,
  validateGroupCertificate,
  hasGroup,
  getGroup,
  getGroupMembers
};
