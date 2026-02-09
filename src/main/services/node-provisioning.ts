import type { ConnectionsModel } from '@refinio/one.models/lib/models/index.js';
import type { JournalModule } from '@refinio/lama.core/modules';
/**
 * Node Instance Provisioning
 * Receives provisioning from browser instance and initializes
 */

import electron, { BrowserWindow } from 'electron';
const { ipcMain } = electron;
import { getInstanceIdHash } from '@refinio/one.core/lib/instance.js';
import { getDefaultKeys } from '@refinio/one.core/lib/keychain/keychain.js';
import ProfileModel from '@refinio/one.models/lib/models/Leute/ProfileModel.js';
import { mcpManager } from '@refinio/mcp.core/local';
import * as fsNode from 'fs';
import pathNode from 'path';
import ipcController from '../ipc/controller.js';
import { loadModuleData, getAIModule, getModuleRegistry } from '../registry/module-registry-init.js';
import { registerSubjectMemoryPlan } from './mcp-server-init.js';
import { lamaAPIServer } from './lama-api-server.js';
import llmManager from './llm-manager-singleton.js';
import nodeOneCore from '../core/node-one-core.js';
import stateManager from '../state/manager.js';
import assemblyManagerSingleton from './assembly-manager-singleton.js';


class NodeProvisioning {
  public user: any;

  commServerUrl: any;
  provisioned: boolean | undefined;
  private isProvisioning: boolean = false;
  private provisioningPromise: Promise<any> | null = null;

  constructor() {
    this.user = null
  }

  initialize(): any {
    // Listen for provisioning requests from browser
    ipcMain.handle('provision:node', async (event, provisioningData) => {
      console.log('[NodeProvisioning] IPC handler invoked with:', JSON.stringify(provisioningData))
      const result = await this.provision(provisioningData)
      console.log('[NodeProvisioning] IPC returning result:', JSON.stringify(result))
      return result
    })
    
    console.log('[NodeProvisioning] Listening for provisioning requests')
  }

  async provision(provisioningData: any): Promise<any> {
    console.log('[NodeProvisioning] Received provisioning request')

    // If we're already provisioning, wait for it to complete instead of starting another
    if (this.isProvisioning && this.provisioningPromise) {
      console.log('[NodeProvisioning] Already provisioning, waiting for completion...')
      try {
        const result = await this.provisioningPromise;
        console.log('[NodeProvisioning] Existing provisioning completed, returning result')
        return result;
      } catch (error) {
        console.log('[NodeProvisioning] Existing provisioning failed, returning error')
        throw error;
      }
    }

    // Idempotent: always re-provision. NodeOneCore.initialize() handles its own
    // cleanup if already initialized. No bail-out on stale flags.
    if (this.provisioned) {
      console.log('[NodeProvisioning] Previously provisioned - will re-initialize cleanly')
      this.provisioned = false
    }

    // Simple validation - just need username and password
    if (!provisioningData?.user?.name || !provisioningData?.user?.password) {
      throw new Error('Username and password required for provisioning')
    }

    this.isProvisioning = true;

    // Create a promise that other callers can await
    this.provisioningPromise = this.doProvision(provisioningData);

    try {
      const result = await this.provisioningPromise;
      return result;
    } finally {
      this.isProvisioning = false;
      this.provisioningPromise = null;
    }
  }

