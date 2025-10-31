"use strict";
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
/**
 * QUIC Transport Layer
 *
 * This transport uses QUIC-VC (QUIC with Verifiable Credentials) for device communication
 * and regular QUIC for CHUM protocol peer-to-peer connections
 *
 * Architecture:
 * - For IoT devices (ESP32): Uses QuicVCConnectionManager with VC-based authentication
 * - For CHUM peers: Regular QUIC transport (future implementation)
 * - Transport is pluggable - CHUM doesn't care if it's QUIC or WebSocket
 */
var events_1 = require("events");
var dgram_1 = require("dgram");
var quicvc_connection_manager_js_1 = require("./quicvc-connection-manager.js");
var QuicTransport = /** @class */ (function (_super) {
    __extends(QuicTransport, _super);
    function QuicTransport(nodeOneCore) {
        var _this = _super.call(this) || this;
        _this.connections = new Map(); // peerId -> connection
        _this.socket = null;
        _this.quicvcManager = null;
        _this.trustManager = null; // Trust manager for peer verification
        _this.peers = new Map(); // peerId -> peer info
        _this.leuteModel = null; // Reference to LeuteModel
        _this.type = 'quic';
        _this.connectionRouteManager = null;
        _this.nodeOneCore = nodeOneCore;
        return _this;
    }
    /**
     * Initialize the transport
     * Creates UDP socket and QuicVC manager
     */
    QuicTransport.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var transport;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Create UDP socket for QUIC communication
                        this.socket = dgram_1.default.createSocket('udp4');
                        this.socket.on('error', function (err) {
                            console.error('[QuicTransport] Socket error:', err);
                            _this.emit('error', err);
                        });
                        this.socket.on('message', function (msg, rinfo) {
                            // Forward to QuicVC manager or regular QUIC handler
                            _this.handleMessage(msg, rinfo);
                        });
                        if (!this.nodeOneCore.ownPersonId) return [3 /*break*/, 2];
                        this.quicvcManager = quicvc_connection_manager_js_1.QuicVCConnectionManager.getInstance(this.nodeOneCore.ownPersonId);
                        transport = {
                            send: function (data, address, port) { return __awaiter(_this, void 0, void 0, function () {
                                var _this = this;
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, new Promise(function (resolve, reject) {
                                            if (!_this.socket) {
                                                reject(new Error('Socket not initialized'));
                                                return;
                                            }
                                            _this.socket.send(data, port, address, function (err) {
                                                if (err)
                                                    reject(err);
                                                else
                                                    resolve();
                                            });
                                        })];
                                });
                            }); },
                            on: function (event, handler) {
                                if (event === 'message') {
                                    // QuicVC manager will receive messages via handleMessage
                                }
                            }
                        };
                        // Initialize QuicVC manager with transport
                        return [4 /*yield*/, this.quicvcManager.initialize(transport, null, undefined)
                            // Set up event forwarding from QuicVC manager
                        ];
                    case 1:
                        // Initialize QuicVC manager with transport
                        _a.sent();
                        // Set up event forwarding from QuicVC manager
                        this.quicvcManager.on('connectionEstablished', function (deviceId, vcInfo) {
                            _this.emit('deviceConnected', { deviceId: deviceId, vcInfo: vcInfo });
                        });
                        this.quicvcManager.on('connectionClosed', function (deviceId, reason) {
                            _this.emit('deviceDisconnected', { deviceId: deviceId, reason: reason });
                        });
                        this.quicvcManager.on('ledResponse', function (deviceId, response) {
                            _this.emit('ledResponse', { deviceId: deviceId, response: response });
                        });
                        this.quicvcManager.on('deviceProvisioned', function (info) {
                            _this.emit('deviceProvisioned', info);
                        });
                        _a.label = 2;
                    case 2:
                        console.log('[QuicTransport] Initialized with QUIC-VC support');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle incoming UDP messages
     */
    QuicTransport.prototype.handleMessage = function (msg, rinfo) {
        // Check if this is a QUIC-VC packet (check packet type in first byte)
        if (msg.length > 0) {
            var flags = msg[0];
            var isLongHeader = (flags & 0x80) !== 0;
            if (isLongHeader) {
                // This looks like a QUIC-VC packet, forward to manager
                if (this.quicvcManager) {
                    this.quicvcManager.handleQuicVCPacket(msg, rinfo);
                }
            }
            else {
                // Regular QUIC packet for CHUM protocol (future implementation)
                // For now, just log it
                console.log("[QuicTransport] Received non-QUIC-VC packet from ".concat(rinfo.address, ":").concat(rinfo.port));
            }
        }
    };
    /**
     * Start QUIC server
     */
    QuicTransport.prototype.listen = function () {
        return __awaiter(this, arguments, void 0, function (port) {
            var _this = this;
            if (port === void 0) { port = 8766; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[QuicTransport] Starting QUIC server on port ".concat(port));
                        if (!!this.socket) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, new Promise(function (resolve, reject) {
                            if (!_this.socket) {
                                reject(new Error('Socket not initialized'));
                                return;
                            }
                            _this.socket.bind(port, function () {
                                console.log("[QuicTransport] Listening on UDP port ".concat(port));
                                resolve();
                            });
                        })];
                }
            });
        });
    };
    /**
     * Connect to a device using QUIC-VC
     */
    QuicTransport.prototype.connectToDevice = function (deviceId, address, port, credential) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.quicvcManager) {
                            throw new Error('QuicVC manager not initialized');
                        }
                        console.log("[QuicTransport] Connecting to device ".concat(deviceId, " at ").concat(address, ":").concat(port));
                        return [4 /*yield*/, this.quicvcManager.connect(deviceId, address, port, credential)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send data to a device using QUIC-VC
     */
    QuicTransport.prototype.sendToDevice = function (deviceId, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.quicvcManager) {
                            throw new Error('QuicVC manager not initialized');
                        }
                        return [4 /*yield*/, this.quicvcManager.sendData(deviceId, data)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send a protected frame to a device
     */
    QuicTransport.prototype.sendProtectedFrame = function (deviceId, frameData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.quicvcManager) {
                            throw new Error('QuicVC manager not initialized');
                        }
                        return [4 /*yield*/, this.quicvcManager.sendProtectedFrame(deviceId, frameData)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if connected to a device
     */
    QuicTransport.prototype.isConnectedToDevice = function (deviceId) {
        if (!this.quicvcManager)
            return false;
        return this.quicvcManager.isConnected(deviceId);
    };
    /**
     * Disconnect from a device
     */
    QuicTransport.prototype.disconnectFromDevice = function (deviceId) {
        if (!this.quicvcManager)
            return;
        this.quicvcManager.disconnect(deviceId);
    };
    /**
     * Connect to a peer via QUIC (for CHUM protocol)
     */
    QuicTransport.prototype.connect = function (address, port) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                console.log("[QuicTransport] Connecting to ".concat(address, ":").concat(port));
                // TODO: Implement regular QUIC client for CHUM protocol
                // This would return a transport interface that ConnectionsModel can use
                return [2 /*return*/, {
                        send: function (data) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        }); },
                        close: function () {
                            // Close QUIC stream
                        },
                        on: function (event, handler) {
                            // Handle transport events (data, error, close)
                        }
                    }];
            });
        });
    };
    /**
     * Register this transport with ConnectionsModel
     * ConnectionsModel will use this for CHUM protocol
     */
    QuicTransport.prototype.registerWithConnectionsModel = function () {
        if (!this.nodeOneCore.connectionsModel) {
            console.warn('[QuicTransport] ConnectionsModel not available yet');
            return;
        }
        // Register as a transport option
        // ConnectionsModel handles CHUM, we just move bytes
        var transportConfig = {
            connect: this.connect.bind(this),
            listen: this.listen.bind(this)
        };
        this.nodeOneCore.connectionsModel.registerTransport('quic', transportConfig);
        console.log('[QuicTransport] Registered as transport for ConnectionsModel');
    };
    /**
     * Close the transport
     */
    QuicTransport.prototype.close = function () {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    };
    return QuicTransport;
}(events_1.EventEmitter));
exports.default = QuicTransport;
