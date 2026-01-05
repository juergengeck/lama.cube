/**
 * Connection IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to ConnectionPlan from ConnectionModule.
 * Business logic lives in @lama/connection.core via ModuleRegistry.
 * Platform-specific operations (fs, storage, events) handled here.
 */

import type { IpcMainInvokeEvent } from 'electron';
import type { ConnectionPlan } from '@lama/connection.core';
import nodeOneCore from '../../core/node-one-core.js';
import { getModuleRegistry } from '../../registry/module-registry-init.js';
import type { ConnectionModule } from '@lama/core/modules';

// Get web URL from global config
function getWebUrl(): string | undefined {
  return (global as any).lamaConfig?.web?.url;
}

/**
 * Get ConnectionPlan from ConnectionModule via ModuleRegistry
 * ConnectionModule properly wires all dependencies (TopicGroupManager, TrustPlan, etc.)
 */
function getConnectionPlan(): ConnectionPlan {
  const registry = getModuleRegistry();
  if (!registry) {
    throw new Error('[Connection IPC] ModuleRegistry not initialized');
  }

  const connectionModule = registry.getModule<ConnectionModule>('ConnectionModule');
  if (!connectionModule?.connectionPlan) {
    throw new Error('[Connection IPC] ConnectionModule or ConnectionPlan not available');
  }

  return connectionModule.connectionPlan;
}

/**
 * Get current instances and their states
 * Delegates to ConnectionPlan from ConnectionModule
 */
async function getInstances(event: IpcMainInvokeEvent) {
  const connectionPlan = getConnectionPlan();
  const result = await connectionPlan.getInstances({});
  return result.instances;
}

/**
 * Create a pairing invitation
 * Delegates to ConnectionPlan from ConnectionModule
 * Supports both IoM (device) and IoP (partner) modes
 */
async function createPairingInvitation(event: IpcMainInvokeEvent, mode?: 'IoM' | 'IoP') {
  console.log('[Connection IPC] 📝 createPairingInvitation called, mode:', mode || 'IoP (default)');
  const connectionPlan = getConnectionPlan();
  const webUrl = getWebUrl();
  console.log('[Connection IPC] webUrl:', webUrl);
  const result = await connectionPlan.createPairingInvitation({ mode, webUrl });
  console.log('[Connection IPC] createPairingInvitation result:', {
    success: result.success,
    hasUrl: !!result.invitation?.url,
    mode: result.invitation?.mode,
    error: result.error
  });

  // DEBUG: Check activeInvitations state after creation
  const pairing = nodeOneCore.connectionsModel?.pairing;
  if (pairing) {
    const activeInvitations = (pairing as any).activeInvitations;
    console.log('[Connection IPC] 🔍 DEBUG: activeInvitations size:', activeInvitations?.size || 0);
    if (activeInvitations?.size > 0) {
      const tokens = Array.from(activeInvitations.keys());
      console.log('[Connection IPC] 🔍 DEBUG: stored tokens:', tokens.map((t: string) => t.substring(0, 20) + '...'));
    }
  }

  return result;
}

/**
 * Accept a pairing invitation
 * Delegates to ConnectionPlan from ConnectionModule
 */
async function acceptPairingInvitation(event: IpcMainInvokeEvent, invitationUrl: string) {
  console.log('[Connection IPC] 📥 acceptPairingInvitation called');
  console.log('[Connection IPC] invitationUrl length:', invitationUrl.length);
  console.log('[Connection IPC] invitationUrl prefix:', invitationUrl.substring(0, 80) + '...');
  const connectionPlan = getConnectionPlan();
  try {
    const result = await connectionPlan.acceptPairingInvitation({ invitationUrl });
    console.log('[Connection IPC] acceptPairingInvitation result:', {
      success: result.success,
      message: result.message,
      error: result.error
    });
    return result;
  } catch (error) {
    console.error('[Connection IPC] ❌ acceptPairingInvitation error:', error);
    throw error;
  }
}

/**
 * Get connection status
 * Delegates to ConnectionPlan from ConnectionModule
 */
async function getConnectionStatus(event: IpcMainInvokeEvent) {
  const connectionPlan = getConnectionPlan();
  return await connectionPlan.getConnectionStatus({});
}

/**
 * Get data statistics (storage, objects, etc.)
 * TODO: Implement proper stats calculation
 */
async function getDataStats(event: IpcMainInvokeEvent) {
  try {
    return {
      success: true,
      data: {
        totalObjects: 0,
        messages: 0,
        files: 0,
        contacts: 0,
        conversations: 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Subscribe to ONE.core events for real-time updates
 * Uses one.models event emitters instead of custom tracking
 */
function subscribeToEvents(callback: (event: any) => void) {
  if (!nodeOneCore.connectionsModel) {
    console.warn('[Connection] ConnectionsModel not available for event subscription');
    return;
  }

  // Use one.models events directly
  // @ts-expect-error - ConnectionsModel extends EventEmitter but types are incomplete
  nodeOneCore.connectionsModel.on('connection:open', (data: any) => {
    callback({
      type: 'connection:open',
      data
    });
  });

  // @ts-expect-error - ConnectionsModel extends EventEmitter but types are incomplete
  nodeOneCore.connectionsModel.on('connection:closed', (data: any) => {
    callback({
      type: 'connection:closed',
      data
    });
  });

  // @ts-expect-error - ConnectionsModel extends EventEmitter but types are incomplete
  nodeOneCore.connectionsModel.on('connection:error', (data: any) => {
    callback({
      type: 'connection:error',
      data
    });
  });

  // ChannelManager sync events
  if (nodeOneCore.channelManager) {
    // @ts-expect-error - ChannelManager extends EventEmitter but types are incomplete
    nodeOneCore.channelManager.on('sync:progress', (data: any) => {
      callback({
        type: 'sync:progress',
        data
      });
    });

    // @ts-expect-error - ChannelManager extends EventEmitter but types are incomplete
    nodeOneCore.channelManager.on('sync:completed', (data: any) => {
      callback({
        type: 'sync:completed',
        data
      });
    });
  }

  console.log('[Connection] Subscribed to ONE.core events');
}

export default {
  getInstances,
  createPairingInvitation,
  acceptPairingInvitation,
  getConnectionStatus,
  getDataStats,
  subscribeToEvents
};

// Export connectionPlan getter for other modules that need it
export function getConnectionPlanFromModule(): ConnectionPlan | null {
  try {
    return getConnectionPlan();
  } catch {
    return null;
  }
}
