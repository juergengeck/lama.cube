"use strict";
/**
 * QUIC VC Connection Manager
 *
 * Implements QUICVC protocol - QUIC with Verifiable Credentials replacing TLS.
 * Adapted from the uvc project for lama.electron
 *
 * Architecture:
 * - VC-based initial handshake for authentication (replaces TLS 1.3)
 * - Derives session keys from credential exchange
 * - QUIC-style packet protection and encryption after handshake
 * - Secure heartbeat mechanism over encrypted channel
 *
 * Connection flow:
 * 1. Initial packet with VC_INIT frame containing client credentials
 * 2. Server validates and responds with VC_RESPONSE frame
 * 3. Both parties derive shared secrets from credentials
 * 4. All subsequent packets use QUIC packet protection
 * 5. Heartbeats sent over secure channel with packet numbers
 *
 * Security model:
 * - Authentication: Verifiable Credentials with challenge-response
 * - Encryption: AES-GCM with keys derived from VC exchange
 * - Integrity: HMAC with packet numbers for replay protection
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
exports.QuicVCConnectionManager = exports.QuicVCFrameType = exports.QuicVCPacketType = void 0;
var events_1 = require("events");
var crypto_1 = require("crypto");
var debug_1 = require("debug");
var debug = (0, debug_1.default)('one:quic:vc:connection');
// QUICVC packet types
var QuicVCPacketType;
(function (QuicVCPacketType) {
    QuicVCPacketType[QuicVCPacketType["INITIAL"] = 0] = "INITIAL";
    QuicVCPacketType[QuicVCPacketType["HANDSHAKE"] = 1] = "HANDSHAKE";
    QuicVCPacketType[QuicVCPacketType["PROTECTED"] = 2] = "PROTECTED";
    QuicVCPacketType[QuicVCPacketType["RETRY"] = 3] = "RETRY"; // Retry with different parameters
})(QuicVCPacketType || (exports.QuicVCPacketType = QuicVCPacketType = {}));
// QUICVC frame types
var QuicVCFrameType;
(function (QuicVCFrameType) {
    QuicVCFrameType[QuicVCFrameType["VC_INIT"] = 16] = "VC_INIT";
    QuicVCFrameType[QuicVCFrameType["VC_RESPONSE"] = 17] = "VC_RESPONSE";
    QuicVCFrameType[QuicVCFrameType["VC_ACK"] = 18] = "VC_ACK";
    QuicVCFrameType[QuicVCFrameType["STREAM"] = 8] = "STREAM";
    QuicVCFrameType[QuicVCFrameType["ACK"] = 2] = "ACK";
    QuicVCFrameType[QuicVCFrameType["HEARTBEAT"] = 32] = "HEARTBEAT";
    QuicVCFrameType[QuicVCFrameType["DISCOVERY"] = 48] = "DISCOVERY";
    QuicVCFrameType[QuicVCFrameType["CONNECTION_CLOSE"] = 28] = "CONNECTION_CLOSE"; // Connection close frame
})(QuicVCFrameType || (exports.QuicVCFrameType = QuicVCFrameType = {}));
var QuicVCConnectionManager = /** @class */ (function (_super) {
    __extends(QuicVCConnectionManager, _super);
    function QuicVCConnectionManager(ownPersonId) {
        var _this = _super.call(this) || this;
        _this.connections = new Map();
        _this.quicModel = null;
        _this.vcManager = null;
        _this.ownVC = null;
        // Configuration
        _this.QUICVC_PORT = 49497; // All QUICVC communication on this port
        _this.QUICVC_VERSION = 0x00000001; // Version 1
        _this.HANDSHAKE_TIMEOUT = 5000; // 5 seconds
        _this.HEARTBEAT_INTERVAL = 30000; // 30 seconds (as per ESP32 spec)
        _this.IDLE_TIMEOUT = 120000; // 2 minutes (as per ESP32 spec)
        _this.CONNECTION_ID_LENGTH = 16; // bytes
        _this.ownPersonId = ownPersonId;
        return _this;
    }
    QuicVCConnectionManager.getInstance = function (ownPersonId) {
        if (!QuicVCConnectionManager.instance) {
            QuicVCConnectionManager.instance = new QuicVCConnectionManager(ownPersonId);
        }
        return QuicVCConnectionManager.instance;
    };
    /**
     * Check if the manager is initialized with a credential
     */
    QuicVCConnectionManager.prototype.isInitialized = function () {
        return this.vcManager !== null && this.quicModel !== null && this.ownVC !== null;
    };
    /**
     * Get an existing connection by device ID
     */
    QuicVCConnectionManager.prototype.getConnection = function (deviceId) {
        for (var _i = 0, _a = this.connections.values(); _i < _a.length; _i++) {
            var connection = _a[_i];
            if (connection.deviceId === deviceId) {
                return connection;
            }
        }
        return undefined;
    };
    /**
     * Send a frame in a PROTECTED packet to an established connection
     */
    QuicVCConnectionManager.prototype.sendProtectedFrame = function (deviceId, frameData) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, packet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connection = this.getConnection(deviceId);
                        if (!connection) {
                            throw new Error("No connection found for device ".concat(deviceId));
                        }
                        if (connection.state !== 'established') {
                            throw new Error("Connection to ".concat(deviceId, " is not established (state: ").concat(connection.state, ")"));
                        }
                        packet = this.createProtectedPacket(connection, frameData);
                        // Send the packet
                        return [4 /*yield*/, this.sendPacket(connection, packet)];
                    case 1:
                        // Send the packet
                        _a.sent();
                        console.log("[QuicVCConnectionManager] Sent PROTECTED frame to ".concat(deviceId, ", frame type: 0x").concat(frameData[0].toString(16)));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initialize with transport and VCManager
     */
    QuicVCConnectionManager.prototype.initialize = function (transport, vcManager, ownVC) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.vcManager = vcManager;
                this.quicModel = transport;
                this.ownVC = ownVC || null;
                // Listen for raw messages
                if (transport && typeof transport.on === 'function') {
                    transport.on('message', function (data, rinfo) {
                        // Check if this is a QUIC packet (first byte lower 2 bits indicate packet type)
                        if (data.length > 0) {
                            var packetType = data[0] & 0x03;
                            // Handle HANDSHAKE (0x01) and PROTECTED (0x02) packets that aren't discovery
                            if (packetType === 0x01 || packetType === 0x02) {
                                console.log("[QuicVCConnectionManager] Received QUIC packet type ".concat(packetType, " from ").concat(rinfo.address, ":").concat(rinfo.port));
                                _this.handleQuicVCPacket(data, rinfo);
                            }
                        }
                    });
                }
                debug('QuicVCConnectionManager initialized');
                return [2 /*return*/];
            });
        });
    };
    /**
     * Initiate QUIC-VC handshake with a device
     */
    QuicVCConnectionManager.prototype.initiateHandshake = function (deviceId, address, port, credential) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[QuicVCConnectionManager] Initiating QUIC-VC handshake with ".concat(deviceId, " at ").concat(address, ":").concat(port));
                        // Pass the credential directly to connect
                        return [4 /*yield*/, this.connect(deviceId, address, port, credential)];
                    case 1:
                        // Pass the credential directly to connect
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initiate QUICVC connection (client role)
     */
    QuicVCConnectionManager.prototype.connect = function (deviceId, address, port, credential) {
        return __awaiter(this, void 0, void 0, function () {
            var existingConnection, dcid, scid, connection, connId;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[QuicVCConnectionManager] Initiating QUICVC connection to ".concat(deviceId, " at ").concat(address, ":").concat(port));
                        existingConnection = this.findConnectionByAddress(address, port);
                        if (existingConnection && existingConnection.state === 'established') {
                            console.log("[QuicVCConnectionManager] Already have established connection to ".concat(deviceId, " - reusing it"));
                            return [2 /*return*/];
                        }
                        else if (existingConnection && existingConnection.state !== 'established') {
                            console.log("[QuicVCConnectionManager] Have connection in ".concat(existingConnection.state, " state - closing and recreating"));
                            this.closeConnection(existingConnection, 'Recreating for new operation');
                        }
                        dcid = crypto_1.default.randomBytes(this.CONNECTION_ID_LENGTH);
                        scid = crypto_1.default.randomBytes(this.CONNECTION_ID_LENGTH);
                        connection = {
                            deviceId: deviceId,
                            dcid: dcid,
                            scid: scid,
                            address: address,
                            port: port,
                            state: 'initial',
                            isServer: false,
                            nextPacketNumber: 0n,
                            highestReceivedPacket: -1n,
                            ackQueue: [],
                            localVC: credential,
                            remoteVC: null,
                            challenge: this.generateChallenge(),
                            initialKeys: null,
                            handshakeKeys: null,
                            applicationKeys: null,
                            serviceHandlers: new Map(),
                            handshakeTimeout: null,
                            heartbeatInterval: null,
                            idleTimeout: null,
                            createdAt: Date.now(),
                            lastActivity: Date.now()
                        };
                        connId = this.getConnectionId(dcid);
                        this.connections.set(connId, connection);
                        console.log("[QuicVCConnectionManager] Created connection ".concat(connId, " for ").concat(deviceId, " at ").concat(address, ":").concat(port));
                        // Set handshake timeout
                        connection.handshakeTimeout = setTimeout(function () {
                            _this.handleHandshakeTimeout(connId);
                        }, this.HANDSHAKE_TIMEOUT);
                        // Send initial packet with VC_INIT frame
                        return [4 /*yield*/, this.sendInitialPacket(connection)];
                    case 1:
                        // Send initial packet with VC_INIT frame
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send initial packet with credential
     */
    QuicVCConnectionManager.prototype.sendInitialPacket = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var vcInitFrame, packet;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!connection.localVC) {
                            throw new Error('No local credential available');
                        }
                        vcInitFrame = {
                            type: QuicVCFrameType.VC_INIT,
                            credential: connection.localVC,
                            challenge: connection.challenge,
                            timestamp: Date.now()
                        };
                        console.log('[QuicVCConnectionManager] Sending VC_INIT frame:', {
                            frameType: 'VC_INIT (0x10)',
                            credentialType: ((_a = connection.localVC) === null || _a === void 0 ? void 0 : _a.$type$) || 'unknown',
                            toDevice: connection.deviceId,
                            toAddress: "".concat(connection.address, ":").concat(connection.port)
                        });
                        packet = this.createPacket(QuicVCPacketType.INITIAL, connection, JSON.stringify(vcInitFrame), QuicVCFrameType.VC_INIT);
                        // Send packet
                        return [4 /*yield*/, this.sendPacket(connection, packet)];
                    case 1:
                        // Send packet
                        _b.sent();
                        debug("Sent INITIAL packet to ".concat(connection.deviceId));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle incoming QUICVC packet
     */
    QuicVCConnectionManager.prototype.handleQuicVCPacket = function (data, rinfo) {
        return __awaiter(this, void 0, void 0, function () {
            var header, connection, _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[QuicVCConnectionManager] handleQuicVCPacket called with', data.length, 'bytes from', rinfo.address + ':' + rinfo.port);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 14, , 15]);
                        header = this.parsePacketHeader(data);
                        if (!header) {
                            console.error('[QuicVCConnectionManager] Invalid packet header');
                            return [2 /*return*/];
                        }
                        connection = this.findConnectionByIds(header.dcid, header.scid);
                        // For ESP32 responses, also try to find by address/port if not found by IDs
                        if (!connection) {
                            connection = this.findConnectionByAddress(rinfo.address, rinfo.port);
                        }
                        if (!!connection) return [3 /*break*/, 5];
                        if (!(header.type === QuicVCPacketType.INITIAL)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.handleNewConnection(header, rinfo)];
                    case 2:
                        // New incoming connection (server role)
                        connection = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        if (header.type === QuicVCPacketType.PROTECTED) {
                            console.error('[QuicVCConnectionManager] Received PROTECTED packet without connection');
                            return [2 /*return*/];
                        }
                        else {
                            console.error('[QuicVCConnectionManager] No connection found for packet type:', header.type);
                            return [2 /*return*/];
                        }
                        _b.label = 4;
                    case 4:
                        if (!connection) {
                            console.error('[QuicVCConnectionManager] Failed to create connection');
                            return [2 /*return*/];
                        }
                        _b.label = 5;
                    case 5:
                        // Update activity
                        connection.lastActivity = Date.now();
                        _a = header.type;
                        switch (_a) {
                            case QuicVCPacketType.INITIAL: return [3 /*break*/, 6];
                            case QuicVCPacketType.HANDSHAKE: return [3 /*break*/, 8];
                            case QuicVCPacketType.PROTECTED: return [3 /*break*/, 10];
                        }
                        return [3 /*break*/, 12];
                    case 6: return [4 /*yield*/, this.handleInitialPacket(connection, data, header)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 13];
                    case 8: return [4 /*yield*/, this.handleHandshakePacket(connection, data, header)];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 13];
                    case 10: return [4 /*yield*/, this.handleProtectedPacket(connection, data, header)];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        debug("Unknown packet type: ".concat(header.type));
                        _b.label = 13;
                    case 13: return [3 /*break*/, 15];
                    case 14:
                        error_1 = _b.sent();
                        console.error('[QuicVCConnectionManager] Error handling packet:', error_1);
                        return [3 /*break*/, 15];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle new incoming connection
     */
    QuicVCConnectionManager.prototype.handleNewConnection = function (header, rinfo) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, connId;
            return __generator(this, function (_a) {
                connection = {
                    deviceId: '', // Will be set after VC verification
                    dcid: header.scid, // Swap IDs for server
                    scid: header.dcid,
                    address: rinfo.address,
                    port: rinfo.port,
                    state: 'initial',
                    isServer: true,
                    nextPacketNumber: 0n,
                    highestReceivedPacket: header.packetNumber,
                    ackQueue: [header.packetNumber],
                    localVC: this.ownVC,
                    remoteVC: null,
                    challenge: this.generateChallenge(),
                    initialKeys: null,
                    handshakeKeys: null,
                    applicationKeys: null,
                    serviceHandlers: new Map(),
                    handshakeTimeout: null,
                    heartbeatInterval: null,
                    idleTimeout: null,
                    createdAt: Date.now(),
                    lastActivity: Date.now()
                };
                connId = this.getConnectionId(connection.dcid);
                this.connections.set(connId, connection);
                return [2 /*return*/, connection];
            });
        });
    };
    /**
     * Handle INITIAL packet with VC_INIT frame
     */
    QuicVCConnectionManager.prototype.handleInitialPacket = function (connection, data, header) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, frames, vcInitFrame, vcResponseFrame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[QuicVCConnectionManager] Handling INITIAL packet');
                        payload = this.extractPayload(data, header);
                        frames = this.parseFrames(payload);
                        if (frames.length === 0) {
                            console.error('[QuicVCConnectionManager] No frames found in INITIAL packet');
                            return [2 /*return*/];
                        }
                        vcInitFrame = frames.find(function (frame) { return frame.type === QuicVCFrameType.VC_INIT; });
                        vcResponseFrame = frames.find(function (frame) { return frame.type === QuicVCFrameType.VC_RESPONSE; });
                        if (!vcInitFrame) return [3 /*break*/, 2];
                        // Handle VC_INIT frame (we are acting as server)
                        console.log('[QuicVCConnectionManager] Found VC_INIT frame - handling as server');
                        return [4 /*yield*/, this.handleVCInitFrame(connection, vcInitFrame)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 2:
                        if (!vcResponseFrame) return [3 /*break*/, 4];
                        // Handle VC_RESPONSE frame (we are acting as client, ESP32 responded)
                        console.log('[QuicVCConnectionManager] Found VC_RESPONSE frame - handling as client');
                        return [4 /*yield*/, this.handleVCResponseFrame(connection, vcResponseFrame)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        console.error('[QuicVCConnectionManager] No VC_INIT or VC_RESPONSE frame found in INITIAL packet');
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle VC_INIT frame received from client
     */
    QuicVCConnectionManager.prototype.handleVCInitFrame = function (connection, frame) {
        return __awaiter(this, void 0, void 0, function () {
            var verifiedInfo, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[QuicVCConnectionManager] Processing VC_INIT frame');
                        if (!this.vcManager) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.vcManager.verifyCredential(frame.credential, frame.credential.credentialSubject.id)];
                    case 1:
                        verifiedInfo = _b.sent();
                        if (!(verifiedInfo && verifiedInfo.issuerPersonId === this.ownPersonId)) return [3 /*break*/, 4];
                        connection.remoteVC = verifiedInfo;
                        connection.deviceId = verifiedInfo.subjectDeviceId;
                        // Derive initial keys from credentials
                        _a = connection;
                        return [4 /*yield*/, this.deriveInitialKeys(connection)
                            // Send handshake response
                        ];
                    case 2:
                        // Derive initial keys from credentials
                        _a.initialKeys = _b.sent();
                        // Send handshake response
                        return [4 /*yield*/, this.sendHandshakePacket(connection)];
                    case 3:
                        // Send handshake response
                        _b.sent();
                        connection.state = 'handshake';
                        return [3 /*break*/, 5];
                    case 4:
                        // Invalid credential
                        this.closeConnection(connection, 'Invalid credential');
                        _b.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle VC_RESPONSE frame received from server (ESP32)
     */
    QuicVCConnectionManager.prototype.handleVCResponseFrame = function (connection, frame) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('[QuicVCConnectionManager] Processing VC_RESPONSE frame from ESP32');
                // Extract device ID from the frame if not already set
                if (!connection.deviceId && frame.device_id) {
                    connection.deviceId = frame.device_id;
                }
                // Parse the response to check ownership status
                if (frame.status === 'provisioned' || frame.status === 'already_owned' || frame.status === 'ownership_revoked') {
                    console.log('[QuicVCConnectionManager] ESP32 operation successful:', frame.status);
                    // Update connection state
                    connection.state = 'established';
                    if (frame.owner) {
                        connection.remoteVC = {
                            issuerPersonId: frame.owner,
                            subjectDeviceId: connection.deviceId,
                            subjectPublicKeyHex: '',
                            vc: frame
                        };
                    }
                    // Complete handshake
                    this.completeHandshake(connection);
                    // Emit device update event
                    if (frame.status === 'provisioned' && frame.owner && connection.deviceId) {
                        this.emit('deviceProvisioned', {
                            deviceId: connection.deviceId,
                            ownerId: frame.owner
                        });
                    }
                    console.log('[QuicVCConnectionManager] Keeping connection open for future commands');
                }
                else {
                    console.error('[QuicVCConnectionManager] ESP32 operation failed:', frame.status, frame.message);
                    this.closeConnection(connection, "Ownership failed: ".concat(frame.message || frame.status));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Send HANDSHAKE packet with our credential
     */
    QuicVCConnectionManager.prototype.sendHandshakePacket = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var vcResponseFrame, packet;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!connection.localVC) {
                            throw new Error('No local credential available');
                        }
                        vcResponseFrame = {
                            type: QuicVCFrameType.VC_RESPONSE,
                            credential: connection.localVC,
                            challenge: connection.challenge,
                            ackChallenge: (_c = (_b = (_a = connection.remoteVC) === null || _a === void 0 ? void 0 : _a.vc) === null || _b === void 0 ? void 0 : _b.proof) === null || _c === void 0 ? void 0 : _c.proofValue,
                            timestamp: Date.now()
                        };
                        packet = this.createPacket(QuicVCPacketType.HANDSHAKE, connection, JSON.stringify(vcResponseFrame), QuicVCFrameType.VC_RESPONSE);
                        // Send packet
                        return [4 /*yield*/, this.sendPacket(connection, packet)];
                    case 1:
                        // Send packet
                        _d.sent();
                        debug("Sent HANDSHAKE packet to ".concat(connection.deviceId));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle HANDSHAKE packet
     */
    QuicVCConnectionManager.prototype.handleHandshakePacket = function (connection, data, header) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, frame, verifiedInfo, _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        payload = this.extractPayload(data, header);
                        frame = JSON.parse(new TextDecoder().decode(payload));
                        if (frame.type !== QuicVCFrameType.VC_RESPONSE) {
                            debug('Expected VC_RESPONSE frame in HANDSHAKE packet');
                            return [2 /*return*/];
                        }
                        if (!(!connection.isServer && this.vcManager)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.vcManager.verifyCredential(frame.credential, frame.credential.credentialSubject.id)];
                    case 1:
                        verifiedInfo = _e.sent();
                        if (!(verifiedInfo && verifiedInfo.issuerPersonId === this.ownPersonId)) return [3 /*break*/, 4];
                        connection.remoteVC = verifiedInfo;
                        // Derive all keys
                        _a = connection;
                        return [4 /*yield*/, this.deriveHandshakeKeys(connection)];
                    case 2:
                        // Derive all keys
                        _a.handshakeKeys = _e.sent();
                        _b = connection;
                        return [4 /*yield*/, this.deriveApplicationKeys(connection)
                            // Complete handshake
                        ];
                    case 3:
                        _b.applicationKeys = _e.sent();
                        // Complete handshake
                        connection.state = 'established';
                        this.completeHandshake(connection);
                        return [3 /*break*/, 5];
                    case 4:
                        this.closeConnection(connection, 'Invalid credential in handshake');
                        _e.label = 5;
                    case 5: return [3 /*break*/, 9];
                    case 6:
                        if (!connection.isServer) return [3 /*break*/, 9];
                        // Server completes handshake
                        _c = connection;
                        return [4 /*yield*/, this.deriveHandshakeKeys(connection)];
                    case 7:
                        // Server completes handshake
                        _c.handshakeKeys = _e.sent();
                        _d = connection;
                        return [4 /*yield*/, this.deriveApplicationKeys(connection)];
                    case 8:
                        _d.applicationKeys = _e.sent();
                        connection.state = 'established';
                        this.completeHandshake(connection);
                        _e.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Complete handshake and start heartbeat
     */
    QuicVCConnectionManager.prototype.completeHandshake = function (connection) {
        var _this = this;
        // Clear handshake timeout
        if (connection.handshakeTimeout) {
            clearTimeout(connection.handshakeTimeout);
            connection.handshakeTimeout = null;
        }
        // Start heartbeat
        connection.heartbeatInterval = setInterval(function () {
            _this.sendHeartbeat(connection);
        }, this.HEARTBEAT_INTERVAL);
        // Set idle timeout
        this.resetIdleTimeout(connection);
        // Emit events
        this.emit('handshakeComplete', connection.deviceId);
        if (connection.remoteVC) {
            this.emit('connectionEstablished', connection.deviceId, connection.remoteVC);
        }
        console.log("[QuicVCConnectionManager] QUICVC handshake complete with ".concat(connection.deviceId));
    };
    /**
     * Handle encrypted PROTECTED packets
     */
    QuicVCConnectionManager.prototype.handleProtectedPacket = function (connection, data, header) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, frames, vcResponseFrame, decrypted, decryptedFrames, _i, decryptedFrames_1, frame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = this.extractPayload(data, header);
                        frames = this.parseFrames(payload);
                        vcResponseFrame = frames.find(function (frame) { return frame.type === QuicVCFrameType.VC_RESPONSE; });
                        if (!vcResponseFrame) return [3 /*break*/, 2];
                        console.log('[QuicVCConnectionManager] Found VC_RESPONSE in PROTECTED packet from ESP32');
                        return [4 /*yield*/, this.handleVCResponseFrame(connection, vcResponseFrame)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        // Otherwise, handle as normal encrypted PROTECTED packet
                        if (connection.state !== 'established' || !connection.applicationKeys) {
                            debug('Cannot handle protected packet - connection not established');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.decryptPacket(data, header, connection.applicationKeys)];
                    case 3:
                        decrypted = _a.sent();
                        if (!decrypted) {
                            debug('Failed to decrypt packet');
                            return [2 /*return*/];
                        }
                        decryptedFrames = this.parseFrames(decrypted);
                        for (_i = 0, decryptedFrames_1 = decryptedFrames; _i < decryptedFrames_1.length; _i++) {
                            frame = decryptedFrames_1[_i];
                            switch (frame.type) {
                                case QuicVCFrameType.HEARTBEAT:
                                    this.handleHeartbeatFrame(connection, frame);
                                    break;
                                case QuicVCFrameType.STREAM:
                                    this.handleStreamFrame(connection, frame);
                                    break;
                                case QuicVCFrameType.ACK:
                                    break;
                            }
                        }
                        this.resetIdleTimeout(connection);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send heartbeat over secure channel
     */
    QuicVCConnectionManager.prototype.sendHeartbeat = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var heartbeatFrame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (connection.state !== 'established')
                            return [2 /*return*/];
                        heartbeatFrame = {
                            type: QuicVCFrameType.HEARTBEAT,
                            timestamp: Date.now(),
                            sequence: Number(connection.nextPacketNumber)
                        };
                        return [4 /*yield*/, this.sendProtectedPacket(connection, [heartbeatFrame])];
                    case 1:
                        _a.sent();
                        debug("Sent heartbeat to ".concat(connection.deviceId));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send protected packet with encryption
     */
    QuicVCConnectionManager.prototype.sendProtectedPacket = function (connection, frames) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, packet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!connection.applicationKeys) {
                            throw new Error('No application keys available');
                        }
                        payload = JSON.stringify(frames);
                        return [4 /*yield*/, this.createEncryptedPacket(QuicVCPacketType.PROTECTED, connection, payload, connection.applicationKeys)];
                    case 1:
                        packet = _a.sent();
                        return [4 /*yield*/, this.sendPacket(connection, packet)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Derive initial keys from credentials
     */
    QuicVCConnectionManager.prototype.deriveInitialKeys = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var salt, info, combined, hash, keyMaterial;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                salt = Buffer.from('quicvc-initial-salt-v1');
                info = Buffer.from((((_a = connection.localVC) === null || _a === void 0 ? void 0 : _a.id) || '') + (((_c = (_b = connection.remoteVC) === null || _b === void 0 ? void 0 : _b.vc) === null || _c === void 0 ? void 0 : _c.id) || ''));
                combined = Buffer.concat([salt, info]);
                hash = crypto_1.default.createHash('sha256').update(combined).digest();
                keyMaterial = Buffer.concat([hash, hash, hash]).slice(0, 96);
                return [2 /*return*/, {
                        encryptionKey: keyMaterial.slice(0, 32),
                        decryptionKey: keyMaterial.slice(0, 32),
                        sendIV: keyMaterial.slice(32, 48),
                        receiveIV: keyMaterial.slice(32, 48),
                        sendHMAC: keyMaterial.slice(64, 96),
                        receiveHMAC: keyMaterial.slice(64, 96)
                    }];
            });
        });
    };
    /**
     * Derive handshake keys
     */
    QuicVCConnectionManager.prototype.deriveHandshakeKeys = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var salt, info, combined, hash1, hash2, keyMaterial;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                salt = Buffer.from('quicvc-handshake-salt-v1');
                info = Buffer.from(connection.challenge +
                    (((_b = (_a = connection.localVC) === null || _a === void 0 ? void 0 : _a.proof) === null || _b === void 0 ? void 0 : _b.proofValue) || '') +
                    (((_e = (_d = (_c = connection.remoteVC) === null || _c === void 0 ? void 0 : _c.vc) === null || _d === void 0 ? void 0 : _d.proof) === null || _e === void 0 ? void 0 : _e.proofValue) || ''));
                combined = Buffer.concat([salt, info]);
                hash1 = crypto_1.default.createHash('sha256').update(combined).digest();
                hash2 = crypto_1.default.createHash('sha256').update(hash1).digest();
                keyMaterial = Buffer.concat([hash1, hash2]).slice(0, 192);
                return [2 /*return*/, {
                        encryptionKey: keyMaterial.slice(0, 32),
                        decryptionKey: keyMaterial.slice(32, 64),
                        sendIV: keyMaterial.slice(64, 80),
                        receiveIV: keyMaterial.slice(80, 96),
                        sendHMAC: keyMaterial.slice(96, 128),
                        receiveHMAC: keyMaterial.slice(128, 160)
                    }];
            });
        });
    };
    /**
     * Derive application keys (1-RTT keys)
     */
    QuicVCConnectionManager.prototype.deriveApplicationKeys = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var salt, info, combined, hash1, hash2, keyMaterial;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                salt = Buffer.from('quicvc-application-salt-v1');
                info = Buffer.from((((_b = (_a = connection.localVC) === null || _a === void 0 ? void 0 : _a.credentialSubject) === null || _b === void 0 ? void 0 : _b.publicKeyHex) || '') +
                    (((_c = connection.remoteVC) === null || _c === void 0 ? void 0 : _c.subjectPublicKeyHex) || ''));
                combined = Buffer.concat([salt, info]);
                hash1 = crypto_1.default.createHash('sha256').update(combined).digest();
                hash2 = crypto_1.default.createHash('sha256').update(hash1).digest();
                keyMaterial = Buffer.concat([hash1, hash2]).slice(0, 192);
                return [2 /*return*/, {
                        encryptionKey: keyMaterial.slice(0, 32),
                        decryptionKey: keyMaterial.slice(32, 64),
                        sendIV: keyMaterial.slice(64, 80),
                        receiveIV: keyMaterial.slice(80, 96),
                        sendHMAC: keyMaterial.slice(96, 128),
                        receiveHMAC: keyMaterial.slice(128, 160)
                    }];
            });
        });
    };
    /**
     * Helper methods
     */
    QuicVCConnectionManager.prototype.getConnectionId = function (dcid) {
        return Array.from(dcid).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    };
    QuicVCConnectionManager.prototype.findConnectionByIds = function (dcid, scid) {
        var dcidStr = this.getConnectionId(dcid);
        var connection = this.connections.get(dcidStr);
        if (!connection) {
            var scidStr = this.getConnectionId(scid);
            for (var _i = 0, _a = this.connections; _i < _a.length; _i++) {
                var _b = _a[_i], _ = _b[0], conn = _b[1];
                if (this.getConnectionId(conn.scid) === scidStr || this.getConnectionId(conn.dcid) === scidStr) {
                    connection = conn;
                    break;
                }
            }
        }
        if (connection && !connection.deviceId) {
            var mac = Array.from(scid.slice(0, 6))
                .map(function (b) { return b.toString(16).padStart(2, '0'); })
                .join(':');
            connection.deviceId = "esp32-".concat(mac.replace(/:/g, '').toLowerCase());
        }
        return connection;
    };
    QuicVCConnectionManager.prototype.findConnectionByAddress = function (address, port) {
        for (var _i = 0, _a = this.connections.values(); _i < _a.length; _i++) {
            var conn = _a[_i];
            if (!conn.isServer && conn.address === address && conn.port === port) {
                return conn;
            }
        }
        return undefined;
    };
    QuicVCConnectionManager.prototype.generateChallenge = function () {
        return crypto_1.default.randomBytes(32).toString('hex');
    };
    QuicVCConnectionManager.prototype.createPacket = function (type, connection, payload, frameType) {
        var header = {
            type: type,
            version: this.QUICVC_VERSION,
            dcid: connection.dcid,
            scid: connection.scid,
            packetNumber: connection.nextPacketNumber++
        };
        var headerBytes = this.serializeHeader(header);
        var frameBytes;
        if (type === QuicVCPacketType.INITIAL && frameType !== undefined) {
            var payloadBytes = Buffer.from(payload, 'utf8');
            frameBytes = Buffer.alloc(1 + 2 + payloadBytes.length);
            frameBytes[0] = frameType;
            frameBytes[1] = (payloadBytes.length >> 8) & 0xFF;
            frameBytes[2] = payloadBytes.length & 0xFF;
            payloadBytes.copy(frameBytes, 3);
        }
        else {
            frameBytes = Buffer.from(payload, 'utf8');
        }
        return Buffer.concat([headerBytes, frameBytes]);
    };
    QuicVCConnectionManager.prototype.createProtectedPacket = function (connection, frameData) {
        var header = {
            type: QuicVCPacketType.PROTECTED,
            version: this.QUICVC_VERSION,
            dcid: connection.dcid,
            scid: connection.scid,
            packetNumber: connection.nextPacketNumber++
        };
        var headerBytes = this.serializeHeader(header);
        return Buffer.concat([headerBytes, frameData]);
    };
    QuicVCConnectionManager.prototype.createEncryptedPacket = function (type, connection, payload, keys, frameType) {
        return __awaiter(this, void 0, void 0, function () {
            var packet;
            return __generator(this, function (_a) {
                packet = this.createPacket(type, connection, payload, frameType);
                // TODO: Implement proper AEAD encryption
                return [2 /*return*/, packet];
            });
        });
    };
    QuicVCConnectionManager.prototype.serializeHeader = function (header) {
        var buffer = Buffer.alloc(1 + 4 + 1 + header.dcid.length + 1 + header.scid.length + 1);
        var offset = 0;
        var flags = 0x80 | (header.type & 0x03);
        buffer.writeUInt8(flags, offset++);
        buffer.writeUInt32BE(header.version, offset);
        offset += 4;
        buffer.writeUInt8(header.dcid.length, offset);
        offset++;
        header.dcid.copy(buffer, offset);
        offset += header.dcid.length;
        buffer.writeUInt8(header.scid.length, offset);
        offset++;
        header.scid.copy(buffer, offset);
        offset += header.scid.length;
        buffer.writeUInt8(Number(header.packetNumber & 0xffn), offset);
        return buffer;
    };
    QuicVCConnectionManager.prototype.parsePacketHeader = function (data) {
        if (data.length < 8)
            return null;
        var offset = 0;
        var flags = data[offset++];
        var longHeader = (flags & 0x80) !== 0;
        var type = (flags & 0x03);
        if (!longHeader)
            return null;
        var version = new DataView(data.buffer, data.byteOffset + offset).getUint32(offset, false);
        offset += 4;
        var dcidLen = data[offset++];
        if (data.length < offset + dcidLen + 2)
            return null;
        var dcid = data.slice(offset, offset + dcidLen);
        offset += dcidLen;
        var scidLen = data[offset++];
        if (data.length < offset + scidLen + 1)
            return null;
        var scid = data.slice(offset, offset + scidLen);
        offset += scidLen;
        var packetNumber = BigInt(data[offset]);
        return { type: type, version: version, dcid: dcid, scid: scid, packetNumber: packetNumber };
    };
    QuicVCConnectionManager.prototype.extractPayload = function (data, header) {
        var headerSize = 1 + 4 + 1 + header.dcid.length + 1 + header.scid.length + 1;
        return data.slice(headerSize);
    };
    QuicVCConnectionManager.prototype.decryptPacket = function (data, header, keys) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implement proper AEAD decryption
                return [2 /*return*/, this.extractPayload(data, header)];
            });
        });
    };
    QuicVCConnectionManager.prototype.parseFrames = function (data) {
        var frames = [];
        var offset = 0;
        try {
            while (offset < data.length) {
                if (offset + 3 > data.length)
                    break;
                var frameType = data[offset];
                var length_1 = (data[offset + 1] << 8) | data[offset + 2];
                offset += 3;
                if (offset + length_1 > data.length)
                    break;
                var framePayload = data.slice(offset, offset + length_1);
                offset += length_1;
                var frame = { type: frameType, payload: framePayload };
                if (frameType === QuicVCFrameType.VC_INIT || frameType === QuicVCFrameType.VC_RESPONSE) {
                    try {
                        var jsonData = JSON.parse(framePayload.toString());
                        frame = __assign(__assign(__assign({}, frame), jsonData), { type: frameType });
                    }
                    catch (e) {
                        console.warn('[QuicVCConnectionManager] Frame payload is not JSON:', e.message);
                    }
                }
                else if (frameType === QuicVCFrameType.STREAM) {
                    if (framePayload.length > 0) {
                        var streamId = framePayload[0];
                        var streamData = framePayload.slice(1);
                        try {
                            var jsonData = JSON.parse(streamData.toString());
                            frame = { type: frameType, streamId: streamId, data: jsonData };
                        }
                        catch (e) {
                            frame = { type: frameType, streamId: streamId, data: streamData };
                        }
                    }
                }
                else if (frameType === QuicVCFrameType.HEARTBEAT) {
                    try {
                        var jsonData = JSON.parse(framePayload.toString());
                        frame = __assign(__assign(__assign({}, frame), jsonData), { type: frameType });
                    }
                    catch (e) {
                        console.warn('[QuicVCConnectionManager] Heartbeat payload is not JSON:', e.message);
                    }
                }
                frames.push(frame);
            }
        }
        catch (error) {
            console.error('[QuicVCConnectionManager] Error parsing frames:', error);
        }
        return frames;
    };
    QuicVCConnectionManager.prototype.handleHeartbeatFrame = function (connection, frame) {
        debug("Received heartbeat from ".concat(connection.deviceId));
    };
    QuicVCConnectionManager.prototype.handleStreamFrame = function (connection, frame) {
        var _a;
        var streamId = frame.streamId;
        if (streamId === 0x01 && frame.data && typeof frame.data === 'object') {
            if (frame.data.type === 'led_response' && frame.data.requestId) {
                if (!connection.deviceId && frame.data.device_id) {
                    connection.deviceId = frame.data.device_id;
                }
                else if (!connection.deviceId) {
                    var mac = Array.from(connection.scid.slice(0, 6))
                        .map(function (b) { return b.toString(16).padStart(2, '0'); })
                        .join(':');
                    connection.deviceId = "esp32-".concat(mac.replace(/:/g, '').toLowerCase());
                }
                if (connection.deviceId) {
                    this.emit('ledResponse', connection.deviceId, frame.data);
                }
                return;
            }
        }
        var handler = (_a = connection.serviceHandlers) === null || _a === void 0 ? void 0 : _a.get(streamId);
        if (handler) {
            var data = typeof frame.data === 'string'
                ? Buffer.from(frame.data)
                : frame.data;
            handler(data, connection.deviceId);
        }
    };
    QuicVCConnectionManager.prototype.sendPacket = function (connection, packet) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.quicModel) {
                            throw new Error('QUIC transport not initialized');
                        }
                        return [4 /*yield*/, this.quicModel.send(packet, connection.address, connection.port)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    QuicVCConnectionManager.prototype.resetIdleTimeout = function (connection) {
        var _this = this;
        if (connection.idleTimeout) {
            clearTimeout(connection.idleTimeout);
        }
        connection.idleTimeout = setTimeout(function () {
            _this.closeConnection(connection, 'Idle timeout');
        }, this.IDLE_TIMEOUT);
    };
    QuicVCConnectionManager.prototype.handleHandshakeTimeout = function (connId) {
        var connection = this.connections.get(connId);
        if (connection && connection.state !== 'established') {
            this.closeConnection(connection, 'Handshake timeout');
        }
    };
    QuicVCConnectionManager.prototype.closeConnection = function (connection, reason) {
        var connId = this.getConnectionId(connection.dcid);
        console.log("[QuicVCConnectionManager] \u274C CLOSING CONNECTION ".concat(connId, " for device ").concat(connection.deviceId, " - Reason: ").concat(reason));
        if (connection.handshakeTimeout)
            clearTimeout(connection.handshakeTimeout);
        if (connection.heartbeatInterval)
            clearInterval(connection.heartbeatInterval);
        if (connection.idleTimeout)
            clearTimeout(connection.idleTimeout);
        this.connections.delete(connId);
        if (connection.deviceId) {
            this.emit('connectionClosed', connection.deviceId, reason);
        }
    };
    /**
     * Public API
     */
    QuicVCConnectionManager.prototype.isConnected = function (deviceId) {
        for (var _i = 0, _a = this.connections.values(); _i < _a.length; _i++) {
            var conn = _a[_i];
            if (conn.deviceId === deviceId && conn.state === 'established') {
                return true;
            }
        }
        return false;
    };
    QuicVCConnectionManager.prototype.sendData = function (deviceId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, streamFrame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connection = Array.from(this.connections.values())
                            .find(function (c) { return c.deviceId === deviceId && c.state === 'established'; });
                        if (!connection) {
                            throw new Error("No established connection to ".concat(deviceId));
                        }
                        streamFrame = {
                            type: QuicVCFrameType.STREAM,
                            streamId: 0,
                            offset: 0,
                            data: Array.from(data)
                        };
                        return [4 /*yield*/, this.sendProtectedPacket(connection, [streamFrame])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    QuicVCConnectionManager.prototype.disconnect = function (deviceId) {
        var connection = Array.from(this.connections.values())
            .find(function (c) { return c.deviceId === deviceId; });
        if (connection) {
            this.closeConnection(connection, 'User requested');
        }
    };
    QuicVCConnectionManager.instance = null;
    return QuicVCConnectionManager;
}(events_1.EventEmitter));
exports.QuicVCConnectionManager = QuicVCConnectionManager;
