/**
 * Trust IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to TrustPlan methods.
 * Business logic lives in ../../../trust.core/plans/TrustPlan.ts
 */

import { TrustPlan } from '@refinio/trust.core/plans/TrustPlan.js';
import { TrustModel } from '@refinio/trust.core/models/TrustModel.js';
import nodeOneCore from '../../core/node-one-core.js';
import type { IpcMainInvokeEvent } from 'electron';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import type {
    SetTrustStatusRequest,
    GetTrustStatusRequest,
    VerifyDeviceKeyRequest,
    EvaluateTrustRequest,
    SetTrustLevelRequest,
    GetTrustLevelRequest,
    GetTrustChainRequest,
    GetAttestationsAboutRequest,
    GetAttestationsRequest
} from '@refinio/trust.core/plans/TrustPlan.js';

// Epoch-aware: automatically recreated when nodeOneCore re-initializes
let trustModel: TrustModel | null = null;
let trustPlan: TrustPlan | null = null;
let trustEpoch = -1;

/** @deprecated No-op: plan cache invalidates automatically via initEpoch */
export function resetTrustPlanSingletons(): void {}

function getTrustModel(): TrustModel | null {
    if (!nodeOneCore.leuteModel) return null;

    if (!trustModel || trustEpoch !== nodeOneCore.initEpoch) {
        trustModel = new TrustModel(
            nodeOneCore.leuteModel,
            undefined
        );
        trustPlan = null; // force trustPlan recreation too
        trustEpoch = nodeOneCore.initEpoch;
    }

    return trustModel;
}

function getTrustPlan(): TrustPlan | null {
    const model = getTrustModel();
    if (!model) return null;

    if (!trustPlan || trustEpoch !== nodeOneCore.initEpoch) {
        trustPlan = new TrustPlan(model);
    }

    return trustPlan;
}

