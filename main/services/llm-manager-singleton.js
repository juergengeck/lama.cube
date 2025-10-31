"use strict";
/**
 * LLM Manager Singleton
 *
 * Creates a single instance of lama.core's LLMManager with Electron-specific dependencies.
 * This is the ONLY llm-manager instance used throughout the application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var llm_manager_js_1 = require("@lama/core/services/llm-manager.js");
var mcp_manager_js_1 = require("./mcp-manager.js");
var electron_1 = require("electron");
var BrowserWindow = electron_1.default.BrowserWindow;
/**
 * Forward logs to renderer process for debugging
 */
function forwardLog(level, message) {
    try {
        var mainWindow_1 = BrowserWindow.getAllWindows()[0];
        if (mainWindow_1 && !mainWindow_1.isDestroyed()) {
            mainWindow_1.webContents.send('main-process-log', {
                level: level,
                message: message,
                timestamp: Date.now()
            });
        }
    }
    catch (e) {
        // No main window available
    }
}
/**
 * Create singleton instance of lama.core's LLMManager with Electron dependencies
 */
var llmManager = new llm_manager_js_1.LLMManager(undefined, // platform (optional - not currently used)
mcp_manager_js_1.default, // MCP manager for tool integration
forwardLog // Log forwarding to renderer
);
exports.default = llmManager;
