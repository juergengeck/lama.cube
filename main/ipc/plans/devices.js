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
export { initializeDevicePlans };
/**
 * IPC plans for device management
 */
var electron_1 = require("electron");
var ipcMain = electron_1.default.ipcMain;
var device_manager_js_1 = require("../../core/device-manager.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
var one_core_js_1 = require("./one-core.js");
/**
 * Initialize device IPC plans
 */
function initializeDevicePlans() {
    var _this = this;
    /**
     * Create an invitation for pairing
     * Delegates to IOMHandler for proper IoM/IoP support
     */
    ipcMain.handle('invitation:create', function (event, mode) { return __awaiter(_this, void 0, void 0, function () {
        var connectionPlans, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./connection.js'); })];
                case 1:
                    connectionPlans = (_a.sent()).default;
                    return [4 /*yield*/, connectionPlans.createPairingInvitation(event, mode)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    error_1 = _a.sent();
                    console.error('[DevicePlans] Failed to create invitation:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message
                        }];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    /**
     * Register a new device
     */
    ipcMain.handle('devices:register', function (event, deviceInfo) { return __awaiter(_this, void 0, void 0, function () {
        var result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('[DevicePlans] Registering new device:', deviceInfo);
                    // Ensure Node.js instance is initialized
                    if (!node_one_core_js_1.default.initialized) {
                        throw new Error('Node.js instance not initialized');
                    }
                    return [4 /*yield*/, device_manager_js_1.default.registerDevice(deviceInfo)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            device: result.device,
                            invite: result.invite
                        }];
                case 2:
                    error_2 = _a.sent();
                    console.error('[DevicePlans] Failed to register device:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2.message
                        }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    /**
     * Get all registered devices
     */
    ipcMain.handle('devices:list', function () { return __awaiter(_this, void 0, void 0, function () {
        var devices;
        return __generator(this, function (_a) {
            try {
                devices = device_manager_js_1.default.getAllDevices();
                return [2 /*return*/, {
                        success: true,
                        devices: devices
                    }];
            }
            catch (error) {
                console.error('[DevicePlans] Failed to list devices:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    }); });
    /**
     * Get connected devices
     */
    ipcMain.handle('devices:connected', function () { return __awaiter(_this, void 0, void 0, function () {
        var result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, one_core_js_1.default.getContacts()];
                case 1:
                    result = _a.sent();
                    if (result.success) {
                        return [2 /*return*/, {
                                success: true,
                                devices: result.contacts
                            }];
                    }
                    else {
                        return [2 /*return*/, result];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error('[DevicePlans] Failed to get connected devices:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            error: error_3.message
                        }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    /**
     * Remove a device
     */
    ipcMain.handle('devices:remove', function (event, deviceId) { return __awaiter(_this, void 0, void 0, function () {
        var removed, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, device_manager_js_1.default.removeDevice(deviceId)];
                case 1:
                    removed = _a.sent();
                    return [2 /*return*/, {
                            success: removed
                        }];
                case 2:
                    error_4 = _a.sent();
                    console.error('[DevicePlans] Failed to remove device:', error_4);
                    return [2 /*return*/, {
                            success: false,
                            error: error_4.message
                        }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    /**
     * Get device configuration
     */
    ipcMain.handle('devices:config', function (event, deviceId) { return __awaiter(_this, void 0, void 0, function () {
        var config;
        return __generator(this, function (_a) {
            try {
                config = device_manager_js_1.default.getDeviceConfig(deviceId);
                if (!config) {
                    throw new Error('Device not found');
                }
                return [2 /*return*/, {
                        success: true,
                        config: config
                    }];
            }
            catch (error) {
                console.error('[DevicePlans] Failed to get device config:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    }); });
    /**
     * Send message to specific device
     */
    ipcMain.handle('devices:send', function (event_1, _a) { return __awaiter(_this, [event_1, _a], void 0, function (event, _b) {
        var sent;
        var deviceId = _b.deviceId, message = _b.message;
        return __generator(this, function (_c) {
            try {
                sent = device_manager_js_1.default.sendToDevice(deviceId, message);
                return [2 /*return*/, {
                        success: sent
                    }];
            }
            catch (error) {
                console.error('[DevicePlans] Failed to send to device:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    }); });
    /**
     * Broadcast to all devices
     */
    ipcMain.handle('devices:broadcast', function (event, message) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                device_manager_js_1.default.broadcastToDevices(message);
                return [2 /*return*/, {
                        success: true
                    }];
            }
            catch (error) {
                console.error('[DevicePlans] Failed to broadcast:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    }); });
    /**
     * Get connections model status and info
     */
    ipcMain.handle('connections:status', function () { return __awaiter(_this, void 0, void 0, function () {
        var status_1;
        var _a;
        return __generator(this, function (_b) {
            try {
                status_1 = {
                    nodeInitialized: node_one_core_js_1.default.initialized,
                    connectionsModel: !!node_one_core_js_1.default.connectionsModel,
                    pairingAvailable: !!((_a = node_one_core_js_1.default.connectionsModel) === null || _a === void 0 ? void 0 : _a.pairing),
                    instanceId: node_one_core_js_1.default.ownerId,
                    instanceName: node_one_core_js_1.default.instanceName,
                    config: node_one_core_js_1.default.getState('capabilities.network') || {}
                };
                return [2 /*return*/, {
                        success: true,
                        status: status_1
                    }];
            }
            catch (error) {
                console.error('[DevicePlans] Failed to get connections status:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    }); });
    /**
     * Get connection info from Node.js ConnectionsModel
     */
    ipcMain.handle('connections:info', function () { return __awaiter(_this, void 0, void 0, function () {
        var connectionsInfo;
        return __generator(this, function (_a) {
            try {
                if (!node_one_core_js_1.default.initialized || !node_one_core_js_1.default.connectionsModel) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'ConnectionsModel not available'
                        }];
                }
                connectionsInfo = node_one_core_js_1.default.connectionsModel.connectionsInfo();
                return [2 /*return*/, {
                        success: true,
                        connections: connectionsInfo
                    }];
            }
            catch (error) {
                console.error('[DevicePlans] Failed to get connections info:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    }); });
    /**
     * Get instance information (combined handler for both instance:info and devices:getInstanceInfo)
     */
    var getInstanceInfo = function () { return __awaiter(_this, void 0, void 0, function () {
        var instanceInfo;
        var _a;
        return __generator(this, function (_b) {
            try {
                instanceInfo = {
                    success: true,
                    // Basic info
                    id: node_one_core_js_1.default.ownerId,
                    name: node_one_core_js_1.default.instanceName,
                    type: 'electron-main',
                    platform: 'nodejs',
                    role: 'hub',
                    // Status info
                    initialized: node_one_core_js_1.default.initialized === true,
                    nodeInitialized: node_one_core_js_1.default.initialized === true,
                    hasConnectionsModel: !!node_one_core_js_1.default.connectionsModel,
                    hasPairing: !!((_a = node_one_core_js_1.default.connectionsModel) === null || _a === void 0 ? void 0 : _a.pairing),
                    ownerId: node_one_core_js_1.default.ownerId,
                    instanceName: node_one_core_js_1.default.instanceName,
                    // Capabilities
                    capabilities: {
                        network: node_one_core_js_1.default.getState('capabilities.network'),
                        storage: node_one_core_js_1.default.getState('capabilities.storage'),
                        llm: node_one_core_js_1.default.getState('capabilities.llm')
                    },
                    // Devices
                    devices: device_manager_js_1.default.getAllDevices(),
                    // For legacy compatibility
                    instance: {
                        id: node_one_core_js_1.default.ownerId,
                        name: node_one_core_js_1.default.instanceName,
                        type: 'electron-main',
                        platform: 'nodejs',
                        role: 'hub',
                        initialized: node_one_core_js_1.default.initialized,
                        capabilities: {
                            network: node_one_core_js_1.default.getState('capabilities.network'),
                            storage: node_one_core_js_1.default.getState('capabilities.storage'),
                            llm: node_one_core_js_1.default.getState('capabilities.llm')
                        },
                        devices: device_manager_js_1.default.getAllDevices()
                    }
                };
                console.log('[DevicePlans] Instance info:', JSON.stringify({
                    initialized: instanceInfo.initialized,
                    ownerId: instanceInfo.ownerId,
                    instanceName: instanceInfo.instanceName
                }, null, 2));
                return [2 /*return*/, instanceInfo];
            }
            catch (error) {
                console.error('[DevicePlans] Failed to get instance info:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    }); };
    // Register both handler names for compatibility
    ipcMain.handle('devices:getInstanceInfo', getInstanceInfo);
    ipcMain.handle('instance:info', getInstanceInfo);
}
