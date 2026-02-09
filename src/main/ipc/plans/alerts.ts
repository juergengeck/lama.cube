/**
 * Alerts IPC Plans
 *
 * Handles alert-related IPC operations:
 * - Dock badge updates (macOS)
 * - Future: Notification management
 */

import { app } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

/**
 * Update the dock badge count (macOS only)
 *
 * @param count - Number to display on dock badge. 0 clears the badge.
 */
async function updateDockBadge(
  _event: IpcMainInvokeEvent,
  { count }: { count: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (process.platform === 'darwin') {
      // macOS dock badge - empty string clears it
      app.dock.setBadge(count > 0 ? count.toString() : '');
    } else if (process.platform === 'win32') {
      // Windows uses overlay icon for badge - not implementing in initial version
      // Could use app.setAppUserModelId() and overlay icons
      console.log('[alerts] Windows badge not yet implemented, count:', count);
    } else if (process.platform === 'linux') {
      // Linux Unity/GNOME uses app.setBadgeCount()
      try {
        app.setBadgeCount(count);
      } catch (e) {
        // setBadgeCount may not be supported on all Linux DEs
        console.log('[alerts] Linux badge not supported on this desktop environment');
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[alerts] Failed to update dock badge:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clear the dock badge
 */
async function clearDockBadge(
  _event: IpcMainInvokeEvent
): Promise<{ success: boolean; error?: string }> {
  return updateDockBadge(_event, { count: 0 });
}

export const alertPlans = {
  'alerts:updateDockBadge': updateDockBadge,
  'alerts:clearDockBadge': clearDockBadge
};

export default alertPlans;
