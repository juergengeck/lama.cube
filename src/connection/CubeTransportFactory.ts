/**
 * Cube (Electron/Node.js) Transport Factory for connection.core
 *
 * Creates both WebSocket and QUIC transports for Node.js platform.
 */
import type { TransportFactory, Transport } from '@lama/connection.core';
import { CubeWebSocketTransport } from './CubeWebSocketTransport.js';

export class CubeTransportFactory implements TransportFactory {
  async createTransport(type: 'websocket' | 'quic', url: string): Promise<Transport> {
    if (type === 'websocket') {
      return new CubeWebSocketTransport(url);
    }

    // QUIC not yet implemented for Cube
    throw new Error(`Transport type ${type} not supported yet on Cube platform`);
  }
}
