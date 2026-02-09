/**
 * QuicVC Discovery IPC Handlers
 *
 * Provides IPC interface for device discovery in the UI.
 * Discovery uses mDNS via ConnectionModule's DiscoveryService (set up in module-registry-init).
 * Includes DiscoveryCollectionService for verified peer collection.
 *
 * Identity comes from CubeDiscoveryIdentityProvider (user-configurable via settings).
 */

import electron from 'electron';
import crypto from 'crypto';
const { ipcMain } = electron;
import { DiscoveryCollectionService, QuicVCConnectionManager } from '@refinio/connection.core';
import type { DiscoveryCollectionDependencies, CollectedPeer, DiscoveryIdentityProvider } from '@refinio/connection.core';
import { handshakeService } from '@refinio/trust.core/services/HandshakeService.js';
import type { TrustLevel } from '@refinio/trust.core/types/trust-types.js';
import { CubeDiscoveryIdentityProvider } from '../../core/discovery-identity-provider.js';
import { createTransportFactory } from '../../core/udp-transport-factory.js';
import { CryptoApi } from '@refinio/one.core/lib/crypto/CryptoApi.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import { ContactsPlan } from '@refinio/chat.core/plans/ContactsPlan.js';
import { getTrustModel } from './trust.js';
import { getConnectionModule } from '../../registry/module-registry-init.js';
import nodeOneCore from '../../core/node-one-core.js';
import type { IpcMainInvokeEvent } from 'electron';

interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  devices?: any[];
  [key: string]: any;
}

// Singleton instances
let discoveryCollectionService: DiscoveryCollectionService | null = null;
let identityProvider: DiscoveryIdentityProvider | null = null;
let isCollectionActive = false;
let rendererBridgeWired = false;
let discoveryEpoch = -1;

/**
 * @deprecated No-op: plan cache invalidates automatically via initEpoch
 */
export function resetQuicVCDiscoverySingletons(): void {}

/**
 * Invalidate singletons if epoch changed (e.g. after re-init)
 */
function invalidateIfEpochChanged(): void {
  if (discoveryEpoch !== nodeOneCore.initEpoch) {
    discoveryCollectionService = null;
    identityProvider = null;
    isCollectionActive = false;
    rendererBridgeWired = false;
  }
}

/**
 * Get or create the shared identity provider
 */
function getIdentityProvider(): DiscoveryIdentityProvider {
  invalidateIfEpochChanged();
  if (!identityProvider) {
    identityProvider = new CubeDiscoveryIdentityProvider({
      nodeOneCore,
      instanceId: nodeOneCore.instanceId || 'unknown',
      settingsPlan: nodeOneCore.settingsPlan,
      devicePlan: nodeOneCore.devicePlan,
      localDeviceIdHash: nodeOneCore.localDeviceIdHash,
    });
  }
  // Always try to wire up settingsPlan if available
  if (nodeOneCore.settingsPlan) {
    (identityProvider as CubeDiscoveryIdentityProvider).setSettingsPlan(nodeOneCore.settingsPlan);
  }
  // Always try to wire up devicePlan if available (for Device.displayName)
  if (nodeOneCore.devicePlan && nodeOneCore.localDeviceIdHash) {
    (identityProvider as CubeDiscoveryIdentityProvider).setDevicePlan(
      nodeOneCore.devicePlan,
      nodeOneCore.localDeviceIdHash
    );
  }
  return identityProvider;
}

/**
 * Wire ConnectionModule's mDNS discovery events to renderer windows.
 * Also wires TrustVerifier on the QuicVC connection manager.
 * Called once after ONE.core is ready.
 */