  private async doProvision(provisioningData: any): Promise<any> {
    try {

      // Store user info (ID will be set after ONE.core initialization)
      this.user = provisioningData.user
      
      // Update state manager with authenticated user (ID will be updated after init)
      stateManager.setUser({
        id: this.user.id || null, // ID comes from ONE.core after init
        name: this.user.name,
        email: this.user.email || `${this.user.name}@lama.local`
      })
      console.log('[NodeProvisioning] Updated state manager with user:', this.user.name)

      // Check if ONE.core is already initialized (skip init if so)
      const nodeInfo = nodeOneCore.getInfo()
      const skipOneCoreInit = nodeInfo.initialized && nodeInfo.ownerId

      // Initialize Node instance with provisioned identity
      await this.initializeNodeInstance(provisioningData, skipOneCoreInit)
      
      console.log('[NodeProvisioning] Node instance provisioned successfully')

      // Invitations are created on-demand via IPC, not automatically during init

      // Create profile with OneInstanceEndpoint so the instance can be paired
      console.log('[NodeProvisioning] Creating profile with OneInstanceEndpoint...')
      try {

        const instanceId = getInstanceIdHash()
        const personId = nodeOneCore.ownerId

        // Create the OneInstanceEndpoint for the Node
        const personKeys = await getDefaultKeys(personId)
        const instanceKeys = await getDefaultKeys(instanceId)

        // Get commServerUrl from nodeOneCore
        const commServerUrl = nodeOneCore.commServerUrl || 'wss://comm10.dev.refinio.one'

        const endpoint = {
          $type$: 'OneInstanceEndpoint' as const,
          personId: personId,
          instanceId: instanceId,
          personKeys: personKeys,
          instanceKeys: instanceKeys,
          url: commServerUrl
        }

        // Get or create profile for the Node's owner
        const me = await nodeOneCore.leuteModel.me()
        console.log('[NodeProvisioning] Getting main profile for Node person:', personId)
        let profile = await me.mainProfile()

        if (!profile) {
          // Create profile on-the-fly
          console.log('[NodeProvisioning] No existing profile found, creating new one...')
          profile = await ProfileModel.constructWithNewProfile(personId, personId, 'default')
          console.log('[NodeProvisioning] Created new profile for Node instance:', profile.idHash)
        } else {
          console.log('[NodeProvisioning] Using existing profile:', profile.idHash)
        }

        // Initialize communicationEndpoints array if it doesn't exist
        if (!profile.communicationEndpoints) {
          profile.communicationEndpoints = []
          console.log('[NodeProvisioning] Initialized empty communicationEndpoints array')
        } else {
          console.log('[NodeProvisioning] Existing communicationEndpoints:', profile.communicationEndpoints.length, 'endpoints')
        }

        // Add or update the endpoint
        const existingIndex = profile.communicationEndpoints.findIndex(
          (ep: any) => ep.$type$ === 'OneInstanceEndpoint' && ep.instanceId === instanceId
        )

        if (existingIndex >= 0) {
          profile.communicationEndpoints[existingIndex] = endpoint
          console.log('[NodeProvisioning] Updated existing OneInstanceEndpoint at index:', existingIndex)
        } else {
          profile.communicationEndpoints.push(endpoint)
          console.log('[NodeProvisioning] Added new OneInstanceEndpoint to profile')
          console.log('[NodeProvisioning] Total endpoints now:', profile.communicationEndpoints.length)
        }

        console.log('[NodeProvisioning] Saving profile with endpoint...')
        await profile.saveAndLoad()
        console.log('[NodeProvisioning] ✅ Profile saved successfully with OneInstanceEndpoint')
        console.log('[NodeProvisioning] Node person ID:', personId?.substring(0, 8))
        console.log('[NodeProvisioning] Endpoint URL:', endpoint.url)

      } catch (error) {
        console.error('[NodeProvisioning] Failed to create profile with endpoint:', error)
      }

      // Register browser instance for federation if info provided
      if (provisioningData.browserInstance) {
        console.log('[NodeProvisioning] Registering browser instance for federation...')
        try {
          await nodeOneCore.federationAPI.registerBrowserInstance(provisioningData.browserInstance)
          console.log('[NodeProvisioning] Browser instance registered with contact and endpoint')
        } catch (error) {
          console.error('[NodeProvisioning] Failed to register browser instance:', error)
        }
      }
      
      // CHUM sync is handled automatically by ONE.core when instances are connected via IoM
      console.log('[NodeProvisioning] CHUM sync handled by ONE.core automatically')
      
      // Get the actual owner ID from the initialized Node instance
      const nodeOwnerId = nodeOneCore.ownerId || nodeOneCore.getInfo().ownerId
      
      // Update state manager with the actual owner ID
      if (nodeOwnerId) {
        stateManager.setUser({
          id: nodeOwnerId,
          name: this.user.name,
          email: this.user.email || `${this.user.name}@lama.local`
        })
      }
      
      // Default AI chats are created by AIAssistantPlan.setDefaultModel()
      // Triggered either when user selects a model in ModelOnboarding OR when restoring saved default model
      // See: lama.core/plans/AIAssistantPlan.ts → setDefaultModel() → createDefaultChats()
      console.log('[NodeProvisioning] Default chat creation handled by AIAssistantPlan via setDefaultModel()')

      this.provisioned = true;

      // Register post-init IPC handlers now that NodeOneCore is ready (demand/supply)
      // This emits 'nodecore:ready' event to UI
      try {
        await ipcController.registerPostInitPlans();
        console.log('[NodeProvisioning] ✅ Post-init IPC handlers registered');
      } catch (error) {
        console.error('[NodeProvisioning] Failed to register post-init handlers:', error);
      }

      // CRITICAL: Load module data AFTER login returns to browser
      // This is phase 2 of initialization - loads AI/LLM from storage
      // Must happen AFTER login because we need to know the storage folder first
      setImmediate(async () => {
        try {
          await loadModuleData();
          console.log('[NodeProvisioning] ✅ Module data loaded (post-login)');
        } catch (error) {
          console.error('[NodeProvisioning] Failed to load module data:', error);
          // Non-critical - app can work, user can reconfigure AI
        }
      });

      return {
        success: true,
        nodeId: nodeOwnerId || 'node-' + Date.now(),
        endpoint: nodeOneCore.commServerUrl || 'wss://comm10.dev.refinio.one'
      }

    } catch (error) {
      console.error('[NodeProvisioning] Provisioning failed:', error)
      // Reset state on failure
      this.user = null
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  validateCredential(credential: any): any {
    // Validate credential structure
    if (!credential || !credential.credentialSubject) {
      return false
    }
    
    // Check credential type
    if (!credential.type?.includes('NodeProvisioningCredential')) {
      return false
    }
    
    // Check expiration
    const expiry = new Date(credential.expirationDate)
    if (expiry < new Date()) {
      console.error('[NodeProvisioning] Credential expired')
      return false
    }
    
    // In production, verify cryptographic proof
    // For now, accept if structure is valid
    return true
  }

  async initializeNodeInstance(provisioningData: any, skipOneCoreInit = false): Promise<any> {
    const { user } = provisioningData || {}

    const t0 = performance.now();
    console.log('[NodeProvisioning] ⏱️ Starting Node instance initialization at', t0.toFixed(1), 'ms');
    console.log('[NodeProvisioning] Initializing Node instance for user:', user?.name)

    // Create progress callback that sends IPC events to browser
    const onProgress = (stage: string, percent: number, message: string) => {
      const tNow = performance.now();
      console.log(`[NodeProvisioning] ⏱️ Progress at +${(tNow - t0).toFixed(1)}ms: ${percent}% - ${message}`)

      // Send progress event to browser via IPC
      if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        global.mainWindow.webContents.send('onecore:init-progress', {
          stage,
          percent,
          message
        })
      }
    }

    // Only run ONE.core init if not already initialized
    if (!skipOneCoreInit) {
      // Initialize Node.js with same credentials as browser
      const username = user.name
      const password = user.password

      if (!username || !password) {
        throw new Error('Username and password required for Node initialization')
      }

      console.log('[NodeProvisioning] Initializing Node.js with username:', username)

      const tBeforeInit = performance.now();
      console.log('[NodeProvisioning] ⏱️ Calling nodeOneCore.initialize at +${(tBeforeInit - t0).toFixed(1)}ms');
      const result = await nodeOneCore.initialize(username, password, onProgress)
      const tAfterInit = performance.now();
      console.log('[NodeProvisioning] ⏱️ nodeOneCore.initialize completed after', (tAfterInit - tBeforeInit).toFixed(1), 'ms');
      if (!result.success) {
        // If it's a decryption error, it means passwords don't match
        if (result.error && result.error.includes('CYENC-SYMDEC')) {
          throw new Error('Password mismatch between browser and Node instances. Please use the same password.')
        }
        throw new Error(`Failed to initialize Node.js ONE.core instance: ${result.error}`)
      }

      console.log('[NodeProvisioning] Node.js ONE.core initialized with ID:', result.ownerId)
    } else {
      console.log('[NodeProvisioning] Skipping ONE.core init (already initialized)')
    }

    // NOTE: Legacy setupMessageSync() removed - AI initialization now handled by ModuleRegistry
    // The AIModule.init() sets up all AI services, and startMessageListener() is called
    // after ModuleRegistry initialization (see below)
    console.log('[NodeProvisioning] AI initialization will be handled by ModuleRegistry');
    onProgress('ai-discovery', 105, 'AI initialization delegated to ModuleRegistry...');

    // Initialize memory tools with NodeOneCore reference
    // IMPORTANT: await ensures tools are registered before proceeding
    const tBeforeMCP = performance.now();
    console.log('[NodeProvisioning] ⏱️ Starting MCP initialization at +${(tBeforeMCP - t0).toFixed(1)}ms');
    try {
      await mcpManager.setNodeOneCore(nodeOneCore)
      const tAfterMCP = performance.now();
      console.log('[NodeProvisioning] ⏱️ MCP initialization completed after', (tAfterMCP - tBeforeMCP).toFixed(1), 'ms');
      console.log('[NodeProvisioning] Memory tools initialized with NodeOneCore')

      // Register SubjectMemoryPlan with PlanRegistry for HTTP API access
      if (mcpManager.memoryTools) {
        registerSubjectMemoryPlan(mcpManager.memoryTools);
      }
    } catch (error) {
      console.warn('[NodeProvisioning] Failed to initialize memory tools:', error)
    }

    // Start HTTP API server for MCP thin proxy
    try {
      await lamaAPIServer.start();
      console.log('[NodeProvisioning] ✅ HTTP API server started on port 8787');
    } catch (error) {
      console.warn('[NodeProvisioning] Failed to start HTTP API server:', error);
    }

    // Initialize AssemblyManager for knowledge extraction and Supply/Demand markets
    try {
      console.log('[NodeProvisioning] Initializing AssemblyManager...')
      await assemblyManagerSingleton.init();
      // CRITICAL: Assign to nodeOneCore so AIAssistantPlan can use it
      nodeOneCore.assemblyManager = assemblyManagerSingleton
      console.log('[NodeProvisioning] AssemblyManager initialized - knowledge extraction active')
    } catch (error) {
      console.warn('[NodeProvisioning] Failed to initialize AssemblyManager:', error)
      // Non-critical - continue without assembly
    }

    // Update LLMManager SystemPromptBuilder with NodeOneCore dependencies
    const tBeforeLLMUpdate = performance.now();
    console.log('[NodeProvisioning] ⏱️ Starting LLMManager update at +${(tBeforeLLMUpdate - t0).toFixed(1)}ms');
    try {
      const userSettingsManager = nodeOneCore.settingsPlan
      const topicAnalysisModel = nodeOneCore.topicAnalysisModel
      const channelManager = nodeOneCore.channelManager

      llmManager.updateSystemPromptDependencies(
        userSettingsManager,
        topicAnalysisModel,
        channelManager
      )
      // Set LeuteModel for storage lookups (required for getAllLLMsFromStorage)
      llmManager.setLeuteModel(nodeOneCore.leuteModel)
      const tAfterLLMUpdate = performance.now();
      console.log('[NodeProvisioning] ⏱️ LLMManager update completed after', (tAfterLLMUpdate - tBeforeLLMUpdate).toFixed(1), 'ms');
      console.log('[NodeProvisioning] LLMManager SystemPromptBuilder dependencies updated')
    } catch (error) {
      console.warn('[NodeProvisioning] Failed to update LLMManager dependencies:', error)
    }

    const tEnd = performance.now();
    console.log('[NodeProvisioning] ⏱️ TOTAL initializeNodeInstance time:', (tEnd - t0).toFixed(1), 'ms');

    // Post-init wiring: ModuleRegistry was already initialized by NodeOneCore.initializeModels().
    // Here we wire platform-specific integrations that don't belong in NodeOneCore.
    try {
      const registry = getModuleRegistry()

      // Wire AssemblyDimension from JournalModule to AssemblyManager
      // This allows AssemblyManager-created assemblies to appear in journal
      if (registry) {
        const journalModule = registry.getModule<JournalModule>('JournalModule')
        if (journalModule?.assemblyDimension) {
          const { saveState } = journalModule
          assemblyManagerSingleton.setAssemblyDimension(
            journalModule.assemblyDimension,
            saveState ? () => saveState.call(journalModule) : undefined
          )
          console.log('[NodeProvisioning] ✅ AssemblyDimension wired to AssemblyManager')
        }
      }

      // Start AI message listener after ModuleRegistry init
      // This ensures we use the correct AIAssistantPlan instance with registered topics
      const aiModule = getAIModule()
      if (aiModule) {
        // AIToolExecutor is auto-wired via ModuleRegistry when MCPManager is supplied
        console.log('[NodeProvisioning] Starting AI message listener...')
        await aiModule.startMessageListener(nodeOneCore.ownerId)
        console.log('[NodeProvisioning] ✅ AI message listener started')

        // Grant AI channel access to all existing contacts for CHUM sync (non-blocking)
        // This can take a while with many contacts, so run in background
        console.log('[NodeProvisioning] Scheduling AI channel access grants (background)...')
        nodeOneCore.grantAIChannelAccessToAllPeers().then(() => {
          console.log('[NodeProvisioning] ✅ AI channel access granted (background complete)')
        }).catch(err => {
          console.error('[NodeProvisioning] Failed to grant AI channel access:', err)
        })

        // Register handler to grant AI access when new contacts pair
        // This ensures newly paired contacts can see AI Person/Profile/channels
        if (nodeOneCore.connectionsModel?.pairing) {
          nodeOneCore.connectionsModel.pairing.onPairingSuccess(async (
            _initiatedLocally: boolean,
            _localPersonId: any,
            _localInstanceId: any,
            remotePersonId: any,
            _remoteInstanceId: any,
            _token: any
          ) => {
            console.log(`[NodeProvisioning] 🤝 New contact paired: ${String(remotePersonId).substring(0, 8)}`)
            // Grant AI access to the newly paired contact
            await nodeOneCore.grantAIAccessToPeer(remotePersonId)
          })
          console.log('[NodeProvisioning] ✅ Registered onPairingSuccess handler for AI access grants')
        }

        // CRITICAL: Update nodeOneCore.llmObjectManager to use AIModule's instance
        // The AIModule's LLMObjectManager has queryAllLLMObjects and is properly populated
        // via loadExisting() backfill.
        if (aiModule.llmObjectManager) {
          nodeOneCore.llmObjectManager = aiModule.llmObjectManager
          console.log('[NodeProvisioning] ✅ Updated nodeOneCore.llmObjectManager to use AIModule instance')
        }

        // Forward channel updates to UI
        nodeOneCore.channelManager.onUpdated((
          channelInfoIdHash,
          participants,
          channelOwner,
          timeOfEarliestChange,
          data
        ) => {
          const mainWindow = BrowserWindow.getAllWindows()[0]
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('channel:updated', {
              channelId: channelInfoIdHash,  // Browser expects 'channelId'
              channelInfoIdHash,
              participants,
              channelOwner
            })
          }
        })
        console.log('[NodeProvisioning] ✅ Channel update forwarder registered')

        onProgress('complete', 110, 'AI assistant ready');
      } else {
        console.warn('[NodeProvisioning] AIModule not available - message listener not started')
      }
    } catch (error) {
      console.error('[NodeProvisioning] Failed to initialize Module Registry:', error)
      // Non-critical - allow app to continue
    }
  }


