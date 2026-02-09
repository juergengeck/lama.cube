/**
 * AssemblyManager Singleton for lama.cube
 *
 * Creates Assemblies for chat topics using assembly.core
 *
 * Uses direct Assembly creation (no Plan required) for simple chat tracking.
 * Full Demand/Supply/Plan matching can be added later.
 *
 * IMPORTANT: Must call setAssemblyDimension() after JournalModule initializes
 * so assemblies are indexed and visible in the journal.
 */

import type { SHA256IdHash, SHA256Hash } from '@refinio/one.core/lib/util/type-checks'
import { AssemblyPlan } from '@refinio/assembly.core'
import type { AssemblyDimension } from '@refinio/assembly.core'
import { storeVersionedObject, getObjectByIdHash, getCurrentVersionHash } from '@refinio/one.core/lib/storage-versioned-objects.js'
import type { Instance } from '@refinio/one.core/lib/recipes.js'
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js'
import nodeOneCore from '../core/node-one-core.js'

class AssemblyManagerSingleton {
  private initialized = false
  private assemblyPlan: AssemblyPlan | null = null
  private assemblyDimension: AssemblyDimension | null = null
  private onIndexed: (() => Promise<void>) | null = null

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
   * Set the AssemblyDimension for indexing
   *
   * Must be called after JournalModule initializes so assemblies
   * are indexed and visible in the journal.
   *
   * @param dimension - AssemblyDimension from JournalModule
   * @param onIndexed - Callback to trigger persistence after indexing
   */
  setAssemblyDimension(dimension: AssemblyDimension, onIndexed?: () => Promise<void>): void {
    this.assemblyDimension = dimension
    this.onIndexed = onIndexed || null
    console.log('[AssemblyManager] AssemblyDimension connected for indexing')
  }

