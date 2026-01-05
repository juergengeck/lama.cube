/**
 * JournalView Wrapper for Electron
 *
 * Provides a journal adapter that uses IPC to communicate with
 * the Node.js process where the actual JournalPlan lives.
 *
 * NEW: Uses Assembly-based queries (Task 7: Journal-Assembly Integration)
 */

import { AssemblyJournalView, type EntityType } from '@lama/ui'
import type { AssemblyQueryOptions, AssemblyWithStory } from '@assembly/core'

interface JournalViewWrapperProps {
  /** Callback to set toolbar controls in App title bar */
  onSetToolbarControls?: (controls: React.ReactNode) => void
  /** App menu items for navigation */
  appMenuItems?: Array<{
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }>
  /** Add space for macOS traffic lights */
  trafficLightSpace?: boolean
  /** Navigate to an entity (contact, chat, etc.) */
  onNavigateToEntity?: (entityId: string, entityType: EntityType, item: AssemblyWithStory) => void
  /** Resolve entity ID to display name */
  resolveEntityName?: (entityId: string, entityType: EntityType) => string | undefined
}

/**
 * Query Assemblies via IPC (NEW - uses assembly.core JournalPlan)
 */
async function queryAssemblies(options: AssemblyQueryOptions): Promise<AssemblyWithStory[]> {
  if (!window.electronAPI) {
    throw new Error('Electron API not available')
  }

  const response = await window.electronAPI.invoke('journal:queryAssemblies', options)

  if (!response.success) {
    console.error('[JournalViewWrapper] Query failed:', response.error)
    return []
  }

  return response.data || []
}

/**
 * Electron-specific JournalView wrapper (NEW - Assembly-based)
 */
export function JournalViewWrapper({
  onSetToolbarControls,
  appMenuItems = [],
  trafficLightSpace = false,
  onNavigateToEntity,
  resolveEntityName
}: JournalViewWrapperProps) {
  return (
    <AssemblyJournalView
      queryAssemblies={queryAssemblies}
      onSetToolbarControls={onSetToolbarControls}
      appMenuItems={appMenuItems}
      trafficLightSpace={trafficLightSpace}
      onSelectEntry={(item) => {
        console.log('[JournalViewWrapper] Selected assembly:', item)
        // TODO: Navigate to entry details
      }}
      onViewChainOfTrust={(item) => {
        console.log('[JournalViewWrapper] View Chain of Trust:', item)
        // TODO: Open Chain of Trust view
      }}
      onViewAssembly={(item) => {
        console.log('[JournalViewWrapper] View Assembly:', item)
        // TODO: Open Assembly view
      }}
      onNavigateToEntity={onNavigateToEntity}
      resolveEntityName={resolveEntityName}
    />
  )
}