  async configureNodeInstance(config: any): Promise<any> {
    // Minimal configuration for fast startup
    // Only set essential config, skip heavy operations
    if (!config) {
      config = {
        storageRole: 'archive',
        syncEndpoint: 'ws://localhost:8765'
      }
    }
    
    // Just set basic config without heavy capability initialization
    await nodeOneCore.setState('config.storageRole', config?.storageRole || 'archive')
    await nodeOneCore.setState('config.syncEndpoint', config.syncEndpoint)
  }

  async enableCapability(capability: any): Promise<any> {
    console.log('[NodeProvisioning] Enabling capability:', capability)
    
    switch (capability) {
      case 'llm':
        // Initialize LLM capability - integrate with main process LLMManager
        const models = await llmManager.getAvailableModels()
        const availableModels: any[] = models.map((m: any) => m.id)

        await nodeOneCore.setState('capabilities.llm', {
          enabled: true,
          provider: 'main-process',
          models: availableModels,
          defaultModel: undefined, // LLMManager has no defaultModelId property
          integration: 'lama-llm-manager'
        })
        console.log('[NodeProvisioning] LLM capability enabled with main process integration')
        break
        
      case 'files':
        // Enable file import/export capability
        await nodeOneCore.setState('capabilities.files', {
          enabled: true,
          storageType: 'file-system',
          importPath: './imports',
          exportPath: './exports',
          blobStorage: 'OneDB/blobs/'
        })
        console.log('[NodeProvisioning] File storage capability enabled')
        break
        
      case 'network':
        // Enable full network access via ConnectionsModel
        await nodeOneCore.setState('capabilities.network', {
          enabled: true,
          protocols: ['http', 'https', 'ws', 'wss', 'udp'],
          p2pEnabled: true,
          commServerUrl: 'wss://comm10.dev.refinio.one',
          directConnections: true,
          iomServer: {
            enabled: true,
            port: 8765
          }
        })
        console.log('[NodeProvisioning] Network capability enabled via ConnectionsModel')
        break
        
      case 'storage':
        // Enable archive storage role
        await nodeOneCore.setState('capabilities.storage', {
          enabled: true,
          role: 'archive',
          persistent: true,
          location: 'OneDB/',
          unlimited: true
        })
        console.log('[NodeProvisioning] Archive storage capability enabled')
        break
    }
  }

