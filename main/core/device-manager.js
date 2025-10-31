"use strict";
/**
 * Device Manager - Manages multiple device connections to the central Node.js hub
 * Each device gets its own browser instance name and IoM connection
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
var node_one_core_js_1 = require("./node-one-core.js");
var crypto_1 = require("crypto");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var DeviceManager = /** @class */ (function () {
    function DeviceManager() {
        var _a;
        this.devices = new Map(); // deviceId -> device info
        this.invites = new Map(); // inviteId -> invite info
        this.connections = new Map(); // websocket -> device info
        // Use runtime configuration path (respects --storage CLI arg)
        var storageDir = ((_a = global.lamaConfig) === null || _a === void 0 ? void 0 : _a.instance.directory) || path_1.default.join(process.cwd(), 'OneDB');
        this.configFile = path_1.default.join(storageDir, 'devices.json');
    }
    /**
     * Initialize device manager
     */
    DeviceManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Load existing device configurations
                    return [4 /*yield*/, this.loadDevices()];
                    case 1:
                        // Load existing device configurations
                        _a.sent();
                        console.log("[DeviceManager] Initialized with ".concat(this.devices.size, " registered devices"));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Register a new device
     * @param {Object} deviceInfo - Device information
     * @returns {Object} Device registration with invite
     */
    DeviceManager.prototype.registerDevice = function (deviceInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var deviceId, browserInstanceName, device, invite;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        deviceId = deviceInfo.id || crypto_1.default.randomBytes(16).toString('hex');
                        browserInstanceName = "".concat(node_one_core_js_1.default.instanceName, "-ui-").concat(deviceInfo.name || deviceId.slice(0, 8));
                        device = {
                            id: deviceId,
                            name: deviceInfo.name || "Device ".concat(this.devices.size + 1),
                            browserInstanceName: browserInstanceName,
                            registeredAt: new Date().toISOString(),
                            lastSeen: new Date().toISOString(),
                            platform: deviceInfo.platform || 'unknown',
                            status: 'pending'
                        };
                        return [4 /*yield*/, this.createDeviceInvite(device)
                            // Store device
                        ];
                    case 1:
                        invite = _a.sent();
                        // Store device
                        this.devices.set(deviceId, device);
                        return [4 /*yield*/, this.saveDevices()];
                    case 2:
                        _a.sent();
                        console.log("[DeviceManager] Registered new device: ".concat(device.name, " (").concat(deviceId, ")"));
                        return [2 /*return*/, {
                                device: device,
                                invite: invite
                            }];
                }
            });
        });
    };
    /**
     * Create an IoM invite for a specific device
     */
    DeviceManager.prototype.createDeviceInvite = function (device) {
        return __awaiter(this, void 0, void 0, function () {
            var inviteOptions, invite;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        inviteOptions = {
                            name: device.browserInstanceName,
                            description: "Connection for ".concat(device.name),
                            permissions: ['read', 'write', 'sync'],
                            deviceId: device.id
                        };
                        return [4 /*yield*/, node_one_core_js_1.default.createLocalInvite(inviteOptions)
                            // Store invite mapping
                        ];
                    case 1:
                        invite = _a.sent();
                        // Store invite mapping
                        this.invites.set(invite.id, __assign({ deviceId: device.id, createdAt: new Date().toISOString() }, invite));
                        console.log("[DeviceManager] Created invite for device ".concat(device.name, ": ").concat(invite.id));
                        return [2 /*return*/, invite];
                }
            });
        });
    };
    /**
     * Handle device connection via WebSocket
     */
    DeviceManager.prototype.handleDeviceConnection = function (ws, deviceId) {
        var _this = this;
        var device = this.devices.get(deviceId);
        if (!device) {
            console.error("[DeviceManager] Unknown device: ".concat(deviceId));
            ws.close();
            return;
        }
        // Update device status
        device.status = 'connected';
        device.lastSeen = new Date().toISOString();
        // Store connection
        this.connections.set(ws, device);
        console.log("[DeviceManager] Device connected: ".concat(device.name));
        // Handle disconnection
        ws.on('close', function () {
            _this.handleDeviceDisconnection(ws);
        });
    };
    /**
     * Handle device disconnection
     */
    DeviceManager.prototype.handleDeviceDisconnection = function (ws) {
        var device = this.connections.get(ws);
        if (device) {
            device.status = 'disconnected';
            device.lastSeen = new Date().toISOString();
            this.connections.delete(ws);
            console.log("[DeviceManager] Device disconnected: ".concat(device.name));
            // Save updated status
            this.saveDevices();
        }
    };
    /**
     * Get device by ID
     */
    DeviceManager.prototype.getDevice = function (deviceId) {
        return this.devices.get(deviceId);
    };
    /**
     * Get all registered devices
     */
    DeviceManager.prototype.getAllDevices = function () {
        return Array.from(this.devices.values());
    };
    /**
     * Get connected devices
     */
    DeviceManager.prototype.getConnectedDevices = function () {
        return Array.from(this.devices.values()).filter(function (d) { return d.status === 'connected'; });
    };
    /**
     * Broadcast to all connected devices
     */
    DeviceManager.prototype.broadcastToDevices = function (message) {
        var messageStr = JSON.stringify(message);
        for (var _i = 0, _a = this.connections; _i < _a.length; _i++) {
            var _b = _a[_i], ws = _b[0], device = _b[1];
            if (ws.readyState === 1) { // WebSocket.OPEN
                ws.send(messageStr);
                console.log("[DeviceManager] Broadcast to ".concat(device.name));
            }
        }
    };
    /**
     * Send to specific device
     */
    DeviceManager.prototype.sendToDevice = function (deviceId, message) {
        for (var _i = 0, _a = this.connections; _i < _a.length; _i++) {
            var _b = _a[_i], ws = _b[0], device = _b[1];
            if (device.id === deviceId && ws.readyState === 1) {
                ws.send(JSON.stringify(message));
                console.log("[DeviceManager] Sent to ".concat(device.name));
                return true;
            }
        }
        console.warn("[DeviceManager] Device not connected: ".concat(deviceId));
        return false;
    };
    /**
     * Remove a device
     */
    DeviceManager.prototype.removeDevice = function (deviceId) {
        return __awaiter(this, void 0, void 0, function () {
            var device, _i, _a, _b, ws, dev;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        device = this.devices.get(deviceId);
                        if (!device) {
                            return [2 /*return*/, false];
                        }
                        // Close any active connections
                        for (_i = 0, _a = this.connections; _i < _a.length; _i++) {
                            _b = _a[_i], ws = _b[0], dev = _b[1];
                            if (dev.id === deviceId) {
                                ws.close();
                                this.connections.delete(ws);
                            }
                        }
                        // Remove device
                        this.devices.delete(deviceId);
                        return [4 /*yield*/, this.saveDevices()];
                    case 1:
                        _c.sent();
                        console.log("[DeviceManager] Removed device: ".concat(device.name));
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Load devices from storage
     */
    DeviceManager.prototype.loadDevices = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, devices, _i, devices_1, device, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, promises_1.default.readFile(this.configFile, 'utf8')];
                    case 1:
                        data = _a.sent();
                        devices = JSON.parse(data);
                        for (_i = 0, devices_1 = devices; _i < devices_1.length; _i++) {
                            device = devices_1[_i];
                            this.devices.set(device.id, device);
                        }
                        console.log("[DeviceManager] Loaded ".concat(devices.length, " devices"));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        // No existing devices file
                        console.log('[DeviceManager] No existing devices found');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save devices to storage
     */
    DeviceManager.prototype.saveDevices = function () {
        return __awaiter(this, void 0, void 0, function () {
            var devices, dir, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        devices = Array.from(this.devices.values());
                        dir = path_1.default.dirname(this.configFile);
                        return [4 /*yield*/, promises_1.default.mkdir(dir, { recursive: true })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, promises_1.default.writeFile(this.configFile, JSON.stringify(devices, null, 2))];
                    case 2:
                        _a.sent();
                        console.log("[DeviceManager] Saved ".concat(devices.length, " devices"));
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error('[DeviceManager] Failed to save devices:', error_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get device-specific configuration for browser
     */
    DeviceManager.prototype.getDeviceConfig = function (deviceId) {
        var device = this.devices.get(deviceId);
        if (!device) {
            return null;
        }
        return {
            deviceId: device.id,
            deviceName: device.name,
            browserInstanceName: device.browserInstanceName,
            nodeInstanceName: node_one_core_js_1.default.instanceName,
            nodeEndpoint: 'ws://localhost:8765'
        };
    };
    return DeviceManager;
}());
// Singleton
exports.default = new DeviceManager();
