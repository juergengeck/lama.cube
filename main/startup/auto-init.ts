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
    const storageDir = (global as any).lamaConfig?.instance?.directory || path.join(process.cwd(), 'OneDB');
    const existingSettings = detectExistingInstance(storageDir);

    if (existingSettings) {
      console.log('[AutoInit] Detected existing instance, attempting auto-recovery...');

      // Extract username from email (everything before @)
      const username = existingSettings.email.split('@')[0];

      // Try to initialize with the stored credentials
      // Use 'demo' as password for now - this is the default for local instances
      try {
        await nodeProvisioning.provision({
          user: {
            name: username,
            password: 'demo'  // Default password for auto-provisioned instances
          }
        });

        console.log('[AutoInit] Successfully recovered existing instance');
        return { success: true, recovered: true };
      } catch (initError) {
        console.error('[AutoInit] Failed to auto-initialize existing instance:', initError);
        // Fall through to manual setup
      }
    }

    // No existing instance or auto-init failed
    console.log('[AutoInit] Waiting for user login to initialize Node.js instance');
    return { success: false, needsSetup: true, waitingForUser: true };

  } catch (error) {
    console.error('[AutoInit] Auto-initialization check failed:', error);
    return { success: false, error: (error as Error).message, needsSetup: true };
  }
}

export { autoInitialize, detectExistingInstance }