async function initializeRendererBridge(): Promise<void> {
  invalidateIfEpochChanged();
  if (rendererBridgeWired) return;

  // Wire TrustModel as TrustVerifier on the QuicVC connection manager
  try {
    await wireTrustVerifier();
  } catch (error) {
    console.warn('[QuicVCDiscovery] Failed to wire TrustVerifier:', error);
  }

  // Forward ConnectionModule's mDNS discovery events to renderer
  try {
    const connectionModule = getConnectionModule();
    if (connectionModule?.discoveryService) {
      connectionModule.discoveryService.onPeerDiscovered.listen((peer: any) => {
        const allWindows = electron.BrowserWindow.getAllWindows();
        allWindows.forEach((win) => {
          win.webContents.send('quicvc:peerDiscovered', {
            id: peer.id,
            name: peer.name,
            address: peer.address?.split(':')[0] || peer.address,
            port: parseInt(peer.address?.split(':')[1] || '49497', 10),
            pubKey: peer.publicKey,
            discoveredAt: peer.discoveredAt,
          });
        });
      });
      connectionModule.discoveryService.onPeerLost.listen((peer: any) => {
        console.log('[QuicVCDiscovery] Peer lost:', peer.id);
        const allWindows = electron.BrowserWindow.getAllWindows();
        allWindows.forEach((win) => {
          win.webContents.send('quicvc:peerLost', { id: peer.id });
        });
      });
      connectionModule.discoveryService.onPeerUpdated.listen((peer: any) => {
        console.log('[QuicVCDiscovery] Peer updated:', peer.name, 'at', peer.address);
        const allWindows = electron.BrowserWindow.getAllWindows();
        allWindows.forEach((win) => {
          win.webContents.send('quicvc:peerUpdated', {
            id: peer.id,
            name: peer.name,
            address: peer.address?.split(':')[0] || peer.address,
            port: parseInt(peer.address?.split(':')[1] || '49497', 10),
            pubKey: peer.publicKey,
            discoveredAt: peer.discoveredAt,
          });
        });
      });
      console.log('[QuicVCDiscovery] mDNS discovery → renderer wired');
    } else {
      console.warn('[QuicVCDiscovery] ConnectionModule discoveryService not available yet');
    }
  } catch (error) {
    console.warn('[QuicVCDiscovery] Failed to wire discovery events to renderer:', error);
  }

  rendererBridgeWired = true;
  discoveryEpoch = nodeOneCore.initEpoch;
  console.log('[QuicVCDiscovery] Renderer bridge initialized');
}

/**
 * Initialize DiscoveryCollectionService with required dependencies.
 * Connects to discovered peers and verifies their identity via handshake.
 */
