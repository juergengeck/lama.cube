import type { ConnectionsModel } from '@refinio/one.models/lib/models/index.js';
/**
 * IPC handlers for device management
 */

import electron from 'electron';
const { ipcMain, app } = electron;
import deviceManager from '../../core/device-manager.js';
import nodeOneCore from '../../core/node-one-core.js';
import oneCoreHandlers from './one-core.js';
import type { IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import path from 'path';

interface DeviceInfo {
  name?: string;
  type?: string;
  capabilities?: any[];
  [key: string]: any;
}

interface MessageToDevice {
  deviceId: string;
  message: any;
}

interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  invitation?: {
    url: string;
    token: string;
  };
  device?: any;
  invite?: any;
  devices?: any[];
  config?: any;
  status?: any;
  connections?: any;
  instance?: any;
  trustLevels?: Record<string, TrustLevel>;
  [key: string]: any;
}

type TrustLevel = 'me' | 'trusted' | 'low' | 'unknown';

interface TrustLevelsStore {
  [instanceId: string]: TrustLevel;
}

// Trust levels storage
let trustLevelsStore: TrustLevelsStore = {};
let trustLevelsPath: string;

/**
 * Get path to trust levels file
 */
function getTrustLevelsPath(): string {
  if (!trustLevelsPath) {
    const userDataPath = app.getPath('userData');
    trustLevelsPath = path.join(userDataPath, 'trust-levels.json');
  }
  return trustLevelsPath;
}

/**
 * Load trust levels from disk
 */
function loadTrustLevels(): TrustLevelsStore {
  try {
    const filePath = getTrustLevelsPath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      trustLevelsStore = JSON.parse(data);
      console.log('[DeviceHandlers] Loaded trust levels from disk');
    }
  } catch (error) {
    console.error('[DeviceHandlers] Failed to load trust levels:', error);
  }
  return trustLevelsStore;
}

/**
 * Save trust levels to disk
 */
function saveTrustLevels(): void {
  try {
    const filePath = getTrustLevelsPath();
    fs.writeFileSync(filePath, JSON.stringify(trustLevelsStore, null, 2), 'utf8');
    console.log('[DeviceHandlers] Saved trust levels to disk');
  } catch (error) {
    console.error('[DeviceHandlers] Failed to save trust levels:', error);
  }
}

/**
 * Initialize device IPC handlers
 */
