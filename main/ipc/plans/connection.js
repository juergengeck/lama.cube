/**
 * Connection IPC Plans (Thin Adapter)
 *
 * Maps Electron IPC calls to ConnectionHandler methods.
 * Business logic lives in @chat/core/plans/ConnectionHandler.ts
 * Platform-specific operations (fs, storage, events) handled here.
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
var promises_1 = require("fs/promises");
var path_1 = require("path");
var os_1 = require("os");
var child_process_1 = require("child_process");
var ConnectionHandler_js_1 = require("@chat/core/plans/ConnectionHandler.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
// Singleton handler instance
var connectionHandler = null;
// Get web URL from global config
function getWebUrl() {
    var _a, _b;
    return (_b = (_a = global.lamaConfig) === null || _a === void 0 ? void 0 : _a.web) === null || _b === void 0 ? void 0 : _b.url;
}
/**
 * Platform-specific storage provider for Electron
 */
var storageProvider = {
    /**
     * Get Node.js storage info using fs operations
     */
    getNodeStorage: function () {
        return __awaiter(this, void 0, void 0, function () {
            var dataPath, totalSize, availableSpace, dfOutput, lines, parts, availableBlocks, drive, wmicOutput, freeMatch, files, _i, files_1, file, filePath, stat, e_1, e_2, totalCapacity, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 11, , 12]);
                        dataPath = ((_a = global.lamaConfig) === null || _a === void 0 ? void 0 : _a.instance.directory) || path_1.default.join(process.cwd(), 'OneDB');
                        totalSize = 0;
                        availableSpace = 0;
                        // Get actual filesystem stats
                        try {
                            if (process.platform === 'darwin' || process.platform === 'linux') {
                                dfOutput = (0, child_process_1.execSync)("df -k \"".concat(process.cwd(), "\"")).toString();
                                lines = dfOutput.trim().split('\n');
                                if (lines.length > 1) {
                                    parts = lines[1].split(/\s+/);
                                    availableBlocks = parseInt(parts[3]) * 1024;
                                    availableSpace = availableBlocks;
                                }
                            }
                            else if (process.platform === 'win32') {
                                drive = path_1.default.parse(process.cwd()).root;
                                wmicOutput = (0, child_process_1.execSync)("wmic logicaldisk where caption=\"".concat(drive.replace(/\\/g, ''), "\" get size,freespace /value")).toString();
                                freeMatch = wmicOutput.match(/FreeSpace=(\d+)/);
                                if (freeMatch) {
                                    availableSpace = parseInt(freeMatch[1]);
                                }
                            }
                        }
                        catch (e) {
                            console.error('[Connection] Failed to get disk stats:', e);
                            availableSpace = os_1.default.freemem();
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, , 10]);
                        return [4 /*yield*/, promises_1.default.readdir(dataPath, { recursive: true })];
                    case 2:
                        files = _b.sent();
                        _i = 0, files_1 = files;
                        _b.label = 3;
                    case 3:
                        if (!(_i < files_1.length)) return [3 /*break*/, 8];
                        file = files_1[_i];
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        filePath = path_1.default.join(dataPath, file);
                        return [4 /*yield*/, promises_1.default.stat(filePath)];
                    case 5:
                        stat = _b.sent();
                        if (stat.isFile()) {
                            totalSize += stat.size;
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        e_1 = _b.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        e_2 = _b.sent();
                        totalSize = 0;
                        return [3 /*break*/, 10];
                    case 10:
                        totalCapacity = totalSize + availableSpace;
                        return [2 /*return*/, {
                                used: totalSize,
                                total: totalCapacity,
                                percentage: totalCapacity > 0 ? Math.round((totalSize / totalCapacity) * 100) : 0
                            }];
                    case 11:
                        error_1 = _b.sent();
                        console.error('[Connection] Failed to get storage info:', error_1);
                        return [2 /*return*/, {
                                used: 0,
                                total: 0,
                                percentage: 0
                            }];
                    case 12: return [2 /*return*/];
                }
            });
        });
    }
};
/**
 * Get handler instance (creates on first use)
 */
