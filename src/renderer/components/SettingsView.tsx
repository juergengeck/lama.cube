/**
 * SettingsView - Wrapper for lama.ui SettingsPage
 *
 * All settings UI is now consolidated in lama.ui.
 * This component provides platform-specific props.
 */
import { SettingsPage, SettingsSection, DevicesView } from '@refinio/lama.ui'
import { createElectronDeviceAdapter } from '@/adapters/device-adapter'
import { Monitor, Youtube } from 'lucide-react'
import { YouTubeView } from '@refinio/lama.youtube/ui'

const deviceAdapter = createElectronDeviceAdapter()

interface SettingsViewProps {
  onLogout?: () => void
  onNavigate?: (tab: string, conversationId?: string, section?: string) => void
  /** App menu items for navigation */
  appMenuItems?: Array<{
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }>
  /** Add space for macOS traffic lights */
  trafficLightSpace?: boolean
}

export function SettingsView({ onLogout, onNavigate, appMenuItems, trafficLightSpace }: SettingsViewProps) {
  const handleNavigateToSettings = (instanceId: string) => {
    onNavigate?.('settings', undefined, `instance-${instanceId}`)
  }

  const devicesContent = (
    <SettingsSection
      id="devices"
      title="Devices"
      description="Manage connected devices and pairing"
      icon={<Monitor className="h-4 w-4" />}
    >
      <DevicesView adapter={deviceAdapter} onNavigateToSettings={handleNavigateToSettings} embedded />
    </SettingsSection>
  )

  const youtubeContent = (
    <SettingsSection
      id="youtube"
      title="YouTube"
      description="Import and manage YouTube content"
      icon={<Youtube className="h-4 w-4" />}
    >
      <YouTubeView />
    </SettingsSection>
  )

  return (
    <SettingsPage
      onLogout={onLogout}
      onNavigate={onNavigate}
      trafficLightSpace={trafficLightSpace}
      menuItems={appMenuItems}
      devicesContent={devicesContent}
      youtubeContent={youtubeContent}
    />
  )
}

export default SettingsView
