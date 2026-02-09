// packages/lama.browser/browser-ui/src/modules/DeviceModule.ts
import type { Module } from '@refinio/api';

// Device core plans and adapters
import { NetworkDeviceInfoPlan, DevicePlan, DeviceDiscoveryPlan, QuicVCDiscoveryAdapter } from '@refinio/device.core';
import type { DiscoveryService } from '@refinio/connection.core';
import { DiscoveryServiceBridge } from '../adapters/DiscoveryServiceBridge';

/**
 * DeviceModule - Device discovery and management
 *
 * Provides:
 * - NetworkDeviceInfoPlan (manage network device information)
 * - DevicePlan (manage logical devices)
 * - DeviceDiscoveryPlan (orchestrate discovery)
 */
export class DeviceModule implements Module {
  readonly name = 'DeviceModule';

  static demands = [
    { targetType: 'OneCore', required: true },
    { targetType: 'DiscoveryService', required: true }
  ];

  static supplies = [
    { targetType: 'NetworkDeviceInfoPlan' },
    { targetType: 'DevicePlan' },
    { targetType: 'DeviceDiscoveryPlan' }
  ];

  private deps: {
    oneCore?: any;
    discoveryService?: DiscoveryService;
  } = {};

  // Device Plans
  public networkDeviceInfoPlan!: NetworkDeviceInfoPlan;
  public devicePlan!: DevicePlan;
  public deviceDiscoveryPlan!: DeviceDiscoveryPlan;

  // QuicVC Discovery Adapter (bridges connection.core to device.core)
  public quicvcAdapter!: QuicVCDiscoveryAdapter;
  private discoveryBridge!: DiscoveryServiceBridge;

  async init(): Promise<void> {
    if (!this.hasRequiredDeps()) {
      throw new Error('DeviceModule missing required dependencies');
    }

    const { oneCore, discoveryService } = this.deps;

    // Initialize device plans
    this.networkDeviceInfoPlan = new NetworkDeviceInfoPlan(oneCore);
    this.devicePlan = new DevicePlan(oneCore);
    this.deviceDiscoveryPlan = new DeviceDiscoveryPlan(
      oneCore,
      this.networkDeviceInfoPlan,
      this.devicePlan
    );

    // Initialize QuicVC discovery integration
    // Bridge connection.core's DiscoveryService to device.core's QuicVCDiscoveryAdapter
    this.discoveryBridge = new DiscoveryServiceBridge(discoveryService!);
    this.quicvcAdapter = new QuicVCDiscoveryAdapter(
      this.networkDeviceInfoPlan,
      {
        info: (msg: string) => console.log(`[QuicVCDiscoveryAdapter] ${msg}`),
        error: (msg: string, ...args: any[]) => console.error(`[QuicVCDiscoveryAdapter] ${msg}`, ...args)
      }
    );

    // Initialize the adapter with the bridge
    await this.quicvcAdapter.initialize(this.discoveryBridge);

    console.log('[DeviceModule] ✅ Initialized with QuicVC discovery integration');
  }

  async shutdown(): Promise<void> {
    // Shutdown QuicVC adapter
    await this.quicvcAdapter?.shutdown?.();

    // Plans don't have shutdown methods yet, but add them if needed
    console.log('[DeviceModule] Shutdown complete');
  }

  setDependency(targetType: string, instance: any): void {
    const key = targetType.charAt(0).toLowerCase() + targetType.slice(1);
    this.deps[key as keyof typeof this.deps] = instance;
  }

  emitSupplies(registry: any): void {
    registry.supply({ targetType: 'NetworkDeviceInfoPlan', instance: this.networkDeviceInfoPlan });
    registry.supply({ targetType: 'DevicePlan', instance: this.devicePlan });
    registry.supply({ targetType: 'DeviceDiscoveryPlan', instance: this.deviceDiscoveryPlan });
  }

  private hasRequiredDeps(): boolean {
    return !!this.deps.oneCore && !!this.deps.discoveryService;
  }
}
