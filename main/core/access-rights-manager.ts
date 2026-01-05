import type { ChannelManager } from '@refinio/one.models/lib/models/index.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import type { HashGroup, Person } from '@refinio/one.core/lib/recipes.js';
/**
 * Access Rights Manager for Node.js ONE.core instance
 * Based on one.leute LeuteAccessRightsManager pattern
 */

/**
 * Access Rights Manager for Node.js instance
 * Handles proper access rights setup for channel sharing with browser instance
 */
class NodeAccessRightsManager {
  public channelManager: any;
  public leuteModel: any;
  public connectionsModel: any;
  public groupConfig: any;

  [key: string]: any;
  constructor(channelManager: any, connectionsModel: any, leuteModel: any) {
    this.channelManager = channelManager
    this.leuteModel = leuteModel
    this.connectionsModel = connectionsModel
    this.groupConfig = {}

    // Set up automatic access rights for new channels
    // New callback signature: (channelInfoIdHash, participantsHash, channelOwner, time, data)
    this.channelManager.onUpdated(async (channelInfoIdHash: any, participantsHash: any, channelOwner: any, timeOfEarliestChange: number, data: any) => {
      if (channelInfoIdHash && this.groupConfig.federation) {
        // CRITICAL: Check channel type before granting access
        // Determine if P2P by checking number of participants in HashGroup
        let isP2PChannel = false
        let participantCount = 0
        try {
          const hashGroup = await getObject(participantsHash) as HashGroup<Person> | undefined
          if (hashGroup && hashGroup.person) {
            participantCount = hashGroup.person.size || Array.from(hashGroup.person).length
            // P2P channels have exactly 2 participants and null owner
            isP2PChannel = participantCount === 2 && channelOwner === null
          }
        } catch {
          // If we can't fetch the HashGroup, we can't determine channel type
        }

        // For single-participant channels, check if private (contacts channel)
        const isPrivateChannel = participantCount === 1 && channelOwner !== null // Single owner channels are private by nature

        // Skip automatic access for P2P and private channels
        if (isP2PChannel || isPrivateChannel) {
          console.log(`[NodeAccessRights] Skipping automatic access for ${isPrivateChannel ? 'private' : 'P2P'} channel, participants: ${participantsHash?.substring(0, 8)}`)

          // For private channels, only grant federation access (browser only)
          if (isPrivateChannel) {
            try {
              const { createAccess } = await import('@refinio/one.core/lib/access.js')
              const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')
              const { ensureIdHash } = await import('@refinio/one.core/lib/util/type-checks.js')
              await createAccess([{
                id: ensureIdHash(channelInfoIdHash),
                person: [],
                group: this.getGroups('federation'), // ONLY federation
                mode: SET_ACCESS_MODE.ADD
}])

              console.log(`[NodeAccessRights] ✅ Federation-only access granted for private channel, participants: ${participantsHash?.substring(0, 8)}`)
            } catch (error) {
              if (!(error as Error).message?.includes('already exists')) {
                console.error('[NodeAccessRights] Failed to grant federation access:', (error as Error).message)
              }
            }
          }
          return
        }

        // For other channels, grant broader access (but not to everyone)
        try {
          const { createAccess } = await import('@refinio/one.core/lib/access.js')
          const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')

          const { ensureIdHash } = await import('@refinio/one.core/lib/util/type-checks.js')
          await createAccess([{
            id: ensureIdHash(channelInfoIdHash),
            person: [],
            group: this.getGroups('federation', 'replicant'), // NOT everyone
            mode: SET_ACCESS_MODE.ADD
          }])

          console.log(`[NodeAccessRights] ✅ Access granted for channel, participants: ${participantsHash?.substring(0, 8)}`)
        } catch (error) {
          // Access might already exist, that's ok
          if (!(error as Error).message?.includes('already exists')) {
            console.error('[NodeAccessRights] Failed to grant access:', (error as Error).message)
          }
        }
      }
    })
  }
  
  /**
   * Initialize the access rights manager with group configuration
   */
  async init(groups: any): Promise<any> {
    if (groups) {
      this.groupConfig = groups
    }
    
    console.log('[NodeAccessRights] Initializing with groups:', Object.keys(this.groupConfig))
    
    await this.giveAccessToChannels()
    await this.giveAccessToMainProfile()
    
    console.log('[NodeAccessRights] ✅ Initialized successfully')
  }
  
  /**
   * Shutdown the access rights manager
   */
  async shutdown(): Promise<any> {
    this.groupConfig = {}
  }
  
  /**
   * Get group IDs by name
   */
  getGroups(...groupNames: any): any {
    const groups = []
    for (const groupName of groupNames) {
      const groupConfigEntry = this.groupConfig[groupName]
      if (groupConfigEntry !== undefined) {
        // Ensure we're pushing a simple value, not a frozen object
        groups.push(groupConfigEntry)
      }
    }
    return groups
  }
  
