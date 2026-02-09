/**
 * UDP Transport Factory
 *
 * Creates Transport instances for peer-to-peer handshake verification.
 * Uses Node.js dgram for UDP communication.
 */

import dgram from 'dgram';
import type { Transport } from '@refinio/connection.core';

export interface UdpTransportOptions {
  /** Timeout for connection establishment in ms (default: 5000) */
  connectTimeout?: number;
  /** Socket receive buffer size */
  receiveBufferSize?: number;
}

/**
 * Create a UDP transport for handshake communication.
 *
 * @param address - Target address in format "host:port"
 * @param options - Optional transport configuration
 * @returns Transport instance
 */
export async function createUdpTransport(
  address: string,
  options: UdpTransportOptions = {}
): Promise<Transport> {
  const { connectTimeout = 5000 } = options;

  // Parse address (format: "host:port")
  const [host, portStr] = address.split(':');
  const port = portStr ? parseInt(portStr, 10) : 8766; // Default handshake port

  if (!host) {
    throw new Error(`Invalid address format: ${address}`);
  }

  console.log('[UdpTransport] Creating transport for:', host, ':', port);

  let socket: dgram.Socket | null = null;
  let state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' = 'disconnected';
  let stateCallback: ((state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected') => void) | null = null;
  let receiveCallback: ((data: Uint8Array) => void) | null = null;

  const transport: Transport = {
    type: 'quicvc' as const,

    connect: async (addr: string): Promise<void> => {
      if (state === 'connected' || state === 'connecting') {
        console.log('[UdpTransport] Already connected/connecting');
        return;
      }

      // Parse the provided address (may differ from initial)
      const [connectHost, connectPortStr] = addr.split(':');
      const connectPort = connectPortStr ? parseInt(connectPortStr, 10) : port;
      const targetHost = connectHost || host;

      console.log('[UdpTransport] Connecting to:', targetHost, ':', connectPort);
      state = 'connecting';
      stateCallback?.(state);

      return new Promise((resolve, reject) => {
        // Create UDP socket
        socket = dgram.createSocket('udp4');

        const connectTimeoutId = setTimeout(() => {
          if (state === 'connecting') {
            console.log('[UdpTransport] Connection timeout');
            state = 'disconnected';
            stateCallback?.(state);
            socket?.close();
            socket = null;
            reject(new Error('Connection timeout'));
          }
        }, connectTimeout);

        socket.on('error', (err: Error) => {
          console.error('[UdpTransport] Socket error:', err);
          clearTimeout(connectTimeoutId);
          if (state !== 'disconnected') {
            state = 'disconnected';
            stateCallback?.(state);
          }
          reject(err);
        });

        socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
          console.log('[UdpTransport] Received', msg.length, 'bytes from', rinfo.address, ':', rinfo.port);
          if (receiveCallback) {
            receiveCallback(new Uint8Array(msg));
          }
        });

        socket.on('close', () => {
          console.log('[UdpTransport] Socket closed');
          if (state !== 'disconnected') {
            state = 'disconnected';
            stateCallback?.(state);
          }
        });

        // Bind to any available port
        socket.bind(0, () => {
          const localAddr = socket?.address();
          console.log('[UdpTransport] Bound to local port:', localAddr?.port);

          // UDP is connectionless, but we "connect" to associate the socket with the peer
          // This allows us to use socket.send() without specifying the destination each time
          socket?.connect(connectPort, targetHost, () => {
            clearTimeout(connectTimeoutId);
            console.log('[UdpTransport] Connected to', targetHost, ':', connectPort);
            state = 'connected';
            stateCallback?.(state);
            resolve();
          });
        });
      });
    },

    send: async (data: Uint8Array): Promise<void> => {
      if (!socket || state !== 'connected') {
        throw new Error('Socket not connected');
      }

      return new Promise((resolve, reject) => {
        console.log('[UdpTransport] Sending', data.length, 'bytes');
        socket!.send(Buffer.from(data), (err?: Error | null) => {
          if (err) {
            console.error('[UdpTransport] Send error:', err);
            reject(err);
          } else {
            console.log('[UdpTransport] Send complete');
            resolve();
          }
        });
      });
    },

    onReceive: (callback: (data: Uint8Array) => void): void => {
      receiveCallback = callback;
    },

    onStateChange: (callback: (state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected') => void): void => {
      stateCallback = callback;
    },

    close: (): void => {
      if (state === 'disconnected' || state === 'disconnecting') {
        return;
      }

      console.log('[UdpTransport] Closing transport');
      state = 'disconnecting';
      stateCallback?.(state);

      if (socket) {
        try {
          socket.close();
        } catch (e) {
          console.warn('[UdpTransport] Error closing socket:', e);
        }
        socket = null;
      }

      state = 'disconnected';
      stateCallback?.(state);
    },

    getState: (): 'connecting' | 'connected' | 'disconnecting' | 'disconnected' => {
      return state;
    }
  };

  return transport;
}

/**
 * Transport factory function for DiscoveryCollectionService.
 * Matches the createTransport signature expected by DiscoveryCollectionDependencies.
 */
export function createTransportFactory(options: UdpTransportOptions = {}): (address: string) => Promise<Transport> {
  return async (address: string) => createUdpTransport(address, options);
}
