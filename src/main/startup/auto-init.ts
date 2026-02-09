/**
 * Auto-initialization on startup
 * Tries to recover existing instances or prompts for setup
 */

import fs from 'fs';
import path from 'path';
import nodeOneCore from '../core/node-one-core.js';
import nodeProvisioning from '../services/node-provisioning.js';

interface AutoInitResult {
  success: boolean;
  needsSetup?: boolean;
  waitingForUser?: boolean;
  recovered?: boolean;
  error?: string;
}

interface StoredSettings {
  email: string;
  instance: string;
}

/**
 * Check if a valid ONE.core instance exists in the storage directory
 */
function detectExistingInstance(storageDir: string): StoredSettings | null {
  const settingsPath = path.join(storageDir, 'SettingsStore');

  if (!fs.existsSync(settingsPath)) {
    console.log('[AutoInit] No SettingsStore found at:', settingsPath);
    return null;
  }

  try {
    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content) as StoredSettings;

    if (!settings.email || !settings.instance) {
      console.log('[AutoInit] SettingsStore missing required fields');
      return null;
    }

    console.log('[AutoInit] Found existing instance:', settings.instance, 'email:', settings.email);
    return settings;
  } catch (error) {
    console.error('[AutoInit] Failed to read SettingsStore:', error);
    return null;
  }
}

async function autoInitialize(): Promise<AutoInitResult> {
  console.log('[AutoInit] Checking for existing instances...');

  try {
    const storageDir = global.lamaConfig?.instance?.directory || path.join(process.cwd(), 'OneDB');
    const existingSettings = detectExistingInstance(storageDir);

    if (existingSettings) {
      // Just detect existing instance, don't auto-provision
      // User must explicitly login with their password
      console.log('[AutoInit] Found existing instance, waiting for user login');
      return { success: false, needsSetup: false, waitingForUser: true };
    }

    // No existing instance
    console.log('[AutoInit] No existing instance, waiting for user login');
    return { success: false, needsSetup: true, waitingForUser: true };

  } catch (error) {
    console.error('[AutoInit] Auto-initialization check failed:', error);
    return { success: false, error: (error as Error).message, needsSetup: true };
  }
}

export { autoInitialize, detectExistingInstance }