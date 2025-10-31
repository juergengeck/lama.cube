"use strict";
/**
 * Contact Trust Manager
 *
 * Manages trust levels and verifiable credentials for contacts.
 * All discovered peers are stored as contacts immediately, but with
 * different trust levels and source VCs.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var events_1 = require("events");
var crypto_1 = require("crypto");
var ContactTrustManager = /** @class */ (function (_super) {
    __extends(ContactTrustManager, _super);
    function ContactTrustManager(nodeOneCore) {
        var _this = _super.call(this) || this;
        _this.nodeOneCore = nodeOneCore;
        // Trust levels define what operations are allowed
        _this.TRUST_LEVELS = {
            DISCOVERED: 'discovered', // Found via discovery, no user action
            PENDING: 'pending', // User notified, awaiting decision  
            ACCEPTED: 'accepted', // User accepted the contact
            TRUSTED: 'trusted', // Enhanced trust (e.g., verified in person)
            BLOCKED: 'blocked' // User blocked the contact
        };
        // Source types for VCs
        _this.DISCOVERY_SOURCES = {
            QUIC_VC: 'quic-vc-discovery',
            COMMSERVER: 'commserver-discovery',
            QR_CODE: 'qr-code-scan',
            INVITATION: 'invitation-link',
            MANUAL: 'manual-entry'
        };
        return _this;
    }
    /**
     * Create a discovery VC when a new peer is discovered
     */
    ContactTrustManager.prototype.createDiscoveryVC = function (credential, peerId, discoverySource) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, getInstanceIdHash, getInstanceOwnerIdHash, getDefaultKeys, instanceId, myPersonId, keys, discoveryVC, sign, signature;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 1:
                        _a = _b.sent(), getInstanceIdHash = _a.getInstanceIdHash, getInstanceOwnerIdHash = _a.getInstanceOwnerIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 2:
                        getDefaultKeys = (_b.sent()).getDefaultKeys;
                        instanceId = getInstanceIdHash();
                        myPersonId = getInstanceOwnerIdHash();
                        if (!myPersonId) {
                            throw new Error('No person ID available');
                        }
                        return [4 /*yield*/, getDefaultKeys(myPersonId)
                            // Create a discovery VC that records how we found this contact
                        ];
                    case 3:
                        keys = _b.sent();
                        discoveryVC = {
                            $type$: 'DiscoveryVerifiableCredential',
                            // Who discovered whom
                            issuer: myPersonId,
                            subject: credential.subject, // The discovered person
                            // Discovery metadata
                            discovery: {
                                source: discoverySource,
                                timestamp: Date.now(),
                                peerId: peerId,
                                // Original credential we received
                                originalCredential: credential,
                                // Network information at discovery time
                                networkInfo: {
                                    instanceId: credential.instanceId,
                                    instanceName: credential.instanceName,
                                    capabilities: credential.capabilities || []
                                }
                            },
                            // Initial trust level
                            trust: {
                                level: this.TRUST_LEVELS.DISCOVERED,
                                userReviewed: false,
                                autoAccepted: false
                            },
                            // Communication permissions (restrictive by default)
                            permissions: {
                                canReceiveMessages: true, // Can receive messages from them
                                canSendMessages: false, // Can't send until accepted
                                canShareChannels: false, // Can't share channels until accepted
                                canSyncData: false, // No CHUM sync until accepted
                                canMakeCall: false,
                                canShareFiles: false,
                                canSeePresence: false
                            },
                            // Validity
                            issuedAt: Date.now(),
                            expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days for discovery VCs
                            // Unique ID for this VC
                            vcId: crypto_1.default.randomBytes(16).toString('hex')
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/crypto/sign.js'); })];
                    case 4:
                        sign = (_b.sent()).sign;
                        return [4 /*yield*/, sign(new TextEncoder().encode(JSON.stringify(discoveryVC)), keys.privateSignKey)];
                    case 5:
                        signature = _b.sent();
                        return [2 /*return*/, __assign(__assign({}, discoveryVC), { signature: signature })];
                }
            });
        });
    };
    /**
     * Create an acceptance VC when user accepts a contact
     */
    ContactTrustManager.prototype.createAcceptanceVC = function (personId_1) {
        return __awaiter(this, arguments, void 0, function (personId, options) {
            var _a, getInstanceIdHash, getInstanceOwnerIdHash, getDefaultKeys, instanceId, myPersonId, keys, acceptanceVC, sign, signature;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 1:
                        _a = _b.sent(), getInstanceIdHash = _a.getInstanceIdHash, getInstanceOwnerIdHash = _a.getInstanceOwnerIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 2:
                        getDefaultKeys = (_b.sent()).getDefaultKeys;
                        instanceId = getInstanceIdHash();
                        myPersonId = getInstanceOwnerIdHash();
                        if (!myPersonId) {
                            throw new Error('No person ID available');
                        }
                        return [4 /*yield*/, getDefaultKeys(myPersonId)
                            // Create acceptance VC that supersedes the discovery VC
                        ];
                    case 3:
                        keys = _b.sent();
                        acceptanceVC = {
                            $type$: 'AcceptanceVerifiableCredential',
                            issuer: myPersonId,
                            subject: personId,
                            // Acceptance details
                            acceptance: {
                                timestamp: Date.now(),
                                userAction: 'accepted',
                                // Optional user-provided metadata
                                nickname: options.nickname,
                                groups: options.groups || [],
                                tags: options.tags || [],
                                notes: options.notes
                            },
                            // Updated trust level
                            trust: {
                                level: this.TRUST_LEVELS.ACCEPTED,
                                userReviewed: true,
                                acceptedAt: Date.now()
                            },
                            // Enhanced permissions after acceptance
                            permissions: {
                                canReceiveMessages: true,
                                canSendMessages: options.canMessage !== false,
                                canShareChannels: options.canShareChannels !== false,
                                canSyncData: true, // Enable CHUM sync
                                canMakeCall: options.canCall || false,
                                canShareFiles: options.canShareFiles || false,
                                canSeePresence: options.canSeePresence !== false
                            },
                            // Reference to the discovery VC this supersedes
                            supersedes: options.discoveryVCId,
                            // Validity (longer for accepted contacts)
                            issuedAt: Date.now(),
                            expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
                            revocable: true,
                            vcId: crypto_1.default.randomBytes(16).toString('hex')
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/crypto/sign.js'); })];
                    case 4:
                        sign = (_b.sent()).sign;
                        return [4 /*yield*/, sign(new TextEncoder().encode(JSON.stringify(acceptanceVC)), keys.privateSignKey)];
                    case 5:
                        signature = _b.sent();
                        return [2 /*return*/, __assign(__assign({}, acceptanceVC), { signature: signature })];
                }
            });
        });
    };
    /**
     * Store a contact with its discovery VC
     */
    ContactTrustManager.prototype.storeContactWithVC = function (credential, discoveryVC) {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject, storeUnversionedObject, person, personHash, vcHash, ProfileModel, storeKeys, personKeysObj, personKeysResult, endpoint, profile, personResult, personIdHash, SomeoneModel, someoneId, someone;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 1:
                        storeVersionedObject = (_b.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 2:
                        storeUnversionedObject = (_b.sent()).storeUnversionedObject;
                        person = {
                            $type$: 'Person',
                            name: credential.instanceName || 'Unknown',
                            email: "".concat((_a = credential.subject) === null || _a === void 0 ? void 0 : _a.substring(0, 8), "@quic-vc.local")
                        };
                        return [4 /*yield*/, storeVersionedObject(person)
                            // Store the discovery VC
                        ];
                    case 3:
                        personHash = _b.sent();
                        return [4 /*yield*/, storeUnversionedObject(discoveryVC)
                            // Create Profile with endpoint information
                        ];
                    case 4:
                        vcHash = _b.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/ProfileModel.js'); })];
                    case 5:
                        ProfileModel = (_b.sent()).default;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 6:
                        storeKeys = (_b.sent()).storeUnversionedObject;
                        personKeysObj = {
                            $type$: 'Keys',
                            owner: credential.subject,
                            publicSignKey: credential.publicKey,
                            publicKey: credential.publicKey // Using same key for both for now
                        };
                        return [4 /*yield*/, storeKeys(personKeysObj)
                            // Create OneInstanceEndpoint - no import needed, it's a standard type
                        ];
                    case 7:
                        personKeysResult = _b.sent();
                        endpoint = {
                            $type$: 'OneInstanceEndpoint',
                            personId: credential.subject,
                            instanceId: credential.instanceId,
                            personKeys: personKeysResult.hash,
                            instanceKeys: personKeysResult.hash // Using same keys for both
                        };
                        return [4 /*yield*/, ProfileModel.constructWithNewProfile(credential.subject, this.nodeOneCore.ownerId, 'discovered-contact', [endpoint], [credential.publicKey])
                            // Store the Person object first
                        ];
                    case 8:
                        profile = _b.sent();
                        return [4 /*yield*/, storeVersionedObject(person)];
                    case 9:
                        personResult = _b.sent();
                        personIdHash = (personResult === null || personResult === void 0 ? void 0 : personResult.idHash) || personResult;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/SomeoneModel.js'); })];
                    case 10:
                        SomeoneModel = (_b.sent()).default;
                        someoneId = "someone-for-".concat(credential.subject);
                        return [4 /*yield*/, SomeoneModel.constructWithNewSomeone(this.nodeOneCore.leuteModel, someoneId, profile)
                            // Add to contacts (but with limited permissions due to trust level)
                        ];
                    case 11:
                        someone = _b.sent();
                        if (!this.nodeOneCore.leuteModel) return [3 /*break*/, 13];
                        return [4 /*yield*/, this.nodeOneCore.leuteModel.addSomeoneElse(someone.idHash)];
                    case 12:
                        _b.sent();
                        console.log('[ContactTrustManager] Contact stored with discovery VC:', {
                            personId: credential.subject,
                            trustLevel: this.TRUST_LEVELS.DISCOVERED,
                            vcHash: vcHash
                        });
                        _b.label = 13;
                    case 13: return [2 /*return*/, {
                            personHash: personHash,
                            someoneHash: someone.idHash,
                            profileHash: profile.idHash,
                            vcHash: vcHash,
                            person: person,
                            profile: profile,
                            someone: someone,
                            discoveryVC: discoveryVC
                        }];
                }
            });
        });
    };
    /**
     * Check if communication is allowed with a contact based on trust
     */
    ContactTrustManager.prototype.canCommunicateWith = function (personId_1) {
        return __awaiter(this, arguments, void 0, function (personId, operation) {
            var trustVCs, validVC;
            var _a, _b, _c, _d, _e, _f, _g;
            if (operation === void 0) { operation = 'message'; }
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0: return [4 /*yield*/, this.getContactTrustVCs(personId)];
                    case 1:
                        trustVCs = _h.sent();
                        if (!trustVCs || trustVCs.length === 0) {
                            return [2 /*return*/, false]; // No trust VCs, no communication
                        }
                        validVC = this.getMostRecentValidVC(trustVCs);
                        if (!validVC) {
                            return [2 /*return*/, false]; // No valid VC
                        }
                        // Check permissions based on operation
                        switch (operation) {
                            case 'message':
                                return [2 /*return*/, ((_a = validVC.permissions) === null || _a === void 0 ? void 0 : _a.canSendMessages) || false];
                            case 'receive':
                                return [2 /*return*/, ((_b = validVC.permissions) === null || _b === void 0 ? void 0 : _b.canReceiveMessages) !== false];
                            case 'sync':
                                return [2 /*return*/, ((_c = validVC.permissions) === null || _c === void 0 ? void 0 : _c.canSyncData) || false];
                            case 'channel':
                                return [2 /*return*/, ((_d = validVC.permissions) === null || _d === void 0 ? void 0 : _d.canShareChannels) || false];
                            case 'call':
                                return [2 /*return*/, ((_e = validVC.permissions) === null || _e === void 0 ? void 0 : _e.canMakeCall) || false];
                            case 'file':
                                return [2 /*return*/, ((_f = validVC.permissions) === null || _f === void 0 ? void 0 : _f.canShareFiles) || false];
                            case 'presence':
                                return [2 /*return*/, ((_g = validVC.permissions) === null || _g === void 0 ? void 0 : _g.canSeePresence) || false];
                            default:
                                return [2 /*return*/, false];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get trust VCs for a contact
     */
    ContactTrustManager.prototype.getContactTrustVCs = function (personId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This would query ONE.core storage for VCs related to this person
                // For now, return from a cache or storage query
                // TODO: Implement actual storage query
                console.log('[ContactTrustManager] Getting trust VCs for:', personId);
                return [2 /*return*/, []];
            });
        });
    };
    /**
     * Get the most recent valid VC from a list
     */
    ContactTrustManager.prototype.getMostRecentValidVC = function (vcs) {
        var now = Date.now();
        // Filter valid VCs and sort by issuedAt
        var validVCs = vcs
            .filter(function (vc) {
            // Check if expired
            if (vc.expiresAt && vc.expiresAt < now) {
                return false;
            }
            // Check if revoked
            if (vc.revoked) {
                return false;
            }
            return true;
        })
            .sort(function (a, b) { return b.issuedAt - a.issuedAt; });
        return validVCs[0] || null;
    };
    /**
     * Update contact trust level when user accepts
     */
    ContactTrustManager.prototype.acceptContact = function (personId_1) {
        return __awaiter(this, arguments, void 0, function (personId, options) {
            var acceptanceVC, storeUnversionedObject, vcHash;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[ContactTrustManager] Accepting contact:', personId);
                        return [4 /*yield*/, this.createAcceptanceVC(personId, options)
                            // Store the acceptance VC
                        ];
                    case 1:
                        acceptanceVC = _a.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 2:
                        storeUnversionedObject = (_a.sent()).storeUnversionedObject;
                        return [4 /*yield*/, storeUnversionedObject(acceptanceVC)
                            // Update the Someone object with new trust level
                            // TODO: Update the actual Someone object in storage
                        ];
                    case 3:
                        vcHash = _a.sent();
                        // Update the Someone object with new trust level
                        // TODO: Update the actual Someone object in storage
                        console.log('[ContactTrustManager] Contact accepted with VC:', vcHash);
                        // Emit event for UI updates
                        this.emit('contact-accepted', {
                            personId: personId,
                            acceptanceVC: acceptanceVC,
                            vcHash: vcHash
                        });
                        return [2 /*return*/, {
                                success: true,
                                vcHash: vcHash,
                                acceptanceVC: acceptanceVC
                            }];
                }
            });
        });
    };
    /**
     * Get trust level for a specific contact
     */
    ContactTrustManager.prototype.getContactTrustLevel = function (personId) {
        return __awaiter(this, void 0, void 0, function () {
            var trustVCs, validVC;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getContactTrustVCs(personId)];
                    case 1:
                        trustVCs = _b.sent();
                        if (!trustVCs || trustVCs.length === 0) {
                            return [2 /*return*/, this.TRUST_LEVELS.DISCOVERED]; // Default for new contacts
                        }
                        validVC = this.getMostRecentValidVC(trustVCs);
                        if (!validVC) {
                            return [2 /*return*/, this.TRUST_LEVELS.DISCOVERED];
                        }
                        return [2 /*return*/, ((_a = validVC.trust) === null || _a === void 0 ? void 0 : _a.level) || this.TRUST_LEVELS.DISCOVERED];
                }
            });
        });
    };
    /**
     * Get contacts by trust level
     */
    ContactTrustManager.prototype.getContactsByTrustLevel = function (trustLevel) {
        return __awaiter(this, void 0, void 0, function () {
            var allContacts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.nodeOneCore.leuteModel) {
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, this.nodeOneCore.leuteModel.getSomeoneElseList()
                            // Filter by trust level
                            // TODO: Actually check trust VCs for each contact
                        ];
                    case 1:
                        allContacts = _a.sent();
                        // Filter by trust level
                        // TODO: Actually check trust VCs for each contact
                        return [2 /*return*/, allContacts];
                }
            });
        });
    };
    /**
     * Get pending contacts (discovered but not yet accepted)
     */
    ContactTrustManager.prototype.getPendingContacts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getContactsByTrustLevel(this.TRUST_LEVELS.DISCOVERED)];
            });
        });
    };
    /**
     * Block a contact
     */
    ContactTrustManager.prototype.blockContact = function (personId, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var blockVC, storeUnversionedObject, vcHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[ContactTrustManager] Blocking contact:', personId, reason);
                        return [4 /*yield*/, this.createBlockVC(personId, reason)
                            // Store it
                        ];
                    case 1:
                        blockVC = _a.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 2:
                        storeUnversionedObject = (_a.sent()).storeUnversionedObject;
                        return [4 /*yield*/, storeUnversionedObject(blockVC)];
                    case 3:
                        vcHash = _a.sent();
                        this.emit('contact-blocked', {
                            personId: personId,
                            reason: reason,
                            vcHash: vcHash
                        });
                        return [2 /*return*/, {
                                success: true,
                                vcHash: vcHash
                            }];
                }
            });
        });
    };
    /**
     * Create a block VC
     */
    ContactTrustManager.prototype.createBlockVC = function (personId, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var getInstanceOwnerIdHash, getDefaultKeys, myPersonId, keys, blockVC, sign, signature;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 1:
                        getInstanceOwnerIdHash = (_a.sent()).getInstanceOwnerIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 2:
                        getDefaultKeys = (_a.sent()).getDefaultKeys;
                        myPersonId = getInstanceOwnerIdHash();
                        return [4 /*yield*/, getDefaultKeys(myPersonId)];
                    case 3:
                        keys = _a.sent();
                        blockVC = {
                            $type$: 'BlockVerifiableCredential',
                            issuer: myPersonId,
                            subject: personId,
                            block: {
                                timestamp: Date.now(),
                                reason: reason
                            },
                            trust: {
                                level: this.TRUST_LEVELS.BLOCKED,
                                blockedAt: Date.now()
                            },
                            // No permissions when blocked
                            permissions: {
                                canReceiveMessages: false,
                                canSendMessages: false,
                                canShareChannels: false,
                                canSyncData: false,
                                canMakeCall: false,
                                canShareFiles: false,
                                canSeePresence: false
                            },
                            issuedAt: Date.now(),
                            vcId: crypto_1.default.randomBytes(16).toString('hex')
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/crypto/sign.js'); })];
                    case 4:
                        sign = (_a.sent()).sign;
                        return [4 /*yield*/, sign(new TextEncoder().encode(JSON.stringify(blockVC)), keys.privateSignKey)];
                    case 5:
                        signature = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, blockVC), { signature: signature })];
                }
            });
        });
    };
    return ContactTrustManager;
}(events_1.EventEmitter));
exports.default = ContactTrustManager;
