"use strict";
/**
 * Peer Message Listener for Node.js instance
 *
 * Listens for ALL channel updates (not just AI) and notifies
 * the UI when new messages arrive from peers via CHUM sync.
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
var PeerMessageListener = /** @class */ (function () {
    function PeerMessageListener(channelManager, topicModel) {
        this.channelManager = channelManager;
        this.topicModel = topicModel;
        this.unsubscribe = null;
        this.debounceTimers = new Map();
        this.DEBOUNCE_MS = 100; // Faster than AI listener
        this.mainWindow = null;
        this.ownerId = null;
        this.lastMessageCounts = new Map(); // Track message counts per channel
    }
    /**
     * Set the main window for IPC communication
     */
    PeerMessageListener.prototype.setMainWindow = function (mainWindow) {
        this.mainWindow = mainWindow;
        console.log('[PeerMessageListener] Main window reference set');
    };
    /**
     * Set the owner ID to filter out our own messages
     */
    PeerMessageListener.prototype.setOwnerId = function (ownerId) {
        this.ownerId = ownerId;
        console.log("[PeerMessageListener] Owner ID set: ".concat(ownerId === null || ownerId === void 0 ? void 0 : ownerId.substring(0, 8)));
    };
    /**
     * Start listening for peer messages
     */
    PeerMessageListener.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                console.log('[PeerMessageListener] Starting peer message listener...');
                if (!this.channelManager) {
                    console.error('[PeerMessageListener] Cannot start - channelManager is undefined');
                    return [2 /*return*/];
                }
                if (!this.channelManager.onUpdated) {
                    console.error('[PeerMessageListener] Cannot start - channelManager.onUpdated is undefined');
                    return [2 /*return*/];
                }
                console.log('[PeerMessageListener] 🎯 Setting up channel update listener for peer messages...');
                // Subscribe to ALL channel updates
                this.unsubscribe = this.channelManager.onUpdated(function (channelInfoIdHash, channelId, channelOwner, timeOfEarliestChange, data) { return __awaiter(_this, void 0, void 0, function () {
                    var existingTimer, timerId;
                    var _this = this;
                    return __generator(this, function (_a) {
                        existingTimer = this.debounceTimers.get(channelId);
                        if (existingTimer) {
                            clearTimeout(existingTimer);
                        }
                        timerId = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                            var error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        this.debounceTimers.delete(channelId);
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, this.handleChannelUpdate(channelId, channelOwner, data)];
                                    case 2:
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_1 = _a.sent();
                                        console.error("[PeerMessageListener] Error processing channel update:", error_1);
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }, this.DEBOUNCE_MS);
                        this.debounceTimers.set(channelId, timerId);
                        return [2 /*return*/];
                    });
                }); });
                console.log('[PeerMessageListener] ✅ Peer message listener started successfully');
                return [2 /*return*/];
            });
        });
    };
    /**
     * Handle channel updates and detect new peer messages
     */
    PeerMessageListener.prototype.handleChannelUpdate = function (channelId, channelOwner, data) {
        return __awaiter(this, void 0, void 0, function () {
            var topicRoom, messages, validMessages, previousCount, currentCount, newMessages, peerMessages, error_2;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Skip if no main window to notify
                        if (!this.mainWindow) {
                            return [2 /*return*/];
                        }
                        console.log("[PeerMessageListener] \uD83D\uDCE8 Channel update for: ".concat(channelId));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        // Check if this is a topic/conversation channel
                        if (!this.topicModel) {
                            console.log('[PeerMessageListener] TopicModel not available yet');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.topicModel.enterTopicRoom(channelId)];
                    case 2:
                        topicRoom = _b.sent();
                        if (!topicRoom) {
                            // Not a chat topic, skip
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, topicRoom.retrieveAllMessages()];
                    case 3:
                        messages = _b.sent();
                        validMessages = messages.filter(function (msg) { var _a; return ((_a = msg.data) === null || _a === void 0 ? void 0 : _a.text) && typeof msg.data.text === 'string' && msg.data.text.trim() !== ''; });
                        previousCount = this.lastMessageCounts.get(channelId) || 0;
                        currentCount = validMessages.length;
                        if (currentCount > previousCount) {
                            console.log("[PeerMessageListener] \uD83C\uDD95 New messages detected in ".concat(channelId, ": ").concat(currentCount - previousCount, " new"));
                            newMessages = validMessages.slice(previousCount);
                            peerMessages = newMessages.filter(function (msg) {
                                var _a, _b;
                                var senderId = ((_a = msg.data) === null || _a === void 0 ? void 0 : _a.sender) || ((_b = msg.data) === null || _b === void 0 ? void 0 : _b.author) || msg.author;
                                return senderId !== _this.ownerId;
                            });
                            if (peerMessages.length > 0) {
                                console.log("[PeerMessageListener] \uD83D\uDCEC ".concat(peerMessages.length, " new peer messages in ").concat(channelId));
                                // Notify the UI about new messages
                                this.notifyUI(channelId, peerMessages);
                            }
                            // Update the count
                            this.lastMessageCounts.set(channelId, currentCount);
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _b.sent();
                        // Silently skip non-topic channels
                        if (!((_a = error_2.message) === null || _a === void 0 ? void 0 : _a.includes('not found'))) {
                            console.error("[PeerMessageListener] Error checking channel ".concat(channelId, ":"), error_2.message);
                        }
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Notify the UI about new peer messages
     */
    PeerMessageListener.prototype.notifyUI = function (channelId, newMessages) {
        var _this = this;
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return;
        }
        // Normalize P2P channel IDs to match what the UI expects
        // The UI normalizes P2P IDs by sorting them alphabetically
        var normalizedChannelId = channelId;
        if (channelId.includes('<->')) {
            var parts = channelId.split('<->');
            normalizedChannelId = parts.sort().join('<->');
            console.log("[PeerMessageListener] Normalized P2P channel ID: ".concat(channelId, " -> ").concat(normalizedChannelId));
        }
        console.log("[PeerMessageListener] \uD83D\uDCE4 Sending new message notification to UI for ".concat(normalizedChannelId));
        // Ensure webContents is ready
        if (!this.mainWindow.webContents || this.mainWindow.webContents.isLoading()) {
            console.log('[PeerMessageListener] WebContents not ready, queuing notification');
            setTimeout(function () { return _this.notifyUI(channelId, newMessages); }, 100);
            return;
        }
        // Send IPC event to renderer with normalized channel ID
        var eventData = {
            conversationId: normalizedChannelId,
            messages: newMessages.map(function (msg, index) {
                var _a, _b, _c;
                return ({
                    id: msg.id || msg.channelEntryHash || "msg-".concat(Date.now(), "-").concat(index),
                    conversationId: normalizedChannelId,
                    text: ((_a = msg.data) === null || _a === void 0 ? void 0 : _a.text) || '',
                    sender: ((_b = msg.data) === null || _b === void 0 ? void 0 : _b.sender) || ((_c = msg.data) === null || _c === void 0 ? void 0 : _c.author) || msg.author,
                    timestamp: msg.creationTime ? new Date(msg.creationTime).toISOString() : new Date().toISOString(),
                    status: 'received',
                    isAI: false
                });
            })
        };
        console.log("[PeerMessageListener] \uD83D\uDCE4\uD83D\uDCE4\uD83D\uDCE4 Sending chat:newMessages event with conversationId: ".concat(eventData.conversationId));
        this.mainWindow.webContents.send('chat:newMessages', eventData);
    };
    /**
     * Stop listening for messages
     */
    PeerMessageListener.prototype.stop = function () {
        console.log('[PeerMessageListener] Stopping peer message listener...');
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        // Clear all timers
        for (var _i = 0, _a = this.debounceTimers.values(); _i < _a.length; _i++) {
            var timer = _a[_i];
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        this.lastMessageCounts.clear();
        console.log('[PeerMessageListener] Peer message listener stopped');
    };
    return PeerMessageListener;
}());
exports.default = PeerMessageListener;
