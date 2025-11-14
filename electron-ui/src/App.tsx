import { useState, useEffect } from 'react'
import { Button, ModelOnboarding } from '@lama/ui'
// import { ScrollArea } from '@lama/ui'
import { ChatLayout } from '@/components/ChatLayout'
import { ContactsView } from '@/components/ContactsView'
import { SettingsView } from '@/components/SettingsView'
import { DataDashboard } from '@/components/DataDashboard'
import { JournalViewWrapper } from '@/components/JournalViewWrapper'
import { UnifiedDevicesView } from '@lama/ui'
import { createElectronDeviceAdapter } from '@/adapters/device-adapter'
import { LoginDeploy } from '@lama/ui'
import { MessageSquare, BookOpen, Users, Settings, Loader2, Smartphone, BarChart3, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useLamaInit } from '@/hooks/useLamaInit'
import { lamaBridge } from '@/bridge/lama-bridge'
import { ipcStorage } from '@/services/ipc-storage'
import { createLLMConfigOperations, createAIOperations, CLOUD_MODEL_OPTIONS } from '@/adapters/llm-operations'

function App() {
  const [activeTab, setActiveTab] = useState('chats')
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined)
  const [hasTopics, setHasTopics] = useState<boolean | null>(null)
  const [hasDefaultModel, setHasDefaultModel] = useState<boolean | null>(null)
  const [mcpApiStatus, setMcpApiStatus] = useState<{ running: boolean; requestCount: number }>({ running: false, requestCount: 0 })
  const [mcpReconnecting, setMcpReconnecting] = useState(false)
  const [memoryScanStatus, setMemoryScanStatus] = useState<{ scanning: boolean; progress?: string }>({ scanning: false })
  const [proposalSensitivity, setProposalSensitivity] = useState<number>(0.9) // 0-1 scale where 0=no proposals, 1=all proposals
  const { isInitialized, isAuthenticated, isLoading, login, logout, error, initProgress } = useLamaInit()
  // NO AppModel in browser - use IPC for everything

  // Update proposal config when sensitivity changes
  // Invert the scale: 0% sensitivity = high threshold (1.0), 100% sensitivity = low threshold (0.0)
  useEffect(() => {
    if (!isAuthenticated) return
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
  }, [proposalSensitivity, isAuthenticated])

  // Check if any topics exist (for onboarding detection)
  useEffect(() => {
    if (isAuthenticated && window.electronAPI) {
      window.electronAPI.invoke('chat:getConversations')
        .then((result: any) => {
          const conversations = result?.conversations || []
          setHasTopics(conversations.length > 0)
        })
        .catch(() => setHasTopics(false))
    }
  }, [isAuthenticated])

  // Check if a default model has been configured
  useEffect(() => {
    if (isAuthenticated && window.electronAPI) {
      console.log('[App] Checking for default model...')
      window.electronAPI.invoke('ai:getDefaultModel')
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
    }
  }, [isAuthenticated])

  // Signal UI is ready when authenticated
  useEffect(() => {
    if (isAuthenticated && window.electronAPI) {
      console.log('[App] Signaling UI ready for IPC messages')
      window.electronAPI.invoke('chat:uiReady').catch(err =>
        console.error('[App] Failed to signal UI ready:', err)
      )
    }
  }, [isAuthenticated])

  // Poll MCP status via IPC
  useEffect(() => {
    const checkMCPStatus = async () => {
      if (!window.electronAPI) return;

      try {
        const response = await window.electronAPI.invoke('mcp:getStatus');
        if (response.success && response.data) {
          setMcpApiStatus({
            running: response.data.running,
            requestCount: response.data.toolCount || 0
          });
        } else {
          setMcpApiStatus({ running: false, requestCount: 0 });
        }
      } catch {
        setMcpApiStatus({ running: false, requestCount: 0 });
      }
    };

    checkMCPStatus(); // Initial check
    const interval = setInterval(checkMCPStatus, 30000); // Poll every 30 seconds (lightweight HTTP check)
    return () => clearInterval(interval);
  }, []);

  // Reconnect MCP servers
  const handleMcpReconnect = async () => {
    if (!window.electronAPI || mcpReconnecting) return;

    setMcpReconnecting(true);
    try {
      const response = await window.electronAPI.invoke('mcp:reconnect');
      if (response.success) {
        console.log('[App] MCP reconnected successfully');
        // Immediately check status after reconnect
        const statusResponse = await window.electronAPI.invoke('mcp:getStatus');
        if (statusResponse.success && statusResponse.data) {
          setMcpApiStatus({
            running: statusResponse.data.running,
            requestCount: statusResponse.data.toolCount || 0
          });
        }
      } else {
        console.error('[App] Failed to reconnect MCP:', response.error);
      }
    } catch (error) {
      console.error('[App] Error reconnecting MCP:', error);
    } finally {
      setMcpReconnecting(false);
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

  // Global listener for new messages - keeps conversation list updated app-wide
  useEffect(() => {
    if (!isAuthenticated) return

    const handleNewMessages = (data: { conversationId: string; messages: any[] }) => {
      console.log('[App] 📬 Global: New messages received for conversation:', data.conversationId)
      // This ensures the lamaBridge event system knows there's at least one listener
      // The actual UI updates happen in ChatLayout or other components
    }

    // Register as a global listener so messages are always acknowledged
    lamaBridge.on('chat:newMessages', handleNewMessages)

    return () => {
      lamaBridge.off('chat:newMessages', handleNewMessages)
    }
  }, [isAuthenticated])
  
  // Listen for navigation from Electron menu
  useEffect(() => {
    const handleNavigate = (_event: any, tab: string) => {
      setActiveTab(tab)
    }
    
    // Check if we're in Electron environment
    if (window.electronAPI && 'on' in window.electronAPI) {
      (window.electronAPI as any).on('navigate', handleNavigate)
      return () => {
        // Only call off if it exists
        if ('off' in window.electronAPI!) {
          (window.electronAPI as any).off('navigate', handleNavigate)
        }
      }
    }
  }, [])
  
  // Show loading screen while initializing
  if (isLoading && !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
            LAMA
          </h1>
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
  
  // Show login/deploy screen if not authenticated
  // Security through obscurity - credentials deploy or access instances
  if (!isAuthenticated) {
    return <LoginDeploy
      onLogin={login}
      logo={
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          LAMA
        </h1>
      }
      testOllamaConnection={async (baseUrl: string) => {
        const llmConfig = createLLMConfigOperations()
        return await llmConfig.testConnection({ baseUrl })
      }}
    />
  }

  // Debug: Log all relevant state
  console.log('[App] Render state:', {
    isAuthenticated,
    hasTopics,
    hasDefaultModel,
    isLoading,
    isInitialized
  })

  // Check if we need to show model onboarding
  // Show onboarding only if no default model has been configured
  const shouldShowOnboarding = hasDefaultModel === false
  console.log('[App] shouldShowOnboarding =', shouldShowOnboarding, '(hasDefaultModel:', hasDefaultModel, ')')

  if (shouldShowOnboarding) {
    console.log('[App] ✅ Showing ModelOnboarding component because hasDefaultModel === false')
    return <ModelOnboarding
      llmConfig={createLLMConfigOperations()}
      aiPlan={createAIOperations()}
      modelOptions={CLOUD_MODEL_OPTIONS}
      allowSkip={true}
      logo={
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          LAMA
        </h1>
      }
      onComplete={async () => {
        // Model has been selected and saved to settings
        console.log('[App] ModelOnboarding completed, setting hasDefaultModel to true')
        setHasDefaultModel(true)
      }}
    />
  }

  // Show loading while checking for default model
  if (hasDefaultModel === null) {
    console.log('[App] ⏳ Still checking for default model (hasDefaultModel === null), showing loading...')
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
            LAMA
          </h1>
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Loading</h2>
          <p className="text-muted-foreground">Checking for existing conversations...</p>
        </div>
      </div>
    )
  }

  console.log('[App] 📱 Showing main app (hasDefaultModel:', hasDefaultModel, ')')

  const tabs = [
    { id: 'chats', label: 'Chats', icon: MessageSquare },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'devices', label: 'Devices', icon: Smartphone },
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

  const renderContent = () => {
    switch (activeTab) {
      case 'chats':
        return <ChatLayout selectedConversationId={selectedConversationId} />
      case 'journal':
        return <JournalViewWrapper />
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
        }} />
      case 'devices':
        return <UnifiedDevicesView
          adapter={createElectronDeviceAdapter()}
          onNavigateToSettings={(instanceId) => {
            handleNavigate('settings', undefined, `instance-${instanceId}`)
          }}
        />
      case 'settings':
        return <SettingsView onLogout={logout} onNavigate={handleNavigate} />
      default:
        return <ChatLayout />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <div className="border-b bg-card" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo and App Name */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              LAMA
            </h1>
            <div className="h-6 w-px bg-border" />
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-between flex-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {/* Left side - main navigation */}
            <div className="flex items-center space-x-2">
              {tabs.filter(tab => tab.id !== 'settings').map((tab) => {
                const Icon = tab.icon
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label && <span>{tab.label}</span>}
                  </Button>
                )
              })}
            </div>

            {/* Right side - settings */}
            <div className="flex items-center space-x-2">
              {tabs.filter(tab => tab.id === 'settings').map((tab) => {
                const Icon = tab.icon
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label && <span>{tab.label}</span>}
                  </Button>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Status Bar */}
      <div className="border-t bg-card px-6 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>LAMA Desktop v1.0.0</span>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              {mcpApiStatus.running ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                  <span>MCP API: Online</span>
                  {mcpApiStatus.requestCount > 0 && (
                    <span className="text-muted-foreground">({mcpApiStatus.requestCount} tools)</span>
                  )}
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>MCP API: Offline</span>
                  <button
                    onClick={handleMcpReconnect}
                    disabled={mcpReconnecting}
                    className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Reconnect MCP servers"
                  >
                    <RefreshCw className={`h-3 w-3 ${mcpReconnecting ? 'animate-spin' : ''}`} />
                    <span>{mcpReconnecting ? 'Reconnecting...' : 'Reconnect'}</span>
                  </button>
                </>
              )}
            </div>
            {memoryScanStatus.scanning && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  <span>{memoryScanStatus.progress || 'Scanning memories...'}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Proposal sensitivity slider */}
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Proposals:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={proposalSensitivity}
                onChange={(e) => setProposalSensitivity(parseFloat(e.target.value))}
                className="w-24 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${proposalSensitivity * 100}%, hsl(var(--muted)) ${proposalSensitivity * 100}%, hsl(var(--muted)) 100%)`
                }}
                title="Adjust proposal sensitivity: 0% = no proposals, 100% = all proposals"
              />
              <span className="font-mono min-w-[3ch]">{(proposalSensitivity * 100).toFixed(0)}%</span>
            </div>
            <span>·</span>
            <span>Identity: {isAuthenticated ? 'Active' : 'None'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App