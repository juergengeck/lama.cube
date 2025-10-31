"use strict";
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
/**
 * LLM Object Manager
 * Creates and manages LLM objects in ONE.core storage
 * These objects identify AI contacts by linking Person IDs to LLM models
 */
var storage_versioned_objects_js_1 = require("@refinio/one.core/lib/storage-versioned-objects.js");
var type_checks_js_1 = require("@refinio/one.core/lib/util/type-checks.js");
var LLMObjectManager = /** @class */ (function () {
    function LLMObjectManager(nodeOneCore) {
        this.nodeOneCore = nodeOneCore;
        this.llmObjects = new Map(); // modelId -> LLM object
        this.initialized = false;
    }
    /**
     * Initialize by loading existing LLM objects from storage
     */
    LLMObjectManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.initialized)
                    return [2 /*return*/];
                console.log('[LLMObjectManager] Initializing (cache will be populated by AIAssistantModel)');
                this.initialized = true;
                return [2 /*return*/];
            });
        });
    };
    /**
     * Create and store an LLM object for an AI model
     * This identifies the AI contact in ONE.core
     */
    LLMObjectManager.prototype.createLLMObject = function (modelId, modelName, personId) {
        return __awaiter(this, void 0, void 0, function () {
            var personIdHash, now, nowISOString, llmObject, storedObject, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[LLMObjectManager] Creating LLM object for ".concat(modelName));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        personIdHash = (0, type_checks_js_1.ensureIdHash)(personId);
                        // Check if we already have this LLM object cached
                        if (this.llmObjects.has(modelId)) {
                            console.log("[LLMObjectManager] LLM object already exists for ".concat(modelName, ", using cached version"));
                            return [2 /*return*/, this.llmObjects.get(modelId)];
                        }
                        now = Date.now();
                        nowISOString = new Date().toISOString();
                        llmObject = {
                            $type$: 'LLM',
                            modelId: modelId, // Required field - the unique identifier
                            name: modelName, // This is the ID field according to recipe (isId: true)
                            filename: "".concat(modelName.replace(/[\s:]/g, '-').toLowerCase(), ".gguf"), // Required field
                            modelType: (modelId.startsWith('ollama:') ? 'local' : 'remote'), // Required field
                            active: true, // Required field
                            deleted: false, // Required field
                            created: now, // Required field (timestamp)
                            modified: now, // Required field (timestamp)
                            createdAt: nowISOString, // Required field (ISO string)
                            lastUsed: nowISOString, // Required field (ISO string)
                            // Optional fields
                            personId: personIdHash,
                            provider: this.getProviderFromModelId(modelId),
                            capabilities: ['chat', 'inference'], // Must match regexp: chat or inference
                            maxTokens: 4096,
                            temperature: 0.7,
                            contextSize: 4096,
                            batchSize: 512,
                            threads: 4,
                            isAI: true // Mark as AI for source of truth
                        };
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.storeVersionedObject)(llmObject)];
                    case 2:
                        storedObject = _a.sent();
                        console.log("[LLMObjectManager] Stored LLM object with hash: ".concat(storedObject.hash));
                        // Cache the object
                        this.llmObjects.set(modelId, __assign(__assign({}, llmObject), { modelId: modelId, hash: storedObject.hash, idHash: storedObject.idHash, isAI: true // Ensure isAI flag is present in cache
                         }));
                        // Grant access to federation group for CHUM sync
                        return [4 /*yield*/, this.grantAccessToLLMObject(storedObject.idHash)];
                    case 3:
                        // Grant access to federation group for CHUM sync
                        _a.sent();
                        return [2 /*return*/, storedObject];
                    case 4:
                        error_1 = _a.sent();
                        console.error("[LLMObjectManager] Failed to create LLM object for ".concat(modelName, ":"), error_1);
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Grant access to LLM object for federation sync
     */
    LLMObjectManager.prototype.grantAccessToLLMObject = function (llmIdHash) {
        return __awaiter(this, void 0, void 0, function () {
            var createAccess, SET_ACCESS_MODE, federationGroup, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 1:
                        createAccess = (_a.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 2:
                        SET_ACCESS_MODE = (_a.sent()).SET_ACCESS_MODE;
                        federationGroup = this.nodeOneCore.federationGroup;
                        if (!federationGroup) {
                            console.warn('[LLMObjectManager] No federation group available');
                            return [2 /*return*/];
                        }
                        // Grant federation group access to the LLM object
                        return [4 /*yield*/, createAccess([{
                                    id: llmIdHash,
                                    person: [],
                                    group: [federationGroup.groupIdHash],
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 3:
                        // Grant federation group access to the LLM object
                        _a.sent();
                        console.log("[LLMObjectManager] Granted federation access to LLM object: ".concat(llmIdHash.toString().substring(0, 8), "..."));
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        console.error('[LLMObjectManager] Failed to grant access to LLM object:', error_2);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get provider from model ID
     */
    LLMObjectManager.prototype.getProviderFromModelId = function (modelId) {
        if (modelId.startsWith('ollama:'))
            return 'ollama';
        if (modelId.startsWith('claude:'))
            return 'claude';
        if (modelId.startsWith('gpt:'))
            return 'openai';
        return 'unknown';
    };
    /**
     * Get all LLM objects
     */
    LLMObjectManager.prototype.getAllLLMObjects = function () {
        return Array.from(this.llmObjects.values());
    };
    /**
     * Get LLM object by model ID (from cache)
     */
    LLMObjectManager.prototype.getLLMObject = function (modelId) {
        return this.llmObjects.get(modelId);
    };
    /**
     * Check if a personId belongs to an LLM
     * Only checks the in-memory cache - does NOT search storage
     * AIAssistantModel is responsible for loading all AI contacts into cache
     */
    LLMObjectManager.prototype.isLLMPerson = function (personId) {
        if (!personId)
            return false;
        var personIdStr = personId.toString();
        console.log("[LLMObjectManager] Checking if ".concat(String(personIdStr).substring(0, 8), "... is LLM, cache has ").concat(this.llmObjects.size, " entries"));
        var isLLM = Array.from(this.llmObjects.values()).some(function (llm) { return llm.personId && llm.personId.toString() === personIdStr; });
        if (isLLM) {
            console.log("[LLMObjectManager] Result: ".concat(String(personIdStr).substring(0, 8), "... is AI: true (cached)"));
            return true;
        }
        console.log("[LLMObjectManager] Result: ".concat(String(personIdStr).substring(0, 8), "... is AI: false"));
        return false;
    };
    /**
     * Get model ID for a given person ID (reverse lookup)
     * Only checks the in-memory cache
     */
    LLMObjectManager.prototype.getModelIdForPersonId = function (personId) {
        if (!personId)
            return null;
        var personIdStr = personId.toString();
        // Search through llmObjects map (modelId -> LLM object with personId)
        for (var _i = 0, _a = this.llmObjects; _i < _a.length; _i++) {
            var _b = _a[_i], modelId = _b[0], llmObj = _b[1];
            var llm = llmObj;
            if (llm.personId && llm.personId.toString() === personIdStr) {
                console.log("[LLMObjectManager] Found model ".concat(modelId, " for person ").concat(String(personIdStr).substring(0, 8), "..."));
                return modelId;
            }
        }
        console.log("[LLMObjectManager] No model found for person ".concat(String(personIdStr).substring(0, 8), "..."));
        return null;
    };
    /**
     * Add a person ID to cache without creating LLM object
     * Used when AI contacts already exist
     */
    LLMObjectManager.prototype.cacheAIPersonId = function (modelId, personId) {
        if (!this.llmObjects.has(modelId)) {
            // Create a minimal cache entry with isAI flag
            this.llmObjects.set(modelId, {
                modelId: modelId,
                personId: personId,
                isAI: true, // Mark as AI for source of truth
                cached: true // Mark as cached only
            });
            console.log("[LLMObjectManager] Cached AI person ".concat(personId.toString().substring(0, 8), "... for model ").concat(modelId));
        }
    };
    return LLMObjectManager;
}());
exports.default = LLMObjectManager;