// Export for internal use (e.g., TopicGroupManager implied trust, QuicVC trust verification)
export { getTrustPlan, getTrustModel };

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
    },

    // ========================================================================
    // Contact Detail Queries (for Contact Card sections)
    // ========================================================================

    /**
     * Get trust attestations about a person (where they are the peer/subject).
     * Returns all trust relationships where this person is trusted BY others.
     */
    async getAttestationsAbout(_event: IpcMainInvokeEvent, request: GetAttestationsAboutRequest) {
        console.log('[Trust IPC] getAttestationsAbout called:', request);
        const plan = getTrustPlan();
        if (!plan) {
            console.log('[Trust IPC] Trust plan not initialized');
            return { attestations: [], error: 'Trust plan not initialized' };
        }
        const result = await plan.getAttestationsAbout(request);
        console.log('[Trust IPC] getAttestationsAbout result:', result);
        return result;
    },

    /**
     * Get trust attestations by a person (where they are the issuer/establisher).
     * Returns all trust relationships that this person has established about others.
     */
    async getAttestationsBy(_event: IpcMainInvokeEvent, request: GetAttestationsRequest) {
        console.log('[Trust IPC] getAttestationsBy called:', request);
        const plan = getTrustPlan();
        if (!plan) {
            console.log('[Trust IPC] Trust plan not initialized');
            return { attestations: [], error: 'Trust plan not initialized' };
        }
        const result = await plan.getAttestationsBy(request);
        console.log('[Trust IPC] getAttestationsBy result:', result);
        return result;
    },

    /**
     * Get TrustKeysCertificates FOR a person.
     * Queries by profile hashes since certificates reference profiles.
     */
    async getCertificatesFor(_event: IpcMainInvokeEvent, { personId }: { personId: string }) {
        console.log('[Trust IPC] getCertificatesFor called for:', personId);
        try {
            const leuteModel = nodeOneCore.leuteModel;
            if (!leuteModel) {
                return {
                    certificates: [],
                    error: 'LeuteModel not initialized'
                };
            }

            // Find the Someone for this person and get their profiles
            const others = await leuteModel.others();
            const me = await leuteModel.me();
            const allSomeones = [me, ...others];

            const certificates: any[] = [];

            for (const someone of allSomeones) {
                const mainId = await someone.mainIdentity();
                console.log('[Trust IPC] Checking someone mainId:', mainId, 'looking for:', personId);
                if (mainId !== personId) continue;

                // Get all profiles for this someone
                const profiles = await someone.profiles();
                console.log('[Trust IPC] Found', profiles.length, 'profiles for person');

                for (const profile of profiles) {
                    // ProfileModel.idHash is the profile ID, loadedVersion is the content hash
                    const profileIdHash = profile.idHash;
                    console.log('[Trust IPC] Checking profile idHash:', profileIdHash);

                    // Query by profile ID hash (reverse map uses '*' which indexes all references)
                    const certs = await leuteModel.trust.getCertificatesOfType(
                        profileIdHash,
                        'TrustKeysCertificate'
                    );
                    console.log('[Trust IPC] Found', certs.length, 'certs for profile idHash');

                    // Also try with loadedVersion if available
                    const profileContentHash = profile.loadedVersion;
                    if (profileContentHash) {
                        const certs2 = await leuteModel.trust.getCertificatesOfType(
                            profileContentHash,
                            'TrustKeysCertificate'
                        );
                        console.log('[Trust IPC] Found', certs2.length, 'certs for profile contentHash');

                        for (const cd of certs2) {
                            certificates.push({
                                certificateType: 'TrustKeysCertificate',
                                status: cd.trusted ? 'valid' : 'untrusted',
                                subject: personId,
                                issuer: cd.signature?.issuer || 'unknown',
                                profileHash: profileContentHash.substring(0, 12) + '...',
                                hash: cd.certificateHash
                            });
                        }
                    }

                    for (const cd of certs) {
                        certificates.push({
                            certificateType: 'TrustKeysCertificate',
                            status: cd.trusted ? 'valid' : 'untrusted',
                            subject: personId,
                            issuer: cd.signature?.issuer || 'unknown',
                            profileHash: profileIdHash.substring(0, 12) + '...',
                            hash: cd.certificateHash
                        });
                    }
                }
                break; // Found the person
            }

            console.log('[Trust IPC] getCertificatesFor found:', certificates.length);
            return {
                certificates,
                error: undefined
            };
        } catch (error) {
            console.error('[Trust] Error getting certificates for person:', error);
            return {
                certificates: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    /**
     * Get certificates issued BY a person (as issuer/signer).
     */
    async getCertificatesBy(_event: IpcMainInvokeEvent, { personId }: { personId: string }) {
        console.log('[Trust IPC] getCertificatesBy called for:', personId);
        try {
            const leuteModel = nodeOneCore.leuteModel;
            if (!leuteModel) {
                return {
                    certificates: [],
                    error: 'LeuteModel not initialized'
                };
            }

            // Get all others and check their certificates for ones issued by this person
            const others = await leuteModel.others();
            const certificates: any[] = [];

            for (const someone of others) {
                const profiles = await someone.profiles();

                for (const profile of profiles) {
                    const profileHash = profile.loadedVersion;
                    if (!profileHash) continue;

                    const certs = await leuteModel.trust.getCertificatesOfType(
                        profileHash,
                        'TrustKeysCertificate'
                    );

                    for (const cd of certs) {
                        // Check if this certificate was issued by the requested person
                        if (cd.signature?.issuer === personId) {
                            const subjectId = await someone.mainIdentity();
                            certificates.push({
                                certificateType: 'TrustKeysCertificate',
                                status: cd.trusted ? 'valid' : 'untrusted',
                                subject: subjectId,
                                issuer: personId,
                                hash: cd.certificateHash
                            });
                        }
                    }
                }
            }

            console.log('[Trust IPC] getCertificatesBy found:', certificates.length);
            return {
                certificates,
                error: undefined
            };
        } catch (error) {
            console.error('[Trust] Error getting certificates by person:', error);
            return {
                certificates: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
};

export default trustHandlers;
