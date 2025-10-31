"use strict";
/**
 * AI Assistant Handler Adapter
 *
 * Creates and initializes the refactored AIAssistantHandler from lama.core
 * with Electron-specific dependencies. This replaces the monolithic
 * ai-assistant-model.ts with the new component-based architecture.
 *
 * Usage:
 *   import { aiAssistantHandler } from './ai-assistant-handler-adapter.js';
 *   await aiAssistantHandler.init();
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
exports.createAIAssistantHandler = createAIAssistantHandler;
exports.initializeAIAssistantHandler = initializeAIAssistantHandler;
exports.getAIAssistantHandler = getAIAssistantHandler;
exports.resetAIAssistantHandler = resetAIAssistantHandler;
var AIAssistantHandler_js_1 = require("@lama/core/handlers/AIAssistantHandler.js");
var electron_llm_platform_js_1 = require("../../adapters/electron-llm-platform.js");
var ai_settings_manager_js_1 = require("./ai-settings-manager.js");
var storage_versioned_objects_js_1 = require("@refinio/one.core/lib/storage-versioned-objects.js");
var storage_versioned_objects_js_2 = require("@refinio/one.core/lib/storage-versioned-objects.js");
var keychain_js_1 = require("@refinio/one.core/lib/keychain/keychain.js");
var electron_1 = require("electron");
var BrowserWindow = electron_1.default.BrowserWindow;
var handlerInstance = null;
/**
 * Create AIAssistantHandler instance with Electron dependencies
 * Call this after nodeOneCore is initialized
 */
function createAIAssistantHandler(nodeOneCore, llmManager) {
    if (handlerInstance) {
        console.log('[AIAssistantAdapter] Using existing handler instance');
        return handlerInstance;
    }
    console.log('[AIAssistantAdapter] Creating new AIAssistantHandler...');
    // Get main window for platform events
    var mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
        throw new Error('[AIAssistantAdapter] No main window available for platform events');
    }
    // Create Electron platform adapter
    var platform = new electron_llm_platform_js_1.ElectronLLMPlatform(mainWindow);
    // Create settings persistence manager
    var settingsPersistence = new ai_settings_manager_js_1.AISettingsManager(nodeOneCore);
    // Create handler with all dependencies
    handlerInstance = new AIAssistantHandler_js_1.AIAssistantHandler({
        oneCore: nodeOneCore,
        channelManager: nodeOneCore.channelManager,
        topicModel: nodeOneCore.topicModel,
        leuteModel: nodeOneCore.leuteModel,
        llmManager: llmManager,
        platform: platform,
        stateManager: undefined, // Optional - not currently used
        llmObjectManager: nodeOneCore.llmObjectManager,
        contextEnrichmentService: nodeOneCore.contextEnrichmentService,
        topicAnalysisModel: nodeOneCore.topicAnalysisModel,
        topicGroupManager: nodeOneCore.topicGroupManager,
        settingsPersistence: settingsPersistence,
        storageDeps: {
            storeVersionedObject: storage_versioned_objects_js_1.storeVersionedObject,
            getIdObject: storage_versioned_objects_js_2.getIdObject,
            createDefaultKeys: keychain_js_1.createDefaultKeys,
            hasDefaultKeys: keychain_js_1.hasDefaultKeys
        }
    });
    console.log('[AIAssistantAdapter] AIAssistantHandler created');
    return handlerInstance;
}
/**
 * Initialize the AI assistant handler
 * Call this after nodeOneCore is provisioned
 */
function initializeAIAssistantHandler(nodeOneCore, llmManager) {
    return __awaiter(this, void 0, void 0, function () {
        var handler;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    handler = createAIAssistantHandler(nodeOneCore, llmManager);
                    console.log('[AIAssistantAdapter] Initializing AIAssistantHandler...');
                    return [4 /*yield*/, handler.init()];
                case 1:
                    _a.sent();
                    console.log('[AIAssistantAdapter] ✅ AIAssistantHandler initialized');
                    return [2 /*return*/, handler];
            }
        });
    });
}
/**
 * Get the current handler instance
 * Throws if handler hasn't been created yet
 */
function getAIAssistantHandler() {
    if (!handlerInstance) {
        throw new Error('[AIAssistantAdapter] AIAssistantHandler not initialized - call initializeAIAssistantHandler() first');
    }
    return handlerInstance;
}
/**
 * Reset handler instance (for testing)
 */
function resetAIAssistantHandler() {
    handlerInstance = null;
}
