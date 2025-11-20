/**
 * Word Cloud Settings IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to WordCloudSettingsHandler methods.
 * Business logic lives in ../../../lama.core/handlers/WordCloudSettingsHandler.ts
 */

import { WordCloudSettingsPlan } from '@lama/core/plans/WordCloudSettingsPlan.js';
import { WordCloudSettingsManager } from '@lama/core/models/settings/WordCloudSettingsManager.js';
import type { IpcMainInvokeEvent } from 'electron';

// Default settings matching WordCloudSettingsHandler interface
const DEFAULT_SETTINGS = {
  enabled: true,
  maxWords: 100,
  minFontSize: 12,
  maxFontSize: 64,
  colorScheme: 'viridis',
  layout: 'archimedean',
  padding: 2,
  spiral: 'archimedean'
};

// Singleton handler instance
let wordCloudSettingsHandler: WordCloudSettingsPlan | null = null;
let wordCloudSettingsManager: WordCloudSettingsManager | null = null;

/**
 * Get handler instance (creates on first use)
 */
function getHandler(nodeOneCore: any): WordCloudSettingsPlan {
  if (!wordCloudSettingsHandler) {
    if (!wordCloudSettingsManager) {
      wordCloudSettingsManager = WordCloudSettingsManager.getInstance();
    }
    wordCloudSettingsHandler = new WordCloudSettingsPlan(
      nodeOneCore,
      wordCloudSettingsManager,
      DEFAULT_SETTINGS
    );
  }
  return wordCloudSettingsHandler;
}

/**
 * Get word cloud settings for the current user
 */
export async function getWordCloudSettings(nodeOneCore: any) {
    return await getHandler(nodeOneCore).getWordCloudSettings({});
}

/**
 * Update word cloud settings for the current user
 */
export async function updateWordCloudSettings(nodeOneCore: any, updates: any) {
    return await getHandler(nodeOneCore).updateWordCloudSettings({ updates });
}

/**
 * Reset word cloud settings to defaults for the current user
 */
export async function resetWordCloudSettings(nodeOneCore: any) {
    return await getHandler(nodeOneCore).resetWordCloudSettings({});
}