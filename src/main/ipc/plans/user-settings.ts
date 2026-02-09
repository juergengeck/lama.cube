/**
 * IPC Handlers for Unified User Settings
 *
 * Uses SettingsPlan from settings.core for all settings operations.
 * API keys are stored locally in SettingsStore (not synced via CHUM).
 */

import type { IpcMainInvokeEvent } from 'electron';
import type { SettingsPlan } from '@refinio/settings.core';
import type nodeOneCore from '../../core/node-one-core.js';
import { getJournalPlan } from './journal.js';

export default function createUserSettingsHandlers(nodeOneCoreInstance: typeof nodeOneCore) {
    // Get SettingsPlan from nodeOneCore (created in module-registry-init.ts)
    function getPlan(): SettingsPlan {
        const plan = nodeOneCoreInstance.settingsPlan;
        if (!plan) {
            throw new Error('[UserSettings] SettingsPlan not initialized');
        }
        return plan;
    }

    return {
        /**
         * settings:get - Get all user settings
         */
        'settings:get': async (event: IpcMainInvokeEvent, request: {}) => {
            try {
                const plan = getPlan();
                const result = await plan.getAll();
                return result.settings;
            } catch (error: any) {
                console.error('[IPC:settings:get] Failed:', error);
                throw new Error(error.message || 'Failed to load settings');
            }
        },

        /**
         * settings:updateAI - Update AI settings
         */
        'settings:updateAI': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const plan = getPlan();
                await plan.updateAISettings(request.updates);
                const result = await plan.getAll();
                console.log('[IPC:settings:updateAI] Updated AI settings');
                return result.settings;
            } catch (error: any) {
                console.error('[IPC:settings:updateAI] Failed:', error);
                throw new Error(error.message || 'Failed to update AI settings');
            }
        },

        /**
         * settings:updateUI - Update UI settings
         */
        'settings:updateUI': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const plan = getPlan();
                await plan.updateUISettings(request.updates);
                const result = await plan.getAll();
                console.log('[IPC:settings:updateUI] Updated UI settings');
                return result.settings;
            } catch (error: any) {
                console.error('[IPC:settings:updateUI] Failed:', error);
                throw new Error(error.message || 'Failed to update UI settings');
            }
        },

        /**
         * settings:updateProposals - Update proposal settings
         */
        'settings:updateProposals': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const plan = getPlan();
                // Proposals are stored in 'proposals' section
                await plan.updateSection({ moduleId: 'proposals', values: request.updates });
                const result = await plan.getAll();
                console.log('[IPC:settings:updateProposals] Updated proposal settings');
                return result.settings;
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
                const plan = getPlan();
                await plan.updateAISettings({ defaultModelId: request.modelId || undefined });
                const result = await plan.getAll();
                console.log('[IPC:settings:setDefaultModel] Set default model to', request.modelId);
                return result.settings;
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
                const plan = getPlan();
                await plan.updateUISettings({ theme: request.theme });
                const result = await plan.getAll();
                console.log('[IPC:settings:setTheme] Set theme to', request.theme);
                return result.settings;
            } catch (error: any) {
                console.error('[IPC:settings:setTheme] Failed:', error);
                throw new Error(error.message || 'Failed to set theme');
            }
        },

        /**
         * settings:setApiKey - Set API key for a provider
         */
        'settings:setApiKey': async (
            event: IpcMainInvokeEvent,
            request: { provider: string; apiKey: string }
        ) => {
            try {
                const plan = getPlan();
                await plan.setApiKey(request.provider, request.apiKey);
                console.log('[IPC:settings:setApiKey] Set API key for', request.provider);

                // Record API key configuration in journal
                try {
                    const journalPlan = getJournalPlan();
                    // Mask the API key for the journal entry
                    const masked = request.apiKey.length > 8
                        ? `${request.apiKey.slice(0, 4)}...${request.apiKey.slice(-4)}`
                        : '****';
                    await journalPlan.recordApiKeyConfigured(request.provider, masked);
                } catch (journalErr) {
                    console.warn('[IPC:settings:setApiKey] Failed to record in journal:', journalErr);
                }

                return { success: true };
            } catch (error: any) {
                console.error('[IPC:settings:setApiKey] Failed:', error);
                throw new Error(error.message || 'Failed to set API key');
            }
        },

        /**
         * settings:getApiKey - Get API key for a provider
         */
        'settings:getApiKey': async (
            event: IpcMainInvokeEvent,
            request: { provider: string }
        ) => {
            try {
                const plan = getPlan();
                const apiKey = await plan.getApiKey(request.provider);
                return apiKey;
            } catch (error: any) {
                console.error('[IPC:settings:getApiKey] Failed:', error);
                throw new Error(error.message || 'Failed to get API key');
            }
        },

        /**
         * settings:removeApiKey - Remove API key for a provider
         */
        'settings:removeApiKey': async (
            event: IpcMainInvokeEvent,
            request: { provider: string }
        ) => {
            try {
                const plan = getPlan();
                await plan.removeApiKey(request.provider);
                console.log('[IPC:settings:removeApiKey] Removed API key for', request.provider);
                return { success: true };
            } catch (error: any) {
                console.error('[IPC:settings:removeApiKey] Failed:', error);
                throw new Error(error.message || 'Failed to remove API key');
            }
        },

        /**
         * settings:getAllApiKeys - Get all API keys
         */
        'settings:getAllApiKeys': async (
            event: IpcMainInvokeEvent,
            request: {}
        ) => {
            try {
                const plan = getPlan();
                const apiKeys = await plan.getAllApiKeys();
                return apiKeys;
            } catch (error: any) {
                console.error('[IPC:settings:getAllApiKeys] Failed:', error);
                throw new Error(error.message || 'Failed to get API keys');
            }
        },

        /**
         * settings:getNetwork - Get network settings
         */
        'settings:getNetwork': async (
            event: IpcMainInvokeEvent,
            request: {}
        ) => {
            try {
                const plan = getPlan();
                const network = await plan.getNetworkSettings();
                return { success: true, data: network };
            } catch (error: any) {
                console.error('[IPC:settings:getNetwork] Failed:', error);
                return { success: false, error: error.message };
            }
        },

        /**
         * settings:updateNetwork - Update network settings
         */
        'settings:updateNetwork': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const plan = getPlan();
                await plan.updateNetworkSettings(request.updates);
                const network = await plan.getNetworkSettings();
                console.log('[IPC:settings:updateNetwork] Updated network settings');
                return { success: true, data: network };
            } catch (error: any) {
                console.error('[IPC:settings:updateNetwork] Failed:', error);
                return { success: false, error: error.message };
            }
        },

        /**
         * settings:getPrivacy - Get privacy settings
         */
        'settings:getPrivacy': async (
            event: IpcMainInvokeEvent,
            request: {}
        ) => {
            try {
                const plan = getPlan();
                const privacy = await plan.getPrivacySettings();
                return { success: true, data: privacy };
            } catch (error: any) {
                console.error('[IPC:settings:getPrivacy] Failed:', error);
                return { success: false, error: error.message };
            }
        },

        /**
         * settings:updatePrivacy - Update privacy settings
         */
        'settings:updatePrivacy': async (
            event: IpcMainInvokeEvent,
            request: { updates: any }
        ) => {
            try {
                const plan = getPlan();
                await plan.updatePrivacySettings(request.updates);
                const privacy = await plan.getPrivacySettings();
                console.log('[IPC:settings:updatePrivacy] Updated privacy settings');
                return { success: true, data: privacy };
            } catch (error: any) {
                console.error('[IPC:settings:updatePrivacy] Failed:', error);
                return { success: false, error: error.message };
            }
        }
    };
}
