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
import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Group, HashGroup, Person } from '@refinio/one.core/lib/recipes.js';
import { GroupChatPlan, type GroupChatPlanDependencies } from '@refinio/connection.core';
import nodeOneCore from '../../core/node-one-core.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { storeUnversionedObject, getObject as getUnversionedObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import { createAccess } from '@refinio/one.core/lib/access.js';

// Singleton handler instance
let groupChatHandler: GroupChatPlan | null = null;
let groupChatEpoch = -1;

/**
 * @deprecated No-op: plan cache invalidates automatically via initEpoch
 */
export function resetGroupChatPlanSingleton(): void {}

/**
 * Grant read access to a hash for a person
 * Uses ONE.core's createAccess to create Access objects
 */
async function grantReadAccessWrapper(hash: SHA256Hash, personId: SHA256IdHash<Person>): Promise<void> {
  try {
    await createAccess([{
      object: hash,
      person: [personId],
      hashGroup: [],
      mode: 'add' as const
    }]);
  } catch (error) {
    console.error('[GroupChat] Failed to grant read access:', error);
    throw error;
  }
}

/**
 * Get GroupChatPlan handler instance (creates on first use)
 */
function getHandler(): GroupChatPlan {
  if (!groupChatHandler || groupChatEpoch !== nodeOneCore.initEpoch) {
    groupChatHandler = null;
    const deps: GroupChatPlanDependencies = {
      // ONE.core storage functions
      storeVersionedObject,
      storeUnversionedObject,
      getObjectByIdHash,
      getObjectByHash: getObject,
      calculateIdHashOfObj,

      // Access control
      grantReadAccess: grantReadAccessWrapper,

      // Leute model for trust and identity
      leuteModel: {
        myMainIdentity: async () => nodeOneCore.leuteModel.myMainIdentity(),
        others: async () => {
          const others = await nodeOneCore.leuteModel.others();
          // Convert SomeoneModel[] to SHA256IdHash<Person>[] by extracting person IDs
          return others.map((someone: any) => someone.personId) as SHA256IdHash<Person>[];
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
          // P2P channels have null owner
          // Owned channels have owner set
          let participantsHash: any;
          let participants: any[];

          if (!owner) {
            // P2P channel - channelId is participantsHash (HashGroup hash)
            participantsHash = channelId;
            // Get participants directly from the HashGroup
            const hashGroup = await getObject(channelId as SHA256Hash<HashGroup<Person>>);
            participants = hashGroup?.person ? Array.from(hashGroup.person) : [];
          } else {
            // Owned channel
            participants = [owner];
            const hashGroup = {
              $type$: 'HashGroup' as const,
              person: new Set(participants)
            };
            const result = await storeUnversionedObject(hashGroup);
            participantsHash = result.hash;
          }

          // Get existing channels by participants
          const existingChannels = await nodeOneCore.channelManager.getMatchingChannelInfos({
            participants: participantsHash,
            owner: owner
          });
          if (existingChannels && existingChannels.length > 0) {
            return existingChannels[0];
          }
          // Create new channel with participants array
          return nodeOneCore.channelManager.createChannel(participants, owner);
        },
        postToChannel: (participantsHash: any, message: any, owner?: any) =>
          nodeOneCore.channelManager.postToChannel(participantsHash, message, owner)
      }
    };

    groupChatHandler = new GroupChatPlan(deps);
    groupChatEpoch = nodeOneCore.initEpoch;
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
  return await handler.createGroup(groupName, memberPersonIds as unknown as SHA256Hash<HashGroup<Person>>);
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
  await handler.distributeGroup(groupResult, memberPersonIds as SHA256IdHash<Person>[]);
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
    memberPersonIds: options.memberPersonIds as SHA256IdHash<Person>[]
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
    groupIdHash: options.groupIdHash as SHA256IdHash<Group>
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
  const synced = await handler.waitForGroupSync(groupIdHash as SHA256IdHash<Group>, timeoutMs);
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
  const valid = await handler.validateGroupCertificate(groupIdHash as SHA256IdHash<Group>);
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
  const has = await handler.hasGroup(groupIdHash as SHA256IdHash<Group>);
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
  const group = await handler.getGroup(groupIdHash as SHA256IdHash<Group>);
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
    const hashGroup = await getUnversionedObject(hashGroupHash as SHA256Hash<HashGroup<Person>>) as HashGroup<Person>;
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
