/**
 * Direct Assembly Creation IPC Handlers
 *
 * Simple IPC handlers for creating Assemblies directly without Demand/Supply matching.
 * Uses assembly.core's direct creation methods.
 */

import electron from 'electron'
const { ipcMain } = electron
import assemblyManagerSingleton from '../../services/assembly-manager-singleton.js'
import type { IpcMainInvokeEvent } from 'electron'
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks'

/**
 * Register direct assembly IPC handlers
 */
export function registerDirectAssemblyPlans() {
  /**
   * Create assembly for a chat topic
   */
  ipcMain.handle(
    'assembly:createChatAssembly',
    async (
      _event: IpcMainInvokeEvent,
      params: { topicId: SHA256IdHash<any>; topicName: string }
    ): Promise<{ success: boolean; assemblyId?: SHA256IdHash<any>; error?: string }> => {
      try {
        if (!assemblyManagerSingleton.isInitialized()) {
          return { success: false, error: 'AssemblyManager not initialized' }
        }

        const assemblyId = await assemblyManagerSingleton.createChatAssembly(
          params.topicId,
          params.topicName
        )

        if (!assemblyId) {
          return { success: false, error: 'Failed to create assembly' }
        }

        return {
          success: true,
          assemblyId
        }
      } catch (error: any) {
        console.error('[DirectAssemblyIPC] Error creating chat assembly:', error)
        return { success: false, error: error.message }
      }
    }
  )

  /**
   * Get assembly handler for advanced operations
   */
  ipcMain.handle(
    'assembly:getHandler',
    async (_event: IpcMainInvokeEvent): Promise<{ success: boolean; hasHandler: boolean }> => {
      try {
        const handler = assemblyManagerSingleton.getHandler()
        return {
          success: true,
          hasHandler: handler !== null
        }
      } catch (error: any) {
        console.error('[DirectAssemblyIPC] Error getting handler:', error)
        return { success: false, hasHandler: false }
      }
    }
  )

  console.log('[DirectAssemblyIPC] Registered direct assembly plans')
}
