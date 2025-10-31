"use strict";
/**
 * Ollama Integration Service for Main Process
 * Handles communication with local Ollama instance
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
exports.cancelAllOllamaRequests = cancelAllOllamaRequests;
exports.isOllamaRunning = isOllamaRunning;
exports.testOllamaModel = testOllamaModel;
exports.chatWithOllama = chatWithOllama;
exports.generateWithOllama = generateWithOllama;
var node_fetch_1 = require("node-fetch");
// AbortController is built into Node.js since v15.0.0, no import needed
// Track active requests with AbortControllers
var activeRequests = new Map();
// Generate unique request ID
var requestCounter = 0;
function getRequestId() {
    return "ollama-".concat(Date.now(), "-").concat(++requestCounter);
}
/**
 * Cancel all active Ollama requests
 */
function cancelAllOllamaRequests() {
    console.log("[Ollama] Cancelling ".concat(activeRequests.size, " active requests"));
    for (var _i = 0, activeRequests_1 = activeRequests; _i < activeRequests_1.length; _i++) {
        var _a = activeRequests_1[_i], id = _a[0], controller = _a[1];
        try {
            controller.abort();
            console.log("[Ollama] Cancelled request ".concat(id));
        }
        catch (error) {
            console.error("[Ollama] Error cancelling request ".concat(id, ":"), error);
        }
    }
    activeRequests.clear();
}
/**
 * Check if Ollama is running
 */
