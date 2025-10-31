"use strict";
/**
 * ONE.core IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to service and handler methods.
 * Business logic distributed across:
 * - @chat/core/services/* (ContactService, ProfileService)
 * - @lama/core/services/* (LLMKeyStorageService)
 * - ./main/handlers/* (NodePlatformHandler)
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
exports.invalidateContactsCache = invalidateContactsCache;
var ContactService_js_1 = require("@chat/core/services/ContactService.js");
var ProfileService_js_1 = require("@chat/core/services/ProfileService.js");
var LLMKeyStorageService_js_1 = require("@lama/core/services/LLMKeyStorageService.js");
var NodePlatformHandler_js_1 = require("../../handlers/NodePlatformHandler.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
var manager_js_1 = require("../../state/manager.js");
var chum_settings_js_1 = require("../../services/chum-settings.js");
var credentials_manager_js_1 = require("../../services/credentials-manager.js");
var ollama_config_manager_js_1 = require("../../services/ollama-config-manager.js");
var lama_electron_shadcn_js_1 = require("../../../lama-electron-shadcn.js");
var node_provisioning_js_1 = require("../../services/node-provisioning.js");
// Import llmConfigHandler for secure storage operations
var llmConfigHandler;
Promise.resolve().then(function () { return require('./llm-config.js'); }).then(function (module) {
    // Get the handler instance after it's initialized
    var handleSetOllamaConfig = module.handleSetOllamaConfig;
    llmConfigHandler = {
        setConfig: function (request) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, handleSetOllamaConfig({}, request)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }
    };
});
// Lazy service instances - created after NodeOneCore is initialized
var contactService = null;
var profileService = null;
var llmKeyStorageService = null;
// Platform handler can be created immediately (doesn't depend on models)
var platformHandler = new NodePlatformHandler_js_1.NodePlatformHandler(node_one_core_js_1.default, manager_js_1.default, chum_settings_js_1.default, credentials_manager_js_1.default);
/**
 * Get ContactService instance - creates on first use after NodeOneCore init
 */
function getContactService() {
    if (!node_one_core_js_1.default.leuteModel) {
        throw new Error('NodeOneCore not initialized - leuteModel is null');
    }
    if (!contactService) {
        contactService = new ContactService_js_1.ContactService(node_one_core_js_1.default.leuteModel, node_one_core_js_1.default.aiAssistantModel);
    }
    return contactService;
}
/**
 * Get ProfileService instance - creates on first use after NodeOneCore init
 */
function getProfileService() {
    if (!node_one_core_js_1.default.leuteModel) {
        throw new Error('NodeOneCore not initialized - leuteModel is null');
    }
    if (!profileService) {
        profileService = new ProfileService_js_1.ProfileService(node_one_core_js_1.default.leuteModel);
    }
    return profileService;
}
/**
 * Get LLMKeyStorageService instance - creates on first use after NodeOneCore init
 */
function getLLMKeyStorageService() {
    if (!node_one_core_js_1.default.channelManager) {
        throw new Error('NodeOneCore not initialized - channelManager is null');
    }
    if (!llmKeyStorageService) {
        llmKeyStorageService = new LLMKeyStorageService_js_1.LLMKeyStorageService(node_one_core_js_1.default.channelManager);
    }
    return llmKeyStorageService;
}
// Export function to invalidate cache when contacts change
function invalidateContactsCache() {
    getContactService().invalidateContactsCache();
}
/**
 * Thin IPC adapter - maps ipcMain.handle() calls to handler methods
 */
