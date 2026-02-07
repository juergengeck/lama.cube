import { useState, useEffect, useRef } from 'react'
import { Button, ModelOnboarding, BridgeProvider, ChatLayout, MemoryView, ContactsView, AICreationLoader, useTheme } from '@lama/ui'
import { ElectronAlertBridge } from '@/components/ElectronAlertBridge'
import { AlertBadgedNav } from '@/components/AlertBadgedNav'
import { StatusBar } from '@/components/StatusBar'
import { usePlans, NavigateHomeProvider, useEntityResolver } from '@ui/core'
import { ElectronPlansProvider } from '@/providers/ElectronPlansProvider'
import { SettingsView } from '@/components/SettingsView'
import { DataDashboard } from '@/components/DataDashboard'
import { JournalView } from '@lama/ui'
// DevicesView is now only used in SettingsView
import { createElectronDeviceAdapter } from '@/adapters/device-adapter'
import { LoginDeploy } from '@lama/ui'
import { MessageSquare, BookOpen, Users, Settings, Loader2, BarChart3, Brain, Menu, ChevronDown } from 'lucide-react'
import { useLamaInit } from '@/hooks/useLamaInit'
import { lamaBridge } from '@/bridge/lama-bridge'
import { ipcStorage } from '@/services/ipc-storage'
import { createLLMConfigOperations, createAIOperations, ALL_MODEL_OPTIONS } from '@/adapters/llm-operations'
import { useLocalModels } from '@/hooks/useLocalModels'
import { SettingsProvider } from '@settings/core'
import { IPCSettingsStorage } from '@/storage/IPCSettingsStorage'
// TTS Worker - use Vite's ?worker&url syntax for WebGPU acceleration
import ttsWorkerUrl from './workers/tts.worker.ts?worker&url'

