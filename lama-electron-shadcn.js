"use strict";
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
exports.clearAppDataShared = clearAppDataShared;
var electron_1 = require("electron");
var path_1 = require("path");
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var url_1 = require("url");
var http_1 = require("http");
// Get __dirname equivalent in ESM
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
// Import the main application
var app_js_1 = require("./main/app.js");
var auto_init_js_1 = require("./main/startup/auto-init.js");
var ipc_logger_js_1 = require("./main/utils/ipc-logger.js");
var lama_config_js_1 = require("./main/config/lama-config.js");
// Set app name
electron_1.app.setName('LAMA');
// Allow multiple instances - each with proper cleanup
// Different instances can use different user data directories for testing
console.log('[Main] Starting new LAMA instance with PID:', process.pid);
// Handle EPIPE errors gracefully (when renderer disconnects unexpectedly)
process.on('uncaughtException', function (error) {
    if (error.code === 'EPIPE' || (error.message && error.message.includes('EPIPE'))) {
        // Ignore EPIPE errors - these happen when renderer closes while main is writing
        // Use process.stderr.write to avoid potential console issues
        try {
            process.stderr.write('[Main] Caught EPIPE error - renderer disconnected\n');
        }
        catch (e) {
            // Even stderr might fail, just ignore
        }
        return;
    }
    // For other uncaught exceptions, log and exit gracefully
    console.error('[Main] Uncaught exception:', error);
    console.error(error.stack);
    // Don't re-throw in production, just exit gracefully
    if (process.env.NODE_ENV === 'production') {
        electron_1.app.quit();
    }
    else {
        // In development, allow the error to be seen but don't crash
        console.error('[Main] Development mode - continuing despite error');
    }
});
// Also handle unhandled promise rejections
process.on('unhandledRejection', function (reason, promise) {
    console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});
