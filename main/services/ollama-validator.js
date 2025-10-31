"use strict";
/**
 * Ollama validation utilities
 * URL format validation and connection testing
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
exports.validateOllamaUrl = validateOllamaUrl;
exports.normalizeOllamaUrl = normalizeOllamaUrl;
exports.testOllamaConnection = testOllamaConnection;
exports.fetchOllamaModels = fetchOllamaModels;
var node_fetch_1 = require("node-fetch");
/**
 * Validate Ollama server URL format
 */
function validateOllamaUrl(baseUrl) {
    try {
        var url = new URL(baseUrl);
        // Check protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
            return {
                valid: false,
                error: 'URL must start with http:// or https://',
                errorCode: 'INVALID_URL',
            };
        }
        // Check hostname exists
        if (!url.hostname) {
            return {
                valid: false,
                error: 'Invalid URL: missing hostname',
                errorCode: 'INVALID_URL',
            };
        }
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            error: 'Invalid URL format. Must be http://hostname:port or https://hostname:port',
            errorCode: 'INVALID_URL',
        };
    }
}
/**
 * Normalize Ollama URL (add default port if missing, remove trailing slash)
 */
function normalizeOllamaUrl(baseUrl) {
    try {
        var url = new URL(baseUrl);
        // Add default port if not specified
        if (!url.port && url.protocol === 'http:') {
            url.port = '11434';
        }
        // Remove trailing slash
        var normalized = url.toString();
        if (normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    }
    catch (_a) {
        return baseUrl;
    }
}
/**
 * Test connection to Ollama server and fetch available models
 */
function testOllamaConnection(baseUrl, authToken) {
    return __awaiter(this, void 0, void 0, function () {
        var validation, normalizedUrl, headers, controller_1, timeoutId, response, data, models, formattedModels, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    validation = validateOllamaUrl(baseUrl);
                    if (!validation.valid) {
                        return [2 /*return*/, {
                                success: false,
                                error: validation.error,
                                errorCode: validation.errorCode,
                            }];
                    }
                    normalizedUrl = normalizeOllamaUrl(baseUrl);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    headers = {
                        'Content-Type': 'application/json',
                    };
                    if (authToken) {
                        headers['Authorization'] = "Bearer ".concat(authToken);
                    }
                    controller_1 = new AbortController();
                    timeoutId = setTimeout(function () { return controller_1.abort(); }, 2000);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(normalizedUrl, "/api/tags"), {
                            method: 'GET',
                            headers: headers,
                            signal: controller_1.signal,
                        })];
                case 2:
                    response = _a.sent();
                    clearTimeout(timeoutId);
                    // Check for auth failure
                    if (response.status === 401 || response.status === 403) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Authentication failed. Check credentials.',
                                errorCode: 'AUTH_FAILED',
                            }];
                    }
                    // Check if response is OK
                    if (!response.ok) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Server returned status ".concat(response.status),
                                errorCode: 'NETWORK_ERROR',
                            }];
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    models = data.models || [];
                    if (models.length === 0) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Server has no models installed.',
                                errorCode: 'NO_MODELS',
                            }];
                    }
                    formattedModels = models.map(function (model) { return ({
                        name: model.name || model.model,
                        size: model.size || 0,
                        modified: model.modified_at || model.modified || new Date().toISOString(),
                        digest: model.digest || '',
                    }); });
                    return [2 /*return*/, {
                            success: true,
                            models: formattedModels,
                            serverInfo: {
                                version: data.version,
                            },
                        }];
                case 4:
                    error_1 = _a.sent();
                    // Handle timeout
                    if (error_1.name === 'AbortError') {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Connection timeout. Server is unreachable.',
                                errorCode: 'NETWORK_ERROR',
                            }];
                    }
                    // Handle network errors
                    if (error_1.code === 'ECONNREFUSED' || error_1.code === 'ENOTFOUND' || error_1.code === 'ETIMEDOUT') {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Cannot connect to server. Check address and network.',
                                errorCode: 'NETWORK_ERROR',
                            }];
                    }
                    // Generic error
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message || 'Connection failed',
                            errorCode: 'NETWORK_ERROR',
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch available models from Ollama server
 * Similar to testOllamaConnection but just returns models list
 */
function fetchOllamaModels(baseUrl, authToken) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testOllamaConnection(baseUrl, authToken)];
                case 1:
                    result = _a.sent();
                    if (!result.success) {
                        error = result.error || 'Failed to fetch models';
                        throw new Error(error);
                    }
                    // Type guard: if success is true, result is TestConnectionSuccess
                    return [2 /*return*/, result.models || []];
            }
        });
    });
}
