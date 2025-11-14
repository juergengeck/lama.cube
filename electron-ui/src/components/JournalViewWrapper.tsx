/**
 * JournalView Wrapper for Electron
 *
 * Provides a journal plan adapter that uses IPC to communicate with
 * the Node.js process where the actual JournalPlan lives.
 */

import { JournalView } from '@lama/ui'
import type { JournalEntry } from '@lama/core/plans/JournalPlan.js'

/**
 * IPC-based journal plan adapter
 */
const journalPlanAdapter = {
  async getAllEntries(params: {
    conversationId?: string
    type?: string[]
    limit?: number
  }): Promise<JournalEntry[]> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    return await window.electronAPI.invoke('journal:getAllEntries', params)
  }
}

/**
 * Electron-specific JournalView wrapper
 */
export function JournalViewWrapper() {
  return (
    <JournalView
      journal={journalPlanAdapter}
      onSelectEntry={(entry) => {
        console.log('[JournalViewWrapper] Selected entry:', entry)
        // TODO: Navigate to entry details
      }}
      onViewChainOfTrust={(entry) => {
        console.log('[JournalViewWrapper] View Chain of Trust:', entry)
        // TODO: Open Chain of Trust view
      }}
      onViewAssembly={(entry) => {
        console.log('[JournalViewWrapper] View Assembly:', entry)
        // TODO: Open Assembly view
      }}
    />
  )
}
