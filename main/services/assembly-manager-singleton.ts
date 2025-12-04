/**
 * AssemblyManager Singleton for lama.cube
 *
 * Creates Assemblies for chat topics using assembly.core
 *
 * Uses direct Assembly creation (no Plan required) for simple chat tracking.
 * Full Demand/Supply/Plan matching can be added later.
 */

import type { SHA256IdHash, SHA256Hash } from '@refinio/one.core/lib/util/type-checks'
import { AssemblyPlan } from '@assembly/core'
import { storeVersionedObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js'
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js'
import nodeOneCore from '../core/node-one-core.js'

class AssemblyManagerSingleton {
  private initialized = false
  private assemblyPlan: AssemblyPlan | null = null

  /**
   * Initialize AssemblyManager with assembly.core handler
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log('[AssemblyManager] Already initialized')
      return
    }

    try {
      console.log('[AssemblyManager] Initializing assembly.core handler...')

      // Wait for node provisioning
      if (!nodeOneCore.initialized) {
        throw new Error('Node not provisioned - cannot initialize AssemblyManager')
      }

      // Create AssemblyPlan with ONE.core dependencies
      // Adapter to match AssemblyPlan's expected interface
      const storeVersionedObjectAdapter = async (obj: any) => {
        const result = await storeVersionedObject(obj)
        return {
          hash: result.hash,
          idHash: result.idHash,
          versionHash: result.hash // ONE.core uses 'hash' as the version hash
        }
      }

      this.assemblyPlan = new AssemblyPlan({
        oneCore: nodeOneCore,
        storeVersionedObject: storeVersionedObjectAdapter,
        getObjectByIdHash,
        getObject
      })

      this.initialized = true
      console.log('[AssemblyManager] Initialized successfully with assembly.core')
    } catch (error) {
      console.error('[AssemblyManager] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Create Assembly for a chat topic
   *
   * Called when a new chat is created. Uses entity-centric assembly creation
   * where the topic is the entity being tracked.
   *
   * @param topicId - Chat topic ID hash (used as entity)
   * @param topicName - Chat topic name
   * @returns Assembly ID hash
   */
  async createChatAssembly(topicId: SHA256IdHash<any>, topicName: string): Promise<SHA256IdHash<any> | null> {
    if (!this.assemblyPlan) {
      console.warn('[AssemblyManager] Plan not initialized - skipping Assembly creation')
      return null
    }

    try {
      console.log(`[AssemblyManager] Creating Assembly for topic: ${topicName} (${topicId})`)

      const myIdentityId = nodeOneCore.ownerId

      // First create a Plan for chat tracking
      const planResult = await this.assemblyPlan.createPlan({
        id: 'ChatPlan',
        name: 'ChatPlan',
        demandPatterns: [],
        supplyPatterns: [],
        domain: 'chat'
      })

      // Then create a Story documenting the chat creation
      const storyResult = await this.assemblyPlan.createStory({
        id: `ChatPlan.createChat(topicId:${topicId})`,
        title: `Create Chat: ${topicName}`,
        plan: planResult.idHash,
        product: topicId as unknown as SHA256Hash<any>, // The topic is the product
        instanceVersion: topicId as string,
        owner: myIdentityId
      })

      // Create Assembly with entity=topicId (tracks the topic over time)
      const assemblyResult = await this.assemblyPlan.createAssembly({
        entity: topicId,  // The topic is the entity being tracked
        storyRef: storyResult.idHash
      })

      console.log(`[AssemblyManager] Assembly created:`, {
        assemblyId: assemblyResult.idHash,
        storyId: storyResult.idHash
      })

      return assemblyResult.idHash
    } catch (error) {
      console.error('[AssemblyManager] Failed to create chat Assembly:', error)
      throw error
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get AssemblyPlan instance (for advanced usage)
   */
  getHandler(): AssemblyPlan | null {
    return this.assemblyPlan
  }

  /**
   * Reset (for testing/debugging)
   */
  reset(): void {
    this.initialized = false
    this.assemblyPlan = null
    console.log('[AssemblyManager] Reset complete')
  }
}

// Export singleton instance
const assemblyManagerSingleton = new AssemblyManagerSingleton()
export default assemblyManagerSingleton
