"use strict";
/**
 * LM Studio Integration Service for Main Process
 * Handles communication with LM Studio via OpenAI-compatible API
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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLMStudioRunning = isLMStudioRunning;
exports.getAvailableModels = getAvailableModels;
exports.chatWithLMStudio = chatWithLMStudio;
exports.streamChatWithLMStudio = streamChatWithLMStudio;
var node_fetch_1 = require("node-fetch");
var LM_STUDIO_BASE_URL = 'http://localhost:1234/v1';
/**
 * Check if LM Studio is running
 */
function isLMStudioRunning() {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(LM_STUDIO_BASE_URL, "/models"))];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.ok];
                case 2:
                    error_1 = _a.sent();
                    console.log('[LMStudio] Service not running on localhost:1234');
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get available models from LM Studio
 */
function getAvailableModels() {
    return __awaiter(this, void 0, void 0, function () {
        var response, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(LM_STUDIO_BASE_URL, "/models"))];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, data.data || []];
                case 3:
                    error_2 = _a.sent();
                    console.error('[LMStudio] Failed to get models:', error_2);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Chat with LM Studio using OpenAI-compatible API
 */
function chatWithLMStudio(modelName_1, messages_1) {
    return __awaiter(this, arguments, void 0, function (modelName, messages, options) {
        var formattedMessages, requestBody, response, errorText, data, error_3;
        var _a, _b, _c, _d, _e, _f;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 5, , 6]);
                    console.log("[LMStudio] Chatting with ".concat(modelName, ", ").concat(messages.length, " messages"));
                    formattedMessages = messages.map(function (msg) { return ({
                        role: msg.role,
                        content: msg.content
                    }); });
                    console.log("[LMStudio] Sending ".concat(formattedMessages.length, " messages"));
                    requestBody = {
                        model: modelName || 'default', // LM Studio will use the loaded model
                        messages: formattedMessages,
                        temperature: (_a = options.temperature) !== null && _a !== void 0 ? _a : 0.7,
                        max_tokens: (_b = options.max_tokens) !== null && _b !== void 0 ? _b : 1000,
                        stream: false
                    };
                    console.log('[LMStudio] Request body:', JSON.stringify(requestBody, null, 2));
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(LM_STUDIO_BASE_URL, "/chat/completions"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(requestBody)
                        })];
                case 1:
                    response = _g.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    errorText = _g.sent();
                    throw new Error("LM Studio API error: ".concat(response.status, " - ").concat(errorText));
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    data = _g.sent();
                    console.log('[LMStudio] Response received:', ((_f = (_e = (_d = (_c = data.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) === null || _f === void 0 ? void 0 : _f.substring(0, 100)) + '...');
                    if (data.choices && data.choices.length > 0) {
                        return [2 /*return*/, data.choices[0].message.content];
                    }
                    throw new Error('No response from LM Studio');
                case 5:
                    error_3 = _g.sent();
                    console.error('[LMStudio] Chat error:', error_3);
                    throw error_3;
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Stream chat with LM Studio (returns an async generator)
 */
function streamChatWithLMStudio(modelName_1, messages_1) {
    return __asyncGenerator(this, arguments, function streamChatWithLMStudio_1(modelName, messages, options) {
        var formattedMessages, response, reader, buffer, _a, reader_1, reader_1_1, chunk, lines, _i, lines_1, line, data, parsed, e_1, e_2_1, error_4;
        var _b, e_2, _c, _d;
        var _e, _f, _g, _h, _j;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    _k.trys.push([0, 22, , 23]);
                    console.log("[LMStudio] Streaming chat with ".concat(modelName));
                    formattedMessages = messages.map(function (msg) { return ({
                        role: msg.role,
                        content: msg.content
                    }); });
                    return [4 /*yield*/, __await((0, node_fetch_1.default)("".concat(LM_STUDIO_BASE_URL, "/chat/completions"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: modelName || 'default',
                                messages: formattedMessages,
                                temperature: (_e = options.temperature) !== null && _e !== void 0 ? _e : 0.7,
                                max_tokens: (_f = options.max_tokens) !== null && _f !== void 0 ? _f : 1000,
                                stream: true
                            })
                        }))];
                case 1:
                    response = _k.sent();
                    if (!response.ok) {
                        throw new Error("LM Studio API error: ".concat(response.status));
                    }
                    reader = response.body;
                    buffer = '';
                    _k.label = 2;
                case 2:
                    _k.trys.push([2, 15, 16, 21]);
                    _a = true, reader_1 = __asyncValues(reader);
                    _k.label = 3;
                case 3: return [4 /*yield*/, __await(reader_1.next())];
                case 4:
                    if (!(reader_1_1 = _k.sent(), _b = reader_1_1.done, !_b)) return [3 /*break*/, 14];
                    _d = reader_1_1.value;
                    _a = false;
                    chunk = _d;
                    buffer += chunk.toString();
                    lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    _i = 0, lines_1 = lines;
                    _k.label = 5;
                case 5:
                    if (!(_i < lines_1.length)) return [3 /*break*/, 13];
                    line = lines_1[_i];
                    if (!line.startsWith('data: ')) return [3 /*break*/, 12];
                    data = line.slice(6);
                    if (!(data === '[DONE]')) return [3 /*break*/, 7];
                    return [4 /*yield*/, __await(void 0)];
                case 6: return [2 /*return*/, _k.sent()];
                case 7:
                    _k.trys.push([7, 11, , 12]);
                    parsed = JSON.parse(data);
                    if (!((_j = (_h = (_g = parsed.choices) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.delta) === null || _j === void 0 ? void 0 : _j.content)) return [3 /*break*/, 10];
                    return [4 /*yield*/, __await(parsed.choices[0].delta.content)];
                case 8: return [4 /*yield*/, _k.sent()];
                case 9:
                    _k.sent();
                    _k.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    e_1 = _k.sent();
                    console.error('[LMStudio] Failed to parse streaming data:', e_1);
                    return [3 /*break*/, 12];
                case 12:
                    _i++;
                    return [3 /*break*/, 5];
                case 13:
                    _a = true;
                    return [3 /*break*/, 3];
                case 14: return [3 /*break*/, 21];
                case 15:
                    e_2_1 = _k.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 21];
                case 16:
                    _k.trys.push([16, , 19, 20]);
                    if (!(!_a && !_b && (_c = reader_1.return))) return [3 /*break*/, 18];
                    return [4 /*yield*/, __await(_c.call(reader_1))];
                case 17:
                    _k.sent();
                    _k.label = 18;
                case 18: return [3 /*break*/, 20];
                case 19:
                    if (e_2) throw e_2.error;
                    return [7 /*endfinally*/];
                case 20: return [7 /*endfinally*/];
                case 21: return [3 /*break*/, 23];
                case 22:
                    error_4 = _k.sent();
                    console.error('[LMStudio] Stream error:', error_4);
                    throw error_4;
                case 23: return [2 /*return*/];
            }
        });
    });
}