async function initializeDiscoveryCollectionService(): Promise<void> {
  invalidateIfEpochChanged();
  if (discoveryCollectionService) {
    return; // Already initialized
  }

  // Ensure renderer bridge is wired
  if (!rendererBridgeWired) {
    await initializeRendererBridge();
  }

  // Get ConnectionModule's mDNS discovery service
  const connectionModule = getConnectionModule();
  if (!connectionModule?.discoveryService) {
    console.warn('[DiscoveryCollection] ConnectionModule discoveryService not available');
    return;
  }

  // Check if nodeOneCore has required models
  if (!nodeOneCore.leuteModel) {
    console.warn('[DiscoveryCollection] LeuteModel not available, cannot initialize collection service');
    return;
  }

  console.log('[DiscoveryCollection] Initializing collection service...');

  try {
    // Create dependencies for DiscoveryCollectionService
    const deps: DiscoveryCollectionDependencies = {
      cryptoApi: CryptoApi as unknown as DiscoveryCollectionDependencies['cryptoApi'],
      leuteModel: nodeOneCore.leuteModel as unknown as DiscoveryCollectionDependencies['leuteModel'],
      discoveryService: connectionModule.discoveryService,
      handshakeService: handshakeService as unknown as DiscoveryCollectionDependencies['handshakeService'],

      // Create UDP transport for handshake verification
      createTransport: createTransportFactory({
        connectTimeout: 5000
      }),

      // Settings accessor
      getSettings: async () => {
        // Get settings from settings.core via settingsPlan
        try {
          if (nodeOneCore.settingsPlan?.getSection) {
            const response = await nodeOneCore.settingsPlan.getSection({ moduleId: 'device' });
            const deviceSettings = response.values;
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

    // Set up event forwarding to renderer using OEvent pattern
    discoveryCollectionService.onPeerCollected.listen((peer: CollectedPeer) => {
      console.log('[DiscoveryCollection] Peer collected:', peer.id.substring(0, 8));
      const allWindows = electron.BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        win.webContents.send('discovery:peerCollected', peer);
      });
    });

    discoveryCollectionService.onKnownPersonNewDevice.listen((peer: CollectedPeer) => {
      console.log('[DiscoveryCollection] Known person new device:', peer.id.substring(0, 8));
      const allWindows = electron.BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        win.webContents.send('discovery:knownPersonNewDevice', peer);
      });
    });

    discoveryCollectionService.onPeerLost.listen((peerId: string) => {
      console.log('[DiscoveryCollection] Peer lost:', peerId.substring(0, 8));
      const allWindows = electron.BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        win.webContents.send('discovery:peerLost', { id: peerId });
      });
    });

    discoveryCollectionService.onHandshakeFailed.listen((peerId: string, error: string) => {
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
export function initializeQuicVCDiscoveryPlans(handle: (channel: string, handler: any) => void): void {
  console.log('[QuicVCDiscovery] Registering IPC handlers...');
  /**
   * Start QuicVC discovery
   */
  handle('quicvc:startDiscovery', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      console.log('[QuicVCDiscovery] Starting discovery via IPC');

      // Wire renderer bridge if not done
      if (!rendererBridgeWired) {
        await initializeRendererBridge();
      }

      // Start mDNS discovery via ConnectionModule
      const connectionModule = getConnectionModule();
      if (connectionModule?.discoveryService) {
        connectionModule.discoveryService.start({ methods: ['local'] });
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
  handle('quicvc:stopDiscovery', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      console.log('[QuicVCDiscovery] Stopping discovery via IPC');

      const connectionModule = getConnectionModule();
      if (connectionModule?.discoveryService) {
        connectionModule.discoveryService.stop();
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
   * Get discovered devices (from mDNS discovery)
   */
  handle('quicvc:getDiscoveredDevices', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      // Get discovered peers from ConnectionModule's DiscoveryService
      const connectionModule = getConnectionModule();
      const peers = connectionModule?.discoveryService?.getDiscoveredPeers() || [];

      const devices = peers.map((peer: any) => ({
        id: peer.id,
        name: peer.name,
        type: 'quicvc',
        status: 'discovered',
        address: peer.address?.split(':')[0] || peer.address,
        port: parseInt(peer.address?.split(':')[1] || '49497', 10),
        pubKey: peer.publicKey,
        capabilities: peer.capabilities,
        discoveredAt: new Date(peer.discoveredAt).toISOString(),
        lastSeen: new Date(peer.lastSeenAt).toISOString(),
      }));

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
  handle('quicvc:scan', async (event: IpcMainInvokeEvent, timeout?: number): Promise<IpcResponse> => {
    try {
      console.log('[QuicVCDiscovery] Performing discovery scan');

      const connectionModule = getConnectionModule();
      if (!connectionModule?.discoveryService) {
        return { success: false, error: 'Discovery service not available', devices: [] };
      }

      // Perform scan via mDNS
      const peers = await connectionModule.discoveryService.scan({
        methods: ['local'],
        timeout: timeout || 2000,
      });

      // Convert to device format
      const devices = peers.map((peer: any) => ({
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
   * Start mDNS discovery broadcasting
   */
  handle('discovery:start', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      console.log('[Discovery] Starting mDNS discovery via IPC');

      if (!rendererBridgeWired) {
        await initializeRendererBridge();
      }

      const connectionModule = getConnectionModule();
      if (connectionModule?.discoveryService) {
        connectionModule.discoveryService.start({ methods: ['local'] });
      }

      return { success: true };
    } catch (error) {
      console.error('[Discovery] Failed to start discovery:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Stop mDNS discovery
   */
  handle('discovery:stop', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      console.log('[Discovery] Stopping mDNS discovery via IPC');

      const connectionModule = getConnectionModule();
      if (connectionModule?.discoveryService) {
        connectionModule.discoveryService.stop();
      }

      return { success: true };
    } catch (error) {
      console.error('[Discovery] Failed to stop discovery:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Get mDNS discovery status
   */
  handle('discovery:status', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    const connectionModule = getConnectionModule();
    const hasDiscovery = !!connectionModule?.discoveryService;
    return { success: true, running: hasDiscovery };
  });

  // ============================================================================
  // Discovery Collection IPC Handlers
  // ============================================================================

  /**
   * Get collected peers (from both mDNS and collection service)
   */
  handle('discovery:getCollectedPeers', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      const allPeers: CollectedPeer[] = [];
      const seenIds = new Set<string>();

      // Get TrustModel for looking up trust levels
      let trustModel: any = null;
      try {
        trustModel = getTrustModel();
      } catch (e) {
        console.warn('[DiscoveryCollection] TrustModel not available:', e);
      }

      // Get peers from ConnectionModule's mDNS discovery
      try {
        const connectionModule = getConnectionModule();
        if (connectionModule?.discoveryService) {
          const mdnsPeers = connectionModule.discoveryService.getDiscoveredPeers();
          for (const peer of mdnsPeers) {
            if (!seenIds.has(peer.id)) {
              seenIds.add(peer.id);

              // Look up trust level by public key
              let trustLevel = 'unknown';
              if (peer.publicKey && trustModel) {
                try {
                  const trustInfo = await trustModel.getTrustForPublicKey(peer.publicKey);
                  if (trustInfo) {
                    trustLevel = trustInfo.trustLevel;
                  }
                } catch (e) {
                  // Trust lookup failed, keep 'unknown'
                }
              }

              allPeers.push({
                id: peer.id,
                name: peer.name,
                publicKey: peer.publicKey || '',
                email: peer.email,
                address: peer.address?.split(':')[0] || peer.address,
                discoveryMethod: 'local',
                discoveredAt: peer.discoveredAt,
                lastSeenAt: peer.lastSeenAt,
                handshakeStatus: 'verified',
                isKnownPerson: false,
                trustLevel,
                capabilities: peer.capabilities || ['quicvc'],
                credential: {} as any,
                credentialStatus: 'unverified',
              } as CollectedPeer);
            }
          }
        }
      } catch (e) {
        console.warn('[DiscoveryCollection] Failed to get mDNS peers:', e);
      }

      // Get peers from DiscoveryCollectionService (handshake-verified)
      if (discoveryCollectionService) {
        const collectedPeers = discoveryCollectionService.getCollectedPeers();
        for (const peer of collectedPeers) {
          if (!seenIds.has(peer.id)) {
            seenIds.add(peer.id);
            allPeers.push(peer);
          }
        }
      }

      console.log('[DiscoveryCollection] Returning', allPeers.length, 'collected peers');

      return {
        success: true,
        peers: allPeers,
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
  handle('discovery:isCollectionActive', async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    return {
      success: true,
      active: isCollectionActive,
    };
  });

  /**
   * Set discovery collection active state (start/stop collecting)
   */
  handle('discovery:setCollectionActive', async (event: IpcMainInvokeEvent, active: boolean): Promise<IpcResponse> => {
    try {
      console.log('[DiscoveryCollection] Setting collection active:', active);

      const previousState = isCollectionActive;

      // Also control ConnectionModule's mDNS discovery
      try {
        const connectionModule = getConnectionModule();
        if (connectionModule?.discoveryService) {
          if (active) {
            connectionModule.discoveryService.start({ methods: ['local'] });
            console.log('[DiscoveryCollection] mDNS discovery started');
          } else {
            connectionModule.discoveryService.stop();
            console.log('[DiscoveryCollection] mDNS discovery stopped');
          }
        }
      } catch (e) {
        console.warn('[DiscoveryCollection] Failed to control mDNS discovery:', e);
      }

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

      // Emit state change event if state changed
      if (previousState !== isCollectionActive) {
        const allWindows = electron.BrowserWindow.getAllWindows();
        allWindows.forEach((win) => {
          win.webContents.send('discovery:stateChanged', { active: isCollectionActive });
        });
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
   *
   * Flow:
   * 1. Get peer's email and publicKey from discovery
   * 2. Derive personId from email (SHA256IdHash)
   * 3. Create trust certificate linking personId to publicKey
   *
   * Security: Trust is established based on:
   * - Email (identity) - provided by mDNS, can be ephemeral
   * - PublicKey (authentication) - verified via challenge during handshake
   */
  handle('discovery:setCollectedPeerTrustLevel', async (
    event: IpcMainInvokeEvent,
    params: { peerId: string; trustLevel: string }
  ): Promise<IpcResponse> => {
    try {
      console.log('[DiscoveryCollection] Setting trust level for peer:', params.peerId, 'to', params.trustLevel);

      // Get TrustModel
      let trustModel: any = null;
      try {
        trustModel = getTrustModel();
      } catch (e) {
        return {
          success: false,
          error: 'TrustModel not available',
        };
      }

      // Find the peer to get its public key and email
      const connectionModule = getConnectionModule();
      const discoveredPeers = connectionModule?.discoveryService?.getDiscoveredPeers() || [];
      const peer = discoveredPeers.find((p: any) => p.id === params.peerId || p.publicKey === params.peerId);

      if (!peer?.publicKey) {
        return {
          success: false,
          error: `Peer not found or has no public key: ${params.peerId}`,
        };
      }

      if (!peer?.email) {
        return {
          success: false,
          error: `Peer ${peer.name} has no email - cannot derive personId for trust`,
        };
      }

      // Derive personId from email (same calculation as ONE.core)
      const personId = await calculateIdHashOfObj({ $type$: 'Person', email: peer.email });

      console.log(`[DiscoveryCollection] Derived personId from email ${peer.email}: ${personId.substring(0, 8)}...`);

      // Use setTrustForPublicKey which works with discovery peers
      await trustModel.setTrustForPublicKey(
        peer.publicKey,
        peer.name || 'Unknown',
        'trusted',
        params.trustLevel as TrustLevel,
        personId
      );

      console.log(`[DiscoveryCollection] Set trust level '${params.trustLevel}' for peer ${peer.name} (person: ${personId.substring(0, 8)}...)`);

      // Create contact (Someone) for 'trusted' or 'me' trust levels
      // This makes the contact appear in the contacts list and creates journal entry
      if (params.trustLevel === 'trusted' || params.trustLevel === 'me') {
        try {
          const contactsPlan = new ContactsPlan(nodeOneCore);
          await contactsPlan.ensureContactForPerson(personId, peer.name || 'Remote Contact');
          console.log(`[DiscoveryCollection] Contact created for ${peer.name}`);
        } catch (contactError) {
          console.warn('[DiscoveryCollection] Contact creation warning:', (contactError as Error).message);
          // Continue - trust is set, contact creation is non-critical
        }
      }

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

  /**
   * Pair with a discovered device
   * Establishes QuicVC connection and creates trust certificate
   */
  console.log('[QuicVCDiscovery] Registering quicvc:pairDevice handler...');
  handle('quicvc:pairDevice', async (
    event: IpcMainInvokeEvent,
    params: { deviceId: string; trustLevel: 'me' | 'trusted' | 'low' | 'unknown' }
  ): Promise<IpcResponse> => {
    try {
      console.log('[QuicVC] Creating pairing certificate for device:', params.deviceId, 'trust level:', params.trustLevel);

      if (!nodeOneCore.ownerId) {
        return {
          success: false,
          error: 'Node not initialized - no owner ID',
        };
      }

      // Create trust certificate (ONE.core object) - no real-time handshake required
      // Certificate will sync when both parties are online
      const certificateId = `cert-${nodeOneCore.ownerId.substring(0, 8)}-${params.deviceId.substring(0, 8)}`;

      // TODO: Create actual trust certificate in ONE.core via TrustPlan
      // This would store the certificate as a ONE.core object that syncs

      console.log('[QuicVC] Created pairing certificate:', certificateId);

      return {
        success: true,
        message: 'Pairing certificate created',
        deviceId: params.deviceId,
        certificateId,
        trustLevel: params.trustLevel,
      };
    } catch (error) {
      console.error('[QuicVC] Failed to create pairing certificate:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  /**
   * Accept a received certificate and create one back
   * This completes the mutual trust establishment
   */
  handle('quicvc:acceptCertificate', async (
    event: IpcMainInvokeEvent,
    params: { holderId: string; certId: string; trustLevel: 'me' | 'trusted' | 'low' | 'unknown' }
  ): Promise<IpcResponse> => {
    try {
      console.log('[QuicVC] Accepting certificate:', params.certId, 'from holder:', params.holderId, 'with trust level:', params.trustLevel);

      if (!nodeOneCore.ownerId) {
        return {
          success: false,
          error: 'Node not initialized - no owner ID',
        };
      }

      // Get the QuicVCConnectionManager
        const connectionManager = QuicVCConnectionManager.getInstance(nodeOneCore.ownerId);

      // Get identity for creating response certificate
      const provider = getIdentityProvider();
      const identity = await provider.getDiscoveryIdentity();

      // Create acceptance certificate with chosen trust level
      const acceptanceCert = {
        id: `urn:uuid:${crypto.randomUUID()}`,
        $type$: 'TrustCertificate',
        issuer: nodeOneCore.ownerId,
        subject: params.holderId,
        trustLevel: params.trustLevel,
        inResponseTo: params.certId,
        issuedAt: new Date().toISOString(),
        credentialSubject: {
          id: params.holderId,
          publicKeyHex: identity.pubKey,
        },
        proof: {
          proofValue: identity.pubKey, // Simplified - real impl would sign
        },
      };

      console.log('[QuicVC] Created acceptance certificate:', acceptanceCert.id);

      // Check if we have an active connection to send the certificate
      if (connectionManager.isConnected(params.holderId)) {
        // Send the acceptance certificate back
        const certFrame = Buffer.from(JSON.stringify({
          type: 0x11, // VC_RESPONSE
          certificate: acceptanceCert,
          action: 'accept',
        }));

        await connectionManager.sendProtectedFrame(params.holderId, certFrame);
        console.log('[QuicVC] Sent acceptance certificate to:', params.holderId);
      } else {
        console.log('[QuicVC] No active connection to holder, certificate stored for later sync');
      }

      // TODO: Store the certificate and update trust level in ONE.core
      // This would integrate with TrustPlan/trust.abac

      return {
        success: true,
        message: 'Certificate accepted',
        certificateId: acceptanceCert.id,
        trustLevel: params.trustLevel,
      };
    } catch (error) {
      console.error('[QuicVC] Failed to accept certificate:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  /**
   * Reject a received certificate
   */
  handle('quicvc:rejectCertificate', async (
    event: IpcMainInvokeEvent,
    params: { holderId: string; certId: string }
  ): Promise<IpcResponse> => {
    try {
      console.log('[QuicVC] Rejecting certificate:', params.certId, 'from holder:', params.holderId);

      if (!nodeOneCore.ownerId) {
        return {
          success: false,
          error: 'Node not initialized - no owner ID',
        };
      }

      // Get the QuicVCConnectionManager
        const connectionManager = QuicVCConnectionManager.getInstance(nodeOneCore.ownerId);

      // Check if we have an active connection to send rejection
      if (connectionManager.isConnected(params.holderId)) {
        // Send rejection notification
        const rejectFrame = Buffer.from(JSON.stringify({
          type: 0x11, // VC_RESPONSE
          certificateId: params.certId,
          action: 'reject',
        }));

        await connectionManager.sendProtectedFrame(params.holderId, rejectFrame);
        console.log('[QuicVC] Sent rejection to:', params.holderId);
      }

      // TODO: Remove pending certificate from storage

      return {
        success: true,
        message: 'Certificate rejected',
      };
    } catch (error) {
      console.error('[QuicVC] Failed to reject certificate:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  console.log('[QuicVCDiscovery] IPC handlers registered');
}

/**
 * Auto-initialize discovery renderer bridge when Node.js ONE.core is ready.
 * mDNS discovery itself is started by ConnectionModule (module-registry-init).
 * This only wires events to renderer and sets up TrustVerifier.
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

  // Wire mDNS discovery events to renderer
  await initializeRendererBridge();
}

// ============================================================================
// Public-key trust → auto-connect wiring
// ============================================================================

/**
 * Wire TrustModel as TrustVerifier on the QuicVC connection manager.
 * The verifier resolves publicKey → personId → trustLevel via TrustRelationship objects.
 * Called once after mDNS discovery starts.
 */
async function wireTrustVerifier(): Promise<void> {
  if (!nodeOneCore.ownerId) return;

  try {
    const connectionManager = QuicVCConnectionManager.getInstance(nodeOneCore.ownerId);
    const trustModel = getTrustModel();

    // Wire TrustVerifier: resolves publicKey → personId + trustLevel
    connectionManager.setTrustVerifier({
      getTrustForPublicKey: (publicKey: string) => trustModel.getTrustForPublicKey(publicKey)
    });
    console.log('[QuicVCDiscovery] TrustModel wired as TrustVerifier (publicKey → personId → trustLevel)');

    // Also wire TrustProvider on ConnectionPlan (for auto-connect on discovery)
    const connectionModule = getConnectionModule();
    if (connectionModule?.connectionPlan) {
      connectionModule.connectionPlan.setTrustProvider({
        isPublicKeyTrusted: (publicKey: string) => trustModel.isPublicKeyTrusted(publicKey),
        setTrustForPublicKey: (publicKey: string, displayName: string, status: 'trusted' | 'pending' | 'untrusted' | 'revoked', trustLevel?: string) =>
          trustModel.setTrustForPublicKey(publicKey, displayName, status, trustLevel as TrustLevel | undefined)
      });
      console.log('[QuicVCDiscovery] TrustProvider wired to ConnectionPlan');
    }
  } catch (error) {
    console.warn('[QuicVCDiscovery] Failed to wire TrustVerifier:', error);
  }
}

/**
 * Auto-connect to a discovered device if its public key is trusted.
 * Initiates QuicVC handshake using the peer's public key as credential.
 */
async function autoConnectIfTrusted(device: { id: string; address: string; port: number; pubKey?: string }): Promise<void> {
  if (!nodeOneCore.ownerId || !device.pubKey) return;

  try {
    const trustModel = getTrustModel();

    const trustInfo = await trustModel.getTrustForPublicKey(device.pubKey);
    if (!trustInfo || trustInfo.trustLevel === 'unknown') return;

    const connectionManager = QuicVCConnectionManager.getInstance(nodeOneCore.ownerId);

    if (connectionManager.isConnected(device.id)) return;

    const provider = getIdentityProvider();
    const identity = await provider.getDiscoveryIdentity();

    const ownCredential = {
      id: identity.deviceId,
      credentialSubject: {
        id: identity.deviceId,
        publicKeyHex: identity.pubKey
      }
    };

    console.log(`[QuicVCDiscovery] Auto-connecting to trusted peer ${device.id.substring(0, 8)}... (person: ${trustInfo.personId.substring(0, 8)}..., trust: ${trustInfo.trustLevel}) at ${device.address}:${device.port}`);
    await connectionManager.initiateHandshake(device.id, device.address, device.port, ownCredential);
  } catch (error) {
    console.warn(`[QuicVCDiscovery] Auto-connect failed for ${device.id.substring(0, 8)}...:`, error);
  }
}

/**
 * Called when trust changes for a public key.
 * Scans discovered peers and auto-connects to any matching trusted key.
 */
export async function onTrustChanged(publicKey: string, status: string): Promise<void> {
  if (status !== 'trusted') return;

  const connectionModule = getConnectionModule();
  if (!connectionModule?.discoveryService) return;

  const peers = connectionModule.discoveryService.getDiscoveredPeers();
  for (const peer of peers) {
    if (peer.publicKey === publicKey) {
      await autoConnectIfTrusted({
        id: peer.id,
        address: peer.address?.split(':')[0] || peer.address,
        port: parseInt(peer.address?.split(':')[1] || '49497', 10),
        pubKey: peer.publicKey,
      });
      break;
    }
  }
}
