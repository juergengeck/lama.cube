/**
 * Node.js ONE.core Instance using one.leute.replicant template
 * Proper initialization following the template pattern
 */

// Polyfill WebSocket for Node.js environment
import { WebSocket } from 'ws';
global.WebSocket = WebSocket as any;

import path from 'path';
import { fileURLToPath } from 'url';
import { initializeAIAssistantHandler } from './ai-assistant-handler-adapter.js';
import TopicAnalysisModel from '@refinio/lama.core/one-ai/models/TopicAnalysisModel.js';
import { TopicAnalysisPlan } from '@refinio/lama.core/plans/TopicAnalysisPlan.js';
import { MemoryStorageHandler } from '../services/memory-storage-handler.js';
// QuicVC API server temporarily disabled during TS migration
// import RefinioApiServer from '../api/refinio-api-server.js';
import TopicGroupManager from './topic-group-manager.js';
import QuicTransport from './quic-transport.js';
// CubeManager temporarily disabled - being replaced by unified plan system
// import CubeManager from './cube-manager.js';
import type { NodeOneCore as INodeOneCore } from '../types/one-core.js';
import type { SettingsPlan } from '@refinio/settings.core/plans/SettingsPlan.js';
import type { DevicePlan } from '@refinio/device.core/plans/DevicePlan.js';
import type { AIAssistantPlan } from '@refinio/lama.core/plans/AIAssistantPlan.js';
import type { SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';

// Import extracted Plans
import { CoreInstanceInitializationPlan } from '../plans/CoreInstanceInitializationPlan.js';
// ModelInitializationPlan REMOVED - CoreModule is THE single source of model creation
// CHUM handlers removed - CHUM is handled automatically by ConnectionsModel in one.core
// topicGroupManagerHolder REMOVED - ConnectionModule creates ConnectionsModel with proper TopicGroupManager filters
// TEMP: MemoryInitializationPlan disabled - MemoryServicesPlan not exported from memory.core
// import { MemoryInitializationPlan } from '../plans/MemoryInitializationPlan.js';
// LEGACY REMOVED: AIDiscoveryPlan and MessageListenersPlan - now handled by ModuleRegistry/AIModule
// import { AIDiscoveryPlan } from '../plans/AIDiscoveryPlan.js';
// import { MessageListenersPlan } from '../plans/MessageListenersPlan.js';
import { MCPInitializationPlan } from '../plans/MCPInitializationPlan.js';
import { getModuleRegistry, initializeModuleRegistry, getCoreModule, getAIModule, shutdownModuleRegistry, getConnectionModule } from '../registry/module-registry-init.js';
import type { ConnectionModule, AnalysisModule, JournalModule } from '@refinio/lama.core/modules';
import { CAPlan } from '@refinio/api/plans/CAPlan.js';
import { CAModel } from '@refinio/trust.core/models/CAModel.js';

// Import ONE.core model classes at the top as singletons
// These will be instantiated after platform loading but importing them
// here prevents dynamic loading state corruption
import LeuteModel from '@refinio/one.models/lib/models/Leute/LeuteModel.js';
import ProfileModel from '@refinio/one.models/lib/models/Leute/ProfileModel.js';
import SomeoneModel from '@refinio/one.models/lib/models/Leute/SomeoneModel.js';
import GroupModel from '@refinio/one.models/lib/models/Leute/GroupModel.js';
import ChannelManager from '@refinio/one.models/lib/models/ChannelManager.js';
import ConnectionsModel from '@refinio/one.models/lib/models/ConnectionsModel.js';
import TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';
import { LLMObjectManager } from '@refinio/lama.core/models/LLMObjectManager.js';
import { storeVersionedObject, storeVersionObjectAsChange, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { storeUnversionedObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { getAllEntries, getAllIdObjectEntries } from '@refinio/one.core/lib/reverse-map-query.js';
import { calculateIdHashOfObj, calculateHashOfObj } from '@refinio/one.core/lib/util/object.js';
import { createAccess } from '@refinio/one.core/lib/access.js';
import { SET_ACCESS_MODE } from '@refinio/one.core/lib/storage-base-common.js';
import { closeInstance } from '@refinio/one.core/lib/instance.js';
import { SettingsStore } from '@refinio/one.core/lib/system/settings-store.js';
import { storeArrayBufferAsBlob, readBlobAsArrayBuffer } from '@refinio/one.core/lib/storage-blob.js';
import { TTSObjectManager } from '@refinio/lama.core/models/TTSObjectManager.js';
import { STTObjectManager } from '@refinio/lama.core/models/STTObjectManager.js';
import { setTTSObjectManager } from '../ipc/plans/tts.js';
import ContentSharingManager from './content-sharing.js';
import { topicAccessManager } from './topic-access-manager.js';
import llmManager from '../services/llm-manager-singleton.js';
import { createSimplePlanRegistry } from '../registry/simple-plan-registry.js';
import { setupGatedRegistry, addDefaultGates, shutdownGatedRegistry } from '../registry/gated-registry-setup.js';
import { BrowserWindow } from 'electron';
import NodeAccessRightsManager from './access-rights-manager.js';
import { createPersonIfNotExist } from '@refinio/one.models/lib/misc/person.js';
import crypto from 'crypto';
import { startChumProtocol } from '@refinio/one.models/lib/misc/ConnectionEstablishment/protocols/Chum.js';
import SingleUserNoAuth from '@refinio/one.models/lib/models/Authenticator/SingleUserNoAuth.js';
// AssertionVerifier removed - using TopicGroupManager filters instead
import type { Recipe, RecipeRule } from '@refinio/one.core/lib/recipes.js';
import type { AnyObjectResult } from '@refinio/one.models/lib/misc/ObjectEventDispatcher.js';
import { objectEvents } from '@refinio/one.models/lib/misc/ObjectEventDispatcher.js';
// PropertyTree type import (if needed will be handled differently)
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import type { Topic } from '@refinio/one.models/lib/recipes/ChatRecipes.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NodeOneCore implements INodeOneCore {
  public multiUserModel: SingleUserNoAuth | null = null;
  public localWsServer: unknown = null;
  public instanceModule: unknown = null;
  public aiAssistantModel?: AIAssistantPlan;
  public apiServer: unknown = null;
  public topicGroupManager?: TopicGroupManager;
  public federationGroup: unknown = null;

  // Extracted Plans for focused responsibilities
  private coreInitPlan: CoreInstanceInitializationPlan;
  private mcpInitPlan: MCPInitializationPlan;

  // Required properties from interface
  initialized: boolean = false;
  initEpoch: number = 0;
  instanceName: string = '';
  ownerId!: SHA256IdHash<Person>;
  leuteModel!: LeuteModel;
  channelManager!: ChannelManager;
  topicModel!: TopicModel;
  connectionsModel!: ConnectionsModel;
  instance: unknown = null;
  settingsStore: SettingsStore | null = null;
  isReady: boolean = false;
  instanceId?: string;
  localInstanceId?: string;
  topicAnalysisModel?: TopicAnalysisModel;
  memoryStorageHandler?: MemoryStorageHandler;
  chatMemoryHandler?: unknown;
  commServerUrl?: string;
  llmManager?: typeof llmManager;
  llmObjectManager?: LLMObjectManager;
  ttsObjectManager?: TTSObjectManager;
  sttObjectManager?: STTObjectManager;
  settingsPlan?: SettingsPlan;
  devicePlan?: DevicePlan;
  localDeviceIdHash?: SHA256IdHash<any>;
  assemblyManager?: unknown;
  knowledgeAssembly?: unknown;
  caPlan?: CAPlan;
  trustPlan?: unknown;
  paranoiaLevel?: 0 | 1;
  memoryPlan?: unknown;
  sessionMemoryPlan?: unknown;

  // Additional properties
  oneAuth!: SingleUserNoAuth;
  grantedAccessPeers: Set<string> = new Set();
  quicTransport?: QuicTransport;
  planRegistry?: unknown;
  email?: string;
  contentSharing?: ContentSharingManager;
  federationAPI?: unknown;
  aiMessageListener?: { stop(): void } | null;
  peerMessageListener?: { stop(): void } | null;
  aiPersonIds?: Set<string>;
  directListenerStopFn?: (() => Promise<void>) | null;
  wss?: { close(): void } | null;
  replicantGroup?: unknown;
  aiAssistant?: unknown;
  quickReply?: unknown;
  messageSyncInterval?: ReturnType<typeof setInterval> | null;
  accessRightsManager?: NodeAccessRightsManager;
  initFailed: boolean = false;
  directSocketStopFn?: (() => Promise<void>) | null;

  private progressCallback?: (stage: string, percent: number, message: string) => void;

  constructor() {
    this.coreInitPlan = new CoreInstanceInitializationPlan();
    this.mcpInitPlan = new MCPInitializationPlan();
  }

  /**
   * Send progress update to UI
   */
  private sendProgressUpdate(stage: string, percent: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(stage, percent, message);
    }
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('onecore:init-progress', {
        stage,
        percent,
        message
      });
    }
  }

  /**
   * Get or initialize the CAPlan for device certificate operations
   * Lazily initializes with StoryFactory from JournalModule for journal visibility
   */
  async getCAPlan(): Promise<CAPlan | undefined> {
    // Return cached if already initialized
    if (this.caPlan) {
      return this.caPlan;
    }

    // Try to get StoryFactory from JournalModule
    const registry = getModuleRegistry();
    if (!registry) {
      console.warn('[NodeOneCore] ModuleRegistry not initialized, cannot create CAPlan');
      return undefined;
    }

    const journalModule = registry.getModule<JournalModule>('JournalModule');
    const storyFactory = journalModule?.storyFactory;

    if (!storyFactory) {
      console.warn('[NodeOneCore] StoryFactory not available, creating CAPlan without journal support');
    }

    try {
      // Create CAModel (requires leuteModel.trust for certificate operations)
      if (!this.leuteModel?.trust) {
        console.warn('[NodeOneCore] Cannot create CAPlan - trust manager not available');
        return undefined;
      }

      const caModel = new CAModel(this.leuteModel.trust);
      this.caPlan = new CAPlan(caModel);

      // Set up StoryFactory if available (enables journal entries)
      if (storyFactory) {
        await this.caPlan.setStoryFactory(storyFactory);
        console.log('[NodeOneCore] ✅ CAPlan initialized with StoryFactory for journal visibility');
      } else {
        console.log('[NodeOneCore] CAPlan initialized without StoryFactory');
      }

      return this.caPlan;
    } catch (error) {
      console.error('[NodeOneCore] Failed to initialize CAPlan:', (error as Error).message);
      return undefined;
    }
  }

  /**
   * Grant a peer access to our main profile and P2P channel
   * Centralized method to avoid duplication
   */
  async grantPeerAccess(remotePersonId: any, context = 'unknown'): Promise<void> {
    if (!remotePersonId || !this.leuteModel) {
      console.warn('[NodeOneCore] Cannot grant peer access - missing requirements')
      return
    }

    // Avoid duplicate grants
    if (this.grantedAccessPeers.has(remotePersonId)) {
      console.log(`[NodeOneCore] Already granted access to peer: ${String(remotePersonId).substring(0, 8)}`)
      return
    }

    console.log(`[NodeOneCore] Granting peer access (${context}):`, String(remotePersonId).substring(0, 8))

    // 1. Grant access to our main profile only
    try {
      const me = await this.leuteModel.me()
      const mainProfile = await me.mainProfile()

      if (mainProfile && mainProfile.idHash) {
        await createAccess([{
          id: mainProfile.idHash,
          person: [remotePersonId],
          hashGroup: [],
          mode: SET_ACCESS_MODE.ADD
        }])
        console.log('[NodeOneCore] ✅ Granted access to our main profile')
      }
    } catch (error) {
      console.warn('[NodeOneCore] Failed to grant profile access:', (error as Error).message)
    }

    // 2. Grant access to P2P channel
    try {
      const myId = this.ownerId
      // P2P channels use sorted participants array
      const participants = myId < remotePersonId ? [myId, remotePersonId] : [remotePersonId, myId]

      // Get or create the P2P channel to get its channelInfoIdHash
      const channelResult = await this.channelManager.createChannel(participants, null) // null owner for P2P

      await createAccess([{
        id: channelResult.channelInfoIdHash,
        person: [remotePersonId],
        hashGroup: [],
        mode: SET_ACCESS_MODE.ADD
      }])

      console.log('[NodeOneCore] ✅ Granted P2P channel access, participants:', channelResult.participantsHash?.substring(0, 8))
    } catch (error) {
      console.warn('[NodeOneCore] Failed to grant P2P channel access:', (error as Error).message)
    }

    // 3. Grant access to AI channels (for AI conversation sync)
    try {
      if (this.aiAssistantModel) {
        // Get all AI topics from AITopicManager
        const aiTopicMap = this.aiAssistantModel.topicAIMap
        if (aiTopicMap && aiTopicMap.size > 0) {
          console.log(`[NodeOneCore] Granting access to ${aiTopicMap.size} AI topics...`)

          for (const [topicId, _aiPersonId] of aiTopicMap) {
            // Find the topic to get its channel
            const topic = await this.topicModel?.findTopic(topicId as SHA256IdHash<Topic>)
            if (topic?.channel) {
              await createAccess([{
                id: topic.channel,
                person: [remotePersonId],
                hashGroup: [],
                mode: SET_ACCESS_MODE.ADD
              }])
              console.log(`[NodeOneCore] ✅ Granted AI channel access for topic: ${topicId.substring(0, 16)}`)
            }
          }
        }
      }
    } catch (error) {
      console.warn('[NodeOneCore] Failed to grant AI channel access:', (error as Error).message)
    }

    // Mark this peer as having been granted access
    this.grantedAccessPeers.add(remotePersonId)
  }

  /**
   * Grant AI access to all existing contacts
   * Grants access to: AI Person, AI Profile, AI Someone, AI channels
   * Called after AI initialization to ensure existing peers can sync AI conversations
   */
  async grantAIChannelAccessToAllPeers(): Promise<void> {
    if (!this.leuteModel || !this.aiAssistantModel) {
      console.log('[NodeOneCore] Cannot grant AI access - leuteModel or aiAssistantModel not available')
      return
    }

    try {
      const others = await this.leuteModel.others()
      if (!others || others.length === 0) {
        console.log('[NodeOneCore] No contacts to grant AI access to')
        return
      }

      // Collect all AI topic IDs and person IDs using AIAssistantPlan methods
      const aiPersonIds = new Set<string>()
      const aiTopicIds: string[] = []

      // Use getAllAITopicIds() if available
      if (this.aiAssistantModel.getAllAITopicIds) {
        const topicIds = this.aiAssistantModel.getAllAITopicIds()
        for (const topicId of topicIds) {
          aiTopicIds.push(topicId)
          // Get AI person for this topic
          const aiPersonId = this.aiAssistantModel.getAIPersonForTopic?.(topicId)
          if (aiPersonId) aiPersonIds.add(aiPersonId)
        }
      }

      // Fallback: try topicAIMap via getTopicManager
      if (aiTopicIds.length === 0 && this.aiAssistantModel.getTopicManager) {
        const topicManager = this.aiAssistantModel.getTopicManager()
        const topicAIMap = topicManager?.topicAIMap
        if (topicAIMap) {
          for (const [topicId, aiPersonId] of topicAIMap) {
            aiTopicIds.push(topicId)
            aiPersonIds.add(aiPersonId)
          }
        }
      }

      // Also get AI contacts from getAllContacts if available
      if (this.aiAssistantModel.getAllContacts) {
        const aiContacts = this.aiAssistantModel.getAllContacts()
        for (const contact of aiContacts) {
          if (contact.personId) aiPersonIds.add(contact.personId)
        }
      }

      if (aiPersonIds.size === 0) {
        console.log('[NodeOneCore] No AI persons to grant access to')
        return
      }

      console.log(`[NodeOneCore] Granting AI access to ${others.length} contacts for ${aiPersonIds.size} AI persons...`)

      for (const someone of others) {
        const targetPersonId = await someone.mainIdentity()
        if (!targetPersonId) continue

        // 1. Grant access to each AI Person object
        for (const aiPersonId of aiPersonIds) {
          try {
            // Grant access to AI Person
            await createAccess([{
              id: aiPersonId as SHA256IdHash<Person>,
              person: [targetPersonId],
              hashGroup: [],
              mode: SET_ACCESS_MODE.ADD
            }])

            // Find and grant access to AI Someone and AI Profile objects
            const allOthers = await this.leuteModel.others()
            for (const other of allOthers) {
              const otherId = await other.mainIdentity()
              if (otherId === aiPersonId && other.idHash) {
                // Grant access to AI Someone
                await createAccess([{
                  id: other.idHash,
                  person: [targetPersonId],
                  hashGroup: [],
                  mode: SET_ACCESS_MODE.ADD
                }])

                // Grant access to AI Profile (CRITICAL: enables "Lumi" name to sync)
                try {
                  const aiProfile = await other.mainProfile()
                  if (aiProfile?.idHash) {
                    await createAccess([{
                      id: aiProfile.idHash,
                      person: [targetPersonId],
                      hashGroup: [],
                      mode: SET_ACCESS_MODE.ADD
                    }])
                    console.log(`[NodeOneCore] ✅ Granted AI Profile access: ${aiProfile.idHash.toString().substring(0, 8)}`)
                  }
                } catch (profileError) {
                  console.warn(`[NodeOneCore] Could not grant AI Profile access:`, (profileError as Error).message)
                }

                // Grant access to AI Keys (CRITICAL for signature verification)
                try {
                  const keysHashes = await getAllEntries(aiPersonId as SHA256IdHash<Person>, 'Keys')
                  for (const keysHash of keysHashes) {
                    await createAccess([{
                      object: keysHash,
                      person: [targetPersonId],
                      hashGroup: [],
                      mode: SET_ACCESS_MODE.ADD
                    }])
                  }
                  if (keysHashes.length > 0) {
                    console.log(`[NodeOneCore] ✅ Granted AI Keys access (${keysHashes.length} keys)`)
                  }
                } catch (keysError) {
                  console.warn(`[NodeOneCore] Could not grant AI Keys access:`, (keysError as Error).message)
                }

                // Grant access to AI TrustKeysCertificate (CRITICAL for CHUM sync)
                try {
                  if (this.leuteModel?.trust) {
                    const aiProfile = await other.mainProfile()
                    if (aiProfile?.idHash) {
                      const certs = await getAllIdObjectEntries(aiProfile.idHash, 'TrustKeysCertificate')
                      for (const certIdHash of certs) {
                        await createAccess([{
                          id: certIdHash,
                          person: [targetPersonId],
                          hashGroup: [],
                          mode: SET_ACCESS_MODE.ADD
                        }])
                      }
                      if (certs.length > 0) {
                        console.log(`[NodeOneCore] ✅ Granted AI TrustKeysCertificate access (${certs.length} certs)`)
                      }
                    }
                  }
                } catch (certError) {
                  console.warn(`[NodeOneCore] Could not grant AI TrustKeysCertificate access:`, (certError as Error).message)
                }
              }
            }
          } catch (e) {
            // Ignore errors for individual AI person
          }
        }

        // 2. Grant access to AI channels
        for (const topicId of aiTopicIds) {
          try {
            const topic = await this.topicModel?.findTopic(topicId as SHA256IdHash<Topic>)
            if (topic?.channel) {
              await createAccess([{
                id: topic.channel,
                person: [targetPersonId],
                hashGroup: [],
                mode: SET_ACCESS_MODE.ADD
              }])
              console.log(`[NodeOneCore] ✅ Granted channel access for topic: ${topicId.substring(0, 20)}`)
            }
          } catch (e) {
            // Ignore errors for individual topic
          }
        }
      }

      console.log('[NodeOneCore] ✅ AI access granted to all contacts')
    } catch (error) {
      console.warn('[NodeOneCore] Failed to grant AI access to all peers:', (error as Error).message)
    }
  }

  /**
   * Grant AI access to a single peer (called when new contact pairs)
   * Grants access to: AI Person, AI Profile, AI Someone, AI channels
   * @param targetPersonId The person ID of the newly paired contact
   */
  async grantAIAccessToPeer(targetPersonId: SHA256IdHash<Person>): Promise<void> {
    if (!this.leuteModel || !this.aiAssistantModel) {
      console.log('[NodeOneCore] Cannot grant AI access - leuteModel or aiAssistantModel not available')
      return
    }

    try {
      // Collect all AI person IDs
      const aiPersonIds = new Set<string>()
      const aiTopicIds: string[] = []

      // Use getAllAITopicIds() if available
      if (this.aiAssistantModel.getAllAITopicIds) {
        const topicIds = this.aiAssistantModel.getAllAITopicIds()
        for (const topicId of topicIds) {
          aiTopicIds.push(topicId)
          const aiPersonId = this.aiAssistantModel.getAIPersonForTopic?.(topicId)
          if (aiPersonId) aiPersonIds.add(aiPersonId)
        }
      }

      // Fallback: try topicAIMap via getTopicManager
      if (aiTopicIds.length === 0 && this.aiAssistantModel.getTopicManager) {
        const topicManager = this.aiAssistantModel.getTopicManager()
        const topicAIMap = topicManager?.topicAIMap
        if (topicAIMap) {
          for (const [topicId, aiPersonId] of topicAIMap) {
            aiTopicIds.push(topicId)
            aiPersonIds.add(aiPersonId)
          }
        }
      }

      // Also get AI contacts from getAllContacts if available
      if (this.aiAssistantModel.getAllContacts) {
        const aiContacts = this.aiAssistantModel.getAllContacts()
        for (const contact of aiContacts) {
          if (contact.personId) aiPersonIds.add(contact.personId)
        }
      }

      if (aiPersonIds.size === 0) {
        console.log('[NodeOneCore] No AI persons to grant access to new peer')
        return
      }

      console.log(`[NodeOneCore] Granting AI access to new peer ${String(targetPersonId).substring(0, 8)} for ${aiPersonIds.size} AI persons...`)

      // 1. Grant access to each AI Person, Profile, and Someone
      for (const aiPersonId of aiPersonIds) {
        try {
          // Grant access to AI Person
          await createAccess([{
            id: aiPersonId as SHA256IdHash<Person>,
            person: [targetPersonId],
            hashGroup: [],
            mode: SET_ACCESS_MODE.ADD
          }])

          // Find and grant access to AI Someone and AI Profile
          const allOthers = await this.leuteModel.others()
          for (const other of allOthers) {
            const otherId = await other.mainIdentity()
            if (otherId === aiPersonId && other.idHash) {
              // Grant access to AI Someone
              await createAccess([{
                id: other.idHash,
                person: [targetPersonId],
                hashGroup: [],
                mode: SET_ACCESS_MODE.ADD
              }])

              // Grant access to AI Profile
              try {
                const aiProfile = await other.mainProfile()
                if (aiProfile?.idHash) {
                  await createAccess([{
                    id: aiProfile.idHash,
                    person: [targetPersonId],
                    hashGroup: [],
                    mode: SET_ACCESS_MODE.ADD
                  }])
                  console.log(`[NodeOneCore] ✅ Granted AI Profile access to new peer: ${aiProfile.idHash.toString().substring(0, 8)}`)
                }
              } catch (profileError) {
                console.warn(`[NodeOneCore] Could not grant AI Profile access:`, (profileError as Error).message)
              }

              // Grant access to AI Keys (CRITICAL for signature verification)
              // Without Keys access, remote peers cannot verify AI's signatures on ChannelInfo
              try {
                // Find Keys objects that reference this AI person as owner
                const keysHashes = await getAllEntries(aiPersonId as SHA256IdHash<Person>, 'Keys')
                for (const keysHash of keysHashes) {
                  await createAccess([{
                    object: keysHash,
                    person: [targetPersonId],
                    hashGroup: [],
                    mode: SET_ACCESS_MODE.ADD
                  }])
                }
                if (keysHashes.length > 0) {
                  console.log(`[NodeOneCore] ✅ Granted AI Keys access to new peer (${keysHashes.length} keys)`)
                }
              } catch (keysError) {
                console.warn(`[NodeOneCore] Could not grant AI Keys access:`, (keysError as Error).message)
              }

              // Grant access to AI TrustKeysCertificate (CRITICAL for CHUM sync)
              // Without TrustKeysCertificate, remote peers won't trust AI's signing keys
              try {
                if (this.leuteModel?.trust) {
                  const aiProfile = await other.mainProfile()
                  if (aiProfile?.idHash) {
                    // Find TrustKeysCertificate objects that reference this AI profile
                    const certs = await getAllIdObjectEntries(aiProfile.idHash, 'TrustKeysCertificate')
                    for (const certIdHash of certs) {
                      await createAccess([{
                        id: certIdHash,
                        person: [targetPersonId],
                        hashGroup: [],
                        mode: SET_ACCESS_MODE.ADD
                      }])
                    }
                    if (certs.length > 0) {
                      console.log(`[NodeOneCore] ✅ Granted AI TrustKeysCertificate access to new peer (${certs.length} certs)`)
                    }
                  }
                }
              } catch (certError) {
                console.warn(`[NodeOneCore] Could not grant AI TrustKeysCertificate access:`, (certError as Error).message)
              }
            }
          }
        } catch (e) {
          // Ignore errors for individual AI person
        }
      }

      // 2. Grant access to AI channels
      for (const topicId of aiTopicIds) {
        try {
          const topic = await this.topicModel?.findTopic(topicId as SHA256IdHash<Topic>)
          if (topic?.channel) {
            await createAccess([{
              id: topic.channel,
              person: [targetPersonId],
              hashGroup: [],
              mode: SET_ACCESS_MODE.ADD
            }])
            console.log(`[NodeOneCore] ✅ Granted AI channel access to new peer for topic: ${topicId.substring(0, 20)}`)
          }
        } catch (e) {
          // Ignore errors for individual topic
        }
      }

      console.log(`[NodeOneCore] ✅ AI access granted to new peer ${String(targetPersonId).substring(0, 8)}`)
    } catch (error) {
      console.warn('[NodeOneCore] Failed to grant AI access to peer:', (error as Error).message)
    }
  }


  /**
   * Initialize Node.js ONE.core using the proper template
   * @param username User's username
   * @param password User's password
   * @param onProgress Optional callback for initialization progress updates
   */
  async initialize(
    username?: string,
    password?: string,
    onProgress?: (stage: string, percent: number, message: string) => void
  ): Promise<{ success: boolean; ownerId?: string; instanceName?: string; name?: string; error?: string }> {
    // Store progress callback for later use
    this.progressCallback = onProgress;

    // Idempotent: if already initialized, tear down first and rebuild fresh.
    // This ensures re-init after data clear works correctly - no stale model references.
    if (this.initialized) {
      console.log('[NodeOneCore] Already initialized - cleaning up for fresh re-init...')
      await this.cleanup()
      this.reset()
    }

    // Validate required parameters
    if (!username) {
      throw new Error('Username is required for initialization');
    }
    if (!password) {
      throw new Error('Password is required for initialization');
    }

    // Use different instance name for Node
    this.instanceName = `lama-node-${username}`
    console.log(`[NodeOneCore] Initializing Node instance for browser user: ${username}`)

    // No patching needed - fixed in ONE.models source

    try {
      // ONE.core manages storage - we just specify the base directory
      // Use config from global.lamaConfig (loaded at startup from env vars + config files)
      const storageDir = global.lamaConfig?.instance.directory || path.join(process.cwd(), 'OneDB')

      console.log('[NodeOneCore] ========================================')
      console.log('[NodeOneCore] INITIALIZATION PATH INFORMATION:')
      console.log('[NodeOneCore] global.lamaConfig?.instance.directory:', global.lamaConfig?.instance.directory)
      console.log('[NodeOneCore] process.cwd():', process.cwd())
      console.log('[NodeOneCore] Resolved storage directory for ONE.core:', storageDir)
      console.log('[NodeOneCore] ========================================')

      // Progress: Starting core instance initialization
      onProgress?.('core', 10, 'Loading ONE.core platform...')

      // Initialize ONE.core instance with browser credentials
      await this.initOneCoreInstance(username, password, storageDir)

      // Progress: Core initialized, starting models
      onProgress?.('models', 30, 'Initializing data models...')

      // Initialize models in proper order
      await this.initializeModels(onProgress)

      // Set initialized AFTER models are ready to prevent race conditions
      // (Services like QuicVCDiscovery wait for this flag)
      this.initialized = true
      this.initEpoch++
      // Note: TrustPlan wiring is handled by ChatModule via the module registry demand/supply system

      // Progress: Complete
      onProgress?.('complete', 100, 'Initialization complete')

      console.log(`[NodeOneCore] Initialized successfully`)

      return {
        success: true,
        ownerId: this.ownerId,
        name: this.instanceName
      }

    } catch (error) {
      console.error('[NodeOneCore] Initialization failed:', error)
      this.initialized = false

      // Progress: Failed
      onProgress?.('error', 0, `Initialization failed: ${(error as Error).message}`)

      // Clean up on failure to allow retry
      await this.cleanup()

      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Initialize ONE.core instance using SingleUserNoAuth (same as browser)
   */
  async initOneCoreInstance(username: string, password: string, directory: string): Promise<void> {
    console.log('[NodeOneCore] Initializing ONE.core instance using Plan...')

    // Use CoreInstanceInitializationPlan to handle initialization
    const result = await this.coreInitPlan.execute({
      username,
      password,
      directory
    })

    // Assign result to instance
    this.ownerId = result.ownerId
    this.instanceId = result.instanceId
    this.email = result.email
    this.instanceName = result.instanceName

    console.log('[NodeOneCore] ✅ ONE.core instance initialized using Plan')
    console.log('[NodeOneCore] Owner ID:', this.ownerId)
    console.log('[NodeOneCore] Instance ID:', this.instanceId)
    console.log('[NodeOneCore] Instance name:', this.instanceName)
  }

  /**
   * Initialize models in proper order following template
   * @param onProgress Optional callback for progress updates
   */
  async initializeModels(onProgress?: (stage: string, percent: number, message: string) => void): Promise<any> {
    console.log('[NodeOneCore] Initializing models via CoreModule...')

    // Use commserver URL from config (supports local testing)
    const commServerUrl = global.lamaConfig?.network?.commServer?.url || 'wss://comm10.dev.refinio.one'
    this.commServerUrl = commServerUrl  // Store as property for node-provisioning to access
    console.log('[NodeOneCore] Using CommServer URL:', commServerUrl)

    // CONSOLIDATED ARCHITECTURE: CoreModule is THE single source of model creation
    // Initialize ModuleRegistry and let CoreModule create all models
    await initializeModuleRegistry(this)

    const coreModule = getCoreModule()
    if (!coreModule) {
      throw new Error('[NodeOneCore] CoreModule not available after ModuleRegistry init')
    }

    // Get models from CoreModule
    this.leuteModel = coreModule.leuteModel
    this.channelManager = coreModule.channelManager
    this.topicModel = coreModule.topicModel
    console.log('[NodeOneCore] ✅ Core models assigned from CoreModule')

    // Wire up composing state changes to IPC
    // Track previous composing state per topic to detect changes
    const composingState = new Map<string, Map<string, number>>();
    objectEvents.onNewVersion(
      async (result: { obj: any; idHash: string }) => {
        if (result.obj.$type$ !== 'Topic') return;

        const topicIdHash = result.idHash;
        const topic = result.obj;
        const newComposing: Map<string, number> = topic.composing ?? new Map();
        const prevComposing = composingState.get(topicIdHash) ?? new Map<string, number>();

        // Detect changes
        const changes: Array<{ personId: string; isComposing: boolean; timestamp?: number }> = [];

        // Who started composing
        for (const [personId, timestamp] of newComposing) {
          if (!prevComposing.has(personId)) {
            changes.push({ personId, isComposing: true, timestamp });
          }
        }

        // Who stopped composing
        for (const [personId] of prevComposing) {
          if (!newComposing.has(personId)) {
            changes.push({ personId, isComposing: false });
          }
        }

        // Update state
        composingState.set(topicIdHash, new Map(newComposing));

        // Emit IPC events
        if (changes.length > 0) {
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow && !mainWindow.isDestroyed()) {
            for (const change of changes) {
              mainWindow.webContents.send('chat:composingChanged', {
                topicId: topicIdHash,
                ...change
              });
            }
          }
        }
      },
      'NodeOneCore: composing changes',
      'Topic'
    );

    // Get ConnectionsModel from ConnectionModule (created there with proper TopicGroupManager filters)
    const registry = getModuleRegistry()
    const connectionModule = registry?.getModule<ConnectionModule>('ConnectionModule')
    if (connectionModule?.connectionsModel) {
      this.connectionsModel = connectionModule.connectionsModel
      console.log('[NodeOneCore] ✅ ConnectionsModel assigned from ConnectionModule')
    } else {
      // Fallback to oneCore.connectionsModel if already set by ConnectionModule.init()
      console.log('[NodeOneCore] ConnectionModule.connectionsModel not yet available, using oneCore.connectionsModel')
    }

    // Get LLMObjectManager from AIModule
    const aiModule = getAIModule()
    if (aiModule?.llmObjectManager) {
      this.llmObjectManager = aiModule.llmObjectManager
      console.log('[NodeOneCore] ✅ LLMObjectManager assigned from AIModule')
    }

    // CRITICAL: Verify aiAssistantModel was set by AIModule.init()
    // AIModule.init() sets oneCore.aiAssistantModel at line 389
    // If not set, AI IPC handlers will fail with "AI Assistant Handler not initialized"
    if (!this.aiAssistantModel) {
      throw new Error('[NodeOneCore] CRITICAL: aiAssistantModel not set after ModuleRegistry init - AIModule.init() may have failed')
    }
    console.log('[NodeOneCore] ✅ aiAssistantModel verified')

    // Get TopicAnalysisModel from AnalysisModule
    // CRITICAL: AnalysisModule creates TopicAnalysisModel and supplies it to AIModule
    // We MUST use the same instance so AIModule's deps.topicAnalysisModel matches nodeOneCore's
    const analysisModule = registry?.getModule<AnalysisModule>('AnalysisModule')
    if (analysisModule?.topicAnalysisModel) {
      this.topicAnalysisModel = analysisModule.topicAnalysisModel
      console.log('[NodeOneCore] ✅ TopicAnalysisModel assigned from AnalysisModule')
    }

    // TTS/STT object managers are created here (Electron-specific)
    await this.initializeTTSObjectManager(onProgress)
    await this.initializeSTTObjectManager(onProgress)

    // Wire up TTSObjectManager to TTS IPC handlers
    if (this.ttsObjectManager) {
      setTTSObjectManager(this.ttsObjectManager);
    }

    // STTObjectManager will be wired up when STT IPC handlers are implemented

    // Pairing event handling is now managed by ConnectionPlan (via IPC handlers)
    // ConnectionPlan registers its own handler and fires callbacks for platform-specific UI updates

    // Initialize Content Sharing Manager for Browser<->Node sync
    this.contentSharing = new ContentSharingManager(this)
    console.log('[NodeOneCore] ✅ Content Sharing Manager initialized')

    // Initialize TopicAccessManager for certificate-based topic access control
    // This enables per-topic access certificates instead of wildcard chat:* access
    try {
      topicAccessManager.init(this.leuteModel)
      console.log('[NodeOneCore] ✅ TopicAccessManager initialized')
    } catch (error) {
      console.warn('[NodeOneCore] Failed to initialize TopicAccessManager:', error)
      // Non-fatal - ONE.core object access still works
    }

    // Initialize Topic Analysis Model (FALLBACK only if AnalysisModule didn't provide it)
    // Normally AnalysisModule creates and supplies TopicAnalysisModel - see lines 828-835
    if (!this.topicAnalysisModel) {
      console.warn('[NodeOneCore] ⚠️ TopicAnalysisModel not provided by AnalysisModule - creating fallback')
      this.topicAnalysisModel = new TopicAnalysisModel(this.channelManager, this.topicModel)
      await this.topicAnalysisModel.init()
      console.log('[NodeOneCore] ✅ Topic Analysis Model initialized (fallback)')
    }

    // Initialize MemoryStorageHandler for MCP memory_store tool
    // This enables memories to be stored with journal entries and subject extraction
    try {
      const topicAnalysisPlan = new TopicAnalysisPlan()
      topicAnalysisPlan.setModels(
        this.topicAnalysisModel,
        this.topicModel,
        llmManager,
        this
      )
      const memoryDirectory = global.lamaConfig?.instance?.memoryDirectory ||
        path.join(process.cwd(), 'memory')
      this.memoryStorageHandler = new MemoryStorageHandler(
        this,
        topicAnalysisPlan,
        memoryDirectory
      )
      console.log('[NodeOneCore] ✅ MemoryStorageHandler initialized')
    } catch (error) {
      console.error('[NodeOneCore] Failed to initialize MemoryStorageHandler:', error)
      // Non-fatal - continue without memory storage
    }

    // NOTE: TopicGroupManager is created by ChatModule (via ModuleRegistry)
    // ChatModule sets oneCore.topicGroupManager for ChatPlan access
    // ConnectionModule demands TopicGroupManager and uses it for CHUM filters

    // Initialize ONE PlanRegistry with core ONE Plans
    // NOTE: Using inline implementation for now - will migrate to refinio.api package later
    try {
      const simplePlanRegistry = createSimplePlanRegistry({
        leuteModel: this.leuteModel,
        channelManager: this.channelManager
      })
      console.log('[NodeOneCore] ✅ SimplePlanRegistry initialized with ONE Plans:', simplePlanRegistry.listPlans().join(', '))

      // Wrap with GatedRegistry for access control monitoring (shadow mode)
      try {
        const gatedRegistry = await setupGatedRegistry({
          planRegistry: simplePlanRegistry,
          myPersonId: this.ownerId,
          shadowMode: true,
          debug: true,
          logInterval: 60000 // Log summary every minute
        })
        addDefaultGates(gatedRegistry)
        this.planRegistry = gatedRegistry
        console.log('[NodeOneCore] ✅ GatedRegistry shadow mode active')
      } catch (gatedError) {
        console.warn('[NodeOneCore] GatedRegistry setup failed, using SimplePlanRegistry:', (gatedError as Error).message)
        this.planRegistry = simplePlanRegistry
      }
    } catch (error) {
      console.error('[NodeOneCore] Failed to initialize PlanRegistry:', error)
      // Non-fatal - continue without PlanRegistry
    }

    console.log('[NodeOneCore] All models initialized successfully')
  }

  /**
   * Initialize TTSObjectManager for TTS model configuration storage
   * Electron-specific - manages voice models and settings in ONE.core
   */
  private async initializeTTSObjectManager(onProgress?: (stage: string, percent: number, message: string) => void): Promise<void> {
    console.log('[NodeOneCore] Initializing TTSObjectManager...');
    onProgress?.('tts', 75, 'TTS configuration loading');

    const ownerId = this.ownerId;

    this.ttsObjectManager = new TTSObjectManager({
      storeVersionedObject,
      getObjectByIdHash,
      storeArrayBufferAsBlob,
      readBlobAsArrayBuffer,
      getOwnerId: async () => ownerId
    });

    await this.ttsObjectManager.initialize();
    console.log('[NodeOneCore] ✅ TTSObjectManager initialized');
  }

  /**
   * Initialize STTObjectManager for STT/Whisper model configuration storage
   * Electron-specific - manages transcription models and settings in ONE.core
   */
  private async initializeSTTObjectManager(onProgress?: (stage: string, percent: number, message: string) => void): Promise<void> {
    console.log('[NodeOneCore] Initializing STTObjectManager...');
    onProgress?.('stt', 80, 'STT configuration loading');

    const ownerId = this.ownerId;

    this.sttObjectManager = new STTObjectManager({
      storeVersionedObject,
      getObjectByIdHash,
      storeArrayBufferAsBlob,
      readBlobAsArrayBuffer,
      getOwnerId: async () => ownerId
    });

    await this.sttObjectManager.initialize();
    console.log('[NodeOneCore] ✅ STTObjectManager initialized');
  }

  /**
   * Set up message sync - DEPRECATED
   *
   * AI initialization and message listeners are now handled by ModuleRegistry/AIModule.
   * This method is kept for backwards compatibility but only initializes non-AI services.
   *
   * @deprecated Use ModuleRegistry with AIModule instead
   */
  async setupMessageSync(): Promise<any> {
    console.log('[NodeOneCore] setupMessageSync() called (DEPRECATED - AI now handled by ModuleRegistry)')

    if (!this.channelManager) {
      console.warn('[NodeOneCore] ChannelManager not available')
      return
    }

    // Initialize Topic Analysis Model for keyword/subject extraction (still needed)
    if (!this.topicAnalysisModel) {
      this.sendProgressUpdate('ai-discovery', 103, 'Setting up topic analysis...');
      this.topicAnalysisModel = new TopicAnalysisModel(this.channelManager, this.topicModel)
      await this.topicAnalysisModel.init()
      console.log('[NodeOneCore] ✅ Topic Analysis Model initialized')
    }

    // Use MCPInitializationPlan to initialize MCP services (LAZY - non-blocking)
    // MCP servers connect in background, app continues without waiting
    this.sendProgressUpdate('mcp', 107, 'Initializing MCP services...');

    // Set up progress callback for MCP initialization
    this.mcpInitPlan.setProgressCallback((stage, progress, message) => {
      console.log(`[MCP Progress] ${stage}: ${progress}% - ${message}`);
      this.sendProgressUpdate(stage, progress, message);
    });

    // Use lazy initialization - returns immediately, servers connect in background
    await this.mcpInitPlan.executeLazy({
      nodeOneCore: this
    })

    // NOTE: AI discovery, AIAssistantPlan, and message listeners are now initialized
    // via ModuleRegistry in node-provisioning.ts after initializeModuleRegistry()
    // The AIModule.init() sets up all AI services, and AIModule.startMessageListener()
    // creates the AIMessageListener with the correctly initialized AIAssistantPlan

    console.log('[NodeOneCore] ✅ setupMessageSync() complete (MCP only - AI handled by ModuleRegistry)')
  }
  
  // REMOVED: sendAIGreeting, shouldProcessMessage, processMessageWithAI - dead code using non-existent LLMManager APIs
  // REMOVED: getOrCreateAIPersonId_OLD - superseded by AIAssistantPlan.createAIContact

  /**
   * Get AI person ID for a model (delegates to AIContactManager)
   */
  async getOrCreateAIPersonId(modelId: string, displayName: string): Promise<SHA256IdHash<Person>> {
    // Delegate to the AI Assistant Model
    return this.aiAssistantModel!.createAIContact(modelId, displayName)
  }
  
  /**
   * Get current instance info
   */
  getInfo(): any {
    return {
      initialized: this.initialized,
      name: this.instanceName,
      ownerId: this.ownerId
    }
  }
  
  /**
   * Get the ONE.core instance object
   * @returns {Object} The instance object or null if not initialized
   */
  getInstance(): any {
    if (!this.initialized || !this.instanceModule) {
      return null
    }
    // Return the instance module's exports which contains the instance
    return this.instanceModule
  }
  
  /**
   * Get instance credentials for browser pairing
   */
  async getCredentialsForBrowser(): Promise<any> {
    if (!this.initialized) {
      throw new Error('Node.js instance not initialized')
    }
    
    const email = await SettingsStore.getItem('email')
    const instanceName = await SettingsStore.getItem('instance')
    
    if (!email) {
      throw new Error('No credentials found in Node.js instance')
    }
    
    return {
      email: email,
      nodeInstanceName: instanceName,
      // Browser should use same email but different instance name
      browserInstanceName: 'browser'
    }
  }

  /**
   * Set/get state and settings
   */
  async setState(key: any, value: any): Promise<any> {
    console.log(`[NodeOneCore] Setting state: ${key}`)
    // TODO: Use Settings datatype when available
    return true
  }

  getState(key: any): any {
    // TODO: Use Settings datatype when available
    return undefined
  }
  
  async setSetting(key: any, value: any): Promise<any> {
    // TODO: Implement proper settings storage
    console.log(`[NodeOneCore] Setting: ${key} = ${value}`)
    return true
  }
  
  async getSetting(key: any): Promise<any> {
    // TODO: Implement proper settings retrieval
    return undefined
  }
  
  async getSettings(prefix: any): Promise<any> {
    // TODO: Implement proper settings retrieval
    return {}
  }

  /**
   * Handle known connections - start CHUM protocol
   */
  async handleKnownConnection(conn: any, localPersonId: any, localInstanceId: any, remotePersonId: any, remoteInstanceId: any, initiatedLocally: any, routeGroupId: any): Promise<any> {
    console.log('[NodeOneCore] Starting CHUM protocol for known connection')

    // Use connectionsModel.onProtocolStart so ConnectionPlan's access-granting listener fires
    // before CHUM sync begins (fixes group chat sync failure WSRQ-JRMH1)
    await startChumProtocol(
      conn,
      localPersonId,
      localInstanceId,
      remotePersonId,
      remoteInstanceId,
      initiatedLocally,
      routeGroupId,
      this.connectionsModel.onProtocolStart,
      false,  // noImport
      false   // noExport
    )
    
    console.log('[NodeOneCore] ✅ CHUM protocol started')
  }
  
  /**
   * Handle unknown connections - could be browser with different person ID
   */
  async handleUnknownConnection(conn: any, localPersonId: any, localInstanceId: any, remotePersonId: any, remoteInstanceId: any, initiatedLocally: any, routeGroupId: any): Promise<any> {
    console.log('[NodeOneCore] Handling unknown connection - checking if it\'s the browser')
    
    // For now, accept and start CHUM if it's from localhost (browser)
    if (routeGroupId.includes('chum')) {
      await this.handleKnownConnection(conn, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, initiatedLocally, routeGroupId)
    }
  }
  
  /**
   * Clean up instance to allow re-initialization
   */
  async cleanup(): Promise<any> {
    console.log('[NodeOneCore] Cleaning up instance...')
    
    try {
      // Stop the AI message listener
      if (this.aiMessageListener) {
        this.aiMessageListener.stop()
        this.aiMessageListener = null
      }
      
      // Stop direct connection listener
      if (this.directListenerStopFn) {
        await this.directListenerStopFn()
        this.directListenerStopFn = null
      }
      
      // Close WebSocket server if running
      if (this.wss) {
        this.wss.close()
        this.wss = null
      }
      
      // Shutdown ONE.core instance properly
      closeInstance()
      
      // Reset all models and groups
      this.leuteModel = undefined!
      this.connectionsModel = undefined!
      this.channelManager = undefined!
      this.topicModel = undefined!
      this.oneAuth = undefined!
      this.federationGroup = null
      this.replicantGroup = null
      this.topicGroupManager = undefined
      this.aiAssistant = null
      this.quickReply = null
        
      // Clear intervals
      if (this.messageSyncInterval) {
        clearInterval(this.messageSyncInterval)
        this.messageSyncInterval = null
      }
      
      console.log('[NodeOneCore] Cleanup complete')
    } catch (error) {
      console.error('[NodeOneCore] Error during cleanup:', error)
    }
  }


  /**
   * Set up proper access rights using AccessRightsManager pattern
   */
  async setupProperAccessRights(): Promise<any> {
    if (!this.channelManager || !this.leuteModel) {
      console.warn('[NodeOneCore] ChannelManager or LeuteModel not available for access rights setup')
      return
    }
    
    try {
      // Create groups for access rights management
      // Use the static method from the imported LeuteModel class
      const everyoneGroup = await LeuteModel.everyoneGroup()

      // Create federation group for instance-to-instance communication
      try {
        this.federationGroup = await GroupModel.constructFromLatestProfileVersionByGroupName('federation')
        console.log('[NodeOneCore] Using existing federation group')
      } catch {
        this.federationGroup = await this.leuteModel.createGroup('federation')
        console.log('[NodeOneCore] Created new federation group')
      }
      
      // Create replicant group for inter-instance sync
      try {
        this.replicantGroup = await GroupModel.constructFromLatestProfileVersionByGroupName('replicant')
        console.log('[NodeOneCore] Using existing replicant group')
      } catch {
        this.replicantGroup = await this.leuteModel.createGroup('replicant')
        console.log('[NodeOneCore] Created new replicant group')
      }
      
      // Initialize access rights manager with groups
      // ConnectionsModel already imported and used as this.connectionsModel
      
      this.accessRightsManager = new NodeAccessRightsManager(
        this.channelManager,
        this.connectionsModel,
        this.leuteModel
      )
      
      await this.accessRightsManager.init({
        everyone: everyoneGroup.groupIdHash,
        federation: this.federationGroup.groupIdHash,
        replicant: this.replicantGroup.groupIdHash
      })
      
      console.log('[NodeOneCore] ✅ Access rights manager initialized with proper groups')
      
    } catch (error) {
      console.error('[NodeOneCore] Failed to setup access rights:', error)
      // Continue without proper access rights - basic functionality may still work
    }
  }

  // REMOVED: startDirectListener()
  // Direct WebSocket listener now handled by ConnectionsModel via socketConfig

  /**
   * Reset the singleton instance to clean state
   * Used when app data is cleared
   */
  reset(): any {
    // Reset all properties to initial state
    this.initialized = false
    this.instanceName = ''
    this.ownerId = undefined!
    this.leuteModel = undefined!
    this.connectionsModel = undefined!
    this.channelManager = undefined!
    this.topicModel = undefined!
    this.localWsServer = null
    this.instanceModule = null
    this.aiAssistantModel = undefined
    this.apiServer = null
    this.topicGroupManager = undefined
    this.federationGroup = null
    this.replicantGroup = null
    this.accessRightsManager = undefined
    this.aiAssistant = null
    this.quickReply = null
    this.messageSyncInterval = null
    this.aiMessageListener = null
    this.initFailed = false

    console.log('[NodeOneCore] Instance reset to clean state')
  }

  /**
   * Setup additional access rights after pairing (OPTIONAL)
   *
   * NOTE: Basic access rights are already configured by PairingManager.convertIdentityToProfile()
   * This method is called by ConnectionPlan's onPairingSuccess callback for platform-specific
   * customization if needed. The default implementation is now a no-op since PairingManager
   * already handles everything.
   *
   * @deprecated Use PairingManager's built-in access rights setup via convertIdentityToProfile
   */
  async setupPairingAccessRights(remotePersonId: SHA256IdHash<Person>, localPersonId: SHA256IdHash<Person>): Promise<void> {
    console.log('[NodeOneCore] Pairing access rights callback (no-op - handled by PairingManager)', {
      remotePersonId: String(remotePersonId).substring(0, 8),
      localPersonId: String(localPersonId).substring(0, 8)
    });

    // Access rights are already configured by PairingManager via convertIdentityToProfile()
    // which creates the Profile with sign keys and certifies with TrustKeysCertificate.
    // This callback is kept for backward compatibility and future customization.
  }

  /**
   * Update the display name advertised via mDNS discovery.
   * This updates the TXT record name field - connections are not affected.
   */
  updateDiscoveryDisplayName(newName: string): void {
    const registry = getModuleRegistry()
    const connectionModule = registry?.getModule<ConnectionModule>('ConnectionModule')
    if (connectionModule?.updateDiscoveryDisplayName) {
      connectionModule.updateDiscoveryDisplayName(newName)
    }
  }

  /**
   * Shutdown the instance properly
   */
  async shutdown(): Promise<any> {
    console.log('[NodeOneCore] Shutting down...')

    // Shutdown GatedRegistry first (logs final summary)
    try {
      shutdownGatedRegistry()
    } catch (e) {
      // Ignore if not initialized
    }

    // Shutdown ModuleRegistry first (saves dimension state)
    try {
      await shutdownModuleRegistry()
    } catch (e) {
      console.warn('[NodeOneCore] ModuleRegistry shutdown error:', e)
    }

    // Stop message listeners
    if (this.aiMessageListener) {
      this.aiMessageListener.stop()
      this.aiMessageListener = null
    }

    if (this.peerMessageListener) {
      this.peerMessageListener.stop()
      this.peerMessageListener = null
    }

    // Stop direct WebSocket listener if running
    if (this.directSocketStopFn) {
      console.log('[NodeOneCore] Stopping direct WebSocket listener...')
      await this.directSocketStopFn()
      this.directSocketStopFn = null
    }

    await this.cleanup()

    if (this.accessRightsManager) {
      await this.accessRightsManager.shutdown()
      this.accessRightsManager = undefined
    }

    this.initialized = false
    this.instanceName = ''
    this.ownerId = undefined!
    console.log('[NodeOneCore] Shutdown complete')
  }

  // WebSocket listening is handled by IncomingConnectionManager.listenForDirectConnections()
  // which is called after ConnectionsModel.init()
}

// Singleton
const instance = new NodeOneCore()
export default instance;
export { instance }