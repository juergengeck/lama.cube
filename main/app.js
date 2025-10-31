"use strict";
/**
 * Main Application Entry Point
 * Initializes all services and manages the application lifecycle
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
var electron_1 = require("electron");
var app = electron_1.default.app, BrowserWindow = electron_1.default.BrowserWindow;
var path_1 = require("path");
var fs_1 = require("fs");
var url_1 = require("url");
// Get __dirname equivalent in ESM
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
// Core modules
var node_provisioning_js_1 = require("./services/node-provisioning.js");
var controller_js_1 = require("./ipc/controller.js");
var llm_manager_singleton_js_1 = require("./services/llm-manager-singleton.js");
var attachment_service_js_1 = require("./services/attachment-service.js");
var MainApplication = /** @class */ (function () {
    function MainApplication() {
        this.mainWindow = null;
        this.initialized = false;
    }
    MainApplication.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Always reset initialization state on fresh start
                        // This ensures we can properly reinitialize after a data reset
                        if (this.initialized) {
                            console.log('[MainApp] Already initialized, skipping...');
                            return [2 /*return*/];
                        }
                        console.log('[MainApp] Initializing application...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        // Initialize Node provisioning listener
                        // Node instance will be initialized when browser provisions it
                        node_provisioning_js_1.default.initialize();
                        // Initialize attachment service
                        return [4 /*yield*/, attachment_service_js_1.default.initialize()];
                    case 2:
                        // Initialize attachment service
                        _a.sent();
                        console.log('[MainApp] Attachment service initialized');
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, llm_manager_singleton_js_1.default.init()];
                    case 4:
                        _a.sent();
                        console.log('[MainApp] LLM Manager initialized with MCP tools');
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        console.warn('[MainApp] LLM Manager initialization failed (non-critical):', error_1);
                        return [3 /*break*/, 6];
                    case 6:
                        // Set up state change listeners
                        this.setupStateListeners();
                        this.initialized = true;
                        console.log('[MainApp] Application ready for provisioning');
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        console.error('[MainApp] Failed to initialize:', error_2);
                        // Don't set initialized on failure, allow retry
                        throw error_2;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    MainApplication.prototype.reset = function () {
        // Reset the application state for clean restart
        console.log('[MainApp] Resetting application state...');
        this.initialized = false;
        this.mainWindow = null;
    };
    MainApplication.prototype.setupStateListeners = function () {
        // State changes will be handled through CHUM sync
        // No longer using centralized state manager
        console.log('[MainApp] State listeners configured for CHUM sync');
    };
    MainApplication.prototype.createWindow = function () {
        var _this = this;
        // Set up window icon
        var iconPath = path_1.default.join(__dirname, '..', 'assets', 'icons', 'icon-512.png');
        var windowIcon = undefined;
        if (fs_1.default.existsSync(iconPath)) {
            windowIcon = iconPath;
            console.log("[MainApp] Using window icon: ".concat(iconPath));
        }
        else {
            console.warn("[MainApp] Icon file not found: ".concat(iconPath));
        }
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            icon: windowIcon,
            webPreferences: {
                nodeIntegration: false, // Clean browser environment
                contextIsolation: true, // Enable for security
                preload: path_1.default.join(__dirname, '..', 'electron-preload.js'),
                webSecurity: false
            },
            title: 'LAMA',
            backgroundColor: '#0a0a0a',
            show: false,
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 20, y: 20 }
        });
        // Set global reference for IPC handlers to use
        global.mainWindow = this.mainWindow;
        // Initialize IPC controller with window
        controller_js_1.default.initialize(this.mainWindow);
        // Load the app
        if (process.env.NODE_ENV !== 'production') {
            this.mainWindow.loadURL('http://localhost:5174');
            this.mainWindow.webContents.openDevTools();
        }
        else {
            this.mainWindow.loadFile(path_1.default.join(__dirname, '..', 'electron-ui', 'dist', 'index.html'));
        }
        // Show window when ready
        this.mainWindow.once('ready-to-show', function () {
            _this.mainWindow.show();
        });
        // Handle window closed
        this.mainWindow.on('closed', function () {
            _this.mainWindow = null;
            global.mainWindow = null;
        });
    };
    MainApplication.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[MainApp] Starting application...');
                        // Initialize core services
                        return [4 /*yield*/, this.initialize()
                            // Create main window
                        ];
                    case 1:
                        // Initialize core services
                        _a.sent();
                        // Create main window
                        this.createWindow();
                        console.log('[MainApp] Application started');
                        return [2 /*return*/];
                }
            });
        });
    };
    MainApplication.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[MainApp] Shutting down...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, llm_manager_singleton_js_1.default.shutdown()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('[MainApp] Error shutting down LLM Manager:', error_3);
                        return [3 /*break*/, 4];
                    case 4:
                        // Shutdown IPC
                        if (controller_js_1.default && controller_js_1.default.shutdown) {
                            controller_js_1.default.shutdown();
                        }
                        if (!(node_provisioning_js_1.default && node_provisioning_js_1.default.isProvisioned && node_provisioning_js_1.default.isProvisioned())) return [3 /*break*/, 6];
                        return [4 /*yield*/, node_provisioning_js_1.default.deprovision()];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        // Reset the application state
                        this.reset();
                        console.log('[MainApp] Shutdown complete');
                        return [2 /*return*/];
                }
            });
        });
    };
    MainApplication.prototype.getMainWindow = function () {
        return this.mainWindow;
    };
    MainApplication.prototype.getState = function () {
        return __awaiter(this, void 0, void 0, function () {
            var nodeInstance;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!node_provisioning_js_1.default.isProvisioned()) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./core/node-one-core.js'); })];
                    case 1:
                        nodeInstance = (_c.sent()).default;
                        return [2 /*return*/, ((_b = (_a = nodeInstance.models) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.getAll()) || {}];
                    case 2: return [2 /*return*/, {}];
                }
            });
        });
    };
    return MainApplication;
}());
// Export singleton instance
exports.default = new MainApplication();
