/**
 * IPC-based Settings Storage Adapter for Electron Renderer
 *
 * Implements SettingsStorage interface from @refinio/settings.core
 * by wrapping IPC calls to the main process UserSettingsManager.
 *
 * This adapter bridges the settings.core React hooks with
 * lama.cube's ONE.core-based settings storage in the main process.
 */

import type {
  SettingsStorage,
  UserSettings,
  AISettings,
  UISettings,
  ProposalSettings,
  DeviceSettings,
  NetworkSettings,
  PrivacySettings,
  ChatSettings,
} from '@refinio/settings.core';

type SettingsListener = (settings: UserSettings) => void;

/**
 * IPC-based storage adapter for Electron renderer process
 *
 * @example
 * ```typescript
 * const storage = new IPCSettingsStorage();
 * const settings = await storage.get();
 * await storage.updateAI({ temperature: 0.8 });
 * ```
 */
export class IPCSettingsStorage implements SettingsStorage {
  private listeners: Set<SettingsListener> = new Set();
  private cachedSettings: UserSettings | null = null;

  async get(): Promise<UserSettings> {
    const settings = await window.electronAPI.invoke('settings:get', {});
    this.cachedSettings = settings;
    return settings;
  }

  async update(settings: Partial<UserSettings>): Promise<UserSettings> {
    // Use category-specific updates for known categories
    // This is a full update, so we need to call each category update
    const current = await this.get();

    if (settings.ai) {
      await this.updateAI(settings.ai);
    }
    if (settings.ui) {
      await this.updateUI(settings.ui);
    }
    if (settings.proposals) {
      await this.updateProposals(settings.proposals);
    }
    if (settings.device) {
      await this.updateDevice(settings.device);
    }
    if (settings.network) {
      await this.updateNetwork(settings.network);
    }
    if (settings.privacy) {
      await this.updatePrivacy(settings.privacy);
    }
    if (settings.chat) {
      await this.updateChat(settings.chat);
    }

    // Return updated settings
    return this.get();
  }

  async updateAI(ai: Partial<AISettings>): Promise<UserSettings> {
    const updated = await window.electronAPI.invoke('settings:updateAI', { updates: ai });
    this.cachedSettings = updated;
    this.notifyListeners(updated);
    return updated;
  }

  async updateUI(ui: Partial<UISettings>): Promise<UserSettings> {
    const updated = await window.electronAPI.invoke('settings:updateUI', { updates: ui });
    this.cachedSettings = updated;
    this.notifyListeners(updated);
    return updated;
  }

  async updateProposals(proposals: Partial<ProposalSettings>): Promise<UserSettings> {
    const updated = await window.electronAPI.invoke('settings:updateProposals', { updates: proposals });
    this.cachedSettings = updated;
    this.notifyListeners(updated);
    return updated;
  }

  async updateDevice(device: Partial<DeviceSettings>): Promise<UserSettings> {
    // Device settings are optional - if IPC handler exists, use it
    // Otherwise fall back to generic update
    try {
      const updated = await window.electronAPI.invoke('settings:updateDevice', { updates: device });
      this.cachedSettings = updated;
      this.notifyListeners(updated);
      return updated;
    } catch (error: any) {
      // IPC handler doesn't exist yet - this category is optional for cube
      console.warn('[IPCSettingsStorage] updateDevice not implemented yet:', error.message);
      throw new Error('Device settings update not supported in this platform');
    }
  }

  async updateNetwork(network: Partial<NetworkSettings>): Promise<UserSettings> {
    try {
      const updated = await window.electronAPI.invoke('settings:updateNetwork', { updates: network });
      this.cachedSettings = updated;
      this.notifyListeners(updated);
      return updated;
    } catch (error: any) {
      console.warn('[IPCSettingsStorage] updateNetwork not implemented yet:', error.message);
      throw new Error('Network settings update not supported in this platform');
    }
  }

  async updatePrivacy(privacy: Partial<PrivacySettings>): Promise<UserSettings> {
    try {
      const updated = await window.electronAPI.invoke('settings:updatePrivacy', { updates: privacy });
      this.cachedSettings = updated;
      this.notifyListeners(updated);
      return updated;
    } catch (error: any) {
      console.warn('[IPCSettingsStorage] updatePrivacy not implemented yet:', error.message);
      throw new Error('Privacy settings update not supported in this platform');
    }
  }

  async updateChat(chat: Partial<ChatSettings>): Promise<UserSettings> {
    try {
      const updated = await window.electronAPI.invoke('settings:updateChat', { updates: chat });
      this.cachedSettings = updated;
      this.notifyListeners(updated);
      return updated;
    } catch (error: any) {
      console.warn('[IPCSettingsStorage] updateChat not implemented yet:', error.message);
      throw new Error('Chat settings update not supported in this platform');
    }
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(settings: UserSettings): void {
    this.listeners.forEach((listener) => {
      try {
        listener(settings);
      } catch (error) {
        console.error('[IPCSettingsStorage] Listener error:', error);
      }
    });
  }
}