function initializeDevicePlans() {
  /**
   * Create an invitation for pairing
   * Delegates to IOMHandler for proper IoM/IoP support
   */
  ipcMain.handle('invitation:create', async (event: IpcMainInvokeEvent, mode?: 'IoM' | 'IoP'): Promise<IpcResponse> => {
    try {
      // Delegate to ConnectionHandler
      const connectionHandlers = (await import('./connection.js')).default
      return await connectionHandlers.createPairingInvitation(event, mode)
    } catch (error) {
      console.error('[DeviceHandlers] Failed to create invitation:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Register a new device
   */
  ipcMain.handle('devices:register', async (event: IpcMainInvokeEvent, deviceInfo: DeviceInfo): Promise<IpcResponse> => {
    try {
      console.log('[DeviceHandlers] Registering new device:', deviceInfo)

      // Ensure Node.js instance is initialized
      if (!nodeOneCore.initialized) {
        throw new Error('Node.js instance not initialized')
      }

      const result = await deviceManager.registerDevice(deviceInfo)

      return {
        success: true,
        device: result.device,
        invite: result.invite
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to register device:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Get all registered devices
   */
  ipcMain.handle('devices:list', async (): Promise<IpcResponse> => {
    try {
      const devices = deviceManager.getAllDevices()
      return {
        success: true,
        devices
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to list devices:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Get connected devices
   */
  ipcMain.handle('devices:connected', async (): Promise<IpcResponse> => {
    try {
      // Get contacts from Node.js ONE.core instead of device manager
      const result = await oneCoreHandlers.getContacts()

      if (result.success) {
        return {
          success: true,
          devices: result.contacts
        }
      } else {
        return result
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to get connected devices:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Remove a device
   */
  ipcMain.handle('devices:remove', async (event: IpcMainInvokeEvent, deviceId: string): Promise<IpcResponse> => {
    try {
      const removed = await deviceManager.removeDevice(deviceId)
      return {
        success: removed
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to remove device:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Get device configuration
   */
  ipcMain.handle('devices:config', async (event: IpcMainInvokeEvent, deviceId: string): Promise<IpcResponse> => {
    try {
      const config = deviceManager.getDeviceConfig(deviceId)
      if (!config) {
        throw new Error('Device not found')
      }

      return {
        success: true,
        config
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to get device config:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Send message to specific device
   */
  ipcMain.handle('devices:send', async (event: IpcMainInvokeEvent, { deviceId, message }: MessageToDevice): Promise<IpcResponse> => {
    try {
      const sent = deviceManager.sendToDevice(deviceId, message)
      return {
        success: sent
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to send to device:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Broadcast to all devices
   */
  ipcMain.handle('devices:broadcast', async (event: IpcMainInvokeEvent, message: any): Promise<IpcResponse> => {
    try {
      deviceManager.broadcastToDevices(message)
      return {
        success: true
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to broadcast:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Get connections model status and info
   */
  ipcMain.handle('connections:status', async (): Promise<IpcResponse> => {
    try {
      const status = {
        nodeInitialized: nodeOneCore.initialized,
        connectionsModel: !!nodeOneCore.connectionsModel,
        pairingAvailable: !!(nodeOneCore.connectionsModel?.pairing),
        instanceId: nodeOneCore.ownerId,
        instanceName: nodeOneCore.instanceName,
        config: nodeOneCore.getState('capabilities.network') || {}
      }

      return {
        success: true,
        status
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to get connections status:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Get connection info from Node.js ConnectionsModel
   */
  ipcMain.handle('connections:info', async (): Promise<IpcResponse> => {
    try {
      if (!nodeOneCore.initialized || !nodeOneCore.connectionsModel) {
        return {
          success: false,
          error: 'ConnectionsModel not available'
        }
      }

      const connectionsInfo = nodeOneCore.connectionsModel.connectionsInfo()

      return {
        success: true,
        connections: connectionsInfo
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to get connections info:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Get instance information (combined handler for both instance:info and devices:getInstanceInfo)
   */
  const getInstanceInfo = async (): Promise<IpcResponse> => {
    try {
      // Comprehensive instance info that works for both use cases
      const instanceInfo = {
        success: true,
        // Basic info
        id: nodeOneCore.ownerId,
        name: nodeOneCore.instanceName,
        type: 'electron-main',
        platform: 'nodejs',
        role: 'hub',
        // Status info
        initialized: nodeOneCore.initialized === true,
        nodeInitialized: nodeOneCore.initialized === true,
        hasConnectionsModel: !!nodeOneCore.connectionsModel,
        hasPairing: !!nodeOneCore.connectionsModel?.pairing,
        ownerId: nodeOneCore.ownerId,
        instanceName: nodeOneCore.instanceName,
        // Capabilities
        capabilities: {
          network: nodeOneCore.getState('capabilities.network'),
          storage: nodeOneCore.getState('capabilities.storage'),
          llm: nodeOneCore.getState('capabilities.llm')
        },
        // Devices
        devices: deviceManager.getAllDevices(),
        // For legacy compatibility
        instance: {
          id: nodeOneCore.ownerId,
          name: nodeOneCore.instanceName,
          type: 'electron-main',
          platform: 'nodejs',
          role: 'hub',
          initialized: nodeOneCore.initialized,
          capabilities: {
            network: nodeOneCore.getState('capabilities.network'),
            storage: nodeOneCore.getState('capabilities.storage'),
            llm: nodeOneCore.getState('capabilities.llm')
          },
          devices: deviceManager.getAllDevices()
        }
      }

      console.log('[DeviceHandlers] Instance info:', JSON.stringify({
        initialized: instanceInfo.initialized,
        ownerId: instanceInfo.ownerId,
        instanceName: instanceInfo.instanceName
      }, null, 2))

      return instanceInfo
    } catch (error) {
      console.error('[DeviceHandlers] Failed to get instance info:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  // Register both handler names for compatibility
  ipcMain.handle('devices:getInstanceInfo', getInstanceInfo)
  ipcMain.handle('instance:info', getInstanceInfo)

  /**
   * Get trust levels for all instances
   */
  ipcMain.handle('devices:getTrustLevels', async (): Promise<IpcResponse> => {
    try {
      // Load from disk on first access
      if (Object.keys(trustLevelsStore).length === 0) {
        loadTrustLevels();
      }

      return {
        success: true,
        trustLevels: trustLevelsStore
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to get trust levels:', error);
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })

  /**
   * Set trust level for a specific instance
   */
  ipcMain.handle('devices:setTrustLevel', async (
    event: IpcMainInvokeEvent,
    params: { instanceId: string; trustLevel: TrustLevel }
  ): Promise<IpcResponse> => {
    try {
      const { instanceId, trustLevel } = params;

      console.log(`[DeviceHandlers] Setting trust level for ${instanceId} to ${trustLevel}`);

      // Validate trust level
      if (!['me', 'trusted', 'low', 'unknown'].includes(trustLevel)) {
        throw new Error(`Invalid trust level: ${trustLevel}`);
      }

      // Update in-memory store
      trustLevelsStore[instanceId] = trustLevel;

      // Persist to disk
      saveTrustLevels();

      // Settings sync for 'me' level instances
      if (trustLevel === 'me') {
        console.log(`[DeviceHandlers] Instance ${instanceId} now has 'me' level trust - settings will be shared`);
        // UserSettings are stored as ONE.core versioned objects with CHUM sync
        // So settings will automatically sync via CHUM protocol to all connected instances
        // No additional action needed - CHUM handles the sync automatically!
        console.log(`[DeviceHandlers] ✅ Settings sync enabled via CHUM for instance ${instanceId}`);
      } else {
        console.log(`[DeviceHandlers] Instance ${instanceId} trust changed to '${trustLevel}' - settings sync disabled`);
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('[DeviceHandlers] Failed to set trust level:', error);
      return {
        success: false,
        error: (error as Error).message
      }
    }
  })
}

// Load trust levels on module initialization
loadTrustLevels();

export { initializeDevicePlans }