function AppContent() {
  const { chat, ai } = usePlans()
  const resolveEntityName = useEntityResolver()
  useTheme() // Apply dark/light theme class to document.documentElement
  const [activeTab, setActiveTab] = useState('chats')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined)
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined)
  const [toolbarControls, setToolbarControls] = useState<React.ReactNode>(null)
  const [hasTopics, setHasTopics] = useState<boolean | null>(null)
  const [hasDefaultModel, setHasDefaultModel] = useState<boolean | null>(null)
  const [isCreatingAI, setIsCreatingAI] = useState(false)
  const [aiCreationProgress, setAiCreationProgress] = useState<{
    step: number; total: number; message: string; aiId: string; name: string
  } | null>(null)
  const [mcpApiStatus, setMcpApiStatus] = useState<{ running: boolean; requestCount: number }>({ running: false, requestCount: 0 })
  const [mcpReconnecting, setMcpReconnecting] = useState(false)
  const [mcpToggling, setMcpToggling] = useState(false)
  const [memoryScanStatus, setMemoryScanStatus] = useState<{ scanning: boolean; progress?: string }>({ scanning: false })
  const [proposalSensitivity, setProposalSensitivity] = useState<number>(0.9) // 0-1 scale where 0=no proposals, 1=all proposals
  const [responseLengthPercent, setResponseLengthPercent] = useState<number>(0.2) // Response length: 20% default
  const [discoveryEnabled, setDiscoveryEnabled] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)

  // Ref to track if onboarding was completed in this session (prevents re-checking loop)
  const onboardingCompletedRef = useRef(false)

  // Local models hook - safe to call now, we're authenticated
  const localModels = useLocalModels()
  const { logout } = useLamaInit()

  // Update proposal config when sensitivity changes
  // Invert the scale: 0% sensitivity = high threshold (1.0), 100% sensitivity = low threshold (0.0)
  useEffect(() => {
    const updateConfig = async () => {
      try {
        const minJaccard = 1 - proposalSensitivity // Invert: 0% = 1.0 (strict), 100% = 0.0 (loose)
        await lamaBridge.updateProposalConfig({ minJaccard })
        console.log('[App] Updated proposal sensitivity:', (proposalSensitivity * 100).toFixed(0) + '%', '-> minJaccard:', minJaccard.toFixed(2))
      } catch (error) {
        console.error('[App] Failed to update proposal config:', error)
      }
    }
    updateConfig()
  }, [proposalSensitivity])

  // Update AI response length when slider changes
  useEffect(() => {
    const updateResponseLength = async () => {
      try {
        const maxTokens = Math.round(4096 * responseLengthPercent)
        await lamaBridge.setResponseLength(maxTokens)
        console.log(`[App] Response length updated: ${(responseLengthPercent * 100).toFixed(0)}% = ${maxTokens} tokens`)
      } catch (error) {
        console.error('[App] Failed to update response length:', error)
      }
    }
    updateResponseLength()
  }, [responseLengthPercent])

  // Handle discovery toggle - use setCollectionActive for unified state
  const handleDiscoveryChange = async (enabled: boolean) => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.invoke('discovery:setCollectionActive', enabled)
      if (result.success) {
        console.log('[App] Discovery', enabled ? 'started' : 'stopped')
        // State will be updated via discovery:stateChanged event
      }
    } catch (error) {
      console.error('[App] Failed to toggle discovery:', error)
    }
  }

  // Fetch initial discovery state and listen for changes
  useEffect(() => {
    if (!window.electronAPI) return

    // Fetch initial state
    const fetchInitialState = async () => {
      try {
        const result = await window.electronAPI.invoke('discovery:isCollectionActive')
        if (result.success) {
          setDiscoveryEnabled(result.active || false)
          console.log('[App] Initial discovery state:', result.active)
        }
      } catch (error) {
        console.error('[App] Failed to fetch initial discovery state:', error)
      }
    }
    fetchInitialState()

    // Listen for state changes (from DevicesView or other sources)
    const cleanup = window.electronAPI.on('discovery:stateChanged', (data: { active: boolean }) => {
      console.log('[App] Discovery state changed:', data.active)
      setDiscoveryEnabled(data.active)
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  // Listen for AI creation progress events
  useEffect(() => {
    if (!window.electronAPI) return

    const cleanup = window.electronAPI.on('ai:creation-progress', (data: {
      step: number; total: number; message: string; aiId: string; name: string
    }) => {
      console.log('[App] AI creation progress:', data)
      setAiCreationProgress(data)
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  // Check if any topics exist (for onboarding detection)
  useEffect(() => {
    chat.getConversations()
      .then((result: any) => {
        const conversations = result?.data || result?.conversations || []
        setHasTopics(conversations.length > 0)
      })
      .catch(() => setHasTopics(false))
  }, [chat])

  // Check if a default model has been configured
  useEffect(() => {
    // Skip if onboarding was already completed in this session
    if (onboardingCompletedRef.current) {
      console.log('[App] Skipping default model check - onboarding already completed')
      return
    }
    console.log('[App] Checking for default model...')
    ai.getDefaultModel()
      .then((response: any) => {
        console.log('[App] Default model response:', response)
        // Handle wrapped response from IPC controller
        const modelId = response?.data !== undefined ? response.data : response
        console.log('[App] Default model ID extracted:', modelId)
        const hasModel = !!modelId
        console.log('[App] Setting hasDefaultModel to:', hasModel)
        setHasDefaultModel(hasModel)
      })
      .catch((error) => {
        console.error('[App] Error checking default model:', error)
        setHasDefaultModel(false)
      })
  }, [ai])

  // Signal UI is ready
  useEffect(() => {
    if (window.electronAPI) {
      console.log('[App] Signaling UI ready for IPC messages')
      window.electronAPI.invoke('chat:uiReady').catch(err =>
        console.error('[App] Failed to signal UI ready:', err)
      )
    }
  }, [])

  // MCP status: initial fetch + push updates from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const applyStatus = (data: any) => {
      setMcpApiStatus({
        running: data.running,
        requestCount: data.toolCount || 0
      });
    };

    // Initial fetch (MCP server may already be running)
    window.electronAPI.invoke('mcp:getStatus').then((response: any) => {
      if (response.success && response.data) {
        applyStatus(response.data);
      }
    }).catch(() => {
      setMcpApiStatus({ running: false, requestCount: 0 });
    });

    // Listen for push updates (start/stop/toggle/reconnect)
    const cleanup = window.electronAPI.on('mcp:statusChanged', applyStatus);
    return cleanup;
  }, []);

  // Detect mobile viewport changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Reconnect MCP servers (status update arrives via mcp:statusChanged push)
  const handleMcpReconnect = async () => {
    if (!window.electronAPI || mcpReconnecting) return;

    setMcpReconnecting(true);
    try {
      const response = await window.electronAPI.invoke('mcp:reconnect');
      if (!response.success) {
        console.error('[App] Failed to reconnect MCP:', response.error);
      }
    } catch (error) {
      console.error('[App] Error reconnecting MCP:', error);
    } finally {
      setMcpReconnecting(false);
    }
  };

  // Toggle MCP on/off (status update arrives via mcp:statusChanged push)
  const handleMcpToggle = async (enabled: boolean) => {
    if (!window.electronAPI || mcpToggling) return;

    setMcpToggling(true);
    try {
      const response = await window.electronAPI.invoke('mcp:toggle', { enabled });
      if (!response.success) {
        console.error('[App] Failed to toggle MCP:', response.error);
      }
    } catch (error) {
      console.error('[App] Error toggling MCP:', error);
    } finally {
      setMcpToggling(false);
    }
  };

  // Listen for memory scan status updates
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleMemoryScanUpdate = (event: any, data: { scanning: boolean; progress?: string }) => {
      setMemoryScanStatus(data);
    };

    // @ts-ignore - electronAPI types don't include on()
    window.electronAPI.on('memory:scanStatus', handleMemoryScanUpdate);

    return () => {
      // @ts-ignore
      window.electronAPI.removeListener?.('memory:scanStatus', handleMemoryScanUpdate);
    };
  }, []);

  // Listen for open-conversation events (e.g., from AI Settings)
  useEffect(() => {
    const handleOpenConversation = (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId: string }>
      console.log('[App] Received open-conversation event:', customEvent.detail)
      setSelectedConversationId(customEvent.detail.conversationId)
      setActiveTab('chats')
    }

    window.addEventListener('open-conversation', handleOpenConversation)
    return () => window.removeEventListener('open-conversation', handleOpenConversation)
  }, [])

  // Global listener for channel updates - keeps conversation list updated app-wide
  useEffect(() => {
    const handleChannelUpdated = (data: { channelId: string; topicId: string }) => {
      console.log('[App] 📬 Global: Channel updated for topic:', data.topicId?.substring(0, 20))
    }

    lamaBridge.on('channel:updated', handleChannelUpdated)
    return () => {
      lamaBridge.off('channel:updated', handleChannelUpdated)
    }
  }, [])
  
  // Listen for navigation from Electron menu
  useEffect(() => {
    const handleNavigate = (_event: any, tab: string) => {
      setActiveTab(tab)
    }

    // Check if we're in Electron environment
    if (window.electronAPI && 'on' in window.electronAPI) {
      window.electronAPI.on('navigate', handleNavigate)
      return () => {
        // Only call off if it exists
        if ('off' in window.electronAPI!) {
          window.electronAPI.off?.('navigate', handleNavigate)
        }
      }
    }
  }, [])

  // Clear toolbar controls when tab changes
  useEffect(() => {
    setToolbarControls(null)
  }, [activeTab])

  // Show loading while creating AI identity (LLM inference for name generation)
  if (isCreatingAI) {
    return (
      <AICreationLoader
        logo={<img src="./assets/icons/lama_f_w.svg" alt="LAMA" className="h-24" />}
        progress={aiCreationProgress}
      />
    )
  }

  // Check if we need to show model onboarding
  // Show onboarding only if no default model has been configured
  const shouldShowOnboarding = hasDefaultModel === false

  if (shouldShowOnboarding) {
    return <ModelOnboarding
      llmConfig={createLLMConfigOperations()}
      aiPlan={createAIOperations()}
      modelOptions={ALL_MODEL_OPTIONS}
      allowSkip={true}
      logo={
        <img src="./assets/icons/lama_f_w.svg" alt="LAMA" className="h-16" />
      }
      downloads={{
        downloadModel: async ({ modelId, onProgress }) => {
          // Model IDs no longer have 'local:' prefix - they are plain IDs now
          // The inferenceType field in LLM datatype determines routing, not prefixes
          await localModels.downloadModel(modelId)
          // The hook updates textGenModels with progress via IPC listener
        },
        cancelDownload: async () => {
          // Currently no cancel support in useLocalModels
          console.warn('[App] Cancel download not yet implemented')
        },
        checkModelExists: async (modelId: string) => {
          // Model IDs are plain IDs - no prefix stripping needed
          const model = localModels.textGenModels.find(m => m.id === modelId)
          return model?.status === 'installed' || model?.status === 'ready'
        }
      }}
      onComplete={async (model) => {
        const t0 = performance.now()
        console.log('[App] ⏱️ ModelOnboarding completed - starting AI creation flow')

        // Mark onboarding as completed BEFORE any async operations
        // This prevents the useEffect from re-checking and causing a loop
        onboardingCompletedRef.current = true

        // Skip AI Person creation if no model was selected (skip case)
        if (!model.id) {
          console.log('[App] No model selected, skipping AI Person creation')
          setHasDefaultModel(true)
          return
        }

        // Create AI identity and default chats BEFORE showing main UI
        // This ensures topics are fetched AFTER AI is created
        setIsCreatingAI(true)
        setAiCreationProgress(null) // Reset progress for new creation
        try {
          let t1 = performance.now()
          const response = await window.electronAPI.invoke('ai:generateAIName', { modelId: model.id, provider: model.provider })
          console.log(`[App] ⏱️ ai:generateAIName IPC: ${(performance.now() - t1).toFixed(0)}ms`)

          if (response.success && response.data) {
            const { name, email } = response.data
            console.log('[App] AI identity generated:', name, email)
            // Set the default model WITH the generated name and email
            // This creates the AI Person in ONE.core with proper aiId
            t1 = performance.now()
            const setModelResult = await ai.setDefaultModel(model.id, name, email)
            console.log(`[App] ⏱️ ai.setDefaultModel IPC: ${(performance.now() - t1).toFixed(0)}ms`)

            if (setModelResult?.success) {
              console.log(`[App] ⏱️ TOTAL AI creation flow: ${(performance.now() - t0).toFixed(0)}ms`)
              // Set hasDefaultModel BEFORE clearing isCreatingAI to prevent flash back to onboarding
              setHasDefaultModel(true)
              setIsCreatingAI(false)
              return
            } else {
              console.error('[App] Failed to set default model:', setModelResult?.error || 'AI handler may not be initialized')
            }
          } else {
            console.error('[App] Failed to generate AI identity:', response.error)
          }
        } catch (error) {
          console.error('[App] Error generating AI identity:', error)
        }
        // AI creation failed - stay on onboarding
        console.error('[App] AI creation failed - staying on onboarding screen')
        setIsCreatingAI(false)
      }}
    />
  }

  // Show loading while checking for default model
  if (hasDefaultModel === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <img src="./assets/icons/lama_f_w.svg" alt="LAMA" className="h-24 mx-auto mb-6" />
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Loading</h2>
          <p className="text-muted-foreground">Checking for existing conversations...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'chats', label: 'Chats', icon: MessageSquare },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'settings', label: null, icon: Settings },  // No label for settings, just icon
  ]

  const handleNavigate = (tab: string, conversationId?: string, section?: string) => {
    setActiveTab(tab)
    if (conversationId) {
      setSelectedConversationId(conversationId)
    }

    // Store navigation context for settings
    if (tab === 'settings' && section) {
      // We'll pass this to SettingsView
      sessionStorage.setItem('settings-scroll-to', section)
    }
  }

  // Handle sharing message to glue.one
  const handleShareGlue = async (message: any) => {
    try {
      const result = await lamaBridge.shareToGlue(message, {
        includeSourceTopic: true
      })
      if (!result.success) {
        console.error('[App] Failed to share to glue.one:', result.error)
      } else {
        console.log('[App] Message shared to glue.one:', result.glueTopicId)
      }
    } catch (error) {
      console.error('[App] Error sharing to glue.one:', error)
    }
  }

  // Handle sharing message to moltbook
  const handleShareMolt = async (message: any) => {
    try {
      const result = await lamaBridge.shareToMolt(message, {
        includeSourceTopic: true
      })
      if (!result.success) {
        console.error('[App] Failed to share to moltbook:', result.error)
      } else {
        console.log('[App] Message shared to moltbook:', result.postUrl)
      }
    } catch (error) {
      console.error('[App] Error sharing to moltbook:', error)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'chats':
        return <ChatLayout
          selectedConversationId={selectedConversationId}
          onSetToolbarControls={setToolbarControls}
          onNavigateToContact={(participantId) => {
            console.log('[App] Navigate to contact:', participantId)
            setSelectedContactId(participantId)
            setActiveTab('contacts')
          }}
          ttsWorkerUrl={ttsWorkerUrl}
          onShareGlue={handleShareGlue}
          onShareMolt={handleShareMolt}
        />
      case 'journal':
        return <JournalView
          onSetToolbarControls={setToolbarControls}
          onNavigateToEntity={(entityId, entityType) => {
            console.log('[App] Navigate to entity:', entityType, entityId)
            if (entityType === 'contact') {
              setSelectedContactId(entityId)
              setActiveTab('contacts')
            } else if (entityType === 'chat') {
              setSelectedConversationId(entityId)
              setActiveTab('chats')
            }
          }}
          resolveEntityName={resolveEntityName}
        />
      case 'contacts':
        return <ContactsView onNavigateToChat={async (topicId, contactName) => {
          // Add or update the conversation in browser localStorage (not IPC secure storage)
          const savedConversations = localStorage.getItem('lama-conversations')
          let conversations = []

          try {
            if (savedConversations) {
              conversations = JSON.parse(savedConversations)
            }
          } catch (e) {
            console.error('Failed to parse saved conversations:', e)
          }

          // Check if conversation already exists
          const existingConv = conversations.find((c: any) => c.id === topicId)

          if (!existingConv) {
            // Create new conversation entry
            const newConversation = {
              id: topicId,
              name: `Chat with ${contactName}`,
              type: 'direct',
              lastMessage: null,
              lastMessageTime: new Date().toISOString(),
              modelName: null // No AI model for person-to-person chat
            }

            // Add to beginning of list
            conversations.unshift(newConversation)
            localStorage.setItem('lama-conversations', JSON.stringify(conversations))
            console.log('[App] Created new conversation for contact:', contactName)
          }

          // Navigate to chat
          setSelectedConversationId(topicId)
          setActiveTab('chats')
        }}
        selectedContactId={selectedContactId}
        />
      case 'memory':
        return <MemoryView />
      case 'settings':
        return <SettingsView onLogout={logout} onNavigate={handleNavigate} />
      default:
        return <ChatLayout
          onNavigateToContact={(participantId) => {
            console.log('[App] Navigate to contact:', participantId)
            setSelectedContactId(participantId)
            setActiveTab('contacts')
          }}
          ttsWorkerUrl={ttsWorkerUrl}
          onShareGlue={handleShareGlue}
          onShareMolt={handleShareMolt}
        />
    }
  }

  // Build menu items for navigation between views
  const appMenuItems = tabs.map((tab) => ({
    label: tab.label || 'Settings',
    onClick: () => setActiveTab(tab.id),
    icon: <tab.icon className="h-4 w-4" />,
    active: tab.id === activeTab
  }))

  // Detect macOS for traffic light space
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  // Pass menu items to views that support them
  const renderContentWithMenu = () => {
    switch (activeTab) {
      case 'chats':
        return <ChatLayout
          selectedConversationId={selectedConversationId}
          onSetToolbarControls={setToolbarControls}
          appMenuItems={appMenuItems}
          trafficLightSpace={isMac}
          onNavigateToContact={(participantId) => {
            console.log('[App] Navigate to contact:', participantId)
            setSelectedContactId(participantId)
            setActiveTab('contacts')
          }}
          ttsWorkerUrl={ttsWorkerUrl}
          onShareGlue={handleShareGlue}
          onShareMolt={handleShareMolt}
        />
      case 'journal':
        return <JournalView
          onSetToolbarControls={setToolbarControls}
          appMenuItems={appMenuItems}
          trafficLightSpace={isMac}
          onNavigateToEntity={(entityId, entityType) => {
            console.log('[App] Navigate to entity:', entityType, entityId)
            if (entityType === 'contact') {
              setSelectedContactId(entityId)
              setActiveTab('contacts')
            } else if (entityType === 'chat') {
              setSelectedConversationId(entityId)
              setActiveTab('chats')
            }
          }}
          resolveEntityName={resolveEntityName}
        />
      case 'contacts':
        return <ContactsView onNavigateToChat={async (topicId, contactName) => {
          const savedConversations = localStorage.getItem('lama-conversations')
          let conversations = []
          try {
            if (savedConversations) {
              conversations = JSON.parse(savedConversations)
            }
          } catch (e) {
            console.error('Failed to parse saved conversations:', e)
          }
          const existingConv = conversations.find((c: any) => c.id === topicId)
          if (!existingConv) {
            const newConversation = {
              id: topicId,
              name: `Chat with ${contactName}`,
              type: 'direct',
              lastMessage: null,
              lastMessageTime: new Date().toISOString(),
              modelName: null
            }
            conversations.unshift(newConversation)
            localStorage.setItem('lama-conversations', JSON.stringify(conversations))
            console.log('[App] Created new conversation for contact:', contactName)
          }
          setSelectedConversationId(topicId)
          setActiveTab('chats')
        }}
          appMenuItems={appMenuItems}
          trafficLightSpace={isMac}
          selectedContactId={selectedContactId}
        />
      case 'memory':
        return <MemoryView appMenuItems={appMenuItems} trafficLightSpace={isMac} />
      case 'settings':
        return <SettingsView onLogout={logout} onNavigate={handleNavigate} appMenuItems={appMenuItems} trafficLightSpace={isMac} />
      default:
        return <ChatLayout
          appMenuItems={appMenuItems}
          trafficLightSpace={isMac}
          onNavigateToContact={(participantId) => {
            console.log('[App] Navigate to contact:', participantId)
            setSelectedContactId(participantId)
            setActiveTab('contacts')
          }}
          ttsWorkerUrl={ttsWorkerUrl}
          onShareGlue={handleShareGlue}
          onShareMolt={handleShareMolt}
        />
    }
  }

  return (
    <NavigateHomeProvider onNavigateHome={() => setActiveTab('chats')}>
    <BridgeProvider bridge={lamaBridge}>
      {/* Sync unread counts to Electron dock badge */}
      <ElectronAlertBridge />
      <div className="flex flex-col h-screen bg-background text-foreground">
    {/* Main Content Area - add bottom padding on mobile for bottom nav */}
    <div className={`flex-1 min-h-0 min-w-0 overflow-hidden ${isMobile ? 'pb-14' : ''}`}>
      {renderContentWithMenu()}
    </div>

    {/* Status Bar - hidden on mobile, shown on desktop */}
    <div className="shrink-0 hidden md:block" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <StatusBar
        version="v1.0.0"
        mcpStatus={{
          running: mcpApiStatus.running,
          toolCount: mcpApiStatus.requestCount,
          onReconnect: handleMcpReconnect,
          reconnecting: mcpReconnecting,
          onToggle: handleMcpToggle,
          toggling: mcpToggling
        }}
        memoryScanStatus={memoryScanStatus}
        responseLength={activeTab === 'chats' ? {
          value: responseLengthPercent,
          onChange: setResponseLengthPercent
        } : undefined}
        proposals={activeTab === 'chats' ? {
          value: proposalSensitivity,
          onChange: setProposalSensitivity
        } : undefined}
        discovery={{
          enabled: discoveryEnabled,
          onChange: handleDiscoveryChange
        }}
        hideOnMobile={true}
      />
    </div>

    {/* Mobile Bottom Navigation - shown only on mobile, with unread badges */}
    <AlertBadgedNav
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  </div>
    </BridgeProvider>
    </NavigateHomeProvider>
  )
}

