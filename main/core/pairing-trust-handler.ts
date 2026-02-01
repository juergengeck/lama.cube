/**
 * Pairing Trust Handler
 *
 * Handles trust establishment and profile sharing after successful pairing.
 * Based on one.leute's LeuteAccessRightsManager.trustPairingKeys implementation.
 *
 * Integrates with CAPlan for journal/audit trail visibility when certificates are issued.
 * Creates AccessCertificate for certificate-based access control (trust.abac).
 */

import { getAllEntries } from '@refinio/one.core/lib/reverse-map-query.js'
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js'
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js'
import ProfileModel from '@refinio/one.models/lib/models/Leute/ProfileModel.js'
import { createAccess } from '@refinio/one.core/lib/access.js'
import { SET_ACCESS_MODE } from '@refinio/one.core/lib/storage-base-common.js'
import { wait } from '@refinio/one.core/lib/util/promise.js'
import type { CAPlan } from '@refinio/api/plans/CAPlan.js'
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js'
import type { Person } from '@refinio/one.core/lib/recipes.js'
import {
  createPairingCertificate,
  type PairingCertificateResult
} from '@refinio/trust.abac'
import { tracePairing } from '@refinio/lama.core/services/trace-service.js'
import { getJournalPlan } from '../ipc/plans/journal.js'

/**
 * Trust the keys of a newly paired remote peer.
 * This is critical for enabling secure communication.
 *
 * @param {Object} trust - The TrustedKeysManager instance
 * @param {boolean} initiatedLocally - Whether pairing was initiated by us
 * @param {string} localPersonId - Our person ID
 * @param {string} localInstanceId - Our instance ID
 * @param {string} remotePersonId - Remote person ID
 * @param {string} remoteInstanceId - Remote instance ID
 * @param {string} token - Pairing token
 * @param {CAPlan} caPlan - Optional CAPlan for journal/audit trail (creates Story entries)
 */
