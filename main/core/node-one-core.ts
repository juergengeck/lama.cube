/**
 * Node.js ONE.core Instance using one.leute.replicant template
 * Proper initialization following the template pattern
 */

// Polyfill WebSocket for Node.js environment
import { WebSocket } from 'ws';
global.WebSocket = WebSocket as any;

import path from 'path';
import { fileURLToPath } from 'url';
// DEPRECATED: Old monolithic AI assistant model - replaced by component-based architecture
// import { AIAssistantModel } from './ai-assistant-model.js';
import { initializeAIAssistantHandler } from './ai-assistant-handler-adapter.js';
import TopicAnalysisModel from '@lama/core/one-ai/models/TopicAnalysisModel.js';
// QuicVC API server temporarily disabled during TS migration
// import RefinioApiServer from '../api/refinio-api-server.js';
import TopicGroupManager from './topic-group-manager.js';
import QuicTransport from './quic-transport.js';
import CubeManager from './cube-manager.js';
import { UserSettingsManager } from './user-settings-manager.js';
import type { NodeOneCore as INodeOneCore } from '../types/one-core.js';

// Import extracted Plans
import { CoreInstanceInitializationPlan } from '../plans/CoreInstanceInitializationPlan.js';
import { ModelInitializationPlan } from '../plans/ModelInitializationPlan.js';
import { CHUMHandlersPlan } from '../plans/CHUMHandlersPlan.js';
// TEMP: MemoryInitializationPlan disabled - MemoryServicesPlan not exported from memory.core
// import { MemoryInitializationPlan } from '../plans/MemoryInitializationPlan.js';
import { AIDiscoveryPlan } from '../plans/AIDiscoveryPlan.js';
import { MessageListenersPlan } from '../plans/MessageListenersPlan.js';
import { MCPInitializationPlan } from '../plans/MCPInitializationPlan.js';

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
import { LLMObjectManager } from '@lama/core/models/LLMObjectManager.js';
import { storeVersionedObject, storeVersionObjectAsChange, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { storeUnversionedObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { calculateIdHashOfObj, calculateHashOfObj } from '@refinio/one.core/lib/util/object.js';
import { createAccess } from '@refinio/one.core/lib/access.js';
import SingleUserNoAuth from '@refinio/one.models/lib/models/Authenticator/SingleUserNoAuth.js';
// AssertionVerifier removed - using TopicGroupManager filters instead
import type { Recipe, RecipeRule } from '@refinio/one.core/lib/recipes.js';
import type { AnyObjectResult } from '@refinio/one.models/lib/misc/ObjectEventDispatcher.js';
// PropertyTree type import (if needed will be handled differently)
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NodeOneCore implements INodeOneCore {
  public multiUserModel: any;
  public localWsServer: any;
  public instanceModule: any;
  // AI Assistant Handler (refactored component-based architecture)
  public aiAssistantModel?: any; // AIAssistantHandler from lama.core
  public apiServer: any;
  public topicGroupManager?: TopicGroupManager;
  public cubeManager?: any; // CubeManager for Assembly/Plan system
  public federationGroup: any;

  onPairingStarted: any;
  onPairingFailed: any;
  getChannelInfos: any;
  author: any;
  substring: any;
  content: any;
  text: any;
  on: any;
  getDefaultModel: any;
  generateResponse: any;
  description: any;

  // Extracted Plans for focused responsibilities
  private coreInitPlan: CoreInstanceInitializationPlan;
  private modelInitPlan: ModelInitializationPlan;
  private chumHandlersPlan: CHUMHandlersPlan;
  // TEMP: MemoryInitializationPlan disabled
  // private memoryInitPlan: MemoryInitializationPlan;
  private aiDiscoveryPlan: AIDiscoveryPlan;
  private messageListenersPlan: MessageListenersPlan;
  private mcpInitPlan: MCPInitializationPlan;
  // Required properties from interface
  initialized: boolean
  instanceName: string
  ownerId: SHA256IdHash<Person>
  leuteModel: LeuteModel
  channelManager: ChannelManager
  topicModel: TopicModel
  connectionsModel: ConnectionsModel
  instance: any
  settingsStore: any // ONE.core settings management
  isReady: boolean
  instanceId?: string
  localInstanceId?: string
  models?: any
  topicAnalysisModel?: TopicAnalysisModel
  memoryStorageHandler?: any  // MemoryStorageHandler for Assembly-based memory storage
  chatMemoryHandler?: any  // ChatMemoryHandler for automatic memory extraction
  fileStorageService?: any  // FileStorageService for HTML memory storage
  subjectHandler?: any  // SubjectHandler for subject management
  commServerModel?: any
  commServerUrl?: string  // CommServer URL for invitations and connections
  llmManager?: any
  llmObjectManager?: any
  userSettingsManager?: any  // UserSettingsManager for user preferences

  // Additional properties
  oneAuth: SingleUserNoAuth
  grantedAccessPeers: Set<string>
  quicTransport?: QuicTransport
  planRegistry?: any  // PlanRegistry for ONE Plans (one.storage, one.leute, etc.)
  email: any
  contentSharing: any
  federationAPI: any
  aiMessageListener: any
  peerMessageListener: any
  aiPersonIds: any
  directListenerStopFn: any
  wss: any
  replicantGroup: any
  aiAssistant: any
  quickReply: any
  messageSyncInterval: any
  accessRightsManager: any
  initFailed: any
  directSocketStopFn: any

  constructor() {
    this.initialized = false
    this.instanceName = '' // Initialize as empty string instead of null
    this.ownerId = '' as any // Will be properly set during initialization
    this.leuteModel = null as any as any // Will be initialized during setup
    this.connectionsModel = null as any as any // Will be initialized during setup
    this.channelManager = null as any as any // Will be initialized during setup
    this.topicModel = null as any as any // Will be initialized during setup
    this.instance = null as any // Will be initialized during setup
    this.settingsStore = null
    this.multiUserModel = null
    this.isReady = false
    this.oneAuth = null as any // Will be initialized during setup
    this.localWsServer = null
    this.instanceModule = null // Track the instance module
    this.aiAssistantModel = undefined // Will be initialized after models are ready
    this.apiServer = null // Refinio API server
    this.topicGroupManager = undefined // Will be initialized after models are ready
    this.federationGroup = null // Track federation group for access
    this.grantedAccessPeers = new Set() // Track peers we've already granted access to

    // Instantiate Plans
    this.coreInitPlan = new CoreInstanceInitializationPlan();
    this.modelInitPlan = new ModelInitializationPlan();
    this.chumHandlersPlan = new CHUMHandlersPlan();
    // TEMP: MemoryInitializationPlan disabled
    // this.memoryInitPlan = new MemoryInitializationPlan();
    this.aiDiscoveryPlan = new AIDiscoveryPlan();
    this.messageListenersPlan = new MessageListenersPlan();
    this.mcpInitPlan = new MCPInitializationPlan();
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

    const { createAccess } = await import('@refinio/one.core/lib/access.js')
    const { SET_ACCESS_MODE } = await import('@refinio/one.core/lib/storage-base-common.js')
    const { calculateIdHashOfObj } = await import('@refinio/one.core/lib/util/object.js')

    console.log(`[NodeOneCore] Granting peer access (${context}):`, String(remotePersonId).substring(0, 8))

    // 1. Grant access to our main profile only
    try {
      const me = await this.leuteModel.me()
      const mainProfile = await me.mainProfile()

      if (mainProfile && mainProfile.idHash) {
        await createAccess([{
          id: mainProfile.idHash,
          person: [remotePersonId],
          group: [],
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
      const p2pChannelId = myId < remotePersonId ? `${myId}<->${remotePersonId}` : `${remotePersonId}<->${myId}`

      const p2pChannelInfoHash = await calculateIdHashOfObj({
        $type$: 'ChannelInfo',
        id: p2pChannelId,
        owner: undefined  // P2P channels have no owner
      })

      await createAccess([{
        id: p2pChannelInfoHash,
        person: [remotePersonId],
        group: [],
        mode: SET_ACCESS_MODE.ADD
      }])

      console.log('[NodeOneCore] ✅ Granted P2P channel access:', p2pChannelId)
    } catch (error) {
      console.warn('[NodeOneCore] Failed to grant P2P channel access:', (error as Error).message)
    }

    // Mark this peer as having been granted access
    this.grantedAccessPeers.add(remotePersonId)
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
    if (this.initialized) {
      console.log('[NodeOneCore] Already initialized')
      return { success: true, ownerId: this.ownerId, instanceName: this.instanceName }
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
    this.email = result.email
    this.instanceName = result.instanceName

    console.log('[NodeOneCore] ✅ ONE.core instance initialized using Plan')
    console.log('[NodeOneCore] Owner ID:', this.ownerId)
    console.log('[NodeOneCore] Instance name:', this.instanceName)
  }

  /**
   * Monitor pairing and CHUM transitions
   * ConnectionsModel handles the transition automatically
   */
  setupConnectionMonitoring(): any {
    console.log('[NodeOneCore] Setting up connection monitoring...')

    // Register pairing callbacks - must be done BEFORE init (like one.leute.replicant)
    if (this.connectionsModel?.pairing) {
      console.log('[NodeOneCore] Registering pairing event handlers...')

      // Log pairing start events
      if ((this.connectionsModel.pairing as any).onPairingStarted) {
        (this.connectionsModel.pairing as any).onPairingStarted((token: any) => {
          console.log('[NodeOneCore] 🤝 PAIRING STARTED - Token:', token?.substring(0, 20) + '...')
        })
      }

      // Log pairing failures
      if ((this.connectionsModel.pairing as any).onPairingFailed) {
        (this.connectionsModel.pairing as any).onPairingFailed((error: any) => {
          console.log('[NodeOneCore] ❌ PAIRING FAILED:', error)
        })
      }

      // Handle successful pairing - create Someone and Profile
      this.connectionsModel.pairing.onPairingSuccess(async (initiatedLocally: any, localPersonId: any, localInstanceId: any, remotePersonId: any, remoteInstanceId: any, token: any) => {
        console.log('[NodeOneCore] ✅ PAIRING SUCCESS EVENT TRIGGERED')
        console.log('[NodeOneCore] ═══════════════════════════════════════════')
        console.log('[NodeOneCore] 📊 Pairing Details:')
        console.log('[NodeOneCore]   • Initiated locally:', initiatedLocally)
        console.log('[NodeOneCore]   • Local person:', localPersonId?.substring(0, 8) || 'null')
        console.log('[NodeOneCore]   • Local instance:', localInstanceId?.substring(0, 8) || 'null')
        console.log('[NodeOneCore]   • Remote person:', remotePersonId?.substring(0, 8) || 'null')
        console.log('[NodeOneCore]   • Remote instance:', remoteInstanceId?.substring(0, 8) || 'null')
        console.log('[NodeOneCore] ═══════════════════════════════════════════')
        console.log('[NodeOneCore] 🔧 Starting remote contact setup...')

        // CRITICAL: Establish trust first (like one.leute does)
        if (remotePersonId && this.leuteModel) {
          try {
            // Step 1: Trust establishment (must come first)
            console.log('[NodeOneCore] 🔐 Step 1: Establishing trust with remote peer...')
            const { completePairingTrust } = await import('./pairing-trust-handler.js')

            const trustResult = await completePairingTrust({
              trust: this.leuteModel.trust,
              leuteModel: this.leuteModel,
              initiatedLocally,
              localPersonId,
              localInstanceId,
              remotePersonId,
              remoteInstanceId,
              token
            })

            if (trustResult.success) {
              console.log('[NodeOneCore] ✅ Trust established successfully!')
            } else {
              console.warn('[NodeOneCore] ⚠️ Trust establishment had issues:', trustResult)
            }

            // Step 2: Create address book entry
            console.log('[NodeOneCore] 📁 Step 2: Creating address book entry...')

            // Use the proper contact creation helper that uses ONE.models APIs
            const { handleNewConnection } = await import('./contact-creation-proper.js')

            const someone = await handleNewConnection(remotePersonId, this.leuteModel)
            console.log('[NodeOneCore] ✅ Address book entry created successfully!')
            console.log('[NodeOneCore]   • Someone ID:', someone?.idHash?.toString()?.substring(0, 8) || 'null')

            // Step 3: Detect invitation type and create appropriate topic
            console.log('[NodeOneCore] 💬 Step 3: Handling pairing completion...')
            const { handlePairingCompletion } = await import('@lama/connection.core')

            const pairingResult = await handlePairingCompletion({
              leuteModel: this.leuteModel,
              topicModel: this.topicModel,
              channelManager: this.channelManager,
              localPersonId,
              remotePersonId,
              initiatedLocally
            })

            // Check pairing result
            if (!pairingResult) {
              throw new Error('Pairing failed - no result returned')
            }

            console.log('[NodeOneCore] ✅ Pairing complete - type:', pairingResult.type)
            console.log('[NodeOneCore]   Channel:', pairingResult.channelId.substring(0, 20))

            const topicRoom = pairingResult.topicRoom

            // Log the profile info
            if (someone?.mainProfile) {
              try {
                const profile = typeof someone.mainProfile === 'function' ?
                  await someone.mainProfile() : someone.mainProfile
                console.log('[NodeOneCore]   • Profile ID:', profile?.idHash?.toString()?.substring(0, 8) || 'null')
              } catch (e: any) {
                console.log('[NodeOneCore]   • Profile info not available')
              }
            }

            // Grant access to our profile
            console.log('[NodeOneCore] 🔓 Granting mutual access permissions...')
            await this.grantPeerAccess(remotePersonId, 'pairing')
            console.log('[NodeOneCore] ✅ Access permissions granted')

            // Step 4: Add contact and conversation to StateManager for UI
            console.log('[NodeOneCore] 📲 Step 4: Adding to StateManager and notifying UI...')
            try {
              const { default: stateManager } = await import('../state/manager.js')
              const { BrowserWindow } = await import('electron')

              // Get profile info for display
              let displayName = 'Unknown Contact'
              if (someone?.mainProfile) {
                try {
                  const profile = typeof someone.mainProfile === 'function' ?
                    await someone.mainProfile() : someone.mainProfile

                  // Extract name from PersonDescriptions
                  const personName = profile.personDescriptions?.find((d: any) => d.$type$ === 'PersonName')
                  if (personName?.name) {
                    displayName = personName.name
                  }
                } catch (e: any) {
                  console.log('[NodeOneCore]   • Could not get profile name')
                }
              }

              // Add contact to state
              const contactId = remotePersonId
              stateManager.addContact({
                id: contactId,
                name: displayName,
                personId: remotePersonId,
                someoneId: someone?.idHash
              })
              console.log('[NodeOneCore]   • Contact added to state:', contactId.substring(0, 8))

              // Create P2P conversation ID
              const p2pId = localPersonId < remotePersonId ?
                `${localPersonId}<->${remotePersonId}` :
                `${remotePersonId}<->${localPersonId}`

              // Add conversation to state with detected type
              stateManager.addConversation({
                id: pairingResult.channelId,
                name: displayName,
                type: pairingResult.type,
                participants: [localPersonId, remotePersonId],
                lastMessage: null,
                lastMessageTime: Date.now(),
                unreadCount: 0
              })
              console.log('[NodeOneCore]   • Conversation added to state:', pairingResult.channelId.substring(0, 20))
              console.log('[NodeOneCore]   • Conversation type:', pairingResult.type)

              // Notify UI
              const windows = BrowserWindow.getAllWindows()
              windows.forEach(window => {
                window.webContents.send('contacts:updated', {
                  contacts: Array.from(stateManager.getState().contacts.values())
                })
                window.webContents.send('conversations:updated', {
                  conversations: Array.from(stateManager.getState().conversations.values())
                })
              })
              console.log('[NodeOneCore]   • UI notified of updates')

            } catch (error) {
              console.error('[NodeOneCore] ❌ Failed to update StateManager:', error)
            }

            console.log('[NodeOneCore] ═══════════════════════════════════════════')
            console.log('[NodeOneCore] 🎉 PAIRING COMPLETE - Remote contact is ready!')

          } catch (error) {
            console.error('[NodeOneCore] ❌ Failed to create address book entry:', error)
            console.error('[NodeOneCore]    Error stack:', (error as Error).stack)
          }
        } else {
          console.log('[NodeOneCore] ⚠️ Cannot create contact:', {
            hasRemotePersonId: !!remotePersonId,
            hasLeuteModel: !!this.leuteModel
          })
        }

        // ConnectionsModel will handle the transition to CHUM automatically
      })
      console.log('[NodeOneCore] ✅ Pairing callbacks registered')
    } else {
      console.log('[NodeOneCore] ⚠️  Pairing module not available')
    }
  }

  /**
   * Initialize models in proper order following template
   * @param onProgress Optional callback for progress updates
   */
  async initializeModels(onProgress?: (stage: string, percent: number, message: string) => void): Promise<any> {
    console.log('[NodeOneCore] Initializing models using Plans...')

    // Use commserver URL from config (supports local testing)
    const commServerUrl = global.lamaConfig?.network?.commServer?.url || 'wss://comm10.dev.refinio.one'
    this.commServerUrl = commServerUrl  // Store as property for node-provisioning to access
    console.log('[NodeOneCore] Using CommServer URL:', commServerUrl)

    // Use ModelInitializationPlan to initialize models
    const models = await this.modelInitPlan.execute({
      ownerId: this.ownerId,
      email: this.email,
      commServerUrl: this.commServerUrl,
      connectionsModel: this.connectionsModel,
      onProgress
    })

    // Assign models to instance
    this.leuteModel = models.leuteModel
    this.channelManager = models.channelManager
    this.topicModel = models.topicModel
    this.llmObjectManager = models.llmObjectManager

    // Register CHUM handlers using CHUMHandlersPlan
    await this.chumHandlersPlan.registerHandlers({
      leuteModel: this.leuteModel,
      channelManager: this.channelManager,
      topicModel: this.topicModel
    })

    // Initialize Content Sharing Manager for Browser<->Node sync
    const { default: ContentSharingManager } = await import('./content-sharing.js')
    this.contentSharing = new ContentSharingManager(this)
    console.log('[NodeOneCore] ✅ Content Sharing Manager initialized')

    // Initialize Topic Analysis Model
    if (!this.topicAnalysisModel) {
      this.topicAnalysisModel = new TopicAnalysisModel(this.channelManager, this.topicModel)
      await this.topicAnalysisModel.init()
      console.log('[NodeOneCore] ✅ Topic Analysis Model initialized')
    }

    // Initialize TopicGroupManager with objectFilter/importFilter
    // IMPORTANT: Must be initialized BEFORE ConnectionsModel
    // to provide filter functions for CHUM sync
    if (!this.topicGroupManager) {
      this.topicGroupManager = new TopicGroupManager(this, {
        storeVersionedObject,
        storeUnversionedObject,
        getObjectByIdHash,
        getAllOfType: async (type: string) => {
          // Stub implementation - return empty array for now
          return [];
        },
        getObject,
        calculateIdHashOfObj,
        calculateHashOfObj,
        createAccess
      })
      console.log('[NodeOneCore] ✅ TopicGroupManager initialized')
    }

    // Initialize ONE PlanRegistry with core ONE Plans
    // NOTE: Using inline implementation for now - will migrate to refinio.api package later
    try {
      const { createSimplePlanRegistry } = await import('../registry/simple-plan-registry.js')
      this.planRegistry = createSimplePlanRegistry({
        leuteModel: this.leuteModel,
        channelManager: this.channelManager
      })
      console.log('[NodeOneCore] ✅ PlanRegistry initialized with ONE Plans:', this.planRegistry.listPlans().join(', '))
    } catch (error) {
      console.error('[NodeOneCore] Failed to initialize PlanRegistry:', error)
      // Non-fatal - continue without PlanRegistry
    }

    console.log('[NodeOneCore] All models initialized successfully')
  }

  /**
   * Create channels for existing conversations so Node participates in CHUM sync
   */

  /**
   * Create channels for existing conversations so Node participates in CHUM sync
   */
  async createChannelsForExistingConversations(): Promise<any> {
    console.log('[NodeOneCore] Creating channels for existing conversations...')
    
    if (!this.channelManager) {
      console.warn('[NodeOneCore] ChannelManager not available')
      return
    }
    
    try {
      // Get existing conversations from state
      const { default: stateManager } = await import('../state/manager.js')
      const state = stateManager.getState()
      const conversationsMap = state?.conversations
      
      if (conversationsMap && conversationsMap.size > 0) {
        console.log(`[NodeOneCore] Found ${conversationsMap.size} existing conversations`)
        
        for (const [id, conversation] of conversationsMap) {
          try {
            // Check if this is a P2P conversation (contains <->)
            const isP2P = id.includes('<->')

            // For P2P conversations, skip creating channels here
            // P2P channels are managed by TopicGroupManager.ensureP2PChannelsForPeer
            if (isP2P) {
              console.log(`[NodeOneCore] Skipping P2P channel creation for: ${id} (handled by TopicGroupManager)`)
              continue
            }

            // For group chats, use our owner ID
            const channelOwner = this.ownerId

            // Create a channel for each conversation
            // This ensures the Node instance receives CHUM updates for messages in these conversations
            await this.channelManager.createChannel(id, channelOwner)
            console.log(`[NodeOneCore] Created channel for conversation: ${id} (owner: ${channelOwner})`)
          } catch (error) {
            // Channel might already exist, that's fine
            if (!(error as Error).message?.includes('already exists')) {
              console.warn(`[NodeOneCore] Could not create channel for ${id}:`, (error as Error).message)
            }
          }
        }
      } else {
        console.log('[NodeOneCore] No existing conversations found')
      }
    } catch (error) {
      console.error('[NodeOneCore] Error creating channels for existing conversations:', error)
    }
  }

  /**
   * Set up message sync - listen for user messages, process with AI, respond
   */
  async setupMessageSync(): Promise<any> {
    console.log('[NodeOneCore] Setting up event-based message sync using Plans...')

    if (!this.channelManager) {
      console.warn('[NodeOneCore] ChannelManager not available for message sync')
      return
    }

    // Get LLM manager singleton
    const { default: llmManager } = await import('../services/llm-manager-singleton.js')

    // Initialize Topic Analysis Model for keyword/subject extraction
    if (!this.topicAnalysisModel) {
      this.topicAnalysisModel = new TopicAnalysisModel(this.channelManager, this.topicModel)
      await this.topicAnalysisModel.init()
      console.log('[NodeOneCore] ✅ Topic Analysis Model initialized')
    }

    // TEMP: Memory initialization disabled - MemoryServicesPlan not exported from memory.core
    // Use MemoryInitializationPlan to initialize memory services
    // const memoryServices = await this.memoryInitPlan.execute({
    //   channelManager: this.channelManager,
    //   topicModel: this.topicModel,
    //   topicAnalysisModel: this.topicAnalysisModel,
    //   nodeOneCore: this,
    //   llmManager
    // })

    // // Assign memory services to instance
    // this.memoryStorageHandler = memoryServices.memoryStoragePlan
    // this.fileStorageService = memoryServices.fileStorageService
    // this.subjectHandler = memoryServices.subjectPlan
    // this.chatMemoryHandler = memoryServices.chatMemoryPlan

    // Use AIDiscoveryPlan to discover Claude models and initialize AI
    const aiServices = await this.aiDiscoveryPlan.execute({
      nodeOneCore: this,
      llmManager,
      email: this.email,
      channelManager: this.channelManager
    })

    // Assign AI services to instance
    this.userSettingsManager = aiServices.userSettingsManager
    this.aiAssistantModel = aiServices.aiAssistantModel

    // Use MCPInitializationPlan to initialize MCP services
    await this.mcpInitPlan.execute({
      nodeOneCore: this
    })

    // Use MessageListenersPlan to create and start listeners
    const listeners = await this.messageListenersPlan.execute({
      channelManager: this.channelManager,
      topicModel: this.topicModel,
      llmManager,
      aiAssistantModel: this.aiAssistantModel,
      ownerId: this.ownerId
    })

    // Assign listeners to instance
    this.aiMessageListener = listeners.aiMessageListener
    this.peerMessageListener = listeners.peerMessageListener

    console.log('[NodeOneCore] ✅ Event-based message sync set up using Plans')
  }
  
  /**
   * Send AI greeting message to a topic
   */
  async sendAIGreeting(topicRoom: any): Promise<any> {
    try {
      // Get LLM manager to find active model
      const { default: llmManager } = await import('../services/llm-manager-singleton.js')
      const models = this.llmManager?.getAvailableModels()
      
      // Use default model from llmManager
      const modelId = (llmManager as any).defaultModelId
      const defaultModel = (llmManager as any).getDefaultModel()
      const modelName = defaultModel?.name || 'your AI assistant'
      
      // Create AI person ID for the greeting
      const aiPersonId = await this.getOrCreateAIPersonId(modelId, modelName)
      
      // Send greeting message as plain text
      // TopicRoom.sendMessage expects (text, author, channelOwner)
      const greetingText = `Hello! I'm ${modelName}. How can I help you today?`
      
      await topicRoom.sendMessage(greetingText, aiPersonId, undefined)
      console.log(`[NodeOneCore] ✅ AI greeting sent from ${modelName}`)
    } catch (error) {
      console.error('[NodeOneCore] Failed to send AI greeting:', error)
    }
  }
  
  /**
   * Check if a message should be processed by AI
   */
  async shouldProcessMessage(message: any): Promise<any> {
    // Skip if it's an AI message (don't respond to ourselves)
    if (message.author && message.author.includes('ai-')) {
      return false
    }
    
    // Skip if we already responded to this message
    // TODO: Implement proper tracking of processed messages
    
    return true
  }
  
  /**
   * Process a user message with AI and send response
   */
  async processMessageWithAI(topicRoom: any, userMessage: any): Promise<any> {
    console.log('[NodeOneCore] Processing user message with AI...')
    
    try {
      // Get LLM manager from main process
      const { default: llmManager } = await import('../services/llm-manager-singleton.js')
      
      // Get AI response
      const response = await (llmManager as any).generateResponse({
        messages: [{
          role: 'user',
          content: userMessage.content
        }],
        model: (llmManager as any).defaultModelId
      })
      
      if (response && response.content) {
        // Create AI person ID for the response
        const aiPersonId = await this.getOrCreateAIPersonId((llmManager as any).defaultModelId, 'AI Assistant')
        
        // Send AI response to topic (will sync via CHUM to browser)
        await topicRoom.sendMessage(response.content, aiPersonId, this.ownerId)
        
        console.log('[NodeOneCore] ✅ AI response sent to topic')
      }
    } catch (error) {
      console.error('[NodeOneCore] Error processing message with AI:', error)
    }
  }
  
  // REMOVED: setupAIContacts() - AIAssistantModel handles all AI contact creation
  
  /**
   * Get AI person ID for a model (delegates to AIContactManager)
   */
  async getOrCreateAIPersonId(modelId: any, displayName: any): Promise<any> {
    // Delegate to the AI Assistant Model
    return this.aiAssistantModel!.createAIContact(modelId, displayName)
  }
  
  /**
   * OLD METHOD - TO BE REMOVED
   */
  async getOrCreateAIPersonId_OLD(modelId: any, displayName: any): Promise<any> {
    console.log(`[NodeOneCore] Getting/creating AI person for ${displayName} (${modelId})`)
    
    try {
      if (!this.leuteModel) {
        console.error('[NodeOneCore] LeuteModel not available')
        return null
      }

      // Import required modules
      const { storeVersionedObject } = await import('@refinio/one.core/lib/storage-versioned-objects.js')
      const { createPersonIfNotExist } = await import('@refinio/one.models/lib/misc/person.js')
      
      // Create email for AI identity
      const email = `${modelId.replace(/[^a-zA-Z0-9]/g, '_')}@ai.local`
      
      // Use createPersonIfNotExist - it's idempotent and content-addressed
      const result = await createPersonIfNotExist(email)
      const personId = (result as any)?.personId
      
      if ((result as any)?.exists) {
        console.log(`[NodeOneCore] Using existing AI person for ${displayName}: ${String(personId).substring(0, 8)}...`)
      } else {
        console.log(`[NodeOneCore] Created new AI person for ${displayName}: ${String(personId).substring(0, 8)}...`)
      }
      
      // Get or create Someone wrapper for this person
      let someone = await this.leuteModel.getSomeone(personId)
      let someoneIdHash
      
      if (!someone) {
        // Create profile and Someone wrapper for new person
        const myIdentity = await this.leuteModel.myMainIdentity()
        const newProfile = await ProfileModel.constructWithNewProfile(personId, myIdentity, 'default')
        await this.leuteModel.addProfile(newProfile.idHash)
        
        someone = await this.leuteModel.getSomeone(personId)
        if (!someone) {
          throw new Error('Failed to create Someone wrapper for AI person')
        }
        someoneIdHash = someone.idHash
      } else {
        someoneIdHash = someone.idHash
      }
      
      // Load the created Someone model
      const someoneModel = await SomeoneModel.constructFromLatestVersion(someoneIdHash)
      
      // Get the main profile of the Someone  
      const profile = await someoneModel.mainProfile()
      
      // Add AI-specific information to the profile
      profile.personDescriptions = profile.personDescriptions || []
      if (profile.personDescriptions) {
        profile.personDescriptions.push({
          $type$: 'PersonName',
          name: displayName
        })
      }
      
      // Add AI model identifier as a custom field
      (profile as any).description = `${displayName} AI Assistant (${modelId})`
      
      // Add communication endpoint
      profile.communicationEndpoints = profile.communicationEndpoints || []
      profile.communicationEndpoints?.push({
        $type$: 'Email',
        email: email
      })
      
      // Persist the changes
      await profile.saveAndLoad()
      
      console.log(`[NodeOneCore] ✅ AI contact ${displayName} ready with ID: ${String(personId).substring(0, 8)}...`)
      
      return personId
    } catch (error) {
      console.error(`[NodeOneCore] Failed to create AI person for ${displayName}:`, error)
      // Fall back to simple hash
      const crypto = await import('crypto')
      return crypto
        .createHash('sha256')
        .update(`ai-assistant-${modelId}-${this.ownerId}`)
        .digest('hex')
    }
  }

  // REMOVED: setupAIContactsWhenReady() - AIAssistantModel handles all AI contact creation
  
  // Removed setupBrowserAccess - browser has no ONE instance
  
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
    
    const { SettingsStore } = await import('@refinio/one.core/lib/system/settings-store.js')
    
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
    
    const { startChumProtocol } = await import('@refinio/one.models/lib/misc/ConnectionEstablishment/protocols/Chum.js')
    const { OEvent } = await import('@refinio/one.models/lib/misc/OEvent.js')
    
    const onProtocolStart = new OEvent()
    
    await startChumProtocol(
      conn,
      localPersonId,
      localInstanceId,
      remotePersonId,
      remoteInstanceId,
      initiatedLocally,
      routeGroupId,
      onProtocolStart,
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
      const { closeInstance } = await import('@refinio/one.core/lib/instance.js')
      closeInstance()
      
      // Reset all models and groups
      this.leuteModel = null as any
      this.connectionsModel = null as any
      this.channelManager = null as any
      this.topicModel = null as any
      this.oneAuth = null as any
      this.federationGroup = null as any
      this.replicantGroup = null as any
      this.topicGroupManager = null as any
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
      const { default: NodeAccessRightsManager } = await import('./access-rights-manager.js')
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
    this.instanceName = null as any
    this.ownerId = null as any
    this.leuteModel = null as any
    this.connectionsModel = null as any
    this.channelManager = null as any
    this.topicModel = null as any
    this.localWsServer = null as any
    this.instanceModule = null as any
    this.aiAssistantModel = null as any
    this.apiServer = null as any
    this.topicGroupManager = null as any
    this.federationGroup = null
    this.replicantGroup = null
    this.accessRightsManager = null
    this.aiAssistant = null
    this.quickReply = null
    this.messageSyncInterval = null
    this.aiMessageListener = null
    this.initFailed = false

    console.log('[NodeOneCore] Instance reset to clean state')
  }

  /**
   * Shutdown the instance properly
   */
  async shutdown(): Promise<any> {
    console.log('[NodeOneCore] Shutting down...')

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
    this.instanceName = null as any
    this.ownerId = null as any
    console.log('[NodeOneCore] Shutdown complete')
  }

  // WebSocket listening is handled by IncomingConnectionManager.listenForDirectConnections()
  // which is called after ConnectionsModel.init()
}

// Singleton
const instance = new NodeOneCore()
export default instance;
export { instance }