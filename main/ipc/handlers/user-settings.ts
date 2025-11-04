/**
 * IPC Handlers for Unified User Settings
 *
 * Implements all 6 channels from contracts/ipc-user-settings.json:
 * - settings:get
 * - settings:updateAI
 * - settings:updateUI
 * - settings:updateProposals
 * - settings:setDefaultModel
 * - settings:setTheme
 */

import type { IpcMainInvokeEvent } from 'electron';
import { UserSettingsManager } from '../../core/user-settings-manager.js';
import type nodeOneCore from '../../core/node-one-core.js';

export default function createUserSettingsHandlers(nodeOneCoreInstance: typeof nodeOneCore) {
    // Lazy initialization - manager created on first access
    let settingsManager: UserSettingsManager | null = null;

    function getManager(): UserSettingsManager {
        if (!settingsManager) {
            if (!nodeOneCoreInstance.email) {
                throw new Error('[UserSettings] NodeOneCore not initialized - no user email');
            }
            settingsManager = new UserSettingsManager(nodeOneCoreInstance, nodeOneCoreInstance.email);
        }
        return settingsManager;
    }

    return {
        /**
         * settings:get - Get all user settings
         *
         * @channel settings:get
         * @request {} - No parameters required
         * @response {UserSettings} - Complete user settings object with ai, ui, and proposals
         *
         * @example
         * ```typescript
         * const settings = await window.electronAPI.invoke('settings:get', {});
         * console.log(settings.ai.temperature); // 0.7
         * console.log(settings.ui.theme); // 'dark'
         * ```
         */
        'settings:get': async (event: IpcMainInvokeEvent, request: {}) => {
            try {
                const manager = getManager();
                const settings = await manager.getSettings();
                return settings;
            } catch (error: any) {
                console.error('[IPC:settings:get] Failed:', error);
                throw new Error(error.message || 'Failed to load settings');
            }
        },

        /**
         * settings:updateAI - Update AI settings
         *
         * @channel settings:updateAI
         * @request {Object} request
         * @request.updates {Partial<AISettings>} - AI settings to update (temperature, maxTokens, etc.)
         * @response {UserSettings} - Updated user settings
         * @throws {Error} - If validation fails
         *
         * @example
         * ```typescript
         * const settings = await window.electronAPI.invoke('settings:updateAI', {
         *   updates: { temperature: 0.9, maxTokens: 4096 }
         * });
         * ```
         */
        'settings:updateAI': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const manager = getManager();
                const settings = await manager.updateAI(request.updates);
                console.log('[IPC:settings:updateAI] Updated AI settings');
                return settings;
            } catch (error: any) {
                console.error('[IPC:settings:updateAI] Failed:', error);
                throw new Error(error.message || 'Failed to update AI settings');
            }
        },

        /**
         * settings:updateUI - Update UI settings
         *
         * @channel settings:updateUI
         * @request {Object} request
         * @request.updates {Partial<UISettings>} - UI settings to update (theme, wordCloud, etc.)
         * @response {UserSettings} - Updated user settings
         * @throws {Error} - If validation fails
         *
         * @example
         * ```typescript
         * const settings = await window.electronAPI.invoke('settings:updateUI', {
         *   updates: { theme: 'dark', notifications: true }
         * });
         * ```
         */
        'settings:updateUI': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const manager = getManager();
                const settings = await manager.updateUI(request.updates);
                console.log('[IPC:settings:updateUI] Updated UI settings');
                return settings;
            } catch (error: any) {
                console.error('[IPC:settings:updateUI] Failed:', error);
                throw new Error(error.message || 'Failed to update UI settings');
            }
        },

        /**
         * settings:updateProposals - Update proposal settings
         *
         * @channel settings:updateProposals
         * @request {Object} request
         * @request.updates {Partial<ProposalSettings>} - Proposal settings to update (matchWeight, recencyWeight, etc.)
         * @response {UserSettings} - Updated user settings
         * @throws {Error} - If validation fails
         *
         * @example
         * ```typescript
         * const settings = await window.electronAPI.invoke('settings:updateProposals', {
         *   updates: { matchWeight: 0.8, recencyWeight: 0.2, minJaccard: 0.3 }
         * });
         * ```
         */
        'settings:updateProposals': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const manager = getManager();
                const settings = await manager.updateProposals(request.updates);
                console.log('[IPC:settings:updateProposals] Updated proposal settings');
                return settings;
            } catch (error: any) {
                console.error('[IPC:settings:updateProposals] Failed:', error);
                throw new Error(error.message || 'Failed to update proposal settings');
            }
        },

        /**
         * settings:setDefaultModel - Convenience method to set default AI model
         */
        'settings:setDefaultModel': async (
            event: IpcMainInvokeEvent,
            request: { modelId: string | null }
        ) => {
            try {
                const manager = getManager();
                const settings = await manager.updateAI({ defaultModelId: request.modelId || undefined });
                console.log('[IPC:settings:setDefaultModel] Set default model to', request.modelId);
                return settings;
            } catch (error: any) {
                console.error('[IPC:settings:setDefaultModel] Failed:', error);
                throw new Error(error.message || 'Failed to set default model');
            }
        },

        /**
         * settings:setTheme - Convenience method to set UI theme
         */
        'settings:setTheme': async (
            event: IpcMainInvokeEvent,
            request: { theme: 'dark' | 'light' }
        ) => {
            try {
                const manager = getManager();
                const settings = await manager.updateUI({ theme: request.theme });
                console.log('[IPC:settings:setTheme] Set theme to', request.theme);
                return settings;
            } catch (error: any) {
                console.error('[IPC:settings:setTheme] Failed:', error);
                throw new Error(error.message || 'Failed to set theme');
            }
        }
    };
}
