/**
 * Cube (Node.js) Storage Adapter for connection.core
 *
 * Uses file system for persistent storage (owner-specific after login).
 */
import type { StorageAdapter, PeerIdentity, VersionedCredential } from '@lama/connection.core';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CubeFileSystemStorage implements StorageAdapter {
  private storageDir: string;

  constructor(baseDir?: string) {
    // Use owner-specific directory (will be set after login in NodeOneCore)
    this.storageDir = baseDir || path.join(__dirname, '../../.connection-storage');
  }

  async init(): Promise<void> {
    // Ensure storage directory exists
    await fs.mkdir(this.storageDir, { recursive: true });
  }

  async savePeerIdentity(identity: PeerIdentity): Promise<void> {
    const filePath = path.join(this.storageDir, `peer-${identity.peerId}.json`);
    await fs.writeFile(filePath, JSON.stringify(identity, null, 2), 'utf-8');
  }

  async getPeerIdentity(peerId: string): Promise<PeerIdentity | null> {
    const filePath = path.join(this.storageDir, `peer-${peerId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getAllPeerIdentities(): Promise<PeerIdentity[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      const peerFiles = files.filter(f => f.startsWith('peer-') && f.endsWith('.json'));

      const identities: PeerIdentity[] = [];
      for (const file of peerFiles) {
        const filePath = path.join(this.storageDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        identities.push(JSON.parse(data));
      }
      return identities;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async deletePeerIdentity(peerId: string): Promise<void> {
    const filePath = path.join(this.storageDir, `peer-${peerId}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async saveCredential(credential: VersionedCredential): Promise<void> {
    const dirPath = path.join(this.storageDir, 'credentials');
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${credential.type}-v${credential.version}.json`);
    await fs.writeFile(filePath, JSON.stringify(credential, null, 2), 'utf-8');
  }

  async getCredential(type: string, version: number): Promise<VersionedCredential | null> {
    const filePath = path.join(this.storageDir, 'credentials', `${type}-v${version}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getLatestCredential(type: string): Promise<VersionedCredential | null> {
    try {
      const dirPath = path.join(this.storageDir, 'credentials');
      const files = await fs.readdir(dirPath);
      const credFiles = files
        .filter(f => f.startsWith(`${type}-v`) && f.endsWith('.json'))
        .sort()
        .reverse(); // Latest version first

      if (credFiles.length === 0) {
        return null;
      }

      const filePath = path.join(dirPath, credFiles[0]);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async deleteCredential(type: string, version: number): Promise<void> {
    const filePath = path.join(this.storageDir, 'credentials', `${type}-v${version}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
