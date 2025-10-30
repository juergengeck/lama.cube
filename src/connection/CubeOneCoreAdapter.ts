/**
 * lama.cube ONE.core Adapter Implementation
 *
 * Electron/Node.js platform adapter for connection.core
 */

import type {
  OneCoreAdapter,
  OneCoreLeute,
  OneCoreChannels,
  OneCoreConnections,
  OneCoreTopics,
  OneCoreAttestation,
  GroupWithCertificate,
  ChannelInfo,
  TopicMessage,
  CertificateSet
} from '../../../connection.core/src/adapters/OneCoreAdapter.js';
import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks';

/**
 * lama.cube ONE.core adapter
 * Wraps NodeOneCore models for use with connection.core
 */
export class CubeOneCoreAdapter implements OneCoreAdapter {
  leute: CubeLeute;
  channels: CubeChannels;
  connections: CubeConnections;
  topics: CubeTopics;
  attestation: CubeAttestation;

  constructor(
    private leuteModel: any,
    private channelManager: any,
    private connectionsModel: any,
    private topicModel: any
  ) {
    this.leute = new CubeLeute(leuteModel);
    this.channels = new CubeChannels(channelManager);
    this.connections = new CubeConnections(connectionsModel);
    this.topics = new CubeTopics(topicModel);
    this.attestation = new CubeAttestation(channelManager, leuteModel);
  }
}

class CubeLeute implements OneCoreLeute {
  constructor(private leuteModel: any) {}

  async myMainIdentity(): Promise<SHA256IdHash> {
    return await this.leuteModel.myMainIdentity();
  }

  async getPersonName(personId: SHA256IdHash): Promise<string> {
    // Implementation depends on LeuteModel API
    return personId.substring(0, 8); // Fallback to truncated ID
  }
}

class CubeChannels implements OneCoreChannels {
  constructor(private channelManager: any) {}

  async createShared1to1Channel(
    person1: SHA256IdHash,
    person2: SHA256IdHash
  ): Promise<string> {
    // Pattern from test-object-filter.js:143-151
    const channelId = [person1, person2].sort().join('<->');
    await this.channelManager.createChannel(channelId, null); // null owner = shared
    return channelId;
  }

  async postToChannel(channelId: string, objectHash: SHA256Hash): Promise<void> {
    await this.channelManager.postToChannel(channelId, objectHash);
  }

  async getMatchingChannelInfos(): Promise<ChannelInfo[]> {
    return await this.channelManager.getMatchingChannelInfos();
  }
}

class CubeConnections implements OneCoreConnections {
  constructor(private connectionsModel: any) {}

  async createInvitation(): Promise<string> {
    return await this.connectionsModel.pairing.createInvitation();
  }

  async acceptInvitation(invitation: string): Promise<void> {
    await this.connectionsModel.pairing.connectUsingInvitation(invitation);
  }

  onPairingSuccess(callback: any): void {
    this.connectionsModel.pairing.onPairingSuccess(callback);
  }
}

class CubeTopics implements OneCoreTopics {
  constructor(private topicModel: any) {}

  async createNewTopic(
    name: string,
    members: SHA256IdHash[],
    groupId?: SHA256IdHash
  ): Promise<string> {
    return await this.topicModel.createNewTopic(name, members, groupId);
  }

  async addMessage(
    topicId: string,
    content: string,
    authorId: SHA256IdHash
  ): Promise<void> {
    await this.topicModel.addMessage(topicId, content, authorId);
  }

  async getMessagesForTopic(topicId: string): Promise<TopicMessage[]> {
    return await this.topicModel.getMessagesForTopic(topicId);
  }
}

class CubeAttestation implements OneCoreAttestation {
  constructor(
    private channelManager: any,
    private leuteModel: any
  ) {}

  async createGroupWithCertificate(
    name: string,
    members: SHA256IdHash[]
  ): Promise<GroupWithCertificate> {
    // Pattern from test-object-filter.js:262-358
    const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { storeUnversionedObject } = await import('@refinio/one.core/lib/storage-unversioned-objects.js');
    const { sign } = await import('@refinio/one.models/lib/misc/Signature.js');
    const { createAccess } = await import('@refinio/one.core/lib/access.js');
    const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js');

    // 1. Create HashGroup
    const hashGroup = {
      $type$: 'HashGroup',
      members
    };
    const hashGroupResult = await storeUnversionedObject(hashGroup);

    // 2. Create Group
    const group = {
      $type$: 'Group',
      name,
      hashGroup: hashGroupResult.hash
    };
    const groupResult = await storeVersionedObject(group);

    // 3. Create License
    const license = {
      $type$: 'License',
      name: 'GroupAffirmation',
      description: `Affirms that Group ${groupResult.idHash.substring(0, 8)} exists with specified members`
    };
    const licenseResult = await storeUnversionedObject(license);

    // 4. Create AffirmationCertificate
    const certificate = {
      $type$: 'AffirmationCertificate',
      data: groupResult.hash,
      license: licenseResult.hash
    };
    const certResult = await storeUnversionedObject(certificate);

    // 5. Sign certificate
    const signatureResult = await sign(certResult.hash, members[0]);
    const signatureHash = signatureResult.hash || signatureResult;

    // 6. Grant access to all certificate objects for members (except creator)
    const otherMembers = members.filter(m => m !== members[0]);
    for (const objectHash of [certResult.hash, signatureHash, licenseResult.hash]) {
      await createAccess([{
        object: objectHash,
        person: otherMembers,
        group: [],
        mode: SET_ACCESS_MODE.REPLACE
      }]);
    }

    // 7. Post certificates to 1:1 channels (done by caller via shareGroupWithMember)

    return {
      groupId: groupResult.idHash,
      groupHash: groupResult.hash,
      certificateId: certResult.hash,
      signatureId: signatureHash,
      licenseId: licenseResult.hash
    };
  }

  async shareGroupWithMember(
    recipientId: SHA256IdHash,
    groupId: SHA256IdHash,
    certificateIds: CertificateSet
  ): Promise<void> {
    // Pattern from test-object-filter.js:377-389
    const myId = await this.leuteModel.myMainIdentity();
    const channelId = [myId, recipientId].sort().join('<->');

    // Post certificates first
    await this.channelManager.postToChannel(channelId, certificateIds.certificate);
    await this.channelManager.postToChannel(channelId, certificateIds.signature);
    await this.channelManager.postToChannel(channelId, certificateIds.license);

    // Post Group object (will pass object filter now that certificates are synced)
    await this.channelManager.postToChannel(channelId, groupId);
  }

  async hasGroup(groupId: SHA256IdHash): Promise<boolean> {
    const { getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    try {
      const group = await getObjectByIdHash(groupId);
      return group && group.$type$ === 'Group';
    } catch {
      return false;
    }
  }

  async hasCertificates(certificateIds: CertificateSet): Promise<boolean> {
    const { getObject } = await import('@refinio/one.core/lib/storage-unversioned-objects.js');
    try {
      const cert = await getObject(certificateIds.certificate);
      const sig = await getObject(certificateIds.signature);
      const lic = await getObject(certificateIds.license);
      return cert !== null && sig !== null && lic !== null;
    } catch {
      return false;
    }
  }
}
