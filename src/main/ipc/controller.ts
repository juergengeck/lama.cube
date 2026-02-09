/**
 * Main IPC Controller (TypeScript Version)
 * Routes IPC messages to appropriate plans
 */

import { ipcMain, BrowserWindow, IpcMainInvokeEvent, app, shell } from 'electron';
import type { IPCHandler, IPCHandlerMap } from '../types/ipc.js';
import nodeOneCore from '../core/node-one-core.js';
import fs from 'fs';
import path from 'path';
import deviceManager from '../core/device-manager.js';
import stateManager from '../state/manager.js';
import { handleGetOllamaConfig } from './plans/llm-config.js';

// Import plans (will be JS files initially, then migrated to TS)
import authPlans from './plans/auth.js';
import statePlans from './plans/state.js';
import { chatPlans } from './plans/chat.js';
import connectionPlans from './plans/connection.js';
import groupChatPlans from './plans/group-chat.js';
import cryptoPlans from './plans/crypto.js';
import settingsPlans from './plans/settings.js';
import aiPlans from './plans/ai.js';
import attachmentPlans from './plans/attachments.js';
import { subjectPlans } from './plans/subjects.js';
import oneCorePlans from './plans/one-core.js';
import { initializeDevicePlans, initializeESP32ControlPlans } from './plans/devices.js';
import { initializeQuicVCDiscoveryPlans, autoInitializeDiscovery } from './plans/quicvc-discovery.js';
import { registerContactPlans } from './plans/contacts.js';
import * as topicPlans from './plans/topics.js';
import topicAnalysisPlans from './plans/topic-analysis.js';
import * as wordCloudSettingsPlans from './plans/word-cloud-settings.js';
import registerMemoryPlans from './plans/memory.js';
import registerKnowledgeGraphPlans from './plans/knowledge-graph.js';
import keywordDetailPlans from './plans/keyword-detail.js';
import auditPlans from './plans/audit.js';
import trustPlans from './plans/trust.js';
import journalPlans from './plans/journal.js';
import exportPlans from './plans/export.js';
import feedForwardPlans from './plans/feed-forward.js';
import { llmConfigPlans } from './plans/llm-config.js';
import { proposalPlans } from './plans/proposals.js';
import mcpPlans from './plans/mcp.js';
import createUserSettingsPlans from './plans/user-settings.js';
// import { registerAssemblyPlans } from './plans/assembly.js'; // Disabled - migrating to assembly.core
import { registerDirectAssemblyPlans } from './plans/assembly-direct.js';
import * as transportPlans from './plans/transport.js';
import localModelsPlans from './plans/local-models.js';
import ttsPlans from './plans/tts.js';
import registerIngestionPlans from './plans/ingestion.js';
import diagnosticsPlans from './plans/diagnostics.js';
import tracePlans from './plans/trace.js';
import instancePlans from './plans/instance.js';
import baileysPlans from './plans/baileys.js';
import { marketplacePlans } from './plans/marketplace.js';
import { registerYouTubeHandlers } from './plans/youtube.js';
import alertPlans from './plans/alerts.js';
import gluePlans from './plans/glue.js';
import moltPlans from './plans/molt.js';
import sharingPlans from './plans/sharing.js';
import jobPlans from './plans/jobs.js';

// Node error type
interface NodeError extends Error {
  code?: string;
}

class IPCController {
  devices: any;
  public plans: Map<string, IPCHandler>;
  public mainWindow: BrowserWindow | null;
  private postInitRegistered: boolean = false;

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

  private initialized = false;

  initialize(mainWindow: BrowserWindow | null = null): void {
    // Skip if already initialized (idempotent)
    if (this.initialized) {
      if (mainWindow) {
        this.mainWindow = mainWindow;
      }
      this.safeLog('[IPCController] Already initialized, updating window only');
      return;
    }

    this.mainWindow = mainWindow;

    // Register pre-init plans (don't need NodeOneCore)
    this.registerPreInitPlans();

    // Initialize transport plan
    transportPlans.initTransportPlan();

    // Auto-initialize QuicVC discovery (waits for nodeOneCore)
    void autoInitializeDiscovery();

    this.initialized = true;
    this.safeLog('[IPCController] Initialized with pre-init plans');
  }

