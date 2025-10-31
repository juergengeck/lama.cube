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
exports.grantP2PChannelAccess = grantP2PChannelAccess;
exports.handleP2PChannelCreation = handleP2PChannelCreation;
exports.monitorP2PChannels = monitorP2PChannels;
/**
 * P2P Channel Access Manager
 *
 * Handles access control for P2P (peer-to-peer) channels.
 * P2P channels should only be accessible to the two participants,
 * not to groups like "everyone".
 */
var access_js_1 = require("@refinio/one.core/lib/access.js");
var storage_base_common_js_1 = require("@refinio/one.core/lib/storage-base-common.js");
var object_js_1 = require("@refinio/one.core/lib/util/object.js");
/**
 * Grant access to a P2P channel for the two participants
 *
 * @param {string} channelId - The P2P channel ID (format: id1<->id2)
 * @param {string} person1 - First participant's person ID
 * @param {string} person2 - Second participant's person ID
 * @param {Object} channelManager - The ChannelManager instance
 */
function grantP2PChannelAccess(channelId, person1, person2, channelManager) {
    return __awaiter(this, void 0, void 0, function () {
        var channelOwner, channelIdHash, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[P2PChannelAccess] Granting access for P2P channel:', channelId);
                    console.log('[P2PChannelAccess]   Person 1:', person1 === null || person1 === void 0 ? void 0 : person1.substring(0, 8));
                    console.log('[P2PChannelAccess]   Person 2:', person2 === null || person2 === void 0 ? void 0 : person2.substring(0, 8));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    channelOwner = null;
                    // Ensure the channel exists
                    return [4 /*yield*/, channelManager.createChannel(channelId, channelOwner)
                        // Calculate channel info hash
                    ];
                case 2:
                    // Ensure the channel exists
                    _b.sent();
                    return [4 /*yield*/, (0, object_js_1.calculateIdHashOfObj)({
                            $type$: 'ChannelInfo',
                            id: channelId,
                            owner: undefined // null owner becomes undefined in the hash calculation
                        })
                        // Grant access to both participants individually (not via groups)
                    ];
                case 3:
                    channelIdHash = _b.sent();
                    // Grant access to both participants individually (not via groups)
                    return [4 /*yield*/, (0, access_js_1.createAccess)([{
                                id: channelIdHash,
                                person: [person1, person2], // Only these two people
                                group: [], // NO group access!
                                mode: storage_base_common_js_1.SET_ACCESS_MODE.ADD
                            }])];
                case 4:
                    // Grant access to both participants individually (not via groups)
                    _b.sent();
                    console.log('[P2PChannelAccess] ✅ Access granted to P2P channel for both participants');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    // Access might already exist, that's ok
                    if (!((_a = error_1.message) === null || _a === void 0 ? void 0 : _a.includes('already exists'))) {
                        console.error('[P2PChannelAccess] Failed to grant P2P channel access:', error_1);
                        throw error_1;
                    }
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Handle P2P channel creation with proper access control
 * Called when a P2P topic is created
 *
 * @param {string} channelId - The P2P channel ID
 * @param {Object} leuteModel - The LeuteModel instance
 * @param {Object} channelManager - The ChannelManager instance
 */
function handleP2PChannelCreation(channelId, leuteModel, channelManager) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, id1, id2, me, myPersonId, ourId, peerId;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[P2PChannelAccess] Handling P2P channel creation:', channelId);
                    // Extract person IDs from channel ID (format: id1<->id2)
                    if (!channelId.includes('<->')) {
                        console.log('[P2PChannelAccess] Not a P2P channel, skipping');
                        return [2 /*return*/];
                    }
                    _a = channelId.split('<->'), id1 = _a[0], id2 = _a[1];
                    return [4 /*yield*/, leuteModel.me()];
                case 1:
                    me = _b.sent();
                    return [4 /*yield*/, me.mainIdentity()
                        // Determine which ID is ours and which is the peer's
                    ];
                case 2:
                    myPersonId = _b.sent();
                    if (myPersonId === id1) {
                        ourId = id1;
                        peerId = id2;
                    }
                    else if (myPersonId === id2) {
                        ourId = id2;
                        peerId = id1;
                    }
                    else {
                        console.warn('[P2PChannelAccess] Channel does not include our person ID');
                        return [2 /*return*/];
                    }
                    // Grant access to both participants
                    return [4 /*yield*/, grantP2PChannelAccess(channelId, ourId, peerId, channelManager)];
                case 3:
                    // Grant access to both participants
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Monitor for new P2P channels and grant proper access
 *
 * @param {Object} channelManager - The ChannelManager instance
 * @param {Object} leuteModel - The LeuteModel instance
 */
function monitorP2PChannels(channelManager, leuteModel) {
    var _this = this;
    console.log('[P2PChannelAccess] Monitoring for new P2P channels...');
    // Listen for channel updates
    channelManager.onUpdated(function (channelInfoIdHash, channelId, channelOwner, timeOfEarliestChange, data) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Only process P2P channels
                    if (!channelId.includes('<->')) {
                        return [2 /*return*/];
                    }
                    // P2P channels should have null owner
                    if (channelOwner !== null && channelOwner !== undefined) {
                        console.warn('[P2PChannelAccess] P2P channel has owner - this is unexpected:', channelOwner === null || channelOwner === void 0 ? void 0 : channelOwner.substring(0, 8));
                        return [2 /*return*/];
                    }
                    console.log('[P2PChannelAccess] P2P channel update detected:', channelId);
                    // Handle access for this P2P channel
                    return [4 /*yield*/, handleP2PChannelCreation(channelId, leuteModel, channelManager)];
                case 1:
                    // Handle access for this P2P channel
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
}
