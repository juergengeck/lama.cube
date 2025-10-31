"use strict";
/**
 * Topic Analysis IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to TopicAnalysisHandler methods.
 * Business logic lives in ../../../lama.core/handlers/TopicAnalysisHandler.ts
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
exports.extractConversationKeywords = exports.extractRealtimeKeywords = exports.mergeSubjects = exports.extractKeywords = exports.updateSummary = exports.getConversationRestartContext = exports.getSummary = exports.getSubjects = exports.analyzeMessages = void 0;
var TopicAnalysisHandler_js_1 = require("@lama/core/handlers/TopicAnalysisHandler.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
var llm_manager_singleton_js_1 = require("../../services/llm-manager-singleton.js");
// Create handler instance
var topicAnalysisHandler = new TopicAnalysisHandler_js_1.TopicAnalysisHandler(node_one_core_js_1.default.topicAnalysisModel, node_one_core_js_1.default.topicModel, llm_manager_singleton_js_1.default, node_one_core_js_1.default);
// Initialize handler with models after nodeOneCore is ready
if (node_one_core_js_1.default.initialized && node_one_core_js_1.default.topicAnalysisModel) {
    topicAnalysisHandler.setModels(node_one_core_js_1.default.topicAnalysisModel, node_one_core_js_1.default.topicModel, llm_manager_singleton_js_1.default, node_one_core_js_1.default);
}
/**
 * Thin IPC adapter - maps ipcMain.handle() calls to handler methods
 */
var topicAnalysisHandlers = {
    /**
     * Analyze messages to extract subjects and keywords
     */
    analyzeMessages: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var topicId = _b.topicId, messages = _b.messages, _c = _b.forceReanalysis, forceReanalysis = _c === void 0 ? false : _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.analyzeMessages({
                            topicId: topicId,
                            messages: messages,
                            forceReanalysis: forceReanalysis
                        })];
                    case 1: return [2 /*return*/, _d.sent()];
                }
            });
        });
    },
    /**
     * Get all subjects for a topic
     */
    getSubjects: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var topicId = _b.topicId, _c = _b.includeArchived, includeArchived = _c === void 0 ? false : _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.getSubjects({
                            topicId: topicId,
                            includeArchived: includeArchived
                        })];
                    case 1: return [2 /*return*/, _d.sent()];
                }
            });
        });
    },
    /**
     * Get summary for a topic
     */
    getSummary: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var topicId = _b.topicId, version = _b.version, _c = _b.includeHistory, includeHistory = _c === void 0 ? false : _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.getSummary({
                            topicId: topicId,
                            version: version,
                            includeHistory: includeHistory
                        })];
                    case 1: return [2 /*return*/, _d.sent()];
                }
            });
        });
    },
    /**
     * Generate conversation restart context for LLM continuity
     */
    getConversationRestartContext: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var topicId = _b.topicId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.getConversationRestartContext({
                            topicId: topicId
                        })];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        });
    },
    /**
     * Update or create summary for a topic
     */
    updateSummary: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var chatHandlerGetMessages;
            var _this = this;
            var topicId = _b.topicId, content = _b.content, changeReason = _b.changeReason, _c = _b.autoGenerate, autoGenerate = _c === void 0 ? false : _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        chatHandlerGetMessages = function (params) { return __awaiter(_this, void 0, void 0, function () {
                            var chatHandlers;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./chat.js'); })];
                                    case 1:
                                        chatHandlers = (_a.sent()).chatHandlers;
                                        return [4 /*yield*/, chatHandlers.getMessages(event, params)];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); };
                        return [4 /*yield*/, topicAnalysisHandler.updateSummary({ topicId: topicId, content: content, changeReason: changeReason, autoGenerate: autoGenerate }, chatHandlerGetMessages)];
                    case 1: return [2 /*return*/, _d.sent()];
                }
            });
        });
    },
    /**
     * Extract keywords from text using LLM
     */
    extractKeywords: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var text = _b.text, _c = _b.limit, limit = _c === void 0 ? 10 : _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.extractKeywords({
                            text: text,
                            limit: limit
                        })];
                    case 1: return [2 /*return*/, _d.sent()];
                }
            });
        });
    },
    /**
     * Merge two subjects into one
     */
    mergeSubjects: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var topicId = _b.topicId, subjectId1 = _b.subjectId1, subjectId2 = _b.subjectId2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.mergeSubjects({
                            topicId: topicId,
                            subjectId1: subjectId1,
                            subjectId2: subjectId2
                        })];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        });
    },
    /**
     * Extract single-word keywords for real-time display
     */
    extractRealtimeKeywords: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var text = _b.text, _c = _b.existingKeywords, existingKeywords = _c === void 0 ? [] : _c, _d = _b.maxKeywords, maxKeywords = _d === void 0 ? 15 : _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.extractRealtimeKeywords({
                            text: text,
                            existingKeywords: existingKeywords,
                            maxKeywords: maxKeywords
                        })];
                    case 1: return [2 /*return*/, _e.sent()];
                }
            });
        });
    },
    /**
     * Extract keywords from all messages in a conversation
     */
    extractConversationKeywords: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var chatHandlerGetMessages;
            var _this = this;
            var topicId = _b.topicId, _c = _b.messages, messages = _c === void 0 ? [] : _c, _d = _b.maxKeywords, maxKeywords = _d === void 0 ? 15 : _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        chatHandlerGetMessages = function (params) { return __awaiter(_this, void 0, void 0, function () {
                            var chatHandlers;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./chat.js'); })];
                                    case 1:
                                        chatHandlers = (_a.sent()).chatHandlers;
                                        return [4 /*yield*/, chatHandlers.getMessages(event, params)];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); };
                        return [4 /*yield*/, topicAnalysisHandler.extractConversationKeywords({ topicId: topicId, messages: messages, maxKeywords: maxKeywords }, chatHandlerGetMessages)];
                    case 1: return [2 /*return*/, _e.sent()];
                }
            });
        });
    },
    /**
     * Get all keywords for a topic
     */
    getKeywords: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, topicAnalysisHandler.getKeywords({
                            topicId: params.topicId,
                            limit: params.limit
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    }
};
// Export handlers
exports.analyzeMessages = topicAnalysisHandlers.analyzeMessages, exports.getSubjects = topicAnalysisHandlers.getSubjects, exports.getSummary = topicAnalysisHandlers.getSummary, exports.getConversationRestartContext = topicAnalysisHandlers.getConversationRestartContext, exports.updateSummary = topicAnalysisHandlers.updateSummary, exports.extractKeywords = topicAnalysisHandlers.extractKeywords, exports.mergeSubjects = topicAnalysisHandlers.mergeSubjects, exports.extractRealtimeKeywords = topicAnalysisHandlers.extractRealtimeKeywords, exports.extractConversationKeywords = topicAnalysisHandlers.extractConversationKeywords;
exports.default = topicAnalysisHandlers;
