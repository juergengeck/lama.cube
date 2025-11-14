/**
 * Trust IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to TrustPlan methods.
 * Business logic lives in ../../../trust.core/plans/TrustPlan.ts
 */

import { TrustPlan } from '@trust/core/plans/TrustPlan.js';
import { TrustModel } from '@trust/core/models/TrustModel.js';
import nodeOneCore from '../../core/node-one-core.js';
import type { IpcMainInvokeEvent } from 'electron';
import type {
    SetTrustStatusRequest,
    GetTrustStatusRequest,
    VerifyDeviceKeyRequest,
    EvaluateTrustRequest,
    SetTrustLevelRequest,
    GetTrustLevelRequest,
    GetTrustChainRequest
} from '@trust/core/plans/TrustPlan.js';

// Model and plan instances
let trustModel: TrustModel | null = null;
let trustPlan: TrustPlan | null = null;

/**
 * Get or create trust model instance
 */
function getTrustModel(): TrustModel {
    if (!trustModel && nodeOneCore.initialized) {
        // Create TrustModel with LeuteModel and optional TrustedKeysManager
        trustModel = new TrustModel(
            nodeOneCore.leuteModel,
            undefined  // TrustedKeysManager is optional
        );
    }

    if (!trustModel) {
        throw new Error('Trust model not initialized - ONE.core not provisioned');
    }

    return trustModel;
}

/**
 * Get or create trust plan instance
 */
function getTrustPlan(): TrustPlan {
    if (!trustPlan && nodeOneCore.initialized) {
        const model = getTrustModel();
        trustPlan = new TrustPlan(model);
    }

    if (!trustPlan) {
        throw new Error('Trust plan not initialized - ONE.core not provisioned');
    }

    return trustPlan;
}

const trustHandlers = {
    /**
     * Set trust status for a device/person
     */
    async setTrustStatus(event: IpcMainInvokeEvent, request: SetTrustStatusRequest) {
        return await getTrustPlan().setTrustStatus(request);
    },

    /**
     * Get trust status for a device/person
     */
    async getTrustStatus(event: IpcMainInvokeEvent, request: GetTrustStatusRequest) {
        return await getTrustPlan().getTrustStatus(request);
    },

    /**
     * Get all trusted devices
     */
    async getTrustedDevices(event: IpcMainInvokeEvent) {
        return await getTrustPlan().getTrustedDevices();
    },

    /**
     * Verify a device's public key
     */
    async verifyDeviceKey(event: IpcMainInvokeEvent, request: VerifyDeviceKeyRequest) {
        return await getTrustPlan().verifyDeviceKey(request);
    },

    /**
     * Evaluate trust level for a person
     */
    async evaluateTrust(event: IpcMainInvokeEvent, request: EvaluateTrustRequest) {
        return await getTrustPlan().evaluateTrust(request);
    },

    /**
     * Get device credentials
     */
    async getDeviceCredentials(event: IpcMainInvokeEvent) {
        return await getTrustPlan().getDeviceCredentials();
    },

    /**
     * Set trust level for a person
     */
    async setTrustLevel(event: IpcMainInvokeEvent, request: SetTrustLevelRequest) {
        return await getTrustPlan().setTrustLevel(request);
    },

    /**
     * Get trust level for a person
     */
    async getTrustLevel(event: IpcMainInvokeEvent, request: GetTrustLevelRequest) {
        return await getTrustPlan().getTrustLevel(request);
    },

    /**
     * Get trust chain for a person (for chain of trust visualization)
     */
    async getTrustChain(event: IpcMainInvokeEvent, request: GetTrustChainRequest) {
        return await getTrustPlan().getTrustChain(request);
    }
};

export default trustHandlers;
