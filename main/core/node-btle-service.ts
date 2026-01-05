/**
 * NodeBTLEService - BTLE service for Electron main process
 *
 * Wraps @connection/btle node adapter to provide:
 * - BTLEDiscoveryService interface (for BTLEDiscoveryProvider - scanning/central mode)
 * - BTLEBroadcastService interface (for BTLEBroadcaster - advertising/peripheral mode)
 */

import type { BLEPlatformAdapter, DiscoveredBLEDevice } from '@connection/btle';
import type { BTLEDiscoveryService, BTLEDevice, BTLEScanOptions } from '@lama/connection.core';
import type { BTLEBroadcastService } from '@lama/connection.core';

// LAMA GATT Service UUID for P2P discovery
const LAMA_GATT_SERVICE = '9bdf81ee-8d22-40be-b075-9b5baf9c7880';

type EventCallback = (...args: any[]) => void;

/**
 * Node.js BTLE service implementation
 * Uses @abandonware/noble for scanning and @abandonware/bleno for advertising
 */
class NodeBTLEService implements BTLEDiscoveryService, BTLEBroadcastService {
  private adapter: BLEPlatformAdapter | null = null;
  private initialized = false;
  private scanning = false;
  private advertising = false;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Initialize BTLE adapter
   * Lazy-loads the node adapter to avoid issues if BTLE hardware unavailable
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Dynamically import to avoid loading native modules until needed
      const { createNodeAdapter } = await import('@connection/btle/adapters/node');
      this.adapter = createNodeAdapter();

      // Set up device discovery forwarding
      this.adapter.onDeviceDiscovered((device: DiscoveredBLEDevice) => {
        const btleDevice: BTLEDevice & { type?: string } = {
          id: device.id,
          name: device.name || undefined,
          rssi: device.rssi,
          serviceUUIDs: device.serviceUUIDs,
          manufacturerData: device.manufacturerData
            ? Buffer.from(device.manufacturerData).toString('hex')
            : undefined,
          isConnected: false,
          // Mark as LAMA device if it has our service UUID
          type: device.serviceUUIDs?.some(uuid =>
            uuid.toLowerCase().replace(/-/g, '') === LAMA_GATT_SERVICE.replace(/-/g, '')
          ) ? 'LAMA_APP' : undefined,
        };

        this.emit('deviceDiscovered', btleDevice);
      });

      // Set up state change forwarding
      this.adapter.onStateChange((state) => {
        console.log('[NodeBTLEService] BLE state changed:', state);
      });

      this.initialized = true;
      console.log('[NodeBTLEService] BTLE service initialized');
      return true;
    } catch (error) {
      console.warn('[NodeBTLEService] Failed to initialize BTLE:', error);
      return false;
    }
  }

  // ==================== BTLEDiscoveryService Interface ====================

  async startScan(options?: BTLEScanOptions): Promise<void> {
    if (!this.adapter) {
      throw new Error('BTLE not initialized');
    }
    if (this.scanning) return;

    const serviceUUIDs = options?.serviceUUIDs || [LAMA_GATT_SERVICE];
    await this.adapter.startScan(serviceUUIDs);
    this.scanning = true;
    console.log('[NodeBTLEService] Started BTLE scan for:', serviceUUIDs);
  }

  async stopScan(): Promise<void> {
    if (!this.adapter || !this.scanning) return;

    await this.adapter.stopScan();
    this.scanning = false;
    console.log('[NodeBTLEService] Stopped BTLE scan');
  }

  async cleanup(): Promise<void> {
    await this.stopScan();
    await this.stopAdvertising();
    if (this.adapter) {
      await this.adapter.destroy();
      this.adapter = null;
    }
    this.initialized = false;
    this.eventListeners.clear();
    console.log('[NodeBTLEService] Cleanup complete');
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.eventListeners.get(event)?.forEach(cb => {
      try {
        cb(...args);
      } catch (error) {
        console.error(`[NodeBTLEService] Error in ${event} handler:`, error);
      }
    });
  }

  // ==================== BTLEBroadcastService Interface ====================

  async startAdvertising(localName: string, serviceUUIDs: string[]): Promise<void> {
    if (!this.adapter) {
      throw new Error('BTLE not initialized');
    }
    if (this.advertising) return;

    await this.adapter.startAdvertising({
      localName,
      serviceUUIDs,
      characteristics: [
        // Basic discovery characteristic - just advertises presence
        {
          uuid: '9bdf81ee-8d22-40be-b075-9b5baf9c7881', // Discovery char UUID
          properties: { read: true },
          onRead: () => {
            // Return device name as UTF-8 bytes
            return new TextEncoder().encode(localName);
          },
        },
      ],
    });

    this.advertising = true;
    console.log('[NodeBTLEService] Started advertising as:', localName);
  }

  async stopAdvertising(): Promise<void> {
    if (!this.adapter || !this.advertising) return;

    await this.adapter.stopAdvertising();
    this.advertising = false;
    console.log('[NodeBTLEService] Stopped advertising');
  }

  async isAdvertising(): Promise<boolean> {
    return this.advertising;
  }

  // ==================== Status Methods ====================

  isScanning(): boolean {
    return this.scanning;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let btleServiceInstance: NodeBTLEService | null = null;

/**
 * Get the singleton BTLE service instance
 */
export function getNodeBTLEService(): NodeBTLEService {
  if (!btleServiceInstance) {
    btleServiceInstance = new NodeBTLEService();
  }
  return btleServiceInstance;
}

/**
 * Get BTLE service as BTLEDiscoveryService interface
 */
export function getBTLEDiscoveryService(): BTLEDiscoveryService {
  return getNodeBTLEService();
}

/**
 * Get BTLE service as BTLEBroadcastService interface
 */
export function getBTLEBroadcastService(): BTLEBroadcastService {
  return getNodeBTLEService();
}

export { NodeBTLEService };
