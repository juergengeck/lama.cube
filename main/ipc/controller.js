"use strict";
/**
 * Main IPC Controller (TypeScript Version)
 * Routes IPC messages to appropriate handlers
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var node_one_core_js_1 = require("../core/node-one-core.js");
// Import handlers (will be JS files initially, then migrated to TS)
var auth_js_1 = require("./handlers/auth.js");
var state_js_1 = require("./handlers/state.js");
var chat_js_1 = require("./handlers/chat.js");
var connection_js_1 = require("./handlers/connection.js");
var crypto_js_1 = require("./handlers/crypto.js");
var settings_js_1 = require("./handlers/settings.js");
var ai_js_1 = require("./handlers/ai.js");
var attachments_js_1 = require("./handlers/attachments.js");
// @ts-ignore - JS file with named export
var subjects_js_1 = require("./handlers/subjects.js");
var one_core_js_1 = require("./handlers/one-core.js");
// @ts-ignore - JS file with named export
var devices_js_1 = require("./handlers/devices.js");
var quicvc_discovery_js_1 = require("./handlers/quicvc-discovery.js");
// @ts-ignore - JS file with named export
var contacts_js_1 = require("./handlers/contacts.js");
var topicHandlers = require("./handlers/topics.js");
var topic_analysis_js_1 = require("./handlers/topic-analysis.js");
var wordCloudSettingsHandlers = require("./handlers/word-cloud-settings.js");
var keyword_detail_js_1 = require("./handlers/keyword-detail.js");
var audit_js_1 = require("./handlers/audit.js");
var export_js_1 = require("./handlers/export.js");
var feed_forward_js_1 = require("./handlers/feed-forward.js");
var llm_config_js_1 = require("./handlers/llm-config.js");
// @ts-ignore - TS file with named export
var proposals_js_1 = require("./handlers/proposals.js");
var mcp_js_1 = require("./handlers/mcp.js");
var IPCController = /** @class */ (function () {
    function IPCController() {
        this.handlers = new Map();
        this.mainWindow = null;
    }
    // Safe console methods that won't throw EPIPE errors
    IPCController.prototype.safeLog = function () {
        var _a, _b;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Skip logging entirely if mainWindow is destroyed
        if (this.mainWindow && ((_a = this.mainWindow) === null || _a === void 0 ? void 0 : _a.isDestroyed())) {
            return;
        }
        try {
            console.log.apply(console, args);
        }
        catch (err) {
            // Ignore EPIPE errors when renderer disconnects
            if (err.code !== 'EPIPE' && !((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('EPIPE'))) {
                // Try to at least log to stderr if stdout fails
                try {
                    process.stderr.write("[IPC] Log failed: ".concat(err.message, "\n"));
                }
                catch (_c) { }
            }
        }
    };
    IPCController.prototype.safeError = function () {
        var _a, _b;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Skip logging entirely if mainWindow is destroyed
        if (this.mainWindow && ((_a = this.mainWindow) === null || _a === void 0 ? void 0 : _a.isDestroyed())) {
            return;
        }
        try {
            console.error.apply(console, args);
        }
        catch (err) {
            // Ignore EPIPE errors
            if (err.code !== 'EPIPE' && !((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('EPIPE'))) {
                try {
                    process.stderr.write("[IPC] Error log failed: ".concat(err.message, "\n"));
                }
                catch (_c) { }
            }
        }
    };
    IPCController.prototype.initialize = function (mainWindow) {
        this.mainWindow = mainWindow;
        // Register all handlers
        this.registerHandlers();
        // Auto-initialize QuicVC discovery (waits for nodeOneCore)
        void (0, quicvc_discovery_js_1.autoInitializeDiscovery)();
        this.safeLog('[IPCController] Initialized with handlers');
    };
    IPCController.prototype.registerHandlers = function () {
        var _this = this;
        // Debug handler for browser logs
        this.handle('debug:log', function (event, message) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('[BROWSER DEBUG]', message);
                return [2 /*return*/, { success: true }];
            });
        }); });
        // Authentication handlers
        this.handle('auth:login', auth_js_1.default.login);
        this.handle('auth:register', auth_js_1.default.register);
        this.handle('auth:logout', auth_js_1.default.logout);
        this.handle('auth:check', auth_js_1.default.checkAuth);
        // State handlers
        this.handle('state:get', state_js_1.default.getState);
        this.handle('state:set', state_js_1.default.setState);
        this.handle('state:subscribe', state_js_1.default.subscribe);
        // Chat handlers
        this.handle('chat:sendMessage', chat_js_1.chatHandlers.sendMessage);
        this.handle('chat:getMessages', chat_js_1.chatHandlers.getMessages);
        this.handle('chat:createConversation', chat_js_1.chatHandlers.createConversation);
        this.handle('chat:getConversations', chat_js_1.chatHandlers.getConversations);
        this.handle('chat:getCurrentUser', chat_js_1.chatHandlers.getCurrentUser);
        this.handle('chat:addParticipants', chat_js_1.chatHandlers.addParticipants);
        this.handle('chat:clearConversation', chat_js_1.chatHandlers.clearConversation);
        this.handle('chat:uiReady', chat_js_1.chatHandlers.uiReady);
        this.handle('chat:editMessage', chat_js_1.chatHandlers.editMessage);
        this.handle('chat:deleteMessage', chat_js_1.chatHandlers.deleteMessage);
        this.handle('chat:getMessageHistory', chat_js_1.chatHandlers.getMessageHistory);
        this.handle('chat:exportMessageCredential', chat_js_1.chatHandlers.exportMessageCredential);
        this.handle('chat:verifyMessageAssertion', chat_js_1.chatHandlers.verifyMessageAssertion);
        // Audit handlers
        this.handle('audit:generateQR', audit_js_1.default.generateQR);
        this.handle('audit:createAttestation', audit_js_1.default.createAttestation);
        this.handle('audit:getAttestations', audit_js_1.default.getAttestations);
        this.handle('audit:exportTopic', audit_js_1.default.exportTopic);
        this.handle('audit:verifyAttestation', audit_js_1.default.verifyAttestation);
        // Test handler to manually trigger message updates
        this.handle('test:triggerMessageUpdate', function (event_1, _a) { return __awaiter(_this, [event_1, _a], void 0, function (event, _b) {
            var testData;
            var conversationId = _b.conversationId;
            return __generator(this, function (_c) {
                console.log('[TEST] Manually triggering message update for:', conversationId);
                testData = {
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
                return [2 /*return*/, { success: true, data: testData }];
            });
        }); });
        // Connection handlers (pairing, instances, connections)
        this.handle('connection:getInstances', connection_js_1.default.getInstances);
        this.handle('connection:getConnectionStatus', connection_js_1.default.getConnectionStatus);
        this.handle('connection:createPairingInvitation', connection_js_1.default.createPairingInvitation);
        this.handle('connection:acceptPairingInvitation', connection_js_1.default.acceptPairingInvitation);
        this.handle('connection:getDataStats', connection_js_1.default.getDataStats);
        // Crypto handlers
        this.handle('crypto:getKeys', crypto_js_1.default.getKeys);
        this.handle('crypto:getCertificates', crypto_js_1.default.getCertificates);
        this.handle('crypto:export', crypto_js_1.default.exportCryptoObject);
        // Settings handlers
        this.handle('settings:get', settings_js_1.default.getSetting);
        this.handle('settings:set', settings_js_1.default.setSetting);
        this.handle('settings:getAll', settings_js_1.default.getSettings);
        this.handle('settings:syncIoM', settings_js_1.default.syncIoMSettings);
        this.handle('settings:subscribe', settings_js_1.default.subscribeToSettings);
        this.handle('settings:getConfig', settings_js_1.default.getInstanceConfig);
        // AI/LLM handlers
        this.handle('ai:chat', ai_js_1.default.chat);
        this.handle('ai:getModels', ai_js_1.default.getModels);
        this.handle('ai:setDefaultModel', ai_js_1.default.setDefaultModel);
        this.handle('ai:setApiKey', ai_js_1.default.setApiKey);
        this.handle('ai:getTools', ai_js_1.default.getTools);
        this.handle('ai:executeTool', ai_js_1.default.executeTool);
        this.handle('ai:initialize', ai_js_1.default.initializeLLM);
        this.handle('ai:initializeLLM', ai_js_1.default.initializeLLM); // Alias for UI compatibility
        this.handle('ai:getOrCreateContact', ai_js_1.default.getOrCreateContact);
        this.handle('ai:discoverClaudeModels', ai_js_1.default.discoverClaudeModels);
        this.handle('ai:debugTools', ai_js_1.default.debugTools);
        this.handle('llm:testApiKey', ai_js_1.default.testApiKey);
        this.handle('ai:getDefaultModel', ai_js_1.default['ai:getDefaultModel']);
        // LLM Configuration handlers (network Ollama support)
        (0, llm_config_js_1.registerLlmConfigHandlers)();
        // Legacy alias for UI compatibility
        this.handle('llm:getConfig', function (event, params) { return __awaiter(_this, void 0, void 0, function () {
            var handleGetOllamaConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./handlers/llm-config.js'); })];
                    case 1:
                        handleGetOllamaConfig = (_a.sent()).handleGetOllamaConfig;
                        return [2 /*return*/, handleGetOllamaConfig(event, params || {})];
                }
            });
        }); });
        // Attachment handlers
        this.handle('attachment:store', attachments_js_1.default.storeAttachment);
        this.handle('attachment:get', attachments_js_1.default.getAttachment);
        this.handle('attachment:getMetadata', attachments_js_1.default.getAttachmentMetadata);
        this.handle('attachment:storeMultiple', attachments_js_1.default.storeAttachments);
        // Subject handlers
        this.handle('subjects:create', subjects_js_1.subjectHandlers['subjects:create']);
        this.handle('subjects:attach', subjects_js_1.subjectHandlers['subjects:attach']);
        this.handle('subjects:getForContent', subjects_js_1.subjectHandlers['subjects:getForContent']);
        this.handle('subjects:getAll', subjects_js_1.subjectHandlers['subjects:getAll']);
        this.handle('subjects:search', subjects_js_1.subjectHandlers['subjects:search']);
        this.handle('subjects:getResonance', subjects_js_1.subjectHandlers['subjects:getResonance']);
        this.handle('subjects:extract', subjects_js_1.subjectHandlers['subjects:extract']);
        // Topic Analysis handlers
        this.handle('topicAnalysis:analyzeMessages', topic_analysis_js_1.default.analyzeMessages);
        this.handle('topicAnalysis:getSubjects', topic_analysis_js_1.default.getSubjects);
        this.handle('topicAnalysis:getSummary', topic_analysis_js_1.default.getSummary);
        this.handle('topicAnalysis:updateSummary', topic_analysis_js_1.default.updateSummary);
        this.handle('topicAnalysis:extractKeywords', topic_analysis_js_1.default.extractKeywords);
        this.handle('topicAnalysis:mergeSubjects', topic_analysis_js_1.default.mergeSubjects);
        this.handle('topicAnalysis:extractRealtimeKeywords', topic_analysis_js_1.default.extractRealtimeKeywords);
        this.handle('topicAnalysis:extractConversationKeywords', topic_analysis_js_1.default.extractConversationKeywords);
        this.handle('topicAnalysis:getKeywords', topic_analysis_js_1.default.getKeywords);
        // Word Cloud Settings handlers
        this.handle('wordCloudSettings:getSettings', wordCloudSettingsHandlers.getWordCloudSettings);
        this.handle('wordCloudSettings:updateSettings', wordCloudSettingsHandlers.updateWordCloudSettings);
        this.handle('wordCloudSettings:resetSettings', wordCloudSettingsHandlers.resetWordCloudSettings);
        // Keyword Detail handlers
        this.handle('keywordDetail:getKeywordDetails', keyword_detail_js_1.default.getKeywordDetails);
        this.handle('keywordDetail:updateKeywordAccessState', keyword_detail_js_1.default.updateKeywordAccessState);
        // Proposal handlers
        this.handle('proposals:getForTopic', proposals_js_1.proposalHandlers['proposals:getForTopic']);
        this.handle('proposals:updateConfig', proposals_js_1.proposalHandlers['proposals:updateConfig']);
        this.handle('proposals:getConfig', proposals_js_1.proposalHandlers['proposals:getConfig']);
        this.handle('proposals:dismiss', proposals_js_1.proposalHandlers['proposals:dismiss']);
        this.handle('proposals:share', proposals_js_1.proposalHandlers['proposals:share']);
        // MCP handlers
        this.handle('mcp:listServers', mcp_js_1.default.listServers);
        this.handle('mcp:addServer', mcp_js_1.default.addServer);
        this.handle('mcp:updateServer', mcp_js_1.default.updateServer);
        this.handle('mcp:removeServer', mcp_js_1.default.removeServer);
        // Export handlers
        this.handle('export:file', export_js_1.default.exportFile);
        this.handle('export:fileAuto', export_js_1.default.exportFileAuto);
        this.handle('export:message', export_js_1.default.exportMessage);
        this.handle('export:htmlWithMicrodata', export_js_1.default.exportHtmlWithMicrodata);
        // Feed-Forward handlers
        this.handle('feedForward:createSupply', feed_forward_js_1.default['feedForward:createSupply']);
        this.handle('feedForward:createDemand', feed_forward_js_1.default['feedForward:createDemand']);
        this.handle('feedForward:matchSupplyDemand', feed_forward_js_1.default['feedForward:matchSupplyDemand']);
        this.handle('feedForward:updateTrust', feed_forward_js_1.default['feedForward:updateTrust']);
        this.handle('feedForward:getCorpusStream', feed_forward_js_1.default['feedForward:getCorpusStream']);
        this.handle('feedForward:enableSharing', feed_forward_js_1.default['feedForward:enableSharing']);
        this.handle('feedForward:getTrustScore', feed_forward_js_1.default['feedForward:getTrustScore']);
        // ONE.core handlers
        this.handle('onecore:initializeNode', one_core_js_1.default.initializeNode);
        this.handle('onecore:restartNode', one_core_js_1.default.restartNode);
        this.handle('onecore:createLocalInvite', one_core_js_1.default.createLocalInvite);
        this.handle('onecore:createBrowserPairingInvite', one_core_js_1.default.createBrowserPairingInvite);
        this.handle('onecore:getBrowserPairingInvite', one_core_js_1.default.getBrowserPairingInvite);
        this.handle('onecore:createNetworkInvite', one_core_js_1.default.createNetworkInvite);
        this.handle('onecore:listInvites', one_core_js_1.default.listInvites);
        this.handle('onecore:revokeInvite', one_core_js_1.default.revokeInvite);
        this.handle('onecore:getNodeStatus', one_core_js_1.default.getNodeStatus);
        this.handle('onecore:setNodeState', one_core_js_1.default.setNodeState);
        this.handle('onecore:getNodeState', one_core_js_1.default.getNodeState);
        this.handle('onecore:getNodeConfig', one_core_js_1.default.getNodeConfig);
        this.handle('onecore:testSettingsReplication', one_core_js_1.default.testSettingsReplication);
        this.handle('onecore:syncConnectionSettings', one_core_js_1.default.syncConnectionSettings);
        this.handle('onecore:getCredentialsStatus', one_core_js_1.default.getCredentialsStatus);
        this.handle('onecore:getContacts', one_core_js_1.default.getContacts);
        this.handle('onecore:getPeerList', one_core_js_1.default.getPeerList);
        this.handle('onecore:getOrCreateTopicForContact', topicHandlers.getOrCreateTopicForContact);
        this.handle('onecore:secureStore', one_core_js_1.default.secureStore);
        this.handle('onecore:secureRetrieve', one_core_js_1.default.secureRetrieve);
        this.handle('onecore:clearStorage', one_core_js_1.default.clearStorage);
        this.handle('onecore:hasPersonName', one_core_js_1.default.hasPersonName);
        this.handle('onecore:setPersonName', one_core_js_1.default.setPersonName);
        this.handle('onecore:updateMood', one_core_js_1.default.updateMood);
        // Topic feedback handler
        this.handle('topics:recordFeedback', topicHandlers.recordSubjectFeedback);
        // Debug handler for owner ID comparison
        this.handle('debug', function (event, data) {
            if (data.type === 'browser-owner-id') {
                console.log('[DEBUG] Browser Owner ID received:', data.ownerId);
                console.log('[DEBUG] Timestamp:', data.timestamp);
            }
            else {
                console.log('[DEBUG]', data);
            }
        });
        // Device handlers
        (0, devices_js_1.initializeDeviceHandlers)();
        // QuicVC Discovery handlers
        (0, quicvc_discovery_js_1.initializeQuicVCDiscoveryHandlers)();
        // Contact handlers
        (0, contacts_js_1.registerContactHandlers)();
        // Note: app:clearData is handled in lama-electron-shadcn.js
        // Action handlers (user-initiated actions)
        this.handle('action:init', this.handleAction('init'));
        this.handle('action:login', this.handleAction('login'));
        this.handle('action:logout', this.handleAction('logout'));
        this.handle('action:sendMessage', this.handleAction('sendMessage'));
        // Query handlers (request state)
        this.handle('query:getState', this.handleQuery('getState'));
        this.handle('query:getConversation', this.handleQuery('getConversation'));
        this.handle('query:getMessages', this.handleQuery('getMessages'));
    };
    IPCController.prototype.handle = function (channel, handler) {
        var _this = this;
        var _a;
        // Remove any existing handler
        if (this.handlers.has(channel)) {
            electron_1.ipcMain.removeHandler(channel);
        }
        // Register new handler with error handling and initialization checks
        electron_1.ipcMain.handle(channel, function (event) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () {
                var allowedBeforeInit, error, result, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            this.safeLog("[IPC] Handling: ".concat(channel), args);
                            allowedBeforeInit = [
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
                            if (!allowedBeforeInit.includes(channel) && !node_one_core_js_1.default.initialized) {
                                error = "NodeOneCore not initialized yet. Please log in first. (Called: ".concat(channel, ")");
                                this.safeError("[IPC] ".concat(error));
                                throw new Error(error);
                            }
                            return [4 /*yield*/, handler.apply(void 0, __spreadArray([event], args, false))];
                        case 1:
                            result = _a.sent();
                            // Don't double-wrap if handler already returns success/error format
                            if (result && typeof result === 'object' && 'success' in result) {
                                return [2 /*return*/, result];
                            }
                            return [2 /*return*/, { success: true, data: result }];
                        case 2:
                            error_1 = _a.sent();
                            this.safeError("[IPC] Error in ".concat(channel, ":"), error_1);
                            return [2 /*return*/, {
                                    success: false,
                                    error: error_1.message || 'Unknown error'
                                }];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        });
        (_a = this.handlers) === null || _a === void 0 ? void 0 : _a.set(channel, handler);
    };
    // Generic action handler wrapper
    IPCController.prototype.handleAction = function (actionType) {
        var _this = this;
        return function (event, payload) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.safeLog("[IPC] Action: ".concat(actionType), payload);
                        _a = actionType;
                        switch (_a) {
                            case 'init': return [3 /*break*/, 1];
                            case 'login': return [3 /*break*/, 2];
                            case 'logout': return [3 /*break*/, 4];
                            case 'sendMessage': return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 8];
                    case 1: 
                    // Platform is already initialized in main process
                    return [2 /*return*/, { initialized: true, platform: 'electron' }];
                    case 2: return [4 /*yield*/, auth_js_1.default.login(event, payload)];
                    case 3: return [2 /*return*/, _b.sent()];
                    case 4: return [4 /*yield*/, auth_js_1.default.logout(event)];
                    case 5: return [2 /*return*/, _b.sent()];
                    case 6: return [4 /*yield*/, chat_js_1.chatHandlers.sendMessage(event, payload)];
                    case 7: return [2 /*return*/, _b.sent()];
                    case 8: throw new Error("Unknown action: ".concat(actionType));
                }
            });
        }); };
    };
    // Generic query handler wrapper
    IPCController.prototype.handleQuery = function (queryType) {
        var _this = this;
        return function (event, params) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.safeLog("[IPC] Query: ".concat(queryType), params);
                        _a = queryType;
                        switch (_a) {
                            case 'getState': return [3 /*break*/, 1];
                            case 'getConversation': return [3 /*break*/, 3];
                            case 'getMessages': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: return [4 /*yield*/, state_js_1.default.getState(event, params)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [4 /*yield*/, chat_js_1.chatHandlers.getConversation(event, params)];
                    case 4: return [2 /*return*/, _b.sent()];
                    case 5: return [4 /*yield*/, chat_js_1.chatHandlers.getMessages(event, params)];
                    case 6: return [2 /*return*/, _b.sent()];
                    case 7: throw new Error("Unknown query: ".concat(queryType));
                }
            });
        }); };
    };
    // Send update to renderer
    IPCController.prototype.sendUpdate = function (channel, data) {
        var _a, _b;
        if (this.mainWindow && !((_a = this.mainWindow) === null || _a === void 0 ? void 0 : _a.isDestroyed())) {
            (_b = this.mainWindow) === null || _b === void 0 ? void 0 : _b.webContents.send(channel, data);
        }
    };
    // Forward console logs to renderer
    IPCController.prototype.sendLogToRenderer = function (level) {
        var _a, _b;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.mainWindow && !((_a = this.mainWindow) === null || _a === void 0 ? void 0 : _a.isDestroyed())) {
            (_b = this.mainWindow) === null || _b === void 0 ? void 0 : _b.webContents.send('update:mainProcessLog', {
                level: level,
                message: args.join(' '),
                timestamp: Date.now()
            });
        }
    };
    // Broadcast state change to renderer
    IPCController.prototype.broadcastStateChange = function (path, newValue) {
        this.sendUpdate('update:stateChanged', {
            path: path,
            value: newValue,
            timestamp: Date.now()
        });
    };
    IPCController.prototype.handleClearData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fs, path, deviceManager, storageDir, storageDirs, _i, storageDirs_1, dir, error_2, stateManager, nodeOneCore_1, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 15, , 16]);
                        this.safeLog('[IPCController] Clearing app data...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
                    case 1:
                        fs = _b.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('path'); })];
                    case 2:
                        path = _b.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../core/device-manager.js'); })];
                    case 3:
                        deviceManager = (_b.sent()).default;
                        deviceManager.devices.clear();
                        return [4 /*yield*/, deviceManager.saveDevices()];
                    case 4:
                        _b.sent();
                        storageDir = ((_a = global.lamaConfig) === null || _a === void 0 ? void 0 : _a.instance.directory) || path.join(process.cwd(), 'OneDB');
                        storageDirs = [storageDir];
                        _i = 0, storageDirs_1 = storageDirs;
                        _b.label = 5;
                    case 5:
                        if (!(_i < storageDirs_1.length)) return [3 /*break*/, 10];
                        dir = storageDirs_1[_i];
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, fs.promises.rm(dir, { recursive: true, force: true })];
                    case 7:
                        _b.sent();
                        this.safeLog("[IPCController] Cleared storage: ".concat(dir));
                        return [3 /*break*/, 9];
                    case 8:
                        error_2 = _b.sent();
                        // Directory might not exist, which is fine
                        if (error_2.code !== 'ENOENT') {
                            this.safeError("[IPCController] Error clearing ".concat(dir, ":"), error_2);
                        }
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 5];
                    case 10: return [4 /*yield*/, Promise.resolve().then(function () { return require('../state/manager.js'); })];
                    case 11:
                        stateManager = (_b.sent()).default;
                        stateManager.clearState();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../core/node-one-core.js'); })];
                    case 12:
                        nodeOneCore_1 = (_b.sent()).default;
                        if (!nodeOneCore_1.initialized) return [3 /*break*/, 14];
                        this.safeLog('[IPCController] Shutting down Node ONE.core instance...');
                        return [4 /*yield*/, nodeOneCore_1.shutdown()];
                    case 13:
                        _b.sent();
                        this.safeLog('[IPCController] Node ONE.core instance shut down');
                        _b.label = 14;
                    case 14:
                        this.safeLog('[IPCController] App data cleared, ready for fresh start');
                        return [2 /*return*/, { success: true }];
                    case 15:
                        error_3 = _b.sent();
                        this.safeError('[IPCController] Failed to clear app data:', error_3);
                        return [2 /*return*/, { success: false, error: error_3.message }];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    IPCController.prototype.shutdown = function () {
        // Remove all handlers
        this.handlers.forEach(function (handler, channel) {
            electron_1.ipcMain.removeHandler(channel);
        });
        this.handlers.clear();
        this.safeLog('[IPCController] Shutdown complete');
    };
    return IPCController;
}());
exports.default = new IPCController();