function isOllamaRunning() {
    return __awaiter(this, arguments, void 0, function (baseUrl, authHeaders) {
        var headers, response, error_1;
        if (baseUrl === void 0) { baseUrl = 'http://localhost:11434'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    headers = authHeaders || {};
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(baseUrl, "/api/tags"), { headers: headers })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.ok];
                case 2:
                    error_1 = _a.sent();
                    console.log("[Ollama] Service not running on ".concat(baseUrl));
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Test if a specific Ollama model is available
 */
function testOllamaModel(modelName_1) {
    return __awaiter(this, arguments, void 0, function (modelName, baseUrl, authHeaders) {
        var headers, response, error_2;
        if (baseUrl === void 0) { baseUrl = 'http://localhost:11434'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    headers = __assign({ 'Content-Type': 'application/json' }, (authHeaders || {}));
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(baseUrl, "/api/generate"), {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({
                                model: modelName,
                                prompt: 'test',
                                stream: false,
                                options: {
                                    num_predict: 1
                                }
                            })
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.ok];
                case 2:
                    error_2 = _a.sent();
                    console.error("[Ollama] Model ".concat(modelName, " test failed:"), error_2);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Chat with Ollama using the /api/chat endpoint
 *
 * @param options.format - Optional JSON schema for structured outputs (Ollama native)
 */
function chatWithOllama(modelName_1, messages_1) {
    return __awaiter(this, arguments, void 0, function (modelName, messages, options, baseUrl, authHeaders) {
        var requestId, controller, systemMessages, nonSystemMessages, recentNonSystemMessages, formattedMessages, startTime, headers, useStreaming, requestBody, response_1, json, content, fullResponse_1, firstChunkTime_1, buffer_1, json, content, responseTime, error_3;
        var _a;
        if (options === void 0) { options = {}; }
        if (baseUrl === void 0) { baseUrl = 'http://localhost:11434'; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    requestId = getRequestId();
                    controller = new AbortController();
                    // Track this request
                    activeRequests.set(requestId, controller);
                    console.log("[Ollama] Starting request ".concat(requestId, " to ").concat(baseUrl));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    systemMessages = messages.filter(function (msg) { return msg.role === 'system'; });
                    nonSystemMessages = messages.filter(function (msg) { return msg.role !== 'system'; });
                    recentNonSystemMessages = nonSystemMessages.slice(-10) // Keep more context
                    ;
                    formattedMessages = __spreadArray(__spreadArray([], systemMessages, true), recentNonSystemMessages, true);
                    startTime = Date.now();
                    headers = __assign({ 'Content-Type': 'application/json', 'Connection': 'keep-alive' }, (authHeaders || {}));
                    useStreaming = !options.format;
                    requestBody = {
                        model: modelName,
                        messages: formattedMessages,
                        stream: useStreaming,
                        options: {
                            temperature: options.temperature || 0.7,
                            num_predict: options.max_tokens || -1, // -1 = unlimited, let model stop naturally via EOS
                            top_k: 40,
                            top_p: 0.95
                        }
                    };
                    // Add format parameter for structured outputs (Ollama native)
                    if (options.format) {
                        requestBody.format = options.format;
                        console.log('[Ollama] ========== OLLAMA STRUCTURED OUTPUT ==========');
                        console.log('[Ollama] Using structured output format (JSON schema)');
                        console.log('[Ollama] Stream disabled for structured output');
                        console.log('[Ollama] Format schema:', JSON.stringify(options.format, null, 2));
                        console.log('[Ollama] ==============================================');
                    }
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(baseUrl, "/api/chat"), {
                            method: 'POST',
                            headers: headers,
                            signal: controller.signal,
                            body: JSON.stringify(requestBody)
                        })];
                case 2:
                    response_1 = _b.sent();
                    if (!response_1.ok) {
                        throw new Error("Ollama API error: ".concat(response_1.statusText));
                    }
                    if (!!useStreaming) return [3 /*break*/, 4];
                    return [4 /*yield*/, response_1.json()
                        // Handle different response formats
                    ];
                case 3:
                    json = _b.sent();
                    content = ((_a = json.message) === null || _a === void 0 ? void 0 : _a.content) || json.thinking || '';
                    console.log("[Ollama] Non-streaming response: ".concat(content.substring(0, 200), "..."));
                    if (!content) {
                        throw new Error('Ollama generated no response');
                    }
                    return [2 /*return*/, content];
                case 4:
                    fullResponse_1 = '';
                    firstChunkTime_1 = null;
                    buffer_1 = '';
                    // For node-fetch v2, we need to handle the stream differently
                    response_1.body.on('data', function (chunk) {
                        if (!firstChunkTime_1) {
                            firstChunkTime_1 = Date.now();
                        }
                        buffer_1 += chunk.toString();
                        var lines = buffer_1.split('\n');
                        // Keep the last incomplete line in the buffer
                        buffer_1 = lines.pop() || '';
                        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                            var line = lines_1[_i];
                            if (!line.trim())
                                continue;
                            try {
                                var json = JSON.parse(line);
                                // Handle different response formats:
                                // 1. Regular models: json.message.content
                                // 2. Reasoning models (gpt-oss, deepseek-r1): json.thinking
                                var content = '';
                                if (json.message && json.message.content) {
                                    content = json.message.content;
                                }
                                else if (json.thinking) {
                                    // Reasoning models use 'thinking' field
                                    content = json.thinking;
                                }
                                if (content) {
                                    fullResponse_1 += content;
                                    // Stream to callback if provided
                                    if (options.onStream) {
                                        options.onStream(content, false);
                                    }
                                }
                            }
                            catch (e) {
                                console.error('[Ollama] Error parsing JSON line:', e.message, 'Line:', line);
                            }
                        }
                    });
                    // Wait for the stream to finish
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            response_1.body.on('end', resolve);
                            response_1.body.on('error', reject);
                        })
                        // Process any remaining buffer
                    ];
                case 5:
                    // Wait for the stream to finish
                    _b.sent();
                    // Process any remaining buffer
                    if (buffer_1.trim()) {
                        try {
                            json = JSON.parse(buffer_1);
                            content = '';
                            if (json.message && json.message.content) {
                                content = json.message.content;
                            }
                            else if (json.thinking) {
                                // Reasoning models use 'thinking' field
                                content = json.thinking;
                            }
                            if (content) {
                                fullResponse_1 += content;
                                if (options.onStream) {
                                    options.onStream(content, false);
                                }
                            }
                        }
                        catch (e) {
                            console.error('[Ollama] Error parsing final JSON:', e.message);
                        }
                    }
                    responseTime = Date.now() - startTime;
                    console.log("[Ollama] \u23F1\uFE0F Full response completed in ".concat(responseTime, "ms"));
                    // Handle empty response - fail fast, no fallback
                    if (!fullResponse_1 || fullResponse_1 === '') {
                        throw new Error('Ollama generated no response - model may not support structured output or failed to generate');
                    }
                    {
                        console.log('[Ollama] ========== OLLAMA RESPONSE TRACE ==========');
                        console.log('[Ollama] Full response length:', fullResponse_1.length);
                        console.log('[Ollama] Full response (first 500 chars):', fullResponse_1.substring(0, 500));
                        console.log('[Ollama] Full response (last 200 chars):', fullResponse_1.substring(Math.max(0, fullResponse_1.length - 200)));
                        console.log('[Ollama] ===========================================');
                    }
                    // Clean up request tracking
                    activeRequests.delete(requestId);
                    console.log("[Ollama] Completed request ".concat(requestId));
                    return [2 /*return*/, fullResponse_1];
                case 6:
                    error_3 = _b.sent();
                    console.error("[Ollama] Chat error for request ".concat(requestId, ":"), error_3);
                    // Clean up on error
                    activeRequests.delete(requestId);
                    // Handle abort
                    if (error_3.name === 'AbortError') {
                        console.log("[Ollama] Request ".concat(requestId, " was aborted"));
                        throw new Error('Request was cancelled');
                    }
                    // Fallback response if Ollama is not available
                    if (error_3.message.includes('ECONNREFUSED')) {
                        return [2 /*return*/, "I'm sorry, but I can't connect to the Ollama service. Please make sure Ollama is running on your system (http://localhost:11434). You can start it with 'ollama serve' in your terminal."];
                    }
                    throw error_3;
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate completion with Ollama
 */
function generateWithOllama(modelName_1, prompt_1) {
    return __awaiter(this, arguments, void 0, function (modelName, prompt, options, baseUrl, authHeaders) {
        if (options === void 0) { options = {}; }
        if (baseUrl === void 0) { baseUrl = 'http://localhost:11434'; }
        return __generator(this, function (_a) {
            return [2 /*return*/, chatWithOllama(modelName, [{ role: 'user', content: prompt }], options, baseUrl, authHeaders)];
        });
    });
}
