"use strict";
/**
 * Node Platform Handler (Platform-Specific)
 *
 * Extracted from OneCoreHandler - Electron/Node.js platform infrastructure.
 * Handles platform-specific operations:
 * - Instance lifecycle (initialization, shutdown, restart)
 * - State management
 * - Storage operations
 * - Pairing and invites
 * - Credentials management
 * - Settings replication
 */
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
exports.NodePlatformHandler = void 0;
/**
 * NodePlatformHandler - Platform infrastructure for Electron/Node.js
 */
var NodePlatformHandler = /** @class */ (function () {
    function NodePlatformHandler(nodeOneCore, stateManager, chumSettings, credentialsManager) {
        this.nodeOneCore = nodeOneCore;
        this.stateManager = stateManager;
        this.chumSettings = chumSettings;
        this.credentialsManager = credentialsManager;
    }
    /**
     * Initialize Node.js ONE.core instance
     * NOTE: Platform-specific implementation
     */
    NodePlatformHandler.prototype.initializeNode = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('initializeNode must be implemented by platform layer (lama.electron)');
            });
        });
    };
    /**
     * Get Node instance status
     */
    NodePlatformHandler.prototype.getNodeStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var info;
            return __generator(this, function (_a) {
                info = this.nodeOneCore.getInfo();
                return [2 /*return*/, __assign({ success: true }, info)];
            });
        });
    };
    /**
     * Set Node instance configuration state
     */
    NodePlatformHandler.prototype.setNodeState = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[NodePlatformHandler] Set Node state: ".concat(params.key));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.nodeOneCore.setState(params.key, params.value)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                    case 3:
                        error_1 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to set state:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get Node instance configuration state
     */
    NodePlatformHandler.prototype.getNodeState = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                console.log("[NodePlatformHandler] Get Node state: ".concat(params.key));
                try {
                    value = this.nodeOneCore.getState(params.key);
                    return [2 /*return*/, {
                            success: true,
                            value: value
                        }];
                }
                catch (error) {
                    console.error('[NodePlatformHandler] Failed to get state:', error);
                    return [2 /*return*/, {
                            success: false,
                            error: error.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get Node instance full configuration
     */
    NodePlatformHandler.prototype.getNodeConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            var info;
            return __generator(this, function (_a) {
                console.log('[NodePlatformHandler] Get Node configuration');
                try {
                    info = this.nodeOneCore.getInfo();
                    return [2 /*return*/, {
                            success: true,
                            config: info.config || {}
                        }];
                }
                catch (error) {
                    console.error('[NodePlatformHandler] Failed to get config:', error);
                    return [2 /*return*/, {
                            success: false,
                            error: error.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Clear storage
     *
     * NOTE: This method requires platform-specific clearAppDataShared function.
     * The platform adapter should inject the clearAppDataShared function.
     */
    NodePlatformHandler.prototype.clearStorage = function (clearAppDataShared) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Clear storage request');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        if (!clearAppDataShared) {
                            throw new Error('clearAppDataShared function not provided');
                        }
                        return [4 /*yield*/, clearAppDataShared()];
                    case 2:
                        result = _a.sent();
                        console.log('[NodePlatformHandler] clearAppDataShared result:', result);
                        return [2 /*return*/, result];
                    case 3:
                        error_2 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to clear storage:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Restart ONE.core instance
     */
    NodePlatformHandler.prototype.restartNode = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Restarting ONE.core instance...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        if (!this.nodeOneCore.initialized) return [3 /*break*/, 3];
                        console.log('[NodePlatformHandler] Shutting down current instance...');
                        return [4 /*yield*/, this.nodeOneCore.shutdown()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        console.log('[NodePlatformHandler] Instance shut down - UI must re-initialize');
                        return [2 /*return*/, {
                                success: true,
                                data: {
                                    message: 'Instance shut down - please re-login'
                                }
                            }];
                    case 4:
                        error_3 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to restart instance:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                error: error_3.message
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create local invite for browser connection
     */
    NodePlatformHandler.prototype.createLocalInvite = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var invite, error_4;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Create local invite');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.nodeOneCore.createLocalInvite(options)];
                    case 2:
                        invite = _a.sent();
                        return [2 /*return*/, { success: true, invite: invite }];
                    case 3:
                        error_4 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to create local invite:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create pairing invitation for browser instance
     */
    NodePlatformHandler.prototype.createBrowserPairingInvite = function () {
        return __awaiter(this, void 0, void 0, function () {
            var invitation, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Create browser pairing invitation');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.nodeOneCore.createBrowserPairingInvite()];
                    case 2:
                        invitation = _a.sent();
                        return [2 /*return*/, { success: true, invitation: invitation }];
                    case 3:
                        error_5 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to create browser pairing invite:', error_5);
                        return [2 /*return*/, {
                                success: false,
                                error: error_5.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get stored browser pairing invitation
     */
    NodePlatformHandler.prototype.getBrowserPairingInvite = function () {
        return __awaiter(this, void 0, void 0, function () {
            var browserInvite, now, expiresAt;
            return __generator(this, function (_a) {
                console.log('[NodePlatformHandler] Get browser pairing invitation');
                if (!this.stateManager) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'State manager not available'
                        }];
                }
                try {
                    browserInvite = this.stateManager.getState('browserInvite');
                    if (!browserInvite) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'No browser invitation available'
                            }];
                    }
                    now = new Date();
                    expiresAt = new Date(browserInvite.expiresAt);
                    if (now > expiresAt) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Browser invitation has expired'
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            invitation: browserInvite.invitation
                        }];
                }
                catch (error) {
                    console.error('[NodePlatformHandler] Failed to get browser pairing invite:', error);
                    return [2 /*return*/, {
                            success: false,
                            error: error.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Create network invite for remote connections
     */
    NodePlatformHandler.prototype.createNetworkInvite = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var invite, error_6;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Create network invite');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.nodeOneCore.createNetworkInvite(options)];
                    case 2:
                        invite = _a.sent();
                        return [2 /*return*/, { success: true, invite: invite }];
                    case 3:
                        error_6 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to create network invite:', error_6);
                        return [2 /*return*/, {
                                success: false,
                                error: error_6.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List all active invites
     */
    NodePlatformHandler.prototype.listInvites = function () {
        return __awaiter(this, void 0, void 0, function () {
            var invites, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] List invites');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.nodeOneCore.listInvites()];
                    case 2:
                        invites = _a.sent();
                        return [2 /*return*/, { success: true, invites: invites }];
                    case 3:
                        error_7 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to list invites:', error_7);
                        return [2 /*return*/, {
                                success: false,
                                error: error_7.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Revoke an invite
     */
    NodePlatformHandler.prototype.revokeInvite = function (inviteId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Revoke invite:', inviteId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.nodeOneCore.revokeInvite(inviteId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                    case 3:
                        error_8 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to revoke invite:', error_8);
                        return [2 /*return*/, {
                                success: false,
                                error: error_8.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get credentials status
     */
    NodePlatformHandler.prototype.getCredentialsStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var credentials;
            return __generator(this, function (_a) {
                if (!this.credentialsManager) {
                    return [2 /*return*/, { success: false, error: 'Credentials manager not available' }];
                }
                console.log('[NodePlatformHandler] Getting credentials status');
                try {
                    credentials = this.credentialsManager.getAllCredentials();
                    return [2 /*return*/, {
                            success: true,
                            ownCredentials: credentials.own.length,
                            trustedIssuers: credentials.trusted.length,
                            instanceId: this.credentialsManager.getOwnInstanceId()
                        }];
                }
                catch (error) {
                    console.error('[NodePlatformHandler] Failed to get credentials status:', error);
                    return [2 /*return*/, {
                            success: false,
                            error: error.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get shared credentials for browser IoM setup
     */
    NodePlatformHandler.prototype.getBrowserCredentials = function () {
        return __awaiter(this, void 0, void 0, function () {
            var credentials, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Getting credentials for browser IoM');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.nodeOneCore.getCredentialsForBrowser()];
                    case 2:
                        credentials = _a.sent();
                        return [2 /*return*/, __assign({ success: true }, credentials)];
                    case 3:
                        error_9 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to get browser credentials:', error_9);
                        return [2 /*return*/, {
                                success: false,
                                error: error_9.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Test settings replication with credentials
     */
    NodePlatformHandler.prototype.testSettingsReplication = function (category, data) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[NodePlatformHandler] Testing settings replication: ".concat(category));
                        if (!this.chumSettings) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'CHUM settings not available'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.chumSettings.testSettingsValidation(category, data)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                testResult: result
                            }];
                    case 3:
                        error_10 = _a.sent();
                        console.error('[NodePlatformHandler] Settings replication test failed:', error_10);
                        return [2 /*return*/, {
                                success: false,
                                error: error_10.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sync connection settings to peers
     */
    NodePlatformHandler.prototype.syncConnectionSettings = function (connectionSettings) {
        return __awaiter(this, void 0, void 0, function () {
            var settingsObject, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[NodePlatformHandler] Syncing connection settings to peers');
                        if (!this.chumSettings) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'CHUM settings not available'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.chumSettings.syncConnectionSettings(connectionSettings)];
                    case 2:
                        settingsObject = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                settingsId: settingsObject.id,
                                replicatedAt: settingsObject.timestamp
                            }];
                    case 3:
                        error_11 = _a.sent();
                        console.error('[NodePlatformHandler] Failed to sync connection settings:', error_11);
                        return [2 /*return*/, {
                                success: false,
                                error: error_11.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return NodePlatformHandler;
}());
exports.NodePlatformHandler = NodePlatformHandler;
