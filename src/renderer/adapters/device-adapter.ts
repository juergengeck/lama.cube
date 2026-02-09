/**
 * Electron adapter for UnifiedDevicesView
 * Implements DevicePlatformAdapter using Electron IPC
 */

import type {
  DevicePlatformAdapter,
  QuicVCDevice,
  TrustLevel,
  CollectedPeer
} from '@refinio/lama.ui'

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

    async createInvitation(mode?: 'IoM' | 'IoP') {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('invitation:create', mode || 'IoP')
    },

    async acceptInvitation(invitationUrl: string) {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('connection:acceptInvitation', invitationUrl)
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
    },

    onQuicVCPeerUpdated(callback: (device: QuicVCDevice) => void) {
      if (!window.electronAPI || !window.electronAPI.on) {
        return () => {}
      }

      window.electronAPI.on('quicvc:peerUpdated', callback)

      return () => {
        if (window.electronAPI && window.electronAPI.off) {
          window.electronAPI.off('quicvc:peerUpdated', callback)
        }
      }
    },

    // Discovery collection methods
    async getCollectedPeers() {
      if (!window.electronAPI) {
        return { success: false }
      }
      return await window.electronAPI.invoke('discovery:getCollectedPeers')
    },

    async isDiscoveryActive() {
      if (!window.electronAPI) {
        return { success: false, active: false }
      }
      return await window.electronAPI.invoke('discovery:isCollectionActive')
    },

    async setDiscoveryActive(active: boolean) {
      if (!window.electronAPI) {
        return { success: false }
      }
      return await window.electronAPI.invoke('discovery:setCollectionActive', active)
    },

    async setCollectedPeerTrustLevel(peerId: string, trustLevel: TrustLevel) {
      if (!window.electronAPI) {
        return { success: false }
      }
      return await window.electronAPI.invoke('discovery:setCollectedPeerTrustLevel', { peerId, trustLevel })
    },

    // Pairing/Certificate operations
    async pairDevice(deviceId: string, trustLevel: TrustLevel) {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('quicvc:pairDevice', { deviceId, trustLevel })
    },

    async acceptCertificate(holderId: string, certId: string, trustLevel: TrustLevel) {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('quicvc:acceptCertificate', { holderId, certId, trustLevel })
    },

    async rejectCertificate(holderId: string, certId: string) {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('quicvc:rejectCertificate', { holderId, certId })
    },

    onPeerCollected(callback: (peer: CollectedPeer) => void) {
      if (!window.electronAPI || !window.electronAPI.on) {
        return () => {}
      }
      window.electronAPI.on('discovery:peerCollected', callback)
      return () => {
        if (window.electronAPI && window.electronAPI.off) {
          window.electronAPI.off('discovery:peerCollected', callback)
        }
      }
    },

    onKnownPersonNewDevice(callback: (peer: CollectedPeer) => void) {
      if (!window.electronAPI || !window.electronAPI.on) {
        return () => {}
      }
      window.electronAPI.on('discovery:knownPersonNewDevice', callback)
      return () => {
        if (window.electronAPI && window.electronAPI.off) {
          window.electronAPI.off('discovery:knownPersonNewDevice', callback)
        }
      }
    },

    onDiscoveryStateChanged(callback: (data: { active: boolean }) => void) {
      if (!window.electronAPI || !window.electronAPI.on) {
        return () => {}
      }
      // Note: preload strips the event arg, callback receives data directly
      return window.electronAPI.on('discovery:stateChanged', callback)
    },

    // ESP32 LED control
    async controlESP32LED(address: string, port: number, action: 'on' | 'off' | 'toggle') {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('esp32:controlLED', { address, port, action })
    },

    // Instance name operations
    async updateInstanceName(name: string) {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      return await window.electronAPI.invoke('instance:updateName', { name })
    }
  }
}
