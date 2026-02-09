/**
 * Clear all app data and reset in-process
 *
 * Shuts down ONE.core gracefully, deletes storage, resets all singletons,
 * and reloads the renderer to the login screen — no process restart needed.
 */

import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import nodeOneCore from '../core/node-one-core.js';
import nodeProvisioning from '../services/node-provisioning.js';
import { resetAllIPCPlanSingletons } from '../ipc/plans/reset-all-singletons.js';
import mainApp from '../app.js';

// Track main window reference (set by entry point)
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export async function clearAppDataShared(): Promise<{ success: boolean; message?: string; error?: string }> {
  console.log('[ClearData] Starting app data reset...');

  try {
    const oneDbPath = global.lamaConfig?.instance.directory || path.join(process.cwd(), 'OneDB');

    // 1. Shut down ONE.core gracefully (stops connections, saves state, releases locks)
    try {
      await nodeOneCore.shutdown();
      console.log('[ClearData] ONE.core instance shut down');
    } catch (e) {
      console.warn('[ClearData] shutdown:', (e as Error).message);
    }

    // 2. Reset ONE.core singleton to clean state
    nodeOneCore.reset();

    // 3. Delete the storage directory
    if (fs.existsSync(oneDbPath)) {
      fs.rmSync(oneDbPath, { recursive: true, force: true });
      console.log('[ClearData] OneDB directory deleted');
    }

    // 4. Reset all IPC plan singletons (stale model references)
    resetAllIPCPlanSingletons();

    // 5. Reset provisioning so user can login fresh
    nodeProvisioning.resetProvisioningState();

    // 6. Reset MainApp state
    await mainApp.reinitialize();

    // 7. Reload the renderer to show login screen
    const win = mainWindow ?? BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      console.log('[ClearData] Reloading renderer...');
      win.webContents.reload();
    }

    console.log('[ClearData] App data cleared, ready for fresh login');
    return { success: true, message: 'App data cleared.' };

  } catch (error) {
    console.error('[ClearData] Error during reset:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to clear app data' };
  }
}
