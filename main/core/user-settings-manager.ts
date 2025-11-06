/**
 * UserSettingsManager - Unified settings management for LAMA
 *
 * Consolidates GlobalLLMSettings, WordCloudSettings, and ProposalConfig
 * into a single UserSettings object stored in ONE.core with CHUM sync.
 *
 * Features:
 * - In-memory cache with invalidation (Decision 4)
 * - ONE.core versioned storage
 * - CHUM sync across instances (Decision 3)
 * - Validation helpers (Decision 5)
 */

import { storeVersionedObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { UserSettings } from '@OneObjectInterfaces';
import {
    DEFAULT_USER_SETTINGS,
    validateAISettings,
    validateUISettings,
    validateProposalSettings,
    type AISettings,
    type UISettings,
    type ProposalSettings
} from '../types/user-settings-types.js';

export class UserSettingsManager {
    private nodeOneCore: any;
    private userEmail: string;
    private cachedSettings?: UserSettings; // In-memory cache (Decision 4)

    constructor(nodeOneCore: any, userEmail: string) {
        this.nodeOneCore = nodeOneCore;
        this.userEmail = userEmail;
    }

    /**
     * Get user settings with caching
     *
     * Performance:
     * - Cache hit: <1ms (O(1) map lookup)
     * - Cache miss: ~15ms (ONE.core storage read)
     *
     * @returns Current user settings or defaults if not found
     *
     * @example
     * ```typescript
     * const settings = await userSettingsManager.getSettings();
     * console.log(settings.ai.temperature); // 0.7
     * console.log(settings.ui.theme); // 'dark'
     * ```
     */
    async getSettings(): Promise<UserSettings> {
        // Cache hit
        if (this.cachedSettings) {
            console.log('[UserSettings] Cache hit for email:', this.userEmail);
            return this.cachedSettings;
        }

        // Cache miss - load from ONE.core
        try {
            // Only ID properties are needed for ID hash calculation
            const idHash = await calculateIdHashOfObj({
                $type$: 'UserSettings' as const,
                userEmail: this.userEmail
            } as any);

            console.log('[UserSettings] Loading settings for email:', this.userEmail);
            console.log('[UserSettings] Calculated ID hash:', idHash);

            const result = await getObjectByIdHash(idHash);
            const settings = result.obj as UserSettings;

            console.log('[UserSettings] ✅ Loaded existing settings from storage');
            console.log('[UserSettings] apiKeys:', settings.ai.apiKeys);

            // Cache for next access
            this.cachedSettings = settings;
            return settings;
        } catch (error: any) {
            console.log('[UserSettings] Failed to load settings:', error.message);
            console.log('[UserSettings] Error code:', error.code);

            if (error.message?.includes('not found') || error.code === 'NOT_FOUND') {
                // First time - create default settings
                console.log('[UserSettings] No existing settings found, creating defaults');
                return await this.createDefaultSettings();
            }

            // Corrupted data or other error - log and use defaults
            console.error('[UserSettings] Load failed:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Update user settings with partial updates
     *
     * Automatically:
     * - Validates all changes
     * - Updates timestamp
     * - Stores new version in ONE.core
     * - Invalidates cache
     * - Syncs via CHUM (last-write-wins)
     *
     * @param updates - Partial settings to update (any combination of ai, ui, proposals)
     * @returns Updated settings after validation and storage
     * @throws Error if validation fails
     *
     * @example
     * ```typescript
     * // Update AI temperature
     * await userSettingsManager.updateSettings({
     *   ai: { temperature: 0.9 }
     * });
     *
     * // Update multiple sections
     * await userSettingsManager.updateSettings({
     *   ai: { temperature: 0.9, maxTokens: 4096 },
     *   ui: { theme: 'light' }
     * });
     * ```
     */
    async updateSettings(updates: Partial<Omit<UserSettings, '$type$' | 'userEmail'>>): Promise<UserSettings> {
        const current = await this.getSettings();

        // Explicitly merge to preserve Maps (spread operator destroys them)
        const updated: UserSettings = {
            $type$: current.$type$,
            userEmail: current.userEmail,
            ai: updates.ai !== undefined ? updates.ai : current.ai,
            ui: updates.ui !== undefined ? updates.ui : current.ui,
            proposals: updates.proposals !== undefined ? updates.proposals : current.proposals,
            updatedAt: Date.now()
        };

        // Validate before storing
        const errors = this.validateSettings(updated);
        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        // Store as new version
        await storeVersionedObject(updated);

        // Invalidate cache
        this.cachedSettings = undefined;

        return updated;
    }

    /**
     * Update AI settings only (convenience method)
     *
     * @param updates - Partial AI settings to update
     * @returns Updated user settings
     * @throws Error if validation fails
     *
     * @example
     * ```typescript
     * // Adjust temperature for more creative responses
     * await userSettingsManager.updateAI({
     *   temperature: 0.9,
     *   maxTokens: 4096
     * });
     *
     * // Change default model
     * await userSettingsManager.updateAI({
     *   defaultModelId: 'llama3.2:3b',
     *   defaultProvider: 'ollama'
     * });
     * ```
     */
    async updateAI(updates: Partial<AISettings>): Promise<UserSettings> {
        const current = await this.getSettings();

        const errors = validateAISettings(updates);
        if (errors.length > 0) {
            throw new Error(`AI settings validation failed: ${errors.join(', ')}`);
        }

        // Merge settings - handle Maps specially (they don't spread correctly)
        const updatedAI: AISettings = {
            ...current.ai,
            ...updates,
            // If apiKeys is being updated, ensure it's preserved as a Map
            apiKeys: updates.apiKeys !== undefined
                ? updates.apiKeys
                : current.ai.apiKeys
        };

        return await this.updateSettings({
            ai: updatedAI
        });
    }

    /**
     * Update UI settings only (convenience method)
     *
     * @param updates - Partial UI settings to update
     * @returns Updated user settings
     * @throws Error if validation fails
     *
     * @example
     * ```typescript
     * // Switch to dark theme
     * await userSettingsManager.updateUI({
     *   theme: 'dark'
     * });
     *
     * // Configure word cloud
     * await userSettingsManager.updateUI({
     *   wordCloud: {
     *     enabled: true,
     *     maxKeywords: 50,
     *     colorScheme: 'pastel'
     *   }
     * });
     * ```
     */
    async updateUI(updates: Partial<UISettings>): Promise<UserSettings> {
        const current = await this.getSettings();

        const errors = validateUISettings(updates);
        if (errors.length > 0) {
            throw new Error(`UI settings validation failed: ${errors.join(', ')}`);
        }

        return await this.updateSettings({
            ui: { ...current.ui, ...updates }
        });
    }

    /**
     * Update proposal settings only (convenience method)
     *
     * @param updates - Partial proposal settings to update
     * @returns Updated user settings
     * @throws Error if validation fails
     *
     * @example
     * ```typescript
     * // Prioritize keyword matching over recency
     * await userSettingsManager.updateProposals({
     *   matchWeight: 0.8,
     *   recencyWeight: 0.2
     * });
     *
     * // Increase similarity threshold
     * await userSettingsManager.updateProposals({
     *   minJaccard: 0.3,
     *   maxProposals: 10
     * });
     * ```
     */
    async updateProposals(updates: Partial<ProposalSettings>): Promise<UserSettings> {
        const current = await this.getSettings();

        const errors = validateProposalSettings(updates);
        if (errors.length > 0) {
            throw new Error(`Proposal settings validation failed: ${errors.join(', ')}`);
        }

        return await this.updateSettings({
            proposals: { ...current.proposals, ...updates }
        });
    }

    /**
     * Create default settings for first-time users
     */
    private async createDefaultSettings(): Promise<UserSettings> {
        const settings: UserSettings = {
            $type$: 'UserSettings',
            userEmail: this.userEmail,
            ...DEFAULT_USER_SETTINGS,
            updatedAt: Date.now()
        };

        await storeVersionedObject(settings);
        this.cachedSettings = settings;

        console.log('[UserSettings] Created default settings for', this.userEmail);
        return settings;
    }

    /**
     * Get default settings (without storing)
     */
    private getDefaultSettings(): UserSettings {
        return {
            $type$: 'UserSettings',
            userEmail: this.userEmail,
            ...DEFAULT_USER_SETTINGS,
            updatedAt: Date.now()
        };
    }

    /**
     * Validate complete settings object
     */
    private validateSettings(settings: UserSettings): string[] {
        const errors: string[] = [];

        errors.push(...validateAISettings(settings.ai));
        errors.push(...validateUISettings(settings.ui));
        errors.push(...validateProposalSettings(settings.proposals));

        return errors;
    }

    /**
     * Clear cache (force reload on next access)
     */
    clearCache(): void {
        this.cachedSettings = undefined;
    }

    /**
     * Set API key for a specific provider
     *
     * @param provider - Provider name (e.g., "anthropic", "openai")
     * @param apiKey - The API key to store
     * @returns Updated user settings
     *
     * @example
     * ```typescript
     * // Store Claude API key
     * await userSettingsManager.setApiKey('anthropic', 'sk-ant-...');
     *
     * // Store OpenAI API key
     * await userSettingsManager.setApiKey('openai', 'sk-...');
     * ```
     */
    async setApiKey(provider: string, apiKey: string): Promise<UserSettings> {
        console.log('[UserSettings] setApiKey called for provider:', provider);
        console.log('[UserSettings] API key (first 20 chars):', apiKey?.substring(0, 20));

        const current = await this.getSettings();
        console.log('[UserSettings] Current apiKeys:', current.ai.apiKeys);

        // Create new Map from existing entries plus new key
        // Don't spread Maps - create new Map properly
        const existingMap = current.ai.apiKeys || new Map<string, string>();
        const updatedApiKeys = new Map<string, string>(existingMap);
        updatedApiKeys.set(provider, apiKey);

        console.log('[UserSettings] Updated apiKeys entries:', Array.from(updatedApiKeys.entries()));

        const result = await this.updateAI({
            apiKeys: updatedApiKeys
        });
        console.log('[UserSettings] ✅ API key saved successfully');
        return result;
    }

    /**
     * Get API key for a specific provider
     *
     * @param provider - Provider name (e.g., "anthropic", "openai")
     * @returns API key or undefined if not found
     *
     * @example
     * ```typescript
     * const claudeKey = await userSettingsManager.getApiKey('anthropic');
     * const openaiKey = await userSettingsManager.getApiKey('openai');
     * ```
     */
    async getApiKey(provider: string): Promise<string | undefined> {
        const settings = await this.getSettings();
        const apiKeys = settings.ai.apiKeys;
        if (!apiKeys) return undefined;

        return apiKeys.get(provider);
    }

    /**
     * Remove API key for a specific provider
     *
     * @param provider - Provider name (e.g., "anthropic", "openai")
     * @returns Updated user settings
     *
     * @example
     * ```typescript
     * await userSettingsManager.removeApiKey('anthropic');
     * ```
     */
    async removeApiKey(provider: string): Promise<UserSettings> {
        const current = await this.getSettings();

        if (!current.ai.apiKeys) {
            return current; // No API keys to remove
        }

        const updatedApiKeys = new Map<string, string>(current.ai.apiKeys);
        updatedApiKeys.delete(provider);

        return await this.updateAI({
            apiKeys: updatedApiKeys
        });
    }

    /**
     * Get all API keys
     *
     * @returns Object with all stored API keys
     *
     * @example
     * ```typescript
     * const allKeys = await userSettingsManager.getAllApiKeys();
     * console.log(allKeys); // { anthropic: 'sk-ant-...', openai: 'sk-...' }
     * ```
     */
    async getAllApiKeys(): Promise<Record<string, string>> {
        const settings = await this.getSettings();
        const apiKeys = settings.ai.apiKeys;
        if (!apiKeys) return {};

        return Object.fromEntries(apiKeys);
    }
}
