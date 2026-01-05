/**
 * QuicVC Discovery IPC Handlers
 *
 * Provides IPC interface for QuicVC device discovery in the UI
 * Supports both UDP and BTLE transports for local discovery
 * Includes DiscoveryCollectionService for verified peer collection
 *
 * Identity comes from CubeDiscoveryIdentityProvider (user-configurable via settings).
 */

import electron from 'electron';
const { ipcMain } = electron;
import { DiscoveryService, DiscoveryStart, BTLEBroadcaster, DiscoveryCollectionService, UDPBroadcaster } from '@lama/connection.core';
import type { DiscoveryCollectionDependencies, CollectedPeer, DiscoveryIdentityProvider } from '@lama/connection.core';
import { handshakeService } from '@trust/core/services/HandshakeService.js';
import { CompositeLocalDiscovery } from '../../core/composite-local-discovery.js';
import { CubeDiscoveryIdentityProvider } from '../../core/discovery-identity-provider.js';
import { NodeUDPSocketService } from '../../core/node-udp-socket-service.js';
import { RelayBroadcaster } from '../../core/relay-broadcaster.js';
import { createTransportFactory } from '../../core/udp-transport-factory.js';
import { getBTLEBroadcastService } from '../../core/node-btle-service.js';
import nodeOneCore from '../../core/node-one-core.js';
import type { IpcMainInvokeEvent } from 'electron';

interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  devices?: any[];
  [key: string]: any;
}

// Singleton discovery service instances
let discoveryService: DiscoveryService | null = null;
let compositeDiscovery: CompositeLocalDiscovery | null = null;
let discoveryStart: DiscoveryStart | null = null;
let discoveryCollectionService: DiscoveryCollectionService | null = null;
let identityProvider: DiscoveryIdentityProvider | null = null;
let isCollectionActive = false;

/**
 * Get or create the shared identity provider
 */
function getIdentityProvider(): DiscoveryIdentityProvider {
  if (!identityProvider) {
    identityProvider = new CubeDiscoveryIdentityProvider({
      nodeOneCore,
      instanceId: nodeOneCore.instanceId || 'unknown',
    });
  }
  return identityProvider;
}

/**
 * Initialize QuicVC discovery service
 * Uses CompositeLocalDiscovery to support both UDP and BTLE transports
 * Identity comes from CubeDiscoveryIdentityProvider (user-configurable via settings)
 */
async function initializeDiscoveryService(): Promise<void> {
  if (discoveryService) {
    return; // Already initialized
  }

  // Get identity provider (creates if not exists)
  const provider = getIdentityProvider();
  const identity = await provider.getDiscoveryIdentity();

  console.log('[QuicVCDiscovery] Initializing with identity:', identity.displayName,
              'pubKey:', identity.pubKey.substring(0, 8) + '...',
              'deviceId:', identity.deviceId.substring(0, 8) + '...');

  // Create composite discovery provider (UDP + BTLE)
  compositeDiscovery = new CompositeLocalDiscovery(provider);

  // Create discovery service
  discoveryService = new DiscoveryService();

  // Initialize with composite local discovery (UDP + BTLE)
  await discoveryService.initialize({
    localDiscovery: compositeDiscovery,
  });

  // Start continuous discovery
  discoveryService.start({
    methods: ['local'],
    timeout: 2000,
  });

  // Setup event listeners
  discoveryService.on('peerDiscovered', (peer) => {
    console.log('[QuicVCDiscovery] Peer discovered:', peer.name, 'at', peer.address);

    // Broadcast to all renderer windows
    const allWindows = electron.BrowserWindow.getAllWindows();
    allWindows.forEach((win) => {
      win.webContents.send('quicvc:peerDiscovered', peer);
    });
  });

  discoveryService.on('peerLost', (peer) => {
    console.log('[QuicVCDiscovery] Peer lost:', peer.id);

    // Broadcast to all renderer windows
    const allWindows = electron.BrowserWindow.getAllWindows();
    allWindows.forEach((win) => {
      win.webContents.send('quicvc:peerLost', peer);
    });
  });

  console.log('[QuicVCDiscovery] Service initialized and started');
}

/**
 * Initialize multi-transport discovery broadcasting
 * Registers UDP, BTLE, and optionally relay broadcasters
 * Identity comes from shared CubeDiscoveryIdentityProvider
 */
