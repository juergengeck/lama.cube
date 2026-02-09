/**
 * TopicAccessManager - Issues topic-specific access certificates
 *
 * Integrates trust.abac with TopicModel to ensure participants receive
 * topic-specific access certificates (e.g., 'chat:topicId') instead of
 * wildcard access (e.g., 'chat:*').
 *
 * This is a lama.cube concern because:
 * 1. one.models shouldn't depend on trust.abac (layering)
 * 2. Certificate issuance is platform-specific (storage, keys)
 *
 * @example
 * ```typescript
 * import { topicAccessManager } from './topic-access-manager.js';
 *
 * // After creating a topic:
 * await topicAccessManager.grantTopicAccessToParticipants(topicId, participants);
 *
 * // When removing a participant:
 * await topicAccessManager.revokeTopicAccessFromParticipant(topicId, participantId);
 * ```
 */

import type { SHA256IdHash, SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import {
  grantTopicAccess,
  revokeTopicAccess,
  grantMultipleTopicAccess,
  type TopicAccessConfig
} from '@refinio/trust.abac';
import type LeuteModel from '@refinio/one.models/lib/models/Leute/LeuteModel.js';
import { createMessageBus } from '@refinio/one.core/lib/message-bus.js';

const MessageBus = createMessageBus('TopicAccessManager');

/**
 * Manages topic-specific access certificates.
 *
 * Issues AccessCertificates with topic-specific contexts (e.g., 'chat:topicId')
 * when participants are added to topics, and revokes them when removed.
 */
class TopicAccessManager {
  private leuteModel: LeuteModel | null = null;
  private initialized = false;

  /**
   * Initialize with LeuteModel to get the local person ID.
   */
  init(leuteModel: LeuteModel): void {
    this.leuteModel = leuteModel;
    this.initialized = true;
    MessageBus.send('log', '[TopicAccessManager] Initialized');
  }

  /**
   * Check if manager is ready to issue certificates.
   */
  isReady(): boolean {
    return this.initialized && this.leuteModel !== null;
  }

  /**
   * Get local person ID from LeuteModel.
   */
  private async getLocalPersonId(): Promise<SHA256IdHash<Person>> {
    if (!this.leuteModel) {
      throw new Error('TopicAccessManager not initialized');
    }
    const personId = await this.leuteModel.myMainIdentity();
    if (!personId) {
      throw new Error('No local identity found');
    }
    return personId;
  }

  /**
   * Grant topic-specific access to a single participant.
   *
   * Issues an AccessCertificate with context 'chat:topicId'.
   *
   * @param topicId - The topic ID (idHash as string)
   * @param participantId - The participant to grant access to
   */
  async grantTopicAccessToParticipant(
    topicId: string,
    participantId: SHA256IdHash<Person>
  ): Promise<void> {
    const localPersonId = await this.getLocalPersonId();

    // Don't issue certificate to self
    if (participantId === localPersonId) {
      MessageBus.send('log', `[TopicAccessManager] Skipping self-certificate for topic ${topicId.substring(0, 8)}`);
      return;
    }

    try {
      await grantTopicAccess({
        localPersonId,
        remotePersonId: participantId,
        topicId,
        storeObject: async (obj) => {
          const result = await storeVersionedObject(obj as any);
          return { hash: result.hash, idHash: result.idHash };
        },
        // Note: loadExistingContexts would need CertificateIndex integration
        // For now, each grant creates a fresh certificate
        // This is safe because certificate ID is stable (issuer:subject)
        trustLevel: 'trusted',
        delegationAllowed: false
      });

      MessageBus.send('log',
        `[TopicAccessManager] Granted access to topic ${topicId.substring(0, 8)} for ${participantId.substring(0, 8)}`
      );
    } catch (error) {
      MessageBus.send('warn',
        `[TopicAccessManager] Failed to grant topic access: ${(error as Error).message}`
      );
      // Non-fatal - ONE.core object access still works
    }
  }

  /**
   * Grant topic-specific access to multiple participants.
   *
   * More efficient than calling grantTopicAccessToParticipant for each.
   *
   * @param topicId - The topic ID (idHash as string)
   * @param participants - The participants to grant access to
   */
  async grantTopicAccessToParticipants(
    topicId: string,
    participants: SHA256IdHash<Person>[]
  ): Promise<void> {
    const localPersonId = await this.getLocalPersonId();

    // Filter out self
    const remoteParticipants = participants.filter(p => p !== localPersonId);

    if (remoteParticipants.length === 0) {
      MessageBus.send('log', `[TopicAccessManager] No remote participants for topic ${topicId.substring(0, 8)}`);
      return;
    }

    // Issue certificates to each participant
    // Note: We can't batch into one certificate because each participant needs their own
    for (const participantId of remoteParticipants) {
      await this.grantTopicAccessToParticipant(topicId, participantId);
    }

    MessageBus.send('log',
      `[TopicAccessManager] Granted access to topic ${topicId.substring(0, 8)} for ${remoteParticipants.length} participants`
    );
  }

  /**
   * Revoke topic-specific access from a participant.
   *
   * Updates the AccessCertificate to remove the topic context.
   *
   * @param topicId - The topic ID (idHash as string)
   * @param participantId - The participant to revoke access from
   */
  async revokeTopicAccessFromParticipant(
    topicId: string,
    participantId: SHA256IdHash<Person>
  ): Promise<void> {
    const localPersonId = await this.getLocalPersonId();

    // Can't revoke from self
    if (participantId === localPersonId) {
      return;
    }

    try {
      // Note: This requires knowing the current contexts
      // For now, we'd need CertificateIndex integration to look them up
      // TODO: Integrate with CertificateIndex to load existing contexts
      MessageBus.send('warn',
        `[TopicAccessManager] revokeTopicAccess not yet implemented - requires CertificateIndex integration`
      );
    } catch (error) {
      MessageBus.send('warn',
        `[TopicAccessManager] Failed to revoke topic access: ${(error as Error).message}`
      );
    }
  }

  /**
   * Grant access to multiple topics at once for a single participant.
   *
   * Useful when a contact is first paired and needs access to existing topics.
   *
   * @param topicIds - Array of topic IDs
   * @param participantId - The participant to grant access to
   */
  async grantMultipleTopicsToParticipant(
    topicIds: string[],
    participantId: SHA256IdHash<Person>
  ): Promise<void> {
    const localPersonId = await this.getLocalPersonId();

    // Don't issue certificate to self
    if (participantId === localPersonId) {
      return;
    }

    if (topicIds.length === 0) {
      return;
    }

    try {
      await grantMultipleTopicAccess({
        localPersonId,
        remotePersonId: participantId,
        topicIds,
        storeObject: async (obj) => {
          const result = await storeVersionedObject(obj as any);
          return { hash: result.hash, idHash: result.idHash };
        },
        trustLevel: 'trusted',
        delegationAllowed: false
      });

      MessageBus.send('log',
        `[TopicAccessManager] Granted access to ${topicIds.length} topics for ${participantId.substring(0, 8)}`
      );
    } catch (error) {
      MessageBus.send('warn',
        `[TopicAccessManager] Failed to grant multiple topic access: ${(error as Error).message}`
      );
    }
  }
}

// Singleton instance
export const topicAccessManager = new TopicAccessManager();
export default topicAccessManager;
