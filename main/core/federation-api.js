"use strict";
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
 * Federation API - Implements @refinio/one.api patterns for federated instances
 * Manages contacts with endpoints for proper instance federation
 * Based on refinio.api patterns from https://github.com/juergengeck/refinio.api
 */
var FederationAPI = /** @class */ (function () {
    function FederationAPI(nodeOneCore) {
        this.nodeOneCore = nodeOneCore;
        this.contacts = new Map();
        this.profiles = new Map();
    }
    /**
     * DEPRECATED: We don't create profiles - let CHUM sync them from peers
     * @deprecated
     */
    FederationAPI.prototype.createProfile = function (personId, profileData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.warn('[FederationAPI] createProfile called but we should not create profiles - let CHUM sync them');
                // Return null - profiles should come from CHUM sync, not be created locally
                return [2 /*return*/, null];
            });
        });
    };
    /**
     * Create a contact with an endpoint
     * This is the proper way to register federated instances
     */
    FederationAPI.prototype.createContactWithEndpoint = function (personId_1, instanceId_1, instanceName_1) {
        return __awaiter(this, arguments, void 0, function (personId, instanceId, instanceName, urls) {
            var storeUnversionedObject, getDefaultKeys, personKeys, instanceKeys, endpoint, endpointHash;
            if (urls === void 0) { urls = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 1:
                        storeUnversionedObject = (_a.sent()).storeUnversionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 2:
                        getDefaultKeys = (_a.sent()).getDefaultKeys;
                        console.log("[FederationAPI] Creating contact for ".concat(instanceName, "..."));
                        return [4 /*yield*/, getDefaultKeys(personId)];
                    case 3:
                        personKeys = _a.sent();
                        return [4 /*yield*/, getDefaultKeys(instanceId)
                            // Create OneInstanceEndpoint
                        ];
                    case 4:
                        instanceKeys = _a.sent();
                        endpoint = {
                            $type$: 'OneInstanceEndpoint',
                            personId: personId,
                            instanceId: instanceId,
                            personKeys: personKeys,
                            instanceKeys: instanceKeys,
                            url: urls.length > 0 ? urls[0] : undefined // Use first URL if available
                        };
                        return [4 /*yield*/, storeUnversionedObject(endpoint)];
                    case 5:
                        endpointHash = _a.sent();
                        console.log("[FederationAPI] Created OneInstanceEndpoint: ".concat(endpointHash));
                        // LeuteConnectionsModule will automatically discover this endpoint
                        // No need for a separate Contact object - the endpoint IS the contact
                        // Track in memory
                        this.contacts.set(instanceId, {
                            personId: personId,
                            instanceId: instanceId,
                            instanceName: instanceName,
                            endpointHash: endpointHash,
                            urls: urls
                        });
                        return [2 /*return*/, {
                                endpointHash: endpointHash,
                                contact: this.contacts.get(instanceId)
                            }];
                }
            });
        });
    };
    /**
     * Register the local Node instance
     * Creates its endpoint without a direct URL (CommServer only)
     */
    FederationAPI.prototype.registerLocalNode = function () {
        return __awaiter(this, void 0, void 0, function () {
            var getInstanceIdHash, getDefaultKeys, instanceId, personId, personKeys, instanceKeys, endpoint, me, profile, ProfileModel, existingEndpoint;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.nodeOneCore.initialized) {
                            throw new Error('Node not initialized');
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 1:
                        getInstanceIdHash = (_a.sent()).getInstanceIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 2:
                        getDefaultKeys = (_a.sent()).getDefaultKeys;
                        instanceId = getInstanceIdHash();
                        personId = this.nodeOneCore.ownerId;
                        // Validate required IDs
                        if (!instanceId) {
                            throw new Error('Instance ID not available');
                        }
                        if (!personId) {
                            throw new Error('Person ID not available');
                        }
                        return [4 /*yield*/, getDefaultKeys(personId)];
                    case 3:
                        personKeys = _a.sent();
                        return [4 /*yield*/, getDefaultKeys(instanceId)];
                    case 4:
                        instanceKeys = _a.sent();
                        endpoint = {
                            $type$: 'OneInstanceEndpoint',
                            personId: personId,
                            instanceId: instanceId,
                            personKeys: personKeys,
                            instanceKeys: instanceKeys
                            // No URL - connections will use CommServer
                        };
                        return [4 /*yield*/, this.nodeOneCore.leuteModel.me()];
                    case 5:
                        me = _a.sent();
                        return [4 /*yield*/, me.mainProfile()];
                    case 6:
                        profile = _a.sent();
                        if (!!profile) return [3 /*break*/, 9];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/ProfileModel.js'); })];
                    case 7:
                        ProfileModel = (_a.sent()).default;
                        return [4 /*yield*/, ProfileModel.constructWithNewProfile(personId, personId, 'default')];
                    case 8:
                        profile = _a.sent();
                        _a.label = 9;
                    case 9:
                        // Add the endpoint to the profile's communicationEndpoints
                        if (!profile.communicationEndpoints) {
                            profile.communicationEndpoints = [];
                        }
                        existingEndpoint = profile.communicationEndpoints.find(function (ep) { return ep.$type$ === 'OneInstanceEndpoint' && ep.instanceId === instanceId; });
                        if (!!existingEndpoint) return [3 /*break*/, 11];
                        profile.communicationEndpoints.push(endpoint);
                        return [4 /*yield*/, profile.saveAndLoad()];
                    case 10:
                        _a.sent();
                        console.log('[FederationAPI] Added OneInstanceEndpoint to Node profile');
                        return [3 /*break*/, 12];
                    case 11:
                        console.log('[FederationAPI] OneInstanceEndpoint already exists in profile');
                        _a.label = 12;
                    case 12:
                        console.log('[FederationAPI] ✅ Node registered (CommServer only)');
                        return [2 /*return*/, { endpoint: endpoint, profile: profile.idHash }];
                }
            });
        });
    };
    /**
     * Register a browser instance
     * Note: ConnectionsModel will handle endpoint discovery automatically
     */
    FederationAPI.prototype.registerBrowserInstance = function (browserInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var personId, instanceId, instanceName;
            return __generator(this, function (_a) {
                personId = browserInfo.personId, instanceId = browserInfo.instanceId, instanceName = browserInfo.instanceName;
                // Just track it - ConnectionsModel handles the actual endpoint discovery
                this.contacts.set(instanceId, {
                    personId: personId,
                    instanceId: instanceId,
                    instanceName: instanceName || 'Browser Instance',
                    urls: [] // Browser doesn't listen
                });
                console.log('[FederationAPI] ✅ Browser instance tracked for federation');
                return [2 /*return*/, { contact: this.contacts.get(instanceId) }];
            });
        });
    };
    /**
     * Set up complete federation between browser and Node
     */
    FederationAPI.prototype.setupFederation = function (browserInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var nodeResult, browserResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[FederationAPI] Setting up federation...');
                        return [4 /*yield*/, this.registerLocalNode()
                            // Register browser if info provided
                        ];
                    case 1:
                        nodeResult = _a.sent();
                        browserResult = null;
                        if (!browserInfo) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.registerBrowserInstance(browserInfo)];
                    case 2:
                        browserResult = _a.sent();
                        _a.label = 3;
                    case 3:
                        console.log('[FederationAPI] ✅ Federation setup complete');
                        console.log('[FederationAPI] Node endpoint registered (CommServer only)');
                        if (browserResult) {
                            console.log('[FederationAPI] Browser endpoint registered');
                        }
                        console.log('[FederationAPI] LeuteConnectionsModule will automatically discover and connect');
                        return [2 /*return*/, {
                                node: nodeResult,
                                browser: browserResult
                            }];
                }
            });
        });
    };
    /**
     * Get all registered contacts
     */
    FederationAPI.prototype.getContacts = function () {
        return Array.from(this.contacts.values());
    };
    /**
     * Find contact by instance ID
     */
    FederationAPI.prototype.getContact = function (instanceId) {
        return this.contacts.get(instanceId);
    };
    return FederationAPI;
}());
exports.default = FederationAPI;
