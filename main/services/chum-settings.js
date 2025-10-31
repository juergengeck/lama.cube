"use strict";
/**
 * CHUM Settings Helper
 * Creates Settings objects with verifiable credentials for CHUM sync
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
Object.defineProperty(exports, "__esModule", { value: true });
var credentials_manager_js_1 = require("./credentials-manager.js");
var node_one_core_js_1 = require("../core/node-one-core.js");
var ChumSettingsHelper = /** @class */ (function () {
    function ChumSettingsHelper() {
    }
    /**
     * Create a Settings object for CHUM sync with embedded credentials
     */
    ChumSettingsHelper.prototype.createSettingsObject = function (category_1, data_1) {
        return __awaiter(this, arguments, void 0, function (category, data, authority) {
            var credential, settingsObject;
            if (authority === void 0) { authority = 'DEVICE_ADMIN'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, credentials_manager_js_1.default.createSettingsCredential({
                            instanceId: credentials_manager_js_1.default.getOwnInstanceId(),
                            name: this.getInstanceName(),
                            platform: 'nodejs'
                        }, authority, ["settings.".concat(category)])
                        // Create the Settings object for CHUM sync
                    ];
                    case 1:
                        credential = _a.sent();
                        settingsObject = {
                            $type$: 'Settings',
                            id: "settings-".concat(category, "-").concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9)),
                            category: category,
                            data: data,
                            credential: credential,
                            timestamp: new Date().toISOString(),
                            schemaVersion: '1.0.0',
                            sourceInstance: credentials_manager_js_1.default.getOwnInstanceId()
                        };
                        console.log("[ChumSettings] Created Settings object for category: ".concat(category));
                        return [2 /*return*/, settingsObject];
                }
            });
        });
    };
    /**
     * Create and sync connection settings
     */
    ChumSettingsHelper.prototype.syncConnectionSettings = function (connectionSettings) {
        return __awaiter(this, void 0, void 0, function () {
            var settingsObject;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[ChumSettings] Syncing connection settings via CHUM');
                        return [4 /*yield*/, this.createSettingsObject('connections', connectionSettings, 'DEVICE_ADMIN')
                            // Add to CHUM sync for replication
                        ];
                    case 1:
                        settingsObject = _a.sent();
                        // Add to CHUM sync for replication
                        return [4 /*yield*/, this.addSettingsToChumSync(settingsObject)];
                    case 2:
                        // Add to CHUM sync for replication
                        _a.sent();
                        return [2 /*return*/, settingsObject];
                }
            });
        });
    };
    /**
     * Create and sync network settings
     */
    ChumSettingsHelper.prototype.syncNetworkSettings = function (networkSettings) {
        return __awaiter(this, void 0, void 0, function () {
            var settingsObject;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[ChumSettings] Syncing network settings via CHUM');
                        return [4 /*yield*/, this.createSettingsObject('network', networkSettings, 'DEVICE_ADMIN')
                            // Add to CHUM sync for replication
                        ];
                    case 1:
                        settingsObject = _a.sent();
                        // Add to CHUM sync for replication
                        return [4 /*yield*/, this.addSettingsToChumSync(settingsObject)];
                    case 2:
                        // Add to CHUM sync for replication
                        _a.sent();
                        return [2 /*return*/, settingsObject];
                }
            });
        });
    };
    /**
     * Add Settings object to CHUM sync for peer replication
     */
    ChumSettingsHelper.prototype.addSettingsToChumSync = function (settingsObject) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // In a real CHUM implementation, this would add the object to ONE.core storage
                        // which would then be replicated via CHUM to connected peers
                        // For now, we'll simulate this by directly calling the CHUM sync handler
                        // Store locally first
                        return [4 /*yield*/, node_one_core_js_1.default.setState("chum.settings.".concat(settingsObject.category), settingsObject)
                            // Simulate peer replication (in production this would be automatic via CHUM)
                        ];
                    case 1:
                        // In a real CHUM implementation, this would add the object to ONE.core storage
                        // which would then be replicated via CHUM to connected peers
                        // For now, we'll simulate this by directly calling the CHUM sync handler
                        // Store locally first
                        _a.sent();
                        // Simulate peer replication (in production this would be automatic via CHUM)
                        console.log("[ChumSettings] Settings object added to CHUM sync: ".concat(settingsObject.id));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('[ChumSettings] Error adding settings to CHUM sync:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Test credential validation with a sample Settings object
     */
    ChumSettingsHelper.prototype.testSettingsValidation = function (category, data) {
        return __awaiter(this, void 0, void 0, function () {
            var settingsObject, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[ChumSettings] Testing settings validation for: ".concat(category));
                        return [4 /*yield*/, this.createSettingsObject(category, data)
                            // Test validation
                            // TODO: Implement chumSync when available
                        ];
                    case 1:
                        settingsObject = _a.sent();
                        result = null;
                        //   settingsObject, 
                        //   credentialsManager.getOwnInstanceId() // Simulate from ourselves
                        // )
                        console.log("[ChumSettings] Validation test result:", result);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Get instance name (placeholder)
     */
    ChumSettingsHelper.prototype.getInstanceName = function () {
        return node_one_core_js_1.default.instanceName || 'Node.js Hub';
    };
    /**
     * Example: Create connection settings update
     */
    ChumSettingsHelper.prototype.exampleConnectionSettingsUpdate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var connectionSettings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connectionSettings = {
                            commServerUrl: 'wss://comm10.dev.refinio.one',
                            acceptIncomingConnections: true,
                            directConnections: true,
                            maxConnections: 50,
                            pairingTokenExpiry: 900000 // 15 minutes
                        };
                        return [4 /*yield*/, this.syncConnectionSettings(connectionSettings)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Example: Create network settings update
     */
    ChumSettingsHelper.prototype.exampleNetworkSettingsUpdate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var networkSettings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        networkSettings = {
                            protocols: ['https', 'wss', 'udp'],
                            p2pEnabled: true,
                            iomServer: {
                                enabled: true,
                                port: 8765,
                                maxConnections: 100
                            }
                        };
                        return [4 /*yield*/, this.syncNetworkSettings(networkSettings)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ChumSettingsHelper;
}());
// Singleton
exports.default = new ChumSettingsHelper();
