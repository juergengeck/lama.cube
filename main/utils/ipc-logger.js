"use strict";
/**
 * IPC Logger
 * Sends Node.js logs to browser console via IPC
 */
Object.defineProperty(exports, "__esModule", { value: true });
var IPCLogger = /** @class */ (function () {
    function IPCLogger() {
        this.mainWindow = null;
        this.enabled = false; // Disabled by default - too much spam from ONE.core
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        // Override console methods
        this.setupInterceptors();
    }
    IPCLogger.prototype.setMainWindow = function (window) {
        this.mainWindow = window;
        this.originalConsole.log('[IPCLogger] Main window set, logs will be sent to browser');
        // Test the connection
        setTimeout(function () {
            console.log('[IPCLogger] Test message - if you see this in browser console, IPC logging is working!');
        }, 2000);
    };
    IPCLogger.prototype.setupInterceptors = function () {
        var self = this;
        // Override console.log
        console.log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            self.originalConsole.log.apply(console, args);
            if (self.enabled && self.mainWindow && !self.mainWindow.isDestroyed()) {
                self.sendToBrowser('log', args);
            }
        };
        // Override console.error
        console.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            self.originalConsole.error.apply(console, args);
            if (self.enabled && self.mainWindow && !self.mainWindow.isDestroyed()) {
                self.sendToBrowser('error', args);
            }
        };
        // Override console.warn
        console.warn = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            self.originalConsole.warn.apply(console, args);
            if (self.enabled && self.mainWindow && !self.mainWindow.isDestroyed()) {
                self.sendToBrowser('warn', args);
            }
        };
        // Override console.info
        console.info = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            self.originalConsole.info.apply(console, args);
            if (self.enabled && self.mainWindow && !self.mainWindow.isDestroyed()) {
                self.sendToBrowser('info', args);
            }
        };
    };
    IPCLogger.prototype.sendToBrowser = function (level, args) {
        try {
            // Convert args to serializable format
            var message = args.map(function (arg) {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    }
                    catch (_a) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            // Send to browser
            this.mainWindow.webContents.send('node-log', {
                level: level,
                message: message,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            // Silently fail if can't send to browser
            this.originalConsole.error('[IPCLogger] Failed to send log to browser:', error.message);
        }
    };
    IPCLogger.prototype.disable = function () {
        this.enabled = false;
    };
    IPCLogger.prototype.enable = function () {
        this.enabled = true;
    };
    return IPCLogger;
}());
// Create singleton
var ipcLogger = new IPCLogger();
exports.default = ipcLogger;
