/**
 * ElectronAlertBridge
 *
 * Invisible component that syncs unread counts from useAlerts to the Electron dock badge.
 * Renders nothing visible - just manages the bridge between React state and Electron API.
 *
 * Usage:
 * ```tsx
 * <ElectronAlertBridge />
 * ```
 *
 * This component should be placed inside BridgeProvider and PlansProvider context.
 */

import { useEffect } from 'react'
import { useAlerts } from '@lama/ui'

// Use the existing electronAPI type, just extend with badge methods if not present

export function ElectronAlertBridge() {
  const { totalUnread } = useAlerts()

  // Sync total unread count to dock badge
  useEffect(() => {
    const updateBadge = async () => {
      const api = window.electronAPI
      if (!api) return

      try {
        // Use invoke to update dock badge
        await api.invoke('alerts:updateDockBadge', { count: totalUnread })
      } catch (error) {
        console.error('[ElectronAlertBridge] Failed to update dock badge:', error)
      }
    }

    updateBadge()
  }, [totalUnread])

  // Clear badge on unmount
  useEffect(() => {
    return () => {
      const api = window.electronAPI
      if (!api) return

      try {
        api.invoke('alerts:clearDockBadge')
      } catch (error) {
        // Ignore errors on cleanup
      }
    }
  }, [])

  // Render nothing - this is just a bridge component
  return null
}
