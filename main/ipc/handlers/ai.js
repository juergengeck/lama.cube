"use strict";
/**
 * AI IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to AIAssistantHandler methods.
 * Uses the refactored AIAssistantHandler from nodeOneCore.aiAssistantModel
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
var node_one_core_js_1 = require("../../core/node-one-core.js");
var llm_manager_singleton_js_1 = require("../../services/llm-manager-singleton.js");
var mcp_manager_js_1 = require("../../services/mcp-manager.js");
var settings_store_js_1 = require("@refinio/one.core/lib/system/settings-store.js");
var electron_1 = require("electron");
var BrowserWindow = electron_1.default.BrowserWindow;
/**
 * Get the AIAssistantHandler from nodeOneCore
 * This uses the refactored architecture with platform abstraction
 */
function getAIHandler() {
    if (!node_one_core_js_1.default.aiAssistantModel) {
        throw new Error('AI Assistant Handler not initialized - ONE.core not provisioned');
    }
    return node_one_core_js_1.default.aiAssistantModel;
}
/**
 * Thin IPC adapter - maps ipcMain.handle() calls to handler methods
 */
var aiHandlers = {
    /**
     * Chat with AI (with streaming support)
     */
    chat: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response, error_1;
            var messages = _b.messages, modelId = _b.modelId, _c = _b.stream, stream = _c === void 0 ? false : _c, topicId = _b.topicId;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        // Delegate to llmManager for chat operations
                        if (!modelId) {
                            return [2 /*return*/, { success: false, error: 'Model ID is required' }];
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, llm_manager_singleton_js_1.default.chat(messages, modelId, {
                                onStream: stream ? function (chunk) {
                                    event.sender.send('ai:stream', { chunk: chunk, topicId: topicId });
                                } : undefined
                            })];
                    case 2:
                        response = _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: {
                                    response: response,
                                    modelId: modelId,
                                    streamed: stream
                                }
                            }];
                    case 3:
                        error_1 = _d.sent();
                        return [2 /*return*/, { success: false, error: error_1.message }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Get available AI models
     */
    getModels: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var models;
            return __generator(this, function (_a) {
                try {
                    models = llm_manager_singleton_js_1.default.getAvailableModels();
                    return [2 /*return*/, {
                            success: true,
                            models: models.map(function (m) { return ({
                                id: m.id,
                                name: m.name,
                                provider: m.provider,
                                isLoaded: m.isLoaded || false
                            }); })
                        }];
                }
                catch (error) {
                    return [2 /*return*/, { success: false, error: error.message }];
                }
                return [2 /*return*/];
            });
        });
    },
    /**
     * Set default AI model
     * Note: LLMManager doesn't have default model concept, so this just validates the model exists
     */
    setDefaultModel: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var handler, error_2;
            var modelId = _b.modelId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        console.log("[AI IPC] Setting default model: ".concat(modelId));
                        handler = getAIHandler();
                        return [4 /*yield*/, handler.setDefaultModel(modelId)];
                    case 1:
                        _c.sent();
                        console.log("[AI IPC] \u2705 Default model set successfully: ".concat(modelId));
                        return [2 /*return*/, true];
                    case 2:
                        error_2 = _c.sent();
                        console.error('[AI IPC] ❌ setDefaultModel error:', error_2);
                        console.error('[AI IPC] ❌ Error stack:', error_2.stack);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Set API key for a provider
     */
    setApiKey: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var error_3;
            var provider = _b.provider, apiKey = _b.apiKey;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, settings_store_js_1.SettingsStore.setItem(provider + '_api_key', apiKey)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/, { success: true }];
                    case 2:
                        error_3 = _c.sent();
                        return [2 /*return*/, { success: false, error: error_3.message }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Get available MCP tools
     */
    getTools: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var tools;
            return __generator(this, function (_a) {
                try {
                    tools = llm_manager_singleton_js_1.default.mcpTools;
                    return [2 /*return*/, {
                            success: true,
                            tools: Array.from(tools.values())
                        }];
                }
                catch (error) {
                    return [2 /*return*/, { success: false, error: error.message }];
                }
                return [2 /*return*/];
            });
        });
    },
    /**
     * Execute an MCP tool
     */
    executeTool: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var result, error_4;
            var toolName = _b.toolName, parameters = _b.parameters;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, mcp_manager_js_1.default.executeTool(toolName, parameters, {})];
                    case 1:
                        result = _c.sent();
                        return [2 /*return*/, { success: true, result: result }];
                    case 2:
                        error_4 = _c.sent();
                        return [2 /*return*/, { success: false, error: error_4.message }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Initialize LLM manager
     */
    initializeLLM: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, llm_manager_singleton_js_1.default.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                    case 2:
                        error_5 = _a.sent();
                        return [2 /*return*/, { success: false, error: error_5.message }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Debug MCP tools registration
     */
    debugTools: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        success: true,
                        toolCount: llm_manager_singleton_js_1.default.mcpTools.size,
                        tools: Array.from(llm_manager_singleton_js_1.default.mcpTools.keys())
                    }];
            });
        });
    },
    /**
     * Get or create AI contact for a model
     */
    getOrCreateContact: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var handler, personId, error_6;
            var modelId = _b.modelId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        handler = getAIHandler();
                        return [4 /*yield*/, handler.ensureAIContactForModel(modelId)];
                    case 1:
                        personId = _c.sent();
                        return [2 /*return*/, { success: true, personId: personId }];
                    case 2:
                        error_6 = _c.sent();
                        return [2 /*return*/, { success: false, error: error_6.message }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Test an API key with the provider
     */
    testApiKey: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var provider = _b.provider, apiKey = _b.apiKey;
            return __generator(this, function (_c) {
                // TODO: Implement API key testing for each provider
                return [2 /*return*/, { success: true, valid: true }];
            });
        });
    },
    /**
     * Get the default model ID from AI settings
     */
    'ai:getDefaultModel': function (event) { return __awaiter(void 0, void 0, void 0, function () {
        var model, modelId;
        var _a;
        return __generator(this, function (_b) {
            try {
                // Get from AIAssistantHandler which loads from AISettingsManager
                if ((_a = node_one_core_js_1.default.aiAssistantModel) === null || _a === void 0 ? void 0 : _a.getDefaultModel) {
                    model = node_one_core_js_1.default.aiAssistantModel.getDefaultModel();
                    if (model) {
                        modelId = typeof model === 'string' ? model : model.id;
                        // CRITICAL: Return null if modelId is undefined or empty
                        // This ensures ModelOnboarding shows when no model is configured
                        return [2 /*return*/, modelId || null];
                    }
                }
                return [2 /*return*/, null];
            }
            catch (error) {
                console.error('[AI IPC] Error getting default model:', error);
                return [2 /*return*/, null];
            }
            return [2 /*return*/];
        });
    }); },
    /**
     * Discover Claude models from Anthropic API
     * Called after API key is saved to dynamically register available models
     */
    discoverClaudeModels: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, llm_manager_singleton_js_1.default.discoverClaudeModels()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                    case 2:
                        error_7 = _a.sent();
                        return [2 /*return*/, { success: false, error: error_7.message }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
};
exports.default = aiHandlers;