// Singleton storage instance - created once
const settingsStorage = new IPCSettingsStorage()

function App() {
  const { isInitialized, isAuthenticated, isLoading, login, error, initProgress } = useLamaInit()

  // Show loading screen while initializing
  if (isLoading && !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <img src="./assets/icons/lama_f_w.svg" alt="LAMA" className="h-24 mx-auto mb-6" />
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Initializing Desktop</h2>
          {initProgress ? (
            <>
              <div className="mt-4 mb-2">
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${initProgress.percent}%` }}
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                {initProgress.message} ({initProgress.percent}%)
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Setting up encryption and local storage...</p>
          )}
          {error && (
            <div className="mt-4 text-red-500">
              Error: {error.message}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show login screen - NO providers, NO IPC calls
  if (!isAuthenticated) {
    return <LoginDeploy
      onLogin={login}
      logo={
        <img src="./assets/icons/lama_f_w.svg" alt="LAMA" className="h-16" />
      }
      testOllamaConnection={async (baseUrl: string) => {
        const llmConfig = createLLMConfigOperations()
        return await llmConfig.testConnection({ baseUrl })
      }}
    />
  }

  // Authenticated - NOW render providers and app
  return (
    <ElectronPlansProvider>
      <SettingsProvider storage={settingsStorage}>
        <AppContent />
      </SettingsProvider>
    </ElectronPlansProvider>
  )
}

export default App