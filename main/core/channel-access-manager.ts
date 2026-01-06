import type { ChannelManager } from '@refinio/one.models/lib/models/index.js';
/**
 * Channel Access Manager
 * Manages granular person-to-person access control for channels
 */

import { createAccess } from '@refinio/one.core/lib/access.js';
import { SET_ACCESS_MODE } from '@refinio/one.core/lib/storage-base-common.js';
import { storeUnversionedObject, getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
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
  return result.hash;
}

/**
 * Grant a specific person access to a channel
 * @param channelInfoIdHash - The channel info ID hash
 * @param personId - The person to grant access to
 */
export async function grantChannelAccessToPerson(channelInfoIdHash: SHA256IdHash<any>, personId: SHA256IdHash<Person>): Promise<boolean> {
  try {
    console.log(`[ChannelAccess] Granting channel access to person ${personId?.substring(0, 8)}`)

    // Grant direct person-to-person access to ChannelInfo
    await createAccess([{
      id: channelInfoIdHash,
      person: [personId],
      hashGroup: [],
      mode: SET_ACCESS_MODE.ADD
    }])

    console.log(`[ChannelAccess] ✅ ChannelInfo access granted to person ${personId?.substring(0, 8)}`)
    return true
  } catch (error) {
    console.error('[ChannelAccess] Failed to grant access:', error)
    return false
  }
}

/**
 * Grant comprehensive access to a channel message
 * This includes the channelEntry, data, and creationTime objects
 */
export async function grantMessageAccessToPerson(channelEntry: any, personId: SHA256IdHash<Person>): Promise<boolean> {
  try {
    const accessGrants = []
    
    // Grant access to the channel entry itself
    if (channelEntry.channelEntryHash) {
      accessGrants.push({
        id: channelEntry.channelEntryHash,
        person: [personId],
        hashGroup: [],
        mode: SET_ACCESS_MODE.ADD
      })
    }

    // Grant access to the message data
    if (channelEntry.dataHash) {
      accessGrants.push({
        id: channelEntry.dataHash,
        person: [personId],
        hashGroup: [],
        mode: SET_ACCESS_MODE.ADD
      })
    }

    // Grant access to the creation time
    if (channelEntry.creationTimeHash) {
      accessGrants.push({
        id: channelEntry.creationTimeHash,
        person: [personId],
        hashGroup: [],
        mode: SET_ACCESS_MODE.ADD
      })
    }
    
    if (accessGrants.length > 0) {
      await createAccess(accessGrants)
      console.log(`[ChannelAccess] ✅ Granted access to message objects (${accessGrants.length} grants)`)
    }
    
    return true
  } catch (error) {
    console.error('[ChannelAccess] Failed to grant message access:', error)
    return false
  }
}

/**
 * Grant mutual access between two persons for a channel
 * Used for federation between browser and Node instances
 * @param channelInfoIdHash1 - Person 1's channel info ID hash
 * @param channelInfoIdHash2 - Person 2's channel info ID hash
 * @param person1Id - Person 1 ID
 * @param person2Id - Person 2 ID
 */
export async function grantMutualChannelAccess(channelInfoIdHash1: SHA256IdHash<any>, channelInfoIdHash2: SHA256IdHash<any>, person1Id: SHA256IdHash<Person>, person2Id: SHA256IdHash<Person>): Promise<boolean> {
  try {
    console.log(`[ChannelAccess] Setting up mutual access for channels`)
    console.log(`[ChannelAccess] Between ${person1Id?.substring(0, 8)} and ${person2Id?.substring(0, 8)}`)

    // Grant mutual access
    await createAccess([
      {
        id: channelInfoIdHash1,
        person: [person2Id], // Person 2 can access Person 1's channel
        hashGroup: [],
        mode: SET_ACCESS_MODE.ADD
      },
      {
        id: channelInfoIdHash2,
        person: [person1Id], // Person 1 can access Person 2's channel
        hashGroup: [],
        mode: SET_ACCESS_MODE.ADD
      }
    ])

    console.log('[ChannelAccess] ✅ Mutual access established')
    return true
  } catch (error) {
    console.error('[ChannelAccess] Failed to grant mutual access:', error)
    return false
  }
}

/**
 * Grant access to all channel entries for a person
 * This ensures they can read all messages in the channel
 * @param channelManager - The channel manager
 * @param participantsHash - The participants hash for the channel
 * @param personId - The person to grant access to
 */
