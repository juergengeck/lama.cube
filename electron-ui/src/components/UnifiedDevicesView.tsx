/**
 * UnifiedDevicesView - Consolidated view of all devices and endpoints
 *
 * Shows:
 * 1. Local Instances (Browser UI + Node.js Hub)
 * 2. My Devices (IoM - Internet of Me)
 * 3. Contacts (IoP - Internet of People)
 * 4. Discovered Devices (QuicVC UDP/BTLE - not yet paired)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Monitor,
  Smartphone,
  Tablet,
  HardDrive,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Copy,
  User,
  Wifi,
  RefreshCw,
  Settings2,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ============================================================================
// Types
// ============================================================================

type TrustLevel = 'me' | 'trusted' | 'low' | 'unknown'

interface Instance {
  id: string
  personId: string
  name: string
  platform: 'browser' | 'nodejs' | 'mobile' | 'desktop' | 'unknown'
  role: 'hub' | 'client' | 'peer'
  isLocal: boolean
  isConnected: boolean
  trusted: boolean
  trustLevel?: TrustLevel
  lastSeen: Date
  capabilities?: {
    network?: boolean
    storage?: boolean
    llm?: boolean
  }
  connectionInfo?: {
    endpoint?: string
    protocol?: string
    latency?: number
  }
}

interface QuicVCDevice {
  id: string
  name: string
  type: string
  address: string
  capabilities: string[]
  discoveredAt: string
  lastSeen: string
  credentialStatus?: string
  rssi?: number
  discoveryMethod?: 'udp' | 'btle'
}

// ============================================================================
// Main Component
// ============================================================================

export interface UnifiedDevicesViewProps {
  onNavigateToSettings?: (instanceId: string) => void
}

export function UnifiedDevicesView({ onNavigateToSettings }: UnifiedDevicesViewProps = {}) {
  // State for instances
  const [browserInstance, setBrowserInstance] = useState<Instance | null>(null)
  const [nodeInstance, setNodeInstance] = useState<Instance | null>(null)
  const [myDevices, setMyDevices] = useState<Instance[]>([])
  const [contacts, setContacts] = useState<Instance[]>([])
  const [nodeReady, setNodeReady] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [trustLevels, setTrustLevels] = useState<Map<string, TrustLevel>>(new Map())

  // State for discovered devices
  const [quicvcDevices, setQuicvcDevices] = useState<QuicVCDevice[]>([])
  const [scanning, setScanning] = useState(false)

  const [loading, setLoading] = useState(true)

  // ============================================================================
  // Load Instances
  // ============================================================================

  useEffect(() => {
    loadInstances()
    loadQuicVCDevices()

    // Poll for updates
    const instanceInterval = setInterval(loadInstances, 10000) // Every 10s
    const quicvcInterval = setInterval(loadQuicVCDevices, 5000) // Every 5s

    // Real-time QuicVC event listeners
    const handlePeerDiscovered = (peer: QuicVCDevice) => {
      setQuicvcDevices(prev => {
        const existing = prev.find(d => d.id === peer.id)
        if (existing) {
          return prev.map(d => d.id === peer.id ? peer : d)
        }
        return [...prev, peer]
      })
    }

    const handlePeerLost = (peer: { id: string }) => {
      setQuicvcDevices(prev => prev.filter(d => d.id !== peer.id))
    }

    if (window.electronAPI) {
      window.electronAPI.on('quicvc:peerDiscovered', handlePeerDiscovered)
      window.electronAPI.on('quicvc:peerLost', handlePeerLost)
    }

    return () => {
      clearInterval(instanceInterval)
      clearInterval(quicvcInterval)
      if (window.electronAPI) {
        window.electronAPI.off('quicvc:peerDiscovered', handlePeerDiscovered)
        window.electronAPI.off('quicvc:peerLost', handlePeerLost)
      }
    }
  }, [])

  const loadInstances = async () => {
    try {
      // Browser instance (renderer UI) - always "me" trust level
      const browserInfo = {
        id: 'browser-renderer',
        personId: 'renderer-ui',
        name: 'Browser UI',
        platform: 'browser' as const,
        role: 'client' as const,
        isLocal: true,
        isConnected: true,
        trusted: true,
        trustLevel: 'me' as TrustLevel,
        lastSeen: new Date(),
        capabilities: {
          network: false,
          storage: false,
          llm: false
        }
      }
      setBrowserInstance(browserInfo)

      // Node.js instance (main process) - always "me" trust level
      const nodeInfo = await window.lamaBridge.getInstanceInfo()
      if (nodeInfo.success && nodeInfo.instance) {
        setNodeInstance({
          id: nodeInfo.instance.id,
          personId: nodeInfo.instance.id,
          name: nodeInfo.instance.name || 'Node.js Hub',
          platform: 'nodejs' as const,
          role: 'hub' as const,
          isLocal: true,
          isConnected: nodeInfo.instance.initialized || false,
          trusted: true,
          trustLevel: 'me' as TrustLevel,
          lastSeen: new Date(),
          capabilities: nodeInfo.instance.capabilities || {
            network: true,
            storage: true,
            llm: true
          }
        })
      }

      // Load trust levels from storage
      await loadTrustLevels()

      // Get contacts from Node.js via IPC
      try {
        const chumContacts: Instance[] = []
        const contactsResult = await window.electronAPI?.invoke('contacts:list')

        if (contactsResult?.success && contactsResult.contacts) {
          for (const contact of contactsResult.contacts) {
            const instanceId = `contact-${contact.personId}`
            const trustLevel = trustLevels.get(instanceId) || 'unknown'

            chumContacts.push({
              id: instanceId,
              personId: contact.personId,
              name: contact.name || `Contact ${contact.personId.substring(0, 8)}`,
              platform: 'unknown' as const,
              role: 'peer' as const,
              isLocal: false,
              isConnected: true,
              trusted: trustLevel === 'me' || trustLevel === 'trusted',
              trustLevel,
              lastSeen: new Date(),
              capabilities: {}
            })
          }
        }
        setContacts(chumContacts)
      } catch (error) {
        console.error('[UnifiedDevicesView] Error getting contacts:', error)
      }

      // TODO: Get actual IoM devices from connections model
      // IoM devices should have "me" trust level by default
      setMyDevices([])

      // Check Node readiness for invitations
      await checkNodeReadiness()
    } catch (error) {
      console.error('[UnifiedDevicesView] Error loading instances:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTrustLevels = async () => {
    try {
      if (!window.electronAPI) return

      const result = await window.electronAPI.invoke('devices:getTrustLevels')
      if (result?.success && result.trustLevels) {
        setTrustLevels(new Map(Object.entries(result.trustLevels)))
      }
    } catch (error) {
      console.error('[UnifiedDevicesView] Error loading trust levels:', error)
    }
  }

  const checkNodeReadiness = async () => {
    if (!window.electronAPI) {
      setNodeReady(false)
      return
    }

    try {
      const result = await window.electronAPI.invoke('devices:getInstanceInfo')
      if (result?.success && result.nodeInitialized && result.hasPairing) {
        setNodeReady(true)
      } else {
        setNodeReady(false)
      }
    } catch (error) {
      setNodeReady(false)
    }
  }

  // ============================================================================
  // Load QuicVC Devices
  // ============================================================================

  const loadQuicVCDevices = async () => {
    try {
      if (!window.electronAPI) return
      const result = await window.electronAPI.invoke('quicvc:getDiscoveredDevices')
      if (result.success && result.devices) {
        setQuicvcDevices(result.devices)
      }
    } catch (error) {
      console.error('[UnifiedDevicesView] Failed to load QuicVC devices:', error)
    }
  }

  const handleQuicVCScan = async () => {
    setScanning(true)
    try {
      if (!window.electronAPI) return
      const result = await window.electronAPI.invoke('quicvc:scan', 3000)
      if (result.success && result.devices) {
        setQuicvcDevices(result.devices)
      }
    } catch (error) {
      console.error('[UnifiedDevicesView] Failed to scan:', error)
    } finally {
      setScanning(false)
    }
  }

  // ============================================================================
  // Actions
  // ============================================================================

  const handleCreateInvitation = async () => {
    try {
      const result = await window.electronAPI?.invoke('invitation:create')
      if (result?.success && result.invitation) {
        await navigator.clipboard.writeText(result.invitation.url)
        setCopiedInvite(true)
        setTimeout(() => setCopiedInvite(false), 3000)
      } else {
        alert('Failed to create invitation: ' + (result?.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('[UnifiedDevicesView] Error creating invitation:', error)
      alert('Error creating invitation: ' + error.message)
    }
  }

  const handleSetTrustLevel = async (instanceId: string, trustLevel: TrustLevel) => {
    try {
      if (!window.electronAPI) return

      const result = await window.electronAPI.invoke('devices:setTrustLevel', {
        instanceId,
        trustLevel
      })

      if (result?.success) {
        // Update local state
        setTrustLevels(prev => new Map(prev).set(instanceId, trustLevel))

        // Reload instances to reflect new trust level
        await loadInstances()
      } else {
        alert('Failed to set trust level: ' + (result?.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('[UnifiedDevicesView] Error setting trust level:', error)
      alert('Error setting trust level: ' + error.message)
    }
  }

  const handleViewDeviceSettings = (instanceId: string) => {
    if (onNavigateToSettings) {
      onNavigateToSettings(instanceId)
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'browser': return <Monitor className="h-4 w-4" />
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'desktop': return <Monitor className="h-4 w-4" />
      case 'nodejs': return <HardDrive className="h-4 w-4" />
      case 'tablet': return <Tablet className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case 'hub': return 'default'
      case 'client': return 'secondary'
      default: return 'outline'
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTrustLevelBadge = (trustLevel?: TrustLevel) => {
    if (!trustLevel) return null

    switch (trustLevel) {
      case 'me':
        return (
          <Badge className="gap-1 bg-blue-900 hover:bg-blue-900/80 text-white border-blue-900">
            <ShieldCheck className="h-3 w-3" />
            Me
          </Badge>
        )
      case 'trusted':
        return (
          <Badge className="gap-1 bg-blue-500 hover:bg-blue-500/80 text-white border-blue-500">
            <Shield className="h-3 w-3" />
            Trusted
          </Badge>
        )
      case 'low':
        return (
          <Badge className="gap-1 bg-magenta-500 hover:bg-magenta-500/80 text-white border-magenta-500">
            <Shield className="h-3 w-3" />
            Low Trust
          </Badge>
        )
      case 'unknown':
        return (
          <Badge variant="outline" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            Unknown
          </Badge>
        )
      default:
        return null
    }
  }

  const renderDeviceMenu = (device: Instance) => {
    // Local instances can't have trust level changed
    if (device.isLocal) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Local Instance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleViewDeviceSettings(device.id)}>
              <Settings2 className="h-4 w-4 mr-2" />
              View Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    // Remote instances have trust level options
    const currentTrustLevel = device.trustLevel || 'untrusted'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Device Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleViewDeviceSettings(device.id)}>
            <Settings2 className="h-4 w-4 mr-2" />
            View Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Trust Level</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleSetTrustLevel(device.id, 'me')}
            disabled={currentTrustLevel === 'me'}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-900" />
              Me (Share Settings)
            </div>
            {currentTrustLevel === 'me' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSetTrustLevel(device.id, 'trusted')}
            disabled={currentTrustLevel === 'trusted'}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Trusted
            </div>
            {currentTrustLevel === 'trusted' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSetTrustLevel(device.id, 'low')}
            disabled={currentTrustLevel === 'low'}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-magenta-500" />
              Low Trust
            </div>
            {currentTrustLevel === 'low' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSetTrustLevel(device.id, 'unknown')}
            disabled={currentTrustLevel === 'unknown'}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-300" />
              Unknown
            </div>
            {currentTrustLevel === 'unknown' && ' ✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading devices...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          {/* ================================================ */}
          {/* Local Instances */}
          {/* ================================================ */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
              Local Instances
            </h3>
            <Card>
              <CardContent className="p-0">
                {/* Browser Instance */}
                {browserInstance && (
                  <div className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleViewDeviceSettings(browserInstance.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          {getPlatformIcon(browserInstance.platform)}
                        </div>
                        <div>
                          <div className="font-medium">{browserInstance.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Renderer Process (UI Only)
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getRoleBadgeVariant(browserInstance.role)}>
                              {browserInstance.role}
                            </Badge>
                            <Badge variant="outline">
                              {browserInstance.platform}
                            </Badge>
                            {getTrustLevelBadge(browserInstance.trustLevel)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div onClick={(e) => e.stopPropagation()}>
                          {renderDeviceMenu(browserInstance)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Node.js Instance */}
                {nodeInstance && (
                  <div className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleViewDeviceSettings(nodeInstance.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getPlatformIcon(nodeInstance.platform)}
                        </div>
                        <div>
                          <div className="font-medium">{nodeInstance.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Main Process - {nodeInstance.id?.substring(0, 12)}...
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getRoleBadgeVariant(nodeInstance.role)}>
                              {nodeInstance.role}
                            </Badge>
                            <Badge variant="outline">
                              {nodeInstance.platform}
                            </Badge>
                            {getTrustLevelBadge(nodeInstance.trustLevel)}
                            {nodeInstance.capabilities?.network && (
                              <Badge variant="secondary">Network</Badge>
                            )}
                            {nodeInstance.capabilities?.storage && (
                              <Badge variant="secondary">Storage</Badge>
                            )}
                            {nodeInstance.capabilities?.llm && (
                              <Badge variant="secondary">LLM</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {nodeInstance.isConnected ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <div onClick={(e) => e.stopPropagation()}>
                          {renderDeviceMenu(nodeInstance)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ================================================ */}
          {/* My Devices (IoM) */}
          {/* ================================================ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                My Devices ({myDevices.length})
              </h3>
              <Button
                size="sm"
                onClick={handleCreateInvitation}
                className="gap-2"
              >
                <Plus className="h-3 w-3" />
                Add Device
              </Button>
            </div>

            {myDevices.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No additional devices. Add your phone, tablet, or other devices to your Internet of Me.
                </AlertDescription>
              </Alert>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {myDevices.map((device, index) => (
                    <div key={device.id}>
                      <div className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleViewDeviceSettings(device.id)}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${
                              device.isConnected ? 'bg-green-500/10' : 'bg-gray-500/10'
                            }`}>
                              {getPlatformIcon(device.platform)}
                            </div>
                            <div>
                              <div className="font-medium">{device.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {device.personId ? `${device.personId.substring(0, 12)}...` : 'No ID'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Last seen: {formatDate(device.lastSeen)}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{device.platform}</Badge>
                                {getTrustLevelBadge(device.trustLevel)}
                                {device.isConnected && (
                                  <Badge variant="default">Connected</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {device.isConnected ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <div onClick={(e) => e.stopPropagation()}>
                              {renderDeviceMenu(device)}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < myDevices.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ================================================ */}
          {/* Contacts (IoP) */}
          {/* ================================================ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Contacts ({contacts.length})
              </h3>
              {nodeReady && (
                <Button
                  size="sm"
                  onClick={handleCreateInvitation}
                  className="gap-2"
                >
                  {copiedInvite ? (
                    <>
                      <Copy className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      Add Contact
                    </>
                  )}
                </Button>
              )}
            </div>

            {contacts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No contacts yet. Share your invitation link to connect with other users.
                </AlertDescription>
              </Alert>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {contacts.map((contact, index) => (
                    <div key={contact.id}>
                      <div className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleViewDeviceSettings(contact.id)}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${
                              contact.isConnected ? 'bg-blue-500/10' : 'bg-gray-500/10'
                            }`}>
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {contact.personId ? `${contact.personId.substring(0, 12)}...` : 'No ID'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Last seen: {formatDate(contact.lastSeen)}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {getTrustLevelBadge(contact.trustLevel)}
                                {contact.isConnected && (
                                  <Badge variant="default">Connected</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {contact.isConnected ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <div onClick={(e) => e.stopPropagation()}>
                              {renderDeviceMenu(contact)}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < contacts.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ================================================ */}
          {/* Discovered Devices (QuicVC) */}
          {/* ================================================ */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Network Discovery</CardTitle>
                    <CardDescription>
                      Devices discovered via UDP and BTLE (not yet paired)
                    </CardDescription>
                  </div>
                  <Button onClick={handleQuicVCScan} disabled={scanning}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? 'Scanning...' : 'Scan'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  {quicvcDevices.length} device(s) discovered
                </div>

                {quicvcDevices.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No devices discovered. Click "Scan" to search for devices on your network.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {quicvcDevices.map(device => (
                      <Card key={device.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Wifi className="h-6 w-6 text-green-500" />
                              <div>
                                <div className="font-medium">{device.name}</div>
                                <div className="text-xs text-muted-foreground">{device.address}</div>
                              </div>
                            </div>
                            <Badge variant="default">{device.type}</Badge>
                          </div>

                          {/* Device Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Device ID</span>
                              <p className="font-mono text-xs truncate">{device.id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Discovery Method</span>
                              <p className="font-medium uppercase">{device.discoveryMethod || 'UDP'}</p>
                            </div>
                          </div>

                          {/* Capabilities */}
                          <div className="mb-3">
                            <span className="text-sm text-muted-foreground">Capabilities</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {device.capabilities.map((cap, idx) => (
                                <Badge key={idx} variant="outline">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Timestamps */}
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Discovered</span>
                              <p className="font-medium">{formatDate(device.discoveredAt)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Seen</span>
                              <p className="font-medium">{formatDate(device.lastSeen)}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-2 pt-2">
                            <Button size="sm" variant="default">
                              <Wifi className="h-4 w-4 mr-2" />
                              Pair Device
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings2 className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