  /**
   * Set the main window reference (can be called after initialize)
   */
  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  /**
   * Register post-init plans that require NodeOneCore to be initialized.
   * Called from node-provisioning after NodeOneCore is ready.
   * Emits 'nodecore:ready' event to notify UI that all handlers are available.
   */
  async registerPostInitPlans(): Promise<void> {
    if (this.postInitRegistered) {
      this.safeLog('[IPCController] Post-init plans already registered');
      return;
    }

    if (!nodeOneCore.initialized) {
      throw new Error('[IPCController] Cannot register post-init plans: NodeOneCore not initialized');
    }

    // Contact plans (demand: NodeOneCore)
    registerContactPlans(this.handle.bind(this));

    // YouTube plans (pass mainWindow for event forwarding)
    // Must await to ensure config is loaded before UI requests it
    await registerYouTubeHandlers(this.mainWindow);

    this.postInitRegistered = true;
    this.safeLog('[IPCController] Post-init plans registered (NodeOneCore ready)');

    // Notify UI that all handlers are now available
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('nodecore:ready', {
        initialized: true,
        timestamp: Date.now()
      });
      this.safeLog('[IPCController] Sent nodecore:ready event to UI');
    }
  }

  private registerPreInitPlans(): void {
    // Debug handler for browser logs
    this.handle('debug:log', async (event: IpcMainInvokeEvent, message: string) => {
      console.log('[BROWSER DEBUG]', message);
      return { success: true };
    });

    // Shell handler for opening external URLs
    this.handle('shell:openExternal', async (event: IpcMainInvokeEvent, url: string) => {
      // Only allow https URLs for security
      if (url && (url.startsWith('https://') || url.startsWith('http://localhost'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'Invalid URL' };
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
    this.handle('chat:getTopicHistory', chatPlans.getTopicHistory);
    this.handle('chat:setComposing', chatPlans.setComposing);

    // Glue plans (share to glue.one)
    console.log('[IPCController] Registering glue handlers, gluePlans=', gluePlans);
    this.handle('glue:shareToGlue', gluePlans['glue:shareToGlue']);
    this.handle('glue:getGlueTopic', gluePlans['glue:getGlueTopic']);

    // Molt plans (moltbook AI social network)
    console.log('[IPCController] Registering molt handlers, moltPlans=', moltPlans);
    this.handle('molt:getConfig', moltPlans['molt:getConfig']);
    this.handle('molt:setEnabled', moltPlans['molt:setEnabled']);
    this.handle('molt:syncNow', moltPlans['molt:syncNow']);
    this.handle('molt:getMoltTopic', moltPlans['molt:getMoltTopic']);
    this.handle('molt:getFeed', moltPlans['molt:getFeed']);

    // Audit plans
    this.handle('audit:generateQR', auditPlans.generateQR);
    this.handle('audit:createAttestation', auditPlans.createAttestation);
    this.handle('audit:getAttestations', auditPlans.getAttestations);
    this.handle('audit:exportTopic', auditPlans.exportTopic);
    this.handle('audit:verifyAttestation', auditPlans.verifyAttestation);

    // Trust plans
    this.handle('trust:setTrustStatus', trustPlans.setTrustStatus);
    this.handle('trust:getTrustStatus', trustPlans.getTrustStatus);
    this.handle('trust:getTrustedDevices', trustPlans.getTrustedDevices);
    this.handle('trust:verifyDeviceKey', trustPlans.verifyDeviceKey);
    this.handle('trust:evaluateTrust', trustPlans.evaluateTrust);
    this.handle('trust:getDeviceCredentials', trustPlans.getDeviceCredentials);
    this.handle('trust:setTrustLevel', trustPlans.setTrustLevel);
    this.handle('trust:getTrustLevel', trustPlans.getTrustLevel);
    this.handle('trust:getTrustChain', trustPlans.getTrustChain);
    // Contact detail trust queries
    this.handle('trust:getAttestationsAbout', trustPlans.getAttestationsAbout);
    this.handle('trust:getAttestationsBy', trustPlans.getAttestationsBy);
    this.handle('trust:getCertificatesFor', trustPlans.getCertificatesFor);
    this.handle('trust:getCertificatesBy', trustPlans.getCertificatesBy);

    // Sharing plans (for Contact Card sections)
    this.handle('sharing:getSharedWith', sharingPlans.getSharedWith);
    this.handle('sharing:getMayShareWith', sharingPlans.getMayShareWith);

    // Journal plans
    this.handle('journal:recordLLMCall', journalPlans.recordLLMCall);
    this.handle('journal:recordAIContactCreation', journalPlans.recordAIContactCreation);
    this.handle('journal:getCallEntries', journalPlans.getCallEntries);
    this.handle('journal:getConversationHistory', journalPlans.getConversationHistory);
    this.handle('journal:getAllEntries', journalPlans.getAllEntries);
    this.handle('journal:queryAssemblies', journalPlans.queryAssemblies);

    // Test handler to manually trigger message updates
    this.handle('test:triggerMessageUpdate', async (event: IpcMainInvokeEvent, { topicId }: any) => {
      console.log('[TEST] Manually triggering message update for:', topicId);
      const testData = {
        topicId: topicId || 'test-conversation',
        messages: [{
          id: 'test-msg-' + Date.now(),
          topicId: topicId || 'test-conversation',
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
    this.handle('connection:getConfiguredPairingIdentity', connectionPlans.getConfiguredPairingIdentity);

    // Group chat plans (certificate-based group chat establishment)
    this.handle('groupChat:createGroup', groupChatPlans.createGroup);
    this.handle('groupChat:distributeGroup', groupChatPlans.distributeGroup);
    this.handle('groupChat:initializeGroupChat', groupChatPlans.initializeGroupChat);
    this.handle('groupChat:joinGroupChat', groupChatPlans.joinGroupChat);
    this.handle('groupChat:waitForGroupSync', groupChatPlans.waitForGroupSync);
    this.handle('groupChat:validateGroupCertificate', groupChatPlans.validateGroupCertificate);
    this.handle('groupChat:hasGroup', groupChatPlans.hasGroup);
    this.handle('groupChat:getGroup', groupChatPlans.getGroup);
    this.handle('groupChat:getGroupMembers', groupChatPlans.getGroupMembers);

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
    this.handle('ai:stopStreaming', aiPlans.stopStreaming);
    this.handle('ai:getActiveStream', aiPlans.getActiveStream);
    this.handle('ai:setResponseLength', aiPlans.setResponseLength);
    this.handle('ai:getResponseLength', aiPlans.getResponseLength);
    this.handle('ai:getModels', aiPlans.getModels);
    this.handle('ai:setDefaultModel', aiPlans.setDefaultModel);
    this.handle('ai:setApiKey', aiPlans.setApiKey);
    this.handle('ai:getTools', aiPlans.getTools);
    this.handle('ai:executeTool', aiPlans.executeTool);
    this.handle('ai:initialize', aiPlans.initializeLLM);
    this.handle('ai:initializeLLM', aiPlans.initializeLLM); // Alias for UI compatibility
    this.handle('ai:getOrCreateContact', aiPlans.getOrCreateContact);
    this.handle('ai:discoverClaudeModels', aiPlans.discoverClaudeModels);
    this.handle('ai:discoverOllamaModels', aiPlans.discoverOllamaModels);
    this.handle('ai:debugTools', aiPlans.debugTools);
    this.handle('llm:testApiKey', aiPlans.testApiKey);
    this.handle('ai:getDefaultModel', aiPlans['ai:getDefaultModel']);
    this.handle('ai:isAITopic', aiPlans.isAITopic);
    this.handle('ai:switchAIModel', aiPlans.switchAIModel);
    this.handle('ai:setAISettings', aiPlans.setAISettings);
    this.handle('ai:getAIPersonForTopic', aiPlans.getAIPersonForTopic);
    this.handle('ai:getDefaultAIPersonId', aiPlans.getDefaultAIPersonId);
    this.handle('ai:generateAIName', aiPlans.generateAIName);

    // LLM Configuration plans (network Ollama support)
    // Registered via this.handle() so they're tracked in plans map for proper shutdown
    console.log('[IPC] Registering LLM config handlers...');
    for (const [channel, handler] of Object.entries(llmConfigPlans)) {
      this.handle(channel, handler);
    }
    console.log('[IPC] ✅ LLM config handlers registered');

    // Legacy alias for UI compatibility
    this.handle('llm:getConfig', async (event: IpcMainInvokeEvent, params: any) => {
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
    registerMemoryPlans(this.handle.bind(this), nodeOneCore);

    // Document Ingestion plans
    registerIngestionPlans(this.handle.bind(this));

    // Knowledge Graph plans
    registerKnowledgeGraphPlans(this.handle.bind(this), nodeOneCore);

    // Word Cloud Settings plans
    this.handle('wordCloudSettings:getSettings', wordCloudSettingsPlans.getWordCloudSettings);
    this.handle('wordCloudSettings:updateSettings', wordCloudSettingsPlans.updateWordCloudSettings);
    this.handle('wordCloudSettings:resetSettings', wordCloudSettingsPlans.resetWordCloudSettings);

    // Keyword Detail plans
    this.handle('keywordDetail:getKeywordDetails', keywordDetailPlans.getKeywordDetails);
    this.handle('keywordDetail:updateKeywordAccessState', keywordDetailPlans.updateKeywordAccessState);

    // Proposal plans
    this.handle('proposals:getForTopic', proposalPlans['proposals:getForTopic']);
    this.handle('proposals:getForInput', proposalPlans['proposals:getForInput']);
    this.handle('proposals:updateConfig', proposalPlans['proposals:updateConfig']);
    this.handle('proposals:getConfig', proposalPlans['proposals:getConfig']);
    this.handle('proposals:dismiss', proposalPlans['proposals:dismiss']);
    this.handle('proposals:share', proposalPlans['proposals:share']);
    this.handle('proposals:getDetails', proposalPlans['proposals:getDetails']);

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
    this.handle('mcp:toggle', mcpPlans.toggle);

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
    this.handle('onecore:getMood', oneCorePlans.getMood);
    this.handle('onecore:updateMood', oneCorePlans.updateMood);
    this.handle('onecore:getOwnerId', oneCorePlans.getOwnerId);
    this.handle('onecore:getMyProfile', oneCorePlans.getMyProfile);

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
    initializeDevicePlans(this.handle.bind(this));
    initializeESP32ControlPlans(this.handle.bind(this));

    // QuicVC Discovery plans
    initializeQuicVCDiscoveryPlans(this.handle.bind(this));

    // Contact plans registered in registerPostInitPlans() after NodeOneCore is ready
    // registerContactPlans() is called from node-provisioning.ts

    // Assembly plans (Direct creation using assembly.core)
    registerDirectAssemblyPlans(this.handle.bind(this));

    // Transport plans
    this.handle('transport:createWebRTCInvite', transportPlans.createWebRTCInvite);
    this.handle('transport:completeWebRTCInvite', transportPlans.completeWebRTCInvite);
    this.handle('transport:acceptWebRTCInvite', transportPlans.acceptWebRTCInvite);
    this.handle('transport:cancelWebRTCInvite', transportPlans.cancelWebRTCInvite);

    // Local Models plans (embeddings, whisper, text generation)
    this.handle('localModels:list', localModelsPlans.list);
    this.handle('localModels:download', localModelsPlans.download);
    this.handle('localModels:delete', localModelsPlans.delete);
    this.handle('localModels:getStatus', localModelsPlans.getStatus);
    this.handle('inference:getStatus', localModelsPlans.getInferenceStatus);
    this.handle('localModels:whisperIsReady', localModelsPlans.whisperIsReady);
    this.handle('localModels:whisperTranscribe', localModelsPlans.whisperTranscribe);
    // Text generation
    this.handle('localModels:listTextGen', localModelsPlans.listTextGenModels);
    this.handle('localModels:loadTextGen', localModelsPlans.loadTextGenModel);
    this.handle('localModels:unloadTextGen', localModelsPlans.unloadTextGenModel);
    this.handle('localModels:chatTextGen', localModelsPlans.chatWithTextGen);
    this.handle('localModels:getTextGenStatus', localModelsPlans.getTextGenStatus);

    // TTS plans (text-to-speech via ONNXTTSProvider)
    // TTS is pre-loaded in module-registry-init.ts at startup
    // These handlers expose status to the Settings UI
    this.handle('tts:getStatus', ttsPlans['tts:getStatus']);
    this.handle('tts:load', ttsPlans['tts:load']);
    this.handle('tts:synthesize', ttsPlans['tts:synthesize']);
    this.handle('tts:preloadVoice', ttsPlans['tts:preloadVoice']);
    this.handle('tts:unload', ttsPlans['tts:unload']);
    this.handle('tts:supportsVoiceCloning', ttsPlans['tts:supportsVoiceCloning']);
    this.handle('tts:listModels', ttsPlans['tts:listModels']);
    this.handle('tts:download', ttsPlans['tts:download']);

    // Diagnostics plans (trace download for debugging)
    this.handle('diagnostics:getTrace', diagnosticsPlans['diagnostics:getTrace']);
    this.handle('diagnostics:clearTrace', diagnosticsPlans['diagnostics:clearTrace']);
    this.handle('diagnostics:getTraceSize', diagnosticsPlans['diagnostics:getTraceSize']);

    // Trace plans (AI message processing traces)
    this.handle('trace:getByMessageId', tracePlans.getByMessageId);

    // Instance plans (IoM/IoP instance management)
    this.handle('instance:getMyInstances', instancePlans.getMyInstances);
    this.handle('instance:getContactInstances', instancePlans.getContactInstances);
    this.handle('instance:getLocalInstance', instancePlans.getLocalInstance);
    this.handle('instance:getAllInstances', instancePlans.getAllInstances);
    this.handle('instance:updateName', instancePlans.updateName);

    // WhatsApp Baileys plans
    this.handle('baileys:connect', baileysPlans.connect);
    this.handle('baileys:waitForConnection', baileysPlans.waitForConnection);
    this.handle('baileys:disconnect', baileysPlans.disconnect);
    this.handle('baileys:unlink', baileysPlans.unlink);
    this.handle('baileys:getStatus', baileysPlans.getStatus);
    this.handle('baileys:requestPairingCode', baileysPlans.requestPairingCode);
    this.handle('baileys:getQRCode', baileysPlans.getQRCode);
    this.handle('baileys:getPairingCode', baileysPlans.getPairingCode);
    this.handle('baileys:sendMessage', baileysPlans.sendMessage);
    this.handle('baileys:sendMessageToJid', baileysPlans.sendMessageToJid);
    this.handle('baileys:getChats', baileysPlans.getChats);
    this.handle('baileys:setChatPreference', baileysPlans.setChatPreference);
    this.handle('baileys:setChatEnabled', baileysPlans.setChatEnabled);
    this.handle('baileys:confirmImport', baileysPlans.confirmImport);

    // Job manager plans
    this.handle('job:submit', jobPlans.submit);
    this.handle('job:cancel', jobPlans.cancel);
    this.handle('job:list', jobPlans.list);
    this.handle('job:getJob', jobPlans.getJob);

    // Marketplace plans (supply/demand matching)
    this.handle('marketplace:publishSupply', marketplacePlans['marketplace:publishSupply']);
    this.handle('marketplace:createDemand', marketplacePlans['marketplace:createDemand']);
    this.handle('marketplace:matchDemand', marketplacePlans['marketplace:matchDemand']);
    this.handle('marketplace:searchSupplies', marketplacePlans['marketplace:searchSupplies']);
    this.handle('marketplace:getMySupplies', marketplacePlans['marketplace:getMySupplies']);
    this.handle('marketplace:getMyDemands', marketplacePlans['marketplace:getMyDemands']);

    // Alert plans (dock badges, notifications)
    this.handle('alerts:updateDockBadge', alertPlans['alerts:updateDockBadge']);
    this.handle('alerts:clearDockBadge', alertPlans['alerts:clearDockBadge']);

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
    // Remove any existing handler if tracked in our plans map
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
          'action:init',
          'localModels:list',
          'localModels:download',
          'localModels:delete',
          'localModels:getStatus',
          'localModels:whisperIsReady',
          'localModels:whisperTranscribe',
          'localModels:listTextGen',
          'localModels:loadTextGen',
          'localModels:unloadTextGen',
          'localModels:chatTextGen',
          'localModels:getTextGenStatus',
          'inference:getStatus',
          'ai:generateAIName',
          'tts:getStatus',
          'tts:load',
          'tts:synthesize',
          'tts:preloadVoice',
          'tts:unload',
          'tts:supportsVoiceCloning',
          'diagnostics:getTrace',
          'diagnostics:clearTrace',
          'diagnostics:getTraceSize',
          'alerts:updateDockBadge',
          'alerts:clearDockBadge',
          // LLM config handlers - network-only, don't need ONE.core
          'llm:testOllamaConnection',
          'llm:setOllamaConfig',
          'llm:getOllamaConfig',
          'llm:getAvailableModels',
          'llm:deleteOllamaConfig',
          'llm:testConnectionAndDiscoverModels',
          'llmConfig:testConnection',
          'llmConfig:discoverOllamaModels',
          'llmConfig:getOllamaServers',
          'llmConfig:addOllamaServer',
          'llmConfig:updateOllamaServer',
          'llmConfig:removeOllamaServer',
          'llmConfig:setOllamaServerEnabled',
          'llmConfig:discoverAllOllamaModels'
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

    this.plans.set(channel, handler);
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

      // Clear device manager contacts
      deviceManager.devices.clear();
      await deviceManager.saveDevices();

      // Clear ALL ONE.core storage
      // Use runtime configuration path (respects --storage CLI arg)
      const storageDir = global.lamaConfig?.instance.directory || path.join(process.cwd(), 'OneDB');
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
      stateManager.clearState();

      // Properly shutdown Node ONE.core instance
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

    // Reset initialized flag so handlers can be re-registered on reload
    this.initialized = false;
    this.postInitRegistered = false;

    this.safeLog('[IPCController] Shutdown complete');
  }
}

export default new IPCController();