import type { ChannelManager } from '@refinio/one.models/lib/models/index.js';
import { createAccess } from '@refinio/one.core/lib/access.js';
import { SET_ACCESS_MODE } from '@refinio/one.core/lib/storage-base-common.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import { ensureHash } from '@refinio/one.core/lib/util/type-checks.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
/**
 * Direct Access Rights Granting
 * Simply grants access to key objects for sync
 */

async function grantAccessRights(nodeOneCore: any, targetPersonId: any): Promise<any> {
  console.log('[GrantAccess] Granting access rights to:', targetPersonId?.substring(0, 8) + '...')
  
  // 1. Grant access to the Leute object itself
  try {
    const leuteId = await calculateIdHashOfObj({
      $type$: 'Access' as const,
      object: ensureHash('one.leute')
    })
    
    await createAccess([{
      id: leuteId,
      person: [targetPersonId],
      hashGroup: [],
      mode: SET_ACCESS_MODE.ADD
    }])
    
    console.log('[GrantAccess] ✅ Granted access to Leute object')
  } catch (error) {
    console.warn('[GrantAccess] Failed to grant Leute access:', (error as Error).message)
  }
  
  // 2. DO NOT grant access to all Someone objects (contacts)
  // Contacts are private - a new peer should NOT see all your other contacts
  // They only need access to: their own P2P channel and your profile

  // 3. Grant access to channels WHERE TARGET IS A PARTICIPANT (not all channels)
  if (nodeOneCore.channelManager) {
    try {
      const channels = await nodeOneCore.channelManager.getAllChannelInfos()
      console.log(`[GrantAccess] Checking ${(channels as any).length} channels for participant access...`)

      let grantedCount = 0
      for (const channel of channels) {
        // Get participants from HashGroup to check if target is a participant
        const participantsHash = channel.participants || channel.participantsHash
        if (!participantsHash) {
          continue
        }

        try {
          const hashGroup = await getObject(participantsHash) as { person?: string[] }
          if (!hashGroup?.person) {
            continue
          }

          // Check if target is a participant of this channel
          const participantIds = new Set(hashGroup.person)
          if (!participantIds.has(targetPersonId)) {
            // Target is NOT a participant - skip this channel
            continue
          }

          // Target IS a participant - grant access
          const channelId = channel.channelInfoIdHash || channel.idHash
          if (!channelId) {
            console.warn('[GrantAccess] Channel has no idHash, skipping')
            continue
          }

          await createAccess([{
            id: channelId,
            person: [targetPersonId],
            hashGroup: [],
            mode: SET_ACCESS_MODE.ADD
          }])
          grantedCount++
        } catch (error) {
          // Skip channels where we can't determine participants
          console.warn('[GrantAccess] Could not check participants for channel:', (error as Error).message)
        }
      }

      console.log(`[GrantAccess] ✅ Granted access to ${grantedCount} channels (target is participant)`)
    } catch (error) {
      console.warn('[GrantAccess] Failed to grant channel access:', (error as Error).message)
    }
  }
  
  // 4. Grant access to our MAIN profile only (not all profiles!)
  if (nodeOneCore.leuteModel) {
    try {
      const me = await nodeOneCore.leuteModel.me()
      const mainProfile = await me.mainProfile()

      if (mainProfile && mainProfile.idHash) {
        await createAccess([{
          id: mainProfile.idHash,
          person: [targetPersonId],
          hashGroup: [],
          mode: SET_ACCESS_MODE.ADD
        }])
        console.log('[GrantAccess] ✅ Granted access to main Profile object')
      }
    } catch (error) {
      console.warn('[GrantAccess] Failed to grant Profile access:', (error as Error).message)
    }
  }
  
  console.log('[GrantAccess] ✅ Access rights granted')
}

export default { grantAccessRights }