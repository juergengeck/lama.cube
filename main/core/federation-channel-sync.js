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
exports.grantFederationAccessToChannel = grantFederationAccessToChannel;
exports.ensureFederatedChannel = ensureFederatedChannel;
exports.setupChannelSyncListeners = setupChannelSyncListeners;
/**
 * Federation Channel Sync Helper
 * Ensures channels are properly shared between browser and Node instances
 */
var access_js_1 = require("@refinio/one.core/lib/access.js");
var storage_base_common_js_1 = require("@refinio/one.core/lib/storage-base-common.js");
var object_js_1 = require("@refinio/one.core/lib/util/object.js");
/**
 * Grant federation access to a channel so both browser and Node can sync
 * @param {string} channelId - The channel ID (topic ID)
 * @param {string} channelOwner - The owner of the channel
 * @param {Array} federationGroupIds - Group IDs that should have access
 */
function grantFederationAccessToChannel(channelId, channelOwner, federationGroupIds) {
    return __awaiter(this, void 0, void 0, function () {
        var channelInfoHash, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('[FederationChannelSync] Granting federation access to channel:', channelId);
                    return [4 /*yield*/, (0, object_js_1.calculateIdHashOfObj)({
                            $type$: 'ChannelInfo',
                            id: channelId,
                            owner: channelOwner
                        })
                        // Grant access to all federation groups
                    ];
                case 1:
                    channelInfoHash = _a.sent();
                    // Grant access to all federation groups
                    return [4 /*yield*/, (0, access_js_1.createAccess)([{
                                id: channelInfoHash,
                                person: [],
                                group: federationGroupIds,
                                mode: storage_base_common_js_1.SET_ACCESS_MODE.ADD
                            }])];
                case 2:
                    // Grant access to all federation groups
                    _a.sent();
                    console.log('[FederationChannelSync] Access granted to federation groups:', federationGroupIds.length);
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    console.error('[FederationChannelSync] Failed to grant federation access:', error_1);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Ensure a channel exists and has proper federation access
 * This should be called by both browser and Node when creating channels
 */
function ensureFederatedChannel(channelManager, channelId, ownerId, federationGroup) {
    return __awaiter(this, void 0, void 0, function () {
        var existingChannels, _i, existingChannels_1, channelInfo, channels, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 11, , 12]);
                    return [4 /*yield*/, channelManager.getMatchingChannelInfos({
                            channelId: channelId
                        })];
                case 1:
                    existingChannels = _a.sent();
                    if (!(existingChannels && existingChannels.length > 0)) return [3 /*break*/, 6];
                    console.log('[FederationChannelSync] Channel already exists:', channelId);
                    if (!federationGroup) return [3 /*break*/, 5];
                    _i = 0, existingChannels_1 = existingChannels;
                    _a.label = 2;
                case 2:
                    if (!(_i < existingChannels_1.length)) return [3 /*break*/, 5];
                    channelInfo = existingChannels_1[_i];
                    return [4 /*yield*/, grantFederationAccessToChannel(channelId, channelInfo.owner, [federationGroup.groupIdHash])];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, existingChannels[0]];
                case 6:
                    // Create the channel
                    console.log('[FederationChannelSync] Creating federated channel:', channelId);
                    return [4 /*yield*/, channelManager.createChannel(channelId, ownerId)
                        // Grant federation access
                    ];
                case 7:
                    _a.sent();
                    if (!federationGroup) return [3 /*break*/, 9];
                    return [4 /*yield*/, grantFederationAccessToChannel(channelId, ownerId, [federationGroup.groupIdHash])];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [4 /*yield*/, channelManager.getMatchingChannelInfos({
                        channelId: channelId
                    })];
                case 10:
                    channels = _a.sent();
                    return [2 /*return*/, channels[0]];
                case 11:
                    error_2 = _a.sent();
                    console.error('[FederationChannelSync] Failed to ensure federated channel:', error_2);
                    throw error_2;
                case 12: return [2 /*return*/];
            }
        });
    });
}
/**
 * Set up channel sync listeners between browser and Node
 * This ensures both instances react to channel updates
 */
function setupChannelSyncListeners(channelManager, instanceName, onChannelUpdate) {
    var _this = this;
    console.log("[FederationChannelSync] Setting up sync listeners for ".concat(instanceName));
    // Listen for channel updates
    channelManager.onUpdated(function (channelInfoIdHash, channelId, channelOwner, timeOfEarliestChange, data) { return __awaiter(_this, void 0, void 0, function () {
        var chatMessages;
        return __generator(this, function (_a) {
            console.log("[FederationChannelSync][".concat(instanceName, "] Channel updated:"), channelId);
            console.log("[FederationChannelSync][".concat(instanceName, "] Data items:"), data.length);
            chatMessages = data.filter(function (item) { return item.$type$ === 'ChatMessage'; });
            if (chatMessages.length > 0) {
                console.log("[FederationChannelSync][".concat(instanceName, "] Found ").concat(chatMessages.length, " chat messages"));
                // Notify about new messages
                if (onChannelUpdate) {
                    onChannelUpdate(channelId, chatMessages);
                }
            }
            return [2 /*return*/];
        });
    }); });
}
exports.default = {
    grantFederationAccessToChannel: grantFederationAccessToChannel,
    ensureFederatedChannel: ensureFederatedChannel,
    setupChannelSyncListeners: setupChannelSyncListeners
};
