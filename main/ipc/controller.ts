/**
 * Main IPC Controller (TypeScript Version)
 * Routes IPC messages to appropriate plans
 */

import { ipcMain, BrowserWindow, IpcMainInvokeEvent, app } from 'electron';
import type { IPCHandler, IPCHandlerMap } from '../types/ipc.js';
import nodeOneCore from '../core/node-one-core.js';

// Import plans (will be JS files initially, then migrated to TS)
import authPlans from './plans/auth.js';
import statePlans from './plans/state.js';
import { chatPlans } from './plans/chat.js';
import connectionPlans from './plans/connection.js';
import cryptoPlans from './plans/crypto.js';
import settingsPlans from './plans/settings.js';
import aiPlans from './plans/ai.js';
import attachmentPlans from './plans/attachments.js';
import { subjectPlans } from './plans/subjects.js';
import oneCorePlans from './plans/one-core.js';
import { initializeDevicePlans } from './plans/devices.js';
import { initializeQuicVCDiscoveryPlans, autoInitializeDiscovery } from './plans/quicvc-discovery.js';
import { registerContactPlans } from './plans/contacts.js';
import * as topicPlans from './plans/topics.js';
import topicAnalysisPlans from './plans/topic-analysis.js';
import * as wordCloudSettingsPlans from './plans/word-cloud-settings.js';
import registerMemoryPlans from './plans/memory.js';
import keywordDetailPlans from './plans/keyword-detail.js';
import auditPlans from './plans/audit.js';
import exportPlans from './plans/export.js';
import feedForwardPlans from './plans/feed-forward.js';
import { registerLlmConfigPlans } from './plans/llm-config.js';
import { proposalPlans } from './plans/proposals.js';
import mcpPlans from './plans/mcp.js';
import createUserSettingsPlans from './plans/user-settings.js';

// Node error type
interface NodeError extends Error {
  code?: string;
}

class IPCController {
  devices: any;
  public plans: Map<string, IPCHandler>;
  public mainWindow: BrowserWindow | null;

  constructor() {
    this.plans = new Map();
    this.mainWindow = null;
  }

  // Safe console methods that won't throw EPIPE errors
  private safeLog(...args: any[]): void {
    // Skip logging entirely if mainWindow is destroyed
    if (this.mainWindow && this.mainWindow?.isDestroyed()) {
      return;
    }

    try {
      console.log(...args);
    } catch (err: any) {
      // Ignore EPIPE errors when renderer disconnects
      if (err.code !== 'EPIPE' && !err.message?.includes('EPIPE')) {
        // Try to at least log to stderr if stdout fails
        try {
          process.stderr.write(`[IPC] Log failed: ${err.message}\n`);
        } catch {}
      }
    }
  }

  private safeError(...args: any[]): void {
    // Skip logging entirely if mainWindow is destroyed
    if (this.mainWindow && this.mainWindow?.isDestroyed()) {
      return;
    }

    try {
      console.error(...args);
    } catch (err: any) {
      // Ignore EPIPE errors
      if (err.code !== 'EPIPE' && !err.message?.includes('EPIPE')) {
        try {
          process.stderr.write(`[IPC] Error log failed: ${err.message}\n`);
        } catch {}
      }
    }
  }

  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    // Register all plans
    this.registerPlans();

    // Auto-initialize QuicVC discovery (waits for nodeOneCore)
    void autoInitializeDiscovery();

