"use strict";
/**
 * QuicVC Discovery - Local network discovery using UDP broadcast
 *
 * Implements discovery for QuicVC devices (ESP32, other lama instances)
 * using UDP broadcast on port 49497 (QuicVC discovery port).
 *
 * Based on QuicVC protocol discovery patterns with HEARTBEAT frames.
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
exports.QuicVCDiscovery = void 0;
var dgram_1 = require("dgram");
var events_1 = require("events");
/**
 * QuicVC discovery frame type (from QuicVC spec)
 */
var QUICVC_FRAME_DISCOVERY = 0x30;
var QUICVC_FRAME_HEARTBEAT = 0x20;
/**
 * QuicVC discovery configuration (from QuicVC spec)
 */
var QUICVC_DISCOVERY_PORT = 49497; // Unified service port
var QUICVC_PORT = 49498; // QuicVC connection port
var DISCOVERY_INTERVAL = 5000; // 5 seconds
var PEER_EXPIRATION = 60000; // 60 seconds (matches QuicVC idle timeout)
var QuicVCDiscovery = /** @class */ (function (_super) {
    __extends(QuicVCDiscovery, _super);
    function QuicVCDiscovery(ownDeviceId, ownDeviceName) {
        var _this = _super.call(this) || this;
        _this.socket = null;
        _this.broadcastInterval = null;
        _this.expirationInterval = null;
        _this.discoveredDevices = new Map();
        _this.peerDiscoveredCallbacks = [];
        _this.peerLostCallbacks = [];
        _this.ownDeviceId = ownDeviceId;
        _this.ownDeviceName = ownDeviceName;
        return _this;
    }
    /**
     * Initialize UDP discovery
     */
    QuicVCDiscovery.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[QuicVCDiscovery] Initializing on port', QUICVC_DISCOVERY_PORT);
                        // Create UDP socket for discovery
                        this.socket = dgram_1.default.createSocket({ type: 'udp4', reuseAddr: true });
                        // Setup socket event handlers
                        this.socket.on('message', function (msg, rinfo) {
                            console.log('[QuicVCDiscovery] 📡 Received UDP packet:', msg.length, 'bytes from', rinfo.address + ':' + rinfo.port);
                            // Log full packet for debugging
                            console.log('[QuicVCDiscovery] Full hex:', msg.toString('hex'));
                            console.log('[QuicVCDiscovery] Full ascii:', msg.toString('ascii'));
                            void _this.handleDiscoveryMessage(msg, rinfo);
                        });
                        this.socket.on('error', function (err) {
                            console.error('[QuicVCDiscovery] Socket error:', err);
                        });
                        // Bind to discovery port
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this.socket.bind(QUICVC_DISCOVERY_PORT, function () {
                                    try {
                                        _this.socket.setBroadcast(true);
                                        console.log('[QuicVCDiscovery] Bound to port', QUICVC_DISCOVERY_PORT);
                                        resolve();
                                    }
                                    catch (error) {
                                        reject(error);
                                    }
                                });
                            })];
                    case 1:
                        // Bind to discovery port
                        _a.sent();
                        // Start peer expiration checker
                        this.startExpirationChecker();
                        console.log('[QuicVCDiscovery] Initialized successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start listening for discovery broadcasts
     */
    QuicVCDiscovery.prototype.startListening = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.socket) {
                    throw new Error('Discovery not initialized');
                }
                console.log('[QuicVCDiscovery] Started listening for devices');
                // Start broadcasting our own presence
                this.startBroadcasting();
                return [2 /*return*/];
            });
        });
    };
    /**
     * Stop listening for discovery broadcasts
     */
    QuicVCDiscovery.prototype.stopListening = function () {
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }
        console.log('[QuicVCDiscovery] Stopped listening');
    };
    /**
     * Perform one-time discovery scan
     */
    QuicVCDiscovery.prototype.scan = function (timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Send discovery broadcast
                    return [4 /*yield*/, this.sendDiscoveryBroadcast()];
                    case 1:
                        // Send discovery broadcast
                        _a.sent();
                        // Wait for responses
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, timeout); })];
                    case 2:
                        // Wait for responses
                        _a.sent();
                        // Convert discovered devices to LocalPeerInfo
                        return [2 /*return*/, Array.from(this.discoveredDevices.values()).map(function (device) {
                                return _this.convertToLocalPeerInfo(device);
                            })];
                }
            });
        });
    };
    /**
     * Register callback for peer discovered
     */
    QuicVCDiscovery.prototype.onPeerDiscovered = function (callback) {
        this.peerDiscoveredCallbacks.push(callback);
    };
    /**
     * Register callback for peer lost
     */
    QuicVCDiscovery.prototype.onPeerLost = function (callback) {
        this.peerLostCallbacks.push(callback);
    };
    /**
     * Shutdown discovery
     */
    QuicVCDiscovery.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.stopListening();
                if (this.expirationInterval) {
                    clearInterval(this.expirationInterval);
                    this.expirationInterval = null;
                }
                if (this.socket) {
                    this.socket.close();
                    this.socket = null;
                }
                this.discoveredDevices.clear();
                console.log('[QuicVCDiscovery] Shutdown complete');
                return [2 /*return*/];
            });
        });
    };
    /**
     * Start broadcasting discovery announcements
     */
    QuicVCDiscovery.prototype.startBroadcasting = function () {
        var _this = this;
        // Send initial broadcast immediately
        void this.sendDiscoveryBroadcast();
        // Then send periodically
        this.broadcastInterval = setInterval(function () {
            void _this.sendDiscoveryBroadcast();
        }, DISCOVERY_INTERVAL);
    };
    /**
     * Send discovery broadcast
     */
    QuicVCDiscovery.prototype.sendDiscoveryBroadcast = function () {
        return __awaiter(this, void 0, void 0, function () {
            var announcement, message;
            return __generator(this, function (_a) {
                if (!this.socket)
                    return [2 /*return*/];
                announcement = {
                    type: 'discovery',
                    deviceId: this.ownDeviceId,
                    deviceName: this.ownDeviceName,
                    timestamp: Date.now(),
                    capabilities: ['quicvc', 'websocket'],
                    port: QUICVC_PORT,
                };
                message = Buffer.from(JSON.stringify(announcement));
                // Broadcast on local network
                try {
                    console.log('[QuicVCDiscovery] 📤 Sending discovery broadcast:', message.length, 'bytes');
                    this.socket.send(message, QUICVC_DISCOVERY_PORT, '255.255.255.255', function (err) {
                        if (err) {
                            console.error('[QuicVCDiscovery] Broadcast error:', err);
                        }
                        else {
                            console.log('[QuicVCDiscovery] ✅ Broadcast sent successfully');
                        }
                    });
                }
                catch (error) {
                    console.error('[QuicVCDiscovery] Failed to send broadcast:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Handle incoming discovery message
     */
    QuicVCDiscovery.prototype.handleDiscoveryMessage = function (msg, rinfo) {
        return __awaiter(this, void 0, void 0, function () {
            var data, frameType, deviceId, deviceName, deviceType, device, isNew, peerInfo_1;
            var _a;
            return __generator(this, function (_b) {
                try {
                    data = void 0;
                    try {
                        data = JSON.parse(msg.toString());
                    }
                    catch (_c) {
                        // Not JSON - try ESP32 HTML microdata format
                        if (msg.length > 10 && msg[0] === 0xc0) {
                            console.log('[QuicVCDiscovery] Parsing ESP32 HTML microdata packet');
                            data = this.parseESP32Packet(msg);
                            if (!data) {
                                console.log('[QuicVCDiscovery] Failed to parse ESP32 packet');
                                return [2 /*return*/];
                            }
                        }
                        else if (msg.length >= 3) {
                            frameType = msg[0];
                            if (frameType === QUICVC_FRAME_HEARTBEAT || frameType === QUICVC_FRAME_DISCOVERY) {
                                console.log('[QuicVCDiscovery] Received QuicVC frame type', frameType.toString(16), 'from', rinfo.address);
                                data = this.parseQuicVCFrame(msg);
                            }
                            else {
                                return [2 /*return*/]; // Unknown format
                            }
                        }
                        else {
                            return [2 /*return*/]; // Too short
                        }
                    }
                    // Ignore our own broadcasts
                    if (data.deviceId === this.ownDeviceId) {
                        return [2 /*return*/];
                    }
                    deviceId = data.deviceId || data.device_id || data.id || "unknown-".concat(rinfo.address);
                    deviceName = data.deviceName || data.device_name || data.name || deviceId;
                    deviceType = data.deviceType || data.type || 'unknown';
                    device = {
                        id: deviceId,
                        name: deviceName,
                        type: deviceType,
                        address: rinfo.address,
                        port: data.port || QUICVC_PORT,
                        capabilities: data.capabilities || ['quicvc'],
                        mac: data.mac,
                        lastSeen: Date.now(),
                        discoveredAt: ((_a = this.discoveredDevices.get(deviceId)) === null || _a === void 0 ? void 0 : _a.discoveredAt) || Date.now(),
                    };
                    isNew = !this.discoveredDevices.has(deviceId);
                    // Update or add device
                    this.discoveredDevices.set(deviceId, device);
                    if (isNew) {
                        console.log('[QuicVCDiscovery] 🎉 Discovered new device:', deviceName, 'at', rinfo.address);
                        peerInfo_1 = this.convertToLocalPeerInfo(device);
                        this.peerDiscoveredCallbacks.forEach(function (callback) { return callback(peerInfo_1); });
                        // Emit event
                        this.emit('peerDiscovered', peerInfo_1);
                    }
                    else {
                        // Update last seen for existing device
                        console.log('[QuicVCDiscovery] Updated device:', deviceName);
                    }
                }
                catch (error) {
                    console.error('[QuicVCDiscovery] Error handling discovery message:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Parse ESP32 HTML microdata packet
     * Format: 0xC0 [version] [length] [random] [markers] [HTML]
     */
    QuicVCDiscovery.prototype.parseESP32Packet = function (data) {
        try {
            // Find the HTML start (<!DOCTYPE or <html)
            var htmlStart = data.indexOf('<!DOCTYPE');
            if (htmlStart === -1) {
                return null;
            }
            // Extract HTML
            var html = data.slice(htmlStart).toString('utf-8');
            // Parse microdata attributes
            var idMatch = html.match(/itemprop="id"\s+content="([^"]+)"/);
            var typeMatch = html.match(/itemprop="type"\s+content="([^"]+)"/);
            var statusMatch = html.match(/itemprop="status"\s+content="([^"]+)"/);
            var ownershipMatch = html.match(/itemprop="ownership"\s+content="([^"]+)"/);
            if (!idMatch) {
                return null;
            }
            return {
                id: idMatch[1],
                deviceId: idMatch[1],
                name: idMatch[1],
                type: typeMatch ? typeMatch[1] : 'ESP32',
                status: statusMatch ? statusMatch[1] : 'unknown',
                ownership: ownershipMatch ? ownershipMatch[1] : 'unknown',
                capabilities: ['quicvc'],
            };
        }
        catch (error) {
            console.error('[QuicVCDiscovery] Error parsing ESP32 packet:', error);
            return null;
        }
    };
    /**
     * Parse QuicVC binary frame (simplified)
     */
    QuicVCDiscovery.prototype.parseQuicVCFrame = function (data) {
        var frameType = data[0];
        var length = (data[1] << 8) | data[2];
        if (data.length < 3 + length) {
            return {}; // Invalid frame
        }
        var payload = data.slice(3, 3 + length);
        // Try to parse payload as JSON
        try {
            return JSON.parse(payload.toString());
        }
        catch (_a) {
            // Binary payload - extract what we can
            return {
                frameType: frameType,
                deviceId: "quicvc-".concat(data.slice(3, 9).toString('hex')),
            };
        }
    };
    /**
     * Start peer expiration checker
     */
    QuicVCDiscovery.prototype.startExpirationChecker = function () {
        var _this = this;
        this.expirationInterval = setInterval(function () {
            var now = Date.now();
            var expiredDevices = [];
            for (var _i = 0, _a = _this.discoveredDevices; _i < _a.length; _i++) {
                var _b = _a[_i], deviceId = _b[0], device = _b[1];
                if (now - device.lastSeen > PEER_EXPIRATION) {
                    expiredDevices.push(deviceId);
                }
            }
            var _loop_1 = function (deviceId) {
                console.log('[QuicVCDiscovery] Device expired:', deviceId);
                _this.discoveredDevices.delete(deviceId);
                // Emit to callbacks
                _this.peerLostCallbacks.forEach(function (callback) { return callback(deviceId); });
                // Emit event
                _this.emit('peerLost', deviceId);
            };
            for (var _c = 0, expiredDevices_1 = expiredDevices; _c < expiredDevices_1.length; _c++) {
                var deviceId = expiredDevices_1[_c];
                _loop_1(deviceId);
            }
        }, 10000); // Check every 10 seconds
    };
    /**
     * Convert QuicVCDevice to LocalPeerInfo
     */
    QuicVCDiscovery.prototype.convertToLocalPeerInfo = function (device) {
        return {
            id: device.id,
            name: device.name,
            address: "".concat(device.address, ":").concat(device.port),
            capabilities: device.capabilities,
            discoveredAt: device.discoveredAt,
            lastSeenAt: device.lastSeen,
        };
    };
    /**
     * Get all discovered devices
     */
    QuicVCDiscovery.prototype.getDiscoveredDevices = function () {
        return Array.from(this.discoveredDevices.values());
    };
    return QuicVCDiscovery;
}(events_1.EventEmitter));
exports.QuicVCDiscovery = QuicVCDiscovery;
