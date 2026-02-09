/**
 * LLM Config IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to LLMConfigHandler methods.
 * Business logic lives in ../../../lama.core/handlers/LLMConfigHandler.ts
 */

import { ipcMain } from 'electron';
import {
  LLMConfigPlan,
  type TestConnectionRequest,
  type TestConnectionResponse,
  type SetOllamaConfigRequest,
  type SetOllamaConfigResponse,
  type GetOllamaConfigRequest,
  type GetOllamaConfigResponse,
  type GetAvailableModelsRequest,
  type GetAvailableModelsResponse,
  type DeleteOllamaConfigRequest,
  type DeleteOllamaConfigResponse,
} from '@refinio/lama.core/plans/LLMConfigPlan.js';
import { GlobalLLMSettingsManager, type GlobalLLMSettingsManagerDeps } from '@refinio/lama.core/models/settings/GlobalLLMSettingsManager.js';
import { testOllamaConnection, fetchOllamaModels } from '../../services/ollama-validator.js';
import {
  encryptToken,
  decryptToken,
  computeBaseUrl,
  isEncryptionAvailable,
} from '../../services/ollama-config-manager.js';
import nodeOneCore from '../../core/node-one-core.js';
import { storeVersionedObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';

// Lazy-initialized GlobalLLMSettingsManager (created after nodeOneCore is initialized)
let globalSettingsManager: GlobalLLMSettingsManager | undefined;
let llmConfigEpoch = -1;

/**
 * @deprecated No-op: plan cache invalidates automatically via initEpoch
 */
export function resetLLMConfigSingletons(): void {}

async function getGlobalSettingsManager(): Promise<GlobalLLMSettingsManager | undefined> {
  if (llmConfigEpoch !== nodeOneCore.initEpoch) {
    globalSettingsManager = undefined;
    llmConfigHandler = null;
  }
  if (globalSettingsManager) {
    return globalSettingsManager;
  }

  if (!nodeOneCore.initialized) {
    console.warn('[llm-config] NodeOneCore not initialized, cannot create GlobalLLMSettingsManager');
    return undefined;
  }

  try {
    const myId = await nodeOneCore.leuteModel.myMainIdentity();
    const deps: GlobalLLMSettingsManagerDeps = {
      storeVersionedObject,
      getObjectByIdHash,
      calculateIdHashOfObj
    };
    globalSettingsManager = new GlobalLLMSettingsManager(deps, myId);
    console.log('[llm-config] GlobalLLMSettingsManager initialized');
    return globalSettingsManager;
  } catch (error) {
    console.error('[llm-config] Failed to create GlobalLLMSettingsManager:', error);
    return undefined;
  }
}

// Lazy-initialized handler instance - created after nodeOneCore is initialized
let llmConfigHandler: LLMConfigPlan | null = null;

/**
 * Get LLMConfigPlan instance - creates on first use after NodeOneCore init
 */
function getLlmConfigHandler(): LLMConfigPlan {
  if (!nodeOneCore.initialized) {
    throw new Error('NodeOneCore not initialized');
  }
  if (!llmConfigHandler || llmConfigEpoch !== nodeOneCore.initEpoch) {
    globalSettingsManager = undefined;
    llmConfigHandler = null;
    llmConfigHandler = new LLMConfigPlan(
      nodeOneCore,
      nodeOneCore.aiAssistantModel,
      nodeOneCore.llmManager,
      nodeOneCore.settingsStore,
      {
        testOllamaConnection,
        fetchOllamaModels,
      },
      undefined, // llmRegistry - not used in electron
      undefined  // globalSettingsManager - lazy initialized in handlers
    );
    llmConfigEpoch = nodeOneCore.initEpoch;
  }
  return llmConfigHandler;
}

/**
 * T012: llm:testOllamaConnection
 * Validate connectivity to Ollama server and fetch available models
 * Note: Does NOT require NodeOneCore - just makes HTTP requests to Ollama
 */
export async function handleTestOllamaConnection(
  event: Electron.IpcMainInvokeEvent,
  request: TestConnectionRequest
): Promise<TestConnectionResponse> {
  // Call testOllamaConnection directly - no NodeOneCore needed for connectivity test
  const server = request.server || 'http://localhost:11434';
  return await testOllamaConnection(server, request.authToken);
}

/**
 * T013: llm:setOllamaConfig
 * Save Ollama configuration to ONE.core storage
 */
export async function handleSetOllamaConfig(
  event: Electron.IpcMainInvokeEvent,
  request: SetOllamaConfigRequest
): Promise<SetOllamaConfigResponse> {
  return await getLlmConfigHandler().setConfig(request);
}

/**
 * T014: llm:getOllamaConfig
 * Retrieve current active Ollama configuration
 */
export async function handleGetOllamaConfig(
  event: Electron.IpcMainInvokeEvent,
  request: GetOllamaConfigRequest
): Promise<GetOllamaConfigResponse> {
  return await getLlmConfigHandler().getConfig(request);
}

/**
 * T015: llm:getAvailableModels
 * Fetch models from Ollama server (active config or specified URL)
 */
export async function handleGetAvailableModels(
  event: Electron.IpcMainInvokeEvent,
  request: GetAvailableModelsRequest
): Promise<GetAvailableModelsResponse> {
  return await getLlmConfigHandler().getAvailableModels(request);
}

/**
 * T016: llm:deleteOllamaConfig
 * Soft-delete an Ollama configuration
 */
export async function handleDeleteOllamaConfig(
  event: Electron.IpcMainInvokeEvent,
  request: DeleteOllamaConfigRequest
): Promise<DeleteOllamaConfigResponse> {
  return await getLlmConfigHandler().deleteConfig(request);
}

/**
 * llm:testConnectionAndDiscoverModels
 * Test connection and discover available models
 */
export async function handleTestConnectionAndDiscoverModels(
  event: Electron.IpcMainInvokeEvent,
  request: TestConnectionRequest
): Promise<TestConnectionResponse> {
  return await getLlmConfigHandler().testConnectionAndDiscoverModels(request);
}

/**
 * llmConfig:getOllamaServers
 * Get all configured Ollama servers
 */
export async function handleGetOllamaServers(
  event: Electron.IpcMainInvokeEvent,
  request: {}
): Promise<any> {
  try {
    const manager = await getGlobalSettingsManager();
    if (!manager) {
      // Return default localhost server even when settings not initialized
      console.warn('[llm-config] Settings not initialized, returning default Ollama server');
      return {
        success: true,
        servers: [{
          id: 'local',
          name: 'Local',
          baseUrl: 'http://localhost:11434',
          authType: 'none',
          enabled: true
        }]
      };
    }
    const servers = await manager.getOllamaServers();
    return { success: true, servers };
  } catch (error: any) {
    console.error('[llm-config] getOllamaServers error:', error);
    // Return default server on error so UI still shows something
    return {
      success: true,
      servers: [{
        id: 'local',
        name: 'Local',
        baseUrl: 'http://localhost:11434',
        authType: 'none',
        enabled: true
      }]
    };
  }
}

/**
 * llmConfig:addOllamaServer
 * Add a new Ollama server
 */
export async function handleAddOllamaServer(
  event: Electron.IpcMainInvokeEvent,
  request: { name: string; baseUrl: string; authType?: 'none' | 'bearer'; bearerToken?: string; enabled?: boolean }
): Promise<any> {
  const manager = await getGlobalSettingsManager();
  if (!manager) {
    return { success: false, error: 'Settings not initialized' };
  }
  try {
    const server = await manager.addOllamaServer({
      name: request.name,
      baseUrl: request.baseUrl,
      authType: request.authType || 'none',
      enabled: request.enabled ?? true
    });

    // Store bearer token in settings if provided
    if (request.bearerToken && request.authType === 'bearer') {
      const settingsKey = `ollama.${server.id}.bearerToken`;
      await nodeOneCore.settingsStore?.setValue(settingsKey, request.bearerToken);
    }

    console.log(`[llm-config] Added Ollama server: ${server.name}`);
    return { success: true, server };
  } catch (error: any) {
    console.error('[llm-config] Add Ollama server error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * llmConfig:updateOllamaServer
 * Update an existing Ollama server
 */
export async function handleUpdateOllamaServer(
  event: Electron.IpcMainInvokeEvent,
  request: { id: string; updates: any }
): Promise<any> {
  const manager = await getGlobalSettingsManager();
  if (!manager) {
    return { success: false, error: 'Settings not initialized' };
  }
  try {
    const { bearerToken, ...serverUpdates } = request.updates;
    const result = await manager.updateOllamaServer(request.id, serverUpdates);

    if (!result) {
      return { success: false, error: 'Server not found' };
    }

    // Update bearer token if provided
    if (bearerToken !== undefined) {
      const settingsKey = `ollama.${request.id}.bearerToken`;
      if (bearerToken) {
        await nodeOneCore.settingsStore?.setValue(settingsKey, bearerToken);
      } else {
        try {
          await nodeOneCore.settingsStore?.deleteValue(settingsKey);
        } catch (error: any) {
          if (!error.message?.includes('not found')) {
            console.error(`[llm-config] Failed to cleanup bearer token: ${error.message}`);
          }
        }
      }
    }

    console.log(`[llm-config] Updated Ollama server: ${request.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('[llm-config] Update Ollama server error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * llmConfig:removeOllamaServer
 * Remove an Ollama server
 */
export async function handleRemoveOllamaServer(
  event: Electron.IpcMainInvokeEvent,
  request: { id: string }
): Promise<any> {
  const manager = await getGlobalSettingsManager();
  if (!manager) {
    return { success: false, error: 'Settings not initialized' };
  }
  try {
    const removed = await manager.removeOllamaServer(request.id);
    if (!removed) {
      return { success: false, error: 'Server not found' };
    }

    // Clean up bearer token if stored
    const settingsKey = `ollama.${request.id}.bearerToken`;
    try {
      await nodeOneCore.settingsStore?.deleteValue(settingsKey);
    } catch (error: any) {
      if (!error.message?.includes('not found')) {
        console.error(`[llm-config] Failed to cleanup bearer token: ${error.message}`);
      }
    }

    console.log(`[llm-config] Removed Ollama server: ${request.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('[llm-config] Remove Ollama server error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * llmConfig:setOllamaServerEnabled
 * Enable or disable an Ollama server
 */
export async function handleSetOllamaServerEnabled(
  event: Electron.IpcMainInvokeEvent,
  request: { id: string; enabled: boolean }
): Promise<any> {
  const manager = await getGlobalSettingsManager();
  if (!manager) {
    return { success: false, error: 'Settings not initialized' };
  }
  try {
    const result = await manager.setOllamaServerEnabled(request.id, request.enabled);
    if (!result) {
      return { success: false, error: 'Server not found' };
    }

    console.log(`[llm-config] Set Ollama server ${request.id} enabled: ${request.enabled}`);
    return { success: true };
  } catch (error: any) {
    console.error('[llm-config] Set Ollama server enabled error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * llmConfig:discoverAllOllamaModels
 * Discover models from all enabled Ollama servers
 */
export async function handleDiscoverAllOllamaModels(
  event: Electron.IpcMainInvokeEvent,
  request: {}
): Promise<any> {
  const manager = await getGlobalSettingsManager();
  if (!manager) {
    return { success: false, count: 0, errors: [{ serverId: 'global', error: 'Settings not initialized' }] };
  }
  try {
    const servers = await manager.getEnabledOllamaServers();
    let totalCount = 0;
    const errors: Array<{ serverId: string; error: string }> = [];

    for (const server of servers) {
      try {
        // Get bearer token from settings if auth type is bearer
        let authToken: string | undefined;
        if (server.authType === 'bearer') {
          const settingsKey = `ollama.${server.id}.bearerToken`;
          authToken = await nodeOneCore.settingsStore?.getValue(settingsKey);
        }

        const result = await testOllamaConnection(server.baseUrl, authToken);
        if (result.success) {
          const models = await fetchOllamaModels(server.baseUrl, authToken);
          totalCount += models.length;
        } else {
          errors.push({ serverId: server.id, error: 'error' in result ? result.error : 'Connection failed' });
        }
      } catch (error: any) {
        errors.push({ serverId: server.id, error: error.message });
      }
    }

    console.log(`[llm-config] Discovered ${totalCount} models from ${servers.length} servers`);
    return {
      success: errors.length === 0 || totalCount > 0,
      count: totalCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    console.error('[llm-config] Discover all Ollama models error:', error);
    return { success: false, count: 0, errors: [{ serverId: 'global', error: error.message }] };
  }
}

/**
 * llmConfig:testConnection
 * Test connection to an Ollama server (used by OllamaServersSection UI)
 */
export async function handleTestConnection(
  event: Electron.IpcMainInvokeEvent,
  request: { server: string; authToken?: string }
): Promise<any> {
  try {
    const result = await testOllamaConnection(request.server, request.authToken);
    return result;
  } catch (error: any) {
    console.error('[llm-config] testConnection error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * llmConfig:discoverOllamaModels
 * Discover models from a specific Ollama server (used by OllamaServersSection UI)
 */
export async function handleDiscoverOllamaModels(
  event: Electron.IpcMainInvokeEvent,
  request: { serverUrl: string; authToken?: string }
): Promise<any> {
  try {
    const models = await fetchOllamaModels(request.serverUrl, request.authToken);
    return { success: true, models, count: models.length };
  } catch (error: any) {
    console.error('[llm-config] discoverOllamaModels error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * LLM Config handlers - exported for controller to register via this.handle()
 * This ensures handlers are tracked in the controller's plans map for proper shutdown
 */
export const llmConfigPlans = {
  'llm:testOllamaConnection': handleTestOllamaConnection,
  'llm:setOllamaConfig': handleSetOllamaConfig,
  'llm:getOllamaConfig': handleGetOllamaConfig,
  'llm:getAvailableModels': handleGetAvailableModels,
  'llm:deleteOllamaConfig': handleDeleteOllamaConfig,
  'llm:testConnectionAndDiscoverModels': handleTestConnectionAndDiscoverModels,
  'llmConfig:testConnection': handleTestConnection,
  'llmConfig:discoverOllamaModels': handleDiscoverOllamaModels,
  'llmConfig:getOllamaServers': handleGetOllamaServers,
  'llmConfig:addOllamaServer': handleAddOllamaServer,
  'llmConfig:updateOllamaServer': handleUpdateOllamaServer,
  'llmConfig:removeOllamaServer': handleRemoveOllamaServer,
  'llmConfig:setOllamaServerEnabled': handleSetOllamaServerEnabled,
  'llmConfig:discoverAllOllamaModels': handleDiscoverAllOllamaModels,
};

/**
 * @deprecated Use llmConfigPlans export instead - controller registers via this.handle()
 */
export function registerLlmConfigPlans() {
  console.log('[IPC] Registering LLM config handlers...');
  // Handlers are now registered by controller using llmConfigPlans export
  console.log('[IPC] ✅ LLM config handlers registered');
}