async function initializeDiscoveryStart(commServerUrl?: string): Promise<void> {
  if (discoveryStart) {
    await discoveryStart.stop();
  }

  // Get identity provider (creates if not exists)
  const provider = getIdentityProvider();

  // Build list of enabled transports
  const enabledTransports: ('udp' | 'btle' | 'relay')[] = ['udp', 'btle'];
  if (commServerUrl) {
    enabledTransports.push('relay');
  }

  discoveryStart = new DiscoveryStart(provider, {
    enabledTransports,
    commServerUrl,
  });

  // Register UDP broadcaster with Node.js socket
  const identity = await provider.getDiscoveryIdentity();
  const udpSocketService = new NodeUDPSocketService();
  const udpBroadcaster = new UDPBroadcaster(udpSocketService, identity.deviceId, identity.displayName);
  discoveryStart.registerBroadcaster(udpBroadcaster);

  // Register BTLE broadcaster
  try {
    const btleBroadcastService = getBTLEBroadcastService();
    const initialized = await btleBroadcastService.initialize();
    if (initialized) {
      const btleBroadcaster = new BTLEBroadcaster(btleBroadcastService);
      discoveryStart.registerBroadcaster(btleBroadcaster);
      console.log('[DiscoveryStart] BTLE broadcaster registered');
    } else {
      console.warn('[DiscoveryStart] BTLE not available, skipping BTLE broadcaster');
    }
  } catch (error) {
    console.warn('[DiscoveryStart] Failed to initialize BTLE broadcaster:', error);
  }

  // Register relay broadcaster if CommServer configured
  if (commServerUrl) {
    const relayBroadcaster = new RelayBroadcaster(commServerUrl);
    discoveryStart.registerBroadcaster(relayBroadcaster);
  }

  console.log('[DiscoveryStart] Initialized with transports:', enabledTransports);
}

/**
 * Initialize DiscoveryCollectionService with required dependencies.
 * Connects to discovered peers and verifies their identity via handshake.
 */
