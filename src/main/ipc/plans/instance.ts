/**
 * Instance IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to InstanceRegistryPlan from InstanceModule.
 * Business logic lives in @refinio/lama.core/plans/InstanceRegistryPlan.ts
 */

import type { IpcMainInvokeEvent } from 'electron';
import type { InstanceRegistryPlan } from '@refinio/lama.core/plans/InstanceRegistryPlan.js';
import { getModuleRegistry } from '../../registry/module-registry-init.js';
import type { InstanceModule } from '@refinio/lama.core/modules';
import nodeOneCore from '../../core/node-one-core.js';

/**
 * Get InstanceRegistryPlan from InstanceModule via ModuleRegistry
 */
function getInstanceRegistryPlan(): InstanceRegistryPlan {
  const registry = getModuleRegistry();
  if (!registry) {
    throw new Error('[Instance IPC] ModuleRegistry not initialized');
  }

  const instanceModule = registry.getModule<InstanceModule>('InstanceModule');
  if (!instanceModule?.instanceRegistryPlan) {
    throw new Error('[Instance IPC] InstanceModule or InstanceRegistryPlan not available');
  }

  return instanceModule.instanceRegistryPlan;
}

/**
 * Get user's own instances (IoM - Internet of Me)
 */
async function getMyInstances(event: IpcMainInvokeEvent) {
  const plan = getInstanceRegistryPlan();
  const result = await plan.getMyInstances();
  return result.instances;
}

/**
 * Get contact instances grouped by person (IoP - Internet of People)
 */
async function getContactInstances(event: IpcMainInvokeEvent) {
  const plan = getInstanceRegistryPlan();
  const result = await plan.getContactInstances();
  return result.instancesByPerson;
}

/**
 * Get the local instance (this device)
 */
async function getLocalInstance(event: IpcMainInvokeEvent) {
  const plan = getInstanceRegistryPlan();
  const result = await plan.getLocalInstance();
  return result.instance;
}

/**
 * Get all instances (both IoM and IoP)
 */
async function getAllInstances(event: IpcMainInvokeEvent) {
  const plan = getInstanceRegistryPlan();
  const result = await plan.getAllInstances();
  return result.instances;
}

/**
 * Update the display name (used for device cards and mDNS advertisements)
 * Uses Device.displayName as the single source of truth (synced via CHUM)
 */
async function updateName(event: IpcMainInvokeEvent, params: { name: string }) {
  const { name } = params;

  if (!name || typeof name !== 'string') {
    return { success: false, error: 'Name is required' };
  }

  try {
    // Get devicePlan and localDeviceIdHash from nodeOneCore (set in module-registry-init.ts)
    const devicePlan = nodeOneCore.devicePlan;
    const localDeviceIdHash = nodeOneCore.localDeviceIdHash;

    if (!devicePlan || !localDeviceIdHash) {
      return { success: false, error: 'Device not initialized - devicePlan or localDeviceIdHash missing' };
    }

    // Update Device.displayName (ONE.core versioned object, synced via CHUM)
    const result = await devicePlan.updateDevice(localDeviceIdHash, {
      displayName: name
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update device' };
    }

    console.log(`[Instance IPC] Updated Device.displayName to: ${name}`);

    // Update mDNS discovery display name (broadcasts to network immediately)
    nodeOneCore.updateDiscoveryDisplayName(name);
    console.log(`[Instance IPC] Updated mDNS discovery display name to: ${name}`);

    return { success: true, name };
  } catch (error) {
    console.error('[Instance IPC] Failed to update name:', error);
    return { success: false, error: (error as Error).message };
  }
}

export default {
  getMyInstances,
  getContactInstances,
  getLocalInstance,
  getAllInstances,
  updateName
};
