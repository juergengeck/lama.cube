"use strict";
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
exports.createP2PTopic = createP2PTopic;
exports.autoCreateP2PTopicAfterPairing = autoCreateP2PTopicAfterPairing;
exports.ensureP2PTopicForIncomingMessage = ensureP2PTopicForIncomingMessage;
/**
 * P2P Topic Creator
 *
 * Automatically creates P2P topics/channels after successful pairing.
 * This ensures peers can immediately exchange messages without manual topic creation.
 */
var promise_js_1 = require("@refinio/one.core/lib/util/promise.js");
/**
 * Create a P2P topic for two participants
 *
 * @param {Object} topicModel - The TopicModel instance
 * @param {string} localPersonId - Local person ID
 * @param {string} remotePersonId - Remote person ID
 * @returns {Promise<Object>} The created topic
 */
function createP2PTopic(topicModel, localPersonId, remotePersonId) {
    return __awaiter(this, void 0, void 0, function () {
        var topicId, existingTopicRoom, error_1, topic, topicRoom, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    topicId = localPersonId < remotePersonId
                        ? "".concat(localPersonId, "<->").concat(remotePersonId)
                        : "".concat(remotePersonId, "<->").concat(localPersonId);
                    console.log('[P2PTopicCreator] Creating P2P topic:', topicId);
                    console.log('[P2PTopicCreator]   Local person:', localPersonId === null || localPersonId === void 0 ? void 0 : localPersonId.substring(0, 8));
                    console.log('[P2PTopicCreator]   Remote person:', remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, topicModel.enterTopicRoom(topicId)];
                case 2:
                    existingTopicRoom = _a.sent();
                    if (existingTopicRoom) {
                        console.log('[P2PTopicCreator] Topic already exists:', topicId);
                        return [2 /*return*/, existingTopicRoom];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    // Topic doesn't exist, proceed to create it
                    console.log('[P2PTopicCreator] Topic does not exist yet, creating...');
                    return [3 /*break*/, 4];
                case 4:
                    _a.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, topicModel.createOneToOneTopic(localPersonId, remotePersonId)];
                case 5:
                    topic = _a.sent();
                    console.log('[P2PTopicCreator] ✅ P2P topic created successfully:', topicId);
                    return [4 /*yield*/, topicModel.enterTopicRoom(topicId)];
                case 6:
                    topicRoom = _a.sent();
                    console.log('[P2PTopicCreator] ✅ Successfully entered topic room');
                    return [2 /*return*/, topicRoom];
                case 7:
                    error_2 = _a.sent();
                    console.error('[P2PTopicCreator] Failed to create P2P topic:', error_2);
                    throw error_2;
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Automatically create P2P topic after pairing success
 *
 * @param {Object} params - Parameters
 * @param {Object} params.topicModel - TopicModel instance
 * @param {Object} params.channelManager - ChannelManager instance
 * @param {string} params.localPersonId - Local person ID
 * @param {string} params.remotePersonId - Remote person ID
 * @param {boolean} params.initiatedLocally - Whether we initiated the pairing
 */
function autoCreateP2PTopicAfterPairing(params) {
    return __awaiter(this, void 0, void 0, function () {
        var topicModel, channelManager, localPersonId, remotePersonId, initiatedLocally, topicRoom, channelId, grantP2PChannelAccess, msgError_1, error_3, channelId, topicRoom, retryError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    topicModel = params.topicModel, channelManager = params.channelManager, localPersonId = params.localPersonId, remotePersonId = params.remotePersonId, initiatedLocally = params.initiatedLocally;
                    console.log('[P2PTopicCreator] 🤖 Auto-creating P2P topic after pairing');
                    console.log('[P2PTopicCreator]   Initiated locally:', initiatedLocally);
                    console.log('[P2PTopicCreator]   Local:', localPersonId === null || localPersonId === void 0 ? void 0 : localPersonId.substring(0, 8));
                    console.log('[P2PTopicCreator]   Remote:', remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8));
                    // Wait a moment for trust establishment to complete
                    return [4 /*yield*/, (0, promise_js_1.wait)(2000)];
                case 1:
                    // Wait a moment for trust establishment to complete
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 11, , 17]);
                    return [4 /*yield*/, createP2PTopic(topicModel, localPersonId, remotePersonId)
                        // Generate the P2P channel ID
                    ];
                case 3:
                    topicRoom = _a.sent();
                    channelId = localPersonId < remotePersonId
                        ? "".concat(localPersonId, "<->").concat(remotePersonId)
                        : "".concat(remotePersonId, "<->").concat(localPersonId);
                    // Ensure the channel exists in ChannelManager
                    return [4 /*yield*/, channelManager.createChannel(channelId, null)]; // null owner for P2P
                case 4:
                    // Ensure the channel exists in ChannelManager
                    _a.sent(); // null owner for P2P
                    console.log('[P2PTopicCreator] ✅ P2P topic and channel ready for messaging');
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./p2p-channel-access.js'); })];
                case 5:
                    grantP2PChannelAccess = (_a.sent()).grantP2PChannelAccess;
                    return [4 /*yield*/, grantP2PChannelAccess(channelId, localPersonId, remotePersonId, channelManager)];
                case 6:
                    _a.sent();
                    console.log('[P2PTopicCreator] ✅ Access rights configured for P2P channel');
                    if (!initiatedLocally) return [3 /*break*/, 10];
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 9, , 10]);
                    console.log('[P2PTopicCreator] Sending welcome message...');
                    // Use sendMessage with null channelOwner for P2P (shared channel)
                    return [4 /*yield*/, topicRoom.sendMessage('👋 Hello! Connection established.', undefined, null)];
                case 8:
                    // Use sendMessage with null channelOwner for P2P (shared channel)
                    _a.sent();
                    console.log('[P2PTopicCreator] ✅ Welcome message sent');
                    return [3 /*break*/, 10];
                case 9:
                    msgError_1 = _a.sent();
                    console.log('[P2PTopicCreator] Could not send welcome message:', msgError_1.message);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/, topicRoom];
                case 11:
                    error_3 = _a.sent();
                    console.error('[P2PTopicCreator] Failed to auto-create P2P topic:', error_3);
                    // If we fail, it might be because the other peer is also trying to create it
                    // Wait and try to enter the room instead
                    return [4 /*yield*/, (0, promise_js_1.wait)(3000)];
                case 12:
                    // If we fail, it might be because the other peer is also trying to create it
                    // Wait and try to enter the room instead
                    _a.sent();
                    _a.label = 13;
                case 13:
                    _a.trys.push([13, 15, , 16]);
                    channelId = localPersonId < remotePersonId
                        ? "".concat(localPersonId, "<->").concat(remotePersonId)
                        : "".concat(remotePersonId, "<->").concat(localPersonId);
                    return [4 /*yield*/, topicModel.enterTopicRoom(channelId)];
                case 14:
                    topicRoom = _a.sent();
                    console.log('[P2PTopicCreator] ✅ Entered existing topic room created by peer');
                    return [2 /*return*/, topicRoom];
                case 15:
                    retryError_1 = _a.sent();
                    console.error('[P2PTopicCreator] Failed to enter existing topic:', retryError_1);
                    throw retryError_1;
                case 16: return [3 /*break*/, 17];
                case 17: return [2 /*return*/];
            }
        });
    });
}
/**
 * Handle incoming messages for P2P topics that don't exist yet
 *
 * @param {Object} params - Parameters
 * @param {Object} params.topicModel - TopicModel instance
 * @param {Object} params.channelManager - ChannelManager instance
 * @param {Object} params.leuteModel - LeuteModel instance
 * @param {string} params.channelId - The channel ID where message was received
 * @param {Object} params.message - The received message
 */
