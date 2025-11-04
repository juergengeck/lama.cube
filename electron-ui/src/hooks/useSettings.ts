/**
 * React Hook for Unified User Settings
 *
 * Provides easy access to UserSettings via IPC with automatic updates
 */

import { useState, useEffect, useCallback } from 'react';

// Type definitions for settings (matches main process types)
export interface UserSettings {
    $type$: 'UserSettings';
    userEmail: string;
    ai: {
        defaultModelId?: string;
        temperature: number;
        maxTokens: number;
        defaultProvider: string;
        autoSelectBestModel: boolean;
        preferredModelIds: string[];
        systemPrompt?: string;
        streamResponses: boolean;
        autoSummarize: boolean;
        enableMCP: boolean;
    };
    ui: {
        theme: 'dark' | 'light';
        notifications: boolean;
        wordCloud: {
            maxWordsPerSubject: number;
            relatedWordThreshold: number;
            minWordFrequency: number;
            showSummaryKeywords: boolean;
            fontScaleMin: number;
            fontScaleMax: number;
            colorScheme: string;
            layoutDensity: string;
        };
    };
    proposals: {
        matchWeight: number;
        recencyWeight: number;
        recencyWindow: number;
        minJaccard: number;
        maxProposals: number;
    };
    updatedAt: number;
}

export type AISettings = UserSettings['ai'];
export type UISettings = UserSettings['ui'];
export type ProposalSettings = UserSettings['proposals'];

interface UseSettingsResult {
    settings: UserSettings | null;
    loading: boolean;
    error: Error | null;
    updateAI: (updates: Partial<AISettings>) => Promise<UserSettings>;
    updateUI: (updates: Partial<UISettings>) => Promise<UserSettings>;
    updateProposals: (updates: Partial<ProposalSettings>) => Promise<UserSettings>;
    setDefaultModel: (modelId: string | null) => Promise<UserSettings>;
    setTheme: (theme: 'dark' | 'light') => Promise<UserSettings>;
    reload: () => Promise<void>;
}

/**
 * Hook for accessing and updating user settings
 *
 * @example
 * ```tsx
 * function SettingsPanel() {
 *   const { settings, loading, updateAI, setTheme } = useSettings();
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Current theme: {settings?.ui.theme}</p>
 *       <button onClick={() => setTheme('light')}>Light Mode</button>
 *       <button onClick={() => updateAI({ temperature: 0.9 })}>
 *         Set Temperature
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSettings(): UseSettingsResult {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Load settings from main process
     */
    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await window.electronAPI.invoke('settings:get', {});
            setSettings(result);
        } catch (err) {
            console.error('[useSettings] Failed to load:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Update AI settings
     */
    const updateAI = useCallback(async (updates: Partial<AISettings>): Promise<UserSettings> => {
        try {
            const result = await window.electronAPI.invoke('settings:updateAI', { updates });
            setSettings(result);
            return result;
        } catch (err) {
            console.error('[useSettings] Failed to update AI settings:', err);
            throw err;
        }
    }, []);

    /**
     * Update UI settings
     */
    const updateUI = useCallback(async (updates: Partial<UISettings>): Promise<UserSettings> => {
        try {
            const result = await window.electronAPI.invoke('settings:updateUI', { updates });
            setSettings(result);
            return result;
        } catch (err) {
            console.error('[useSettings] Failed to update UI settings:', err);
            throw err;
        }
    }, []);

    /**
     * Update proposal settings
     */
    const updateProposals = useCallback(async (updates: Partial<ProposalSettings>): Promise<UserSettings> => {
        try {
            const result = await window.electronAPI.invoke('settings:updateProposals', { updates });
            setSettings(result);
            return result;
        } catch (err) {
            console.error('[useSettings] Failed to update proposal settings:', err);
            throw err;
        }
    }, []);

    /**
     * Convenience method to set default AI model
     */
    const setDefaultModel = useCallback(async (modelId: string | null): Promise<UserSettings> => {
        try {
            const result = await window.electronAPI.invoke('settings:setDefaultModel', { modelId });
            setSettings(result);
            return result;
        } catch (err) {
            console.error('[useSettings] Failed to set default model:', err);
            throw err;
        }
    }, []);

    /**
     * Convenience method to set UI theme
     */
    const setTheme = useCallback(async (theme: 'dark' | 'light'): Promise<UserSettings> => {
        try {
            const result = await window.electronAPI.invoke('settings:setTheme', { theme });
            setSettings(result);
            return result;
        } catch (err) {
            console.error('[useSettings] Failed to set theme:', err);
            throw err;
        }
    }, []);

    /**
     * Reload settings from main process (force refresh)
     */
    const reload = useCallback(async () => {
        await loadSettings();
    }, [loadSettings]);

    // Load settings on mount
    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    return {
        settings,
        loading,
        error,
        updateAI,
        updateUI,
        updateProposals,
        setDefaultModel,
        setTheme,
        reload
    };
}
