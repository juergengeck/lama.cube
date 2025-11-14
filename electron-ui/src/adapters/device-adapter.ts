/**
 * Electron adapter for UnifiedDevicesView
 * Implements DevicePlatformAdapter using Electron IPC
 */

import type {
  DevicePlatformAdapter,
  QuicVCDevice,
  TrustLevel
} from '@lama/ui'

export function createElectronDeviceAdapter(): DevicePlatformAdapter {
  return {
    async getInstanceInfo() {
      if (!window.lamaBridge) {
        return { success: false }
      }
      return await window.lamaBridge.getInstanceInfo()
    },

    async getContacts() {
      if (!window.electronAPI) {
        return { success: false }
      }
      return await window.electronAPI.invoke('contacts:list')
    },

    async getTrustLevels() {
      if (!window.electronAPI) {
        return { success: false }
      }
      return await window.electronAPI.invoke('devices:getTrustLevels')
    },

    async setTrustLevel(instanceId: string, trustLevel: TrustLevel) {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('devices:setTrustLevel', {
        instanceId,
        trustLevel
      })
    },

    async createInvitation() {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('invitation:create')
    },

    async getDiscoveredDevices() {
      if (!window.electronAPI) {
        return { success: false }
      }
      return await window.electronAPI.invoke('quicvc:getDiscoveredDevices')
    },

    async scanForDevices(timeout: number) {
      if (!window.electronAPI) {
        return { success: false }
      }
      return await window.electronAPI.invoke('quicvc:scan', timeout)
    },

    onQuicVCPeerDiscovered(callback: (device: QuicVCDevice) => void) {
      if (!window.electronAPI || !window.electronAPI.on) {
        return () => {}
      }

      window.electronAPI.on('quicvc:peerDiscovered', callback)

      return () => {
        if (window.electronAPI && window.electronAPI.off) {
          window.electronAPI.off('quicvc:peerDiscovered', callback)
        }
      }
    },

    onQuicVCPeerLost(callback: (peerId: { id: string }) => void) {
      if (!window.electronAPI || !window.electronAPI.on) {
        return () => {}
      }

      window.electronAPI.on('quicvc:peerLost', callback)

      return () => {
        if (window.electronAPI && window.electronAPI.off) {
          window.electronAPI.off('quicvc:peerLost', callback)
        }
      }
    }
  }
}