export async function trustPairingKeys(
  trust: any,
  initiatedLocally: any,
  localPersonId: any,
  localInstanceId: any,
  remotePersonId: any,
  remoteInstanceId: any,
  token: any,
  caPlan?: CAPlan
) {
  tracePairing('started', {
    initiatedLocally,
    localPerson: localPersonId,
    remotePerson: remotePersonId,
    localInstance: localInstanceId,
    remoteInstance: remoteInstanceId
  })

  // Keys are transported after connection establishment via CHUM
  // We need to wait for them to arrive, with retries
  const maxRetries = 10
  const retryDelay = 1000 // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      tracePairing('keys_query_attempt', { attempt, maxRetries })

      // Query for Keys objects owned by the remote person
      const keys = await getAllEntries(remotePersonId, 'Keys')

      if (keys.length > 0) {
        tracePairing('keys_found', { count: keys.length, remotePerson: remotePersonId })

        // Get the first key object
        const key = await getObject(keys[0])
        tracePairing('key_object_retrieved', {
          owner: key.owner,
          hasPublicKey: !!key.publicKey,
          hasPublicSignKey: !!key.publicSignKey
        })

        // Create SignKey descriptor for the profile
        const signKey = {
          $type$: 'SignKey' as const,
          key: key.publicSignKey
        }

        // Create a Profile with the sign key
        // This profile represents our view/trust of the remote person
        const profile = await ProfileModel.constructWithNewProfile(
          remotePersonId,
          localPersonId,
          'trusted-peer', // Profile type
          [], // Communication endpoints (can be added later)
          [signKey as any] // Person descriptions (the sign key)
        )

        if (!profile.loadedVersion) {
          throw new Error('Profile model has no hash for profile with sign key')
        }

        tracePairing('profile_created', { profileHash: profile.loadedVersion })

        // Issue a trust certificate for this profile
        await trust.certify('TrustKeysCertificate', { profile: profile.loadedVersion })
        tracePairing('trust_cert_issued', { profileHash: profile.loadedVersion })

        // Record TrustKeysCertificate in journal
        try {
          const journalPlan = getJournalPlan();
          await journalPlan.recordTrustCertificate({
            action: 'created',
            certificateType: 'TrustKeysCertificate',
            subject: remotePersonId.toString(),
            issuer: localPersonId.toString(),
            certificateHash: profile.loadedVersion.toString(),
            context: 'device-pairing',
            profile: profile.loadedVersion.toString(),
            trustLevel: 'trusted'
          });
          tracePairing('trust_journal_recorded', { profileHash: profile.loadedVersion });
        } catch (journalError) {
          console.warn('[PairingTrust] Failed to record TrustKeysCertificate in journal:', journalError);
        }

        // Create journal entry for trust certification (if CAPlan available)
        if (caPlan) {
          try {
            await caPlan.certifyPairingTrust({
              trust,
              profileHash: profile.loadedVersion,
              remotePersonId,
              owner: localPersonId
            })
            tracePairing('trust_journal_entry_created', { profileHash: profile.loadedVersion })
          } catch (journalError) {
            tracePairing('trust_journal_entry_failed', { error: (journalError as Error).message })
            // Non-fatal - trust is still established
          }
        }

        // Refresh trust caches to apply the new certificate
        await trust.refreshCaches()

        // Issue CA device certificate for journal visibility (if CAPlan available)
        if (caPlan) {
          try {
            const caResult = await caPlan.issueDeviceCertificate({
              subject: remotePersonId,
              subjectPublicKey: key.publicSignKey,
              trustLevel: 'full',
              trustReason: 'Device pairing completed successfully',
              verificationMethod: 'pairing-protocol'
            })
            // Handle union type: ExecutionResult has storyId, plain response has certificateId
            const resultId = 'storyId' in caResult && caResult.storyId
              ? caResult.storyId.toString()
              : ('result' in caResult && caResult.result
                ? caResult.result.certificateId
                : (caResult as any).certificateId || 'unknown')
            tracePairing('ca_cert_issued', { certId: resultId })
          } catch (caError) {
            tracePairing('ca_cert_failed', { error: (caError as Error).message })
            // Non-fatal - trust is still established via TrustKeysCertificate
          }
        }

        tracePairing('completed', { success: true, remotePerson: remotePersonId, profileHash: profile.loadedVersion })
        return { success: true, profileHash: profile.loadedVersion }
      }

      // Keys not found yet, wait and retry
      if (attempt < maxRetries) {
        tracePairing('keys_not_found', { attempt, waitingMs: retryDelay })
        await wait(retryDelay)
      }

    } catch (error) {
      tracePairing('attempt_error', { attempt, error: (error as Error).message })

      if (attempt < maxRetries) {
        await wait(retryDelay)
      } else {
        // Final attempt failed
        tracePairing('failed', { error: (error as Error).message, attempts: maxRetries })
        throw error
      }
    }
  }

  // If we get here, we couldn't find keys after all retries
  tracePairing('failed', { reason: 'Keys not available', attempts: maxRetries })
  return { success: false, reason: 'Keys not available' }
}

/**
 * Share our main profile with the newly paired peer.
 * This allows them to see our information and establish trust.
 *
 * @param {Object} leuteModel - The LeuteModel instance
 * @param {string} remotePersonId - The remote person to share with
 */
