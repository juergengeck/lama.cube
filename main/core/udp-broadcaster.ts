/**
 * UDP Broadcaster - Re-exports platform-agnostic UDPBroadcaster with Node.js socket
 *
 * This module provides a convenience factory for creating UDPBroadcaster
 * instances with the Node.js dgram socket implementation.
 */

import { UDPBroadcaster as CoreUDPBroadcaster } from '@lama/connection.core';
import type { DiscoveryIdentityProvider, DiscoveryIdentity } from '@lama/connection.core';
import { NodeUDPSocketService } from './node-udp-socket-service.js';

/**
 * Create a UDPBroadcaster with Node.js dgram socket implementation
 */
export function createNodeUDPBroadcaster(
  identityProvider: DiscoveryIdentityProvider
): { broadcaster: CoreUDPBroadcaster; getIdentity: () => Promise<DiscoveryIdentity> } {
  const socketService = new NodeUDPSocketService();

  // Get identity synchronously for broadcaster constructor
  // (broadcaster needs deviceId and deviceName upfront)
  let currentIdentity: DiscoveryIdentity | null = null;

  const getIdentity = async (): Promise<DiscoveryIdentity> => {
    if (!currentIdentity) {
      currentIdentity = await identityProvider.getDiscoveryIdentity();
    }
    return currentIdentity;
  };

  // Create broadcaster with placeholder values - will be updated on start
  const broadcaster = new CoreUDPBroadcaster(
    socketService,
    'pending', // Will be set from identity
    'pending'  // Will be set from identity
  );

  return { broadcaster, getIdentity };
}

// Re-export the core broadcaster type for convenience
export { CoreUDPBroadcaster as UDPBroadcaster };
export type { DiscoveryIdentityProvider };
