/**
 * Cube (Electron) UI Callbacks for connection.core
 *
 * Handles user interactions via Electron dialogs and notifications.
 */
import type { UICallbacks, PairingRequestUI, ErrorUI, ConnectionStateValue, PairingMethod } from '@lama/connection.core';
import { BrowserWindow, dialog, Notification } from 'electron';

export class CubeUICallbacks implements UICallbacks {
  constructor(private mainWindow?: BrowserWindow) {}

  async onPairingRequest(request: PairingRequestUI): Promise<boolean> {
    if (!this.mainWindow) {
      console.warn('[CubeUICallbacks] No main window available for pairing request');
      return false;
    }

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'question',
      title: 'Pairing Request',
      message: `Pairing request from ${request.peerName || 'Unknown'}`,
      detail: `Method: ${request.method}\nToken: ${request.token || 'N/A'}`,
      buttons: ['Accept', 'Reject'],
      defaultId: 0,
      cancelId: 1
    });

    return result.response === 0;
  }

  async onError(error: ErrorUI): Promise<void> {
    console.error('[CubeUICallbacks] Error:', error);

    if (this.mainWindow) {
      await dialog.showErrorBox(
        error.title || 'Connection Error',
        error.message
      );
    }

    // Also show as notification if supported
    if (Notification.isSupported()) {
      new Notification({
        title: error.title || 'Connection Error',
        body: error.message
      }).show();
    }
  }

  async onConnectionStateChange(peerId: string, state: ConnectionStateValue): Promise<void> {
    console.log(`[CubeUICallbacks] Connection state changed: ${peerId} -> ${state}`);

    // Show notification for important state changes
    if (state === 'connected' || state === 'disconnected') {
      if (Notification.isSupported()) {
        new Notification({
          title: 'Connection Update',
          body: `Peer ${peerId.substring(0, 8)} ${state}`
        }).show();
      }
    }

    // Send to renderer process via IPC if window available
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('connection:state-changed', {
        peerId,
        state
      });
    }
  }

  async onInvitationCreated(invitation: { url: string; method: PairingMethod }): Promise<void> {
    console.log('[CubeUICallbacks] Invitation created:', invitation);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('connection:invitation-created', invitation);
    }
  }
}