  /**
   * Get the current Instance version hash
   *
   * The Instance version hash is used to provide temporal context for Stories.
   * It changes when the Instance is updated, allowing tracking of when actions occurred.
   */
  private async getInstanceVersionHash(): Promise<string> {
    const instanceIdHash = nodeOneCore.instanceId
    if (!instanceIdHash) {
      throw new Error('Instance ID not available - node not provisioned')
    }
    const versionHash = await getCurrentVersionHash(instanceIdHash as SHA256IdHash<Instance>)
    if (!versionHash) {
      throw new Error('Failed to get Instance version hash')
    }
    return versionHash
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

      // Get current Instance version hash for temporal context
      const instanceVersionHash = await this.getInstanceVersionHash()

      // Then create a Story documenting the chat creation
      const storyResult = await this.assemblyPlan.createStory({
        id: `ChatPlan.createChat(topicId:${topicId})`,
        title: `Create Chat: ${topicName}`,
        plan: planResult.idHash,
        product: topicId as unknown as SHA256Hash<any>, // The topic is the product
        instanceVersion: instanceVersionHash,
        owner: myIdentityId
      })

      // Create Assembly with entity=topicId (tracks the topic over time)
      const assemblyResult = await this.assemblyPlan.createAssembly({
        entity: topicId,  // The topic is the entity being tracked
        storyRef: storyResult.idHash,
        title: `Create Chat: ${topicName}`
      })

      console.log(`[AssemblyManager] Assembly created:`, {
        assemblyId: assemblyResult.idHash,
        storyId: storyResult.idHash
      })

      // Index into AssemblyDimension so it shows in journal
      if (this.assemblyDimension) {
        try {
          this.assemblyDimension.indexAssembly(
            assemblyResult.idHash,
            assemblyResult.hash,
            assemblyResult.assembly,
            storyResult.story,
            planResult.plan
          )
          console.log(`[AssemblyManager] Indexed chat assembly into AssemblyDimension`)

          // Trigger persistence
          if (this.onIndexed) {
            await this.onIndexed()
          }
        } catch (indexErr) {
          console.error('[AssemblyManager] Failed to index chat assembly:', indexErr)
        }
      }

      return assemblyResult.idHash
    } catch (error) {
      console.error('[AssemblyManager] Failed to create chat Assembly:', error)
      throw error
    }
  }

  /**
   * Create Assembly for AI contact creation
   *
   * Called when a new AI contact is created.
   * Creates a journal entry documenting the AI's creation.
   *
   * @param aiPersonId - AI Person ID hash (used as entity)
   * @param displayName - AI display name
   * @param modelId - Model ID associated with this AI
   * @returns Assembly ID hash
   */
  async createAIContactAssembly(
    aiPersonId: SHA256IdHash<any>,
    displayName: string,
    modelId: string
  ): Promise<SHA256IdHash<any> | null> {
    if (!this.assemblyPlan) {
      console.warn('[AssemblyManager] Plan not initialized - skipping AI Assembly creation')
      return null
    }

    try {
      console.log(`[AssemblyManager] Creating Assembly for AI creation: ${displayName} (${modelId})`)

      const myIdentityId = nodeOneCore.ownerId

      // Create a Plan for AI contact tracking
      // Use 'AIPlan' so it shows up under "AI Assistants" in journal filter
      const planResult = await this.assemblyPlan.createPlan({
        id: 'AIPlan',
        name: 'AI Assistant',
        description: `AI assistant operations`,
        demandPatterns: [],
        supplyPatterns: [],
        domain: 'ai'
      })

      // Get current Instance version hash for temporal context
      const instanceVersionHash = await this.getInstanceVersionHash()

      // Create a Story documenting the AI contact creation
      // Story id format: PlanId.operation(entity) - used for journal filtering
      const storyResult = await this.assemblyPlan.createStory({
        id: `AIPlan.createAI(${aiPersonId})`,
        title: `AI Created: ${displayName} (model: ${modelId})`,
        plan: planResult.idHash,
        product: aiPersonId as unknown as SHA256Hash<any>,
        instanceVersion: instanceVersionHash,
        owner: myIdentityId
      })

      // Create Assembly with entity=aiPersonId (tracks the AI contact over time)
      const assemblyResult = await this.assemblyPlan.createAssembly({
        entity: aiPersonId,
        storyRef: storyResult.idHash,
        title: `AI Created: ${displayName}`
      })

      console.log(`[AssemblyManager] AI Assembly created:`, {
        assemblyId: assemblyResult.idHash,
        storyId: storyResult.idHash,
        displayName,
        modelId
      })

      // Index into AssemblyDimension so it shows in journal
      if (this.assemblyDimension) {
        try {
          this.assemblyDimension.indexAssembly(
            assemblyResult.idHash,
            assemblyResult.hash,
            assemblyResult.assembly,
            storyResult.story,
            planResult.plan
          )
          console.log(`[AssemblyManager] Indexed AI assembly into AssemblyDimension`)

          // Trigger persistence
          if (this.onIndexed) {
            await this.onIndexed()
          }
        } catch (indexErr) {
          console.error('[AssemblyManager] Failed to index AI assembly:', indexErr)
        }
      }

      return assemblyResult.idHash
    } catch (error) {
      console.error('[AssemblyManager] Failed to create AI Assembly:', error)
      throw error
    }
  }

  /**
   * Create Assembly for a system event (generic)
   *
   * Used for configuration changes, integrations, sharing, etc.
   *
   * @param domain - Domain for filtering (e.g., 'config', 'integration', 'sharing')
   * @param eventType - Type of event (e.g., 'api-key-configured', 'molt-activated')
   * @param title - Human-readable title
   * @param details - Additional details about the event
   * @returns Assembly ID hash
   */
  async createSystemEventAssembly(
    domain: string,
    eventType: string,
    title: string,
    details?: Record<string, unknown>
  ): Promise<SHA256IdHash<any> | null> {
    if (!this.assemblyPlan) {
      console.warn('[AssemblyManager] Plan not initialized - skipping system event Assembly creation')
      return null
    }

    try {
      console.log(`[AssemblyManager] Creating Assembly for system event: ${eventType}`)

      const myIdentityId = nodeOneCore.ownerId

      // Create a Plan for system events
      const planResult = await this.assemblyPlan.createPlan({
        id: `SystemEvent.${domain}`,
        name: title,
        description: details ? JSON.stringify(details) : undefined,
        demandPatterns: [],
        supplyPatterns: [],
        domain
      })

      // Get current Instance version hash for temporal context
      const instanceVersionHash = await this.getInstanceVersionHash()

      // Create a Story documenting the event
      const storyResult = await this.assemblyPlan.createStory({
        id: `SystemEvent.${eventType}(${Date.now()})`,
        title,
        plan: planResult.idHash,
        product: myIdentityId as unknown as SHA256Hash<any>, // Use owner as product for system events
        instanceVersion: instanceVersionHash,
        owner: myIdentityId
      })

      // Create Assembly
      const assemblyResult = await this.assemblyPlan.createAssembly({
        entity: myIdentityId, // System events are associated with the user
        storyRef: storyResult.idHash,
        title
      })

      console.log(`[AssemblyManager] System event Assembly created:`, {
        assemblyId: assemblyResult.idHash,
        eventType,
        domain
      })

      // Index into AssemblyDimension so it shows in journal
      if (this.assemblyDimension) {
        try {
          this.assemblyDimension.indexAssembly(
            assemblyResult.idHash,
            assemblyResult.hash,
            assemblyResult.assembly,
            storyResult.story,
            planResult.plan
          )
          console.log(`[AssemblyManager] Indexed system event assembly into AssemblyDimension`)

          // Trigger persistence
          if (this.onIndexed) {
            await this.onIndexed()
          }
        } catch (indexErr) {
          console.error('[AssemblyManager] Failed to index system event assembly:', indexErr)
        }
      }

      return assemblyResult.idHash
    } catch (error) {
      console.error('[AssemblyManager] Failed to create system event Assembly:', error)
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
