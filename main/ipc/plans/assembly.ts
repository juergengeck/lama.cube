/**
 * Assembly Management IPC Handlers
 *
 * Provides IPC interface for Assembly operations:
 * - Get active supplies
 * - Create demands
 * - Match demands to supplies
 * - Manage trust levels
 * - Query assemblies
 */

import electron from 'electron'
const { ipcMain } = electron
import assemblyManagerSingleton from '../../services/assembly-manager-singleton.js'
import type { IpcMainInvokeEvent } from 'electron'
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks'
import type { TrustLevel } from '@refinio/one.knowledge'

/**
 * Register assembly IPC handlers
 */
export function registerAssemblyPlans() {
  // Get all assemblies
  ipcMain.handle('assembly:list', async (): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()
      const assemblies = manager.getAssemblies()

      return {
        success: true,
        assemblies: assemblies.map(a => ({
          id: a.assemblyId,
          created: a.createdAt,
          subjects: a.currentState.subjectIds?.length || 0,
          keywords: a.currentState.keywordIds?.length || 0,
          complexity: a.totalComplexity,
          supplyId: a.supplyId
        }))
      }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error listing assemblies:', error)
      return { success: false, error: error.message }
    }
  })

  // Get specific assembly by ID
  ipcMain.handle('assembly:get', async (event: IpcMainInvokeEvent, assemblyId: string): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()
      const assembly = manager.getAssembly(assemblyId)

      if (!assembly) {
        return { success: false, error: 'Assembly not found' }
      }

      return { success: true, assembly }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error getting assembly:', error)
      return { success: false, error: error.message }
    }
  })

  // Get all active supplies
  ipcMain.handle('assembly:supplies:list', async (): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()
      const supplies = manager.getActiveSupplies()

      return { success: true, supplies }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error listing supplies:', error)
      return { success: false, error: error.message }
    }
  })

  // Get supplies accessible by a specific identity
  ipcMain.handle('assembly:supplies:for-identity', async (
    event: IpcMainInvokeEvent,
    identityId: string
  ): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()
      const supplies = manager.getSuppliesForIdentity(identityId as SHA256IdHash<any>)

      return { success: true, supplies }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error getting supplies for identity:', error)
      return { success: false, error: error.message }
    }
  })

  // Create a new demand
  ipcMain.handle('assembly:demand:create', async (
    event: IpcMainInvokeEvent,
    params: {
      keywords: string[]  // Keyword hashes
      subjects?: string[]  // Subject hashes
      domain?: string
      query?: string
      trustRequired?: TrustLevel
      urgency?: 'low' | 'medium' | 'high' | 'critical'
    }
  ): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()

      const demand = await manager.createDemand(
        params.keywords as SHA256IdHash<any>[],
        {
          subjects: params.subjects as SHA256IdHash<any>[] | undefined,
          domain: params.domain,
          query: params.query,
          trustRequired: params.trustRequired,
          urgency: params.urgency
        }
      )

      return { success: true, demand }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error creating demand:', error)
      return { success: false, error: error.message }
    }
  })

  // Set trust level for an identity
  ipcMain.handle('assembly:trust:set', async (
    event: IpcMainInvokeEvent,
    identityId: string,
    trustLevel: TrustLevel
  ): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()
      manager.setTrustLevel(identityId as SHA256IdHash<any>, trustLevel)

      return { success: true }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error setting trust level:', error)
      return { success: false, error: error.message }
    }
  })

  // Get trust level for an identity
  ipcMain.handle('assembly:trust:get', async (
    event: IpcMainInvokeEvent,
    identityId: string
  ): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()
      const trustLevel = manager.getTrustLevel(identityId as SHA256IdHash<any>)

      return { success: true, trustLevel }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error getting trust level:', error)
      return { success: false, error: error.message }
    }
  })

  // Get all trust levels
  ipcMain.handle('assembly:trust:list', async (): Promise<any> => {
    try {
      if (!assemblyManagerSingleton.isInitialized()) {
        return { success: false, error: 'AssemblyManager not initialized' }
      }

      const manager = assemblyManagerSingleton.getHandler()

      // Get all assemblies and extract trust info
      const supplies = manager.getActiveSupplies()
      const trustLevels: Record<string, TrustLevel> = {}

      supplies.forEach(supply => {
        trustLevels[supply.ownerId] = supply.trustLevel
      })

      return { success: true, trustLevels }
    } catch (error: any) {
      console.error('[AssemblyIPC] Error listing trust levels:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('[AssemblyIPC] Assembly plans registered')
}
