/**
 * AI Settings Manager
 * Manages persistent AI settings including default model selection
 * Stores settings as versioned ONE.core objects to maintain history
 */

import { storeVersionedObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js'
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js'
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js'
import type { NodeOneCore } from '../types/one-core.js'
import type { GlobalLLMSettings } from '../types/custom-objects.js'

/**
 * Default AI settings
 */
export const DEFAULT_AI_SETTINGS = {
  $type$: 'GlobalLLMSettings' as const,
  name: 'default', // Will be overridden with actual instance name
  defaultModelId: undefined,
  temperature: 0.7,
  maxTokens: 2048,
  defaultProvider: 'ollama',
  autoSelectBestModel: false,
  preferredModelIds: [],
  systemPrompt: undefined,
  streamResponses: true,
  autoSummarize: false,
  enableMCP: false
}

/**
 * Create AI settings object
 * Uses versioned objects to maintain settings history
 */
export function createAISettings(instanceName: string = 'default') {
  return {
    $type$: 'GlobalLLMSettings' as const,
    name: instanceName,
    defaultProvider: 'ollama',
    autoSelectBestModel: false,
    preferredModelIds: [],
    defaultModelId: DEFAULT_AI_SETTINGS.defaultModelId,
    temperature: DEFAULT_AI_SETTINGS.temperature,
    maxTokens: DEFAULT_AI_SETTINGS.maxTokens,
    systemPrompt: DEFAULT_AI_SETTINGS.systemPrompt,
    streamResponses: DEFAULT_AI_SETTINGS.streamResponses,
    autoSummarize: DEFAULT_AI_SETTINGS.autoSummarize,
    enableMCP: DEFAULT_AI_SETTINGS.enableMCP
  }
}

/**
 * Type guard for AI settings
 */
function isAISettings(obj: unknown): obj is GlobalLLMSettings {
  return Boolean(obj && typeof obj === 'object' && '$type$' in obj && obj.$type$ === 'GlobalLLMSettings')
}

export class AISettingsManager {
  nodeOneCore: NodeOneCore;

  constructor(nodeOneCore: NodeOneCore) {
    this.nodeOneCore = nodeOneCore
}

  /**
   * Get settings ID hash - GlobalLLMSettings uses 'default' as the name
   * to ensure consistency regardless of instance name timing
   * (instanceName may be '' early, then 'lama-node-xxx' later)
   */
  async getSettingsIdHash(): Promise<SHA256IdHash<GlobalLLMSettings>> {
    // Always use 'default' to ensure consistent ID hash across app lifecycle
    // This is app-level settings, not user-specific
    const idHash = await calculateIdHashOfObj({
      $type$: 'GlobalLLMSettings' as const,
      name: 'default'
    } as any)
    return idHash as SHA256IdHash<GlobalLLMSettings>
  }

  /**
   * Try to find legacy settings stored with instanceName
   * Returns the settings if found, null otherwise
   */
  private async findLegacySettings(): Promise<GlobalLLMSettings | null> {
    // Try common instanceName patterns - always include 'lama-node-demo' as it's the common case
    // Note: instanceName may be empty string during early initialization
    const instanceName = this.nodeOneCore?.instanceName
    const namesToTry = [
      'lama-node-demo',  // Most common, check first
      instanceName,
      instanceName ? `lama-node-${instanceName.replace('lama-node-', '')}` : null,
    ].filter((name): name is string => Boolean(name) && name !== 'default')

    for (const name of namesToTry) {
      try {
        const legacyIdHash = await calculateIdHashOfObj({
          $type$: 'GlobalLLMSettings' as const,
          name
        } as any)
        const result = await getObjectByIdHash(legacyIdHash)
        if (result && isAISettings(result.obj) && result.obj.defaultModelId) {
          console.log(`[AISettingsManager] Found legacy settings with name: ${name}`)
          return result.obj as GlobalLLMSettings
        }
      } catch {
        // Try next name
      }
    }
    return null
  }

  /**
   * Get or create AI settings object
   */
  async getSettings(): Promise<GlobalLLMSettings> {
    try {
      const idHash = await this.getSettingsIdHash()

      // Try to get existing settings with 'default' name
      try {
        const result = await getObjectByIdHash(idHash)
        if (result && isAISettings(result.obj)) {
          console.log('[AISettingsManager] Found existing settings, defaultModelId:', result.obj.defaultModelId, 'name:', result.obj.name)
          // If defaultModelId is missing, check for legacy settings to migrate
          if (!result.obj.defaultModelId) {
            console.log('[AISettingsManager] No defaultModelId in settings, checking for legacy...')
            const legacy = await this.findLegacySettings()
            console.log('[AISettingsManager] Legacy search result:', legacy ? `found with modelId=${legacy.defaultModelId}` : 'not found')
            if (legacy?.defaultModelId) {
              console.log('[AISettingsManager] Migrating defaultModelId from legacy settings:', legacy.defaultModelId)
              const updated = {
                ...result.obj,
                defaultModelId: legacy.defaultModelId
              }
              delete (updated as any).idHash
              delete (updated as any).hash
              delete (updated as any).$prevVersionHash$
              const stored = await storeVersionedObject(updated)
              return stored.obj as GlobalLLMSettings
            }
          }
          return result.obj as GlobalLLMSettings
        }
      } catch (error: unknown) {
        // Settings don't exist yet - check for legacy before creating new
        console.log('[AISettingsManager] No existing settings found with default name')
      }

      // Before creating defaults, check for legacy settings to migrate
      const legacy = await this.findLegacySettings()
      if (legacy) {
        console.log('[AISettingsManager] Migrating legacy settings to default name')
        const migratedSettings = {
          ...legacy,
          name: 'default'
        }
        delete (migratedSettings as any).idHash
        delete (migratedSettings as any).hash
        delete (migratedSettings as any).$prevVersionHash$
        const storeResult = await storeVersionedObject(migratedSettings)
        return storeResult.obj as GlobalLLMSettings
      }

      // Create and store default settings - always use 'default' for consistency
      const defaultSettings = createAISettings('default')
      const storeResult = await storeVersionedObject(defaultSettings)

      console.log('[AISettingsManager] Created default settings')
      return storeResult.obj as GlobalLLMSettings
    } catch (error: unknown) {
      console.error('[AISettingsManager] Error getting settings:', error)
      // Return defaults without storing - always use 'default' for consistency
      return createAISettings('default') as GlobalLLMSettings
    }
  }

  /**
   * Update the default model ID
   * Creates a new version of the settings
   */
  async setDefaultModelId(modelId: string | null): Promise<boolean> {
    try {
      console.log('[AISettingsManager] Setting default model ID:', modelId)

      // Get current settings
      const settings = await this.getSettings()
      if (!settings) {
        console.error('[AISettingsManager] No settings available')
        return false
      }

      // Create new version with updated model ID
      const updatedSettings = {
        ...settings,
        defaultModelId: modelId ?? undefined
      }

      // Remove metadata that shouldn't be in new version
      delete (updatedSettings as any).idHash
      delete (updatedSettings as any).hash
      delete (updatedSettings as any).$prevVersionHash$

      // Store new version
      const result = await storeVersionedObject(updatedSettings)

      console.log('[AISettingsManager] Updated settings with model:', modelId)
      return true
    } catch (error: unknown) {
      console.error('[AISettingsManager] Error updating default model ID:', error)
      return false
    }
  }

  /**
   * Get the default model ID
   * Returns null if no model is configured (undefined or empty string)
   */
  async getDefaultModelId(): Promise<string | null> {
    const settings = await this.getSettings()
    // Return null if defaultModelId is undefined, null, or empty string
    return settings?.defaultModelId || null
  }

  /**
   * Update AI settings with partial updates
   * Creates a new version of the settings
   */
  async updateSettings(updates: Partial<GlobalLLMSettings>): Promise<GlobalLLMSettings | null> {
    try {
      // Get current settings
      const currentSettings = await this.getSettings()
      if (!currentSettings) {
        console.error('[AISettingsManager] No settings available')
        return null
      }

      // Create new version with updates
      const updatedSettings = {
        ...currentSettings,
        ...updates
      }

      // Remove metadata that shouldn't be in new version
      delete (updatedSettings as any).idHash
      delete (updatedSettings as any).hash
      delete (updatedSettings as any).$prevVersionHash$

      // Store new version
      const result = await storeVersionedObject(updatedSettings)

      console.log('[AISettingsManager] Updated settings')
      return result.obj
    } catch (error: unknown) {
      console.error('[AISettingsManager] Error updating settings:', error)
      throw error
    }
  }

  /**
   * Get settings history
   * Returns the current version from storage
   */
  async getSettingsHistory(): Promise<GlobalLLMSettings[]> {
    try {
      // For now, just return current settings
      // TODO: Implement version history traversal if needed
      const settings = await this.getSettings()
      return settings ? [settings] : []
    } catch (error: unknown) {
      console.error('[AISettingsManager] Error getting settings history:', error)
      return []
    }
  }
}