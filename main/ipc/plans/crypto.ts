/**
 * Crypto IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to CryptoHandler methods.
 * Business logic lives in ../../../lama.core/handlers/CryptoHandler.ts
 */

import { IpcMainInvokeEvent } from 'electron';
import { CryptoPlan } from '@lama/core/plans/CryptoPlan.js';
import nodeOneCore from '../../core/node-one-core.js';

// Singleton handler instance
let cryptoHandler: CryptoPlan | null = null;

/**
 * Get handler instance (creates on first use)
 */
function getHandler(): CryptoPlan {
  if (!cryptoHandler) {
    cryptoHandler = new CryptoPlan(nodeOneCore);
  }
  return cryptoHandler;
}

/**
 * Get available keys from ONE.core
 */
async function getKeys(event: IpcMainInvokeEvent) {
  return await getHandler().getKeys({});
}

/**
 * Get available certificates from ONE.core
 */
async function getCertificates(event: IpcMainInvokeEvent) {
  return await getHandler().getCertificates({});
}

/**
 * Export a key or certificate from ONE.core
 */
async function exportCryptoObject(event: IpcMainInvokeEvent, request: any) {
  return await getHandler().exportCryptoObject(request);
}

export default {
  getKeys,
  getCertificates,
  exportCryptoObject
};