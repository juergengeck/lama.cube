"use strict";
/**
 * Electron LLM Platform Implementation
 *
 * Implements LLMPlatform interface for Electron using BrowserWindow for UI events.
 * This adapter bridges lama.core's platform-agnostic LLM operations with Electron's
 * IPC system.
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
exports.ElectronLLMPlatform = void 0;
var ElectronLLMPlatform = /** @class */ (function () {
    function ElectronLLMPlatform(mainWindow) {
        this.mainWindow = mainWindow;
    }
    /**
     * Emit progress update via Electron IPC
     * Maps to 'message:thinking' event for UI
     */
    ElectronLLMPlatform.prototype.emitProgress = function (topicId, progress) {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return;
        }
        this.mainWindow.webContents.send('message:thinking', {
            conversationId: topicId,
            progress: progress,
        });
    };
    /**
     * Emit error via Electron IPC
     * Maps to 'ai:error' event for UI
     */
    ElectronLLMPlatform.prototype.emitError = function (topicId, error) {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return;
        }
        this.mainWindow.webContents.send('ai:error', {
            conversationId: topicId,
            error: error.message,
        });
    };
    /**
     * Emit message update via Electron IPC
     * Maps to 'message:stream' (streaming) or 'message:updated' (complete) events
     */
    ElectronLLMPlatform.prototype.emitMessageUpdate = function (topicId, messageId, text, status) {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return;
        }
        if (status === 'streaming') {
            this.mainWindow.webContents.send('message:stream', {
                conversationId: topicId,
                messageId: messageId,
                chunk: text,
                partial: text,
            });
        }
        else if (status === 'complete' || status === 'error') {
            this.mainWindow.webContents.send('message:updated', {
                conversationId: topicId,
                message: {
                    id: messageId,
                    conversationId: topicId,
                    text: text,
                    status: status === 'error' ? 'error' : 'sent',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };
    /**
     * Start MCP server (Node.js child process)
     * TODO: Implement when MCP manager is refactored to lama.core
     */
    ElectronLLMPlatform.prototype.startMCPServer = function (_modelId, _config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('MCP server management not yet implemented in refactored architecture');
            });
        });
    };
    /**
     * Stop MCP server
     * TODO: Implement when MCP manager is refactored to lama.core
     */
    ElectronLLMPlatform.prototype.stopMCPServer = function (_modelId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('MCP server management not yet implemented in refactored architecture');
            });
        });
    };
    /**
     * Read model file from disk (Node.js file system)
     * TODO: Implement when needed for model loading
     */
    ElectronLLMPlatform.prototype.readModelFile = function (_path) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('Model file reading not yet implemented in refactored architecture');
            });
        });
    };
    /**
     * Emit analysis update notification
     * Maps to 'keywords:updated' and/or 'subjects:updated' events for UI
     */
    ElectronLLMPlatform.prototype.emitAnalysisUpdate = function (topicId, analysisType) {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return;
        }
        console.log("[ElectronLLMPlatform] Emitting analysis update for ".concat(topicId, ": ").concat(analysisType));
        if (analysisType === 'keywords' || analysisType === 'both') {
            this.mainWindow.webContents.send('keywords:updated', {
                topicId: topicId,
            });
        }
        if (analysisType === 'subjects' || analysisType === 'both') {
            this.mainWindow.webContents.send('subjects:updated', {
                topicId: topicId,
            });
        }
    };
    return ElectronLLMPlatform;
}());
exports.ElectronLLMPlatform = ElectronLLMPlatform;
