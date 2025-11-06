/**
 * CHUM Handlers Plan (Thin Orchestrator)
 *
 * Electron-specific orchestrator for CHUM message handling.
 * Delegates business logic to connection.core, injects platform dependencies.
 *
 * Principles:
 * - Import handler from connection.core
 * - Inject Electron-specific dependencies (BrowserWindow, etc.)
 * - Minimal glue code only
 */

import { CHUMMessageHandler } from '@lama/connection.core/chum/CHUMMessageHandler.js';
import type LeuteModel from '@refinio/one.models/lib/models/Leute/LeuteModel.js';
import type ChannelManager from '@refinio/one.models/lib/models/ChannelManager.js';
import type TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';

export interface CHUMHandlerContext {
  leuteModel: LeuteModel;
  channelManager: ChannelManager;
  topicModel: TopicModel;
}

/**
 * CHUM Handlers Plan
 * Thin Electron orchestrator - delegates to connection.core
 */
export class CHUMHandlersPlan {
  async registerHandlers(context: CHUMHandlerContext): Promise<void> {
    console.log('[CHUMHandlersPlan] Orchestrating CHUM handler registration (Electron)...');

    // Create handler with injected Electron dependencies
    const handler = new CHUMMessageHandler({
      notifyUI: (event: string, data: any) => {
        // Inject Electron-specific UI notification
        const { BrowserWindow } = require('electron');
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send(event, data);
        });
      }
    });

    // Delegate to platform-agnostic handler
    await handler.registerHandlers(context);

    console.log('[CHUMHandlersPlan] ✅ CHUM handler registration complete (Electron)');
  }
}