export async function grantChannelEntryAccess(channelManager: any, participantsHash: SHA256Hash<any>, personId: SHA256IdHash<Person>): Promise<boolean> {
  try {
    const channelInfos = await channelManager.getMatchingChannelInfos({
      participants: participantsHash
    })

    if (!channelInfos || channelInfos.length === 0) {
      console.log('[ChannelAccess] No channel infos found')
      return false
    }

    for (const channelInfo of channelInfos) {
      if (channelInfo.obj?.data) {
        const accessRequests = []

        for (const entry of channelInfo.obj.data) {
          if (entry.dataHash) {
            accessRequests.push({
              object: entry.dataHash,
              person: [personId],
              hashGroup: [],
              mode: SET_ACCESS_MODE.ADD
            })
          }
        }

        if (accessRequests.length > 0) {
          await createAccess(accessRequests)
          console.log(`[ChannelAccess] Granted access to ${accessRequests.length} channel entries`)
        }
      }
    }

    return true
  } catch (error) {
    console.error('[ChannelAccess] Failed to grant entry access:', error)
    return false
  }
}

/**
 * Setup channel access when browser connects
 * Called when browser Person ID is received
 */
export async function setupBrowserNodeChannelAccess(nodeOwnerId: SHA256IdHash<Person>, browserPersonId: SHA256IdHash<Person>, channelManager: any): Promise<boolean> {
  try {
    console.log('[ChannelAccess] Setting up browser-node channel access')
    console.log(`[ChannelAccess] Node: ${nodeOwnerId?.substring(0, 8)}, Browser: ${browserPersonId?.substring(0, 8)}`)

    // Get all existing channels
    const channelInfos = await channelManager.channels()

    for (const channelInfo of channelInfos) {
      const channelOwner = channelInfo.owner
      const channelInfoIdHash = channelInfo.channelInfoIdHash || channelInfo.idHash

      // Grant access to browser for all Node's channels
      if (channelOwner === nodeOwnerId && channelInfoIdHash) {
        await grantChannelAccessToPerson(channelInfoIdHash, browserPersonId)
      }
    }

    console.log(`[ChannelAccess] ✅ Processed ${channelInfos.length} channels`)

    // Specifically ensure Node's app channel (personal channel) has proper access
    const nodeParticipantsHash = await getParticipantsHash([nodeOwnerId])
    const appChannelInfos = await channelManager.getMatchingChannelInfos({
      participants: nodeParticipantsHash
    })

    if (appChannelInfos.length > 0) {
      console.log('[ChannelAccess] Found app data channel, ensuring access...')
      for (const channelInfo of appChannelInfos) {
        const channelInfoIdHash = channelInfo.channelInfoIdHash || channelInfo.idHash
        if (channelInfoIdHash) {
          await grantChannelAccessToPerson(channelInfoIdHash, browserPersonId)
        }
      }
      console.log('[ChannelAccess] ✅ App data channel access configured')
    }

    // Note: Topic-specific channels are created by TopicGroupManager for each participant
    console.log('[ChannelAccess] Browser channels will be created per topic by TopicGroupManager')

    // Set up a listener for channel updates to trace CHUM sync
    // New callback signature: (channelInfoIdHash, participantsHash, owner, time, data)
    channelManager.onUpdated((channelInfoIdHash: any, participantsHash: any, owner: any, time: any, data: any) => {
      if (owner === browserPersonId) {
        console.log(`[ChannelAccess] 🔔 Node received update for browser's channel, participants: ${participantsHash?.substring(0, 8)}`)
        console.log('[ChannelAccess] Owner:', owner?.substring(0, 8))
        console.log('[ChannelAccess] Data items:', data?.length)
        console.log('[ChannelAccess] Has messages:', data?.some((d: any) => d.$type$ === 'ChatMessage'))

        // Log the actual messages for debugging
        const messages = data?.filter((d: any) => d.$type$ === 'ChatMessage')
        messages?.forEach((msg: any, idx: any) => {
          console.log(`[ChannelAccess] Message ${idx + 1}:`, msg.data?.text?.substring(0, 50))
        })
      }
    })

    return true
  } catch (error) {
    console.error('[ChannelAccess] Failed to setup browser-node access:', error)
    return false
  }
}

export default {
  grantChannelAccessToPerson,
  grantMessageAccessToPerson,
  grantMutualChannelAccess,
  grantChannelEntryAccess,
  setupBrowserNodeChannelAccess
}