async function initializeDiscoveryCollectionService(): Promise<void> {
  if (discoveryCollectionService) {
    return; // Already initialized
  }

  // Ensure discovery service is ready
  if (!discoveryService) {
    await initializeDiscoveryService();
  }

  // Check if nodeOneCore has required models
  if (!nodeOneCore.leuteModel) {
    console.warn('[DiscoveryCollection] LeuteModel not available, cannot initialize collection service');
    return;
  }

  console.log('[DiscoveryCollection] Initializing collection service...');

  try {
    // Get ONE.core crypto API
    const { default: cryptoApi } = await import('@refinio/one.core/lib/crypto/CryptoApi.js');

    // Create dependencies for DiscoveryCollectionService
    const deps: DiscoveryCollectionDependencies = {
      cryptoApi: cryptoApi as any,
      leuteModel: nodeOneCore.leuteModel as any,
      discoveryService: discoveryService!,
      handshakeService: handshakeService as any,

      // Create UDP transport for handshake verification
      createTransport: createTransportFactory({
        connectTimeout: 5000
      }),

      // Settings accessor
      getSettings: async () => {
        // Get settings from settings.core via userSettingsManager
        try {
          if (nodeOneCore.userSettingsManager) {
            const deviceSettings = await nodeOneCore.userSettingsManager.get('deviceSettings');
            return {
              autoTrustKnownPersonDevices: deviceSettings?.autoTrustKnownPersonDevices ?? false,
              profileVisibility: deviceSettings?.profileVisibility ?? 'minimal'
            };
          }
        } catch (e) {
          console.warn('[DiscoveryCollection] Failed to get settings:', e);
        }
        return {
          autoTrustKnownPersonDevices: false,
          profileVisibility: 'minimal' as const
        };
      }
    };

    discoveryCollectionService = new DiscoveryCollectionService(deps);

    // Set up event forwarding to renderer
    discoveryCollectionService.on('peerCollected', (peer: CollectedPeer) => {
      console.log('[DiscoveryCollection] Peer collected:', peer.id.substring(0, 8));
      const allWindows = electron.BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        win.webContents.send('discovery:peerCollected', peer);
      });
    });

    discoveryCollectionService.on('knownPersonNewDevice', (peer: CollectedPeer) => {
      console.log('[DiscoveryCollection] Known person new device:', peer.id.substring(0, 8));
      const allWindows = electron.BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        win.webContents.send('discovery:knownPersonNewDevice', peer);
      });
    });

    discoveryCollectionService.on('peerLost', (peerId: string) => {
      console.log('[DiscoveryCollection] Peer lost:', peerId.substring(0, 8));
      const allWindows = electron.BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        win.webContents.send('discovery:peerLost', { id: peerId });
      });
    });

    discoveryCollectionService.on('handshakeFailed', (peerId: string, error: string) => {
      console.log('[DiscoveryCollection] Handshake failed:', peerId.substring(0, 8), error);
      const allWindows = electron.BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        win.webContents.send('discovery:handshakeFailed', { peerId, error });
      });
    });

    console.log('[DiscoveryCollection] Collection service initialized');
  } catch (error) {
    console.error('[DiscoveryCollection] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Initialize QuicVC discovery IPC handlers
 */
export function initializeQuicVCDiscoveryPlans(): void {
  /**
   * Start QuicVC discovery
   */
  ipcMain.handle('quicvc:startDiscovery', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      console.log('[QuicVCDiscovery] Starting discovery via IPC');

      // Initialize if not already done
      if (!discoveryService) {
        await initializeDiscoveryService();
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('[QuicVCDiscovery] Failed to start discovery:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  /**
   * Stop QuicVC discovery
   */
  ipcMain.handle('quicvc:stopDiscovery', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      console.log('[QuicVCDiscovery] Stopping discovery via IPC');

      if (discoveryService) {
        discoveryService.stop();
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('[QuicVCDiscovery] Failed to stop discovery:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  /**
   * Get discovered QuicVC devices
   */
  ipcMain.handle('quicvc:getDiscoveredDevices', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      // Initialize if not already done
      if (!discoveryService) {
        await initializeDiscoveryService();
      }

      // Get discovered peers from discovery service
      const peers = discoveryService!.getDiscoveredPeers();

      // Convert to device format for UI
      const devices = peers.map((peer) => ({
        id: peer.id,
        name: peer.name,
        type: 'quicvc',
        status: 'discovered',
        address: peer.address,
        capabilities: peer.capabilities,
        discoveredAt: new Date(peer.discoveredAt).toISOString(),
        lastSeen: new Date(peer.lastSeenAt).toISOString(),
        credentialStatus: peer.credentialStatus,
      }));

      console.log('[QuicVCDiscovery] Returning', devices.length, 'discovered devices');

      return {
        success: true,
        devices,
      };
    } catch (error) {
      console.error('[QuicVCDiscovery] Failed to get discovered devices:', error);
      return {
        success: false,
        error: (error as Error).message,
        devices: [],
      };
    }
  });

  /**
   * Perform one-time discovery scan
   */
  ipcMain.handle('quicvc:scan', async (event: IpcMainInvokeEvent, timeout?: number): Promise<IpcResponse> => {
    try {
      console.log('[QuicVCDiscovery] Performing discovery scan');

      // Initialize if not already done
      if (!discoveryService) {
        await initializeDiscoveryService();
      }

      // Perform scan
      const peers = await discoveryService!.scan({
        methods: ['local'],
        timeout: timeout || 2000,
      });

      // Convert to device format
      const devices = peers.map((peer) => ({
        id: peer.id,
        name: peer.name,
        type: 'quicvc',
        status: 'discovered',
        address: peer.address,
        capabilities: peer.capabilities,
        discoveredAt: new Date(peer.discoveredAt).toISOString(),
        lastSeen: new Date(peer.lastSeenAt).toISOString(),
      }));

      console.log('[QuicVCDiscovery] Scan complete, found', devices.length, 'devices');

      return {
        success: true,
        devices,
      };
    } catch (error) {
      console.error('[QuicVCDiscovery] Scan failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        devices: [],
      };
    }
  });

  /**
   * Start multi-transport discovery broadcasting
   * Identity is now sourced from CubeDiscoveryIdentityProvider (user-configurable)
   */
  ipcMain.handle('discovery:start', async (event: IpcMainInvokeEvent, params?: {
    commServerUrl?: string;
  }): Promise<IpcResponse> => {
    try {
      console.log('[DiscoveryStart] Starting discovery via IPC');

      await initializeDiscoveryStart(params?.commServerUrl);
      await discoveryStart?.start();

      // Get current identity for response
      const currentIdentity = discoveryStart?.getCurrentIdentity();

      return {
        success: true,
        transports: discoveryStart?.getActiveBroadcasters() || [],
        identity: currentIdentity ? {
          pubKey: currentIdentity.pubKey.substring(0, 8) + '...',
          deviceId: currentIdentity.deviceId.substring(0, 8) + '...',
          displayName: currentIdentity.displayName,
        } : undefined,
      };
    } catch (error) {
      console.error('[DiscoveryStart] Failed to start discovery:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  /**
   * Stop multi-transport discovery broadcasting
   */
  ipcMain.handle('discovery:stop', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      console.log('[DiscoveryStart] Stopping discovery via IPC');

      await discoveryStart?.stop();

      return {
        success: true,
      };
    } catch (error) {
      console.error('[DiscoveryStart] Failed to stop discovery:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  /**
   * Get multi-transport discovery status
   */
  ipcMain.handle('discovery:status', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    return {
      success: true,
      running: discoveryStart?.isRunning() || false,
      transports: discoveryStart?.getActiveBroadcasters() || [],
    };
  });

  // ============================================================================
  // Discovery Collection IPC Handlers
  // ============================================================================

  /**
   * Get collected peers (verified via handshake)
   */
  ipcMain.handle('discovery:getCollectedPeers', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      // Initialize collection service if needed
      if (!discoveryCollectionService) {
        await initializeDiscoveryCollectionService();
      }

      if (!discoveryCollectionService) {
        return {
          success: true,
          peers: [],
        };
      }

      const peers = discoveryCollectionService.getCollectedPeers();
      console.log('[DiscoveryCollection] Returning', peers.length, 'collected peers');

      return {
        success: true,
        peers,
      };
    } catch (error) {
      console.error('[DiscoveryCollection] Failed to get collected peers:', error);
      return {
        success: false,
        error: (error as Error).message,
        peers: [],
      };
    }
  });

  /**
   * Check if discovery collection is active
   */
  ipcMain.handle('discovery:isCollectionActive', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    return {
      success: true,
      active: isCollectionActive,
    };
  });

  /**
   * Set discovery collection active state (start/stop collecting)
   */
  ipcMain.handle('discovery:setCollectionActive', async (event: IpcMainInvokeEvent, active: boolean): Promise<IpcResponse> => {
    try {
      console.log('[DiscoveryCollection] Setting collection active:', active);

      if (active) {
        // Initialize and start collection
        if (!discoveryCollectionService) {
          await initializeDiscoveryCollectionService();
        }

        if (discoveryCollectionService && !isCollectionActive) {
          discoveryCollectionService.start();
          isCollectionActive = true;
          console.log('[DiscoveryCollection] Collection started');
        }
      } else {
        // Stop collection
        if (discoveryCollectionService && isCollectionActive) {
          discoveryCollectionService.stop();
          isCollectionActive = false;
          console.log('[DiscoveryCollection] Collection stopped');
        }
      }

      return {
        success: true,
        active: isCollectionActive,
      };
    } catch (error) {
      console.error('[DiscoveryCollection] Failed to set collection active:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  /**
   * Set trust level for a collected peer
   */
  ipcMain.handle('discovery:setCollectedPeerTrustLevel', async (
    event: IpcMainInvokeEvent,
    params: { peerId: string; trustLevel: string }
  ): Promise<IpcResponse> => {
    try {
      console.log('[DiscoveryCollection] Setting trust level for peer:', params.peerId, 'to', params.trustLevel);

      if (!discoveryCollectionService) {
        return {
          success: false,
          error: 'Discovery collection service not initialized',
        };
      }

      // TODO: Implement trust level setting on collected peers
      // This would integrate with the TrustPlan to set trust for the peer's identity

      return {
        success: true,
      };
    } catch (error) {
      console.error('[DiscoveryCollection] Failed to set trust level:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  console.log('[QuicVCDiscovery] IPC handlers registered');
}

/**
 * Auto-initialize discovery when Node.js ONE.core is ready
 */
export async function autoInitializeDiscovery(): Promise<void> {
  // Wait for nodeOneCore to be initialized
  if (!nodeOneCore.initialized) {
    console.log('[QuicVCDiscovery] Waiting for nodeOneCore to initialize...');
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (nodeOneCore.initialized) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // Initialize discovery service automatically
  await initializeDiscoveryService();
}