var oneCoreHandlers = {
    /**
     * Initialize Node.js ONE.core instance
     * Platform-specific: Uses nodeProvisioning from lama.electron
     */
    initializeNode: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, name, password, result, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = params.user || params, name = _a.name, password = _a.password;
                        console.log('[OneCoreElectronHandler] Initialize Node.js ONE.core instance:', name);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, node_provisioning_js_1.default.provision({
                                user: { name: name, password: password }
                            })];
                    case 2:
                        result = _b.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_1 = _b.sent();
                        console.error('[OneCoreElectronHandler] Failed to initialize Node:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Create local invite for browser connection
     */
    createLocalInvite: function (event_1) {
        return __awaiter(this, arguments, void 0, function (event, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.createLocalInvite(options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Create pairing invitation for browser instance
     */
    createBrowserPairingInvite: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.createBrowserPairingInvite()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get stored browser pairing invitation
     */
    getBrowserPairingInvite: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.getBrowserPairingInvite()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Create network invite for remote connections
     */
    createNetworkInvite: function (event_1) {
        return __awaiter(this, arguments, void 0, function (event, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.createNetworkInvite(options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * List all active invites
     */
    listInvites: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.listInvites()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Revoke an invite
     */
    revokeInvite: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var inviteId = _b.inviteId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, platformHandler.revokeInvite(inviteId)];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        });
    },
    /**
     * Get Node instance status
     */
    getNodeStatus: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.getNodeStatus()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Set Node instance configuration state
     */
    setNodeState: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.setNodeState(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get Node instance configuration state
     */
    getNodeState: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.getNodeState(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get Node instance full configuration
     */
    getNodeConfig: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.getNodeConfig()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get contacts from Node.js ONE.core instance
     */
    getContacts: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var contacts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getContactService().getContacts()];
                    case 1:
                        contacts = _a.sent();
                        return [2 /*return*/, { success: true, contacts: contacts }];
                }
            });
        });
    },
    /**
     * Test settings replication with credentials
     */
    testSettingsReplication: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.testSettingsReplication(params.category, params.data)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Sync connection settings to peers
     */
    syncConnectionSettings: function (event, connectionSettings) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.syncConnectionSettings(connectionSettings)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get credentials status and trust information
     */
    getCredentialsStatus: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.getCredentialsStatus()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get shared credentials for browser IoM setup
     */
    getBrowserCredentials: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.getBrowserCredentials()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get list of connected peers
     */
    getPeerList: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getContactService().getPeerList()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Store data securely using LLM objects
     */
    secureStore: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getLLMKeyStorageService().secureStore(params.key, params.value, llmConfigHandler)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Retrieve data from LLM objects
     */
    secureRetrieve: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getLLMKeyStorageService().secureRetrieve(params.key, ollama_config_manager_js_1.decryptToken)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Clear storage
     */
    clearStorage: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.clearStorage(lama_electron_shadcn_js_1.clearAppDataShared)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Restart Node.js ONE.core instance
     */
    restartNode: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, platformHandler.restartNode()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Update user's mood
     */
    updateMood: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            var me, personId, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, node_one_core_js_1.default.leuteModel.me()];
                    case 1:
                        me = _a.sent();
                        return [4 /*yield*/, me.mainIdentity()];
                    case 2:
                        personId = _a.sent();
                        return [4 /*yield*/, getProfileService().updateMood(personId, params.mood)];
                    case 3:
                        data = _a.sent();
                        return [2 /*return*/, { success: true, data: data }];
                }
            });
        });
    },
    /**
     * Check if the current user has a PersonName set in their profile
     */
    hasPersonName: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var me, personId, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, node_one_core_js_1.default.leuteModel.me()];
                    case 1:
                        me = _a.sent();
                        return [4 /*yield*/, me.mainIdentity()];
                    case 2:
                        personId = _a.sent();
                        return [4 /*yield*/, getProfileService().hasPersonName(personId)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, __assign({ success: true }, result)];
                }
            });
        });
    },
    /**
     * Set PersonName for the current user's profile
     */
    setPersonName: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            var me, personId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, node_one_core_js_1.default.leuteModel.me()];
                    case 1:
                        me = _a.sent();
                        return [4 /*yield*/, me.mainIdentity()];
                    case 2:
                        personId = _a.sent();
                        return [4 /*yield*/, getProfileService().setPersonName(personId, params.name)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, { success: true, data: { name: params.name } }];
                }
            });
        });
    }
};
exports.default = oneCoreHandlers;