    this.safeLog('[IPCController] Initialized with plans');
  }

  private registerPlans(): void {
    // Debug handler for browser logs
    this.handle('debug:log', async (event: IpcMainInvokeEvent, message: string) => {
      console.log('[BROWSER DEBUG]', message);
      return { success: true };
    });

    // Authentication plans
    this.handle('auth:login', authPlans.login);
    this.handle('auth:register', authPlans.register);
    this.handle('auth:logout', authPlans.logout);
    this.handle('auth:check', authPlans.checkAuth);

    // State plans
    this.handle('state:get', statePlans.getState);
    this.handle('state:set', statePlans.setState);
    this.handle('state:subscribe', statePlans.subscribe);

    // Chat plans
    this.handle('chat:sendMessage', chatPlans.sendMessage);
    this.handle('chat:getMessages', chatPlans.getMessages);
    this.handle('chat:createConversation', chatPlans.createConversation);
    this.handle('chat:getConversations', chatPlans.getConversations);
    this.handle('chat:getCurrentUser', chatPlans.getCurrentUser);
    this.handle('chat:addParticipants', chatPlans.addParticipants);
    this.handle('chat:clearConversation', chatPlans.clearConversation);
    this.handle('chat:uiReady', chatPlans.uiReady);
    this.handle('chat:editMessage', chatPlans.editMessage);
    this.handle('chat:deleteMessage', chatPlans.deleteMessage);
    this.handle('chat:getMessageHistory', chatPlans.getMessageHistory);
    this.handle('chat:exportMessageCredential', chatPlans.exportMessageCredential);
    this.handle('chat:verifyMessageAssertion', chatPlans.verifyMessageAssertion);

    // Audit plans
    this.handle('audit:generateQR', auditPlans.generateQR);
    this.handle('audit:createAttestation', auditPlans.createAttestation);
    this.handle('audit:getAttestations', auditPlans.getAttestations);
    this.handle('audit:exportTopic', auditPlans.exportTopic);
    this.handle('audit:verifyAttestation', auditPlans.verifyAttestation);

    // Test handler to manually trigger message updates
    this.handle('test:triggerMessageUpdate', async (event: IpcMainInvokeEvent, { conversationId }: any) => {
      console.log('[TEST] Manually triggering message update for:', conversationId);
      const testData = {
        conversationId: conversationId || 'test-conversation',
        messages: [{
          id: 'test-msg-' + Date.now(),
          conversationId: conversationId || 'test-conversation',
          text: 'Test message triggered at ' + new Date().toISOString(),
          sender: 'test-sender',
          timestamp: new Date().toISOString(),
          status: 'received',
          isAI: false
        }]
      };
      console.log('[TEST] Sending chat:newMessages event with data:', testData);
      this.sendUpdate('chat:newMessages', testData);
      return { success: true, data: testData };
    });

    // Connection plans (pairing, instances, connections)
    this.handle('connection:getInstances', connectionPlans.getInstances);
    this.handle('connection:getConnectionStatus', connectionPlans.getConnectionStatus);
    this.handle('connection:createPairingInvitation', connectionPlans.createPairingInvitation);
    this.handle('connection:acceptPairingInvitation', connectionPlans.acceptPairingInvitation);
    this.handle('connection:getDataStats', connectionPlans.getDataStats);

    // Crypto plans
    this.handle('crypto:getKeys', cryptoPlans.getKeys);
    this.handle('crypto:getCertificates', cryptoPlans.getCertificates);
    this.handle('crypto:export', cryptoPlans.exportCryptoObject);

    // Settings plans (old - to be deprecated)
    this.handle('settings:get', settingsPlans.getSetting);
    this.handle('settings:set', settingsPlans.setSetting);
    this.handle('settings:getAll', settingsPlans.getSettings);
    this.handle('settings:syncIoM', settingsPlans.syncIoMSettings);
    this.handle('settings:subscribe', settingsPlans.subscribeToSettings);
    this.handle('settings:getConfig', settingsPlans.getInstanceConfig);

    // User Settings plans (new unified settings)
    const userSettingsPlans = createUserSettingsPlans(nodeOneCore);
    Object.entries(userSettingsPlans).forEach(([channel, handler]) => {
      this.handle(channel, handler);
    });

    // AI/LLM plans
    this.handle('ai:chat', aiPlans.chat);
    this.handle('ai:getModels', aiPlans.getModels);
    this.handle('ai:setDefaultModel', aiPlans.setDefaultModel);
    this.handle('ai:setApiKey', aiPlans.setApiKey);
    this.handle('ai:getTools', aiPlans.getTools);
    this.handle('ai:executeTool', aiPlans.executeTool);
    this.handle('ai:initialize', aiPlans.initializeLLM);
    this.handle('ai:initializeLLM', aiPlans.initializeLLM); // Alias for UI compatibility
    this.handle('ai:getOrCreateContact', aiPlans.getOrCreateContact);
    this.handle('ai:discoverClaudeModels', aiPlans.discoverClaudeModels);
    this.handle('ai:debugTools', aiPlans.debugTools);
    this.handle('llm:testApiKey', aiPlans.testApiKey);
    this.handle('ai:getDefaultModel', aiPlans['ai:getDefaultModel']);

    // LLM Configuration plans (network Ollama support)
    registerLlmConfigPlans();

    // Legacy alias for UI compatibility
    this.handle('llm:getConfig', async (event: IpcMainInvokeEvent, params: any) => {
      const { handleGetOllamaConfig } = await import('./plans/llm-config.js');
      return handleGetOllamaConfig(event, params || {});
    });

    // Attachment plans
    this.handle('attachment:store', attachmentPlans.storeAttachment);
    this.handle('attachment:get', attachmentPlans.getAttachment);
    this.handle('attachment:getMetadata', attachmentPlans.getAttachmentMetadata);
    this.handle('attachment:storeMultiple', attachmentPlans.storeAttachments);

    // Subject plans
    this.handle('subjects:create', subjectPlans['subjects:create']);
    this.handle('subjects:attach', subjectPlans['subjects:attach']);
    this.handle('subjects:getForContent', subjectPlans['subjects:getForContent']);
    this.handle('subjects:getAll', subjectPlans['subjects:getAll']);
    this.handle('subjects:search', subjectPlans['subjects:search']);
    this.handle('subjects:getResonance', subjectPlans['subjects:getResonance']);
    this.handle('subjects:extract', subjectPlans['subjects:extract']);

    // Topic Analysis plans
    this.handle('topicAnalysis:analyzeMessages', topicAnalysisPlans.analyzeMessages);
    this.handle('topicAnalysis:getSubjects', topicAnalysisPlans.getSubjects);
    this.handle('topicAnalysis:getSummary', topicAnalysisPlans.getSummary);
    this.handle('topicAnalysis:updateSummary', topicAnalysisPlans.updateSummary);
    this.handle('topicAnalysis:extractKeywords', topicAnalysisPlans.extractKeywords);
    this.handle('topicAnalysis:mergeSubjects', topicAnalysisPlans.mergeSubjects);
    this.handle('topicAnalysis:extractRealtimeKeywords', topicAnalysisPlans.extractRealtimeKeywords);
    this.handle('topicAnalysis:extractConversationKeywords', topicAnalysisPlans.extractConversationKeywords);
    this.handle('topicAnalysis:getKeywords', topicAnalysisPlans.getKeywords);

    // Chat Memory plans
    registerMemoryPlans(ipcMain, nodeOneCore);

    // Word Cloud Settings plans
    this.handle('wordCloudSettings:getSettings', wordCloudSettingsPlans.getWordCloudSettings);
    this.handle('wordCloudSettings:updateSettings', wordCloudSettingsPlans.updateWordCloudSettings);
    this.handle('wordCloudSettings:resetSettings', wordCloudSettingsPlans.resetWordCloudSettings);

    // Keyword Detail plans
    this.handle('keywordDetail:getKeywordDetails', keywordDetailPlans.getKeywordDetails);
    this.handle('keywordDetail:updateKeywordAccessState', keywordDetailPlans.updateKeywordAccessState);

    // Proposal plans
    this.handle('proposals:getForTopic', proposalPlans['proposals:getForTopic']);
    this.handle('proposals:updateConfig', proposalPlans['proposals:updateConfig']);
    this.handle('proposals:getConfig', proposalPlans['proposals:getConfig']);
    this.handle('proposals:dismiss', proposalPlans['proposals:dismiss']);
    this.handle('proposals:share', proposalPlans['proposals:share']);

    // MCP plans
    this.handle('mcp:listServers', mcpPlans.listServers);
    this.handle('mcp:addServer', mcpPlans.addServer);
    this.handle('mcp:updateServer', mcpPlans.updateServer);
    this.handle('mcp:removeServer', mcpPlans.removeServer);
    this.handle('mcp:getStatus', mcpPlans.getStatus);
    this.handle('mcp:getAvailableTools', mcpPlans.getAvailableTools);
    this.handle('mcp:getTopicConfig', mcpPlans.getTopicConfig);
    this.handle('mcp:setTopicConfig', mcpPlans.setTopicConfig);
    this.handle('mcp:reconnect', mcpPlans.reconnect);

    // Export plans
    this.handle('export:file', exportPlans.exportFile);
    this.handle('export:fileAuto', exportPlans.exportFileAuto);
    this.handle('export:message', exportPlans.exportMessage);
    this.handle('export:htmlWithMicrodata', exportPlans.exportHtmlWithMicrodata);

    // Feed-Forward plans
    this.handle('feedForward:createSupply', feedForwardPlans['feedForward:createSupply']);
    this.handle('feedForward:createDemand', feedForwardPlans['feedForward:createDemand']);
    this.handle('feedForward:matchSupplyDemand', feedForwardPlans['feedForward:matchSupplyDemand']);
    this.handle('feedForward:updateTrust', feedForwardPlans['feedForward:updateTrust']);
    this.handle('feedForward:getCorpusStream', feedForwardPlans['feedForward:getCorpusStream']);
    this.handle('feedForward:enableSharing', feedForwardPlans['feedForward:enableSharing']);
    this.handle('feedForward:getTrustScore', feedForwardPlans['feedForward:getTrustScore']);

    // ONE.core plans
    this.handle('onecore:initializeNode', oneCorePlans.initializeNode);
    this.handle('onecore:restartNode', oneCorePlans.restartNode);
    this.handle('onecore:createLocalInvite', oneCorePlans.createLocalInvite);
    this.handle('onecore:createBrowserPairingInvite', oneCorePlans.createBrowserPairingInvite);
    this.handle('onecore:getBrowserPairingInvite', oneCorePlans.getBrowserPairingInvite);
    this.handle('onecore:createNetworkInvite', oneCorePlans.createNetworkInvite);
    this.handle('onecore:listInvites', oneCorePlans.listInvites);
    this.handle('onecore:revokeInvite', oneCorePlans.revokeInvite);
    this.handle('onecore:getNodeStatus', oneCorePlans.getNodeStatus);
    this.handle('onecore:setNodeState', oneCorePlans.setNodeState);
    this.handle('onecore:getNodeState', oneCorePlans.getNodeState);
    this.handle('onecore:getNodeConfig', oneCorePlans.getNodeConfig);
    this.handle('onecore:testSettingsReplication', oneCorePlans.testSettingsReplication);
    this.handle('onecore:syncConnectionSettings', oneCorePlans.syncConnectionSettings);
    this.handle('onecore:getCredentialsStatus', oneCorePlans.getCredentialsStatus);
    this.handle('onecore:getContacts', oneCorePlans.getContacts);
    this.handle('onecore:getPeerList', oneCorePlans.getPeerList);
    this.handle('onecore:getOrCreateTopicForContact', topicPlans.getOrCreateTopicForContact);
    this.handle('onecore:secureStore', oneCorePlans.secureStore);
    this.handle('onecore:secureRetrieve', oneCorePlans.secureRetrieve);
    this.handle('onecore:clearStorage', oneCorePlans.clearStorage);
    this.handle('onecore:hasPersonName', oneCorePlans.hasPersonName);
    this.handle('onecore:setPersonName', oneCorePlans.setPersonName);
    this.handle('onecore:updateMood', oneCorePlans.updateMood);

    // Topic feedback handler
    this.handle('topics:recordFeedback', topicPlans.recordSubjectFeedback);

    // Debug handler for owner ID comparison
    this.handle('debug', (event: IpcMainInvokeEvent, data: any) => {
      if (data.type === 'browser-owner-id') {
        console.log('[DEBUG] Browser Owner ID received:', data.ownerId);
        console.log('[DEBUG] Timestamp:', data.timestamp);
      } else {
        console.log('[DEBUG]', data);
      }
    });

    // Device plans
    initializeDevicePlans();

    // QuicVC Discovery plans
    initializeQuicVCDiscoveryPlans();

    // Contact plans
    registerContactPlans();

    // Note: app:clearData is handled in lama-electron-shadcn.js

    // Action plans (user-initiated actions)
    this.handle('action:init', this.handleAction('init'));
    this.handle('action:login', this.handleAction('login'));
    this.handle('action:logout', this.handleAction('logout'));
    this.handle('action:sendMessage', this.handleAction('sendMessage'));

    // Query plans (request state)
    this.handle('query:getState', this.handleQuery('getState'));
    this.handle('query:getConversation', this.handleQuery('getConversation'));
    this.handle('query:getMessages', this.handleQuery('getMessages'));
  }

  private handle(channel: string, handler: IPCHandler): void {
    // Remove any existing handler
    if (this.plans.has(channel)) {
      ipcMain.removeHandler(channel);
    }

    // Register new handler with error handling and initialization checks
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: any[]) => {
      try {
        this.safeLog(`[IPC] Handling: ${channel}`, args);

        // Channels that can be called before Node initialization
        const allowedBeforeInit = [
          'onecore:initializeNode',
          'onecore:getInfo',
          'debug:log',
          'state:get',
          'state:set',
          'settings:get',
          'settings:getAll',
          'app:clearData',
          'action:init'
        ];

        // Check if NodeOneCore is initialized for channels that require it
        if (!allowedBeforeInit.includes(channel) && !nodeOneCore.initialized) {
          const error = `NodeOneCore not initialized yet. Please log in first. (Called: ${channel})`;
          this.safeError(`[IPC] ${error}`);
          throw new Error(error);
        }

        const result: any = await handler(event, ...args);
        // Don't double-wrap if handler already returns success/error format
        if (result && typeof result === 'object' && 'success' in result) {
          return result;
        }
        return { success: true, data: result };
      } catch (error) {
        this.safeError(`[IPC] Error in ${channel}:`, error);
        return {
          success: false,
          error: (error as Error).message || 'Unknown error'
        };
      }
    });

    (this.plans as any)?.set(channel, handler);
  }

  // Generic action handler wrapper
  private handleAction(actionType: string): IPCHandler {
    return async (event: IpcMainInvokeEvent, payload: any) => {
      this.safeLog(`[IPC] Action: ${actionType}`, payload);

      // Process action based on type
      switch (actionType) {
        case 'init':
          // Platform is already initialized in main process
          return { initialized: true, platform: 'electron' };
        case 'login':
          return await authPlans.login(event, payload);
        case 'logout':
          return await authPlans.logout(event);
        case 'sendMessage':
          return await chatPlans.sendMessage(event, payload);
        default:
          throw new Error(`Unknown action: ${actionType}`);
      }
    };
  }

  // Generic query handler wrapper
  private handleQuery(queryType: string): IPCHandler {
    return async (event: IpcMainInvokeEvent, params: any) => {
      this.safeLog(`[IPC] Query: ${queryType}`, params);

      switch (queryType) {
        case 'getState':
          return await statePlans.getState(event, params);
        case 'getConversation':
          return await chatPlans.getConversation(event, params);
        case 'getMessages':
          return await chatPlans.getMessages(event, params);
        default:
          throw new Error(`Unknown query: ${queryType}`);
      }
    };
  }

  // Send update to renderer
  sendUpdate(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow?.isDestroyed()) {
      this.mainWindow?.webContents.send(channel, data);
    }
  }

  // Forward console logs to renderer
  sendLogToRenderer(level: string, ...args: any[]): void {
    if (this.mainWindow && !this.mainWindow?.isDestroyed()) {
      this.mainWindow?.webContents.send('update:mainProcessLog', {
        level,
        message: args.join(' '),
        timestamp: Date.now()
      });
    }
  }

  // Broadcast state change to renderer
  broadcastStateChange(path: string, newValue: any): void {
    this.sendUpdate('update:stateChanged', {
      path,
      value: newValue,
      timestamp: Date.now()
    });
  }

  async handleClearData(): Promise<{ success: boolean; error?: string }> {
    try {
      this.safeLog('[IPCController] Clearing app data...');

      const fs: any = await import('fs');
      const path: any = await import('path');

      // Clear device manager contacts
      const { default: deviceManager } = await import('../core/device-manager.js');
      deviceManager.devices.clear();
      await deviceManager.saveDevices();

      // Clear ALL ONE.core storage
      // Use runtime configuration path (respects --storage CLI arg)
      const storageDir = (global as any).lamaConfig?.instance.directory || path.join(process.cwd(), 'OneDB');
      const storageDirs = [storageDir];

      for (const dir of storageDirs) {
        try {
          await fs.promises.rm(dir, { recursive: true, force: true });
          this.safeLog(`[IPCController] Cleared storage: ${dir}`);
        } catch (error) {
          // Directory might not exist, which is fine
          if (error.code !== 'ENOENT') {
            this.safeError(`[IPCController] Error clearing ${dir}:`, error);
          }
        }
      }

      // Clear any cached state
      const { default: stateManager } = await import('../state/manager.js');
      stateManager.clearState();

      // Properly shutdown Node ONE.core instance
      const { default: nodeOneCore } = await import('../core/node-one-core.js');

      if (nodeOneCore.initialized) {
        this.safeLog('[IPCController] Shutting down Node ONE.core instance...');
        await nodeOneCore.shutdown();
        this.safeLog('[IPCController] Node ONE.core instance shut down');
      }

      this.safeLog('[IPCController] App data cleared, ready for fresh start');

      return { success: true };

    } catch (error) {
      this.safeError('[IPCController] Failed to clear app data:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  shutdown(): void {
    // Remove all plans
    this.plans.forEach((handler: any, channel: any) => {
      ipcMain.removeHandler(channel);
    });
    this.plans.clear();

    this.safeLog('[IPCController] Shutdown complete');
  }
}

export default new IPCController();