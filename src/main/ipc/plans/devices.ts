import type { ConnectionsModel } from '@refinio/one.models/lib/models/index.js';
/**
 * IPC handlers for device management
 *
 * Trust levels are stored in ONE.core via TrustModel (not JSON files)
 */

import electron from 'electron';
const { ipcMain, app } = electron;
import deviceManager from '../../core/device-manager.js';
import nodeOneCore from '../../core/node-one-core.js';
import oneCoreHandlers from './one-core.js';
import connectionHandlers from './connection.js';
import { syncMonitor } from '../../services/sync-monitor.js';
import type { IpcMainInvokeEvent } from 'electron';
import dgram from 'dgram';
import { getTrustModel } from './trust.js';
import type { TrustLevel } from '@refinio/trust.core/types/trust-types.js';

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

// Trust levels are now stored in ONE.core via TrustModel
// TrustLevel type imported from @refinio/trust.core

/**
 * Initialize device IPC handlers
 */
function initializeDevicePlans(handle: (channel: string, handler: any) => void) {
  /**
   * Create an invitation for pairing
   * Delegates to IOMHandler for proper IoM/IoP support
   */
  handle('invitation:create', async (event: IpcMainInvokeEvent, mode?: 'IoM' | 'IoP'): Promise<IpcResponse> => {
    try {
      // Delegate to ConnectionHandler
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
  handle('devices:register', async (event: IpcMainInvokeEvent, deviceInfo: DeviceInfo): Promise<IpcResponse> => {
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
  handle('devices:list', async (): Promise<IpcResponse> => {
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
  handle('devices:connected', async (): Promise<IpcResponse> => {
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
  handle('devices:remove', async (event: IpcMainInvokeEvent, deviceId: string): Promise<IpcResponse> => {
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
  handle('devices:config', async (event: IpcMainInvokeEvent, deviceId: string): Promise<IpcResponse> => {
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
  handle('devices:send', async (event: IpcMainInvokeEvent, { deviceId, message }: MessageToDevice): Promise<IpcResponse> => {
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
  handle('devices:broadcast', async (event: IpcMainInvokeEvent, message: any): Promise<IpcResponse> => {
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
  handle('connections:status', async (): Promise<IpcResponse> => {
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
  handle('connections:info', async (): Promise<IpcResponse> => {
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
      // Get sync stats for traffic light visualization
      const stats = syncMonitor.getStats()
      const connections = syncMonitor.getConnections()

      // Get Device.displayName (single source of truth, same as mDNS)
      let displayName = nodeOneCore.instanceName  // Fallback
      const devicePlan = nodeOneCore.devicePlan
      const localDeviceIdHash = nodeOneCore.localDeviceIdHash
      if (devicePlan && localDeviceIdHash) {
        try {
          const result = await devicePlan.getDeviceWithNetworkInfo(localDeviceIdHash)
          if (result.success && result.device?.displayName) {
            displayName = result.device.displayName
          }
        } catch (e) {
          console.warn('[DeviceHandlers] Failed to get Device.displayName, using instanceName:', e)
        }
      }

      // Comprehensive instance info that works for both use cases
      const instanceInfo = {
        success: true,
        // Basic info - use instanceId for device identity (matches mDNS deviceId)
        id: nodeOneCore.instanceId,
        instanceId: nodeOneCore.instanceId,  // Device/instance ID (advertised via mDNS)
        ownerId: nodeOneCore.ownerId,        // Person/owner ID (different from instanceId!)
        name: displayName,                   // Device.displayName (same as mDNS)
        type: 'electron-main',
        platform: 'nodejs',
        role: 'hub',
        // Status info
        initialized: nodeOneCore.initialized === true,
        nodeInitialized: nodeOneCore.initialized === true,
        hasConnectionsModel: !!nodeOneCore.connectionsModel,
        hasPairing: !!nodeOneCore.connectionsModel?.pairing,
        instanceName: nodeOneCore.instanceName,
        // Capabilities
        capabilities: {
          network: nodeOneCore.getState('capabilities.network'),
          storage: nodeOneCore.getState('capabilities.storage'),
          llm: nodeOneCore.getState('capabilities.llm')
        },
        // Sync stats for traffic light visualization
        syncStats: stats,
        // Per-peer connection stats
        connections: connections,
        // Devices
        devices: deviceManager.getAllDevices(),
        // For legacy compatibility
        instance: {
          id: nodeOneCore.instanceId,           // Device/instance ID (matches mDNS)
          instanceId: nodeOneCore.instanceId,   // Device/instance ID
          ownerId: nodeOneCore.ownerId,         // Person/owner ID
          name: displayName,                    // Device.displayName (same as mDNS)
          type: 'electron-main',
          platform: 'nodejs',
          role: 'hub',
          initialized: nodeOneCore.initialized,
          hasPairing: !!nodeOneCore.connectionsModel?.pairing,
          capabilities: {
            network: nodeOneCore.getState('capabilities.network'),
            storage: nodeOneCore.getState('capabilities.storage'),
            llm: nodeOneCore.getState('capabilities.llm')
          },
          syncStats: stats,
          connections: connections,
          devices: deviceManager.getAllDevices()
        }
      }

      console.log('[DeviceHandlers] Instance info:', JSON.stringify({
        initialized: instanceInfo.initialized,
        instanceId: instanceInfo.instanceId,  // Device ID (advertised via mDNS)
        ownerId: instanceInfo.ownerId,        // Person ID (owner)
        name: instanceInfo.name,              // Device.displayName (same as mDNS)
        hasPairing: instanceInfo.hasPairing,
        instanceHasPairing: instanceInfo.instance?.hasPairing
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
  handle('devices:getInstanceInfo', getInstanceInfo)
  handle('instance:info', getInstanceInfo)

  /**
   * Simulate sync activity for testing visualization
   */
  handle('devices:simulateSyncActivity', async (
    event: IpcMainInvokeEvent,
    { peerId, peerName }: { peerId?: string; peerName?: string }
  ): Promise<IpcResponse> => {
    try {
      const id = peerId || 'test-peer-' + Date.now()
      const name = peerName || 'Test Peer'
      syncMonitor.simulateActivity(id, name)
      return { success: true, message: `Simulated activity for ${name}` }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * Get trust levels for all instances
   * Now uses TrustModel (ONE.core storage) instead of JSON file
   */
  handle('devices:getTrustLevels', async (): Promise<IpcResponse> => {
    try {
      if (!nodeOneCore.initialized) {
        return {
          success: true,
          trustLevels: {}
        }
      }

      const trustModel = getTrustModel();
      const trustLevels = await trustModel.getAllTrustLevels();

      return {
        success: true,
        trustLevels
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
   * Set trust level for a person (not a device/instance).
   *
   * IMPORTANT: Trust is assigned to PEOPLE, not devices.
   * - personId is SHA256IdHash<Person> - identifies the owner
   * - All devices owned by this person inherit the trust level
   * - CHUM filtering uses personId to determine sync permissions
   *
   * Trust levels:
   * - 'me': Own devices - full sync (contacts, chats, settings)
   * - 'trusted': Trusted contact - sync shared topics only
   * - 'low': Known but not trusted - minimal sync
   * - 'unknown': Not yet evaluated
   * - 'ignore': Blocked - no sync
   */
  handle('devices:setTrustLevel', async (
    event: IpcMainInvokeEvent,
    params: { instanceId: string; trustLevel: TrustLevel }  // instanceId is actually personId (legacy naming)
  ): Promise<IpcResponse> => {
    try {
      const { instanceId: personId, trustLevel } = params;

      console.log(`[DeviceHandlers] Setting trust level for person ${personId.substring(0, 8)}... to ${trustLevel}`);

      // Validate trust level
      if (!['me', 'trusted', 'low', 'unknown', 'ignore'].includes(trustLevel)) {
        throw new Error(`Invalid trust level: ${trustLevel}`);
      }

      if (!nodeOneCore.initialized) {
        throw new Error('ONE.core not initialized');
      }

      // Store in ONE.core via TrustModel - keyed by personId
      const trustModel = getTrustModel();
      await trustModel.setTrustLevelById(personId, trustLevel);

      // Settings sync for 'me' level (own devices)
      if (trustLevel === 'me') {
        console.log(`[DeviceHandlers] Person ${personId.substring(0, 8)}... now has 'me' level trust`);
        console.log(`[DeviceHandlers] ✅ Full sync enabled: contacts, chats, and settings will sync via CHUM`);
      } else if (trustLevel === 'trusted') {
        console.log(`[DeviceHandlers] Person ${personId.substring(0, 8)}... is now a trusted contact`);
        console.log(`[DeviceHandlers] ✅ Shared topic sync enabled via CHUM`);
      } else {
        console.log(`[DeviceHandlers] Person ${personId.substring(0, 8)}... trust changed to '${trustLevel}'`);
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

// Trust levels are now loaded on-demand from ONE.core via TrustModel
// No module initialization needed

/**
 * Send LED control command to ESP32 device via UDP
 * Protocol: [service_type_byte][json_payload]
 * Service type 3 = LED control
 */
async function sendESP32LEDControl(
  address: string,
  port: number,
  action: 'on' | 'off' | 'toggle',
  senderPersonId: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const SERVICE_TYPE_LED_CONTROL = 3;

    // Build the JSON payload
    const payload = JSON.stringify({
      requestId: `led-${Date.now()}`,
      senderPersonId,
      command: {
        action,
        manual: true
      }
    });

    // Create message: [service_type_byte][json_payload]
    const serviceTypeByte = Buffer.from([SERVICE_TYPE_LED_CONTROL]);
    const payloadBuffer = Buffer.from(payload, 'utf8');
    const message = Buffer.concat([serviceTypeByte, payloadBuffer]);

    const client = dgram.createSocket('udp4');

    // Set timeout
    const timeout = setTimeout(() => {
      client.close();
      resolve({ success: true }); // ESP32 doesn't send response for LED commands
    }, 1000);

    client.send(message, port, address, (err) => {
      clearTimeout(timeout);
      client.close();

      if (err) {
        console.error('[ESP32] Failed to send LED command:', err);
        resolve({ success: false, error: err.message });
      } else {
        console.log(`[ESP32] LED command sent: ${action} to ${address}:${port}`);
        resolve({ success: true });
      }
    });
  });
}

/**
 * Initialize ESP32 control IPC handlers
 */
function initializeESP32ControlPlans(handle: (channel: string, handler: any) => void): void {
  /**
   * Control ESP32 LED
   */
  handle('esp32:controlLED', async (
    _event: IpcMainInvokeEvent,
    params: { address: string; port: number; action: 'on' | 'off' | 'toggle' }
  ): Promise<IpcResponse> => {
    try {
      console.log(`[ESP32] LED control request: ${params.action} to ${params.address}:${params.port}`);

      // Get the owner's person ID from nodeOneCore
      const senderPersonId = nodeOneCore.ownerId;
      if (!senderPersonId) {
        return {
          success: false,
          error: 'Not logged in - cannot send authenticated LED command'
        };
      }

      const result = await sendESP32LEDControl(
        params.address,
        params.port,
        params.action,
        senderPersonId
      );

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      console.error('[ESP32] LED control error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  });

  console.log('[ESP32] Control IPC handlers registered');
}

export { initializeDevicePlans, initializeESP32ControlPlans }