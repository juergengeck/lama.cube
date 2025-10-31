"use strict";
/**
 * MCP Manager for Main Process
 * Manages Model Context Protocol servers in Node.js environment
 * Provides IPC bridge for renderer process to access MCP tools
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
var path_1 = require("path");
var url_1 = require("url");
var os_1 = require("os");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var MCPManager = /** @class */ (function () {
    function MCPManager() {
        this.clients = new Map();
        this.tools = new Map();
        this.servers = [];
        this.isInitialized = false;
        this.memoryTools = null;
        this.nodeOneCore = null;
    }
    /**
     * Get default server configurations
     * These are created on first run if no servers exist in the database
     */
    MCPManager.prototype.getDefaultServerConfigurations = function () {
        var projectRoot = path_1.default.resolve(__dirname, '../..');
        var homeDir = os_1.default.homedir();
        return [
            {
                name: 'filesystem',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', projectRoot],
                description: 'File system operations for the project directory',
                enabled: true
            },
            {
                name: 'filesystem-home',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', homeDir],
                description: 'File system operations for home directory',
                enabled: true
            }
            // Shell server not yet available in npm registry
            // {
            //   name: 'shell',
            //   command: 'npx',
            //   args: ['-y', '@modelcontextprotocol/server-shell'],
            //   description: 'Shell command execution',
            //   enabled: true
            // }
        ];
    };
    /**
     * Load server configurations from ONE.core database
     */
    MCPManager.prototype.loadServersFromDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var getIdObject, calculateIdHashOfObj, userEmail, configIdHash, config, e_1, servers, _i, _a, serverIdHash, server, e_2, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.nodeOneCore) {
                            console.warn('[MCPManager] NodeOneCore not available, cannot load servers from database');
                            return [2 /*return*/, []];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 15, , 16]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        getIdObject = (_b.sent()).getIdObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 3:
                        calculateIdHashOfObj = (_b.sent()).calculateIdHashOfObj;
                        userEmail = this.nodeOneCore.ownerId;
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'MCPServerConfig',
                                userEmail: userEmail,
                                servers: [],
                                updatedAt: 0
                            })];
                    case 4:
                        configIdHash = _b.sent();
                        config = void 0;
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, getIdObject(configIdHash)];
                    case 6:
                        config = _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_1 = _b.sent();
                        // Config doesn't exist yet - first run
                        console.log('[MCPManager] No MCP configuration found in database');
                        return [2 /*return*/, []];
                    case 8:
                        if (!config || !config.servers || config.servers.length === 0) {
                            console.log('[MCPManager] MCP configuration exists but has no servers');
                            return [2 /*return*/, []];
                        }
                        servers = [];
                        _i = 0, _a = config.servers;
                        _b.label = 9;
                    case 9:
                        if (!(_i < _a.length)) return [3 /*break*/, 14];
                        serverIdHash = _a[_i];
                        _b.label = 10;
                    case 10:
                        _b.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, getIdObject(serverIdHash)];
                    case 11:
                        server = _b.sent();
                        if (server && server.enabled) {
                            servers.push({
                                name: server.name,
                                command: server.command,
                                args: server.args,
                                description: server.description,
                                enabled: server.enabled
                            });
                        }
                        return [3 /*break*/, 13];
                    case 12:
                        e_2 = _b.sent();
                        console.warn("[MCPManager] Failed to load server ".concat(String(serverIdHash).substring(0, 8), ":"), e_2.message);
                        return [3 /*break*/, 13];
                    case 13:
                        _i++;
                        return [3 /*break*/, 9];
                    case 14:
                        console.log("[MCPManager] Loaded ".concat(servers.length, " servers from database"));
                        return [2 /*return*/, servers];
                    case 15:
                        error_1 = _b.sent();
                        console.error('[MCPManager] Failed to load servers from database:', error_1);
                        return [2 /*return*/, []];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ensure default servers exist in database
     * Creates them if they don't exist
     */
    MCPManager.prototype.ensureDefaultServers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject, calculateIdHashOfObj, userEmail, configIdHash, getIdObject, config, isNewConfig, e_3, defaultConfigs, serverIdHashes, _i, defaultConfigs_1, serverConfig, server, result, newConfig, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.nodeOneCore) {
                            console.warn('[MCPManager] NodeOneCore not available, cannot ensure default servers');
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 17, , 18]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 3:
                        calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                        userEmail = this.nodeOneCore.ownerId;
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'MCPServerConfig',
                                userEmail: userEmail,
                                servers: [],
                                updatedAt: 0
                            })];
                    case 4:
                        configIdHash = _a.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 5:
                        getIdObject = (_a.sent()).getIdObject;
                        config = void 0;
                        isNewConfig = false;
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, getIdObject(configIdHash)];
                    case 7:
                        config = _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_3 = _a.sent();
                        // Config doesn't exist - create it
                        isNewConfig = true;
                        return [3 /*break*/, 9];
                    case 9:
                        if (!(isNewConfig || !config || !config.servers || config.servers.length === 0)) return [3 /*break*/, 15];
                        console.log('[MCPManager] Creating default MCP server configurations...');
                        defaultConfigs = this.getDefaultServerConfigurations();
                        serverIdHashes = [];
                        _i = 0, defaultConfigs_1 = defaultConfigs;
                        _a.label = 10;
                    case 10:
                        if (!(_i < defaultConfigs_1.length)) return [3 /*break*/, 13];
                        serverConfig = defaultConfigs_1[_i];
                        server = {
                            $type$: 'MCPServer',
                            name: serverConfig.name,
                            command: serverConfig.command,
                            args: serverConfig.args,
                            description: serverConfig.description,
                            enabled: serverConfig.enabled,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        };
                        return [4 /*yield*/, storeVersionedObject(server)];
                    case 11:
                        result = _a.sent();
                        serverIdHashes.push(result.idHash);
                        console.log("[MCPManager] Created server: ".concat(serverConfig.name));
                        _a.label = 12;
                    case 12:
                        _i++;
                        return [3 /*break*/, 10];
                    case 13:
                        newConfig = {
                            $type$: 'MCPServerConfig',
                            userEmail: userEmail,
                            servers: serverIdHashes,
                            updatedAt: Date.now()
                        };
                        return [4 /*yield*/, storeVersionedObject(newConfig)];
                    case 14:
                        _a.sent();
                        console.log('[MCPManager] ✅ Default MCP servers created and saved to database');
                        return [3 /*break*/, 16];
                    case 15:
                        console.log('[MCPManager] MCP servers already configured in database');
                        _a.label = 16;
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        error_2 = _a.sent();
                        console.error('[MCPManager] Failed to ensure default servers:', error_2);
                        throw error_2;
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add a new MCP server and persist it to database
     */
    MCPManager.prototype.addServer = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject, calculateIdHashOfObj, getIdObject, userEmail, server, serverResult, configIdHash, existingConfig, e_4, updatedConfig, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.nodeOneCore) {
                            throw new Error('NodeOneCore not available');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 13, , 14]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 3:
                        calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 4:
                        getIdObject = (_a.sent()).getIdObject;
                        userEmail = this.nodeOneCore.ownerId;
                        server = {
                            $type$: 'MCPServer',
                            name: config.name,
                            command: config.command,
                            args: config.args,
                            description: config.description || '',
                            enabled: config.enabled !== false,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        };
                        return [4 /*yield*/, storeVersionedObject(server)];
                    case 5:
                        serverResult = _a.sent();
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'MCPServerConfig',
                                userEmail: userEmail,
                                servers: [],
                                updatedAt: 0
                            })];
                    case 6:
                        configIdHash = _a.sent();
                        existingConfig = void 0;
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, getIdObject(configIdHash)];
                    case 8:
                        existingConfig = _a.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_4 = _a.sent();
                        // Config doesn't exist yet
                        existingConfig = null;
                        return [3 /*break*/, 10];
                    case 10:
                        updatedConfig = {
                            $type$: 'MCPServerConfig',
                            userEmail: userEmail,
                            servers: existingConfig ? __spreadArray(__spreadArray([], existingConfig.servers, true), [serverResult.idHash], false) : [serverResult.idHash],
                            updatedAt: Date.now()
                        };
                        return [4 /*yield*/, storeVersionedObject(updatedConfig)];
                    case 11:
                        _a.sent();
                        // Connect to the new server
                        return [4 /*yield*/, this.connectToServer(config)];
                    case 12:
                        // Connect to the new server
                        _a.sent();
                        console.log("[MCPManager] \u2705 Added and connected to server: ".concat(config.name));
                        return [3 /*break*/, 14];
                    case 13:
                        error_3 = _a.sent();
                        console.error("[MCPManager] Failed to add server ".concat(config.name, ":"), error_3);
                        throw error_3;
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List all MCP servers from database
     */
    MCPManager.prototype.listServers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var servers, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.nodeOneCore) {
                            throw new Error('NodeOneCore not available');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.loadServersFromDatabase()];
                    case 2:
                        servers = _a.sent();
                        return [2 /*return*/, servers];
                    case 3:
                        error_4 = _a.sent();
                        console.error('[MCPManager] Failed to list servers:', error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update an existing MCP server in database
     */
    MCPManager.prototype.updateServer = function (name, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject, calculateIdHashOfObj, getIdObject, serverIdHash, existingServer, e_5, updatedServer, client, toolsToRemove, _i, toolsToRemove_1, key, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.nodeOneCore) {
                            throw new Error('NodeOneCore not available');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 15, , 16]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 3:
                        calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 4:
                        getIdObject = (_a.sent()).getIdObject;
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'MCPServer',
                                name: name,
                                command: '',
                                args: [],
                                description: '',
                                enabled: false,
                                createdAt: 0,
                                updatedAt: 0
                            })];
                    case 5:
                        serverIdHash = _a.sent();
                        existingServer = void 0;
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, getIdObject(serverIdHash)];
                    case 7:
                        existingServer = _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_5 = _a.sent();
                        throw new Error("Server ".concat(name, " not found"));
                    case 9:
                        updatedServer = {
                            $type$: 'MCPServer',
                            name: existingServer.name, // Name cannot be changed (it's the ID)
                            command: updates.command !== undefined ? updates.command : existingServer.command,
                            args: updates.args !== undefined ? updates.args : existingServer.args,
                            description: updates.description !== undefined ? updates.description : existingServer.description,
                            enabled: updates.enabled !== undefined ? updates.enabled : existingServer.enabled,
                            createdAt: existingServer.createdAt,
                            updatedAt: Date.now()
                        };
                        return [4 /*yield*/, storeVersionedObject(updatedServer)];
                    case 10:
                        _a.sent();
                        if (!(updates.enabled !== undefined && updates.enabled !== existingServer.enabled)) return [3 /*break*/, 14];
                        if (!updates.enabled) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.connectToServer(updatedServer)];
                    case 11:
                        _a.sent();
                        return [3 /*break*/, 14];
                    case 12:
                        client = this.clients.get(name);
                        if (!client) return [3 /*break*/, 14];
                        return [4 /*yield*/, client.client.close()];
                    case 13:
                        _a.sent();
                        this.clients.delete(name);
                        toolsToRemove = Array.from(this.tools.entries())
                            .filter(function (_a) {
                            var _ = _a[0], tool = _a[1];
                            return tool.server === name;
                        })
                            .map(function (_a) {
                            var key = _a[0];
                            return key;
                        });
                        for (_i = 0, toolsToRemove_1 = toolsToRemove; _i < toolsToRemove_1.length; _i++) {
                            key = toolsToRemove_1[_i];
                            this.tools.delete(key);
                        }
                        _a.label = 14;
                    case 14:
                        console.log("[MCPManager] \u2705 Updated server: ".concat(name));
                        return [3 /*break*/, 16];
                    case 15:
                        error_5 = _a.sent();
                        console.error("[MCPManager] Failed to update server ".concat(name, ":"), error_5);
                        throw error_5;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remove an MCP server from database and disconnect
     */
    MCPManager.prototype.removeServer = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject, calculateIdHashOfObj, getIdObject, userEmail, configIdHash, config, serverIdHash_1, updatedServers, updatedConfig, client, toolsToRemove, _i, toolsToRemove_2, key, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.nodeOneCore) {
                            throw new Error('NodeOneCore not available');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 11, , 12]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 3:
                        calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 4:
                        getIdObject = (_a.sent()).getIdObject;
                        userEmail = this.nodeOneCore.ownerId;
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'MCPServerConfig',
                                userEmail: userEmail,
                                servers: [],
                                updatedAt: 0
                            })];
                    case 5:
                        configIdHash = _a.sent();
                        return [4 /*yield*/, getIdObject(configIdHash)];
                    case 6:
                        config = _a.sent();
                        if (!config || !config.servers) {
                            throw new Error('No MCP configuration found');
                        }
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'MCPServer',
                                name: name,
                                command: '',
                                args: [],
                                description: '',
                                enabled: false,
                                createdAt: 0,
                                updatedAt: 0
                            })];
                    case 7:
                        serverIdHash_1 = _a.sent();
                        updatedServers = config.servers.filter(function (hash) { return hash !== serverIdHash_1; });
                        if (updatedServers.length === config.servers.length) {
                            throw new Error("Server ".concat(name, " not found in configuration"));
                        }
                        updatedConfig = {
                            $type$: 'MCPServerConfig',
                            userEmail: userEmail,
                            servers: updatedServers,
                            updatedAt: Date.now()
                        };
                        return [4 /*yield*/, storeVersionedObject(updatedConfig)];
                    case 8:
                        _a.sent();
                        client = this.clients.get(name);
                        if (!client) return [3 /*break*/, 10];
                        return [4 /*yield*/, client.client.close()];
                    case 9:
                        _a.sent();
                        this.clients.delete(name);
                        toolsToRemove = Array.from(this.tools.entries())
                            .filter(function (_a) {
                            var _ = _a[0], tool = _a[1];
                            return tool.server === name;
                        })
                            .map(function (_a) {
                            var key = _a[0];
                            return key;
                        });
                        for (_i = 0, toolsToRemove_2 = toolsToRemove; _i < toolsToRemove_2.length; _i++) {
                            key = toolsToRemove_2[_i];
                            this.tools.delete(key);
                        }
                        _a.label = 10;
                    case 10:
                        console.log("[MCPManager] \u2705 Removed server: ".concat(name));
                        return [3 /*break*/, 12];
                    case 11:
                        error_6 = _a.sent();
                        console.error("[MCPManager] Failed to remove server ".concat(name, ":"), error_6);
                        throw error_6;
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set NodeOneCore reference for memory tools
     * Called after ONE.core is initialized
     */
    MCPManager.prototype.setNodeOneCore = function (nodeOneCore) {
        var _this = this;
        this.nodeOneCore = nodeOneCore;
        // Initialize memory tools
        if (nodeOneCore) {
            Promise.resolve().then(function () { return require('./mcp/memory-tools.js'); }).then(function (_a) {
                var MemoryTools = _a.MemoryTools;
                _this.memoryTools = new MemoryTools(nodeOneCore);
                // Register memory tool definitions
                var toolDefs = _this.memoryTools.getToolDefinitions();
                for (var _i = 0, toolDefs_1 = toolDefs; _i < toolDefs_1.length; _i++) {
                    var toolDef = toolDefs_1[_i];
                    _this.tools.set(toolDef.name, {
                        name: toolDef.name,
                        fullName: toolDef.name,
                        description: toolDef.description,
                        inputSchema: toolDef.inputSchema,
                        server: 'memory' // Virtual server for memory tools
                    });
                }
                console.log("[MCPManager] Registered ".concat(toolDefs.length, " memory tools"));
            }).catch(function (err) {
                console.error('[MCPManager] Failed to load memory tools:', err);
            });
        }
    };
    MCPManager.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _i, _b, server, error_7;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.isInitialized) {
                            console.log('[MCPManager] Already initialized');
                            return [2 /*return*/];
                        }
                        console.log('[MCPManager] Initializing MCP servers...');
                        // Ensure default servers exist in database (first run)
                        return [4 /*yield*/, this.ensureDefaultServers()];
                    case 1:
                        // Ensure default servers exist in database (first run)
                        _c.sent();
                        // Load servers from database
                        _a = this;
                        return [4 /*yield*/, this.loadServersFromDatabase()];
                    case 2:
                        // Load servers from database
                        _a.servers = _c.sent();
                        // If no servers loaded (shouldn't happen after ensureDefaultServers), use defaults
                        if (this.servers.length === 0) {
                            console.warn('[MCPManager] No servers loaded from database, using in-memory defaults');
                            this.servers = this.getDefaultServerConfigurations();
                        }
                        _i = 0, _b = this.servers;
                        _c.label = 3;
                    case 3:
                        if (!(_i < _b.length)) return [3 /*break*/, 9];
                        server = _b[_i];
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 7, , 8]);
                        if (!(server.enabled !== false)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.connectToServer(server)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_7 = _c.sent();
                        console.error("[MCPManager] Failed to connect to ".concat(server.name, ":"), error_7.message);
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 3];
                    case 9:
                        this.isInitialized = true;
                        console.log("[MCPManager] \u2705 Initialized with ".concat(this.tools.size, " tools from ").concat(this.clients.size, " servers"));
                        return [2 /*return*/];
                }
            });
        });
    };
    MCPManager.prototype.connectToServer = function (server) {
        return __awaiter(this, void 0, void 0, function () {
            var transport, client, tools, toolNames, _i, _a, tool, toolKey, error_8, error_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[MCPManager] Connecting to ".concat(server.name, "..."));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        transport = new stdio_js_1.StdioClientTransport({
                            command: server.command,
                            args: server.args,
                            env: __assign({}, process.env)
                        });
                        client = new index_js_1.Client({
                            name: "lama-electron-".concat(server.name),
                            version: '1.0.0'
                        }, {
                            capabilities: {
                                tools: {},
                                prompts: {}
                            }
                        });
                        return [4 /*yield*/, client.connect(transport)];
                    case 2:
                        _b.sent();
                        this.clients.set(server.name, { client: client, transport: transport });
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, client.listTools()];
                    case 4:
                        tools = _b.sent();
                        if (tools.tools) {
                            toolNames = [];
                            for (_i = 0, _a = tools.tools; _i < _a.length; _i++) {
                                tool = _a[_i];
                                toolKey = "".concat(server.name, ":").concat(tool.name);
                                this.tools.set(toolKey, {
                                    name: tool.name,
                                    description: tool.description || '',
                                    inputSchema: tool.inputSchema,
                                    server: server.name,
                                    fullName: toolKey
                                });
                                toolNames.push(toolKey);
                            }
                            // Log all tools at once instead of individually
                            if (toolNames.length > 0) {
                                console.log("[MCPManager] Registered ".concat(toolNames.length, " tools from ").concat(server.name));
                            }
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_8 = _b.sent();
                        console.warn("[MCPManager] Failed to list tools for ".concat(server.name, ":"), error_8.message);
                        return [3 /*break*/, 6];
                    case 6:
                        console.log("[MCPManager] Connected to ".concat(server.name, " successfully"));
                        return [3 /*break*/, 8];
                    case 7:
                        error_9 = _b.sent();
                        console.error("[MCPManager] Failed to connect to ".concat(server.name, ":"), error_9);
                        throw error_9;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    MCPManager.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, name_1, _c, client, transport, error_10;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log('[MCPManager] Shutting down MCP servers...');
                        _i = 0, _a = this.clients;
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        _b = _a[_i], name_1 = _b[0], _c = _b[1], client = _c.client, transport = _c.transport;
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, client.close()];
                    case 3:
                        _d.sent();
                        console.log("[MCPManager] Closed ".concat(name_1));
                        return [3 /*break*/, 5];
                    case 4:
                        error_10 = _d.sent();
                        console.error("[MCPManager] Error closing ".concat(name_1, ":"), error_10);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        this.clients.clear();
                        this.tools.clear();
                        this.isInitialized = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    MCPManager.prototype.getAvailableTools = function () {
        return Array.from(this.tools.values());
    };
    MCPManager.prototype.getToolDescriptions = function () {
        var _a;
        var tools = this.getAvailableTools();
        if (tools.length === 0) {
            return '';
        }
        var description = '\n\n# Available Tools\n\n';
        description += 'You have access to the following tools that you can execute:\n\n';
        for (var _i = 0, tools_1 = tools; _i < tools_1.length; _i++) {
            var tool = tools_1[_i];
            description += "**".concat(tool.fullName, "**\n");
            if (tool.description) {
                description += "".concat(tool.description, "\n");
            }
            if (tool.inputSchema && tool.inputSchema.properties) {
                description += 'Parameters:\n';
                for (var _b = 0, _c = Object.entries(tool.inputSchema.properties); _b < _c.length; _b++) {
                    var _d = _c[_b], paramName = _d[0], paramDef = _d[1];
                    var def = paramDef;
                    var required = ((_a = tool.inputSchema.required) === null || _a === void 0 ? void 0 : _a.includes(paramName)) ? ' (required)' : ' (optional)';
                    description += "  - ".concat(paramName).concat(required, ": ").concat(def.description || def.type || 'no description', "\n");
                }
            }
            description += '\n';
        }
        description += '\n# Tool Usage\n\n';
        description += 'When you need to use a tool, respond with ONLY the JSON block (no thinking, no explanation):\n\n';
        description += '```json\n';
        description += '{"tool":"tool-name","parameters":{"param":"value"}}\n';
        description += '```\n\n';
        description += 'The system will execute the tool and provide you with the result. Then you can respond with the result formatted for the user.\n';
        description += 'IMPORTANT: Do NOT simulate tool execution - actually call the tool by responding with the JSON.\n';
        return description;
    };
    MCPManager.prototype.executeTool = function (toolName, parameters, context) {
        return __awaiter(this, void 0, void 0, function () {
            var tool, foundTool, toolData, result, error_11, serverData, result, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tool = this.tools.get(toolName);
                        if (!tool) {
                            foundTool = Array.from(this.tools.values()).find(function (t) { return t.name === toolName; });
                            if (foundTool) {
                                toolName = foundTool.fullName;
                            }
                            else {
                                throw new Error("Tool ".concat(toolName, " not found"));
                            }
                        }
                        toolData = tool || this.tools.get(toolName);
                        if (!(toolData.server === 'memory')) return [3 /*break*/, 4];
                        if (!this.memoryTools) {
                            throw new Error('Memory tools not initialized - ONE.core may not be ready');
                        }
                        console.log("[MCPManager] Executing memory tool ".concat(toolName, " with params:"), parameters);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.memoryTools.executeTool(toolName, parameters, context)];
                    case 2:
                        result = _a.sent();
                        console.log("[MCPManager] Memory tool ".concat(toolName, " executed successfully"));
                        return [2 /*return*/, result];
                    case 3:
                        error_11 = _a.sent();
                        console.error("[MCPManager] Memory tool execution failed:", error_11);
                        throw error_11;
                    case 4:
                        serverData = this.clients.get(toolData.server);
                        if (!serverData) {
                            throw new Error("Server ".concat(toolData.server, " not connected"));
                        }
                        console.log("[MCPManager] Executing tool ".concat(toolName, " with params:"), parameters);
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, serverData.client.callTool({
                                name: toolData.name,
                                arguments: parameters
                            })];
                    case 6:
                        result = _a.sent();
                        console.log("[MCPManager] Tool ".concat(toolName, " executed successfully"));
                        return [2 /*return*/, result];
                    case 7:
                        error_12 = _a.sent();
                        console.error("[MCPManager] Tool execution failed:", error_12);
                        throw error_12;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // Debug method to check state
    MCPManager.prototype.debugState = function () {
        return {
            initialized: this.isInitialized,
            servers: this.servers.map(function (s) { return s.name; }),
            connectedClients: Array.from(this.clients.keys()),
            availableTools: Array.from(this.tools.keys()),
            toolCount: this.tools.size
        };
    };
    return MCPManager;
}());
// Export singleton instance
var mcpManager = new MCPManager();
exports.default = mcpManager;
