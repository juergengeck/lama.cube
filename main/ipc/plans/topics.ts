import type { ChannelManager } from '@refinio/one.models/lib/models/index.js';
import type { Subject } from '@lama/core/one-ai/types/Subject.js';
/**
 * IPC handlers for topic operations (TypeScript)
 */

import { IpcMainInvokeEvent } from 'electron';
import nodeOneCore from '../../core/node-one-core.js';

interface TopicResult {
  success: boolean;
  topicId?: string;
  error?: string;
}

/**
 * Get or create a one-to-one topic for a contact
 */
export async function getOrCreateTopicForContact(
  event: IpcMainInvokeEvent,
  contactId: string
): Promise<TopicResult> {
  console.log('[Topics IPC] Getting or creating topic for contact:', contactId);

  // nodeOneCore is already the instance, not a class
  const nodeInstance = nodeOneCore;
  if (!nodeInstance || !nodeInstance.initialized) {
    console.error('[Topics IPC] No Node.js ONE.core instance available');
    return { success: false, error: 'No Node.js ONE.core instance' };
  }

  try {
    const topicModel = nodeInstance.topicModel;
    const channelManager: ChannelManager = nodeInstance.channelManager;
    const myPersonId = nodeInstance.ownerId;

    if (!topicModel || !channelManager || !myPersonId) {
      console.error('[Topics IPC] Missing required models');
      return { success: false, error: 'Models not initialized' };
    }

    // Check if this is an AI contact
    let isAI = false;
    let contactName = 'Contact';
    let personId: any = null;
    if (nodeInstance.leuteModel) {
      const others = await nodeInstance.leuteModel.others();
      const contact = others.find((c: any) => c.id === contactId);
      if (contact) {
        personId = await contact.mainIdentity();

        // Check if AI using LLMObjectManager
        if (nodeInstance.aiAssistantModel?.llmObjectManager) {
          isAI = nodeInstance.aiAssistantModel.llmObjectManager.isLLMPerson(personId);
          console.log(`[Topics IPC] Contact ${contactId.substring(0, 8)} isAI: ${isAI}`);
        }

        // Get contact name
        const profile = await contact.mainProfile();
        if (profile?.personDescriptions) {
          const nameDesc = profile.personDescriptions.find((d: any) => d.$type$ === 'PersonName') as any;
          if (nameDesc?.name) {
            contactName = nameDesc.name;
          }
        }
      }
    }

    // For AI contacts, use chat:createConversation to properly set up the group and trigger handleNewTopic
    if (isAI) {
      console.log('[Topics IPC] AI contact detected - creating conversation via chat handler');

      // Get the AI model ID for this person
      if (!nodeInstance.aiAssistantModel) {
        throw new Error('AIAssistantModel not initialized');
      }

      const aiModelId = nodeInstance.aiAssistantModel.getModelIdForPersonId(personId);
      if (!aiModelId) {
        throw new Error(`No AI model ID found for person ${personId?.toString().substring(0, 8)}`);
      }

      console.log('[Topics IPC] AI model ID:', aiModelId);

      // Import chat handler
      const { chatPlans } = await import('./chat.js');

      // Create conversation with AI participant
      const result = await chatPlans.createConversation(event, {
        type: 'group', // AI conversations are always groups (even 1-on-1)
        participants: [contactId], // Pass contact ID
        name: contactName,
        aiModelId: aiModelId // CRITICAL: Pass the AI model ID
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create AI conversation');
      }

      console.log('[Topics IPC] AI conversation created:', result.data?.id);
      return {
        success: true,
        topicId: result.data.id
      };
    }

    // For non-AI P2P contacts, create proper P2P topic ID in format: personId1<->personId2
    // Get local person ID
    const localPersonId = myPersonId;

    // Also get the remote Person ID for CHUM sync and permissions
    // Someone objects don't have .personId - must use mainIdentity()
    let remotePersonId: string | null = null;
    if (nodeInstance.leuteModel) {
      const others = await nodeInstance.leuteModel.others();
      const contact = others.find((c: any) => c.id === contactId);
      if (contact) {
        remotePersonId = await contact.mainIdentity();
        console.log(`[Topics IPC] Found Person ID ${remotePersonId?.substring(0, 8)} for Someone ${contactId.substring(0, 8)}`);
      }
    }

    if (!remotePersonId) {
      throw new Error(`Could not find Person ID for contact ${contactId.substring(0, 8)}`);
    }

    // Create P2P topic ID (lexicographically sorted)
    const p2pTopicId = localPersonId < remotePersonId
      ? `${localPersonId}<->${remotePersonId}`
      : `${remotePersonId}<->${localPersonId}`;

    console.log('[Topics IPC] P2P topic ID:', p2pTopicId);
    console.log('[Topics IPC]   Local person:', localPersonId?.substring(0, 8));
    console.log('[Topics IPC]   Remote person:', remotePersonId?.substring(0, 8));

    // Ensure P2P topic and channels exist
    if (nodeInstance.topicModel) {
      try {
        // Try to find existing topic by channel ID (legacy P2P format)
        const allTopics = await nodeInstance.topicModel.topics.all();
        const existingTopic = allTopics.find((t: any) => {
          // Check for legacy P2P format in the channel
          const channelId = `${t.owner}:${t.name}`;
          return channelId === p2pTopicId || t.name === `p2p:${remotePersonId}`;
        });

        if (existingTopic) {
          console.log('[Topics IPC] P2P topic already exists');
        } else {
          throw new Error('Topic not found');
        }
      } catch (error) {
        // Topic doesn't exist, create it via ChatPlan (eating our own dogfood)
        console.log('[Topics IPC] Creating new P2P topic via ChatPlan...');
        const { chatPlans } = await import('./chat.js');
        const result = await chatPlans.createP2PConversation(event, {
          localPersonId,
          remotePersonId
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to create P2P conversation');
        }

        console.log('[Topics IPC] ✅ P2P topic created via ChatPlan:', result.topicId);
      }
    }

    return {
      success: true,
      topicId: p2pTopicId
    };
  } catch (error) {
    console.error('[Topics IPC] Failed to create topic:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Record feedback (like/dislike) for a subject
 */
export async function recordSubjectFeedback(
  event: IpcMainInvokeEvent,
  params: { subjectId: string; feedbackType: 'like' | 'dislike' }
): Promise<{ success: boolean; subject?: Partial<Subject>; error?: string }> {
  console.log(`[Topics IPC] Recording ${params.feedbackType} for subject:`, params.subjectId);

  const nodeInstance = nodeOneCore;
  if (!nodeInstance || !nodeInstance.initialized) {
    console.error('[Topics IPC] No Node.js ONE.core instance available');
    return { success: false, error: 'No Node.js ONE.core instance' };
  }

  try {
    const { getObjectByIdHash } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js');
    const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js');

    // Get the subject by ID
    const result = await getObjectByIdHash(params.subjectId as any);
    if (!result || !result.obj) {
      console.error('[Topics IPC] Subject not found:', params.subjectId);
      return { success: false, error: 'Subject not found' };
    }

    const subject = result.obj as Subject & { likes?: number; dislikes?: number };
    const subjectIdHash = params.subjectId;  // Use the provided idHash as identifier
    console.log('[Topics IPC] Found subject:', subjectIdHash, 'Current likes:', subject.likes, 'dislikes:', subject.dislikes);

    // Update feedback counters
    if (params.feedbackType === 'like') {
      subject.likes = (subject.likes || 0) + 1;
    } else {
      subject.dislikes = (subject.dislikes || 0) + 1;
    }

    // Store updated subject
    const storeResult = await storeVersionedObject(subject);
    console.log(`[Topics IPC] Updated subject ${subjectIdHash} - likes: ${subject.likes}, dislikes: ${subject.dislikes}`);

    return {
      success: true,
      subject: {
        id: subjectIdHash,
        likes: subject.likes,
        dislikes: subject.dislikes
      } as any
    };
  } catch (error) {
    console.error('[Topics IPC] Failed to record feedback:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}