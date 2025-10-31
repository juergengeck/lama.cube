"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Node Instance Provisioning
 * Receives provisioning from browser instance and initializes
 */
var electron_1 = require("electron");
var ipcMain = electron_1.default.ipcMain;
var node_one_core_js_1 = require("../core/node-one-core.js");
var manager_js_1 = require("../state/manager.js");
var NodeProvisioning = /** @class */ (function () {
    function NodeProvisioning() {
        this.user = null;
    }
    NodeProvisioning.prototype.initialize = function () {
        var _this = this;
        // Listen for provisioning requests from browser
        ipcMain.handle('provision:node', function (event, provisioningData) { return __awaiter(_this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodeProvisioning] IPC handler invoked with:', JSON.stringify(provisioningData));
                        return [4 /*yield*/, this.provision(provisioningData)];
                    case 1:
                        result = _a.sent();
                        console.log('[NodeProvisioning] IPC returning result:', JSON.stringify(result));
                        return [2 /*return*/, result];
                }
            });
        }); });
        console.log('[NodeProvisioning] Listening for provisioning requests');
    };
    NodeProvisioning.prototype.provision = function (provisioningData) {
        return __awaiter(this, void 0, void 0, function () {
            var nodeInfo, getInstanceIdHash, getDefaultKeys, ProfileModel, instanceId_1, personId, personKeys, instanceKeys, commServerUrl, endpoint, me, profile, existingIndex, error_1, pairingInvite, invitation, error_2, pairingInvite, invitation, error_3, getInstanceIdHash, getDefaultKeys, ProfileModel, instanceId_2, personId, personKeys, instanceKeys, commServerUrl, endpoint, me, profile, existingIndex, error_4, error_5, nodeOwnerId, llmManager, models, defaultModel, error_6, error_7;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[NodeProvisioning] Received provisioning request');
                        nodeInfo = node_one_core_js_1.default.getInfo();
                        if (!(nodeInfo.initialized && nodeInfo.ownerId)) return [3 /*break*/, 20];
                        console.log('[NodeProvisioning] Node already fully initialized');
                        // Create profile with OneInstanceEndpoint for browser to discover
                        console.log('[NodeProvisioning] Creating profile with OneInstanceEndpoint for browser discovery');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 13, , 14]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 2:
                        getInstanceIdHash = (_c.sent()).getInstanceIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 3:
                        getDefaultKeys = (_c.sent()).getDefaultKeys;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/ProfileModel.js'); })];
                    case 4:
                        ProfileModel = (_c.sent()).default;
                        instanceId_1 = getInstanceIdHash();
                        personId = nodeInfo.ownerId;
                        return [4 /*yield*/, getDefaultKeys(personId)];
                    case 5:
                        personKeys = _c.sent();
                        return [4 /*yield*/, getDefaultKeys(instanceId_1)
                            // Get commServerUrl from nodeOneCore directly
                        ];
                    case 6:
                        instanceKeys = _c.sent();
                        commServerUrl = node_one_core_js_1.default.commServerUrl || 'wss://comm10.dev.refinio.one';
                        endpoint = {
                            $type$: 'OneInstanceEndpoint',
                            personId: personId,
                            instanceId: instanceId_1,
                            personKeys: personKeys,
                            instanceKeys: instanceKeys,
                            url: commServerUrl // Use configured commserver URL
                        };
                        return [4 /*yield*/, node_one_core_js_1.default.leuteModel.me()];
                    case 7:
                        me = _c.sent();
                        console.log('[NodeProvisioning] Getting main profile for Node person:', personId);
                        return [4 /*yield*/, me.mainProfile()];
                    case 8:
                        profile = _c.sent();
                        if (!!profile) return [3 /*break*/, 10];
                        // Create profile on-the-fly
                        console.log('[NodeProvisioning] No existing profile found, creating new one...');
                        return [4 /*yield*/, ProfileModel.constructWithNewProfile(personId, personId, 'default')];
                    case 9:
                        profile = _c.sent();
                        console.log('[NodeProvisioning] Created new profile for Node instance:', profile.idHash);
                        return [3 /*break*/, 11];
                    case 10:
                        console.log('[NodeProvisioning] Using existing profile:', profile.idHash);
                        _c.label = 11;
                    case 11:
                        // Ensure communicationEndpoints array exists
                        if (!profile.communicationEndpoints) {
                            profile.communicationEndpoints = [];
                            console.log('[NodeProvisioning] Initialized empty communicationEndpoints array');
                        }
                        else {
                            console.log('[NodeProvisioning] Existing communicationEndpoints:', profile.communicationEndpoints.length, 'endpoints');
                        }
                        existingIndex = profile.communicationEndpoints.findIndex(function (ep) { return ep.$type$ === 'OneInstanceEndpoint' && ep.instanceId === instanceId_1; });
                        if (existingIndex >= 0) {
                            profile.communicationEndpoints[existingIndex] = endpoint;
                            console.log('[NodeProvisioning] Updated existing OneInstanceEndpoint at index:', existingIndex);
                        }
                        else {
                            profile.communicationEndpoints.push(endpoint);
                            console.log('[NodeProvisioning] Added new OneInstanceEndpoint to profile');
                            console.log('[NodeProvisioning] Total endpoints now:', profile.communicationEndpoints.length);
                        }
                        console.log('[NodeProvisioning] Saving profile with endpoint...');
                        return [4 /*yield*/, profile.saveAndLoad()];
                    case 12:
                        _c.sent();
                        console.log('[NodeProvisioning] ✅ Profile saved successfully with OneInstanceEndpoint');
                        console.log('[NodeProvisioning] Node person ID:', personId === null || personId === void 0 ? void 0 : personId.substring(0, 8));
                        console.log('[NodeProvisioning] Endpoint URL:', endpoint.url);
                        return [3 /*break*/, 14];
                    case 13:
                        error_1 = _c.sent();
                        console.error('[NodeProvisioning] Failed to create profile with endpoint:', error_1);
                        return [3 /*break*/, 14];
                    case 14:
                        pairingInvite = null;
                        _c.label = 15;
                    case 15:
                        _c.trys.push([15, 18, , 19]);
                        if (!(node_one_core_js_1.default.connectionsModel && node_one_core_js_1.default.connectionsModel.pairing)) return [3 /*break*/, 17];
                        console.log('[NodeProvisioning] Creating pairing invitation for browser connection...');
                        return [4 /*yield*/, node_one_core_js_1.default.connectionsModel.pairing.createInvitation()
                            // Use CommServer for pairing
                        ];
                    case 16:
                        invitation = _c.sent();
                        // Use CommServer for pairing
                        pairingInvite = invitation; // Don't override URL, use what the invitation provides
                        console.log('[NodeProvisioning] Created pairing invitation for already-initialized Node');
                        console.log('[NodeProvisioning] Pairing token:', pairingInvite.token);
                        _c.label = 17;
                    case 17: return [3 /*break*/, 19];
                    case 18:
                        error_2 = _c.sent();
                        console.error('[NodeProvisioning] Failed to create pairing invitation:', error_2);
                        return [3 /*break*/, 19];
                    case 19:
                        console.log('[NodeProvisioning] IPC returning result:', JSON.stringify({
                            success: true,
                            nodeId: nodeInfo.ownerId,
                            endpoint: node_one_core_js_1.default.commServerUrl || 'wss://comm10.dev.refinio.one',
                            pairingInvite: pairingInvite
                        }, null, 2));
                        return [2 /*return*/, {
                                success: true,
                                nodeId: nodeInfo.ownerId,
                                endpoint: node_one_core_js_1.default.commServerUrl || 'wss://comm10.dev.refinio.one',
                                pairingInvite: pairingInvite // Include pairing invitation
                            }];
                    case 20:
                        if (nodeInfo.initialized && !nodeInfo.ownerId) {
                            console.log('[NodeProvisioning] Node initialized but no owner ID yet, re-initializing...');
                            // Continue with initialization
                        }
                        _c.label = 21;
                    case 21:
                        _c.trys.push([21, 53, , 54]);
                        // Simple validation - just need username and password
                        if (!((_a = provisioningData === null || provisioningData === void 0 ? void 0 : provisioningData.user) === null || _a === void 0 ? void 0 : _a.name) || !((_b = provisioningData === null || provisioningData === void 0 ? void 0 : provisioningData.user) === null || _b === void 0 ? void 0 : _b.password)) {
                            throw new Error('Username and password required for provisioning');
                        }
                        // If we're already provisioning, don't start another one
                        if (this.user && this.user.name === provisioningData.user.name) {
                            console.log('[NodeProvisioning] Already provisioning for user:', provisioningData.user.name);
                            throw new Error('Provisioning already in progress');
                        }
                        // Store user info (ID will be set after ONE.core initialization)
                        this.user = provisioningData.user;
                        // Update state manager with authenticated user (ID will be updated after init)
                        manager_js_1.default.setUser({
                            id: this.user.id || null, // ID comes from ONE.core after init
                            name: this.user.name,
                            email: this.user.email || "".concat(this.user.name, "@lama.local")
                        });
                        console.log('[NodeProvisioning] Updated state manager with user:', this.user.name);
                        // Initialize Node instance with provisioned identity
                        return [4 /*yield*/, this.initializeNodeInstance(provisioningData)];
                    case 22:
                        // Initialize Node instance with provisioned identity
                        _c.sent();
                        console.log('[NodeProvisioning] Node instance provisioned successfully');
                        pairingInvite = null;
                        _c.label = 23;
                    case 23:
                        _c.trys.push([23, 26, , 27]);
                        if (!(node_one_core_js_1.default.connectionsModel && node_one_core_js_1.default.connectionsModel.pairing)) return [3 /*break*/, 25];
                        console.log('[NodeProvisioning] Creating pairing invitation through Node\'s pairing manager...');
                        return [4 /*yield*/, node_one_core_js_1.default.connectionsModel.pairing.createInvitation()
                            // Use commserver URL from nodeOneCore for the invitation
                        ];
                    case 24:
                        invitation = _c.sent();
                        // Use commserver URL from nodeOneCore for the invitation
                        pairingInvite = __assign(__assign({}, invitation), { url: node_one_core_js_1.default.commServerUrl || 'wss://comm10.dev.refinio.one' // Use configured commserver URL
                         });
                        console.log('[NodeProvisioning] PAIRING INVITATION:', JSON.stringify(pairingInvite, null, 2));
                        console.log('[NodeProvisioning] Created invitation through proper API with token:', pairingInvite.token);
                        console.log('[NodeProvisioning] Pairing invitation ready at:', pairingInvite.url);
                        _c.label = 25;
                    case 25: return [3 /*break*/, 27];
                    case 26:
                        error_3 = _c.sent();
                        console.error('[NodeProvisioning] Failed to create pairing invitation:', error_3);
                        return [3 /*break*/, 27];
                    case 27:
                        // Create profile with OneInstanceEndpoint so the instance can be paired
                        console.log('[NodeProvisioning] Creating profile with OneInstanceEndpoint...');
                        _c.label = 28;
                    case 28:
                        _c.trys.push([28, 40, , 41]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 29:
                        getInstanceIdHash = (_c.sent()).getInstanceIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 30:
                        getDefaultKeys = (_c.sent()).getDefaultKeys;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/ProfileModel.js'); })];
                    case 31:
                        ProfileModel = (_c.sent()).default;
                        instanceId_2 = getInstanceIdHash();
                        personId = node_one_core_js_1.default.ownerId;
                        return [4 /*yield*/, getDefaultKeys(personId)];
                    case 32:
                        personKeys = _c.sent();
                        return [4 /*yield*/, getDefaultKeys(instanceId_2)
                            // Get commServerUrl from nodeOneCore
                        ];
                    case 33:
                        instanceKeys = _c.sent();
                        commServerUrl = node_one_core_js_1.default.commServerUrl || 'wss://comm10.dev.refinio.one';
                        endpoint = {
                            $type$: 'OneInstanceEndpoint',
                            personId: personId,
                            instanceId: instanceId_2,
                            personKeys: personKeys,
                            instanceKeys: instanceKeys,
                            url: commServerUrl
                        };
                        return [4 /*yield*/, node_one_core_js_1.default.leuteModel.me()];
                    case 34:
                        me = _c.sent();
                        console.log('[NodeProvisioning] Getting main profile for Node person:', personId);
                        return [4 /*yield*/, me.mainProfile()];
                    case 35:
                        profile = _c.sent();
                        if (!!profile) return [3 /*break*/, 37];
                        // Create profile on-the-fly
                        console.log('[NodeProvisioning] No existing profile found, creating new one...');
                        return [4 /*yield*/, ProfileModel.constructWithNewProfile(personId, personId, 'default')];
                    case 36:
                        profile = _c.sent();
                        console.log('[NodeProvisioning] Created new profile for Node instance:', profile.idHash);
                        return [3 /*break*/, 38];
                    case 37:
                        console.log('[NodeProvisioning] Using existing profile:', profile.idHash);
                        _c.label = 38;
                    case 38:
                        // Initialize communicationEndpoints array if it doesn't exist
                        if (!profile.communicationEndpoints) {
                            profile.communicationEndpoints = [];
                            console.log('[NodeProvisioning] Initialized empty communicationEndpoints array');
                        }
                        else {
                            console.log('[NodeProvisioning] Existing communicationEndpoints:', profile.communicationEndpoints.length, 'endpoints');
                        }
                        existingIndex = profile.communicationEndpoints.findIndex(function (ep) { return ep.$type$ === 'OneInstanceEndpoint' && ep.instanceId === instanceId_2; });
                        if (existingIndex >= 0) {
                            profile.communicationEndpoints[existingIndex] = endpoint;
                            console.log('[NodeProvisioning] Updated existing OneInstanceEndpoint at index:', existingIndex);
                        }
                        else {
                            profile.communicationEndpoints.push(endpoint);
                            console.log('[NodeProvisioning] Added new OneInstanceEndpoint to profile');
                            console.log('[NodeProvisioning] Total endpoints now:', profile.communicationEndpoints.length);
                        }
                        console.log('[NodeProvisioning] Saving profile with endpoint...');
                        return [4 /*yield*/, profile.saveAndLoad()];
                    case 39:
                        _c.sent();
                        console.log('[NodeProvisioning] ✅ Profile saved successfully with OneInstanceEndpoint');
                        console.log('[NodeProvisioning] Node person ID:', personId === null || personId === void 0 ? void 0 : personId.substring(0, 8));
                        console.log('[NodeProvisioning] Endpoint URL:', endpoint.url);
                        return [3 /*break*/, 41];
                    case 40:
                        error_4 = _c.sent();
                        console.error('[NodeProvisioning] Failed to create profile with endpoint:', error_4);
                        return [3 /*break*/, 41];
                    case 41:
                        if (!provisioningData.browserInstance) return [3 /*break*/, 45];
                        console.log('[NodeProvisioning] Registering browser instance for federation...');
                        _c.label = 42;
                    case 42:
                        _c.trys.push([42, 44, , 45]);
                        return [4 /*yield*/, node_one_core_js_1.default.federationAPI.registerBrowserInstance(provisioningData.browserInstance)];
                    case 43:
                        _c.sent();
                        console.log('[NodeProvisioning] Browser instance registered with contact and endpoint');
                        return [3 /*break*/, 45];
                    case 44:
                        error_5 = _c.sent();
                        console.error('[NodeProvisioning] Failed to register browser instance:', error_5);
                        return [3 /*break*/, 45];
                    case 45:
                        // CHUM sync is handled automatically by ONE.core when instances are connected via IoM
                        console.log('[NodeProvisioning] CHUM sync handled by ONE.core automatically');
                        nodeOwnerId = node_one_core_js_1.default.ownerId || node_one_core_js_1.default.getInfo().ownerId;
                        // Update state manager with the actual owner ID
                        if (nodeOwnerId) {
                            manager_js_1.default.setUser({
                                id: nodeOwnerId,
                                name: this.user.name,
                                email: this.user.email || "".concat(this.user.name, "@lama.local")
                            });
                        }
                        // Create default AI chats after initialization
                        console.log('[NodeProvisioning] Setting up default AI chats...');
                        _c.label = 46;
                    case 46:
                        _c.trys.push([46, 51, , 52]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../services/llm-manager-singleton.js'); })];
                    case 47:
                        llmManager = (_c.sent()).default;
                        models = llmManager.getModels();
                        if (!(models && models.length > 0)) return [3 /*break*/, 49];
                        defaultModel = models[0].id;
                        console.log('[NodeProvisioning] Creating default chats with model:', defaultModel);
                        return [4 /*yield*/, node_one_core_js_1.default.aiAssistantModel.setDefaultModel(defaultModel)];
                    case 48:
                        _c.sent();
                        console.log('[NodeProvisioning] ✅ Default AI chats created');
                        return [3 /*break*/, 50];
                    case 49:
                        console.log('[NodeProvisioning] No models available, skipping default chats');
                        _c.label = 50;
                    case 50: return [3 /*break*/, 52];
                    case 51:
                        error_6 = _c.sent();
                        console.error('[NodeProvisioning] Failed to create default chats:', error_6);
                        return [3 /*break*/, 52];
                    case 52: return [2 /*return*/, {
                            success: true,
                            nodeId: nodeOwnerId || 'node-' + Date.now(),
                            endpoint: node_one_core_js_1.default.commServerUrl || 'wss://comm10.dev.refinio.one',
                            pairingInvite: pairingInvite // Include pairing invitation
                        }];
                    case 53:
                        error_7 = _c.sent();
                        console.error('[NodeProvisioning] Provisioning failed:', error_7);
                        // Reset state on failure
                        this.user = null;
                        return [2 /*return*/, {
                                success: false,
                                error: error_7.message
                            }];
                    case 54: return [2 /*return*/];
                }
            });
        });
    };
    NodeProvisioning.prototype.validateCredential = function (credential) {
        var _a;
        // Validate credential structure
        if (!credential || !credential.credentialSubject) {
            return false;
        }
        // Check credential type
        if (!((_a = credential.type) === null || _a === void 0 ? void 0 : _a.includes('NodeProvisioningCredential'))) {
            return false;
        }
        // Check expiration
        var expiry = new Date(credential.expirationDate);
        if (expiry < new Date()) {
            console.error('[NodeProvisioning] Credential expired');
            return false;
        }
        // In production, verify cryptographic proof
        // For now, accept if structure is valid
        return true;
    };
    NodeProvisioning.prototype.initializeNodeInstance = function (provisioningData) {
        return __awaiter(this, void 0, void 0, function () {
            var user, currentInfo, username, password, onProgress, result, mcpManager, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        user = (provisioningData || {}).user;
                        console.log('[NodeProvisioning] Initializing Node instance for user:', user === null || user === void 0 ? void 0 : user.name);
                        currentInfo = node_one_core_js_1.default.getInfo();
                        if (currentInfo.initialized) {
                            console.log('[NodeProvisioning] Node already initialized');
                            return [2 /*return*/];
                        }
                        username = user.name;
                        password = user.password;
                        if (!username || !password) {
                            throw new Error('Username and password required for Node initialization');
                        }
                        console.log('[NodeProvisioning] Initializing Node.js with username:', username);
                        onProgress = function (stage, percent, message) {
                            console.log("[NodeProvisioning] Progress: ".concat(percent, "% - ").concat(message));
                            // Send progress event to browser via IPC
                            if (global.mainWindow && !global.mainWindow.isDestroyed()) {
                                global.mainWindow.webContents.send('onecore:init-progress', {
                                    stage: stage,
                                    percent: percent,
                                    message: message
                                });
                            }
                        };
                        return [4 /*yield*/, node_one_core_js_1.default.initialize(username, password, onProgress)];
                    case 1:
                        result = _a.sent();
                        if (!result.success) {
                            // If it's a decryption error, it means passwords don't match
                            if (result.error && result.error.includes('CYENC-SYMDEC')) {
                                throw new Error('Password mismatch between browser and Node instances. Please use the same password.');
                            }
                            throw new Error("Failed to initialize Node.js ONE.core instance: ".concat(result.error));
                        }
                        console.log('[NodeProvisioning] Node.js ONE.core initialized with ID:', result.ownerId);
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./mcp-manager.js'); })];
                    case 3:
                        mcpManager = (_a.sent()).default;
                        mcpManager.setNodeOneCore(node_one_core_js_1.default);
                        console.log('[NodeProvisioning] Memory tools initialized with NodeOneCore');
                        return [3 /*break*/, 5];
                    case 4:
                        error_8 = _a.sent();
                        console.warn('[NodeProvisioning] Failed to initialize memory tools:', error_8);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    NodeProvisioning.prototype.configureNodeInstance = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Minimal configuration for fast startup
                        // Only set essential config, skip heavy operations
                        if (!config) {
                            config = {
                                storageRole: 'archive',
                                syncEndpoint: 'ws://localhost:8765'
                            };
                        }
                        // Just set basic config without heavy capability initialization
                        return [4 /*yield*/, node_one_core_js_1.default.setState('config.storageRole', (config === null || config === void 0 ? void 0 : config.storageRole) || 'archive')];
                    case 1:
                        // Just set basic config without heavy capability initialization
                        _a.sent();
                        return [4 /*yield*/, node_one_core_js_1.default.setState('config.syncEndpoint', config.syncEndpoint)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NodeProvisioning.prototype.enableCapability = function (capability) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, llmManager, availableModels;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[NodeProvisioning] Enabling capability:', capability);
                        _a = capability;
                        switch (_a) {
                            case 'llm': return [3 /*break*/, 1];
                            case 'files': return [3 /*break*/, 4];
                            case 'network': return [3 /*break*/, 6];
                            case 'storage': return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 10];
                    case 1: return [4 /*yield*/, Promise.resolve().then(function () { return require('../services/llm-manager-singleton.js'); })];
                    case 2:
                        llmManager = (_b.sent()).default;
                        availableModels = llmManager.getAvailableModels().map(function (m) { return m.id; });
                        return [4 /*yield*/, node_one_core_js_1.default.setState('capabilities.llm', {
                                enabled: true,
                                provider: 'main-process',
                                models: availableModels,
                                defaultModel: llmManager.defaultModelId,
                                integration: 'lama-llm-manager'
                            })];
                    case 3:
                        _b.sent();
                        console.log('[NodeProvisioning] LLM capability enabled with main process integration');
                        return [3 /*break*/, 10];
                    case 4: 
                    // Enable file import/export capability
                    return [4 /*yield*/, node_one_core_js_1.default.setState('capabilities.files', {
                            enabled: true,
                            storageType: 'file-system',
                            importPath: './imports',
                            exportPath: './exports',
                            blobStorage: 'OneDB/blobs/'
                        })];
                    case 5:
                        // Enable file import/export capability
                        _b.sent();
                        console.log('[NodeProvisioning] File storage capability enabled');
                        return [3 /*break*/, 10];
                    case 6: 
                    // Enable full network access via ConnectionsModel
                    return [4 /*yield*/, node_one_core_js_1.default.setState('capabilities.network', {
                            enabled: true,
                            protocols: ['http', 'https', 'ws', 'wss', 'udp'],
                            p2pEnabled: true,
                            commServerUrl: 'wss://comm10.dev.refinio.one',
                            directConnections: true,
                            iomServer: {
                                enabled: true,
                                port: 8765
                            }
                        })];
                    case 7:
                        // Enable full network access via ConnectionsModel
                        _b.sent();
                        console.log('[NodeProvisioning] Network capability enabled via ConnectionsModel');
                        return [3 /*break*/, 10];
                    case 8: 
                    // Enable archive storage role
                    return [4 /*yield*/, node_one_core_js_1.default.setState('capabilities.storage', {
                            enabled: true,
                            role: 'archive',
                            persistent: true,
                            location: 'OneDB/',
                            unlimited: true
                        })];
                    case 9:
                        // Enable archive storage role
                        _b.sent();
                        console.log('[NodeProvisioning] Archive storage capability enabled');
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    NodeProvisioning.prototype.reset = function () {
        // Reset provisioning state
        this.user = null;
        console.log('[NodeProvisioning] Reset provisioning state');
    };
    NodeProvisioning.prototype.createUserObjects = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    NodeProvisioning.prototype.deprovision = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fs, path, dataPath, error_9, error_10;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[NodeProvisioning] Deprovisioning Node instance...');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, , 11]);
                        if (!node_one_core_js_1.default.getInfo().initialized) return [3 /*break*/, 3];
                        return [4 /*yield*/, node_one_core_js_1.default.shutdown()];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        // Clear user data
                        this.user = null;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
                    case 4:
                        fs = (_b.sent()).promises;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('path'); })];
                    case 5:
                        path = _b.sent();
                        dataPath = ((_a = global.lamaConfig) === null || _a === void 0 ? void 0 : _a.instance.directory) || path.join(process.cwd(), 'OneDB');
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, fs.rm(dataPath, { recursive: true, force: true })];
                    case 7:
                        _b.sent();
                        console.log('[NodeProvisioning] Cleared Node data');
                        return [3 /*break*/, 9];
                    case 8:
                        error_9 = _b.sent();
                        console.error('[NodeProvisioning] Failed to clear data:', error_9);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, { success: true }];
                    case 10:
                        error_10 = _b.sent();
                        console.error('[NodeProvisioning] Deprovision failed:', error_10);
                        return [2 /*return*/, { success: false, error: error_10.message }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    NodeProvisioning.prototype.isProvisioned = function () {
        return node_one_core_js_1.default.getInfo().initialized;
    };
    NodeProvisioning.prototype.getUser = function () {
        return this.user;
    };
    return NodeProvisioning;
}());
// Export singleton
exports.default = new NodeProvisioning();