function ensureP2PTopicForIncomingMessage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var topicModel, channelManager, leuteModel, channelId, message, _a, id1, id2, me, localPersonId, remotePersonId, topicRoom, error_4, topicRoom, grantP2PChannelAccess, createError_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    topicModel = params.topicModel, channelManager = params.channelManager, leuteModel = params.leuteModel, channelId = params.channelId, message = params.message;
                    // Check if this is a P2P channel
                    if (!channelId.includes('<->')) {
                        return [2 /*return*/]; // Not a P2P channel
                    }
                    console.log('[P2PTopicCreator] 📨 Received message in P2P channel:', channelId);
                    _a = channelId.split('<->'), id1 = _a[0], id2 = _a[1];
                    return [4 /*yield*/, leuteModel.me()];
                case 1:
                    me = _b.sent();
                    return [4 /*yield*/, me.mainIdentity()];
                case 2:
                    localPersonId = _b.sent();
                    if (localPersonId === id1) {
                        remotePersonId = id2;
                    }
                    else if (localPersonId === id2) {
                        remotePersonId = id1;
                    }
                    else {
                        console.error('[P2PTopicCreator] Channel does not include our person ID');
                        return [2 /*return*/];
                    }
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 5, , 13]);
                    return [4 /*yield*/, topicModel.enterTopicRoom(channelId)];
                case 4:
                    topicRoom = _b.sent();
                    console.log('[P2PTopicCreator] Topic already exists');
                    return [2 /*return*/, topicRoom];
                case 5:
                    error_4 = _b.sent();
                    // Topic doesn't exist, create it
                    console.log('[P2PTopicCreator] Topic does not exist, creating for incoming message...');
                    _b.label = 6;
                case 6:
                    _b.trys.push([6, 11, , 12]);
                    return [4 /*yield*/, createP2PTopic(topicModel, localPersonId, remotePersonId)
                        // Ensure channel exists and has proper access
                    ];
                case 7:
                    topicRoom = _b.sent();
                    // Ensure channel exists and has proper access
                    return [4 /*yield*/, channelManager.createChannel(channelId, null)];
                case 8:
                    // Ensure channel exists and has proper access
                    _b.sent();
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./p2p-channel-access.js'); })];
                case 9:
                    grantP2PChannelAccess = (_b.sent()).grantP2PChannelAccess;
                    return [4 /*yield*/, grantP2PChannelAccess(channelId, localPersonId, remotePersonId, channelManager)];
                case 10:
                    _b.sent();
                    console.log('[P2PTopicCreator] ✅ Created P2P topic for incoming message');
                    return [2 /*return*/, topicRoom];
                case 11:
                    createError_1 = _b.sent();
                    console.error('[P2PTopicCreator] Failed to create topic for incoming message:', createError_1);
                    throw createError_1;
                case 12: return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
