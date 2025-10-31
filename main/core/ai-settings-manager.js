"use strict";
/**
 * AI Settings Manager
 * Manages persistent AI settings including default model selection
 * Stores settings as versioned ONE.core objects to maintain history
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISettingsManager = exports.DEFAULT_AI_SETTINGS = void 0;
exports.createAISettings = createAISettings;
var storage_versioned_objects_js_1 = require("@refinio/one.core/lib/storage-versioned-objects.js");
var object_js_1 = require("@refinio/one.core/lib/util/object.js");
/**
 * Default AI settings
 */
exports.DEFAULT_AI_SETTINGS = {
    $type$: 'GlobalLLMSettings',
    name: 'default', // Will be overridden with actual instance name
    defaultModelId: undefined,
    temperature: 0.7,
    maxTokens: 2048,
    defaultProvider: 'ollama',
    autoSelectBestModel: false,
    preferredModelIds: [],
    systemPrompt: undefined,
    streamResponses: true,
    autoSummarize: false,
    enableMCP: false
};
/**
 * Create AI settings object
 * Uses versioned objects to maintain settings history
 */
function createAISettings(instanceName) {
    if (instanceName === void 0) { instanceName = 'default'; }
    return {
        $type$: 'GlobalLLMSettings',
        name: instanceName,
        defaultProvider: 'ollama',
        autoSelectBestModel: false,
        preferredModelIds: [],
        defaultModelId: exports.DEFAULT_AI_SETTINGS.defaultModelId,
        temperature: exports.DEFAULT_AI_SETTINGS.temperature,
        maxTokens: exports.DEFAULT_AI_SETTINGS.maxTokens,
        systemPrompt: exports.DEFAULT_AI_SETTINGS.systemPrompt,
        streamResponses: exports.DEFAULT_AI_SETTINGS.streamResponses,
        autoSummarize: exports.DEFAULT_AI_SETTINGS.autoSummarize,
        enableMCP: exports.DEFAULT_AI_SETTINGS.enableMCP
    };
}
/**
 * Type guard for AI settings
 */
function isAISettings(obj) {
    return Boolean(obj && typeof obj === 'object' && '$type$' in obj && obj.$type$ === 'GlobalLLMSettings');
}
var AISettingsManager = /** @class */ (function () {
    function AISettingsManager(nodeOneCore) {
        this.nodeOneCore = nodeOneCore;
    }
    /**
     * Get settings ID hash - GlobalLLMSettings has no ID properties,
     * so all instances have the same ID hash (singleton pattern)
     */
    AISettingsManager.prototype.getSettingsIdHash = function () {
        return __awaiter(this, void 0, void 0, function () {
            var instanceName, idHash;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        instanceName = ((_a = this.nodeOneCore) === null || _a === void 0 ? void 0 : _a.instanceName) || 'default';
                        return [4 /*yield*/, (0, object_js_1.calculateIdHashOfObj)({
                                $type$: 'GlobalLLMSettings',
                                name: instanceName
                            })];
                    case 1:
                        idHash = _b.sent();
                        return [2 /*return*/, idHash];
                }
            });
        });
    };
    /**
     * Get or create AI settings object
     */
    AISettingsManager.prototype.getSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var idHash, result, error_1, instanceName, defaultSettings, storeResult, error_2, instanceName;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.getSettingsIdHash()
                            // Try to get existing settings
                        ];
                    case 1:
                        idHash = _c.sent();
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.getObjectByIdHash)(idHash)];
                    case 3:
                        result = _c.sent();
                        if (result && isAISettings(result.obj)) {
                            console.log('[AISettingsManager] Found existing settings');
                            return [2 /*return*/, result.obj];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _c.sent();
                        // Settings don't exist yet, will create below
                        console.log('[AISettingsManager] No existing settings found, creating defaults');
                        return [3 /*break*/, 5];
                    case 5:
                        instanceName = ((_a = this.nodeOneCore) === null || _a === void 0 ? void 0 : _a.instanceName) || 'default';
                        defaultSettings = createAISettings(instanceName);
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.storeVersionedObject)(defaultSettings)];
                    case 6:
                        storeResult = _c.sent();
                        console.log('[AISettingsManager] Created default settings');
                        return [2 /*return*/, storeResult.obj];
                    case 7:
                        error_2 = _c.sent();
                        console.error('[AISettingsManager] Error getting settings:', error_2);
                        instanceName = ((_b = this.nodeOneCore) === null || _b === void 0 ? void 0 : _b.instanceName) || 'default';
                        return [2 /*return*/, createAISettings(instanceName)];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the default model ID
     * Creates a new version of the settings
     */
    AISettingsManager.prototype.setDefaultModelId = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, updatedSettings, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.log('[AISettingsManager] Setting default model ID:', modelId);
                        return [4 /*yield*/, this.getSettings()];
                    case 1:
                        settings = _a.sent();
                        if (!settings) {
                            console.error('[AISettingsManager] No settings available');
                            return [2 /*return*/, false];
                        }
                        updatedSettings = __assign(__assign({}, settings), { defaultModelId: modelId !== null && modelId !== void 0 ? modelId : undefined });
                        // Remove metadata that shouldn't be in new version
                        delete updatedSettings.idHash;
                        delete updatedSettings.hash;
                        delete updatedSettings.$prevVersionHash$;
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.storeVersionedObject)(updatedSettings)];
                    case 2:
                        result = _a.sent();
                        console.log('[AISettingsManager] Updated settings with model:', modelId);
                        return [2 /*return*/, true];
                    case 3:
                        error_3 = _a.sent();
                        console.error('[AISettingsManager] Error updating default model ID:', error_3);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the default model ID
     * Returns null if no model is configured (undefined or empty string)
     */
    AISettingsManager.prototype.getDefaultModelId = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSettings()
                        // Return null if defaultModelId is undefined, null, or empty string
                    ];
                    case 1:
                        settings = _a.sent();
                        // Return null if defaultModelId is undefined, null, or empty string
                        return [2 /*return*/, (settings === null || settings === void 0 ? void 0 : settings.defaultModelId) || null];
                }
            });
        });
    };
    /**
     * Update AI settings with partial updates
     * Creates a new version of the settings
     */
    AISettingsManager.prototype.updateSettings = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var currentSettings, updatedSettings, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getSettings()];
                    case 1:
                        currentSettings = _a.sent();
                        if (!currentSettings) {
                            console.error('[AISettingsManager] No settings available');
                            return [2 /*return*/, null];
                        }
                        updatedSettings = __assign(__assign({}, currentSettings), updates);
                        // Remove metadata that shouldn't be in new version
                        delete updatedSettings.idHash;
                        delete updatedSettings.hash;
                        delete updatedSettings.$prevVersionHash$;
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.storeVersionedObject)(updatedSettings)];
                    case 2:
                        result = _a.sent();
                        console.log('[AISettingsManager] Updated settings');
                        return [2 /*return*/, result.obj];
                    case 3:
                        error_4 = _a.sent();
                        console.error('[AISettingsManager] Error updating settings:', error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get settings history
     * Returns the current version from storage
     */
    AISettingsManager.prototype.getSettingsHistory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getSettings()];
                    case 1:
                        settings = _a.sent();
                        return [2 /*return*/, settings ? [settings] : []];
                    case 2:
                        error_5 = _a.sent();
                        console.error('[AISettingsManager] Error getting settings history:', error_5);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return AISettingsManager;
}());
exports.AISettingsManager = AISettingsManager;
