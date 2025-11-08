/**
 * Settings IPC Plans (TypeScript)
 * Manages settings synchronization between browser and node instances
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
var node_one_core_js_1 = require("../../core/node-one-core.js");
var settingsPlans = {
    /**
     * Get a setting value from the node instance
     */
    getSetting: function (event, key) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[Settings] Getting setting:', key);
                        if (!node_one_core_js_1.default.getInfo().initialized) {
                            throw new Error('Node instance not initialized');
                        }
                        return [4 /*yield*/, node_one_core_js_1.default.getSetting(key)];
                    case 1:
                        value = _a.sent();
                        return [2 /*return*/, value];
                }
            });
        });
    },
    /**
     * Set a setting value in the node instance
     */
    setSetting: function (event, request) {
        return __awaiter(this, void 0, void 0, function () {
            var key, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = request.key, value = request.value;
                        console.log('[Settings] Setting:', key, '=', value);
                        if (!node_one_core_js_1.default.getInfo().initialized) {
                            throw new Error('Node instance not initialized');
                        }
                        return [4 /*yield*/, node_one_core_js_1.default.setSetting(key, value)];
                    case 1:
                        _a.sent();
                        // Broadcast the change to all listeners
                        return [2 /*return*/, { success: true }];
                }
            });
        });
    },
    /**
     * Get all settings with a specific prefix
     */
    getSettings: function (event, prefix) {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[Settings] Getting settings with prefix:', prefix);
                        if (!node_one_core_js_1.default.getInfo().initialized) {
                            throw new Error('Node instance not initialized');
                        }
                        return [4 /*yield*/, node_one_core_js_1.default.getSettings(prefix)];
                    case 1:
                        settings = _a.sent();
                        return [2 /*return*/, settings];
                }
            });
        });
    },
    /**
     * Sync IoM settings between browser and node
     */
    syncIoMSettings: function (event, browserSettings) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, key, value, iomSettings, settings;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[Settings] Syncing IoM settings from browser');
                        if (!node_one_core_js_1.default.getInfo().initialized) {
                            throw new Error('Node instance not initialized');
                        }
                        if (!browserSettings) return [3 /*break*/, 4];
                        _i = 0, _a = Object.entries(browserSettings);
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        _b = _a[_i], key = _b[0], value = _b[1];
                        if (!key.startsWith('iom.browser.')) return [3 /*break*/, 3];
                        return [4 /*yield*/, node_one_core_js_1.default.setSetting(key, value)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        iomSettings = null;
                        if (iomSettings) {
                            settings = {};
                            // Get relevant IoM settings
                            settings['iom.group'] = iomSettings.getValue('iom.group');
                            settings['iom.owner'] = iomSettings.getValue('iom.owner');
                            settings['iom.node.connected'] = iomSettings.getValue('iom.node.connected');
                            settings['iom.browser.connected'] = iomSettings.getValue('iom.browser.connected');
                            return [2 /*return*/, settings];
                        }
                        return [2 /*return*/, {}];
                }
            });
        });
    },
    /**
     * Subscribe to settings changes
     */
    subscribeToSettings: function (event, prefix) {
        return __awaiter(this, void 0, void 0, function () {
            var nodeSettings, iomSettings;
            return __generator(this, function (_a) {
                console.log('[Settings] Subscribing to settings with prefix:', prefix);
                if (!node_one_core_js_1.default.getInfo().initialized) {
                    throw new Error('Node instance not initialized');
                }
                nodeSettings = null;
                iomSettings = null;
                // Subscribe to node settings changes
                if (nodeSettings) {
                    nodeSettings.onSettingChange(function (key, value) {
                        if (!prefix || key.startsWith(prefix)) {
                            event.sender.send('settings:changed', { key: key, value: value });
                        }
                    });
                }
                // Subscribe to IoM settings changes
                if (iomSettings) {
                    iomSettings.onSettingChange(function (key, value) {
                        if (!prefix || key.startsWith(prefix)) {
                            event.sender.send('settings:changed', { key: key, value: value });
                        }
                    });
                }
                return [2 /*return*/, { subscribed: true }];
            });
        });
    },
    /**
     * Get instance configuration
     */
    getInstanceConfig: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var config, _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        console.log('[Settings] Getting instance configuration');
                        config = {
                            node: {
                                initialized: node_one_core_js_1.default.initialized,
                                hasSettings: false, // TODO: Check if settings exist
                                hasIoMSettings: false // TODO: Check if IoM settings exist
                            }
                        };
                        if (!node_one_core_js_1.default.initialized) return [3 /*break*/, 5];
                        _a = config.node;
                        return [4 /*yield*/, node_one_core_js_1.default.getSetting('instance.id')];
                    case 1:
                        _a.instanceId = _e.sent();
                        _b = config.node;
                        return [4 /*yield*/, node_one_core_js_1.default.getSetting('instance.type')];
                    case 2:
                        _b.instanceType = _e.sent();
                        _c = config.node;
                        return [4 /*yield*/, node_one_core_js_1.default.getSetting('storage.role')];
                    case 3:
                        _c.storageRole = _e.sent();
                        _d = config.node;
                        return [4 /*yield*/, node_one_core_js_1.default.getSetting('sync.enabled')];
                    case 4:
                        _d.syncEnabled = _e.sent();
                        // Get IoM configuration
                        // TODO: Implement proper settings retrieval using ONE.core storage
                        config.iom = {
                            group: null,
                            owner: null,
                            nodeConnected: false,
                            browserConnected: false
                        };
                        _e.label = 5;
                    case 5: return [2 /*return*/, config];
                }
            });
        });
    }
};
export default settingsPlans;
