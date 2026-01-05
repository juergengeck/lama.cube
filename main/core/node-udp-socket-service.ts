/**
 * NodeUDPSocketService - Node.js implementation of UDPSocketService
 *
 * Wraps Node's dgram module to implement the platform-agnostic
 * UDPSocketService interface for use with UDPDiscoveryProvider.
 */

import dgram from 'dgram';
import type { UDPSocketService, UDPMessageEvent } from '@lama/connection.core';

export class NodeUDPSocketService implements UDPSocketService {
  private socket: dgram.Socket | null = null;
  private messageCallbacks: ((event: UDPMessageEvent) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private closeCallbacks: (() => void)[] = [];
  private bound = false;

  async bind(port: number): Promise<boolean> {
    if (this.socket) {
      console.warn('[NodeUDPSocketService] Socket already exists');
      return this.bound;
    }

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      // Set up event handlers
      this.socket.on('message', (msg, rinfo) => {
        const event: UDPMessageEvent = {
          data: msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength),
          address: rinfo.address,
          port: rinfo.port,
        };
        this.messageCallbacks.forEach((cb) => cb(event));
      });

      this.socket.on('error', (err) => {
        console.error('[NodeUDPSocketService] Socket error:', err);
        this.errorCallbacks.forEach((cb) => cb(err));
      });

      this.socket.on('close', () => {
        console.log('[NodeUDPSocketService] Socket closed');
        this.bound = false;
        this.closeCallbacks.forEach((cb) => cb());
      });

      // Bind to port
      await new Promise<void>((resolve, reject) => {
        this.socket!.bind(port, () => {
          try {
            this.socket!.setBroadcast(true);
            console.log('[NodeUDPSocketService] Bound to port', port);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      this.bound = true;
      return true;
    } catch (error) {
      console.error('[NodeUDPSocketService] Failed to bind:', error);
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      return false;
    }
  }

  async send(data: Uint8Array, port: number, address: string): Promise<void> {
    if (!this.socket || !this.bound) {
      throw new Error('[NodeUDPSocketService] Socket not bound');
    }

    return new Promise((resolve, reject) => {
      this.socket!.send(Buffer.from(data), port, address, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.socket) return;

    return new Promise((resolve) => {
      this.socket!.close(() => {
        this.socket = null;
        this.bound = false;
        resolve();
      });
    });
  }

  isActive(): boolean {
    return this.socket !== null && this.bound;
  }

  onMessage(callback: (event: UDPMessageEvent) => void): void {
    this.messageCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }
}
