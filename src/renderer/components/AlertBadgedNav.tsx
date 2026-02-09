/**
 * AlertBadgedNav
 *
 * Wrapper component that adds unread badges to the mobile bottom navigation.
 * Uses useAlerts to get badge counts and passes them to MobileBottomNav.
 */

import type { LucideIcon } from 'lucide-react'
import { MobileBottomNav, useAlerts } from '@lama/ui'

interface NavTab {
  id: string
  label: string | null
  icon: LucideIcon
  badge?: number | string
}

interface AlertBadgedNavProps {
  tabs: NavTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function AlertBadgedNav({ tabs, activeTab, onTabChange }: AlertBadgedNavProps) {
  const { counts, markSectionViewed } = useAlerts()

  // Add badge counts to tabs
  const tabsWithBadges = tabs.map(tab => {
    let badge: number | undefined

    switch (tab.id) {
      case 'chats':
        badge = counts.chats.total > 0 ? counts.chats.total : undefined
        break
      case 'contacts':
        badge = counts.contacts.total > 0 ? counts.contacts.total : undefined
        break
      case 'memory':
        badge = counts.memory.total > 0 ? counts.memory.total : undefined
        break
      case 'journal':
        badge = counts.journal.total > 0 ? counts.journal.total : undefined
        break
    }

    return {
      ...tab,
      badge
    }
  })

  // Handle tab change - mark section as viewed
  const handleTabChange = (tabId: string) => {
    // Mark the section as viewed to clear new item indicators
    if (['contacts', 'memory', 'journal'].includes(tabId)) {
      markSectionViewed(tabId as 'contacts' | 'memory' | 'journal')
    }
    // Chats are marked read individually when conversation is selected
    onTabChange(tabId)
  }

  return (
    <MobileBottomNav
      tabs={tabsWithBadges}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  )
}
