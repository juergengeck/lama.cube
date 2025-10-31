"use strict";
/**
 * AI Message Listener for Node.js instance
 *
 * Based on LAMA's messageListener.ts, adapted for Node.js
 * Sets up channel listeners to detect new messages in AI topics
 * and trigger AI response generation.
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
var AIMessageListener = /** @class */ (function () {
    function AIMessageListener(channelManager, llmManager) {
        this.channelManager = channelManager;
        this.llmManager = llmManager;
        this.aiAssistantModel = null; // Will be set after AIAssistantModel is initialized
        this.unsubscribe = null;
        this.debounceTimers = new Map();
        this.DEBOUNCE_MS = 800; // Increased delay to ensure user message displays first
        this.pollInterval = null;
    }
    /**
     * Set the AI Assistant Model reference
     */
    AIMessageListener.prototype.setAIAssistantModel = function (aiAssistantModel) {
        this.aiAssistantModel = aiAssistantModel;
        console.log('[AIMessageListener] AI Assistant Model reference set');
    };
    /**
     * Start listening for messages in AI topics
     */
    AIMessageListener.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ownerId, nodeCore, e_1, channels, err_1;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Prevent multiple starts
                        if (this.unsubscribe || this.pollInterval) {
                            console.log('[AIMessageListener] Already started - skipping');
                            return [2 /*return*/];
                        }
                        console.log('[AIMessageListener] Starting message listener...');
                        if (!this.channelManager) {
                            console.error('[AIMessageListener] Cannot start - channelManager is undefined');
                            return [2 /*return*/];
                        }
                        if (!this.channelManager.onUpdated) {
                            console.error('[AIMessageListener] Cannot start - channelManager.onUpdated is undefined');
                            console.log('[AIMessageListener] Available channelManager methods:', Object.keys(this.channelManager));
                            return [2 /*return*/];
                        }
                        console.log('[AIMessageListener] Setting up channel update listener...');
                        // No need to join - channel manager listener handles messages
                        // Set up channel update listener - onUpdated is a function that takes a callback
                        console.log('[AIMessageListener] 🎯🎯🎯 NODE: Registering channelManager.onUpdated callback');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./node-one-core.js'); })];
                    case 2:
                        nodeCore = _c.sent();
                        ownerId = ((_a = nodeCore.default) === null || _a === void 0 ? void 0 : _a.ownerId) || ((_b = nodeCore.instance) === null || _b === void 0 ? void 0 : _b.ownerId);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _c.sent();
                        console.log('[AIMessageListener] Could not get owner ID:', e_1.message);
                        return [3 /*break*/, 4];
                    case 4:
                        console.log("[AIMessageListener] Node owner ID: ".concat(ownerId === null || ownerId === void 0 ? void 0 : ownerId.substring(0, 8)));
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.channelManager.getMatchingChannelInfos({})];
                    case 6:
                        channels = _c.sent();
                        console.log("[AIMessageListener] Known channels at startup:", channels.map(function (c) {
                            var _a;
                            return ({
                                id: c.id,
                                owner: (_a = c.owner) === null || _a === void 0 ? void 0 : _a.substring(0, 8),
                                isOurChannel: c.owner === ownerId
                            });
                        }));
                        // Check if ChannelManager is properly subscribed
                        console.log('[AIMessageListener] 🔍 Checking ChannelManager subscription state...');
                        if ((channels === null || channels === void 0 ? void 0 : channels.length) === 0) {
                            console.warn('[AIMessageListener] ⚠️ No channels found - CHUM sync may not be working!');
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _c.sent();
                        console.log('[AIMessageListener] Could not get channels:', err_1);
                        return [3 /*break*/, 8];
                    case 8:
                        // Add periodic check for channels - save to this.pollInterval for cleanup
                        this.pollInterval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                            var channels, err_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, this.channelManager.getMatchingChannelInfos({})];
                                    case 1:
                                        channels = _a.sent();
                                        console.log("[AIMessageListener] \uD83D\uDCCA Periodic channel check - found ".concat(channels === null || channels === void 0 ? void 0 : channels.length, " channels"));
                                        if ((channels === null || channels === void 0 ? void 0 : channels.length) > 0) {
                                            console.log('[AIMessageListener] Channel IDs:', channels.map(function (c) { return c.id; }));
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        err_2 = _a.sent();
                                        console.error('[AIMessageListener] Periodic check failed:', err_2);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }, 10000); // Check every 10 seconds
                        // Use onUpdated as a function like other parts of the codebase
                        this.unsubscribe = this.channelManager.onUpdated(function (channelInfoIdHash, channelId, channelOwner, timeOfEarliestChange, data) { return __awaiter(_this, void 0, void 0, function () {
                            var existingTimer, timerId;
                            var _this = this;
                            var _a;
                            return __generator(this, function (_b) {
                                console.log('[AIMessageListener] 🔔🔔🔔 NODE: Channel update received!', {
                                    channelId: channelId,
                                    channelOwner: channelOwner === null || channelOwner === void 0 ? void 0 : channelOwner.substring(0, 8),
                                    isOurChannel: channelOwner === ownerId,
                                    nodeOwner: ownerId === null || ownerId === void 0 ? void 0 : ownerId.substring(0, 8),
                                    dataLength: data === null || data === void 0 ? void 0 : data.length,
                                    timeOfEarliestChange: timeOfEarliestChange
                                });
                                existingTimer = (_a = this.debounceTimers) === null || _a === void 0 ? void 0 : _a.get(channelId);
                                if (existingTimer) {
                                    clearTimeout(existingTimer);
                                }
                                timerId = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var isAI, error_1;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                this.debounceTimers.delete(channelId);
                                                isAI = this.isAITopic(channelId);
                                                if (!isAI) {
                                                    // Skip non-AI topics silently
                                                    return [2 /*return*/];
                                                }
                                                // Only log and process AI topics
                                                console.log("[AIMessageListener] \uD83D\uDCE2 AI topic update: ".concat(channelId));
                                                console.log("[AIMessageListener] Data entries: ".concat(data ? data === null || data === void 0 ? void 0 : data.length : 0));
                                                _a.label = 1;
                                            case 1:
                                                _a.trys.push([1, 3, , 4]);
                                                // Process the channel update for AI topic
                                                return [4 /*yield*/, this.handleChannelUpdate(channelId, {
                                                        channelId: channelId,
                                                        isChannelUpdate: true,
                                                        timeOfEarliestChange: timeOfEarliestChange,
                                                        data: data
                                                    })];
                                            case 2:
                                                // Process the channel update for AI topic
                                                _a.sent();
                                                return [3 /*break*/, 4];
                                            case 3:
                                                error_1 = _a.sent();
                                                console.error("[AIMessageListener] Error processing channel update:", error_1);
                                                return [3 /*break*/, 4];
                                            case 4: return [2 /*return*/];
                                        }
                                    });
                                }); }, this.DEBOUNCE_MS);
                                this.debounceTimers.set(channelId, timerId);
                                return [2 /*return*/];
                            });
                        }); });
                        console.log('[AIMessageListener] Message listener started successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stop listening for messages
     */
    AIMessageListener.prototype.stop = function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log('[AIMessageListener] Polling stopped');
        }
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log('[AIMessageListener] Message listener stopped');
        }
        // Clear all timers
        for (var _i = 0, _a = this.debounceTimers.values(); _i < _a.length; _i++) {
            var timer = _a[_i];
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
    };
    /**
     * Register a topic as an AI topic with model mapping
     * @deprecated - AIAssistantModel is the source of truth, delegate to it
     */
    AIMessageListener.prototype.registerAITopic = function (topicId, modelId) {
        console.log("[AIMessageListener] DEPRECATED: registerAITopic called, should use AIAssistantModel.registerAITopic instead");
        // Delegate to AIAssistantModel if available
        if (this.aiAssistantModel) {
            this.aiAssistantModel.registerAITopic(topicId, modelId);
        }
        else {
            console.warn("[AIMessageListener] Cannot register topic ".concat(topicId, " - AIAssistantModel not available"));
        }
    };
    /**
     * Check if a topic is an AI topic
     * AIAssistantModel is the source of truth - always delegate to it
     */
    AIMessageListener.prototype.isAITopic = function (topicId) {
        // AIAssistantModel is the source of truth
        if (this.aiAssistantModel && this.aiAssistantModel.isAITopic) {
            return this.aiAssistantModel.isAITopic(topicId);
        }
        // Fallback for 'default' channel if AIAssistantModel not available yet
        if (topicId === 'default') {
            return true;
        }
        console.warn("[AIMessageListener] AIAssistantModel not available, cannot check if ".concat(topicId, " is AI topic"));
        return false;
    };
    /**
     * Decide if AI should respond to a message
     * This is where AI intelligence comes in - for now simple rules
     */
    AIMessageListener.prototype.shouldAIRespond = function (channelId, message) {
        // Always respond in lama channel
        if (channelId === 'lama')
            return true;
        // Could add more logic here:
        // - Check if message mentions AI
        // - Check if it's a question
        // - Check conversation context
        // - Check if AI is explicitly asked to respond
        // For now, respond to all messages in channels we're monitoring
        return true;
    };
    /**
     * Handle channel update - check if AI should respond
     */
    AIMessageListener.prototype.handleChannelUpdate = function (channelId, updateInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var topicModel, nodeCore, e_2, nodeCore, topicRoom, messages, lastUserMessage, lastAIMessage, lastMessage, messageText, messageSender, messageAge, isRecent, isFromAI, error_2;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        console.log("[AIMessageListener] Processing channel update for ".concat(channelId));
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./node-one-core.js'); })];
                    case 2:
                        nodeCore = _e.sent();
                        // The default export IS the instance
                        topicModel = (_a = nodeCore.default) === null || _a === void 0 ? void 0 : _a.topicModel;
                        if (!topicModel) {
                            console.log('[AIMessageListener] TopicModel not on default, checking instance export...');
                            topicModel = (_b = nodeCore.instance) === null || _b === void 0 ? void 0 : _b.topicModel;
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _e.sent();
                        console.error('[AIMessageListener] Error importing node-one-core:', e_2);
                        return [2 /*return*/];
                    case 4:
                        if (!!topicModel) return [3 /*break*/, 6];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./node-one-core.js'); })];
                    case 5:
                        nodeCore = _e.sent();
                        console.error('[AIMessageListener] TopicModel not available - instance:', !!nodeCore.default, 'topicModel:', !!topicModel);
                        return [2 /*return*/];
                    case 6:
                        _e.trys.push([6, 9, , 10]);
                        return [4 /*yield*/, topicModel.enterTopicRoom(channelId)];
                    case 7:
                        topicRoom = _e.sent();
                        if (!topicRoom) {
                            console.error("[AIMessageListener] Could not enter topic room ".concat(channelId));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, topicRoom.retrieveAllMessages()];
                    case 8:
                        messages = _e.sent();
                        console.log("[AIMessageListener] Found ".concat(messages === null || messages === void 0 ? void 0 : messages.length, " messages in topic"));
                        // If this is a new topic with no messages, skip processing
                        // The welcome message is handled by chat.js when getMessages is called
                        if ((messages === null || messages === void 0 ? void 0 : messages.length) === 0) {
                            console.log("[AIMessageListener] Empty topic ".concat(channelId, " - skipping (welcome handled by chat.js)"));
                            return [2 /*return*/];
                        }
                        lastUserMessage = null;
                        lastAIMessage = null;
                        // Look for the most recent message
                        if ((messages === null || messages === void 0 ? void 0 : messages.length) > 0) {
                            lastMessage = messages[(messages === null || messages === void 0 ? void 0 : messages.length) - 1];
                            messageText = (_c = lastMessage.data) === null || _c === void 0 ? void 0 : _c.text;
                            messageSender = ((_d = lastMessage.data) === null || _d === void 0 ? void 0 : _d.sender) || lastMessage.author;
                            messageAge = Date.now() - new Date(lastMessage.creationTime).getTime();
                            isRecent = messageAge < 10000 // 10 seconds
                            ;
                            isFromAI = this.isAIMessage(lastMessage);
                            console.log("[AIMessageListener] Last message from ".concat(messageSender === null || messageSender === void 0 ? void 0 : messageSender.toString().substring(0, 8), "...: isAI=").concat(isFromAI, ", text=\"").concat(messageText === null || messageText === void 0 ? void 0 : messageText.substring(0, 50), "...\""));
                            if (!isFromAI && messageText && messageText.trim() && isRecent) {
                                console.log("[AIMessageListener] \uD83D\uDD07 Found user message: \"".concat(messageText, "\" - NOT auto-responding (welcome message only)"));
                                // DO NOT auto-respond to user messages
                                // The static welcome message is handled when the chat is created
                                // AI should only respond when explicitly triggered (future: button/mention)
                            }
                            else if (isFromAI) {
                                console.log("[AIMessageListener] \u2705 Correctly ignoring AI message from ".concat(messageSender === null || messageSender === void 0 ? void 0 : messageSender.toString().substring(0, 8), "..."));
                            }
                        }
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _e.sent();
                        console.error("[AIMessageListener] Error handling channel update:", error_2);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if a message is from an AI
     */
    AIMessageListener.prototype.isAIMessage = function (message) {
        var _a;
        // Check if the sender is an AI contact
        var sender = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.sender) || message.author;
        if (!sender)
            return false;
        // Use AI Assistant Model's isAIPerson method
        if (this.aiAssistantModel) {
            return this.aiAssistantModel.isAIPerson(sender);
        }
        throw new Error('AIAssistantModel not available - cannot determine if person is AI');
    };
    /**
     * Process a user message and generate AI response
     * @deprecated - Use AIAssistantModel.processMessage instead
     */
    AIMessageListener.prototype.processUserMessage = function (topicMessages, message, channelId, topicRoom) {
        return __awaiter(this, void 0, void 0, function () {
            var messageText, messageSender;
            var _a, _b;
            return __generator(this, function (_c) {
                messageText = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.text) || message.text;
                messageSender = ((_b = message.data) === null || _b === void 0 ? void 0 : _b.sender) || message.author;
                console.log("[AIMessageListener] DEPRECATED: processUserMessage called, delegating to AIAssistantModel");
                if (this.aiAssistantModel) {
                    return [2 /*return*/, this.aiAssistantModel.processMessage(channelId, messageText, messageSender)];
                }
                return [2 /*return*/, null];
            });
        });
    };
    /**
     * Legacy method content - kept for reference
     * The actual logic has been moved to AIAssistantModel.processMessage
     */
    AIMessageListener.prototype._legacyProcessUserMessage = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    return AIMessageListener;
}());
exports.default = AIMessageListener;
