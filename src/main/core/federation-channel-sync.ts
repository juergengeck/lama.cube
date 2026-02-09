import type { ChannelManager } from '@refinio/one.models/lib/models/index.js';
/**
 * Federation Channel Sync Helper
 * Ensures channels are properly shared between browser and Node instances
 */

import { createAccess } from '@refinio/one.core/lib/access.js';
import { SET_ACCESS_MODE } from '@refinio/one.core/lib/storage-base-common.js';
import { storeUnversionedObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import type { SHA256IdHash, SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person, HashGroup } from '@refinio/one.core/lib/recipes.js';

/**
 * Helper to get participantsHash for a set of person IDs
 */
async function getParticipantsHash(participants: SHA256IdHash<Person>[]): Promise<SHA256Hash<HashGroup<Person>>> {
  const hashGroup: HashGroup<Person> = {
    $type$: 'HashGroup',
    person: new Set(participants)
  };
  const result = await storeUnversionedObject(hashGroup);

  // Grant access to the HashGroup object itself so it can sync via CHUM
  await createAccess([{
    object: result.hash,
    person: [],
    hashGroup: [result.hash],
    mode: SET_ACCESS_MODE.ADD
  }]);

  return result.hash;
}

/**
 * Grant federation access to a channel so both browser and Node can sync
 * @param {string} channelInfoIdHash - The channel info ID hash
 * @param {Array} federationGroupIds - Group IDs that should have access
 */
export async function grantFederationAccessToChannel(channelInfoIdHash: any, federationGroupIds: any): Promise<any> {
  try {
    console.log('[FederationChannelSync] Granting federation access to channel:', String(channelInfoIdHash).substring(0, 8))

    // Grant access to all federation groups
    await createAccess([{
      id: channelInfoIdHash,
      person: [],
      hashGroup: federationGroupIds,
      mode: SET_ACCESS_MODE.ADD
    }])

    console.log('[FederationChannelSync] Access granted to federation groups:', federationGroupIds.length)
    return true
  } catch (error) {
    console.error('[FederationChannelSync] Failed to grant federation access:', error)
    return false
  }
}

/**
 * Ensure a channel exists and has proper federation access
 * This should be called by both browser and Node when creating channels
 * @param channelManager - The channel manager
 * @param participants - Array of participant person IDs
 * @param ownerId - The owner of the channel (null for P2P shared channels)
 * @param federationGroup - Optional federation group for access control
 */
export async function ensureFederatedChannel(channelManager: any, participants: SHA256IdHash<Person>[], ownerId: SHA256IdHash<Person> | null, federationGroup: any): Promise<any> {
  try {
    // Get participantsHash for query
    const participantsHash = await getParticipantsHash(participants)

    // Check if channel exists
    const existingChannels = await channelManager.getMatchingChannelInfos({
      participants: participantsHash
    })

    if (existingChannels && existingChannels.length > 0) {
      console.log('[FederationChannelSync] Channel already exists for participants:', participantsHash.substring(0, 8))

      // Ensure federation access is granted
      if (federationGroup) {
        for (const channelInfo of existingChannels) {
          await grantFederationAccessToChannel(
            channelInfo.channelInfoIdHash,
            [federationGroup.groupIdHash]
          )
        }
      }

      return existingChannels[0]
    }

    // Create the channel
    console.log('[FederationChannelSync] Creating federated channel for participants:', participantsHash.substring(0, 8))
    const channelResult = await channelManager.createChannel(participants, ownerId)

    // Grant federation access
    if (federationGroup) {
      await grantFederationAccessToChannel(
        channelResult.channelInfoIdHash,
        [federationGroup.groupIdHash]
      )
    }

    // Return the created channel info
    const channels = await channelManager.getMatchingChannelInfos({
      participants: channelResult.participantsHash
    })

    return channels[0]
  } catch (error) {
    console.error('[FederationChannelSync] Failed to ensure federated channel:', error)
    throw error
  }
}

/**
 * Set up channel sync listeners between browser and Node
 * This ensures both instances react to channel updates
 */
export function setupChannelSyncListeners(channelManager: any, instanceName: any, onChannelUpdate: any): any {
  console.log(`[FederationChannelSync] Setting up sync listeners for ${instanceName}`)

  // Listen for channel updates
  // New callback signature: (channelInfoIdHash, participantsHash, channelOwner, time, data)
  channelManager.onUpdated(async (channelInfoIdHash: any, participantsHash: any, channelOwner: any, timeOfEarliestChange: any, data: any) => {
    console.log(`[FederationChannelSync][${instanceName}] Channel updated, participants:`, participantsHash?.substring(0, 8))
    console.log(`[FederationChannelSync][${instanceName}] Data items:`, data.length)

    // Check for ChatMessage objects
    const chatMessages = data.filter((item: any) => item.$type$ === 'ChatMessage')
    if (chatMessages.length > 0) {
      console.log(`[FederationChannelSync][${instanceName}] Found ${chatMessages.length} chat messages`)

      // Notify about new messages (use participantsHash as channel identifier)
      if (onChannelUpdate) {
        onChannelUpdate(participantsHash, chatMessages)
      }
    }
  })
}

export default {
  grantFederationAccessToChannel,
  ensureFederatedChannel,
  setupChannelSyncListeners
}