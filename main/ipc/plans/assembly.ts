/**
 * Assembly Management IPC Handlers
 *
 * Provides IPC interface for Assembly operations using assembly.core's AssemblyPlan.
 *
 * Current capabilities:
 * - Get assembly by ID
 * - Create chat assemblies (via assemblyManagerSingleton)
 *
 * Note: Supply/Demand matching and trust level management are not yet implemented
 * in AssemblyPlan. Those handlers have been removed pending implementation.
 */

import electron from 'electron'
const { ipcMain } = electron
import assemblyManagerSingleton from '../../services/assembly-manager-singleton.js'
import type { IpcMainInvokeEvent } from 'electron'
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks'
import type { Assembly } from '@assembly/core'

/**
 * Register assembly IPC handlers
 */
export function registerAssemblyPlans() {
  // Get specific assembly by ID
  ipcMain.handle('assembly:get', async (
    _event: IpcMainInvokeEvent,
    assemblyId: string
  ): Promise<{ success: boolean; assembly?: Assembly; error?: string }> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const handler = assemblyManagerSingleton.getHandler()
      if (!handler) {
        return { success: false, error: 'AssemblyPlan handler not available' }
      }

      const assembly = await handler.getAssembly(assemblyId as SHA256IdHash<Assembly>)

      if (!assembly) {
        return { success: false, error: 'Assembly not found' }
      }

      return { success: true, assembly }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error getting assembly:', error)
      return { success: false, error: error.message }
    }
  })

  // Create a chat assembly
  ipcMain.handle('assembly:chat:create', async (
    _event: IpcMainInvokeEvent,
    params: { topicId: string; topicName: string }
  ): Promise<{ success: boolean; assemblyId?: string; error?: string }> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const assemblyId = await assemblyManagerSingleton.createChatAssembly(
        params.topicId as SHA256IdHash<any>,
        params.topicName
      )

      if (!assemblyId) {
        return { success: false, error: 'Failed to create chat assembly' }
      }

      return { success: true, assemblyId }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error creating chat assembly:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('[AssemblyIPC] Assembly plans registered')
}
