/**
 * QuicVC Discovery IPC Plans
 *
 * Provides IPC interface for QuicVC device discovery in the UI
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
export { initializeQuicVCDiscoveryPlans };
export { autoInitializeDiscovery };
var electron_1 = require("electron");
var ipcMain = electron_1.default.ipcMain;
var connection_core_1 = require("@lama/connection.core");
var quicvc_discovery_js_1 = require("../../core/quicvc-discovery.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
// Singleton discovery service instance
var discoveryService = null;
var quicvcDiscovery = null;
/**
 * Initialize QuicVC discovery service
 */
function initializeDiscoveryService() {
    return __awaiter(this, void 0, void 0, function () {
        var ownDeviceId, ownDeviceName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (discoveryService) {
                        return [2 /*return*/]; // Already initialized
                    }
                    ownDeviceId = node_one_core_js_1.default.ownerId || 'unknown';
                    ownDeviceName = node_one_core_js_1.default.instanceName || 'lama-electron';
                    console.log('[QuicVCDiscovery] Initializing with device ID:', ownDeviceId, 'name:', ownDeviceName);
                    // Create QuicVC discovery provider
                    quicvcDiscovery = new quicvc_discovery_js_1.QuicVCDiscovery(ownDeviceId, ownDeviceName);
                    // Create discovery service
                    discoveryService = new connection_core_1.DiscoveryService();
                    // Initialize with QuicVC local discovery
                    return [4 /*yield*/, discoveryService.initialize({
                            localDiscovery: quicvcDiscovery,
                        })];
                case 1:
                    // Initialize with QuicVC local discovery
                    _a.sent();
                    // Start continuous discovery
                    discoveryService.start({
                        methods: ['local'],
                        timeout: 2000,
                    });
                    // Setup event listeners
                    discoveryService.on('peerDiscovered', function (peer) {
                        console.log('[QuicVCDiscovery] Peer discovered:', peer.name, 'at', peer.address);
                        // Broadcast to all renderer windows
                        var allWindows = electron_1.default.BrowserWindow.getAllWindows();
                        allWindows.forEach(function (win) {
                            win.webContents.send('quicvc:peerDiscovered', peer);
                        });
                    });
                    discoveryService.on('peerLost', function (peer) {
                        console.log('[QuicVCDiscovery] Peer lost:', peer.id);
                        // Broadcast to all renderer windows
                        var allWindows = electron_1.default.BrowserWindow.getAllWindows();
                        allWindows.forEach(function (win) {
                            win.webContents.send('quicvc:peerLost', peer);
                        });
                    });
                    console.log('[QuicVCDiscovery] Service initialized and started');
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Initialize QuicVC discovery IPC plans
 */
function initializeQuicVCDiscoveryPlans() {
    var _this = this;
    /**
     * Start QuicVC discovery
     */
    ipcMain.handle('quicvc:startDiscovery', function (event) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('[QuicVCDiscovery] Starting discovery via IPC');
                    if (!!discoveryService) return [3 /*break*/, 2];
                    return [4 /*yield*/, initializeDiscoveryService()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, {
                        success: true,
                    }];
                case 3:
                    error_1 = _a.sent();
                    console.error('[QuicVCDiscovery] Failed to start discovery:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message,
                        }];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    /**
     * Stop QuicVC discovery
     */
    ipcMain.handle('quicvc:stopDiscovery', function (event) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                console.log('[QuicVCDiscovery] Stopping discovery via IPC');
                if (discoveryService) {
                    discoveryService.stop();
                }
                return [2 /*return*/, {
                        success: true,
                    }];
            }
            catch (error) {
                console.error('[QuicVCDiscovery] Failed to stop discovery:', error);
                return [2 /*return*/, {
                        success: false,
                        error: error.message,
                    }];
            }
            return [2 /*return*/];
        });
    }); });
    /**
     * Get discovered QuicVC devices
     */
    ipcMain.handle('quicvc:getDiscoveredDevices', function (event) { return __awaiter(_this, void 0, void 0, function () {
        var peers, devices, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!!discoveryService) return [3 /*break*/, 2];
                    return [4 /*yield*/, initializeDiscoveryService()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    peers = discoveryService.getDiscoveredPeers();
                    devices = peers.map(function (peer) { return ({
                        id: peer.id,
                        name: peer.name,
                        type: 'quicvc',
                        status: 'discovered',
                        address: peer.address,
                        capabilities: peer.capabilities,
                        discoveredAt: new Date(peer.discoveredAt).toISOString(),
                        lastSeen: new Date(peer.lastSeenAt).toISOString(),
                        credentialStatus: peer.credentialStatus,
                    }); });
                    console.log('[QuicVCDiscovery] Returning', devices.length, 'discovered devices');
                    return [2 /*return*/, {
                            success: true,
                            devices: devices,
                        }];
                case 3:
                    error_2 = _a.sent();
                    console.error('[QuicVCDiscovery] Failed to get discovered devices:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2.message,
                            devices: [],
                        }];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    /**
     * Perform one-time discovery scan
     */
    ipcMain.handle('quicvc:scan', function (event, timeout) { return __awaiter(_this, void 0, void 0, function () {
        var peers, devices, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    console.log('[QuicVCDiscovery] Performing discovery scan');
                    if (!!discoveryService) return [3 /*break*/, 2];
                    return [4 /*yield*/, initializeDiscoveryService()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [4 /*yield*/, discoveryService.scan({
                        methods: ['local'],
                        timeout: timeout || 2000,
                    })];
                case 3:
                    peers = _a.sent();
                    devices = peers.map(function (peer) { return ({
                        id: peer.id,
                        name: peer.name,
                        type: 'quicvc',
                        status: 'discovered',
                        address: peer.address,
                        capabilities: peer.capabilities,
                        discoveredAt: new Date(peer.discoveredAt).toISOString(),
                        lastSeen: new Date(peer.lastSeenAt).toISOString(),
                    }); });
                    console.log('[QuicVCDiscovery] Scan complete, found', devices.length, 'devices');
                    return [2 /*return*/, {
                            success: true,
                            devices: devices,
                        }];
                case 4:
                    error_3 = _a.sent();
                    console.error('[QuicVCDiscovery] Scan failed:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            error: error_3.message,
                            devices: [],
                        }];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    console.log('[QuicVCDiscovery] IPC plans registered');
}
/**
 * Auto-initialize discovery when Node.js ONE.core is ready
 */
function autoInitializeDiscovery() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!node_one_core_js_1.default.initialized) return [3 /*break*/, 2];
                    console.log('[QuicVCDiscovery] Waiting for nodeOneCore to initialize...');
                    return [4 /*yield*/, new Promise(function (resolve) {
                            var checkInterval = setInterval(function () {
                                if (node_one_core_js_1.default.initialized) {
                                    clearInterval(checkInterval);
                                    resolve();
                                }
                            }, 100);
                        })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: 
                // Initialize discovery service automatically
                return [4 /*yield*/, initializeDiscoveryService()];
                case 3:
                    // Initialize discovery service automatically
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
