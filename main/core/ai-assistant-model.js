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
exports.AIAssistantModel = void 0;
/**
 * AI Assistant Model for managing AI interactions
 * This class handles AI personas, LLM objects, and message processing
 */
var electron_1 = require("electron");
var ai_settings_manager_js_1 = require("./ai-settings-manager.js");
var llm_object_manager_js_1 = require("./llm-object-manager.js");
var ContextEnrichmentService_js_1 = require("@lama/core/one-ai/services/ContextEnrichmentService.js");
var llm_manager_singleton_js_1 = require("../services/llm-manager-singleton.js");
var BrowserWindow = electron_1.default.BrowserWindow;
var AIAssistantModel = /** @class */ (function () {
    function AIAssistantModel(nodeOneCore) {
        this.nodeOneCore = nodeOneCore;
        this.llmManager = null;
        this.llmObjectManager = null;
        this.contextEnrichmentService = null;
        this.aiSettingsManager = null;
        this.platform = null;
        this.isInitialized = false;
        this.topicModelMap = new Map();
        this.defaultModelId = null; // AI assistant owns this
        this.lastRestartPoint = new Map();
        this.topicRestartSummaries = new Map();
        // Cache for AI contacts - modelId -> personId
        this.aiContacts = new Map();
        // Message queue for topics being initialized (topicId -> array of queued messages)
        this.pendingMessageQueues = new Map();
        // Topics currently generating welcome messages (topicId -> promise)
        this.welcomeGenerationInProgress = new Map();
    }
    /**
     * Pre-initialize connections to LLM services
     * This is called early to warm up connections before user needs them
     */
    AIAssistantModel.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[AIAssistantModel] Pre-warming LLM connections...');
                        try {
                            // Use the statically imported LLM manager
                            if (llm_manager_singleton_js_1.default) {
                                this.llmManager = llm_manager_singleton_js_1.default;
                                // Pre-warm Ollama connection by checking if it's available
                                Promise.resolve().then(function () { return require('../services/ollama.js'); }).then(function (ollama) { return __awaiter(_this, void 0, void 0, function () {
                                    var isRunning;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, ollama.isOllamaRunning()];
                                            case 1:
                                                isRunning = _a.sent();
                                                if (isRunning) {
                                                    console.log('[AIAssistantModel] ✅ Ollama service detected');
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }).catch(function () {
                                    // Silently fail - Ollama might not be running
                                });
                                // Pre-warm LM Studio connection
                                Promise.resolve().then(function () { return require('../services/lmstudio.js'); }).then(function (lmstudio) { return __awaiter(_this, void 0, void 0, function () {
                                    var isRunning;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, lmstudio.isLMStudioRunning()];
                                            case 1:
                                                isRunning = _a.sent();
                                                if (isRunning) {
                                                    console.log('[AIAssistantModel] ✅ LM Studio service detected');
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }).catch(function () {
                                    // Silently fail - LM Studio might not be running
                                });
                            }
                        }
                        catch (error) {
                            console.log('[AIAssistantModel] Could not check LLM services:', error instanceof Error ? error.message : String(error));
                        }
                        // Now initialize the rest of the model
                        return [4 /*yield*/, this.initialize(this.llmManager)];
                    case 1:
                        // Now initialize the rest of the model
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initialize the AI Assistant Model
     */
    AIAssistantModel.prototype.initialize = function (llmManagerInstance, platformInstance) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, topicAnalysisModel;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log('[AIAssistantModel] Initializing...');
                        // Only set llmManager if we don't already have it from init()
                        if (!this.llmManager && llmManagerInstance) {
                            this.llmManager = llmManagerInstance;
                        }
                        // Set platform if provided
                        if (!this.platform && platformInstance) {
                            this.platform = platformInstance;
                        }
                        // Create AISettingsManager using static import
                        this.aiSettingsManager = new ai_settings_manager_js_1.AISettingsManager(this.nodeOneCore);
                        // Get saved default model ID directly
                        _a = this;
                        return [4 /*yield*/, this.aiSettingsManager.getDefaultModelId()];
                    case 1:
                        // Get saved default model ID directly
                        _a.defaultModelId = _d.sent();
                        if (this.defaultModelId) {
                            console.log('[AIAssistantModel] Restored default model from storage:', this.defaultModelId);
                            // Register private variant for LAMA conversations
                            if (this.llmManager && ((_b = this.llmManager) === null || _b === void 0 ? void 0 : _b.registerPrivateVariantForModel)) {
                                (_c = this.llmManager) === null || _c === void 0 ? void 0 : _c.registerPrivateVariantForModel(this.defaultModelId);
                            }
                        }
                        // Create LLMObjectManager using static import
                        this.llmObjectManager = new llm_object_manager_js_1.default(this.nodeOneCore);
                        console.log('[AIAssistantModel] Created LLMObjectManager');
                        // Initialize context enrichment service if topic analysis model is available
                        try {
                            topicAnalysisModel = this.nodeOneCore.topicAnalysisModel;
                            if (topicAnalysisModel && this.nodeOneCore.channelManager) {
                                this.contextEnrichmentService = new ContextEnrichmentService_js_1.ContextEnrichmentService(this.nodeOneCore.channelManager, topicAnalysisModel);
                                console.log('[AIAssistantModel] ✅ Context enrichment service initialized');
                            }
                        }
                        catch (error) {
                            console.warn('[AIAssistantModel] Context enrichment not available:', error);
                        }
                        this.isInitialized = true;
                        console.log('[AIAssistantModel] ✅ Initialized');
                        // Load existing AI contacts into cache first (needed for scanning)
                        return [4 /*yield*/, this.loadExistingAIContacts()
                            // Now scan existing conversations for AI participants and register them
                        ];
                    case 2:
                        // Load existing AI contacts into cache first (needed for scanning)
                        _d.sent();
                        // Now scan existing conversations for AI participants and register them
                        return [4 /*yield*/, this.scanExistingConversations()
                            // Don't create LAMA topic here - it will be created when default model is set
                            // This prevents duplicate creation and ensures proper participant setup
                        ];
                    case 3:
                        // Now scan existing conversations for AI participants and register them
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ensure default AI chats (Hi and LAMA) exist with welcome messages
     * This is the SINGLE entry point for creating AI default chats
     *
     * CRITICAL: This method serves two purposes:
     * 1. Register existing 'hi' and 'lama' topics if they exist (even without a default model)
     * 2. Create new ones if they don't exist (requires a default model)
     */
    // REMOVED: ensureDefaultChats() - replaced with proper create/update logic in setDefaultModel()
    /**
     * Check if a topic exists and register it if found
     * Returns true if the topic exists, false otherwise
     */
    AIAssistantModel.prototype.checkAndRegisterExistingTopic = function (topicId) {
        return __awaiter(this, void 0, void 0, function () {
            var topic, getIdObject, group, _i, _a, memberId, modelId, defaultModel, modelId, finalModelId, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.nodeOneCore.topicModel.topics.queryById(topicId)];
                    case 1:
                        topic = _b.sent();
                        if (!(topic && topic.group)) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        getIdObject = (_b.sent()).getIdObject;
                        return [4 /*yield*/, getIdObject(topic.group)];
                    case 3:
                        group = _b.sent();
                        if (group.members) {
                            for (_i = 0, _a = group.members; _i < _a.length; _i++) {
                                memberId = _a[_i];
                                modelId = this.getModelIdForPersonId(memberId);
                                // CRITICAL: For LAMA, the group has the -private Person
                                // getModelIdForPersonId returns the -private model ID
                                // We need to keep it as-is for LAMA
                                if (modelId) {
                                    // Found the AI participant - register the topic with the ACTUAL model (including -private suffix)
                                    this.registerAITopic(topicId, modelId);
                                    console.log("[AIAssistantModel] Registered existing topic '".concat(topicId, "' with model: ").concat(modelId));
                                    return [2 /*return*/, true];
                                }
                            }
                        }
                        defaultModel = this.getDefaultModel();
                        if (defaultModel) {
                            modelId = typeof defaultModel === 'string' ? defaultModel : defaultModel.id;
                            finalModelId = topicId === 'lama' ? "".concat(modelId, "-private") : modelId;
                            this.registerAITopic(topicId, finalModelId);
                            console.log("[AIAssistantModel] Registered orphaned topic '".concat(topicId, "' with default model: ").concat(finalModelId));
                            return [2 /*return*/, true];
                        }
                        _b.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        e_1 = _b.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/, false];
                }
            });
        });
    };
    /**
     * Ensure Hi chat exists with static welcome message
     */
    /**
     * Create Hi chat - throws if it already exists
     */
    AIAssistantModel.prototype.createHiChat = function (modelId, aiPersonId) {
        return __awaiter(this, void 0, void 0, function () {
            var topicRoom, staticWelcome;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[AIAssistantModel] Creating Hi chat...');
                        // Create the topic - this will throw if it already exists
                        return [4 /*yield*/, this.nodeOneCore.topicGroupManager.createGroupTopic('Hi', 'hi', [aiPersonId])
                            // Register as AI topic
                        ];
                    case 1:
                        // Create the topic - this will throw if it already exists
                        _a.sent();
                        // Register as AI topic
                        this.registerAITopic('hi', modelId);
                        return [4 /*yield*/, this.nodeOneCore.topicModel.enterTopicRoom('hi')];
                    case 2:
                        topicRoom = _a.sent();
                        staticWelcome = "Hi! I'm LAMA, your local AI assistant.\n\nYou can make me your own, give me a name of your choice, give me a persistent identity.\n\nWe treat LLM as first-class citizens - they're communication peers just like people - and I will manage their learnings for you.\n\nThe LAMA chat below is my memory. You can configure its visibility in Settings. All I learn from your conversations gets stored there for context, and is fully transparent for you. Nobody else can see this content.\n\nWhat can I help you with today?";
                        return [4 /*yield*/, topicRoom.sendMessage(staticWelcome, aiPersonId, aiPersonId)];
                    case 3:
                        _a.sent();
                        console.log('[AIAssistantModel] ✅ Created Hi chat with static welcome');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create LAMA chat - throws if it already exists
     */
    AIAssistantModel.prototype.createLamaChat = function (privateModelId, privateAiPersonId) {
        return __awaiter(this, void 0, void 0, function () {
            var topicRoom;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[AIAssistantModel] Creating LAMA chat with private model: ".concat(privateModelId));
                        // Create the topic with the PRIVATE AI contact - this will throw if it already exists
                        return [4 /*yield*/, this.nodeOneCore.topicGroupManager.createGroupTopic('LAMA', 'lama', [privateAiPersonId])
                            // Register as AI topic with the PRIVATE model ID
                        ];
                    case 1:
                        // Create the topic with the PRIVATE AI contact - this will throw if it already exists
                        _a.sent();
                        // Register as AI topic with the PRIVATE model ID
                        this.registerAITopic('lama', privateModelId);
                        return [4 /*yield*/, this.nodeOneCore.topicModel.enterTopicRoom('lama')];
                    case 2:
                        topicRoom = _a.sent();
                        setImmediate(function () {
                            _this.handleNewTopic('lama', topicRoom).catch(function (err) {
                                console.error('[AIAssistantModel] Failed to generate LAMA welcome:', err);
                            });
                        });
                        console.log('[AIAssistantModel] ✅ Created LAMA chat, generating welcome message');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update topic participant when changing models
     */
    AIAssistantModel.prototype.updateTopicParticipant = function (topicId, newAiPersonId) {
        return __awaiter(this, void 0, void 0, function () {
            var groupIdHash, _a, getIdObject, getObjectByIdHash, group, hashGroup, participants, newParticipants, storeVersionedObject, storeUnversionedObject, newHashGroup, hashGroupResult, updatedGroup;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[AIAssistantModel] Updating topic ".concat(topicId, " participant to ").concat(String(newAiPersonId).substring(0, 8), "..."));
                        groupIdHash = this.nodeOneCore.topicGroupManager.conversationGroups.get(topicId);
                        if (!groupIdHash) {
                            throw new Error("No group found for topic ".concat(topicId));
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 1:
                        _a = _b.sent(), getIdObject = _a.getIdObject, getObjectByIdHash = _a.getObjectByIdHash;
                        return [4 /*yield*/, getIdObject(groupIdHash)];
                    case 2:
                        group = _b.sent();
                        return [4 /*yield*/, getObjectByIdHash(group.hashGroup)];
                    case 3:
                        hashGroup = _b.sent();
                        participants = hashGroup.obj.members || [];
                        newParticipants = participants.filter(function (p) {
                            // Keep if it's not an AI contact (i.e., it's the owner)
                            return !_this.isAIPerson(p);
                        });
                        // Add new AI participant
                        newParticipants.push(newAiPersonId);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 4:
                        storeVersionedObject = (_b.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 5:
                        storeUnversionedObject = (_b.sent()).storeUnversionedObject;
                        newHashGroup = {
                            $type$: 'HashGroup',
                            members: newParticipants
                        };
                        return [4 /*yield*/, storeUnversionedObject(newHashGroup)
                            // Update the group to reference new HashGroup (use .hash from result)
                        ];
                    case 6:
                        hashGroupResult = _b.sent();
                        updatedGroup = {
                            $type$: 'Group',
                            $versionHash$: group.$versionHash$,
                            name: group.name,
                            hashGroup: hashGroupResult.hash
                        };
                        return [4 /*yield*/, storeVersionedObject(updatedGroup)];
                    case 7:
                        _b.sent();
                        console.log("[AIAssistantModel] \u2705 Updated topic ".concat(topicId, " participant"));
                        return [2 /*return*/];
                }
            });
        });
    };
    // REMOVED: createLamaTopicWithWelcome() - deprecated, use ensureDefaultChats() instead
    /**
     * Load existing AI contacts by checking Person profiles against available models
     * IMPORTANT: This must be called before scanExistingConversations()
     * so that isLLMPerson() can identify AI participants in topics
     */
    AIAssistantModel.prototype.loadExistingAIContacts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var availableModels, others, aiContactCount, _i, others_1, someone, personId, getIdObject, person, email, personIdShort, emailPrefix, _a, availableModels_1, model, expectedEmailPrefix, error_1, err_1, _b, _c, _d, modelId, personId, error_2;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        console.log('[AIAssistantModel] Loading existing AI contacts...');
                        if (!this.nodeOneCore.leuteModel || !this.llmManager) {
                            console.log('[AIAssistantModel] LeuteModel or LLMManager not available');
                            return [2 /*return*/];
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 18, , 19]);
                        availableModels = this.llmManager.getAvailableModels();
                        console.log("[AIAssistantModel] Found ".concat(availableModels.length, " available AI models"));
                        return [4 /*yield*/, this.nodeOneCore.leuteModel.others()];
                    case 2:
                        others = _e.sent();
                        console.log("[AIAssistantModel] Found ".concat(others.length, " total contacts"));
                        aiContactCount = 0;
                        _i = 0, others_1 = others;
                        _e.label = 3;
                    case 3:
                        if (!(_i < others_1.length)) return [3 /*break*/, 17];
                        someone = others_1[_i];
                        _e.label = 4;
                    case 4:
                        _e.trys.push([4, 15, , 16]);
                        return [4 /*yield*/, someone.mainIdentity()
                            // Try to match this Person against known AI models by email pattern
                            // AI contacts have emails like "claude_claude-sonnet-4-5-20250929@ai.local"
                        ];
                    case 5:
                        personId = _e.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 6:
                        getIdObject = (_e.sent()).getIdObject;
                        return [4 /*yield*/, getIdObject(personId)];
                    case 7:
                        person = _e.sent();
                        email = person.email || '';
                        personIdShort = personId.toString().substring(0, 8);
                        console.log("[AIAssistantModel] Checking contact: email=\"".concat(email, "\", personId=").concat(personIdShort, "..."));
                        if (!email.endsWith('@ai.local')) return [3 /*break*/, 14];
                        console.log("[AIAssistantModel] \uD83D\uDD0D Contact ".concat(personIdShort, " has @ai.local email, checking if it matches a model..."));
                        emailPrefix = email.replace('@ai.local', '');
                        _a = 0, availableModels_1 = availableModels;
                        _e.label = 8;
                    case 8:
                        if (!(_a < availableModels_1.length)) return [3 /*break*/, 14];
                        model = availableModels_1[_a];
                        expectedEmailPrefix = model.id.replace(/[^a-zA-Z0-9]/g, '_');
                        if (!(emailPrefix === expectedEmailPrefix)) return [3 /*break*/, 13];
                        console.log("[AIAssistantModel] \u2705 Found AI contact: ".concat(model.id, " (person: ").concat(personId.toString().substring(0, 8), "...)"));
                        // Cache the AI contact
                        this.aiContacts.set(model.id, personId);
                        if (!this.llmObjectManager) return [3 /*break*/, 12];
                        _e.label = 9;
                    case 9:
                        _e.trys.push([9, 11, , 12]);
                        // This will check cache first, then create if needed
                        return [4 /*yield*/, this.createLLMObjectForAI(model.id, model.name, personId)];
                    case 10:
                        // This will check cache first, then create if needed
                        _e.sent();
                        console.log("[AIAssistantModel] Ensured LLM object for ".concat(model.id));
                        return [3 /*break*/, 12];
                    case 11:
                        error_1 = _e.sent();
                        console.warn("[AIAssistantModel] Could not create LLM object for ".concat(model.id, ":"), error_1);
                        // Fallback to cache-only
                        this.llmObjectManager.cacheAIPersonId(model.id, personId);
                        return [3 /*break*/, 12];
                    case 12:
                        aiContactCount++;
                        return [3 /*break*/, 14]; // Found the model, no need to check others
                    case 13:
                        _a++;
                        return [3 /*break*/, 8];
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        err_1 = _e.sent();
                        console.warn('[AIAssistantModel] Error processing contact:', err_1);
                        return [3 /*break*/, 16];
                    case 16:
                        _i++;
                        return [3 /*break*/, 3];
                    case 17:
                        console.log("[AIAssistantModel] \u2705 Loaded ".concat(aiContactCount, " AI contacts from ").concat(others.length, " total contacts"));
                        // Log all AI contacts for debugging
                        console.log("[AIAssistantModel] AI Contacts cache:");
                        for (_b = 0, _c = this.aiContacts; _b < _c.length; _b++) {
                            _d = _c[_b], modelId = _d[0], personId = _d[1];
                            console.log("[AIAssistantModel]   - ".concat(modelId, " \u2192 ").concat(personId.toString().substring(0, 8), "..."));
                        }
                        return [3 /*break*/, 19];
                    case 18:
                        error_2 = _e.sent();
                        console.error('[AIAssistantModel] Failed to load AI contacts:', error_2);
                        return [3 /*break*/, 19];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Scan existing conversations for AI participants and register them as AI topics
     * Uses channel participants as source of truth
     * NOTE: Requires loadExistingAIContacts() to be called first so that
     * llmObjectManager.isLLMPerson() can identify AI participants
     */
    AIAssistantModel.prototype.scanExistingConversations = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allChannels, registeredCount, _i, allChannels_1, channelInfo, topicId, topic, e_2, aiModelId, getIdObject, group, _a, _b, memberId, modelId, e_3, topicRoom, messages, _c, messages_1, msg, msgSender, modelId, e_4, err_2, error_3;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        console.log('[AIAssistantModel] Scanning existing conversations for AI participants...');
                        if (!this.nodeOneCore.channelManager || !this.nodeOneCore.topicModel) {
                            console.log('[AIAssistantModel] ChannelManager or TopicModel not available');
                            return [2 /*return*/];
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 22, , 23]);
                        return [4 /*yield*/, this.nodeOneCore.channelManager.getMatchingChannelInfos()];
                    case 2:
                        allChannels = _e.sent();
                        console.log("[AIAssistantModel] Found ".concat(allChannels.length, " channels to scan"));
                        registeredCount = 0;
                        _i = 0, allChannels_1 = allChannels;
                        _e.label = 3;
                    case 3:
                        if (!(_i < allChannels_1.length)) return [3 /*break*/, 21];
                        channelInfo = allChannels_1[_i];
                        _e.label = 4;
                    case 4:
                        _e.trys.push([4, 19, , 20]);
                        topicId = channelInfo.id;
                        console.log("[AIAssistantModel] \uD83D\uDD0D Scanning channel: ".concat(topicId));
                        // Skip if already registered
                        if (this.topicModelMap.has(topicId)) {
                            console.log("[AIAssistantModel] Topic ".concat(topicId, " already registered, skipping"));
                            return [3 /*break*/, 20];
                        }
                        topic = null;
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.nodeOneCore.topicModel.topics.queryById(topicId)];
                    case 6:
                        topic = _e.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_2 = _e.sent();
                        return [3 /*break*/, 20];
                    case 8:
                        if (!topic) {
                            return [3 /*break*/, 20];
                        }
                        aiModelId = null;
                        if (!topic.group) return [3 /*break*/, 13];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 9:
                        getIdObject = (_e.sent()).getIdObject;
                        _e.label = 10;
                    case 10:
                        _e.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, getIdObject(topic.group)
                            // Check group members
                        ];
                    case 11:
                        group = _e.sent();
                        // Check group members
                        if (group.members) {
                            for (_a = 0, _b = group.members; _a < _b.length; _a++) {
                                memberId = _b[_a];
                                modelId = this.getModelIdForPersonId(memberId);
                                if (modelId) {
                                    aiModelId = modelId;
                                    console.log("[AIAssistantModel] Found AI participant in ".concat(topicId, " (via Group): ").concat(modelId));
                                    break;
                                }
                            }
                        }
                        return [3 /*break*/, 13];
                    case 12:
                        e_3 = _e.sent();
                        console.warn("[AIAssistantModel] Could not get group for topic ".concat(topicId, ":"), e_3);
                        return [3 /*break*/, 13];
                    case 13:
                        if (!(!aiModelId && !(topic.group))) return [3 /*break*/, 18];
                        console.log("[AIAssistantModel] Topic ".concat(topicId, " has no Group, checking messages for AI participant..."));
                        _e.label = 14;
                    case 14:
                        _e.trys.push([14, 17, , 18]);
                        return [4 /*yield*/, this.nodeOneCore.topicModel.enterTopicRoom(topicId)];
                    case 15:
                        topicRoom = _e.sent();
                        return [4 /*yield*/, topicRoom.retrieveAllMessages()
                            // Check senders in messages to find AI participant
                        ];
                    case 16:
                        messages = _e.sent();
                        // Check senders in messages to find AI participant
                        for (_c = 0, messages_1 = messages; _c < messages_1.length; _c++) {
                            msg = messages_1[_c];
                            msgSender = ((_d = msg.data) === null || _d === void 0 ? void 0 : _d.sender) || msg.author;
                            if (msgSender) {
                                modelId = this.getModelIdForPersonId(msgSender);
                                if (modelId) {
                                    aiModelId = modelId;
                                    console.log("[AIAssistantModel] Found AI participant in ".concat(topicId, " (via messages): ").concat(modelId));
                                    break;
                                }
                            }
                        }
                        return [3 /*break*/, 18];
                    case 17:
                        e_4 = _e.sent();
                        console.warn("[AIAssistantModel] Could not check messages for topic ".concat(topicId, ":"), e_4);
                        return [3 /*break*/, 18];
                    case 18:
                        // Register the topic if we found an AI participant
                        if (aiModelId) {
                            this.registerAITopic(topicId, aiModelId);
                            registeredCount++;
                            console.log("[AIAssistantModel] \u2705 Registered existing AI topic: ".concat(topicId, " with model: ").concat(aiModelId));
                        }
                        return [3 /*break*/, 20];
                    case 19:
                        err_2 = _e.sent();
                        console.warn("[AIAssistantModel] Error scanning channel ".concat(channelInfo.id, ":"), err_2);
                        return [3 /*break*/, 20];
                    case 20:
                        _i++;
                        return [3 /*break*/, 3];
                    case 21:
                        console.log("[AIAssistantModel] \u2705 Registered ".concat(registeredCount, " existing AI topics"));
                        return [3 /*break*/, 23];
                    case 22:
                        error_3 = _e.sent();
                        console.error('[AIAssistantModel] Failed to scan conversations:', error_3);
                        return [3 /*break*/, 23];
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Register an AI topic
     */
    AIAssistantModel.prototype.registerAITopic = function (topicId, modelId) {
        console.log("[AIAssistantModel] Registered AI topic: ".concat(topicId, " with model: ").concat(modelId));
        this.topicModelMap.set(topicId, modelId);
    };
    /**
     * Check if a topic is an AI topic
     */
    AIAssistantModel.prototype.isAITopic = function (topicId) {
        return this.topicModelMap.has(topicId);
    };
    /**
     * Get the model ID for a topic
     */
    AIAssistantModel.prototype.getModelIdForTopic = function (topicId) {
        var _a;
        return ((_a = this.topicModelMap) === null || _a === void 0 ? void 0 : _a.get(topicId)) || null;
    };
    /**
     * Process a message for AI response with context enrichment
     */
    AIAssistantModel.prototype.processMessage = function (topicId, message, senderId) {
        return __awaiter(this, void 0, void 0, function () {
            var welcomeInProgress, modelId, aiPersonId_1, topicRoom, messages, _a, needsRestart, restartContext, history_1, veryRecentMessages, _i, veryRecentMessages_1, msg, text, msgSender, isAIRestart, contextHints, error_4, recentMessages, _b, recentMessages_1, msg, text, msgSender, isAIMessage, lastHistoryMsg, messageId_1, conversationId_1, fullResponse_1, windows, _c, windows_1, window_1, result_1, response, _d, _e, window_2, error_5;
            var _this = this;
            var _f, _g, _h, _j, _k, _l;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0:
                        console.log("[AIAssistantModel] Processing message for topic ".concat(topicId, ": \"").concat(message, "\""));
                        welcomeInProgress = this.welcomeGenerationInProgress.get(topicId);
                        if (welcomeInProgress) {
                            console.log("[AIAssistantModel] Welcome generation in progress for ".concat(topicId, ", queuing message"));
                            // Queue this message to be processed after welcome is complete
                            if (!this.pendingMessageQueues.has(topicId)) {
                                this.pendingMessageQueues.set(topicId, []);
                            }
                            this.pendingMessageQueues.get(topicId).push({ message: message, senderId: senderId });
                            return [2 /*return*/, null]; // Don't process now, will be processed after welcome
                        }
                        _m.label = 1;
                    case 1:
                        _m.trys.push([1, 15, , 16]);
                        modelId = (_f = this.topicModelMap) === null || _f === void 0 ? void 0 : _f.get(topicId);
                        if (!modelId) {
                            console.log('[AIAssistantModel] No AI model registered for this topic');
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, this.ensureAIContactForModel(modelId)];
                    case 2:
                        aiPersonId_1 = _m.sent();
                        if (!aiPersonId_1) {
                            console.error('[AIAssistantModel] Could not get AI person ID');
                            return [2 /*return*/, null];
                        }
                        // Check if the message is from the AI itself
                        if (senderId === aiPersonId_1) {
                            console.log('[AIAssistantModel] Message is from AI, skipping response');
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, this.nodeOneCore.topicModel.enterTopicRoom(topicId)
                            // Get conversation history
                        ];
                    case 3:
                        topicRoom = _m.sent();
                        return [4 /*yield*/, topicRoom.retrieveAllMessages()
                            // Check if we need to restart the conversation due to context window limits
                        ];
                    case 4:
                        messages = _m.sent();
                        return [4 /*yield*/, this.checkContextWindowAndPrepareRestart(topicId, messages)
                            // Build message history with proper role detection
                        ];
                    case 5:
                        _a = _m.sent(), needsRestart = _a.needsRestart, restartContext = _a.restartContext;
                        history_1 = [];
                        if (!(needsRestart && restartContext)) return [3 /*break*/, 6];
                        // Use summary-based restart context
                        history_1 === null || history_1 === void 0 ? void 0 : history_1.push({
                            role: 'system',
                            content: restartContext
                        });
                        console.log('[AIAssistantModel] Using summary-based restart context');
                        veryRecentMessages = messages.slice(-3);
                        for (_i = 0, veryRecentMessages_1 = veryRecentMessages; _i < veryRecentMessages_1.length; _i++) {
                            msg = veryRecentMessages_1[_i];
                            text = ((_g = msg.data) === null || _g === void 0 ? void 0 : _g.text) || msg.text;
                            msgSender = ((_h = msg.data) === null || _h === void 0 ? void 0 : _h.sender) || msg.author;
                            isAIRestart = this.isAIPerson(msgSender);
                            if (text && text.trim()) {
                                history_1 === null || history_1 === void 0 ? void 0 : history_1.push({
                                    role: isAIRestart ? 'assistant' : 'user',
                                    content: text
                                });
                            }
                        }
                        return [3 /*break*/, 11];
                    case 6:
                        if (!this.contextEnrichmentService) return [3 /*break*/, 10];
                        _m.label = 7;
                    case 7:
                        _m.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, this.contextEnrichmentService.buildEnhancedContext(topicId, messages)];
                    case 8:
                        contextHints = _m.sent();
                        if (contextHints) {
                            history_1 === null || history_1 === void 0 ? void 0 : history_1.push({
                                role: 'system',
                                content: contextHints
                            });
                            console.log("[AIAssistantModel] Added context hints: ".concat(String(contextHints).substring(0, 100), "..."));
                        }
                        return [3 /*break*/, 10];
                    case 9:
                        error_4 = _m.sent();
                        console.warn('[AIAssistantModel] Context enrichment failed:', error_4);
                        return [3 /*break*/, 10];
                    case 10:
                        recentMessages = messages.slice(-10);
                        for (_b = 0, recentMessages_1 = recentMessages; _b < recentMessages_1.length; _b++) {
                            msg = recentMessages_1[_b];
                            text = ((_j = msg.data) === null || _j === void 0 ? void 0 : _j.text) || msg.text;
                            msgSender = ((_k = msg.data) === null || _k === void 0 ? void 0 : _k.sender) || msg.author;
                            isAIMessage = this.isAIPerson(msgSender);
                            if (text && text.trim()) {
                                history_1 === null || history_1 === void 0 ? void 0 : history_1.push({
                                    role: isAIMessage ? 'assistant' : 'user',
                                    content: text
                                });
                            }
                        }
                        _m.label = 11;
                    case 11:
                        lastHistoryMsg = history_1[(history_1 === null || history_1 === void 0 ? void 0 : history_1.length) - 1];
                        if (!lastHistoryMsg || lastHistoryMsg.content !== message) {
                            history_1 === null || history_1 === void 0 ? void 0 : history_1.push({
                                role: 'user',
                                content: message
                            });
                        }
                        console.log("[AIAssistantModel] Sending ".concat(history_1 === null || history_1 === void 0 ? void 0 : history_1.length, " messages to LLM"));
                        messageId_1 = "ai-".concat(Date.now());
                        conversationId_1 = topicId;
                        fullResponse_1 = '';
                        // Send thinking indicator to UI
                        console.log("[AIAssistantModel] \uD83C\uDFAF\uD83C\uDFAF\uD83C\uDFAF EMITTING message:thinking with conversationId=\"".concat(conversationId_1, "\" (from topicId=\"").concat(topicId, "\")"));
                        windows = BrowserWindow.getAllWindows();
                        for (_c = 0, windows_1 = windows; _c < windows_1.length; _c++) {
                            window_1 = windows_1[_c];
                            window_1.webContents.send('message:thinking', {
                                conversationId: conversationId_1,
                                messageId: messageId_1,
                                senderId: aiPersonId_1,
                                isAI: true
                            });
                        }
                        return [4 /*yield*/, ((_l = this.llmManager) === null || _l === void 0 ? void 0 : _l.chatWithAnalysis(history_1, modelId, {
                                onStream: function (chunk) {
                                    fullResponse_1 += chunk;
                                    // Send streaming updates to UI
                                    for (var _i = 0, _a = BrowserWindow.getAllWindows(); _i < _a.length; _i++) {
                                        var window_3 = _a[_i];
                                        window_3.webContents.send('message:stream', {
                                            conversationId: conversationId_1,
                                            messageId: messageId_1,
                                            chunk: chunk,
                                            partial: fullResponse_1,
                                            senderId: aiPersonId_1,
                                            isAI: true
                                        });
                                    }
                                }
                            }, topicId))]; // Pass topicId for analysis
                    case 12:
                        result_1 = _m.sent() // Pass topicId for analysis
                        ;
                        response = result_1 === null || result_1 === void 0 ? void 0 : result_1.response;
                        // Debug: Log what we got from chatWithAnalysis
                        console.log('[AIAssistantModel] chatWithAnalysis result:', {
                            hasResponse: !!(result_1 === null || result_1 === void 0 ? void 0 : result_1.response),
                            hasAnalysis: !!(result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis),
                            analysisKeys: (result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis) ? Object.keys(result_1.analysis) : []
                        });
                        // ALWAYS process analysis first (even if response is empty)
                        // This ensures subjects/keywords are extracted from EVERY message
                        if (result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis) {
                            setImmediate(function () { return __awaiter(_this, void 0, void 0, function () {
                                var _loop_1, this_1, _i, _a, subjectData, error_6;
                                var _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            _e.trys.push([0, 8, , 9]);
                                            console.log('[AIAssistantModel] Processing analysis in background...');
                                            console.log('[AIAssistantModel] Full analysis object:', JSON.stringify(result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis, null, 2));
                                            if (!((result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis.subjects) && Array.isArray(result_1.analysis.subjects) && this.nodeOneCore.topicAnalysisModel)) return [3 /*break*/, 5];
                                            console.log("[AIAssistantModel] Processing ".concat(result_1.analysis.subjects.length, " subjects..."));
                                            _loop_1 = function (subjectData) {
                                                var name_1, description, isNew, subjectKeywords, keywordTerms, subject, _f, _g, keyword, term, subjects, existing, subjectId;
                                                return __generator(this, function (_h) {
                                                    switch (_h.label) {
                                                        case 0:
                                                            name_1 = subjectData.name, description = subjectData.description, isNew = subjectData.isNew, subjectKeywords = subjectData.keywords;
                                                            console.log("[AIAssistantModel] Subject data:", JSON.stringify(subjectData, null, 2));
                                                            console.log("[AIAssistantModel] Processing subject: ".concat(name_1, " (isNew: ").concat(isNew, ")"));
                                                            console.log("[AIAssistantModel] Keywords array:", subjectKeywords);
                                                            if (!isNew) return [3 /*break*/, 6];
                                                            keywordTerms = (subjectKeywords === null || subjectKeywords === void 0 ? void 0 : subjectKeywords.map(function (kw) { return kw.term || kw; })) || [];
                                                            console.log("[AIAssistantModel] Extracted keyword terms:", keywordTerms);
                                                            return [4 /*yield*/, this_1.nodeOneCore.topicAnalysisModel.createSubject(topicId, keywordTerms, name_1, description, 0.8 // confidence score
                                                                )];
                                                        case 1:
                                                            subject = _h.sent();
                                                            console.log("[AIAssistantModel] Created new subject: ".concat(name_1, " with ID hash: ").concat(subject.idHash));
                                                            _f = 0, _g = subjectKeywords || [];
                                                            _h.label = 2;
                                                        case 2:
                                                            if (!(_f < _g.length)) return [3 /*break*/, 5];
                                                            keyword = _g[_f];
                                                            term = keyword.term || keyword;
                                                            return [4 /*yield*/, this_1.nodeOneCore.topicAnalysisModel.addKeywordToSubject(topicId, term, subject.idHash)];
                                                        case 3:
                                                            _h.sent();
                                                            _h.label = 4;
                                                        case 4:
                                                            _f++;
                                                            return [3 /*break*/, 2];
                                                        case 5:
                                                            console.log("[AIAssistantModel] Created ".concat((subjectKeywords === null || subjectKeywords === void 0 ? void 0 : subjectKeywords.length) || 0, " keywords for subject: ").concat(name_1));
                                                            // Notify UI that subjects have been updated using platform abstraction
                                                            if ((_b = this_1.platform) === null || _b === void 0 ? void 0 : _b.emitAnalysisUpdate) {
                                                                this_1.platform.emitAnalysisUpdate(topicId, 'subjects');
                                                                console.log("[AIAssistantModel] Emitted subjects analysis update for topic ".concat(topicId));
                                                            }
                                                            return [3 /*break*/, 9];
                                                        case 6: return [4 /*yield*/, this_1.nodeOneCore.topicAnalysisModel.getSubjects(topicId)];
                                                        case 7:
                                                            subjects = _h.sent();
                                                            existing = subjects.find(function (s) { return s.keywordCombination === name_1; });
                                                            if (!existing) return [3 /*break*/, 9];
                                                            subjectId = existing.id;
                                                            if (!existing.archived) return [3 /*break*/, 9];
                                                            return [4 /*yield*/, this_1.nodeOneCore.topicAnalysisModel.unarchiveSubject(topicId, existing.id)];
                                                        case 8:
                                                            _h.sent();
                                                            console.log("[AIAssistantModel] Reactivated subject: ".concat(name_1));
                                                            // Notify UI that subject was reactivated using platform abstraction
                                                            if ((_c = this_1.platform) === null || _c === void 0 ? void 0 : _c.emitAnalysisUpdate) {
                                                                this_1.platform.emitAnalysisUpdate(topicId, 'subjects');
                                                                console.log("[AIAssistantModel] Emitted subjects analysis update for topic ".concat(topicId));
                                                            }
                                                            _h.label = 9;
                                                        case 9: return [2 /*return*/];
                                                    }
                                                });
                                            };
                                            this_1 = this;
                                            _i = 0, _a = result_1.analysis.subjects;
                                            _e.label = 1;
                                        case 1:
                                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                                            subjectData = _a[_i];
                                            return [5 /*yield**/, _loop_1(subjectData)];
                                        case 2:
                                            _e.sent();
                                            _e.label = 3;
                                        case 3:
                                            _i++;
                                            return [3 /*break*/, 1];
                                        case 4:
                                            // Notify UI that keywords have been updated for all subjects using platform abstraction
                                            if ((_d = this.platform) === null || _d === void 0 ? void 0 : _d.emitAnalysisUpdate) {
                                                this.platform.emitAnalysisUpdate(topicId, 'keywords');
                                                console.log("[AIAssistantModel] Emitted keywords analysis update for topic ".concat(topicId));
                                            }
                                            _e.label = 5;
                                        case 5:
                                            if (!((result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis.summaryUpdate) && this.nodeOneCore.topicAnalysisModel)) return [3 /*break*/, 7];
                                            return [4 /*yield*/, this.nodeOneCore.topicAnalysisModel.updateSummary(topicId, result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis.summaryUpdate, 0.8 // confidence score
                                                )];
                                        case 6:
                                            _e.sent();
                                            console.log("[AIAssistantModel] Updated summary: ".concat((String(result_1 === null || result_1 === void 0 ? void 0 : result_1.analysis.summaryUpdate)).substring(0, 50), "..."));
                                            _e.label = 7;
                                        case 7: return [3 /*break*/, 9];
                                        case 8:
                                            error_6 = _e.sent();
                                            console.error('[AIAssistantModel] Error processing analysis:', error_6);
                                            return [3 /*break*/, 9];
                                        case 9: return [2 /*return*/];
                                    }
                                });
                            }); });
                        }
                        if (!response) return [3 /*break*/, 14];
                        // Send the response to the topic
                        return [4 /*yield*/, topicRoom.sendMessage(response, aiPersonId_1, aiPersonId_1)];
                    case 13:
                        // Send the response to the topic
                        _m.sent();
                        console.log("[AIAssistantModel] Sent AI response to topic ".concat(topicId));
                        // Notify UI about the complete message
                        for (_d = 0, _e = BrowserWindow.getAllWindows(); _d < _e.length; _d++) {
                            window_2 = _e[_d];
                            window_2.webContents.send('message:updated', {
                                conversationId: conversationId_1,
                                message: {
                                    id: messageId_1,
                                    conversationId: conversationId_1,
                                    text: response,
                                    senderId: aiPersonId_1,
                                    isAI: true,
                                    timestamp: new Date().toISOString(),
                                    status: 'sent'
                                }
                            });
                        }
                        return [2 /*return*/, response];
                    case 14: return [2 /*return*/, null];
                    case 15:
                        error_5 = _m.sent();
                        console.error('[AIAssistantModel] Error processing message:', error_5);
                        return [2 /*return*/, null];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get or create person ID for a model
     */
    AIAssistantModel.prototype.getOrCreatePersonIdForModel = function (model) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAIContactForModel(model.id)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Create an AI contact using standard LeuteModel flow
     * Only adds AI-specific tracking via LLMObjectManager
     */
    AIAssistantModel.prototype.createAIContact = function (modelId, displayName) {
        return __awaiter(this, void 0, void 0, function () {
            var leuteModel, cached, others, _i, others_2, someone, existingPersonId, err_3, email, personData, storeVersionedObject, result, personIdHashResult, ensureIdHash, personIdHash, _a, createDefaultKeys, hasDefaultKeys, others, existingSomeone, _b, others_3, someone, someoneId, ProfileModel, SomeoneModel, myId, profile, storeVersionedObject_1, newSomeone, result_2, error_7, error_8;
            var _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        console.log("[AIAssistantModel] Setting up AI contact for ".concat(displayName, " (").concat(modelId, ")"));
                        leuteModel = this.nodeOneCore.leuteModel;
                        if (!leuteModel) {
                            console.error('[AIAssistantModel] LeuteModel not available');
                            return [2 /*return*/, null];
                        }
                        cached = (_c = this.aiContacts) === null || _c === void 0 ? void 0 : _c.get(modelId);
                        if (!cached) return [3 /*break*/, 8];
                        return [4 /*yield*/, leuteModel.others()];
                    case 1:
                        others = _f.sent();
                        _i = 0, others_2 = others;
                        _f.label = 2;
                    case 2:
                        if (!(_i < others_2.length)) return [3 /*break*/, 7];
                        someone = others_2[_i];
                        _f.label = 3;
                    case 3:
                        _f.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, someone.mainIdentity()];
                    case 4:
                        existingPersonId = _f.sent();
                        if (existingPersonId === cached) {
                            console.log("[AIAssistantModel] Using cached contact for ".concat(modelId, ": ").concat(cached.toString().substring(0, 8), "..."));
                            return [2 /*return*/, cached];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_3 = _f.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        // Cache was stale - Person not in contacts
                        console.log("[AIAssistantModel] Cached Person ID for ".concat(modelId, " not in contacts, recreating..."));
                        this.aiContacts.delete(modelId);
                        _f.label = 8;
                    case 8:
                        _f.trys.push([8, 31, , 32]);
                        email = "".concat(modelId.replace(/[^a-zA-Z0-9]/g, '_'), "@ai.local");
                        personData = {
                            $type$: 'Person',
                            email: email,
                            name: displayName
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 9:
                        storeVersionedObject = (_f.sent()).storeVersionedObject;
                        return [4 /*yield*/, storeVersionedObject(personData)];
                    case 10:
                        result = _f.sent();
                        personIdHashResult = typeof result === 'object' && (result === null || result === void 0 ? void 0 : result.idHash) ? result === null || result === void 0 ? void 0 : result.idHash : result;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/type-checks.js'); })];
                    case 11:
                        ensureIdHash = (_f.sent()).ensureIdHash;
                        personIdHash = ensureIdHash(personIdHashResult);
                        console.log("[AIAssistantModel] Person ID: ".concat(personIdHash.toString().substring(0, 8), "..."));
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/keychain/keychain.js'); })];
                    case 12:
                        _a = _f.sent(), createDefaultKeys = _a.createDefaultKeys, hasDefaultKeys = _a.hasDefaultKeys;
                        return [4 /*yield*/, hasDefaultKeys(personIdHash)];
                    case 13:
                        if (!!(_f.sent())) return [3 /*break*/, 15];
                        return [4 /*yield*/, createDefaultKeys(personIdHash)];
                    case 14:
                        _f.sent();
                        console.log("[AIAssistantModel] Created cryptographic keys");
                        _f.label = 15;
                    case 15: return [4 /*yield*/, leuteModel.others()];
                    case 16:
                        others = _f.sent();
                        existingSomeone = null;
                        for (_b = 0, others_3 = others; _b < others_3.length; _b++) {
                            someone = others_3[_b];
                            try {
                                someoneId = someone.someoneId;
                                if (someoneId === modelId) {
                                    existingSomeone = someone;
                                    console.log("[AIAssistantModel] Someone with modelId ".concat(modelId, " already exists in contacts"));
                                    break;
                                }
                            }
                            catch (err) {
                                // Continue checking
                            }
                        }
                        if (!!existingSomeone) return [3 /*break*/, 25];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/ProfileModel.js'); })];
                    case 17:
                        ProfileModel = (_f.sent()).default;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/SomeoneModel.js'); })];
                    case 18:
                        SomeoneModel = (_f.sent()).default;
                        return [4 /*yield*/, leuteModel.myMainIdentity()];
                    case 19:
                        myId = _f.sent();
                        return [4 /*yield*/, ProfileModel.constructWithNewProfile(personIdHash, myId, 'default')];
                    case 20:
                        profile = _f.sent();
                        (_d = profile.personDescriptions) === null || _d === void 0 ? void 0 : _d.push({
                            $type$: 'PersonName',
                            name: displayName
                        });
                        return [4 /*yield*/, profile.saveAndLoad()];
                    case 21:
                        _f.sent();
                        console.log("[AIAssistantModel] Created profile: ".concat(profile.idHash.toString().substring(0, 8), "..."));
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 22:
                        storeVersionedObject_1 = (_f.sent()).storeVersionedObject;
                        newSomeone = {
                            $type$: 'Someone',
                            someoneId: modelId,
                            mainProfile: profile.idHash,
                            identities: new Map([[personIdHash, new Set([profile.idHash])]])
                        };
                        return [4 /*yield*/, storeVersionedObject_1(newSomeone)];
                    case 23:
                        result_2 = _f.sent();
                        console.log("[AIAssistantModel] Created/found Someone: ".concat(result_2 === null || result_2 === void 0 ? void 0 : result_2.idHash.toString().substring(0, 8), "..."));
                        return [4 /*yield*/, leuteModel.addSomeoneElse(result_2 === null || result_2 === void 0 ? void 0 : result_2.idHash)];
                    case 24:
                        _f.sent();
                        console.log("[AIAssistantModel] Added to contacts: ".concat(result_2 === null || result_2 === void 0 ? void 0 : result_2.idHash.toString().substring(0, 8), "..."));
                        _f.label = 25;
                    case 25:
                        // AI-SPECIFIC: Cache the person ID and create proper LLM object via AI assistant
                        (_e = this.aiContacts) === null || _e === void 0 ? void 0 : _e.set(modelId, personIdHash);
                        if (!this.llmObjectManager) return [3 /*break*/, 30];
                        _f.label = 26;
                    case 26:
                        _f.trys.push([26, 28, , 29]);
                        return [4 /*yield*/, this.createLLMObjectForAI(modelId, displayName, personIdHash)];
                    case 27:
                        _f.sent();
                        console.log("[AIAssistantModel] Created LLM object as source of truth for ".concat(displayName));
                        return [3 /*break*/, 29];
                    case 28:
                        error_7 = _f.sent();
                        console.warn("[AIAssistantModel] Could not create LLM object, falling back to cache:", error_7.message);
                        // Fallback to cache-only approach
                        this.llmObjectManager.cacheAIPersonId(modelId, personIdHash);
                        return [3 /*break*/, 29];
                    case 29:
                        console.log("[AIAssistantModel] Registered AI person with LLMObjectManager");
                        _f.label = 30;
                    case 30:
                        console.log("[AIAssistantModel] \u2705 AI contact ready: ".concat(personIdHash.toString().substring(0, 8), "..."));
                        return [2 /*return*/, personIdHash];
                    case 31:
                        error_8 = _f.sent();
                        console.error('[AIAssistantModel] Failed to create AI contact:', error_8);
                        return [2 /*return*/, null];
                    case 32: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create LLM object for AI person - AI assistant manages its own LLM objects
     */
    AIAssistantModel.prototype.createLLMObjectForAI = function (modelId, displayName, personIdHash) {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject, ensureIdHash, personIdHashEnsured, now, nowISOString, llmObject, storedObjectResult, resultIdHash, error_9;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("[AIAssistantModel] Creating LLM object for AI: ".concat(displayName));
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 2:
                        storeVersionedObject = (_c.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/type-checks.js'); })];
                    case 3:
                        ensureIdHash = (_c.sent()).ensureIdHash;
                        personIdHashEnsured = ensureIdHash(personIdHash);
                        now = Date.now();
                        nowISOString = new Date().toISOString();
                        llmObject = {
                            $type$: 'LLM',
                            name: displayName, // This is the ID field according to recipe (isId: true)
                            filename: "".concat(displayName.replace(/[\s:]/g, '-').toLowerCase(), ".gguf"), // Required field
                            modelType: (modelId.startsWith('ollama:') ? 'local' : 'remote'), // Required field
                            active: true, // Required field
                            deleted: false, // Required field
                            created: now, // Required field (timestamp)
                            modified: now, // Required field (timestamp)
                            createdAt: nowISOString, // Required field (ISO string)
                            lastUsed: nowISOString, // Required field (ISO string)
                            // Required LLM fields
                            modelId: modelId, // Required field
                            // AI-specific fields - personId being set = this is an AI contact
                            personId: personIdHashEnsured,
                            provider: this.getProviderFromModelId(modelId),
                            capabilities: ['chat', 'inference'], // Must match regexp: chat or inference
                            maxTokens: 4096,
                            temperature: 0.7,
                            contextSize: 4096,
                            batchSize: 512,
                            threads: 4,
                        };
                        return [4 /*yield*/, storeVersionedObject(llmObject)];
                    case 4:
                        storedObjectResult = _c.sent();
                        resultIdHash = storedObjectResult === null || storedObjectResult === void 0 ? void 0 : storedObjectResult.idHash;
                        console.log("[AIAssistantModel] Stored AI LLM object with hash: ".concat(resultIdHash || 'unknown'));
                        // Cache in LLMObjectManager
                        (_b = (_a = this.llmObjectManager) === null || _a === void 0 ? void 0 : _a.llmObjects) === null || _b === void 0 ? void 0 : _b.set(modelId, __assign(__assign({}, llmObject), { modelId: modelId, hash: resultIdHash, idHash: resultIdHash }));
                        return [2 /*return*/, storedObjectResult.idHash];
                    case 5:
                        error_9 = _c.sent();
                        console.error("[AIAssistantModel] Failed to create LLM object for AI ".concat(displayName, ":"), error_9);
                        throw error_9;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get provider from model ID (helper for LLM object creation)
     */
    AIAssistantModel.prototype.getProviderFromModelId = function (modelId) {
        if (modelId.startsWith('ollama:'))
            return 'ollama';
        if (modelId.startsWith('claude:'))
            return 'claude';
        if (modelId.startsWith('gpt:'))
            return 'openai';
        return 'unknown';
    };
    /**
     * Get person ID for a model
     */
    AIAssistantModel.prototype.getPersonIdForModel = function (modelId) {
        var _a;
        return ((_a = this.aiContacts) === null || _a === void 0 ? void 0 : _a.get(modelId)) || null;
    };
    /**
     * Check if a person ID is an AI person
     */
    AIAssistantModel.prototype.isAIPerson = function (personId) {
        if (!personId)
            return false;
        var personIdStr = personId.toString().substring(0, 8);
        // Check if this person ID is in our AI contacts cache
        for (var _i = 0, _a = this.aiContacts; _i < _a.length; _i++) {
            var _b = _a[_i], modelId = _b[0], aiPersonId = _b[1];
            if (aiPersonId === personId) {
                console.log("[AIAssistantModel] \u2705 Person ".concat(personIdStr, "... IS AI via aiContacts (modelId: ").concat(modelId, ")"));
                return true;
            }
        }
        // Also check with LLMObjectManager if available
        if (this.llmObjectManager) {
            var isLLM = this.llmObjectManager.isLLMPerson(personId);
            if (isLLM) {
                console.log("[AIAssistantModel] \u2705 Person ".concat(personIdStr, "... IS AI via LLMObjectManager"));
            }
            else {
                console.log("[AIAssistantModel] \u274C Person ".concat(personIdStr, "... is NOT AI (checked both aiContacts and LLMObjectManager)"));
            }
            return isLLM;
        }
        console.log("[AIAssistantModel] \u274C Person ".concat(personIdStr, "... is NOT AI (no llmObjectManager)"));
        return false;
    };
    /**
     * Get model ID for a given person ID (reverse lookup)
     */
    AIAssistantModel.prototype.getModelIdForPersonId = function (personId) {
        if (!personId)
            return null;
        // Search through aiContacts map (modelId -> personId)
        for (var _i = 0, _a = this.aiContacts; _i < _a.length; _i++) {
            var _b = _a[_i], modelId = _b[0], aiPersonId = _b[1];
            if (aiPersonId === personId) {
                return modelId;
            }
        }
        // Also try LLMObjectManager if available
        if (this.llmObjectManager) {
            return this.llmObjectManager.getModelIdForPersonId(personId);
        }
        return null;
    };
    /**
     * Ensure AI contact exists for a specific model
     */
    AIAssistantModel.prototype.ensureAIContactForModel = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingContact, models, model, personId;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        existingContact = this.getPersonIdForModel(modelId);
                        if (existingContact) {
                            console.log("[AIAssistantModel] Found AI contact in cache for ".concat(modelId, ":"), existingContact);
                            return [2 /*return*/, existingContact];
                        }
                        models = (_a = this.llmManager) === null || _a === void 0 ? void 0 : _a.getAvailableModels();
                        model = models.find(function (m) { return m.id === modelId; });
                        if (!model) {
                            console.error("[AIAssistantModel] Model ".concat(modelId, " not found in available models. Available:"), models === null || models === void 0 ? void 0 : models.map(function (m) { return m.id; }));
                            return [2 /*return*/, null];
                        }
                        console.log("[AIAssistantModel] Creating new AI contact for ".concat(modelId));
                        return [4 /*yield*/, this.createAIContact(model.id, model.name)];
                    case 1:
                        personId = _b.sent();
                        if (!personId) {
                            throw new Error("Failed to create AI contact for model ".concat(modelId));
                        }
                        return [2 /*return*/, personId];
                }
            });
        });
    };
    /**
     * Handle a new topic creation by sending a welcome message
     * Also can be called for existing topics that need a welcome message
     */
    AIAssistantModel.prototype.handleNewTopic = function (channelId, topicRoom) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, windows, _i, windows_2, window_4, welcomePromise, queuedMessages, _a, queuedMessages_1, _b, message, senderId;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        startTime = Date.now();
                        console.log("[AIAssistantModel] \uD83C\uDFAF Handling new topic: ".concat(channelId, " at ").concat(new Date().toISOString()));
                        windows = BrowserWindow.getAllWindows();
                        for (_i = 0, windows_2 = windows; _i < windows_2.length; _i++) {
                            window_4 = windows_2[_i];
                            window_4.webContents.send('message:thinking', {
                                conversationId: channelId,
                                messageId: "ai-welcome-".concat(Date.now()),
                                isAI: true
                            });
                        }
                        console.log("[AIAssistantModel] \uD83C\uDFAF Emitted message:thinking for ".concat(channelId));
                        welcomePromise = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var modelStartTime, effectiveModel, modelIdToUse, privateModelId, privateModel, personStartTime, aiPersonId, messageId, placeholderText, windows_5, _i, windows_3, window_5, welcomeMessage, messages, llmStartTime, response, messages, llmStartTime, response, sendStartTime, _a, windows_4, window_6, error_10;
                            var _b, _c, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        _e.trys.push([0, 8, , 9]);
                                        modelStartTime = Date.now();
                                        effectiveModel = null;
                                        modelIdToUse = null;
                                        // FIRST: Check if this topic is already registered with a specific model
                                        modelIdToUse = this.getModelIdForTopic(channelId);
                                        if (modelIdToUse) {
                                            console.log("[AIAssistantModel] Topic ".concat(channelId, " already registered with model: ").concat(modelIdToUse));
                                            effectiveModel = this.getModelById(modelIdToUse);
                                            if (!effectiveModel) {
                                                throw new Error("Model ".concat(modelIdToUse, " was registered for topic ").concat(channelId, " but not found in available models. This is a bug."));
                                            }
                                        }
                                        // If no model was pre-registered, this is a bug - throw
                                        if (!effectiveModel || !modelIdToUse) {
                                            throw new Error("No model registered for topic ".concat(channelId, ". Topics must be registered with registerAITopic() before calling handleNewTopic()."));
                                        }
                                        // For LAMA topic, use private model variant
                                        if (channelId === 'lama') {
                                            privateModelId = modelIdToUse + '-private';
                                            privateModel = (_b = this.llmManager) === null || _b === void 0 ? void 0 : _b.getModel(privateModelId);
                                            if (privateModel) {
                                                effectiveModel = privateModel;
                                                modelIdToUse = privateModelId;
                                                console.log("[AIAssistantModel] Using private model for LAMA: ".concat(modelIdToUse));
                                            }
                                            else {
                                                console.warn("[AIAssistantModel] Private model ".concat(privateModelId, " not found, using base model"));
                                            }
                                        }
                                        console.log("[AIAssistantModel] \u23F1\uFE0F Model selection took ".concat(Date.now() - modelStartTime, "ms"));
                                        // Register this as an AI topic with the CORRECT model
                                        this.registerAITopic(channelId, modelIdToUse);
                                        personStartTime = Date.now();
                                        return [4 /*yield*/, this.getOrCreatePersonIdForModel(effectiveModel)];
                                    case 1:
                                        aiPersonId = _e.sent();
                                        if (!aiPersonId) {
                                            console.error('[AIAssistantModel] Could not get AI person ID');
                                            return [2 /*return*/];
                                        }
                                        console.log("[AIAssistantModel] \u23F1\uFE0F AI person creation took ".concat(Date.now() - personStartTime, "ms"));
                                        messageId = "ai-".concat(Date.now());
                                        placeholderText = '...';
                                        windows_5 = BrowserWindow.getAllWindows();
                                        for (_i = 0, windows_3 = windows_5; _i < windows_3.length; _i++) {
                                            window_5 = windows_3[_i];
                                            window_5.webContents.send('message:updated', {
                                                conversationId: channelId,
                                                message: {
                                                    id: messageId,
                                                    conversationId: channelId,
                                                    text: placeholderText,
                                                    senderId: aiPersonId,
                                                    isAI: true,
                                                    timestamp: new Date().toISOString(),
                                                    status: 'pending'
                                                }
                                            });
                                        }
                                        console.log("[AIAssistantModel] Sent placeholder to UI for ".concat(channelId));
                                        welcomeMessage = void 0;
                                        console.log("[AIAssistantModel] Determining welcome message for channelId: \"".concat(channelId, "\" (type: ").concat(typeof channelId, ")"));
                                        if (!(channelId === 'hi')) return [3 /*break*/, 2];
                                        // Static welcome for Hi chat - concise intro message
                                        console.log("[AIAssistantModel] Using static Hi welcome message");
                                        welcomeMessage = "Hi! I'm LAMA, your local AI assistant.\n\nI run entirely on your device - no cloud, just private, fast AI help.\n\nWhat can I do for you today?";
                                        return [3 /*break*/, 6];
                                    case 2:
                                        if (!(channelId === 'lama')) return [3 /*break*/, 4];
                                        console.log("[AIAssistantModel] Using LLM-generated LAMA welcome message");
                                        messages = [
                                            { role: 'system', content: "You are a helpful AI assistant. Generate a brief, friendly welcome message." },
                                            { role: 'user', content: "Generate a welcome message for a new chat conversation. Be warm and approachable. Keep it under 2 sentences." }
                                        ];
                                        llmStartTime = Date.now();
                                        console.log("[AIAssistantModel] \uD83D\uDCE1 Requesting welcome message from ".concat(effectiveModel.id, " at ").concat(new Date().toISOString()));
                                        return [4 /*yield*/, ((_c = this.llmManager) === null || _c === void 0 ? void 0 : _c.chat(messages, effectiveModel.id))
                                            // Debug: Log what we actually got back
                                        ];
                                    case 3:
                                        response = _e.sent();
                                        // Debug: Log what we actually got back
                                        console.log("[AIAssistantModel] \uD83D\uDC1B Raw LLM response type: ".concat(typeof response));
                                        console.log("[AIAssistantModel] \uD83D\uDC1B Raw LLM response: \"".concat(response, "\""));
                                        welcomeMessage = response;
                                        console.log("[AIAssistantModel] \u23F1\uFE0F LLM response took ".concat(Date.now() - llmStartTime, "ms"));
                                        return [3 /*break*/, 6];
                                    case 4:
                                        console.log("[AIAssistantModel] Using LLM-generated welcome for other chat: \"".concat(channelId, "\""));
                                        messages = [
                                            { role: 'system', content: "You are a helpful AI assistant. Generate a brief, friendly welcome message." },
                                            { role: 'user', content: "Generate a welcome message for a new chat conversation. Be warm and approachable. Keep it under 2 sentences." }
                                        ];
                                        llmStartTime = Date.now();
                                        console.log("[AIAssistantModel] \uD83D\uDCE1 Requesting welcome message from ".concat(effectiveModel.id, " at ").concat(new Date().toISOString()));
                                        return [4 /*yield*/, ((_d = this.llmManager) === null || _d === void 0 ? void 0 : _d.chat(messages, effectiveModel.id))];
                                    case 5:
                                        response = _e.sent();
                                        welcomeMessage = response;
                                        console.log("[AIAssistantModel] \u23F1\uFE0F LLM response took ".concat(Date.now() - llmStartTime, "ms"));
                                        _e.label = 6;
                                    case 6:
                                        console.log("[AIAssistantModel] Generated welcome: \"".concat(welcomeMessage, "\""));
                                        sendStartTime = Date.now();
                                        return [4 /*yield*/, topicRoom.sendMessage(welcomeMessage, aiPersonId, aiPersonId)];
                                    case 7:
                                        _e.sent();
                                        console.log("[AIAssistantModel] \u23F1\uFE0F Message send took ".concat(Date.now() - sendStartTime, "ms"));
                                        console.log("[AIAssistantModel] \u2705 Welcome message sent to topic ".concat(channelId));
                                        console.log("[AIAssistantModel] \u23F1\uFE0F TOTAL handleNewTopic time: ".concat(Date.now() - startTime, "ms"));
                                        // Notify UI about the complete message
                                        for (_a = 0, windows_4 = windows_5; _a < windows_4.length; _a++) {
                                            window_6 = windows_4[_a];
                                            window_6.webContents.send('message:updated', {
                                                conversationId: channelId,
                                                message: {
                                                    id: messageId,
                                                    conversationId: channelId,
                                                    text: welcomeMessage,
                                                    senderId: aiPersonId,
                                                    isAI: true,
                                                    timestamp: new Date().toISOString(),
                                                    status: 'sent'
                                                }
                                            });
                                        }
                                        return [3 /*break*/, 9];
                                    case 8:
                                        error_10 = _e.sent();
                                        console.error('[AIAssistantModel] Error handling new topic:', error_10);
                                        return [3 /*break*/, 9];
                                    case 9: return [2 /*return*/];
                                }
                            });
                        }); })() // End of async IIFE
                        ;
                        // Store the promise so processMessage can wait for it
                        this.welcomeGenerationInProgress.set(channelId, welcomePromise);
                        // Wait for welcome to complete
                        return [4 /*yield*/, welcomePromise
                            // Clean up and process any queued messages
                        ];
                    case 1:
                        // Wait for welcome to complete
                        _c.sent();
                        // Clean up and process any queued messages
                        this.welcomeGenerationInProgress.delete(channelId);
                        queuedMessages = this.pendingMessageQueues.get(channelId) || [];
                        this.pendingMessageQueues.delete(channelId);
                        // Process queued messages now that welcome is complete
                        console.log("[AIAssistantModel] Processing ".concat(queuedMessages.length, " queued messages for ").concat(channelId));
                        _a = 0, queuedMessages_1 = queuedMessages;
                        _c.label = 2;
                    case 2:
                        if (!(_a < queuedMessages_1.length)) return [3 /*break*/, 5];
                        _b = queuedMessages_1[_a], message = _b.message, senderId = _b.senderId;
                        return [4 /*yield*/, this.processMessage(channelId, message, senderId)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        _a++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the default AI model
     */
    AIAssistantModel.prototype.getDefaultModel = function () {
        var _this = this;
        var _a;
        console.log('[AIAssistantModel] 🔍 getDefaultModel called');
        if (!this.defaultModelId) {
            console.log('[AIAssistantModel] No default model selected');
            return null;
        }
        if (!this.llmManager) {
            console.warn('[AIAssistantModel] LLMManager not available');
            return null;
        }
        var models = (_a = this.llmManager) === null || _a === void 0 ? void 0 : _a.getAvailableModels();
        var selectedModel = models.find(function (m) { return m.id === _this.defaultModelId; });
        if (selectedModel) {
            console.log("[AIAssistantModel] Using default model: ".concat(this.defaultModelId));
            return selectedModel;
        }
        console.warn("[AIAssistantModel] Default model ".concat(this.defaultModelId, " not found in available models"));
        return null;
    };
    /**
     * Get model by ID
     */
    AIAssistantModel.prototype.getModelById = function (modelId) {
        var _a;
        if (!this.llmManager || !modelId)
            return null;
        var models = (_a = this.llmManager) === null || _a === void 0 ? void 0 : _a.getAvailableModels();
        return models.find(function (m) { return m.id === modelId; }) || null;
    };
    /**
     * Set the default model and persist the selection
     */
    AIAssistantModel.prototype.setDefaultModel = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var isFirstTime, oldModelId, aiPersonId, privateModelId, privateAiPersonId, privateModelId, privateAiPersonId;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[AIAssistantModel] Setting default model:', modelId);
                        isFirstTime = !this.defaultModelId;
                        oldModelId = this.defaultModelId;
                        // Update local state
                        this.defaultModelId = modelId;
                        if (!this.aiSettingsManager) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.aiSettingsManager.setDefaultModelId(modelId)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        // Register private variant for LAMA conversations
                        if (this.llmManager) {
                            (_a = this.llmManager) === null || _a === void 0 ? void 0 : _a.registerPrivateVariantForModel(modelId);
                        }
                        console.log('[AIAssistantModel] Default model set and persisted');
                        return [4 /*yield*/, this.ensureAIContactForModel(modelId)];
                    case 3:
                        aiPersonId = _b.sent();
                        if (!aiPersonId) {
                            throw new Error("Failed to create AI contact for model ".concat(modelId));
                        }
                        if (!isFirstTime) return [3 /*break*/, 7];
                        console.log('[AIAssistantModel] First model selection - creating Hi and LAMA chats');
                        // Create Hi chat
                        return [4 /*yield*/, this.createHiChat(modelId, aiPersonId)
                            // Create LAMA chat with private model variant
                        ];
                    case 4:
                        // Create Hi chat
                        _b.sent();
                        privateModelId = modelId + '-private';
                        return [4 /*yield*/, this.ensureAIContactForModel(privateModelId)];
                    case 5:
                        privateAiPersonId = _b.sent();
                        if (!privateAiPersonId) {
                            throw new Error("Failed to create private AI contact for model ".concat(privateModelId));
                        }
                        return [4 /*yield*/, this.createLamaChat(privateModelId, privateAiPersonId)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 7:
                        console.log("[AIAssistantModel] Model changed from ".concat(oldModelId, " to ").concat(modelId, " - updating participants"));
                        // Update Hi chat participant
                        return [4 /*yield*/, this.updateTopicParticipant('hi', aiPersonId)
                            // Update LAMA chat participant (private variant)
                        ];
                    case 8:
                        // Update Hi chat participant
                        _b.sent();
                        privateModelId = modelId + '-private';
                        return [4 /*yield*/, this.ensureAIContactForModel(privateModelId)];
                    case 9:
                        privateAiPersonId = _b.sent();
                        if (!privateAiPersonId) {
                            throw new Error("Failed to create private AI contact for model ".concat(privateModelId));
                        }
                        return [4 /*yield*/, this.updateTopicParticipant('lama', privateAiPersonId)
                            // Update topic-to-model mappings
                        ];
                    case 10:
                        _b.sent();
                        // Update topic-to-model mappings
                        this.registerAITopic('hi', modelId);
                        this.registerAITopic('lama', privateModelId);
                        _b.label = 11;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set up AI contacts for all available models
     */
    AIAssistantModel.prototype.setupAIContacts = function (models) {
        return __awaiter(this, void 0, void 0, function () {
            var createdContacts, _i, models_1, model, personId, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[AIAssistantModel] Setting up ".concat(models === null || models === void 0 ? void 0 : models.length, " AI contacts..."));
                        createdContacts = [];
                        _i = 0, models_1 = models;
                        _a.label = 1;
                    case 1:
                        if (!(_i < models_1.length)) return [3 /*break*/, 6];
                        model = models_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.createAIContact(model.id, model.name)];
                    case 3:
                        personId = _a.sent();
                        if (personId) {
                            createdContacts === null || createdContacts === void 0 ? void 0 : createdContacts.push({
                                modelId: model.id,
                                personId: personId,
                                name: model.name
                            });
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_11 = _a.sent();
                        console.error("[AIAssistantModel] Failed to create contact for ".concat(model.name, ":"), error_11);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        console.log("[AIAssistantModel] \u2705 Set up ".concat(createdContacts === null || createdContacts === void 0 ? void 0 : createdContacts.length, " AI contacts"));
                        return [2 /*return*/, createdContacts];
                }
            });
        });
    };
    /**
     * Get all AI contacts that have been set up
     * This is AI-specific tracking, not general contact management
     */
    AIAssistantModel.prototype.getAllContacts = function () {
        var _this = this;
        return Array.from(this.aiContacts.entries()).map(function (_a) {
            var _b;
            var modelId = _a[0], contactInfo = _a[1];
            // If we stored the full contact info, return it
            if (typeof contactInfo === 'object' && contactInfo !== null && contactInfo.personId) {
                return contactInfo;
            }
            // Legacy: if we only stored personId
            var models = ((_b = _this.llmManager) === null || _b === void 0 ? void 0 : _b.getAvailableModels()) || [];
            var model = models.find(function (m) { return m.id === modelId; });
            return {
                modelId: modelId,
                personId: contactInfo,
                name: (model === null || model === void 0 ? void 0 : model.name) || modelId
            };
        });
    };
    /**
     * Check if context window is filling up and prepare restart context
     * @param {string} topicId - The topic/conversation ID
     * @param {Array} messages - All messages in the conversation
     * @returns {Object} - { needsRestart: boolean, restartContext: string|null }
     */
    AIAssistantModel.prototype.checkContextWindowAndPrepareRestart = function (topicId, messages) {
        return __awaiter(this, void 0, void 0, function () {
            var modelId, model, contextWindow, usableContext, estimatedTokens, systemPromptTokens, totalTokens, restartContext;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        modelId = (_a = this.topicModelMap) === null || _a === void 0 ? void 0 : _a.get(topicId);
                        model = this.getModelById(modelId);
                        contextWindow = (model === null || model === void 0 ? void 0 : model.contextLength) || 4096;
                        usableContext = Math.floor(contextWindow * 0.75);
                        estimatedTokens = messages.reduce(function (total, msg) {
                            var _a;
                            var text = ((_a = msg.data) === null || _a === void 0 ? void 0 : _a.text) || msg.text || '';
                            return total + Math.ceil((text === null || text === void 0 ? void 0 : text.length) / 4);
                        }, 0);
                        systemPromptTokens = 200 // Typical system prompt overhead
                        ;
                        totalTokens = estimatedTokens + systemPromptTokens;
                        if (totalTokens < usableContext) {
                            return [2 /*return*/, { needsRestart: false, restartContext: null }];
                        }
                        console.log("[AIAssistantModel] Context window filling (".concat(totalTokens, "/").concat(contextWindow, " tokens for ").concat((model === null || model === void 0 ? void 0 : model.name) || modelId, "), preparing restart"));
                        return [4 /*yield*/, this.generateConversationSummaryForRestart(topicId, messages)];
                    case 1:
                        restartContext = _c.sent();
                        if (restartContext) {
                            // Store restart point for potential recovery
                            (_b = this.lastRestartPoint) === null || _b === void 0 ? void 0 : _b.set(topicId, messages === null || messages === void 0 ? void 0 : messages.length);
                        }
                        return [2 /*return*/, { needsRestart: true, restartContext: restartContext }];
                }
            });
        });
    };
    /**
     * Generate a conversation summary suitable for restarting with continuity
     * @param {string} topicId - The topic ID
     * @param {Array} messages - Conversation messages
     * @returns {string} - Summary context for restart
     */
    AIAssistantModel.prototype.generateConversationSummaryForRestart = function (topicId, messages) {
        return __awaiter(this, void 0, void 0, function () {
            var currentSummary, subjects, keywords, restartContext_1, activeSubjects, topKeywords, analysis, messageSample, topics_1, participants, _i, messageSample_1, msg, text, sender, words, topicList, messageCount, error_12;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 7, , 8]);
                        if (!this.nodeOneCore.topicAnalysisModel) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.nodeOneCore.topicAnalysisModel.getCurrentSummary(topicId)];
                    case 1:
                        currentSummary = _c.sent();
                        if (!(currentSummary && currentSummary.content)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.nodeOneCore.topicAnalysisModel.getSubjects(topicId)];
                    case 2:
                        subjects = _c.sent();
                        return [4 /*yield*/, this.nodeOneCore.topicAnalysisModel.getKeywords(topicId)
                            // Build comprehensive restart context
                        ];
                    case 3:
                        keywords = _c.sent();
                        restartContext_1 = "[Conversation Continuation]\n\n";
                        restartContext_1 += "Previous Summary:\n".concat(currentSummary.content, "\n\n");
                        if (subjects && (subjects === null || subjects === void 0 ? void 0 : subjects.length) > 0) {
                            activeSubjects = subjects.filter(function (s) { return !s.archived; }).slice(0, 5);
                            if ((activeSubjects === null || activeSubjects === void 0 ? void 0 : activeSubjects.length) > 0) {
                                restartContext_1 += "Active Themes:\n";
                                activeSubjects.forEach(function (s) {
                                    restartContext_1 += "\u2022 ".concat(s.keywordCombination, ": ").concat(s.description || 'Ongoing discussion', "\n");
                                });
                                restartContext_1 += '\n';
                            }
                        }
                        if (keywords && (keywords === null || keywords === void 0 ? void 0 : keywords.length) > 0) {
                            topKeywords = keywords
                                .sort(function (a, b) { return ((b === null || b === void 0 ? void 0 : b.frequency) || 0) - ((a === null || a === void 0 ? void 0 : a.frequency) || 0); })
                                .slice(0, 12)
                                .map(function (k) { return k.term; });
                            restartContext_1 += "Key Concepts: ".concat(topKeywords.join(', '), "\n\n");
                        }
                        restartContext_1 += "Maintain continuity with the established context. The conversation has ".concat(messages === null || messages === void 0 ? void 0 : messages.length, " prior messages.");
                        console.log("[AIAssistantModel] Using existing Summary object (v".concat(currentSummary.version, ") for restart"));
                        return [2 /*return*/, restartContext_1];
                    case 4:
                        // If no summary exists yet, trigger analysis to create one
                        console.log('[AIAssistantModel] No summary found, triggering topic analysis...');
                        return [4 /*yield*/, this.nodeOneCore.topicAnalysisModel.analyzeMessages(topicId, messages.slice(-50))];
                    case 5:
                        analysis = _c.sent();
                        if (analysis && analysis.summary) {
                            return [2 /*return*/, this.generateConversationSummaryForRestart(topicId, messages)]; // Recursive call with new summary
                        }
                        _c.label = 6;
                    case 6:
                        messageSample = messages.slice(-20) // Last 20 messages
                        ;
                        topics_1 = new Set();
                        participants = new Set();
                        for (_i = 0, messageSample_1 = messageSample; _i < messageSample_1.length; _i++) {
                            msg = messageSample_1[_i];
                            text = ((_a = msg.data) === null || _a === void 0 ? void 0 : _a.text) || msg.text || '';
                            sender = ((_b = msg.data) === null || _b === void 0 ? void 0 : _b.sender) || msg.author;
                            words = text.toLowerCase().split(/\s+/);
                            words.filter(function (w) { return (w === null || w === void 0 ? void 0 : w.length) > 5; }).forEach(function (w) { return topics_1.add(w); });
                            if (sender && !this.isAIPerson(sender)) {
                                participants.add('User');
                            }
                        }
                        topicList = Array.from(topics_1).slice(0, 8).join(', ');
                        messageCount = messages === null || messages === void 0 ? void 0 : messages.length;
                        return [2 /*return*/, "Continuing conversation #".concat(String(topicId).substring(0, 8), ". Previous ").concat(messageCount, " messages discussed: ").concat(topicList, ". Maintain context and continuity.")];
                    case 7:
                        error_12 = _c.sent();
                        console.error('[AIAssistantModel] Failed to generate restart summary:', error_12);
                        return [2 /*return*/, "Continuing previous conversation. Maintain context and natural flow."];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Manually trigger conversation restart with summary
     * Can be called when user explicitly wants to continue with fresh context
     */
    AIAssistantModel.prototype.restartConversationWithSummary = function (topicId) {
        return __awaiter(this, void 0, void 0, function () {
            var topicRoom, messages, summary;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.nodeOneCore.topicModel.enterTopicRoom(topicId)];
                    case 1:
                        topicRoom = _a.sent();
                        return [4 /*yield*/, topicRoom.retrieveAllMessages()];
                    case 2:
                        messages = _a.sent();
                        return [4 /*yield*/, this.generateConversationSummaryForRestart(topicId, messages)];
                    case 3:
                        summary = _a.sent();
                        if (summary) {
                            console.log("[AIAssistantModel] Conversation restarted with summary for topic ".concat(topicId));
                            // Store the summary as metadata for the topic
                            this.topicRestartSummaries = this.topicRestartSummaries || new Map();
                            this.topicRestartSummaries.set(topicId, {
                                summary: summary,
                                timestamp: Date.now(),
                                messageCountAtRestart: messages === null || messages === void 0 ? void 0 : messages.length
                            });
                            return [2 /*return*/, summary];
                        }
                        return [2 /*return*/, null];
                }
            });
        });
    };
    return AIAssistantModel;
}());
exports.AIAssistantModel = AIAssistantModel;
exports.default = AIAssistantModel;
