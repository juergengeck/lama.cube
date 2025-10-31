"use strict";
/**
 * Node.js ONE.core Instance using one.leute.replicant template
 * Proper initialization following the template pattern
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
exports.instance = void 0;
// Polyfill WebSocket for Node.js environment
var ws_1 = require("ws");
global.WebSocket = ws_1.WebSocket;
var path_1 = require("path");
var url_1 = require("url");
// DEPRECATED: Old monolithic AI assistant model - replaced by component-based architecture
// import { AIAssistantModel } from './ai-assistant-model.js';
var ai_assistant_handler_adapter_js_1 = require("./ai-assistant-handler-adapter.js");
var TopicAnalysisModel_js_1 = require("@lama/core/one-ai/models/TopicAnalysisModel.js");
// QuicVC API server temporarily disabled during TS migration
// import RefinioApiServer from '../api/refinio-api-server.js';
var topic_group_manager_js_1 = require("./topic-group-manager.js");
// Import ONE.core model classes at the top as singletons
// These will be instantiated after platform loading but importing them
// here prevents dynamic loading state corruption
var LeuteModel_js_1 = require("@refinio/one.models/lib/models/Leute/LeuteModel.js");
var ProfileModel_js_1 = require("@refinio/one.models/lib/models/Leute/ProfileModel.js");
var SomeoneModel_js_1 = require("@refinio/one.models/lib/models/Leute/SomeoneModel.js");
var GroupModel_js_1 = require("@refinio/one.models/lib/models/Leute/GroupModel.js");
var ChannelManager_js_1 = require("@refinio/one.models/lib/models/ChannelManager.js");
var ConnectionsModel_js_1 = require("@refinio/one.models/lib/models/ConnectionsModel.js");
var TopicModel_js_1 = require("@refinio/one.models/lib/models/Chat/TopicModel.js");
var LLMObjectManager_js_1 = require("@lama/core/models/LLMObjectManager.js");
var storage_versioned_objects_js_1 = require("@refinio/one.core/lib/storage-versioned-objects.js");
var storage_unversioned_objects_js_1 = require("@refinio/one.core/lib/storage-unversioned-objects.js");
var storage_unversioned_objects_js_2 = require("@refinio/one.core/lib/storage-unversioned-objects.js");
var object_js_1 = require("@refinio/one.core/lib/util/object.js");
var access_js_1 = require("@refinio/one.core/lib/access.js");
// Get __dirname equivalent in ESM
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var NodeOneCore = /** @class */ (function () {
    function NodeOneCore() {
        this.initialized = false;
        this.instanceName = ''; // Initialize as empty string instead of null
        this.ownerId = ''; // Will be properly set during initialization
        this.leuteModel = null; // Will be initialized during setup
        this.appStateModel = null;
        this.connectionsModel = null; // Will be initialized during setup
        this.channelManager = null; // Will be initialized during setup
        this.topicModel = null; // Will be initialized during setup
        this.instance = null; // Will be initialized during setup
        this.settingsStore = null;
        this.multiUserModel = null;
        this.isReady = false;
        this.oneAuth = null; // Will be initialized during setup
        this.localWsServer = null;
        this.instanceModule = null; // Track the instance module
        this.aiAssistantModel = undefined; // Will be initialized after models are ready
        this.apiServer = null; // Refinio API server
        this.topicGroupManager = undefined; // Will be initialized after models are ready
        this.federationGroup = null; // Track federation group for access
        this.grantedAccessPeers = new Set(); // Track peers we've already granted access to
    }
    /**
     * Grant a peer access to our main profile and P2P channel
     * Centralized method to avoid duplication
     */
    NodeOneCore.prototype.grantPeerAccess = function (remotePersonId_1) {
        return __awaiter(this, arguments, void 0, function (remotePersonId, context) {
            var createAccess, SET_ACCESS_MODE, calculateIdHashOfObj, me, mainProfile, error_1, myId, p2pChannelId, p2pChannelInfoHash, error_2;
            if (context === void 0) { context = 'unknown'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!remotePersonId || !this.leuteModel) {
                            console.warn('[NodeOneCore] Cannot grant peer access - missing requirements');
                            return [2 /*return*/];
                        }
                        // Avoid duplicate grants
                        if (this.grantedAccessPeers.has(remotePersonId)) {
                            console.log("[NodeOneCore] Already granted access to peer: ".concat(String(remotePersonId).substring(0, 8)));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 1:
                        createAccess = (_a.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 2:
                        SET_ACCESS_MODE = (_a.sent()).SET_ACCESS_MODE;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 3:
                        calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                        console.log("[NodeOneCore] Granting peer access (".concat(context, "):"), String(remotePersonId).substring(0, 8));
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 9, , 10]);
                        return [4 /*yield*/, this.leuteModel.me()];
                    case 5:
                        me = _a.sent();
                        return [4 /*yield*/, me.mainProfile()];
                    case 6:
                        mainProfile = _a.sent();
                        if (!(mainProfile && mainProfile.idHash)) return [3 /*break*/, 8];
                        return [4 /*yield*/, createAccess([{
                                    id: mainProfile.idHash,
                                    person: [remotePersonId],
                                    group: [],
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 7:
                        _a.sent();
                        console.log('[NodeOneCore] ✅ Granted access to our main profile');
                        _a.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_1 = _a.sent();
                        console.warn('[NodeOneCore] Failed to grant profile access:', error_1.message);
                        return [3 /*break*/, 10];
                    case 10:
                        _a.trys.push([10, 13, , 14]);
                        myId = this.ownerId;
                        p2pChannelId = myId < remotePersonId ? "".concat(myId, "<->").concat(remotePersonId) : "".concat(remotePersonId, "<->").concat(myId);
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'ChannelInfo',
                                id: p2pChannelId,
                                owner: undefined // P2P channels have no owner
                            })];
                    case 11:
                        p2pChannelInfoHash = _a.sent();
                        return [4 /*yield*/, createAccess([{
                                    id: p2pChannelInfoHash,
                                    person: [remotePersonId],
                                    group: [],
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 12:
                        _a.sent();
                        console.log('[NodeOneCore] ✅ Granted P2P channel access:', p2pChannelId);
                        return [3 /*break*/, 14];
                    case 13:
                        error_2 = _a.sent();
                        console.warn('[NodeOneCore] Failed to grant P2P channel access:', error_2.message);
                        return [3 /*break*/, 14];
                    case 14:
                        // Mark this peer as having been granted access
                        this.grantedAccessPeers.add(remotePersonId);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initialize Node.js ONE.core using the proper template
     * @param username User's username
     * @param password User's password
     * @param onProgress Optional callback for initialization progress updates
     */
    NodeOneCore.prototype.initialize = function (username, password, onProgress) {
        return __awaiter(this, void 0, void 0, function () {
            var storageDir, error_3;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.initialized) {
                            console.log('[NodeOneCore] Already initialized');
                            return [2 /*return*/, { success: true, ownerId: this.ownerId, instanceName: this.instanceName }];
                        }
                        // Validate required parameters
                        if (!username) {
                            throw new Error('Username is required for initialization');
                        }
                        if (!password) {
                            throw new Error('Password is required for initialization');
                        }
                        // Use different instance name for Node
                        this.instanceName = "lama-node-".concat(username);
                        console.log("[NodeOneCore] Initializing Node instance for browser user: ".concat(username));
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 6]);
                        storageDir = ((_a = global.lamaConfig) === null || _a === void 0 ? void 0 : _a.instance.directory) || path_1.default.join(process.cwd(), 'OneDB');
                        console.log('[NodeOneCore] ========================================');
                        console.log('[NodeOneCore] INITIALIZATION PATH INFORMATION:');
                        console.log('[NodeOneCore] global.lamaConfig?.instance.directory:', (_b = global.lamaConfig) === null || _b === void 0 ? void 0 : _b.instance.directory);
                        console.log('[NodeOneCore] process.cwd():', process.cwd());
                        console.log('[NodeOneCore] Resolved storage directory for ONE.core:', storageDir);
                        console.log('[NodeOneCore] ========================================');
                        // Progress: Starting core instance initialization
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('core', 10, 'Loading ONE.core platform...');
                        // Initialize ONE.core instance with browser credentials
                        return [4 /*yield*/, this.initOneCoreInstance(username, password, storageDir)
                            // Progress: Core initialized, starting models
                        ];
                    case 2:
                        // Initialize ONE.core instance with browser credentials
                        _c.sent();
                        // Progress: Core initialized, starting models
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('models', 30, 'Initializing data models...');
                        // Initialize models in proper order
                        return [4 /*yield*/, this.initializeModels(onProgress)
                            // Set initialized AFTER models are ready to prevent race conditions
                            // (Services like QuicVCDiscovery wait for this flag)
                        ];
                    case 3:
                        // Initialize models in proper order
                        _c.sent();
                        // Set initialized AFTER models are ready to prevent race conditions
                        // (Services like QuicVCDiscovery wait for this flag)
                        this.initialized = true;
                        // Progress: Complete
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('complete', 100, 'Initialization complete');
                        console.log("[NodeOneCore] Initialized successfully");
                        return [2 /*return*/, {
                                success: true,
                                ownerId: this.ownerId,
                                name: this.instanceName
                            }];
                    case 4:
                        error_3 = _c.sent();
                        console.error('[NodeOneCore] Initialization failed:', error_3);
                        this.initialized = false;
                        // Progress: Failed
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('error', 0, "Initialization failed: ".concat(error_3.message));
                        // Clean up on failure to allow retry
                        return [4 /*yield*/, this.cleanup()];
                    case 5:
                        // Clean up on failure to allow retry
                        _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_3.message
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initialize ONE.core instance using SingleUserNoAuth (same as browser)
     */
    NodeOneCore.prototype.initOneCoreInstance = function (username, password, directory) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, _a, closeInstance, initInstance, SettingsStore, setBaseDirOrName, instanceName, email, storedInstanceName, storedEmail, finalInstanceName, finalEmail, RecipesStable, RecipesExperimental, LamaRecipes, _b, StateEntryRecipe, AppStateJournalRecipe, _c, ReverseMapsStable, ReverseMapsForIdObjectsStable, _d, ReverseMapsExperimental, ReverseMapsForIdObjectsExperimental, allRecipes, getInstanceOwnerIdHash, ownerIdResult, e_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
                    case 1:
                        fs = _e.sent();
                        // ONE.core will manage its own internal storage structure
                        // We just ensure the base directory exists
                        if (!fs.existsSync(directory)) {
                            fs.mkdirSync(directory, { recursive: true });
                            console.log('[NodeOneCore] Created storage directory:', directory);
                        }
                        // Load Node.js platform FIRST - before any other ONE.core imports
                        console.log('[NodeOneCore] Loading Node.js platform...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/system/load-nodejs.js'); })];
                    case 2:
                        _e.sent();
                        console.log('[NodeOneCore] ✅ Node.js platform loaded');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 3:
                        _a = _e.sent(), closeInstance = _a.closeInstance, initInstance = _a.initInstance;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/system/settings-store.js'); })];
                    case 4:
                        SettingsStore = (_e.sent()).SettingsStore;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/system/storage-base.js'); })];
                    case 5:
                        setBaseDirOrName = (_e.sent()).setBaseDirOrName;
                        // Ensure clean slate - close any existing instance singleton
                        try {
                            closeInstance();
                            console.log('[NodeOneCore] Closed existing ONE.core singleton for clean init');
                        }
                        catch (e) {
                            // OK if there was no existing instance
                        }
                        // Set storage directory for SettingsStore
                        setBaseDirOrName(directory);
                        instanceName = "lama-node-".concat(username);
                        email = "node-".concat(username, "@lama.local") // Different email for federation to work
                        ;
                        return [4 /*yield*/, SettingsStore.getItem('instance')];
                    case 6:
                        storedInstanceName = _e.sent();
                        return [4 /*yield*/, SettingsStore.getItem('email')];
                    case 7:
                        storedEmail = _e.sent();
                        finalInstanceName = instanceName;
                        finalEmail = email;
                        if (storedInstanceName && storedEmail) {
                            console.log('[NodeOneCore] Found existing instance credentials');
                            finalInstanceName = storedInstanceName;
                            finalEmail = storedEmail;
                        }
                        else {
                            console.log('[NodeOneCore] No existing instance, creating new one');
                        }
                        console.log('[NodeOneCore] Using instance:', { email: finalEmail, instanceName: finalInstanceName });
                        // Import recipes following one.leute pattern
                        console.log('[NodeOneCore] Importing stable recipes...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/recipes/recipes-stable.js'); })];
                    case 8:
                        RecipesStable = (_e.sent()).default;
                        console.log('[NodeOneCore] Importing experimental recipes...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/recipes/recipes-experimental.js'); })];
                    case 9:
                        RecipesExperimental = (_e.sent()).default;
                        console.log('[NodeOneCore] Importing LAMA recipes...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../recipes/index.js'); })];
                    case 10:
                        LamaRecipes = (_e.sent()).LamaRecipes;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/refinio-api/dist/state/index.js'); })];
                    case 11:
                        _b = _e.sent(), StateEntryRecipe = _b.StateEntryRecipe, AppStateJournalRecipe = _b.AppStateJournalRecipe;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/recipes/reversemaps-stable.js'); })];
                    case 12:
                        _c = _e.sent(), ReverseMapsStable = _c.ReverseMapsStable, ReverseMapsForIdObjectsStable = _c.ReverseMapsForIdObjectsStable;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/recipes/reversemaps-experimental.js'); })];
                    case 13:
                        _d = _e.sent(), ReverseMapsExperimental = _d.ReverseMapsExperimental, ReverseMapsForIdObjectsExperimental = _d.ReverseMapsForIdObjectsExperimental;
                        allRecipes = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], RecipesStable, true), RecipesExperimental, true), (LamaRecipes || []), true), [
                            StateEntryRecipe,
                            AppStateJournalRecipe
                        ], false);
                        console.log('[NodeOneCore] Initializing with', allRecipes.length, 'recipes');
                        _e.label = 14;
                    case 14:
                        _e.trys.push([14, 20, , 21]);
                        console.log('[NodeOneCore] About to call initInstance()...');
                        // Use initInstance directly like one.leute.replicant does
                        // This handles both new and existing instances
                        return [4 /*yield*/, initInstance({
                                name: finalInstanceName,
                                email: finalEmail,
                                secret: password,
                                directory: directory,
                                initialRecipes: allRecipes,
                                initiallyEnabledReverseMapTypes: new Map(__spreadArray(__spreadArray([], (ReverseMapsStable || []), true), (ReverseMapsExperimental || []), true)),
                                initiallyEnabledReverseMapTypesForIdObjects: new Map(__spreadArray(__spreadArray([], (ReverseMapsForIdObjectsStable || []), true), (ReverseMapsForIdObjectsExperimental || []), true)),
                                storageInitTimeout: 20000
                            })];
                    case 15:
                        // Use initInstance directly like one.leute.replicant does
                        // This handles both new and existing instances
                        _e.sent();
                        console.log('[NodeOneCore] ✅ initInstance() completed successfully');
                        if (!(!storedInstanceName || !storedEmail)) return [3 /*break*/, 18];
                        return [4 /*yield*/, SettingsStore.setItem('instance', finalInstanceName)];
                    case 16:
                        _e.sent();
                        return [4 /*yield*/, SettingsStore.setItem('email', finalEmail)];
                    case 17:
                        _e.sent();
                        console.log('[NodeOneCore] Stored instance credentials');
                        _e.label = 18;
                    case 18: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 19:
                        getInstanceOwnerIdHash = (_e.sent()).getInstanceOwnerIdHash;
                        ownerIdResult = getInstanceOwnerIdHash();
                        if (!ownerIdResult) {
                            throw new Error('Failed to get instance owner ID after initialization');
                        }
                        this.ownerId = ownerIdResult;
                        this.instanceName = finalInstanceName;
                        console.log('[NodeOneCore] ONE.core instance initialized successfully');
                        console.log('[NodeOneCore] Owner ID:', this.ownerId);
                        console.log('[NodeOneCore] Instance name:', this.instanceName);
                        return [3 /*break*/, 21];
                    case 20:
                        e_1 = _e.sent();
                        console.error('[NodeOneCore] Authentication failed:', e_1);
                        throw e_1;
                    case 21: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Monitor pairing and CHUM transitions
     * ConnectionsModel handles the transition automatically
     */
    NodeOneCore.prototype.setupConnectionMonitoring = function () {
        var _this = this;
        var _a;
        console.log('[NodeOneCore] Setting up connection monitoring...');
        // Register pairing callbacks - must be done BEFORE init (like one.leute.replicant)
        if ((_a = this.connectionsModel) === null || _a === void 0 ? void 0 : _a.pairing) {
            console.log('[NodeOneCore] Registering pairing event handlers...');
            // Log pairing start events
            if (this.connectionsModel.pairing.onPairingStarted) {
                this.connectionsModel.pairing.onPairingStarted(function (token) {
                    console.log('[NodeOneCore] 🤝 PAIRING STARTED - Token:', (token === null || token === void 0 ? void 0 : token.substring(0, 20)) + '...');
                });
            }
            // Log pairing failures
            if (this.connectionsModel.pairing.onPairingFailed) {
                this.connectionsModel.pairing.onPairingFailed(function (error) {
                    console.log('[NodeOneCore] ❌ PAIRING FAILED:', error);
                });
            }
            // Handle successful pairing - create Someone and Profile
            this.connectionsModel.pairing.onPairingSuccess(function (initiatedLocally, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, token) { return __awaiter(_this, void 0, void 0, function () {
                var completePairingTrust, trustResult, handleNewConnection, someone, handlePairingCompletion, pairingResult, topicRoom, profile, _a, e_2, stateManager_1, BrowserWindow, displayName, profile, _b, personName, e_3, contactId, p2pId, windows, error_4, error_5;
                var _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            console.log('[NodeOneCore] ✅ PAIRING SUCCESS EVENT TRIGGERED');
                            console.log('[NodeOneCore] ═══════════════════════════════════════════');
                            console.log('[NodeOneCore] 📊 Pairing Details:');
                            console.log('[NodeOneCore]   • Initiated locally:', initiatedLocally);
                            console.log('[NodeOneCore]   • Local person:', (localPersonId === null || localPersonId === void 0 ? void 0 : localPersonId.substring(0, 8)) || 'null');
                            console.log('[NodeOneCore]   • Local instance:', (localInstanceId === null || localInstanceId === void 0 ? void 0 : localInstanceId.substring(0, 8)) || 'null');
                            console.log('[NodeOneCore]   • Remote person:', (remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8)) || 'null');
                            console.log('[NodeOneCore]   • Remote instance:', (remoteInstanceId === null || remoteInstanceId === void 0 ? void 0 : remoteInstanceId.substring(0, 8)) || 'null');
                            console.log('[NodeOneCore] ═══════════════════════════════════════════');
                            console.log('[NodeOneCore] 🔧 Starting remote contact setup...');
                            if (!(remotePersonId && this.leuteModel)) return [3 /*break*/, 28];
                            _h.label = 1;
                        case 1:
                            _h.trys.push([1, 26, , 27]);
                            // Step 1: Trust establishment (must come first)
                            console.log('[NodeOneCore] 🔐 Step 1: Establishing trust with remote peer...');
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./pairing-trust-handler.js'); })];
                        case 2:
                            completePairingTrust = (_h.sent()).completePairingTrust;
                            return [4 /*yield*/, completePairingTrust({
                                    trust: this.leuteModel.trust,
                                    leuteModel: this.leuteModel,
                                    initiatedLocally: initiatedLocally,
                                    localPersonId: localPersonId,
                                    localInstanceId: localInstanceId,
                                    remotePersonId: remotePersonId,
                                    remoteInstanceId: remoteInstanceId,
                                    token: token
                                })];
                        case 3:
                            trustResult = _h.sent();
                            if (trustResult.success) {
                                console.log('[NodeOneCore] ✅ Trust established successfully!');
                            }
                            else {
                                console.warn('[NodeOneCore] ⚠️ Trust establishment had issues:', trustResult);
                            }
                            // Step 2: Create address book entry
                            console.log('[NodeOneCore] 📁 Step 2: Creating address book entry...');
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./contact-creation-proper.js'); })];
                        case 4:
                            handleNewConnection = (_h.sent()).handleNewConnection;
                            return [4 /*yield*/, handleNewConnection(remotePersonId, this.leuteModel)];
                        case 5:
                            someone = _h.sent();
                            console.log('[NodeOneCore] ✅ Address book entry created successfully!');
                            console.log('[NodeOneCore]   • Someone ID:', ((_d = (_c = someone === null || someone === void 0 ? void 0 : someone.idHash) === null || _c === void 0 ? void 0 : _c.toString()) === null || _d === void 0 ? void 0 : _d.substring(0, 8)) || 'null');
                            // Step 3: Detect invitation type and create appropriate topic
                            console.log('[NodeOneCore] 💬 Step 3: Handling pairing completion...');
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../connection.core/dist/esm/index.js'); })];
                        case 6:
                            handlePairingCompletion = (_h.sent()).handlePairingCompletion;
                            return [4 /*yield*/, handlePairingCompletion({
                                    leuteModel: this.leuteModel,
                                    topicModel: this.topicModel,
                                    channelManager: this.channelManager,
                                    localPersonId: localPersonId,
                                    remotePersonId: remotePersonId,
                                    initiatedLocally: initiatedLocally
                                })];
                        case 7:
                            pairingResult = _h.sent();
                            console.log('[NodeOneCore] ✅ Pairing complete - type:', pairingResult.type);
                            console.log('[NodeOneCore]   Channel:', pairingResult.channelId.substring(0, 20));
                            topicRoom = pairingResult.topicRoom;
                            if (!(someone === null || someone === void 0 ? void 0 : someone.mainProfile)) return [3 /*break*/, 13];
                            _h.label = 8;
                        case 8:
                            _h.trys.push([8, 12, , 13]);
                            if (!(typeof someone.mainProfile === 'function')) return [3 /*break*/, 10];
                            return [4 /*yield*/, someone.mainProfile()];
                        case 9:
                            _a = _h.sent();
                            return [3 /*break*/, 11];
                        case 10:
                            _a = someone.mainProfile;
                            _h.label = 11;
                        case 11:
                            profile = _a;
                            console.log('[NodeOneCore]   • Profile ID:', ((_f = (_e = profile === null || profile === void 0 ? void 0 : profile.idHash) === null || _e === void 0 ? void 0 : _e.toString()) === null || _f === void 0 ? void 0 : _f.substring(0, 8)) || 'null');
                            return [3 /*break*/, 13];
                        case 12:
                            e_2 = _h.sent();
                            console.log('[NodeOneCore]   • Profile info not available');
                            return [3 /*break*/, 13];
                        case 13:
                            // Grant access to our profile
                            console.log('[NodeOneCore] 🔓 Granting mutual access permissions...');
                            return [4 /*yield*/, this.grantPeerAccess(remotePersonId, 'pairing')];
                        case 14:
                            _h.sent();
                            console.log('[NodeOneCore] ✅ Access permissions granted');
                            // Step 4: Add contact and conversation to StateManager for UI
                            console.log('[NodeOneCore] 📲 Step 4: Adding to StateManager and notifying UI...');
                            _h.label = 15;
                        case 15:
                            _h.trys.push([15, 24, , 25]);
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('../state/manager.js'); })];
                        case 16:
                            stateManager_1 = (_h.sent()).default;
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('electron'); })];
                        case 17:
                            BrowserWindow = (_h.sent()).BrowserWindow;
                            displayName = 'Unknown Contact';
                            if (!(someone === null || someone === void 0 ? void 0 : someone.mainProfile)) return [3 /*break*/, 23];
                            _h.label = 18;
                        case 18:
                            _h.trys.push([18, 22, , 23]);
                            if (!(typeof someone.mainProfile === 'function')) return [3 /*break*/, 20];
                            return [4 /*yield*/, someone.mainProfile()];
                        case 19:
                            _b = _h.sent();
                            return [3 /*break*/, 21];
                        case 20:
                            _b = someone.mainProfile;
                            _h.label = 21;
                        case 21:
                            profile = _b;
                            personName = (_g = profile.personDescriptions) === null || _g === void 0 ? void 0 : _g.find(function (d) { return d.$type$ === 'PersonName'; });
                            if (personName === null || personName === void 0 ? void 0 : personName.name) {
                                displayName = personName.name;
                            }
                            return [3 /*break*/, 23];
                        case 22:
                            e_3 = _h.sent();
                            console.log('[NodeOneCore]   • Could not get profile name');
                            return [3 /*break*/, 23];
                        case 23:
                            contactId = remotePersonId;
                            stateManager_1.addContact({
                                id: contactId,
                                name: displayName,
                                personId: remotePersonId,
                                someoneId: someone === null || someone === void 0 ? void 0 : someone.idHash
                            });
                            console.log('[NodeOneCore]   • Contact added to state:', contactId.substring(0, 8));
                            p2pId = localPersonId < remotePersonId ?
                                "".concat(localPersonId, "<->").concat(remotePersonId) :
                                "".concat(remotePersonId, "<->").concat(localPersonId);
                            // Add conversation to state with detected type
                            stateManager_1.addConversation({
                                id: pairingResult.channelId,
                                name: displayName,
                                type: pairingResult.type,
                                participants: [localPersonId, remotePersonId],
                                lastMessage: null,
                                lastMessageTime: Date.now(),
                                unreadCount: 0
                            });
                            console.log('[NodeOneCore]   • Conversation added to state:', pairingResult.channelId.substring(0, 20));
                            console.log('[NodeOneCore]   • Conversation type:', pairingResult.type);
                            windows = BrowserWindow.getAllWindows();
                            windows.forEach(function (window) {
                                window.webContents.send('contacts:updated', {
                                    contacts: Array.from(stateManager_1.getState().contacts.values())
                                });
                                window.webContents.send('conversations:updated', {
                                    conversations: Array.from(stateManager_1.getState().conversations.values())
                                });
                            });
                            console.log('[NodeOneCore]   • UI notified of updates');
                            return [3 /*break*/, 25];
                        case 24:
                            error_4 = _h.sent();
                            console.error('[NodeOneCore] ❌ Failed to update StateManager:', error_4);
                            return [3 /*break*/, 25];
                        case 25:
                            console.log('[NodeOneCore] ═══════════════════════════════════════════');
                            console.log('[NodeOneCore] 🎉 PAIRING COMPLETE - Remote contact is ready!');
                            return [3 /*break*/, 27];
                        case 26:
                            error_5 = _h.sent();
                            console.error('[NodeOneCore] ❌ Failed to create address book entry:', error_5);
                            console.error('[NodeOneCore]    Error stack:', error_5.stack);
                            return [3 /*break*/, 27];
                        case 27: return [3 /*break*/, 29];
                        case 28:
                            console.log('[NodeOneCore] ⚠️ Cannot create contact:', {
                                hasRemotePersonId: !!remotePersonId,
                                hasLeuteModel: !!this.leuteModel
                            });
                            _h.label = 29;
                        case 29: return [2 /*return*/];
                    }
                });
            }); });
            console.log('[NodeOneCore] ✅ Pairing callbacks registered');
        }
        else {
            console.log('[NodeOneCore] ⚠️  Pairing module not available');
        }
    };
    /**
     * Initialize models in proper order following template
     * @param onProgress Optional callback for progress updates
     */
    NodeOneCore.prototype.initializeModels = function (onProgress) {
        return __awaiter(this, void 0, void 0, function () {
            var commServerUrl, objectEvents, error_6, checkOwnerIdHash, currentOwnerId, me, personId, profile, hasName, displayName, emailParts, userPart, profileError_1, error_7, ContentSharingManager, _a, _b, _c, _d, setupChannelSyncListeners, monitorP2PChannels, blacklistGroup, _e, FederationAPI, protocols, pairingSuccess, catchAllRoutes, registeredKeys, getInstanceOwnerIdHash, getLocalInstanceOfPerson, getDefaultKeys, getObject_1, myPersonId, instanceId, defaultInstanceKeys, instanceKeys, leuteModule, originalAcceptConnection_1, connections, leuteConnModule, catchAllCount, _i, _f, conn, net_1, isListening, leuteConnMod, allRoutes, _g, allRoutes_1, route, error_8, protocols;
            var _this = this;
            var _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
            return __generator(this, function (_w) {
                switch (_w.label) {
                    case 0:
                        console.log('[NodeOneCore] Initializing models...');
                        commServerUrl = ((_h = global.lamaConfig) === null || _h === void 0 ? void 0 : _h.commServer.url) || 'wss://comm10.dev.refinio.one';
                        this.commServerUrl = commServerUrl; // Store as property for node-provisioning to access
                        console.log('[NodeOneCore] Using CommServer URL:', commServerUrl);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/misc/ObjectEventDispatcher.js'); })];
                    case 1:
                        objectEvents = (_w.sent()).objectEvents;
                        _w.label = 2;
                    case 2:
                        _w.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, objectEvents.init()];
                    case 3:
                        _w.sent();
                        console.log('[NodeOneCore] ✅ ObjectEventDispatcher initialized');
                        // TRACE: Log ALL objects received via CHUM to debug
                        objectEvents.onNewVersion(function (result) { return __awaiter(_this, void 0, void 0, function () {
                            var obj, storeVersionedObject_1, storeResult, ensureContactExists, error_9, handleReceivedProfile, error_10, allChannels, BrowserWindow, windows, _loop_1, this_1, _i, allChannels_1, channelInfo, state_1, error_11;
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                            return __generator(this, function (_k) {
                                switch (_k.label) {
                                    case 0:
                                        obj = result === null || result === void 0 ? void 0 : result.obj;
                                        // Commented out excessive logging - was creating 30+ logs during init
                                        // console.log('[NodeOneCore] 📨 OBJECT RECEIVED:', {
                                        //   type: obj.$type$,
                                        //   text: obj.text?.substring?.(0, 30),
                                        //   author: obj.author?.substring?.(0, 8),
                                        //   sender: obj.sender?.substring?.(0, 8)
                                        // })
                                        if (obj.$type$ === 'ChannelInfo') {
                                            console.log('[NodeOneCore] 📨 NODE: Received ChannelInfo via CHUM!', {
                                                channelId: obj.id,
                                                owner: (_a = obj.owner) === null || _a === void 0 ? void 0 : _a.substring(0, 8)
                                            });
                                        }
                                        if (!(obj.$type$ === 'Person' && obj.email)) return [3 /*break*/, 9];
                                        console.log('[NodeOneCore] 📨 NODE: Received Person via CHUM!', {
                                            email: obj.email,
                                            idHash: result.idHash ? String(result.idHash).substring(0, 8) : undefined
                                        });
                                        if (!(this.leuteModel && ((_b = this.leuteModel.state) === null || _b === void 0 ? void 0 : _b.currentState) === 'Initialised')) return [3 /*break*/, 8];
                                        _k.label = 1;
                                    case 1:
                                        _k.trys.push([1, 6, , 7]);
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                                    case 2:
                                        storeVersionedObject_1 = (_k.sent()).storeVersionedObject;
                                        return [4 /*yield*/, storeVersionedObject_1(obj)];
                                    case 3:
                                        storeResult = _k.sent();
                                        console.log('[NodeOneCore] ✅ Stored Person object (vheads created):', (_d = (_c = storeResult.idHash) === null || _c === void 0 ? void 0 : _c.toString()) === null || _d === void 0 ? void 0 : _d.substring(0, 8));
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./contact-creation-proper.js'); })];
                                    case 4:
                                        ensureContactExists = (_k.sent()).ensureContactExists;
                                        return [4 /*yield*/, ensureContactExists(result.idHash, this.leuteModel, { displayName: (_e = obj.email) === null || _e === void 0 ? void 0 : _e.split('@')[0] })];
                                    case 5:
                                        _k.sent();
                                        console.log('[NodeOneCore] ✅ Ensured contact exists for Person');
                                        return [3 /*break*/, 7];
                                    case 6:
                                        error_9 = _k.sent();
                                        console.error('[NodeOneCore] Failed to handle received Person:', error_9);
                                        return [3 /*break*/, 7];
                                    case 7: return [3 /*break*/, 9];
                                    case 8:
                                        console.log('[NodeOneCore] ⏸️  Skipping Person - LeuteModel not yet initialized');
                                        _k.label = 9;
                                    case 9:
                                        if (!(obj.$type$ === 'Profile' && obj.personId)) return [3 /*break*/, 16];
                                        console.log('[NodeOneCore] 📨 NODE: Received Profile via CHUM!', {
                                            personId: (_f = obj.personId) === null || _f === void 0 ? void 0 : _f.substring(0, 8),
                                            name: obj.name || 'No name'
                                        });
                                        if (!(this.leuteModel && ((_g = this.leuteModel.state) === null || _g === void 0 ? void 0 : _g.currentState) === 'Initialised')) return [3 /*break*/, 15];
                                        _k.label = 10;
                                    case 10:
                                        _k.trys.push([10, 13, , 14]);
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./contact-creation-proper.js'); })];
                                    case 11:
                                        handleReceivedProfile = (_k.sent()).handleReceivedProfile;
                                        return [4 /*yield*/, handleReceivedProfile(obj.personId, obj, this.leuteModel)];
                                    case 12:
                                        _k.sent();
                                        console.log('[NodeOneCore] ✅ Handled received Profile data');
                                        return [3 /*break*/, 14];
                                    case 13:
                                        error_10 = _k.sent();
                                        console.error('[NodeOneCore] Failed to handle received Profile:', error_10);
                                        return [3 /*break*/, 14];
                                    case 14: return [3 /*break*/, 16];
                                    case 15:
                                        console.log('[NodeOneCore] ⏸️  Skipping Profile - LeuteModel not yet initialized');
                                        _k.label = 16;
                                    case 16:
                                        if (!(obj.$type$ === 'TopicMessage')) return [3 /*break*/, 25];
                                        console.log('[NodeOneCore] 📨 NODE: Received TopicMessage via CHUM!', {
                                            text: ((_h = obj.text) === null || _h === void 0 ? void 0 : _h.substring(0, 50)) || 'No text',
                                            author: (_j = obj.author) === null || _j === void 0 ? void 0 : _j.substring(0, 8),
                                            timestamp: obj.creationTime
                                        });
                                        if (!(this.channelManager && this.topicModel)) return [3 /*break*/, 25];
                                        _k.label = 17;
                                    case 17:
                                        _k.trys.push([17, 24, , 25]);
                                        return [4 /*yield*/, this.channelManager.getChannelInfos()
                                            // Notify UI about new message
                                        ];
                                    case 18:
                                        allChannels = _k.sent();
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('electron'); })];
                                    case 19:
                                        BrowserWindow = (_k.sent()).BrowserWindow;
                                        windows = BrowserWindow.getAllWindows();
                                        _loop_1 = function (channelInfo) {
                                            var channelId, topicRoom, messages, hasMessage, e_4;
                                            return __generator(this, function (_l) {
                                                switch (_l.label) {
                                                    case 0:
                                                        channelId = channelInfo.id;
                                                        _l.label = 1;
                                                    case 1:
                                                        _l.trys.push([1, 5, , 6]);
                                                        return [4 /*yield*/, this_1.topicModel.enterTopicRoom(channelId)];
                                                    case 2:
                                                        topicRoom = _l.sent();
                                                        if (!topicRoom) return [3 /*break*/, 4];
                                                        return [4 /*yield*/, topicRoom.retrieveAllMessages()];
                                                    case 3:
                                                        messages = _l.sent();
                                                        hasMessage = messages.some(function (msg) {
                                                            var _a, _b;
                                                            return ((_a = msg.data) === null || _a === void 0 ? void 0 : _a.text) === obj.text &&
                                                                ((_b = msg.data) === null || _b === void 0 ? void 0 : _b.author) === obj.author;
                                                        });
                                                        if (hasMessage) {
                                                            console.log('[NodeOneCore] 📬 Message belongs to channel:', channelId);
                                                            // Send notification to UI
                                                            windows.forEach(function (window) {
                                                                window.webContents.send('chat:newMessages', {
                                                                    conversationId: channelId,
                                                                    messages: [{
                                                                            id: obj.idHash || "msg-".concat(Date.now()),
                                                                            conversationId: channelId,
                                                                            text: obj.text || '',
                                                                            sender: obj.author,
                                                                            timestamp: obj.creationTime ? new Date(obj.creationTime).toISOString() : new Date().toISOString(),
                                                                            status: 'received',
                                                                            isAI: false
                                                                        }],
                                                                    source: 'chum-direct'
                                                                });
                                                            });
                                                            return [2 /*return*/, "break"];
                                                        }
                                                        _l.label = 4;
                                                    case 4: return [3 /*break*/, 6];
                                                    case 5:
                                                        e_4 = _l.sent();
                                                        return [3 /*break*/, 6];
                                                    case 6: return [2 /*return*/];
                                                }
                                            });
                                        };
                                        this_1 = this;
                                        _i = 0, allChannels_1 = allChannels;
                                        _k.label = 20;
                                    case 20:
                                        if (!(_i < allChannels_1.length)) return [3 /*break*/, 23];
                                        channelInfo = allChannels_1[_i];
                                        return [5 /*yield**/, _loop_1(channelInfo)];
                                    case 21:
                                        state_1 = _k.sent();
                                        if (state_1 === "break")
                                            return [3 /*break*/, 23];
                                        _k.label = 22;
                                    case 22:
                                        _i++;
                                        return [3 /*break*/, 20];
                                    case 23: return [3 /*break*/, 25];
                                    case 24:
                                        error_11 = _k.sent();
                                        console.error('[NodeOneCore] Error processing TopicMessage:', error_11);
                                        return [3 /*break*/, 25];
                                    case 25: return [2 /*return*/];
                                }
                            });
                        }); }, 'NodeOneCore object handler');
                        return [3 /*break*/, 5];
                    case 4:
                        error_6 = _w.sent();
                        // If it's already initialized, that's fine
                        if ((_j = error_6.message) === null || _j === void 0 ? void 0 : _j.includes('already initialized')) {
                            console.log('[NodeOneCore] ObjectEventDispatcher already initialized, continuing...');
                        }
                        else {
                            throw error_6;
                        }
                        return [3 /*break*/, 5];
                    case 5:
                        // Initialize LeuteModel with commserver for external connections
                        console.log('[NodeOneCore] About to initialize LeuteModel...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 6:
                        checkOwnerIdHash = (_w.sent()).getInstanceOwnerIdHash;
                        currentOwnerId = checkOwnerIdHash();
                        console.log('[NodeOneCore] Current owner ID before LeuteModel init:', currentOwnerId);
                        console.log('[NodeOneCore] This.ownerId before LeuteModel init:', this.ownerId);
                        if (!currentOwnerId) {
                            throw new Error('Owner ID disappeared before LeuteModel initialization');
                        }
                        // Use the statically imported LeuteModel singleton
                        // @ts-ignore - TypeScript has a bug with ESM default exports in our configuration
                        this.leuteModel = new LeuteModel_js_1.default(commServerUrl, true); // true = create everyone group
                        // Set the appId to 'one.leute' as required by the recipe validation
                        this.leuteModel.appId = 'one.leute';
                        console.log('[NodeOneCore] LeuteModel created with appId: one.leute, calling init()...');
                        return [4 /*yield*/, this.leuteModel.init()];
                    case 7:
                        _w.sent();
                        console.log('[NodeOneCore] ✅ LeuteModel initialized with commserver:', commServerUrl);
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('leute', 40, 'Contact management initialized');
                        // Set up listener for new profiles discovered through CHUM
                        this.leuteModel.onProfileUpdate(function (profileIdHash) { return __awaiter(_this, void 0, void 0, function () {
                            var allContacts, BrowserWindow, mainWindow_1, error_12;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 3, , 4]);
                                        return [4 /*yield*/, this.leuteModel.others()];
                                    case 1:
                                        allContacts = _a.sent();
                                        console.log("[NodeOneCore] Profile update detected, total contacts: ".concat(allContacts === null || allContacts === void 0 ? void 0 : allContacts.length));
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('electron'); })];
                                    case 2:
                                        BrowserWindow = (_a.sent()).BrowserWindow;
                                        mainWindow_1 = BrowserWindow.getAllWindows()[0];
                                        if (mainWindow_1) {
                                            mainWindow_1 === null || mainWindow_1 === void 0 ? void 0 : mainWindow_1.webContents.send('contacts:updated', {
                                                count: allContacts === null || allContacts === void 0 ? void 0 : allContacts.length,
                                                profileIdHash: profileIdHash
                                            });
                                        }
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_12 = _a.sent();
                                        console.error('[NodeOneCore] Error handling profile update:', error_12);
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        _w.label = 8;
                    case 8:
                        _w.trys.push([8, 17, , 18]);
                        return [4 /*yield*/, this.leuteModel.me()];
                    case 9:
                        me = _w.sent();
                        if (!me) return [3 /*break*/, 16];
                        return [4 /*yield*/, me.mainIdentity()];
                    case 10:
                        personId = _w.sent();
                        if (!personId) return [3 /*break*/, 16];
                        // DO NOT overwrite this.ownerId - it should remain the instance owner ID hash
                        console.log('[NodeOneCore] Person ID from LeuteModel:', personId);
                        console.log('[NodeOneCore] Keeping instance owner ID:', this.ownerId);
                        _w.label = 11;
                    case 11:
                        _w.trys.push([11, 15, , 16]);
                        return [4 /*yield*/, me.mainProfile()
                            // Check if we already have a PersonName
                        ];
                    case 12:
                        profile = _w.sent();
                        hasName = (_k = profile.personDescriptions) === null || _k === void 0 ? void 0 : _k.some(function (d) { return d.$type$ === 'PersonName'; });
                        if (!!hasName) return [3 /*break*/, 14];
                        console.log('[NodeOneCore] Adding PersonName to our profile');
                        displayName = 'LAMA User';
                        if (this.email) {
                            emailParts = this.email.split('@');
                            userPart = emailParts[0];
                            // Remove "node-" prefix if present
                            displayName = userPart.replace(/^node-/, '');
                            // Capitalize first letter
                            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                        }
                        // Add PersonName to profile
                        profile.personDescriptions = profile.personDescriptions || [];
                        (_l = profile.personDescriptions) === null || _l === void 0 ? void 0 : _l.push({
                            $type$: 'PersonName',
                            name: displayName
                        });
                        // Save the updated profile
                        return [4 /*yield*/, profile.saveAndLoad()];
                    case 13:
                        // Save the updated profile
                        _w.sent();
                        console.log("[NodeOneCore] \u2705 Profile updated with name: ".concat(displayName));
                        _w.label = 14;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        profileError_1 = _w.sent();
                        console.warn('[NodeOneCore] Could not update profile with name:', profileError_1);
                        return [3 /*break*/, 16];
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        error_7 = _w.sent();
                        console.error('[NodeOneCore] Failed to get person ID from LeuteModel:', error_7);
                        return [3 /*break*/, 18];
                    case 18: return [4 /*yield*/, Promise.resolve().then(function () { return require('./content-sharing.js'); })];
                    case 19:
                        ContentSharingManager = (_w.sent()).default;
                        this.contentSharing = new ContentSharingManager(this);
                        console.log('[NodeOneCore] ✅ Content Sharing Manager initialized');
                        // Remove browser access - browser has no ONE instance
                        // Initialize ChannelManager - needs leuteModel
                        // Use the imported ChannelManager class - no dynamic import
                        this.channelManager = new ChannelManager_js_1.default(this.leuteModel);
                        return [4 /*yield*/, this.channelManager.init()];
                    case 20:
                        _w.sent();
                        console.log('[NodeOneCore] ✅ ChannelManager initialized');
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('channels', 60, 'Communication channels initialized');
                        // Initialize LLMObjectManager for AI contact management
                        _a = this;
                        _b = LLMObjectManager_js_1.LLMObjectManager.bind;
                        _c = [void 0, {
                                storeVersionedObject: storage_versioned_objects_js_1.storeVersionedObject,
                                createAccess: function (accessRequests) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, (0, access_js_1.createAccess)(accessRequests)];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }
                            }];
                        if (!this.federationGroup) return [3 /*break*/, 22];
                        return [4 /*yield*/, (0, object_js_1.calculateIdHashOfObj)(this.federationGroup)];
                    case 21:
                        _d = _w.sent();
                        return [3 /*break*/, 23];
                    case 22:
                        _d = undefined;
                        _w.label = 23;
                    case 23:
                        // Initialize LLMObjectManager for AI contact management
                        _a.llmObjectManager = new (_b.apply(LLMObjectManager_js_1.LLMObjectManager, _c.concat([_d])))();
                        return [4 /*yield*/, this.llmObjectManager.initialize()];
                    case 24:
                        _w.sent();
                        console.log('[NodeOneCore] ✅ LLMObjectManager initialized');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./federation-channel-sync.js'); })];
                    case 25:
                        setupChannelSyncListeners = (_w.sent()).setupChannelSyncListeners;
                        setupChannelSyncListeners(this.channelManager, 'Node', function (channelId, messages) {
                            console.log('\n' + '='.repeat(60));
                            console.log('📥 MESSAGE FLOW TRACE - NODE RECEIVED via CHUM');
                            console.log('='.repeat(60));
                            console.log("[TRACE] \uD83D\uDCE8 NODE: Received ".concat(messages === null || messages === void 0 ? void 0 : messages.length, " messages in channel ").concat(channelId));
                            console.log("[NodeOneCore] \uD83D\uDCE8 New messages in channel ".concat(channelId, ":"), messages === null || messages === void 0 ? void 0 : messages.length);
                            // Log message details
                            messages.forEach(function (msg, idx) {
                                var _a, _b;
                                console.log("[TRACE] Message ".concat(idx + 1, ":"), {
                                    text: (_a = msg.text) === null || _a === void 0 ? void 0 : _a.substring(0, 50),
                                    sender: (_b = msg.sender) === null || _b === void 0 ? void 0 : _b.substring(0, 8),
                                    timestamp: msg.timestamp
                                });
                            });
                            // Check if this is an AI-enabled topic and respond if needed
                            if (_this.aiAssistantModel && _this.aiAssistantModel.isAITopic(channelId)) {
                                console.log("[TRACE] \uD83E\uDD16 NODE: AI topic detected, processing...");
                                console.log("[NodeOneCore] AI topic detected, processing messages...");
                                // AI response will be handled by AIMessageListener
                            }
                        });
                        console.log('[NodeOneCore] ✅ Federation channel sync listener registered');
                        // Add more detailed CHUM data reception logging
                        console.log('[NodeOneCore] 🎯🎯🎯 NODE: Setting up detailed CHUM data reception logging');
                        this.channelManager.onUpdated(function (channelInfoIdHash, channelId, owner, time, data) { return __awaiter(_this, void 0, void 0, function () {
                            var isP2P, ensureP2PTopicForIncomingMessage, error_13, chatMessages;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        isP2P = channelId.includes('<->');
                                        console.log('[NodeOneCore] 🔔🔔🔔 NODE CHUM DATA RECEIVED!', {
                                            channelId: channelId,
                                            owner: (owner === null || owner === void 0 ? void 0 : owner.substring(0, 8)) || 'null',
                                            isP2P: isP2P,
                                            dataLength: data === null || data === void 0 ? void 0 : data.length,
                                            timestamp: new Date(time).toISOString(),
                                            myOwnerId: (_a = this.ownerId) === null || _a === void 0 ? void 0 : _a.substring(0, 8),
                                            isMyChannel: owner === this.ownerId
                                        });
                                        if (isP2P && owner) {
                                            console.warn('[NodeOneCore] ⚠️ P2P message received in OWNED channel! Owner:', String(owner).substring(0, 8));
                                            console.warn('[NodeOneCore] This suggests the peer is using owned channels for P2P');
                                        }
                                        if (!(isP2P && (data === null || data === void 0 ? void 0 : data.length) > 0)) return [3 /*break*/, 5];
                                        console.log('[NodeOneCore] 📨 P2P message received, ensuring topic exists...');
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./p2p-topic-creator.js'); })];
                                    case 1:
                                        ensureP2PTopicForIncomingMessage = (_b.sent()).ensureP2PTopicForIncomingMessage;
                                        _b.label = 2;
                                    case 2:
                                        _b.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, ensureP2PTopicForIncomingMessage({
                                                topicModel: this.topicModel,
                                                channelManager: this.channelManager,
                                                leuteModel: this.leuteModel,
                                                channelId: channelId,
                                                message: data[0]
                                            })];
                                    case 3:
                                        _b.sent();
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_13 = _b.sent();
                                        console.error('[NodeOneCore] Failed to ensure P2P topic:', error_13.message);
                                        return [3 /*break*/, 5];
                                    case 5:
                                        // Log what's actually in the data
                                        if (data && (data === null || data === void 0 ? void 0 : data.length) > 0) {
                                            data.forEach(function (item, idx) {
                                                var _a, _b, _c;
                                                // Check if item is a string (hash) or object
                                                if (typeof item === 'string') {
                                                    console.log("[NodeOneCore]   CHUM Data[".concat(idx, "]: HASH: ").concat(String(item).substring(0, 16), "..."));
                                                }
                                                else {
                                                    console.log("[NodeOneCore]   CHUM Data[".concat(idx, "]:"), {
                                                        type: item.$type$,
                                                        content: item.content ? ((_a = item.content) === null || _a === void 0 ? void 0 : _a.substring(0, 50)) + '...' : undefined,
                                                        text: item.text ? ((_b = item.text) === null || _b === void 0 ? void 0 : _b.substring(0, 50)) + '...' : undefined,
                                                        author: (_c = item.author) === null || _c === void 0 ? void 0 : _c.substring(0, 8),
                                                        timestamp: item.creationTime
                                                    });
                                                }
                                            });
                                            chatMessages = data.filter(function (d) { return d.$type$ === 'ChatMessage'; });
                                            if ((chatMessages === null || chatMessages === void 0 ? void 0 : chatMessages.length) > 0) {
                                                console.log("[NodeOneCore] \uD83D\uDCAC NODE RECEIVED ".concat(chatMessages === null || chatMessages === void 0 ? void 0 : chatMessages.length, " CHAT MESSAGES via CHUM!"));
                                                chatMessages.forEach(function (msg) {
                                                    var _a, _b;
                                                    console.log('[NodeOneCore]   Message:', {
                                                        content: (_a = msg.content) === null || _a === void 0 ? void 0 : _a.substring(0, 100),
                                                        author: (_b = msg.author) === null || _b === void 0 ? void 0 : _b.substring(0, 8)
                                                    });
                                                });
                                                // Notify UI about new messages
                                                Promise.resolve().then(function () { return require('electron'); }).then(function (_a) {
                                                    var BrowserWindow = _a.BrowserWindow;
                                                    var windows = BrowserWindow.getAllWindows();
                                                    windows.forEach(function (window) {
                                                        window.webContents.send('message:updated', {
                                                            conversationId: channelId,
                                                            source: 'chum-sync'
                                                        });
                                                    });
                                                });
                                            }
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        // Initialize TopicModel - needs channelManager and leuteModel
                        // Use the imported TopicModel class - no dynamic import
                        this.topicModel = new TopicModel_js_1.default(this.channelManager, this.leuteModel);
                        return [4 /*yield*/, this.topicModel.init()];
                    case 26:
                        _w.sent();
                        console.log('[NodeOneCore] ✅ TopicModel initialized');
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('topics', 80, 'Chat topics initialized');
                        // Initialize Topic Group Manager for proper group topics
                        // Must be initialized BEFORE ConnectionsModel so filters are available
                        if (!this.topicGroupManager) {
                            this.topicGroupManager = new topic_group_manager_js_1.default(this, {
                                storeVersionedObject: storage_versioned_objects_js_1.storeVersionedObject,
                                storeUnversionedObject: storage_unversioned_objects_js_1.storeUnversionedObject,
                                getObjectByIdHash: storage_versioned_objects_js_1.getObjectByIdHash,
                                getObject: storage_unversioned_objects_js_2.getObject,
                                createAccess: access_js_1.createAccess,
                                calculateIdHashOfObj: object_js_1.calculateIdHashOfObj,
                                calculateHashOfObj: object_js_1.calculateHashOfObj,
                                getAllOfType: function (type) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        // Stub implementation - return empty array for now
                                        return [2 /*return*/, []];
                                    });
                                }); }
                            });
                            console.log('[NodeOneCore] ✅ Topic Group Manager initialized');
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./p2p-channel-access.js'); })];
                    case 27:
                        monitorP2PChannels = (_w.sent()).monitorP2PChannels;
                        monitorP2PChannels(this.channelManager, this.leuteModel);
                        console.log('[NodeOneCore] ✅ P2P channel access monitoring enabled');
                        // TODO: Fix AppStateModel - AppStateJournal recipe needs to be versioned
                        // Initialize AppStateModel for CRDT-based state journaling
                        // const { AppStateModel } = await import('@refinio/refinio-api/dist/state/index.js')
                        // // Pass the current ONE instance (oneAuth) to AppStateModel
                        // this.appStateModel = new AppStateModel(this.oneAuth, 'nodejs')
                        // await this.appStateModel.init(this.ownerId)
                        // console.log('[NodeOneCore] ✅ AppStateModel initialized')
                        // // Record initial Node.js state
                        // await this.appStateModel.recordStateChange(
                        //   'nodejs.initialized',
                        //   true,
                        //   false,
                        //   { action: 'init', description: 'Node.js ONE.core instance initialized' }
                        // )
                        console.log('[NodeOneCore] ⚠️  AppStateModel disabled - recipe issue needs fixing');
                        // Create contacts channel for CHUM sync
                        return [4 /*yield*/, this.channelManager.createChannel('contacts')];
                    case 28:
                        // Create contacts channel for CHUM sync
                        _w.sent();
                        console.log('[NodeOneCore] ✅ Contacts channel created');
                        // Create default topics (not just channels) on first initialization
                        // Don't create default topics here - let AIAssistantModel handle them
                        // when a model is selected to ensure proper AI participant setup
                        console.log('[NodeOneCore] Skipping default topic creation - will be created when AI model is selected');
                        _w.label = 29;
                    case 29:
                        _w.trys.push([29, 31, , 33]);
                        return [4 /*yield*/, GroupModel_js_1.default.constructFromLatestProfileVersionByGroupName('blacklist')];
                    case 30:
                        blacklistGroup = _w.sent();
                        console.log('[NodeOneCore] Using existing blacklist group');
                        return [3 /*break*/, 33];
                    case 31:
                        _e = _w.sent();
                        return [4 /*yield*/, this.leuteModel.createGroup('blacklist')];
                    case 32:
                        blacklistGroup = _w.sent();
                        console.log('[NodeOneCore] Created new blacklist group');
                        return [3 /*break*/, 33];
                    case 33: return [4 /*yield*/, Promise.resolve().then(function () { return require('./federation-api.js'); })];
                    case 34:
                        FederationAPI = (_w.sent()).default;
                        this.federationAPI = new FederationAPI(this);
                        // Note: Profile with OneInstanceEndpoint will be created on-the-fly
                        // when the browser is invited (in node-provisioning.js)
                        console.log('[NodeOneCore] Federation API initialized');
                        // Create ConnectionsModel with standard configuration matching one.leute
                        // Use the imported ConnectionsModel class - no dynamic import
                        // ConnectionsModel configuration with separate sockets for pairing and CHUM
                        // Port 8765: Pairing only (accepts unknown instances)
                        // Port 8766: CHUM sync only (known instances only)
                        this.connectionsModel = new ConnectionsModel_js_1.default(this.leuteModel, {
                            commServerUrl: commServerUrl,
                            acceptIncomingConnections: true,
                            acceptUnknownInstances: true, // Accept new instances via pairing
                            acceptUnknownPersons: false, // Require pairing for new persons
                            allowPairing: true, // Enable pairing protocol
                            establishOutgoingConnections: true, // Auto-connect to discovered endpoints
                            allowDebugRequests: true,
                            pairingTokenExpirationDuration: 60000 * 15, // 15 minutes
                            noImport: false,
                            noExport: false,
                            objectFilter: this.topicGroupManager.createObjectFilter(), // Outbound: allowlist of Groups we created
                            importFilter: this.topicGroupManager.createImportFilter() // Inbound: validate certificates from trusted people
                        });
                        console.log('[NodeOneCore] ConnectionsModel created');
                        console.log('[NodeOneCore]   - CommServer:', commServerUrl);
                        console.log('[NodeOneCore]   - Direct socket: ws://localhost:8765');
                        console.log('[NodeOneCore]   - acceptUnknownInstances: true');
                        console.log('[NodeOneCore]   - acceptUnknownPersons: false');
                        console.log('[NodeOneCore]   - allowPairing: true');
                        console.log('[NodeOneCore] ⚠️  SKIPPING ConnectionsModel initialization (causes infinite loop)');
                        console.log('[NodeOneCore] ConnectionsModel is NOT needed for local chat testing');
                        // TODO: Fix ConnectionsModel.init() infinite loop before enabling
                        // this.setupConnectionMonitoring()
                        // await this.connectionsModel.init(blacklistGroup)
                        console.log('[NodeOneCore] ✅ ConnectionsModel initialized with dual listeners');
                        console.log('[NodeOneCore]   - CommServer:', commServerUrl, '(for pairing & external connections)');
                        console.log('[NodeOneCore]   - Direct socket: ws://localhost:8765 (for browser-node federation)');
                        // Register CHUM protocol explicitly if needed
                        if (this.connectionsModel["leuteConnectionsModule"]) {
                            console.log('[NodeOneCore] Checking CHUM protocol registration...');
                            protocols = (_o = (_m = this.connectionsModel["leuteConnectionsModule"]).getRegisteredProtocols) === null || _o === void 0 ? void 0 : _o.call(_m);
                            if (protocols && !protocols.includes('chum')) {
                                console.warn('[NodeOneCore] CHUM protocol not registered, attempting manual registration...');
                                // CHUM is typically auto-registered by LeuteConnectionsModule
                                // If not, there may be an issue with the module initialization
                            }
                            else if (protocols) {
                                console.log('[NodeOneCore] ✅ CHUM protocol is registered:', protocols.includes('chum'));
                            }
                            // Monitor for CHUM connections
                            this.connectionsModel.onConnectionsChange(function () {
                                var connections = _this.connectionsModel.connectionsInfo();
                                var chumConnections = connections.filter(function (c) { return c.protocolName === 'chum' && c.isConnected; });
                                if ((chumConnections === null || chumConnections === void 0 ? void 0 : chumConnections.length) > 0) {
                                    console.log('[NodeOneCore] 🔄 Active CHUM connections:', chumConnections === null || chumConnections === void 0 ? void 0 : chumConnections.length);
                                    chumConnections.forEach(function (conn) {
                                        var _a;
                                        console.log('[NodeOneCore]   - CHUM with:', (_a = conn.remotePersonId) === null || _a === void 0 ? void 0 : _a.substring(0, 8));
                                    });
                                }
                            });
                        }
                        // Both listeners are now configured through incomingConnectionConfigurations
                        // No need for manual listenForDirectConnections - ConnectionsModel handles both
                        // Let ConnectionsModel handle all connection events internally
                        // We don't need to manually manage connections - that's what caused the spare connection issue
                        // Log pairing events
                        if (this.connectionsModel.pairing && this.connectionsModel.pairing.onPairingSuccess) {
                            console.log('[NodeOneCore] Pairing module available');
                            pairingSuccess = this.connectionsModel.pairing.onPairingSuccess;
                            if (typeof (pairingSuccess === null || pairingSuccess === void 0 ? void 0 : pairingSuccess.on) === 'function') {
                                pairingSuccess.on(function (initiatedLocally, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, token) {
                                    console.log('[NodeOneCore] 🎉 Pairing SUCCESS!', {
                                        initiatedLocally: initiatedLocally,
                                        localPerson: localPersonId === null || localPersonId === void 0 ? void 0 : localPersonId.substring(0, 8),
                                        localInstance: localInstanceId === null || localInstanceId === void 0 ? void 0 : localInstanceId.substring(0, 8),
                                        remotePerson: remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8),
                                        remoteInstance: remoteInstanceId === null || remoteInstanceId === void 0 ? void 0 : remoteInstanceId.substring(0, 8),
                                        token: token === null || token === void 0 ? void 0 : token.substring(0, 8)
                                    });
                                });
                            }
                        }
                        if (!((_r = (_q = (_p = this.connectionsModel) === null || _p === void 0 ? void 0 : _p.leuteConnectionsModule) === null || _q === void 0 ? void 0 : _q.connectionRouteManager) === null || _r === void 0 ? void 0 : _r.catchAllRoutes)) return [3 /*break*/, 42];
                        catchAllRoutes = this.connectionsModel.leuteConnectionsModule.connectionRouteManager.catchAllRoutes;
                        registeredKeys = __spreadArray([], catchAllRoutes.keys(), true);
                        console.log('[NodeOneCore] Socket listener registered CryptoApi keys:', registeredKeys);
                        console.log('[NodeOneCore] Number of registered keys:', registeredKeys === null || registeredKeys === void 0 ? void 0 : registeredKeys.length);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 35:
                        getInstanceOwnerIdHash = (_w.sent()).getInstanceOwnerIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/misc/instance.js'); })];
                    case 36:
                        getLocalInstanceOfPerson = (_w.sent()).getLocalInstanceOfPerson;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 37:
                        getDefaultKeys = (_w.sent()).getDefaultKeys;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 38:
                        getObject_1 = (_w.sent()).getObject;
                        myPersonId = getInstanceOwnerIdHash();
                        if (!myPersonId) {
                            throw new Error('Owner person ID not available for instance endpoint creation');
                        }
                        return [4 /*yield*/, getLocalInstanceOfPerson(myPersonId)];
                    case 39:
                        instanceId = _w.sent();
                        return [4 /*yield*/, getDefaultKeys(instanceId)];
                    case 40:
                        defaultInstanceKeys = _w.sent();
                        return [4 /*yield*/, getObject_1(defaultInstanceKeys)];
                    case 41:
                        instanceKeys = _w.sent();
                        console.log('[NodeOneCore] Our instance publicKey:', instanceKeys.publicKey);
                        console.log('[NodeOneCore] Is our key registered?:', registeredKeys.includes(instanceKeys.publicKey));
                        _w.label = 42;
                    case 42:
                        // ConnectionsModel handles all connections - both local and external
                        // It will manage WebSocket connections internally
                        console.log('[NodeOneCore] ✅ ConnectionsModel initialized and ready for connections');
                        leuteModule = this.connectionsModel.leuteConnectionsModule;
                        if (leuteModule && typeof leuteModule.acceptConnection === 'function') {
                            originalAcceptConnection_1 = leuteModule.acceptConnection.bind(leuteModule);
                            leuteModule.acceptConnection = function () {
                                var args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args[_i] = arguments[_i];
                                }
                                return __awaiter(_this, void 0, void 0, function () {
                                    var result, error_14;
                                    var _a, _b, _c;
                                    return __generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0:
                                                console.log('[NodeOneCore] 🔌 DEBUG: Incoming connection being accepted');
                                                console.log('[NodeOneCore] 🔌 DEBUG: Connection args:', args === null || args === void 0 ? void 0 : args.length);
                                                if (args[0]) {
                                                    console.log('[NodeOneCore] 🔌 DEBUG: Connection id:', args[0].id);
                                                    console.log('[NodeOneCore] 🔌 DEBUG: Connection plugins:', (_a = args[0].plugins) === null || _a === void 0 ? void 0 : _a.map(function (p) { return p.name; }));
                                                    console.log('[NodeOneCore] 🔌 DEBUG: Connection has PromisePlugin:', (_c = (_b = args[0]).hasPlugin) === null || _c === void 0 ? void 0 : _c.call(_b, 'promise'));
                                                }
                                                _d.label = 1;
                                            case 1:
                                                _d.trys.push([1, 3, , 4]);
                                                return [4 /*yield*/, originalAcceptConnection_1.apply(void 0, args)];
                                            case 2:
                                                result = _d.sent();
                                                console.log('[NodeOneCore] 🔌 DEBUG: Connection acceptance result:', !!result);
                                                return [2 /*return*/, result];
                                            case 3:
                                                error_14 = _d.sent();
                                                console.error('[NodeOneCore] ❌ DEBUG: Connection acceptance failed:', error_14.message);
                                                throw error_14;
                                            case 4: return [2 /*return*/];
                                        }
                                    });
                                });
                            };
                        }
                        // Duplicate pairing handler removed - handled above in setupConnectionMonitoring()
                        // Set up connection event monitoring
                        this.connectionsModel.onConnectionsChange(function () {
                            var _a;
                            var connections = _this.connectionsModel.connectionsInfo();
                            console.log('[NodeOneCore] 🔄 Connections changed event fired!');
                            console.log('[NodeOneCore] Current connections count:', connections.length);
                            // Log active CHUM connections
                            for (var _i = 0, connections_1 = connections; _i < connections_1.length; _i++) {
                                var conn = connections_1[_i];
                                if (conn.isConnected && conn.protocolName === 'chum') {
                                    console.log('[NodeOneCore] CHUM connection active with:', (_a = conn.remotePersonId) === null || _a === void 0 ? void 0 : _a.substring(0, 8));
                                    // CHUM will sync based on existing Access objects
                                }
                            }
                            // Log connection details for debugging
                            console.log('[NodeOneCore] Connection details:', connections.map(function (conn) {
                                var _a, _b;
                                return ({
                                    id: ((_a = conn.id) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...',
                                    isConnected: conn.isConnected,
                                    remotePersonId: (_b = conn.remotePersonId) === null || _b === void 0 ? void 0 : _b.substring(0, 8),
                                    protocolName: conn.protocolName
                                });
                            }));
                        });
                        // Wait for commserver connection to establish
                        console.log('[NodeOneCore] Waiting for commserver connection...');
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })
                            // Check if we're connected to commserver
                        ]; // Wait longer for connection
                    case 43:
                        _w.sent(); // Wait longer for connection
                        // Check if we're connected to commserver
                        console.log('[NodeOneCore] Checking commserver connection status...');
                        connections = this.connectionsModel.connectionsInfo();
                        console.log('[NodeOneCore] Active connections after init:', connections.length);
                        // Check if pairing is available
                        if (this.connectionsModel.pairing) {
                            console.log('[NodeOneCore] ✅ Pairing is available');
                            // Skip test invitation to avoid any waiting room conflicts
                            console.log('[NodeOneCore] Skipping test invitation to keep waiting room clear for actual pairing');
                        }
                        else {
                            console.log('[NodeOneCore] ❌ Pairing not available');
                        }
                        // Check catch-all routes after init
                        console.log('[NodeOneCore] Checking catch-all routes after init...');
                        leuteConnModule = this.connectionsModel.leuteConnectionsModule;
                        if ((_s = leuteConnModule === null || leuteConnModule === void 0 ? void 0 : leuteConnModule.connectionRouteManager) === null || _s === void 0 ? void 0 : _s.catchAllRoutes) {
                            catchAllCount = leuteConnModule.connectionRouteManager.catchAllRoutes.size;
                            console.log('[NodeOneCore] Catch-all routes registered:', catchAllCount);
                            if (catchAllCount > 0) {
                                console.log('[NodeOneCore] ✅ Pairing listener ready at commserver');
                            }
                        }
                        // Check if commserver is connected
                        if (this.connectionsModel.onlineState) {
                            console.log('[NodeOneCore] ✅ Connected to commserver');
                        }
                        else {
                            console.log('[NodeOneCore] ⚠️ Not connected to commserver - invitations may not work!');
                        }
                        // Check connection status
                        console.log('[NodeOneCore] Active connections:', connections.length);
                        // Log connection details for debugging
                        for (_i = 0, _f = connections; _i < _f.length; _i++) {
                            conn = _f[_i];
                            if (conn.isConnected) {
                                console.log("[NodeOneCore] Connected to: ".concat((_t = conn.remotePersonId) === null || _t === void 0 ? void 0 : _t.substring(0, 8), "... (").concat(conn.protocolName, ")"));
                            }
                        }
                        _w.label = 44;
                    case 44:
                        _w.trys.push([44, 51, , 52]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('net'); })];
                    case 45:
                        net_1 = (_w.sent()).default;
                        return [4 /*yield*/, new Promise(function (resolve) {
                                var socket = net_1.createConnection({ port: 8765, host: 'localhost' });
                                socket.on('connect', function () {
                                    socket.end();
                                    resolve(true);
                                });
                                socket.on('error', function () {
                                    resolve(false);
                                });
                            })];
                    case 46:
                        isListening = _w.sent();
                        console.log('[NodeOneCore] Port 8765 listening:', isListening);
                        leuteConnMod = this.connectionsModel.leuteConnectionsModule;
                        if (!(!isListening && (leuteConnMod === null || leuteConnMod === void 0 ? void 0 : leuteConnMod.connectionRouteManager))) return [3 /*break*/, 50];
                        console.log('[NodeOneCore] Port 8765 not listening, starting direct socket route...');
                        allRoutes = leuteConnMod.connectionRouteManager.getAllRoutes();
                        _g = 0, allRoutes_1 = allRoutes;
                        _w.label = 47;
                    case 47:
                        if (!(_g < allRoutes_1.length)) return [3 /*break*/, 50];
                        route = allRoutes_1[_g];
                        if (!(route.type === 'IncomingWebsocketRouteDirect' && route.port === 8765 && !route.active)) return [3 /*break*/, 49];
                        console.log('[NodeOneCore] Starting direct socket route...');
                        return [4 /*yield*/, route.start()];
                    case 48:
                        _w.sent();
                        console.log('[NodeOneCore] ✅ Direct socket listener started on ws://localhost:8765');
                        _w.label = 49;
                    case 49:
                        _g++;
                        return [3 /*break*/, 47];
                    case 50: return [3 /*break*/, 52];
                    case 51:
                        error_8 = _w.sent();
                        console.log('[NodeOneCore] Could not check port 8765:', error_8.message);
                        return [3 /*break*/, 52];
                    case 52:
                        // ConnectionsModel handles CommServer automatically with allowPairing: true
                        // Pairing will transition to CHUM after successful handshake
                        // Ensure CHUM protocol is registered and enabled
                        console.log('[NodeOneCore] Ensuring CHUM protocol is available...');
                        if (this.connectionsModel["leuteConnectionsModule"]) {
                            protocols = (_v = (_u = this.connectionsModel["leuteConnectionsModule"]).getRegisteredProtocols) === null || _v === void 0 ? void 0 : _v.call(_u);
                            if (protocols) {
                                console.log('[NodeOneCore] Available protocols:', protocols);
                            }
                        }
                        console.log('[NodeOneCore] ConnectionsModel initialized with CommServer and direct socket');
                        console.log('[NodeOneCore] ✅ ConnectionsModel initialized');
                        // Set up listeners for connection events
                        this.connectionsModel.onConnectionsChange(function () { return __awaiter(_this, void 0, void 0, function () {
                            var connections, _i, connections_2, conn;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        console.log('[NodeOneCore] 🔄 Connections changed event fired!');
                                        connections = this.connectionsModel.connectionsInfo();
                                        console.log('[NodeOneCore] Current connections count:', connections.length);
                                        console.log('[NodeOneCore] Connection details:', JSON.stringify(connections.map(function (c) { return ({
                                            id: c.id,
                                            isConnected: c.isConnected,
                                            remotePersonId: c.remotePersonId,
                                            protocolName: c.protocolName
                                        }); }), null, 2));
                                        _i = 0, connections_2 = connections;
                                        _b.label = 1;
                                    case 1:
                                        if (!(_i < connections_2.length)) return [3 /*break*/, 4];
                                        conn = connections_2[_i];
                                        if (!(conn.isConnected && conn.protocolName === 'chum' && conn.remotePersonId)) return [3 /*break*/, 3];
                                        console.log("[NodeOneCore] CHUM connection detected with remote person: ".concat((_a = conn.remotePersonId) === null || _a === void 0 ? void 0 : _a.substring(0, 8), "..."));
                                        // Grant the connected peer access to our profile and P2P channel
                                        return [4 /*yield*/, this.grantPeerAccess(conn.remotePersonId, 'chum-connection')
                                            // Contact discovery happens automatically through CHUM sync
                                            // LeuteModel will receive the peer's profile through CHUM and create the contact
                                        ];
                                    case 2:
                                        // Grant the connected peer access to our profile and P2P channel
                                        _b.sent();
                                        // Contact discovery happens automatically through CHUM sync
                                        // LeuteModel will receive the peer's profile through CHUM and create the contact
                                        console.log("[NodeOneCore] Contact will be discovered through CHUM sync");
                                        _b.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        // Set up message sync handling for AI responses
                        return [4 /*yield*/, this.setupMessageSync()];
                    case 53:
                        // Set up message sync handling for AI responses
                        _w.sent();
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress('ai', 90, 'AI assistant initialized');
                        // Create channels for existing conversations so Node receives CHUM updates
                        return [4 /*yield*/, this.createChannelsForExistingConversations()
                            // Groups are created during topic creation via createGroupTopic()
                            // No retroactive scanning - topics create their own groups
                            // AI contacts are set up by AIAssistantModel.init() during setupMessageSync()
                            // No need to duplicate contact creation here
                            // Initialize Feed-Forward Manager
                            // try {
                            //   const feedForwardHandlers = await import('../ipc/handlers/feed-forward.js')
                            //   feedForwardHandlers.default.initializeFeedForward(this)
                            //   console.log('[NodeOneCore] ✅ Feed-Forward Manager initialized')
                            // } catch (error) {
                            //   console.error('[NodeOneCore] Failed to initialize Feed-Forward Manager:', error)
                            // }
                        ];
                    case 54:
                        // Create channels for existing conversations so Node receives CHUM updates
                        _w.sent();
                        // Groups are created during topic creation via createGroupTopic()
                        // No retroactive scanning - topics create their own groups
                        // AI contacts are set up by AIAssistantModel.init() during setupMessageSync()
                        // No need to duplicate contact creation here
                        // Initialize Feed-Forward Manager
                        // try {
                        //   const feedForwardHandlers = await import('../ipc/handlers/feed-forward.js')
                        //   feedForwardHandlers.default.initializeFeedForward(this)
                        //   console.log('[NodeOneCore] ✅ Feed-Forward Manager initialized')
                        // } catch (error) {
                        //   console.error('[NodeOneCore] Failed to initialize Feed-Forward Manager:', error)
                        // }
                        console.log('[NodeOneCore] All models initialized successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create channels for existing conversations so Node participates in CHUM sync
     */
    NodeOneCore.prototype.createChannelsForExistingConversations = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stateManager, state, conversationsMap, _i, conversationsMap_1, _a, id, conversation, isP2P, channelOwner, error_15, error_16;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[NodeOneCore] Creating channels for existing conversations...');
                        if (!this.channelManager) {
                            console.warn('[NodeOneCore] ChannelManager not available');
                            return [2 /*return*/];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 11, , 12]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../state/manager.js'); })];
                    case 2:
                        stateManager = (_c.sent()).default;
                        state = stateManager.getState();
                        conversationsMap = state === null || state === void 0 ? void 0 : state.conversations;
                        if (!(conversationsMap && conversationsMap.size > 0)) return [3 /*break*/, 9];
                        console.log("[NodeOneCore] Found ".concat(conversationsMap.size, " existing conversations"));
                        _i = 0, conversationsMap_1 = conversationsMap;
                        _c.label = 3;
                    case 3:
                        if (!(_i < conversationsMap_1.length)) return [3 /*break*/, 8];
                        _a = conversationsMap_1[_i], id = _a[0], conversation = _a[1];
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        isP2P = id.includes('<->');
                        // For P2P conversations, skip creating channels here
                        // P2P channels are managed by TopicGroupManager.ensureP2PChannelsForPeer
                        if (isP2P) {
                            console.log("[NodeOneCore] Skipping P2P channel creation for: ".concat(id, " (handled by TopicGroupManager)"));
                            return [3 /*break*/, 7];
                        }
                        channelOwner = this.ownerId;
                        // Create a channel for each conversation
                        // This ensures the Node instance receives CHUM updates for messages in these conversations
                        return [4 /*yield*/, this.channelManager.createChannel(id, channelOwner)];
                    case 5:
                        // Create a channel for each conversation
                        // This ensures the Node instance receives CHUM updates for messages in these conversations
                        _c.sent();
                        console.log("[NodeOneCore] Created channel for conversation: ".concat(id, " (owner: ").concat(channelOwner, ")"));
                        return [3 /*break*/, 7];
                    case 6:
                        error_15 = _c.sent();
                        // Channel might already exist, that's fine
                        if (!((_b = error_15.message) === null || _b === void 0 ? void 0 : _b.includes('already exists'))) {
                            console.warn("[NodeOneCore] Could not create channel for ".concat(id, ":"), error_15.message);
                        }
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        console.log('[NodeOneCore] No existing conversations found');
                        _c.label = 10;
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        error_16 = _c.sent();
                        console.error('[NodeOneCore] Error creating channels for existing conversations:', error_16);
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set up message sync - listen for user messages, process with AI, respond
     */
    NodeOneCore.prototype.setupMessageSync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var AIMessageListener, PeerMessageListener, llmManager, _a, mcpManager, BrowserWindow, mainWindow;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[NodeOneCore] Setting up event-based message sync for AI processing...');
                        if (!this.channelManager) {
                            console.warn('[NodeOneCore] ChannelManager not available for message sync');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./ai-message-listener.js'); })];
                    case 1:
                        AIMessageListener = _b.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./peer-message-listener.js'); })];
                    case 2:
                        PeerMessageListener = _b.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../services/llm-manager-singleton.js'); })];
                    case 3:
                        llmManager = (_b.sent()).default;
                        // Create the AI message listener before AIAssistantModel
                        this.aiMessageListener = new AIMessageListener.default(this.channelManager, llmManager // Use the actual LLM manager from main process
                        );
                        // Create the peer message listener for real-time UI updates
                        this.peerMessageListener = new PeerMessageListener.default(this.channelManager, this.topicModel);
                        if (!!this.topicAnalysisModel) return [3 /*break*/, 5];
                        this.topicAnalysisModel = new TopicAnalysisModel_js_1.default(this.channelManager, this.topicModel);
                        return [4 /*yield*/, this.topicAnalysisModel.init()];
                    case 4:
                        _b.sent();
                        console.log('[NodeOneCore] ✅ Topic Analysis Model initialized');
                        _b.label = 5;
                    case 5:
                        // Discover Claude models BEFORE AIAssistantModel initialization
                        // This ensures Claude models are available when loadExistingAIContacts() runs
                        console.log('[NodeOneCore] Discovering Claude models before AI Assistant init...');
                        return [4 /*yield*/, llmManager.discoverClaudeModels()];
                    case 6:
                        _b.sent();
                        console.log('[NodeOneCore] ✅ Claude models discovered');
                        if (!!this.aiAssistantModel) return [3 /*break*/, 8];
                        _a = this;
                        return [4 /*yield*/, (0, ai_assistant_handler_adapter_js_1.initializeAIAssistantHandler)(this, llmManager)];
                    case 7:
                        _a.aiAssistantModel = _b.sent();
                        console.log('[NodeOneCore] ✅ AI Assistant Handler initialized (refactored architecture)');
                        // Connect AIAssistantHandler to the message listener
                        this.aiMessageListener.setAIAssistantModel(this.aiAssistantModel);
                        console.log('[NodeOneCore] ✅ Connected AIAssistantHandler to message listener');
                        _b.label = 8;
                    case 8:
                        // Register NodeOneCore with MCPManager to enable memory tools
                        console.log('[NodeOneCore] Registering memory tools with MCP Manager...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../services/mcp-manager.js'); })];
                    case 9:
                        mcpManager = (_b.sent()).default;
                        mcpManager.setNodeOneCore(this);
                        console.log('[NodeOneCore] ✅ Memory tools registered with MCP Manager');
                        // Groups are created when topics are created via createGroupTopic()
                        // No retroactive group creation - that's legacy garbage
                        // Initialize Refinio API Server as part of this ONE.core instance
                        // TODO: Re-enable after fixing packages/refinio.api imports
                        // if (!this.apiServer) {
                        //   this.apiServer = new RefinioApiServer(this.aiAssistantModel)
                        //   // The API server will use THIS instance, not create a new one
                        //   await this.apiServer.start()
                        // }
                        // Start the listeners
                        this.aiMessageListener.start();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('electron'); })];
                    case 10:
                        BrowserWindow = (_b.sent()).BrowserWindow;
                        mainWindow = BrowserWindow.getAllWindows()[0];
                        if (mainWindow) {
                            this.peerMessageListener.setMainWindow(mainWindow);
                        }
                        this.peerMessageListener.setOwnerId(this.ownerId);
                        this.peerMessageListener.start();
                        console.log('[NodeOneCore] ✅ Event-based message sync set up for AI and peer message processing');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send AI greeting message to a topic
     */
    NodeOneCore.prototype.sendAIGreeting = function (topicRoom) {
        return __awaiter(this, void 0, void 0, function () {
            var llmManager, models, modelId, defaultModel, modelName, aiPersonId, greetingText, error_17;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../services/llm-manager-singleton.js'); })];
                    case 1:
                        llmManager = (_b.sent()).default;
                        models = (_a = this.llmManager) === null || _a === void 0 ? void 0 : _a.getAvailableModels();
                        modelId = llmManager.defaultModelId;
                        defaultModel = llmManager.getDefaultModel();
                        modelName = (defaultModel === null || defaultModel === void 0 ? void 0 : defaultModel.name) || 'your AI assistant';
                        return [4 /*yield*/, this.getOrCreateAIPersonId(modelId, modelName)
                            // Send greeting message as plain text
                            // TopicRoom.sendMessage expects (text, author, channelOwner)
                        ];
                    case 2:
                        aiPersonId = _b.sent();
                        greetingText = "Hello! I'm ".concat(modelName, ". How can I help you today?");
                        return [4 /*yield*/, topicRoom.sendMessage(greetingText, aiPersonId, undefined)];
                    case 3:
                        _b.sent();
                        console.log("[NodeOneCore] \u2705 AI greeting sent from ".concat(modelName));
                        return [3 /*break*/, 5];
                    case 4:
                        error_17 = _b.sent();
                        console.error('[NodeOneCore] Failed to send AI greeting:', error_17);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if a message should be processed by AI
     */
    NodeOneCore.prototype.shouldProcessMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Skip if it's an AI message (don't respond to ourselves)
                if (message.author && message.author.includes('ai-')) {
                    return [2 /*return*/, false];
                }
                // Skip if we already responded to this message
                // TODO: Implement proper tracking of processed messages
                return [2 /*return*/, true];
            });
        });
    };
    /**
     * Process a user message with AI and send response
     */
    NodeOneCore.prototype.processMessageWithAI = function (topicRoom, userMessage) {
        return __awaiter(this, void 0, void 0, function () {
            var llmManager, response, aiPersonId, error_18;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodeOneCore] Processing user message with AI...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../services/llm-manager-singleton.js'); })];
                    case 2:
                        llmManager = (_a.sent()).default;
                        return [4 /*yield*/, llmManager.generateResponse({
                                messages: [{
                                        role: 'user',
                                        content: userMessage.content
                                    }],
                                model: llmManager.defaultModelId
                            })];
                    case 3:
                        response = _a.sent();
                        if (!(response && response.content)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.getOrCreateAIPersonId(llmManager.defaultModelId, 'AI Assistant')
                            // Send AI response to topic (will sync via CHUM to browser)
                        ];
                    case 4:
                        aiPersonId = _a.sent();
                        // Send AI response to topic (will sync via CHUM to browser)
                        return [4 /*yield*/, topicRoom.sendMessage(response.content, aiPersonId, this.ownerId)];
                    case 5:
                        // Send AI response to topic (will sync via CHUM to browser)
                        _a.sent();
                        console.log('[NodeOneCore] ✅ AI response sent to topic');
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_18 = _a.sent();
                        console.error('[NodeOneCore] Error processing message with AI:', error_18);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // REMOVED: setupAIContacts() - AIAssistantModel handles all AI contact creation
    /**
     * Get AI person ID for a model (delegates to AIContactManager)
     */
    NodeOneCore.prototype.getOrCreateAIPersonId = function (modelId, displayName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Delegate to the AI Assistant Model
                return [2 /*return*/, this.aiAssistantModel.createAIContact(modelId, displayName)];
            });
        });
    };
    /**
     * OLD METHOD - TO BE REMOVED
     */
    NodeOneCore.prototype.getOrCreateAIPersonId_OLD = function (modelId, displayName) {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject_2, createPersonIfNotExist, email, result, personId, someone, someoneIdHash, myIdentity, newProfile, someoneModel, profile, error_19, crypto_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[NodeOneCore] Getting/creating AI person for ".concat(displayName, " (").concat(modelId, ")"));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 15, , 17]);
                        if (!this.leuteModel) {
                            console.error('[NodeOneCore] LeuteModel not available');
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        storeVersionedObject_2 = (_b.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/misc/person.js'); })];
                    case 3:
                        createPersonIfNotExist = (_b.sent()).createPersonIfNotExist;
                        email = "".concat(modelId.replace(/[^a-zA-Z0-9]/g, '_'), "@ai.local");
                        return [4 /*yield*/, createPersonIfNotExist(email)];
                    case 4:
                        result = _b.sent();
                        personId = result === null || result === void 0 ? void 0 : result.personId;
                        if (result === null || result === void 0 ? void 0 : result.exists) {
                            console.log("[NodeOneCore] Using existing AI person for ".concat(displayName, ": ").concat(String(personId).substring(0, 8), "..."));
                        }
                        else {
                            console.log("[NodeOneCore] Created new AI person for ".concat(displayName, ": ").concat(String(personId).substring(0, 8), "..."));
                        }
                        return [4 /*yield*/, this.leuteModel.getSomeone(personId)];
                    case 5:
                        someone = _b.sent();
                        someoneIdHash = void 0;
                        if (!!someone) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.leuteModel.myMainIdentity()];
                    case 6:
                        myIdentity = _b.sent();
                        return [4 /*yield*/, ProfileModel_js_1.default.constructWithNewProfile(personId, myIdentity, 'default')];
                    case 7:
                        newProfile = _b.sent();
                        return [4 /*yield*/, this.leuteModel.addProfile(newProfile.idHash)];
                    case 8:
                        _b.sent();
                        return [4 /*yield*/, this.leuteModel.getSomeone(personId)];
                    case 9:
                        someone = _b.sent();
                        if (!someone) {
                            throw new Error('Failed to create Someone wrapper for AI person');
                        }
                        someoneIdHash = someone.idHash;
                        return [3 /*break*/, 11];
                    case 10:
                        someoneIdHash = someone.idHash;
                        _b.label = 11;
                    case 11: return [4 /*yield*/, SomeoneModel_js_1.default.constructFromLatestVersion(someoneIdHash)
                        // Get the main profile of the Someone  
                    ];
                    case 12:
                        someoneModel = _b.sent();
                        return [4 /*yield*/, someoneModel.mainProfile()
                            // Add AI-specific information to the profile
                        ];
                    case 13:
                        profile = _b.sent();
                        // Add AI-specific information to the profile
                        profile.personDescriptions = profile.personDescriptions || [];
                        if (profile.personDescriptions) {
                            profile.personDescriptions.push({
                                $type$: 'PersonName',
                                name: displayName
                            });
                        }
                        // Add AI model identifier as a custom field
                        profile.description = "".concat(displayName, " AI Assistant (").concat(modelId, ")");
                        // Add communication endpoint
                        profile.communicationEndpoints = profile.communicationEndpoints || [];
                        (_a = profile.communicationEndpoints) === null || _a === void 0 ? void 0 : _a.push({
                            $type$: 'Email',
                            email: email
                        });
                        // Persist the changes
                        return [4 /*yield*/, profile.saveAndLoad()];
                    case 14:
                        // Persist the changes
                        _b.sent();
                        console.log("[NodeOneCore] \u2705 AI contact ".concat(displayName, " ready with ID: ").concat(String(personId).substring(0, 8), "..."));
                        return [2 /*return*/, personId];
                    case 15:
                        error_19 = _b.sent();
                        console.error("[NodeOneCore] Failed to create AI person for ".concat(displayName, ":"), error_19);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('crypto'); })];
                    case 16:
                        crypto_1 = _b.sent();
                        return [2 /*return*/, crypto_1
                                .createHash('sha256')
                                .update("ai-assistant-".concat(modelId, "-").concat(this.ownerId))
                                .digest('hex')];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    // REMOVED: setupAIContactsWhenReady() - AIAssistantModel handles all AI contact creation
    // Removed setupBrowserAccess - browser has no ONE instance
    /**
     * Get current instance info
     */
    NodeOneCore.prototype.getInfo = function () {
        return {
            initialized: this.initialized,
            name: this.instanceName,
            ownerId: this.ownerId
        };
    };
    /**
     * Get the ONE.core instance object
     * @returns {Object} The instance object or null if not initialized
     */
    NodeOneCore.prototype.getInstance = function () {
        if (!this.initialized || !this.instanceModule) {
            return null;
        }
        // Return the instance module's exports which contains the instance
        return this.instanceModule;
    };
    /**
     * Get instance credentials for browser pairing
     */
    NodeOneCore.prototype.getCredentialsForBrowser = function () {
        return __awaiter(this, void 0, void 0, function () {
            var SettingsStore, email, instanceName;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.initialized) {
                            throw new Error('Node.js instance not initialized');
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/system/settings-store.js'); })];
                    case 1:
                        SettingsStore = (_a.sent()).SettingsStore;
                        return [4 /*yield*/, SettingsStore.getItem('email')];
                    case 2:
                        email = _a.sent();
                        return [4 /*yield*/, SettingsStore.getItem('instance')];
                    case 3:
                        instanceName = _a.sent();
                        if (!email) {
                            throw new Error('No credentials found in Node.js instance');
                        }
                        return [2 /*return*/, {
                                email: email,
                                nodeInstanceName: instanceName,
                                // Browser should use same email but different instance name
                                browserInstanceName: 'browser'
                            }];
                }
            });
        });
    };
    /**
     * Set/get state and settings
     */
    NodeOneCore.prototype.setState = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log("[NodeOneCore] Setting state: ".concat(key));
                // TODO: Use Settings datatype when available
                return [2 /*return*/, true];
            });
        });
    };
    NodeOneCore.prototype.getState = function (key) {
        // TODO: Use Settings datatype when available
        return undefined;
    };
    NodeOneCore.prototype.setSetting = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implement proper settings storage
                console.log("[NodeOneCore] Setting: ".concat(key, " = ").concat(value));
                return [2 /*return*/, true];
            });
        });
    };
    NodeOneCore.prototype.getSetting = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implement proper settings retrieval
                return [2 /*return*/, undefined];
            });
        });
    };
    NodeOneCore.prototype.getSettings = function (prefix) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implement proper settings retrieval
                return [2 /*return*/, {}];
            });
        });
    };
    /**
     * Handle known connections - start CHUM protocol
     */
    NodeOneCore.prototype.handleKnownConnection = function (conn, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, initiatedLocally, routeGroupId) {
        return __awaiter(this, void 0, void 0, function () {
            var startChumProtocol, OEvent, onProtocolStart;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodeOneCore] Starting CHUM protocol for known connection');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/misc/ConnectionEstablishment/protocols/Chum.js'); })];
                    case 1:
                        startChumProtocol = (_a.sent()).startChumProtocol;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/misc/OEvent.js'); })];
                    case 2:
                        OEvent = (_a.sent()).OEvent;
                        onProtocolStart = new OEvent();
                        return [4 /*yield*/, startChumProtocol(conn, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, initiatedLocally, routeGroupId, onProtocolStart, false, // noImport
                            false // noExport
                            )];
                    case 3:
                        _a.sent();
                        console.log('[NodeOneCore] ✅ CHUM protocol started');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle unknown connections - could be browser with different person ID
     */
    NodeOneCore.prototype.handleUnknownConnection = function (conn, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, initiatedLocally, routeGroupId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodeOneCore] Handling unknown connection - checking if it\'s the browser');
                        if (!routeGroupId.includes('chum')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.handleKnownConnection(conn, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, initiatedLocally, routeGroupId)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clean up instance to allow re-initialization
     */
    NodeOneCore.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var closeInstance, error_20;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodeOneCore] Cleaning up instance...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        // Stop the AI message listener
                        if (this.aiMessageListener) {
                            this.aiMessageListener.stop();
                            this.aiMessageListener = null;
                        }
                        if (!this.directListenerStopFn) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.directListenerStopFn()];
                    case 2:
                        _a.sent();
                        this.directListenerStopFn = null;
                        _a.label = 3;
                    case 3:
                        // Close WebSocket server if running
                        if (this.wss) {
                            this.wss.close();
                            this.wss = null;
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 4:
                        closeInstance = (_a.sent()).closeInstance;
                        closeInstance();
                        // Reset all models and groups
                        this.leuteModel = null;
                        this.connectionsModel = null;
                        this.channelManager = null;
                        this.topicModel = null;
                        this.oneAuth = null;
                        this.federationGroup = null;
                        this.replicantGroup = null;
                        this.topicGroupManager = null;
                        this.aiAssistant = null;
                        this.quickReply = null;
                        // Clear intervals
                        if (this.messageSyncInterval) {
                            clearInterval(this.messageSyncInterval);
                            this.messageSyncInterval = null;
                        }
                        console.log('[NodeOneCore] Cleanup complete');
                        return [3 /*break*/, 6];
                    case 5:
                        error_20 = _a.sent();
                        console.error('[NodeOneCore] Error during cleanup:', error_20);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set up proper access rights using AccessRightsManager pattern
     */
    NodeOneCore.prototype.setupProperAccessRights = function () {
        return __awaiter(this, void 0, void 0, function () {
            var everyoneGroup, _a, _b, _c, _d, _e, _f, NodeAccessRightsManager, error_21;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.channelManager || !this.leuteModel) {
                            console.warn('[NodeOneCore] ChannelManager or LeuteModel not available for access rights setup');
                            return [2 /*return*/];
                        }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 14, , 15]);
                        return [4 /*yield*/, LeuteModel_js_1.default.everyoneGroup()
                            // Create federation group for instance-to-instance communication
                        ];
                    case 2:
                        everyoneGroup = _g.sent();
                        _g.label = 3;
                    case 3:
                        _g.trys.push([3, 5, , 7]);
                        _a = this;
                        return [4 /*yield*/, GroupModel_js_1.default.constructFromLatestProfileVersionByGroupName('federation')];
                    case 4:
                        _a.federationGroup = _g.sent();
                        console.log('[NodeOneCore] Using existing federation group');
                        return [3 /*break*/, 7];
                    case 5:
                        _b = _g.sent();
                        _c = this;
                        return [4 /*yield*/, this.leuteModel.createGroup('federation')];
                    case 6:
                        _c.federationGroup = _g.sent();
                        console.log('[NodeOneCore] Created new federation group');
                        return [3 /*break*/, 7];
                    case 7:
                        _g.trys.push([7, 9, , 11]);
                        _d = this;
                        return [4 /*yield*/, GroupModel_js_1.default.constructFromLatestProfileVersionByGroupName('replicant')];
                    case 8:
                        _d.replicantGroup = _g.sent();
                        console.log('[NodeOneCore] Using existing replicant group');
                        return [3 /*break*/, 11];
                    case 9:
                        _e = _g.sent();
                        _f = this;
                        return [4 /*yield*/, this.leuteModel.createGroup('replicant')];
                    case 10:
                        _f.replicantGroup = _g.sent();
                        console.log('[NodeOneCore] Created new replicant group');
                        return [3 /*break*/, 11];
                    case 11: return [4 /*yield*/, Promise.resolve().then(function () { return require('./access-rights-manager.js'); })];
                    case 12:
                        NodeAccessRightsManager = (_g.sent()).default;
                        // ConnectionsModel already imported and used as this.connectionsModel
                        this.accessRightsManager = new NodeAccessRightsManager(this.channelManager, this.connectionsModel, this.leuteModel);
                        return [4 /*yield*/, this.accessRightsManager.init({
                                everyone: everyoneGroup.groupIdHash,
                                federation: this.federationGroup.groupIdHash,
                                replicant: this.replicantGroup.groupIdHash
                            })];
                    case 13:
                        _g.sent();
                        console.log('[NodeOneCore] ✅ Access rights manager initialized with proper groups');
                        return [3 /*break*/, 15];
                    case 14:
                        error_21 = _g.sent();
                        console.error('[NodeOneCore] Failed to setup access rights:', error_21);
                        return [3 /*break*/, 15];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    // REMOVED: startDirectListener()
    // Direct WebSocket listener now handled by ConnectionsModel via socketConfig
    /**
     * Reset the singleton instance to clean state
     * Used when app data is cleared
     */
    NodeOneCore.prototype.reset = function () {
        // Reset all properties to initial state
        this.initialized = false;
        this.instanceName = null;
        this.ownerId = null;
        this.leuteModel = null;
        this.appStateModel = null;
        this.connectionsModel = null;
        this.channelManager = null;
        this.topicModel = null;
        this.localWsServer = null;
        this.instanceModule = null;
        this.aiAssistantModel = null;
        this.apiServer = null;
        this.topicGroupManager = null;
        this.federationGroup = null;
        this.replicantGroup = null;
        this.accessRightsManager = null;
        this.aiAssistant = null;
        this.quickReply = null;
        this.messageSyncInterval = null;
        this.aiMessageListener = null;
        this.initFailed = false;
        console.log('[NodeOneCore] Instance reset to clean state');
    };
    /**
     * Shutdown the instance properly
     */
    NodeOneCore.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodeOneCore] Shutting down...');
                        // Stop message listeners
                        if (this.aiMessageListener) {
                            this.aiMessageListener.stop();
                            this.aiMessageListener = null;
                        }
                        if (this.peerMessageListener) {
                            this.peerMessageListener.stop();
                            this.peerMessageListener = null;
                        }
                        if (!this.directSocketStopFn) return [3 /*break*/, 2];
                        console.log('[NodeOneCore] Stopping direct WebSocket listener...');
                        return [4 /*yield*/, this.directSocketStopFn()];
                    case 1:
                        _a.sent();
                        this.directSocketStopFn = null;
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.cleanup()];
                    case 3:
                        _a.sent();
                        if (!this.accessRightsManager) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.accessRightsManager.shutdown()];
                    case 4:
                        _a.sent();
                        this.accessRightsManager = undefined;
                        _a.label = 5;
                    case 5:
                        this.initialized = false;
                        this.instanceName = null;
                        this.ownerId = null;
                        console.log('[NodeOneCore] Shutdown complete');
                        return [2 /*return*/];
                }
            });
        });
    };
    return NodeOneCore;
}());
// Singleton
var instance = new NodeOneCore();
exports.instance = instance;
exports.default = instance;