function getHandler() {
    if (!connectionHandler) {
        var webUrl = getWebUrl();
        connectionHandler = new ConnectionHandler_js_1.ConnectionHandler(node_one_core_js_1.default, storageProvider, webUrl);
    }
    return connectionHandler;
}
/**
 * Get current instances and their states
 * Delegates to one.models ConnectionsModel
 */
function getInstances(event) {
    return __awaiter(this, void 0, void 0, function () {
        var handler, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    handler = getHandler();
                    return [4 /*yield*/, handler.getInstances({})];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.instances];
            }
        });
    });
}
/**
 * Create a pairing invitation
 * Delegates to one.models ConnectionsModel.pairing
 * Supports both IoM (device) and IoP (partner) modes
 */
function createPairingInvitation(event, mode) {
    return __awaiter(this, void 0, void 0, function () {
        var handler, webUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    handler = getHandler();
                    webUrl = getWebUrl();
                    return [4 /*yield*/, handler.createPairingInvitation({ mode: mode, webUrl: webUrl })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Accept a pairing invitation
 * Delegates to one.models ConnectionsModel.pairing
 */
function acceptPairingInvitation(event, invitationUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var handler;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    handler = getHandler();
                    return [4 /*yield*/, handler.acceptPairingInvitation({ invitationUrl: invitationUrl })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Get connection status
 * Delegates to one.models ConnectionsModel
 */
function getConnectionStatus(event) {
    return __awaiter(this, void 0, void 0, function () {
        var handler;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    handler = getHandler();
                    return [4 /*yield*/, handler.getConnectionStatus({})];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Get data statistics (storage, objects, etc.)
 * TODO: Implement proper stats calculation
 */
function getDataStats(event) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                return [2 /*return*/, {
                        success: true,
                        data: {
                            totalObjects: 0,
                            messages: 0,
                            files: 0,
                            contacts: 0,
                            conversations: 0
                        }
                    }];
            }
            catch (error) {
                return [2 /*return*/, {
                        success: false,
                        error: error.message
                    }];
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Subscribe to ONE.core events for real-time updates
 * Uses one.models event emitters instead of custom tracking
 */
function subscribeToEvents(callback) {
    if (!node_one_core_js_1.default.connectionsModel) {
        console.warn('[Connection] ConnectionsModel not available for event subscription');
        return;
    }
    // Use one.models events directly
    // @ts-expect-error - ConnectionsModel extends EventEmitter but types are incomplete
    node_one_core_js_1.default.connectionsModel.on('connection:open', function (data) {
        callback({
            type: 'connection:open',
            data: data
        });
    });
    // @ts-expect-error - ConnectionsModel extends EventEmitter but types are incomplete
    node_one_core_js_1.default.connectionsModel.on('connection:closed', function (data) {
        callback({
            type: 'connection:closed',
            data: data
        });
    });
    // @ts-expect-error - ConnectionsModel extends EventEmitter but types are incomplete
    node_one_core_js_1.default.connectionsModel.on('connection:error', function (data) {
        callback({
            type: 'connection:error',
            data: data
        });
    });
    // ChannelManager sync events
    if (node_one_core_js_1.default.channelManager) {
        // @ts-expect-error - ChannelManager extends EventEmitter but types are incomplete
        node_one_core_js_1.default.channelManager.on('sync:progress', function (data) {
            callback({
                type: 'sync:progress',
                data: data
            });
        });
        // @ts-expect-error - ChannelManager extends EventEmitter but types are incomplete
        node_one_core_js_1.default.channelManager.on('sync:completed', function (data) {
            callback({
                type: 'sync:completed',
                data: data
            });
        });
    }
    console.log('[Connection] Subscribed to ONE.core events');
}
export const default = {
    getInstances: getInstances,
    createPairingInvitation: createPairingInvitation,
    acceptPairingInvitation: acceptPairingInvitation,
    getConnectionStatus: getConnectionStatus,
    getDataStats: getDataStats,
    subscribeToEvents: subscribeToEvents
};