  /**
   * Give access to main profile for everybody and federation
   */
  async giveAccessToMainProfile(): Promise<any> {
    try {
      const { serializeWithType } = await import('@refinio/one.core/lib/util/promise.js')
      const { createAccess } = await import('@refinio/one.core/lib/access.js')
      const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')
      
      const me = await this.leuteModel.me()
      const mainProfile = me.mainProfileLazyLoad()
      
      await serializeWithType('Share', async () => {
        const setAccessParam = {
          id: mainProfile.idHash,
          person: [],
          group: this.getGroups('everyone', 'federation', 'replicant'),
          mode: SET_ACCESS_MODE.ADD
        }
        await createAccess([setAccessParam])
      })
      
      console.log('[NodeAccessRights] ✅ Granted access to main profile')
    } catch (error) {
      console.error('[NodeAccessRights] Failed to grant access to main profile:', error)
    }
  }
  
  /**
   * Set up access rights for channels
   */
  async giveAccessToChannels(): Promise<any> {
    try {
      const { serializeWithType } = await import('@refinio/one.core/lib/util/promise.js')
      const { createAccess } = await import('@refinio/one.core/lib/access.js')
      const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')
      const { getObject } = await import('@refinio/one.core/lib/storage-unversioned-objects.js')

      const me = await this.leuteModel.me()
      const mainId = await me.mainIdentity()

      // Get all existing channels and grant access
      const channels = await this.channelManager.getMatchingChannelInfos()
      console.log(`[NodeAccessRights] Setting up access for ${channels.length} channels`)

      await serializeWithType('IdAccess', async () => {
        // Apply access rights to channels selectively
        await Promise.all(
          channels.map(async (channel: any) => {
            // CRITICAL: Determine channel type from participants
            let participantCount = 0
            let isP2PChannel = false
            try {
              const hashGroup = await getObject(channel.participants) as HashGroup<Person> | undefined
              if (hashGroup && hashGroup.person) {
                participantCount = hashGroup.person.size || Array.from(hashGroup.person).length
                // P2P channels have exactly 2 participants and null owner
                isP2PChannel = participantCount === 2 && channel.owner === null
              }
            } catch {
              // If we can't fetch the HashGroup, skip this channel
              return
            }

            // Private channels are single-participant with an owner
            const isPrivateChannel = participantCount === 1 && channel.owner !== null

            if (isPrivateChannel) {
              console.log(`[NodeAccessRights] Skipping private channel, participants: ${channel.participants?.substring(0, 8)}`)
              // Only share with federation (browser), NOT with everyone
              // Channel already exists, just grant access using its idHash
              const channelInfoIdHash = channel.channelInfoIdHash || channel.idHash

              if (channelInfoIdHash) {
                await createAccess([{
                  id: channelInfoIdHash,
                  person: [],
                  group: this.getGroups('federation'), // ONLY federation, not everyone!
                  mode: SET_ACCESS_MODE.ADD
                }])
              }
              return
            }

            // For P2P channels, handle specially
            if (isP2PChannel) {
              console.log(`[NodeAccessRights] P2P channel detected, participants: ${channel.participants?.substring(0, 8)}`)
              // P2P channels should only be accessible to the participants
              // Access should be granted per-person when the channel is created
              // Not to everyone group!
              return // Skip automatic group access for P2P channels
            }

            // For other channels (future shared channels), grant broader access
            // Channel already exists, just grant access using its idHash
            const channelInfoIdHash = channel.channelInfoIdHash || channel.idHash

            if (channelInfoIdHash) {
              // Only share with federation and replicant, not everyone
              await createAccess([{
                id: channelInfoIdHash,
                person: [],
                group: this.getGroups('federation', 'replicant'),
                mode: SET_ACCESS_MODE.ADD
              }])
            }
          })
        )
      })

      console.log('[NodeAccessRights] ✅ Channel access rights configured')
    } catch (error) {
      console.error('[NodeAccessRights] Failed to setup channel access:', error)
    }
  }
  
  /**
   * Grant access to a specific channel for federation
   * @param channelInfoIdHash - The channel info ID hash
   */
  async grantChannelAccess(channelInfoIdHash: any): Promise<any> {
    try {
      const { createAccess } = await import('@refinio/one.core/lib/access.js')
      const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')

      await createAccess([{
        id: channelInfoIdHash,
        person: [],
        group: this.getGroups('federation', 'replicant', 'everyone'),
        mode: SET_ACCESS_MODE.ADD
      }])

      console.log(`[NodeAccessRights] ✅ Granted federation access to channel: ${String(channelInfoIdHash).substring(0, 8)}`)
    } catch (error) {
      console.error(`[NodeAccessRights] Failed to grant channel access for ${String(channelInfoIdHash).substring(0, 8)}:`, error)
    }
  }
}

export default NodeAccessRightsManager;