// Track all child processes for this instance
var childProcesses = new Set();
// Clean up on process exit
process.on('exit', function () {
    console.log("[Main-".concat(process.pid, "] Process exiting, cleaning up child processes..."));
    // Kill any remaining child processes
    childProcesses.forEach(function (child) {
        try {
            if (child && !child.killed) {
                child.kill('SIGTERM');
            }
        }
        catch (e) {
            // Process might already be gone
        }
    });
});
// Handle termination signals
process.on('SIGTERM', function () {
    console.log("[Main-".concat(process.pid, "] Received SIGTERM, closing gracefully..."));
    electron_1.app.quit();
});
process.on('SIGINT', function () {
    console.log("[Main-".concat(process.pid, "] Received SIGINT, closing gracefully..."));
    electron_1.app.quit();
});
var mainWindow = null;
var viteProcess = null;
function createWindow() {
    var _this = this;
    // Use PNG for better compatibility, platform-specific icons can be set separately
    var iconPath = path_1.default.join(__dirname, 'assets', 'icons', 'icon-512.png');
    // Check if icon file exists, fallback to no icon if not found
    var windowIcon = undefined;
    if (fs_1.default.existsSync(iconPath)) {
        windowIcon = iconPath;
        console.log("Using window icon: ".concat(iconPath));
    }
    else {
        console.warn("Icon file not found: ".concat(iconPath));
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        icon: windowIcon,
        webPreferences: {
            nodeIntegration: false, // Disable Node in renderer for cleaner browser environment
            contextIsolation: true, // Enable context isolation for security
            preload: path_1.default.join(__dirname, 'electron-preload.js'),
            webSecurity: true, // Must be true for preload to work
            partition: 'persist:lama' // Use persistent partition for IndexedDB
        },
        title: 'LAMA',
        backgroundColor: '#0a0a0a',
        show: true,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 20, y: 20 }
    });
    // Set up IPC logger to send Node logs to browser
    ipc_logger_js_1.default.setMainWindow(mainWindow);
    ipc_logger_js_1.default.enable(); // Enable to debug welcome message generation
    // In development, load from Vite dev server
    if (process.env.NODE_ENV !== 'production') {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.loadURL('http://localhost:5174');
        // Workaround: Inject electronAPI after page loads when webSecurity is disabled
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.once('dom-ready', function () {
            console.log('[Main] Injecting electronAPI workaround for dev mode...');
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.executeJavaScript("\n        if (!window.electronAPI) {\n          console.warn('[Injection] electronAPI not found, this indicates preload issues with webSecurity:false');\n          // The preload should have set this up, but with webSecurity:false it doesn't work\n          // This is a dev-only workaround\n        }\n      ");
        });
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.openDevTools();
    }
    else {
        // In production, load the built files
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.loadFile(path_1.default.join(__dirname, 'electron-ui', 'dist', 'index.html'));
    }
    mainWindow.once('ready-to-show', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
    });
    // AUTO-LOGIN FOR TESTING FEDERATION
    if (process.env.AUTO_LOGIN === 'true') {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.once('did-finish-load', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[AutoLogin] Page loaded, waiting before auto-login...');
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                    case 1:
                        _a.sent();
                        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.executeJavaScript("\n        (async () => {\n          console.log('[AutoLogin] Attempting automatic login...')\n          const usernameInput = document.querySelector('input[name=\"username\"]')\n          const passwordInput = document.querySelector('input[type=\"password\"]')\n          const loginButton = document.querySelector('button[type=\"submit\"]')\n          \n          if (usernameInput && passwordInput && loginButton) {\n            usernameInput.value = 'testuser'\n            passwordInput.value = 'testpass123'\n            usernameInput.dispatchEvent(new Event('input', { bubbles: true }))\n            passwordInput.dispatchEvent(new Event('input', { bubbles: true }))\n            await new Promise(resolve => setTimeout(resolve, 100))\n            loginButton.click()\n            return 'Login triggered'\n          }\n          return 'Login form not found'\n        })()\n      ").then(function (result) { return console.log('[AutoLogin]', result); });
                        return [2 /*return*/];
                }
            });
        }); });
    }
    // Add custom title bar with LAMA text
    mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.on('did-finish-load', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.executeJavaScript("\n      // Add custom title bar if not already present\n      if (!document.querySelector('.electron-titlebar')) {\n        const titleBar = document.createElement('div');\n        titleBar.className = 'electron-titlebar';\n        titleBar.innerHTML = '<div class=\"titlebar-content\"><span class=\"lama-logo\"><span style=\"color: #ef4444\">L</span><span style=\"color: #eab308\">A</span><span style=\"color: #22c55e\">M</span><span style=\"color: #a855f7\">A</span></span></div>';\n        \n        const style = document.createElement('style');\n        style.textContent = `\n          .electron-titlebar {\n            position: fixed;\n            top: 0;\n            left: 0;\n            right: 0;\n            height: 38px;\n            background: transparent;\n            -webkit-app-region: drag;\n            z-index: 10000;\n            display: flex;\n            align-items: center;\n          }\n          .titlebar-content {\n            padding-left: 80px; /* Space for traffic lights + padding */\n            display: flex;\n            align-items: center;\n            height: 100%;\n          }\n          .lama-logo {\n            font-size: 18px;\n            font-weight: bold;\n            letter-spacing: 1px;\n            user-select: none;\n          }\n          body {\n            padding-top: 38px; /* Push content down below title bar */\n          }\n        `;\n        document.head.appendChild(style);\n        document.body.insertBefore(titleBar, document.body.firstChild);\n      }\n    ");
    });
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}
function startViteServer() {
    return new Promise(function (resolve) {
        // Check if server is already running
        http_1.default === null || http_1.default === void 0 ? void 0 : http_1.default.get('http://localhost:5174', function (res) {
            console.log('Vite server already running');
            resolve();
        }).on('error', function () {
            var _a, _b;
            // Start Vite server
            console.log("[Main-".concat(process.pid, "] Starting Vite dev server..."));
            // __dirname is dist/ after compilation, go up one level to project root
            var projectRoot = path_1.default.join(__dirname, '..');
            viteProcess = (0, child_process_1.spawn)('npm', ['run', 'dev'], {
                cwd: path_1.default.join(projectRoot, 'electron-ui'),
                shell: true,
                stdio: 'pipe',
                env: __assign({}, process.env)
            });
            // Track this child process
            childProcesses.add(viteProcess);
            // Remove from tracking when it exits
            if (viteProcess) {
                viteProcess.on('exit', function () {
                    childProcesses.delete(viteProcess);
                    console.log("[Main-".concat(process.pid, "] Vite process exited"));
                });
            }
            (_a = viteProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                var output = data.toString();
                console.log(output);
                if (output.includes('Local:')) {
                    console.log('Vite server ready');
                    setTimeout(resolve, 1000); // Give it a moment to stabilize
                }
            });
            (_b = viteProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                console.error("Vite error: ".concat(data));
            });
        });
    });
}
// Handle browser console logs
electron_1.ipcMain.on('browser-log', function (event, level, message) {
    console.log("[Browser ".concat(level, "]"), message);
});
electron_1.app.whenReady().then(function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, dockIconPath, initResult, error_1, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // Load configuration from environment variables and config files
                console.log('[Main] Loading LAMA configuration...');
                _a = global;
                return [4 /*yield*/, (0, lama_config_js_1.loadConfig)()];
            case 1:
                _a.lamaConfig = _b.sent();
                console.log('[Main] Configuration loaded successfully');
                // Set dock icon for macOS after app is ready
                if (process.platform === 'darwin') {
                    dockIconPath = path_1.default.join(__dirname, 'assets', 'icons', 'icon-512.png');
                    if (fs_1.default.existsSync(dockIconPath)) {
                        try {
                            electron_1.app.dock.setIcon(dockIconPath);
                            console.log("Dock icon set successfully: ".concat(dockIconPath));
                        }
                        catch (error) {
                            console.warn('Failed to set dock icon:', error instanceof Error ? error.message : String(error));
                        }
                    }
                    else {
                        console.warn("Dock icon file not found: ".concat(dockIconPath));
                    }
                }
                if (!(process.env.NODE_ENV !== 'production')) return [3 /*break*/, 3];
                return [4 /*yield*/, startViteServer()];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, (0, auto_init_js_1.autoInitialize)()];
            case 4:
                initResult = _b.sent();
                if (initResult.recovered) {
                    console.log('Auto-recovered existing ONE.core instances');
                }
                else if (initResult.needsSetup) {
                    console.log('Need to set up ONE.core instances via UI');
                }
                return [3 /*break*/, 6];
            case 5:
                error_1 = _b.sent();
                console.error('Auto-initialization error:', error_1);
                return [3 /*break*/, 6];
            case 6:
                _b.trys.push([6, 8, , 9]);
                return [4 /*yield*/, app_js_1.default.start()];
            case 7:
                _b.sent();
                console.log('Main application started successfully');
                return [3 /*break*/, 9];
            case 8:
                error_2 = _b.sent();
                console.error('Failed to start main application:', error_2);
                // Still create window even if initialization fails
                createWindow();
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
electron_1.app.on('window-all-closed', function () {
    console.log("[Main-".concat(process.pid, "] All windows closed for this instance"));
    // Clean up this instance's Vite process
    if (viteProcess) {
        console.log("[Main-".concat(process.pid, "] Killing Vite process..."));
        viteProcess.kill('SIGTERM');
    }
    // On macOS, keep app in dock but clean up resources
    // On other platforms, quit completely
    if (process.platform !== 'darwin') {
        console.log("[Main-".concat(process.pid, "] Non-macOS platform, quitting..."));
        electron_1.app.quit();
    }
    else {
        console.log("[Main-".concat(process.pid, "] macOS: App stays in dock, resources cleaned"));
        // Clean up any instance-specific resources here
        mainWindow = null;
    }
});
electron_1.app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.app.on('before-quit', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Skip shutdown if we're clearing data
                if (global.isClearing) {
                    return [2 /*return*/];
                }
                console.log("[Main-".concat(process.pid, "] App instance is quitting, cleaning up..."));
                if (viteProcess) {
                    viteProcess.kill();
                }
                if (!(app_js_1.default && app_js_1.default.shutdown)) return [3 /*break*/, 2];
                return [4 /*yield*/, app_js_1.default.shutdown()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
// IPC handlers for native features
electron_1.ipcMain.handle('create-udp-socket', function (event, options) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Placeholder for UDP socket creation
        console.log('Creating UDP socket:', options);
        return [2 /*return*/, { id: 'socket-' + Date.now() }];
    });
}); });
// Crypto handlers are now registered via IPCController
// Shared function for clearing app data - used by both app:clearData and onecore:clearStorage
function clearAppDataShared() {
    return __awaiter(this, void 0, void 0, function () {
        var error_3, nodeOneCore, nodeProvisioning, e_1, error_4, oneDbPath, userDataPath, oneDbContents, stateManager, error_5, items, _i, items_1, item, itemPath, stat, error_6;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('[ClearData] Starting app data reset...');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 23, , 24]);
                    // Step 1: Set clearing flag immediately to prevent any saves
                    global.isClearing = true;
                    // Step 2: Shutdown services properly
                    console.log('[ClearData] Shutting down services...');
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, app_js_1.default.shutdown()];
                case 3:
                    _c.sent();
                    console.log('[ClearData] Main app shut down');
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _c.sent();
                    console.error('[ClearData] Error shutting down main app:', error_3);
                    return [3 /*break*/, 5];
                case 5:
                    _c.trys.push([5, 12, , 13]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./main/core/node-one-core.js'); })];
                case 6:
                    nodeOneCore = (_c.sent()).default;
                    if (!nodeOneCore) return [3 /*break*/, 9];
                    if (!nodeOneCore.shutdown) return [3 /*break*/, 8];
                    return [4 /*yield*/, nodeOneCore.shutdown()];
                case 7:
                    _c.sent();
                    console.log('[ClearData] Node.js ONE.core shut down');
                    _c.label = 8;
                case 8:
                    // Then reset to clean state
                    if (nodeOneCore.reset) {
                        nodeOneCore.reset();
                        console.log('[ClearData] NodeOneCore reset to clean state');
                    }
                    _c.label = 9;
                case 9: return [4 /*yield*/, Promise.resolve().then(function () { return require('./main/services/node-provisioning.js'); })];
                case 10:
                    nodeProvisioning = (_c.sent()).default;
                    if (nodeProvisioning && nodeProvisioning.reset) {
                        nodeProvisioning.reset();
                        console.log('[ClearData] Node provisioning reset');
                    }
                    // CRITICAL: Wait for OS to release file handles
                    // Without this delay, rmSync fails because files are still locked
                    console.log('[ClearData] Waiting 2 seconds for file handles to be released...');
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                case 11:
                    _c.sent();
                    return [3 /*break*/, 13];
                case 12:
                    e_1 = _c.sent();
                    console.error('[ClearData] Error shutting down Node.js instance:', e_1);
                    return [3 /*break*/, 13];
                case 13:
                    // Step 3: Clear browser storage
                    console.log('[ClearData] Clearing browser storage...');
                    _c.label = 14;
                case 14:
                    _c.trys.push([14, 17, , 18]);
                    // Clear all browser storage data
                    return [4 /*yield*/, electron_1.session.defaultSession.clearStorageData({
                            storages: ['indexdb', 'localstorage', 'cookies', 'cachestorage', 'websql']
                        })];
                case 15:
                    // Clear all browser storage data
                    _c.sent();
                    // Also clear cache
                    return [4 /*yield*/, electron_1.session.defaultSession.clearCache()];
                case 16:
                    // Also clear cache
                    _c.sent();
                    console.log('[ClearData] Browser storage cleared');
                    return [3 /*break*/, 18];
                case 17:
                    error_4 = _c.sent();
                    console.error('[ClearData] Error clearing browser storage:', error_4);
                    return [3 /*break*/, 18];
                case 18:
                    // Step 4: Delete data folders
                    console.log('[ClearData] Deleting data folders...');
                    oneDbPath = ((_a = global.lamaConfig) === null || _a === void 0 ? void 0 : _a.instance.directory) || path_1.default.join(process.cwd(), 'OneDB');
                    userDataPath = electron_1.app.getPath('userData');
                    // Log paths for debugging
                    console.log('[ClearData] ========================================');
                    console.log('[ClearData] CRITICAL PATH INFORMATION:');
                    console.log('[ClearData] global.lamaConfig?.instance.directory:', (_b = global.lamaConfig) === null || _b === void 0 ? void 0 : _b.instance.directory);
                    console.log('[ClearData] process.cwd():', process.cwd());
                    console.log('[ClearData] Resolved OneDB path to DELETE:', oneDbPath);
                    console.log('[ClearData] User data path:', userDataPath);
                    console.log('[ClearData] ========================================');
                    console.log('[ClearData] OneDB path:', oneDbPath);
                    console.log('[ClearData] OneDB exists:', fs_1.default.existsSync(oneDbPath));
                    // Delete OneDB - CRITICAL for removing all chat history
                    if (fs_1.default.existsSync(oneDbPath)) {
                        try {
                            oneDbContents = fs_1.default.readdirSync(oneDbPath);
                            console.log("[ClearData] OneDB contains ".concat(oneDbContents.length, " items:"), oneDbContents);
                            // Delete the entire directory
                            fs_1.default.rmSync(oneDbPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
                            // Verify it's gone
                            if (fs_1.default.existsSync(oneDbPath)) {
                                console.error('[ClearData] OneDB STILL EXISTS after deletion!');
                                throw new Error('Failed to delete OneDB directory');
                            }
                            else {
                                console.log('[ClearData] ✅ OneDB directory successfully deleted');
                            }
                        }
                        catch (error) {
                            console.error('[ClearData] CRITICAL ERROR deleting OneDB:', error);
                            throw error; // Re-throw to fail the whole operation
                        }
                    }
                    else {
                        console.log('[ClearData] OneDB directory does not exist - nothing to delete');
                    }
                    // IMPORTANT: userData directory cannot be deleted while app is running
                    // We'll create a cleanup script that runs BEFORE the app restarts
                    console.log('[ClearData] Will delete userData on restart: ' + userDataPath);
                    // Step 5: Clear application state
                    console.log('[ClearData] Resetting application state...');
                    _c.label = 19;
                case 19:
                    _c.trys.push([19, 21, , 22]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./main/state/manager.js'); })];
                case 20:
                    stateManager = (_c.sent()).default;
                    if (stateManager && stateManager.clearState) {
                        stateManager.clearState();
                        console.log('[ClearData] State manager cleared');
                    }
                    return [3 /*break*/, 22];
                case 21:
                    error_5 = _c.sent();
                    console.error('[ClearData] Error clearing state manager:', error_5);
                    return [3 /*break*/, 22];
                case 22:
                    // Step 6: Module cache clearing skipped for ESM
                    // ESM modules are cached differently and will be reloaded on app restart
                    console.log('[ClearData] Module cache will be cleared on app restart');
                    console.log('[ClearData] All data cleared successfully');
                    // Notify renderer that data has been cleared (before restart)
                    if (mainWindow && !(mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.isDestroyed())) {
                        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('app:dataCleared');
                    }
                    // Step 7: Delete userData directory immediately while app is still running
                    console.log('[ClearData] Deleting userData directory: ' + userDataPath);
                    // Try to delete userData immediately (may fail for some files in use)
                    try {
                        if (fs_1.default.existsSync(userDataPath)) {
                            items = fs_1.default.readdirSync(userDataPath);
                            // Delete each item recursively
                            for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
                                item = items_1[_i];
                                itemPath = path_1.default.join(userDataPath, item);
                                try {
                                    stat = fs_1.default.statSync(itemPath);
                                    if (stat.isDirectory()) {
                                        fs_1.default.rmSync(itemPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
                                        console.log("[ClearData] Deleted directory: ".concat(item));
                                    }
                                    else {
                                        fs_1.default.unlinkSync(itemPath);
                                        console.log("[ClearData] Deleted file: ".concat(item));
                                    }
                                }
                                catch (e) {
                                    console.warn("[ClearData] Could not delete ".concat(item, ":"), e.message);
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.error('[ClearData] Error clearing userData directory:', error);
                    }
                    // Step 8: Restart the application
                    console.log('[ClearData] Scheduling application restart...');
                    // Give a bit of time to ensure everything is cleaned up
                    setTimeout(function () {
                        console.log('[ClearData] Restarting application now...');
                        // Use app.relaunch() in both development and production
                        // This properly restarts the Electron app
                        electron_1.app.relaunch();
                        electron_1.app.exit(0);
                    }, 1000);
                    return [2 /*return*/, { success: true, message: 'App data cleared successfully. Application will restart...' }];
                case 23:
                    error_6 = _c.sent();
                    console.error('[ClearData] FATAL ERROR:', error_6);
                    console.error('[ClearData] Stack trace:', error_6 instanceof Error ? error_6.stack : 'No stack trace');
                    // Even on error, try to restart the app
                    setTimeout(function () {
                        electron_1.app.relaunch();
                        electron_1.app.exit(0);
                    }, 1000);
                    return [2 /*return*/, { success: false, error: error_6 instanceof Error ? error_6.message : 'Failed to clear app data' }];
                case 24: return [2 /*return*/];
            }
        });
    });
}
// Handler for clearing app data - wraps shared function
electron_1.ipcMain.handle('app:clearData', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, clearAppDataShared()];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); });
// Auto-login test function for debugging
function autoLoginTest() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                var nodeProvisioning, result, error_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.log('[AutoLogin] Triggering login with demo/demo...');
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('./main/services/node-provisioning.js'); })];
                        case 2:
                            nodeProvisioning = (_a.sent()).default;
                            return [4 /*yield*/, nodeProvisioning.provision({
                                    user: {
                                        name: 'demo',
                                        password: 'demo'
                                    }
                                })];
                        case 3:
                            result = _a.sent();
                            console.log('[AutoLogin] Provision result:', JSON.stringify(result, null, 2));
                            return [3 /*break*/, 5];
                        case 4:
                            error_7 = _a.sent();
                            console.error('[AutoLogin] Error:', error_7);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); }, 5000);
            return [2 /*return*/];
        });
    });
}
// Uncomment to enable auto-login for testing
autoLoginTest();
