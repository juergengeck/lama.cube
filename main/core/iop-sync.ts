import type { ChannelManager } from '@refinio/one.models/lib/models/index.js';
/**
 * IoP (Internet of Persons) Sync Manager
 * 
 * Manages explicit content sharing between Browser and Node.js instances
 * using access rights instead of IoM identity merging.
 */

class IoPSyncManager {
  public nodeOneCore: any;
  public syncEnabled: any;

  browserPersonId: string | null;
  nodePersonId: string | null;
  constructor(nodeOneCore: any) {

    this.nodeOneCore = nodeOneCore
    this.browserPersonId = null
    this.nodePersonId = null
    this.syncEnabled = false
}

  /**
   * Initialize IoP sync between Browser and Node instances
   * @param {string} browserPersonId - The browser instance's person ID
   */
  async initializeSync(browserPersonId: any): Promise<any> {
    console.log('[IoPSync] Initializing IoP sync...')
    
    this.browserPersonId = browserPersonId
    this.nodePersonId = this.nodeOneCore.ownerId
    
    if (!this.browserPersonId || !this.nodePersonId) {
      throw new Error('[IoPSync] Missing person IDs for sync setup')
    }
    
    console.log('[IoPSync] Browser Person:', this.browserPersonId)
    console.log('[IoPSync] Node Person:', this.nodePersonId)
    
    // Grant mutual access rights
    await this.grantMutualAccess()
    
    this.syncEnabled = true
    console.log('[IoPSync] ✅ IoP sync initialized')
  }
  
  /**
   * Grant mutual access rights between Browser and Node instances
   */
  async grantMutualAccess(): Promise<any> {
    console.log('[IoPSync] Granting mutual access rights...')
    
    const { createAccess } = await import('@refinio/one.core/lib/access.js')
    const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')
    const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js')
    
    // 1. Grant Browser access to Node's Leute object
    await this.grantAccessToLeute(this.browserPersonId, createAccess, SET_ACCESS_MODE, calculateIdHashOfObj)

    // 2. Grant Browser access to all Node's channels
    await this.grantAccessToChannels(this.browserPersonId, createAccess, SET_ACCESS_MODE, calculateIdHashOfObj)

    // NOTE: Someone objects are NOT shared by default.
    // Only Profiles are shared, scoped to chat participants.
    // Profile access is granted in TopicModel.shareParticipantProfiles()

    console.log('[IoPSync] ✅ Access rights granted')
  }
  
  /**
   * Grant access to Leute object for contact list sync
   */
  async grantAccessToLeute(remotePersonId: any, createAccess: any, SET_ACCESS_MODE: any, calculateIdHashOfObj: any): Promise<any> {
    console.log('[IoPSync] Granting access to Leute object...')
    
    // Calculate Leute object ID
    const leuteId = await calculateIdHashOfObj({
      $type$: 'Leute',
      appId: 'one.leute'
    })
    
    // Grant access to the Leute object
    await createAccess([{
      id: leuteId,
      person: [remotePersonId],
      hashGroup: [],
      mode: SET_ACCESS_MODE.ADD
    }])
    
    console.log('[IoPSync] ✅ Leute access granted')
  }
  
  /**
   * Grant access to all channels for message sync
   */
  async grantAccessToChannels(remotePersonId: any, createAccess: any, SET_ACCESS_MODE: any, calculateIdHashOfObj: any): Promise<any> {
    console.log('[IoPSync] Granting access to channels...')
    
    if (!this.nodeOneCore.channelManager) {
      console.warn('[IoPSync] ChannelManager not available')
      return
    }
    
    // Get all channels
    const channels = await this.nodeOneCore.channelManager.getAllChannels()
    console.log(`[IoPSync] Found ${(channels as any).length} channels to share`)
    
    for (const channel of channels) {
      try {
        const channelInfoId = await calculateIdHashOfObj({
          $type$: 'ChannelInfo',
          id: channel.id,
          owner: channel.owner || this.nodePersonId
        })
        
        await createAccess([{
          id: channelInfoId,
          person: [remotePersonId],
          hashGroup: [],
          mode: SET_ACCESS_MODE.ADD
        }])
        
        console.log(`[IoPSync] Access granted to channel: ${channel.id}`)
      } catch (error) {
        console.warn(`[IoPSync] Failed to grant access to channel ${channel.id}:`, (error as Error).message)
      }
    }
    
    console.log('[IoPSync] ✅ Channel access granted')
  }
  
  /**
   * Set up listeners for new content to automatically grant access
   */
  setupAutoAccessGrant(): any {
    if (!this.syncEnabled || !this.browserPersonId) {
      return
    }
    
    console.log('[IoPSync] Setting up auto-access grant for new content...')
    
    // Listen for new channels
    if (this.nodeOneCore.channelManager) {
      this.nodeOneCore.channelManager.onChannelCreated(async (channel: any) => {
        console.log(`[IoPSync] New channel created, participants: ${channel.participants?.substring(0, 8)}, granting access...`)
        const { createAccess } = await import('@refinio/one.core/lib/access.js')
        const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')

        // Use channelInfoIdHash directly from the channel
        const channelInfoId = channel.channelInfoIdHash || channel.idHash
        if (!channelInfoId) {
          console.warn('[IoPSync] Channel has no idHash, skipping')
          return
        }

        if (this.browserPersonId) {
          await createAccess([{
            id: channelInfoId,
            person: [this.browserPersonId as any],
            hashGroup: [],
            mode: SET_ACCESS_MODE.ADD
          }])
        }

        console.log(`[IoPSync] ✅ Access granted to new channel, participants: ${channel.participants?.substring(0, 8)}`)
      })
    }
    
    // NOTE: Someone objects are NOT auto-shared.
    // Profile access is granted when participants join a chat via TopicModel.

    console.log('[IoPSync] ✅ Auto-access grant configured')
  }
  
  /**
   * Check sync status
   */
  getStatus(): any {
    return {
      enabled: this.syncEnabled,
      browserPersonId: this.browserPersonId,
      nodePersonId: this.nodePersonId
    }
  }
}

export default IoPSyncManager;