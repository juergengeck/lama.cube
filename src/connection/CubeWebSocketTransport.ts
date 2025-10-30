/**
 * Cube (Node.js) WebSocket Transport Implementation
 *
 * Wraps Node.js 'ws' library for connection.core
 */
import type { Transport, TransportState } from '@lama/connection.core';
import { WebSocket } from 'ws';

export class CubeWebSocketTransport implements Transport {
  readonly type = 'websocket' as const;
  private ws: WebSocket | null = null;
  private _state: TransportState = 'disconnected';
  private messageListeners: Set<(data: ArrayBuffer) => void> = new Set();
  private stateListeners: Set<(state: TransportState) => void> = new Set();

  constructor(private url: string) {}

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      return;
    }

    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.setState('connected');
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          // Convert Buffer to ArrayBuffer
          const arrayBuffer = data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength
          );
          this.messageListeners.forEach(listener => listener(arrayBuffer));
        });

        this.ws.on('error', (error) => {
          console.error('[CubeWebSocketTransport] Error:', error);
          this.setState('error');
          reject(error);
        });

        this.ws.on('close', () => {
          this.setState('disconnected');
        });
      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.ws || this._state === 'disconnected') {
      return;
    }

    return new Promise((resolve) => {
      if (!this.ws) {
        resolve();
        return;
      }

      this.ws.once('close', () => {
        this.ws = null;
        this.setState('disconnected');
        resolve();
      });

      this.ws.close();
    });
  }

  async send(data: ArrayBuffer): Promise<void> {
    if (!this.ws || this._state !== 'connected') {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not available'));
        return;
      }

      // Convert ArrayBuffer to Buffer for ws library
      const buffer = Buffer.from(data);
      this.ws.send(buffer, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  onMessage(listener: (data: ArrayBuffer) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStateChange(listener: (state: TransportState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  getState(): TransportState {
    return this._state;
  }

  private setState(state: TransportState): void {
    this._state = state;
    this.stateListeners.forEach(listener => listener(state));
  }
}