  reset(): any {
    // Reset provisioning state
    this.user = null
    console.log('[NodeProvisioning] Reset provisioning state')
  }

  async createUserObjects(user: any): Promise<any> {
    // User objects already created in initialization
  }

  async deprovision(): Promise<any> {
    console.log('[NodeProvisioning] Deprovisioning Node instance...')
    
    try {
      // Shutdown Node instance if initialized
      if (nodeOneCore.getInfo().initialized) {
        await nodeOneCore.shutdown()
      }
      
      // Clear user data
      this.user = null

      // Clear storage (optional - for full reset)
      // Use runtime configuration path (respects --storage CLI arg)
      const dataPath = global.lamaConfig?.instance.directory || pathNode.join(process.cwd(), 'OneDB')
      
      try {
        await fsNode.promises.rm(dataPath, { recursive: true, force: true })
        console.log('[NodeProvisioning] Cleared Node data')
      } catch (error) {
        console.error('[NodeProvisioning] Failed to clear data:', error)
      }
      
      return { success: true }
      
    } catch (error) {
      console.error('[NodeProvisioning] Deprovision failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  isProvisioned(): any {
    return nodeOneCore.getInfo().initialized
  }

  /**
   * Reset provisioning state for dev mode restart
   * Called after data clear to allow fresh login without restarting process
   */
  resetProvisioningState(): void {
    console.log('[NodeProvisioning] Reset provisioning state')
    this.provisioned = false
    this.isProvisioning = false
    this.provisioningPromise = null
    this.user = null
  }

  getUser(): any {
    return this.user
  }
}

// Export singleton
export default new NodeProvisioning()