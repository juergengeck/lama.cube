/**
 * AI Assistant Handler Adapter
 *
 * Creates and initializes AIAssistantPlan from lama.core with Electron-specific
 * dependencies. This is the platform adapter that bridges platform-agnostic
 * business logic (lama.core) with Electron platform services.
 *
 * Usage:
 *   import { initializeAIAssistantHandler } from './ai-assistant-handler-adapter.js';
 *   const handler = await initializeAIAssistantHandler(nodeOneCore, llmManager);
 */

import { AIAssistantPlan } from '@refinio/lama.core/plans/AIAssistantPlan.js';
import { ElectronLLMPlatform } from '../adapters/electron-llm-platform.js';
import type { NodeOneCore } from '../types/one-core.js';
import { storeVersionedObject, getIdObject, getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { storeUnversionedObject, getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { createPersonWithDefaultKeys } from '@refinio/one.models/lib/misc/person.js';
import { mcpManager } from '@refinio/mcp.core/local';
import { MODELS, type ModelId } from '@refinio/local.core';
import { getJournalPlan } from '../ipc/plans/journal.js';
import type { SkillLoaderDeps } from '@refinio/lama.core/services/skill-loader.js';
import electron from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
const { BrowserWindow, app } = electron;

/**
 * Lookup function for local on-device models
 * Uses @refinio/local.core MODELS registry to get display name and provider info
 */
async function localModelLookup(modelId: string): Promise<{ displayName: string; provider: string } | null> {
  // Try to find model in registry
  const modelInfo = MODELS[modelId as ModelId];
  if (modelInfo && modelInfo.type === 'text-generation') {
    return {
      displayName: modelInfo.familyName || modelInfo.name,
      provider: 'local-onnx'
    };
  }
  return null;
}

let handlerInstance: AIAssistantPlan | null = null;

/**
 * Create skill loader dependencies for knowledge-work-plugins
 * Uses Node.js fs to read skill files from cloned plugin repository
 */
function createSkillLoaderDeps(): SkillLoaderDeps | undefined {
  // Look for plugins in packages/knowledge-work-plugins relative to app resources
  const possiblePaths = [
    // Development: relative to lama.cube
    path.join(__dirname, '..', '..', '..', '..', 'knowledge-work-plugins'),
    // Alternative: sibling to lama directory
    path.join(app.getAppPath(), '..', '..', '..', 'knowledge-work-plugins'),
  ];

  // Find first existing path
  let pluginsPath: string | undefined;
  for (const p of possiblePaths) {
    try {
      // Sync check is OK here since this runs once at startup
      const stats = require('fs').statSync(p);
      if (stats.isDirectory()) {
        pluginsPath = p;
        console.log(`[AIAssistantAdapter] Found knowledge-work-plugins at: ${p}`);
        break;
      }
    } catch {
      // Path doesn't exist, try next
    }
  }

  if (!pluginsPath) {
    console.log('[AIAssistantAdapter] knowledge-work-plugins not found - skills disabled');
    return undefined;
  }

  return {
    pluginsPath,
    readFile: (filePath: string) => fs.readFile(filePath, 'utf-8'),
    exists: async (filePath: string) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    readDir: async (dirPath: string) => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map(e => e.name);
    },
  };
}

/**
 * Create storage dependencies with lazy journalPlan getter
 * Uses a Proxy to defer journalPlan access until it's actually needed
 */
function createStorageDeps(nodeOneCore: NodeOneCore) {
  return {
    storeVersionedObject,
    // Wrap storeUnversionedObject to extract just the hash
    storeUnversionedObject: async (obj: any) => {
      const result = await storeUnversionedObject(obj);
      return result.hash;
    },
    getIdObject,
    getObject,
    getObjectByIdHash,
    channelManager: nodeOneCore.channelManager,
    createPersonWithDefaultKeys,
    // Journal plan is accessed lazily since it may not be initialized during handler creation
    get journalPlan() {
      try {
        return getJournalPlan();
      } catch {
        return undefined;  // Not yet initialized
      }
    }
  };
}

/**
 * Create AIAssistantHandler instance with Electron dependencies
 * Call this after nodeOneCore is initialized
 */
export function createAIAssistantHandler(nodeOneCore: NodeOneCore, llmManager: any): AIAssistantPlan {
  if (handlerInstance) {
    console.log('[AIAssistantAdapter] Using existing handler instance');
    return handlerInstance;
  }

  console.log('[AIAssistantAdapter] Creating new AIAssistantHandler...');

  // Create Electron platform adapter with window getter
  const platform = new ElectronLLMPlatform(() => BrowserWindow.getAllWindows()[0] || null);

  // Get SettingsPlan from nodeOneCore (created by module-registry-init.ts)
  const settingsPlan = nodeOneCore.settingsPlan;
  if (!settingsPlan) {
    throw new Error('[AIAssistantAdapter] SettingsPlan not found on nodeOneCore - ensure module registry is initialized first');
  }

  // Create skill loader for knowledge-work-plugins (optional)
  const skillLoaderDeps = createSkillLoaderDeps();

  // Create handler with all dependencies
  handlerInstance = new AIAssistantPlan({
    oneCore: nodeOneCore,
    channelManager: nodeOneCore.channelManager,
    topicModel: nodeOneCore.topicModel,
    leuteModel: nodeOneCore.leuteModel,
    llmManager: llmManager,
    platform: platform,
    stateManager: undefined, // Optional - not currently used
    llmObjectManager: nodeOneCore.llmObjectManager,
    contextEnrichmentService: nodeOneCore.contextEnrichmentService,
    topicAnalysisModel: nodeOneCore.topicAnalysisModel,
    topicGroupManager: nodeOneCore.topicGroupManager,
    assemblyManager: nodeOneCore.assemblyManager,
    mcpManager: mcpManager, // For memory context in analysis
    settingsPlan: settingsPlan, // SettingsPlan for AI settings via settings.core
    localModelLookup: localModelLookup, // For resolving local on-device model info
    storageDeps: createStorageDeps(nodeOneCore),
    skillLoaderDeps: skillLoaderDeps, // For loading knowledge-work-plugins skills
  });

  console.log('[AIAssistantAdapter] AIAssistantHandler created');
  return handlerInstance;
}

/**
 * Initialize the AI assistant handler
 * Call this after nodeOneCore is provisioned
 */
export async function initializeAIAssistantHandler(
  nodeOneCore: NodeOneCore,
  llmManager: any
): Promise<AIAssistantPlan> {
  const handler = createAIAssistantHandler(nodeOneCore, llmManager);

  console.log('[AIAssistantAdapter] Initializing AIAssistantHandler...');
  await handler.init();

  console.log('[AIAssistantAdapter] ✅ AIAssistantHandler initialized');
  return handler;
}

/**
 * Get the current handler instance
 * Throws if handler hasn't been created yet
 */
export function getAIAssistantHandler(): AIAssistantPlan {
  if (!handlerInstance) {
    throw new Error('[AIAssistantAdapter] AIAssistantHandler not initialized - call initializeAIAssistantHandler() first');
  }
  return handlerInstance;
}

/**
 * Reset handler instance (for testing)
 */
export function resetAIAssistantHandler(): void {
  handlerInstance = null;
}