export async function shareMainProfileWithPeer(leuteModel: any, remotePersonId: any): Promise<any> {
  tracePairing('profile_share_started', { remotePerson: remotePersonId })

  try {
    // Get our main identity and profile
    const me = await leuteModel.me()
    const mainProfile = me.mainProfileLazyLoad()

    if (!mainProfile || !mainProfile.idHash) {
      tracePairing('profile_share_failed', { reason: 'No main profile' })
      return { success: false, reason: 'No main profile' }
    }

    // Grant access to our profile for the remote person
    const setAccessParam = {
      id: mainProfile.idHash,
      person: [remotePersonId], // Grant access to this specific person
      hashGroup: [], // No group access needed for P2P
      mode: SET_ACCESS_MODE.ADD
    }

    await createAccess([setAccessParam])

    tracePairing('profile_shared', { profileHash: mainProfile.idHash, remotePerson: remotePersonId })
    return { success: true, profileHash: mainProfile.idHash }

  } catch (error) {
    tracePairing('profile_share_failed', { error: (error as Error).message })
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Complete trust establishment after pairing.
 * This combines key trust and profile sharing.
 *
 * @param {Object} params - Parameters object
 * @param {Object} params.trust - TrustedKeysManager instance
 * @param {Object} params.leuteModel - LeuteModel instance
 * @param {boolean} params.initiatedLocally - Whether we initiated pairing
 * @param {string} params.localPersonId - Our person ID
 * @param {string} params.localInstanceId - Our instance ID
 * @param {string} params.remotePersonId - Remote person ID
 * @param {string} params.remoteInstanceId - Remote instance ID
 * @param {string} params.token - Pairing token
 * @param {CAPlan} params.caPlan - Optional CAPlan for journal/audit trail
 */
export async function completePairingTrust(params: any): Promise<any> {
  const {
    trust,
    leuteModel,
    initiatedLocally,
    localPersonId,
    localInstanceId,
    remotePersonId,
    remoteInstanceId,
    token,
    caPlan
  } = params

  tracePairing('complete_trust_started', {
    initiatedLocally,
    localPerson: localPersonId,
    remotePerson: remotePersonId
  })

  let accessCertificate: PairingCertificateResult | undefined

  try {
    // Step 1: Trust the remote peer's keys (with optional CA certificate for journal)
    const trustResult = await trustPairingKeys(
      trust,
      initiatedLocally,
      localPersonId,
      localInstanceId,
      remotePersonId,
      remoteInstanceId,
      token,
      caPlan
    )

    if (!trustResult.success) {
      tracePairing('key_trust_warning', { reason: trustResult.reason })
      // Continue anyway - profile sharing can still work
    }

    // Step 1.5: Create AccessCertificate for certificate-based access control
    // Determine if this is own device (IoM/IoP) or external contact
    // Own devices share the same Person ID, external contacts have different Person IDs
    const isOwnDevice = localPersonId === remotePersonId

    try {
      accessCertificate = await createPairingCertificate({
        localPersonId: localPersonId as SHA256IdHash<Person>,
        remotePersonId: remotePersonId as SHA256IdHash<Person>,
        storeObject: async (obj) => {
          // Cast to any since AccessCertificate is defined in trust.abac
          // The recipe must be registered at initialization time
          const result = await storeVersionedObject(obj as any)
          return { hash: result.hash, idHash: result.idHash }
        },
        // Default pairing grants - own devices get full access, contacts get restricted
        trustLevel: isOwnDevice ? 'me' : 'trusted',
        isOwnDevice,
        // Contacts don't get WhatsApp access by default (can be granted later)
        includeWhatsApp: false,
        delegationAllowed: !isOwnDevice // Only own devices can delegate
      })
      tracePairing('access_cert_created', { certHash: accessCertificate.certHash, certId: accessCertificate.certId })

      // Record AccessCertificate in journal
      try {
        const journalPlan = getJournalPlan();
        await journalPlan.recordTrustCertificate({
          action: 'created',
          certificateType: 'AccessCertificate',
          subject: remotePersonId.toString(),
          issuer: localPersonId.toString(),
          certificateHash: accessCertificate.certHash,
          context: 'device-pairing',
          trustLevel: isOwnDevice ? 'full' : 'trusted'
        });
        tracePairing('access_cert_journal_recorded', { certHash: accessCertificate.certHash });
      } catch (journalError) {
        console.warn('[PairingTrust] Failed to record AccessCertificate in journal:', journalError);
      }
    } catch (certError) {
      tracePairing('access_cert_failed', { error: (certError as Error).message })
      // Non-fatal - trust is still established via TrustKeysCertificate
    }

    // Step 2: Share our profile with the remote peer
    const shareResult = await shareMainProfileWithPeer(leuteModel, remotePersonId)

    if (!shareResult.success) {
      tracePairing('profile_share_warning', { reason: shareResult.reason })
    }

    tracePairing('complete_trust_finished', {
      success: true,
      keyTrust: trustResult.success,
      accessCert: !!accessCertificate,
      profileShare: shareResult.success
    })
    return {
      success: true,
      keyTrust: trustResult,
      accessCertificate: accessCertificate ? {
        certHash: accessCertificate.certHash,
        certId: accessCertificate.certId
      } : undefined,
      profileShare: shareResult
    }

  } catch (error) {
    tracePairing('complete_trust_failed', { error: (error as Error).message })
    return {
      success: false,
      error: (error as Error).message
    }
  }
}