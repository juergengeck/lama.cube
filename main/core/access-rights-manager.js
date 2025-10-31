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
/**
 * Access Rights Manager for Node.js ONE.core instance
 * Based on one.leute LeuteAccessRightsManager pattern
 */
/**
 * Access Rights Manager for Node.js instance
 * Handles proper access rights setup for channel sharing with browser instance
 */
var NodeAccessRightsManager = /** @class */ (function () {
    function NodeAccessRightsManager(channelManager, connectionsModel, leuteModel) {
        var _this = this;
        this.channelManager = channelManager;
        this.leuteModel = leuteModel;
        this.connectionsModel = connectionsModel;
        this.groupConfig = {};
        // Set up automatic access rights for new channels
        this.channelManager.onUpdated(function (channelInfoIdHash, channelId, channelOwner, timeOfEarliestChange, data) { return __awaiter(_this, void 0, void 0, function () {
            var isP2PChannel, isPrivateChannel, createAccess, SET_ACCESS_MODE, ensureIdHash, error_1, createAccess, SET_ACCESS_MODE, ensureIdHash, error_2;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(channelInfoIdHash && this.groupConfig.federation)) return [3 /*break*/, 14];
                        isP2PChannel = channelId.includes('<->');
                        isPrivateChannel = channelId === 'contacts' // Note: 'lama' and 'hi' are user-visible channels
                        ;
                        if (!(isP2PChannel || isPrivateChannel)) return [3 /*break*/, 8];
                        console.log("[NodeAccessRights] Skipping automatic access for ".concat(isPrivateChannel ? 'private' : 'P2P', " channel: ").concat(channelId));
                        if (!isPrivateChannel) return [3 /*break*/, 7];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 2:
                        createAccess = (_c.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 3:
                        SET_ACCESS_MODE = (_c.sent()).SET_ACCESS_MODE;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/type-checks.js'); })];
                    case 4:
                        ensureIdHash = (_c.sent()).ensureIdHash;
                        return [4 /*yield*/, createAccess([{
                                    id: ensureIdHash(channelInfoIdHash),
                                    person: [],
                                    group: this.getGroups('federation'), // ONLY federation
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 5:
                        _c.sent();
                        console.log("[NodeAccessRights] \u2705 Federation-only access granted for private channel: ".concat(channelId));
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _c.sent();
                        if (!((_a = error_1.message) === null || _a === void 0 ? void 0 : _a.includes('already exists'))) {
                            console.error('[NodeAccessRights] Failed to grant federation access:', error_1.message);
                        }
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                    case 8:
                        _c.trys.push([8, 13, , 14]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 9:
                        createAccess = (_c.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 10:
                        SET_ACCESS_MODE = (_c.sent()).SET_ACCESS_MODE;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/type-checks.js'); })];
                    case 11:
                        ensureIdHash = (_c.sent()).ensureIdHash;
                        return [4 /*yield*/, createAccess([{
                                    id: ensureIdHash(channelInfoIdHash),
                                    person: [],
                                    group: this.getGroups('federation', 'replicant'), // NOT everyone
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 12:
                        _c.sent();
                        console.log("[NodeAccessRights] \u2705 Access granted for channel: ".concat(channelId));
                        return [3 /*break*/, 14];
                    case 13:
                        error_2 = _c.sent();
                        // Access might already exist, that's ok
                        if (!((_b = error_2.message) === null || _b === void 0 ? void 0 : _b.includes('already exists'))) {
                            console.error('[NodeAccessRights] Failed to grant access:', error_2.message);
                        }
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        }); });
    }
    /**
     * Initialize the access rights manager with group configuration
     */
    NodeAccessRightsManager.prototype.init = function (groups) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (groups) {
                            this.groupConfig = groups;
                        }
                        console.log('[NodeAccessRights] Initializing with groups:', Object.keys(this.groupConfig));
                        return [4 /*yield*/, this.giveAccessToChannels()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.giveAccessToMainProfile()];
                    case 2:
                        _a.sent();
                        console.log('[NodeAccessRights] ✅ Initialized successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Shutdown the access rights manager
     */
    NodeAccessRightsManager.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.groupConfig = {};
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get group IDs by name
     */
    NodeAccessRightsManager.prototype.getGroups = function () {
        var groupNames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            groupNames[_i] = arguments[_i];
        }
        var groups = [];
        for (var _a = 0, groupNames_1 = groupNames; _a < groupNames_1.length; _a++) {
            var groupName = groupNames_1[_a];
            var groupConfigEntry = this.groupConfig[groupName];
            if (groupConfigEntry !== undefined) {
                // Ensure we're pushing a simple value, not a frozen object
                groups.push(groupConfigEntry);
            }
        }
        return groups;
    };
    /**
     * Give access to main profile for everybody and federation
     */
    NodeAccessRightsManager.prototype.giveAccessToMainProfile = function () {
        return __awaiter(this, void 0, void 0, function () {
            var serializeWithType, createAccess_1, SET_ACCESS_MODE_1, me, mainProfile_1, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/promise.js'); })];
                    case 1:
                        serializeWithType = (_a.sent()).serializeWithType;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 2:
                        createAccess_1 = (_a.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 3:
                        SET_ACCESS_MODE_1 = (_a.sent()).SET_ACCESS_MODE;
                        return [4 /*yield*/, this.leuteModel.me()];
                    case 4:
                        me = _a.sent();
                        mainProfile_1 = me.mainProfileLazyLoad();
                        return [4 /*yield*/, serializeWithType('Share', function () { return __awaiter(_this, void 0, void 0, function () {
                                var setAccessParam;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            setAccessParam = {
                                                id: mainProfile_1.idHash,
                                                person: [],
                                                group: this.getGroups('everyone', 'federation', 'replicant'),
                                                mode: SET_ACCESS_MODE_1.ADD
                                            };
                                            return [4 /*yield*/, createAccess_1([setAccessParam])];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 5:
                        _a.sent();
                        console.log('[NodeAccessRights] ✅ Granted access to main profile');
                        return [3 /*break*/, 7];
                    case 6:
                        error_3 = _a.sent();
                        console.error('[NodeAccessRights] Failed to grant access to main profile:', error_3);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set up access rights for channels
     */
    NodeAccessRightsManager.prototype.giveAccessToChannels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var serializeWithType, createAccess_2, SET_ACCESS_MODE_2, calculateIdHashOfObj_1, me, mainId, channels_1, error_4;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/promise.js'); })];
                    case 1:
                        serializeWithType = (_a.sent()).serializeWithType;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 2:
                        createAccess_2 = (_a.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 3:
                        SET_ACCESS_MODE_2 = (_a.sent()).SET_ACCESS_MODE;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 4:
                        calculateIdHashOfObj_1 = (_a.sent()).calculateIdHashOfObj;
                        return [4 /*yield*/, this.leuteModel.me()];
                    case 5:
                        me = _a.sent();
                        return [4 /*yield*/, me.mainIdentity()
                            // Get all existing channels and grant access
                        ];
                    case 6:
                        mainId = _a.sent();
                        return [4 /*yield*/, this.channelManager.getMatchingChannelInfos()];
                    case 7:
                        channels_1 = _a.sent();
                        console.log("[NodeAccessRights] Setting up access for ".concat(channels_1.length, " channels"));
                        return [4 /*yield*/, serializeWithType('IdAccess', function () { return __awaiter(_this, void 0, void 0, function () {
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: 
                                        // Apply access rights to channels selectively
                                        return [4 /*yield*/, Promise.all(channels_1.map(function (channel) { return __awaiter(_this, void 0, void 0, function () {
                                                var isP2PChannel, isPrivateChannel, channelIdHash_1, channelIdHash;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            isP2PChannel = channel.id.includes('<->');
                                                            isPrivateChannel = channel.id === 'contacts' // Note: 'lama' and 'hi' are user-visible channels
                                                            ;
                                                            if (!isPrivateChannel) return [3 /*break*/, 4];
                                                            console.log("[NodeAccessRights] Skipping private channel: ".concat(channel.id));
                                                            // Only share with federation (browser), NOT with everyone
                                                            return [4 /*yield*/, this.channelManager.createChannel(channel.id, channel.owner)];
                                                        case 1:
                                                            // Only share with federation (browser), NOT with everyone
                                                            _a.sent();
                                                            return [4 /*yield*/, calculateIdHashOfObj_1({
                                                                    $type$: 'ChannelInfo',
                                                                    id: channel.id,
                                                                    owner: channel.owner
                                                                })];
                                                        case 2:
                                                            channelIdHash_1 = _a.sent();
                                                            return [4 /*yield*/, createAccess_2([{
                                                                        id: channelIdHash_1,
                                                                        person: [],
                                                                        group: this.getGroups('federation'), // ONLY federation, not everyone!
                                                                        mode: SET_ACCESS_MODE_2.ADD
                                                                    }])];
                                                        case 3:
                                                            _a.sent();
                                                            return [2 /*return*/];
                                                        case 4:
                                                            // For P2P channels, handle specially
                                                            if (isP2PChannel) {
                                                                console.log("[NodeAccessRights] P2P channel detected: ".concat(channel.id));
                                                                // P2P channels should only be accessible to the participants
                                                                // Access should be granted per-person when the channel is created
                                                                // Not to everyone group!
                                                                return [2 /*return*/]; // Skip automatic group access for P2P channels
                                                            }
                                                            // For other channels (future shared channels), grant broader access
                                                            return [4 /*yield*/, this.channelManager.createChannel(channel.id, channel.owner)];
                                                        case 5:
                                                            // For other channels (future shared channels), grant broader access
                                                            _a.sent();
                                                            return [4 /*yield*/, calculateIdHashOfObj_1({
                                                                    $type$: 'ChannelInfo',
                                                                    id: channel.id,
                                                                    owner: channel.owner
                                                                })
                                                                // Only share with federation and replicant, not everyone
                                                            ];
                                                        case 6:
                                                            channelIdHash = _a.sent();
                                                            // Only share with federation and replicant, not everyone
                                                            return [4 /*yield*/, createAccess_2([{
                                                                        id: channelIdHash,
                                                                        person: [],
                                                                        group: this.getGroups('federation', 'replicant'),
                                                                        mode: SET_ACCESS_MODE_2.ADD
                                                                    }])];
                                                        case 7:
                                                            // Only share with federation and replicant, not everyone
                                                            _a.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); }))];
                                        case 1:
                                            // Apply access rights to channels selectively
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 8:
                        _a.sent();
                        console.log('[NodeAccessRights] ✅ Channel access rights configured');
                        return [3 /*break*/, 10];
                    case 9:
                        error_4 = _a.sent();
                        console.error('[NodeAccessRights] Failed to setup channel access:', error_4);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Grant access to a specific channel for federation
     */
    NodeAccessRightsManager.prototype.grantChannelAccess = function (channelId, owner) {
        return __awaiter(this, void 0, void 0, function () {
            var createAccess, SET_ACCESS_MODE, calculateIdHashOfObj, channelIdHash, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 1:
                        createAccess = (_a.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 2:
                        SET_ACCESS_MODE = (_a.sent()).SET_ACCESS_MODE;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 3:
                        calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'ChannelInfo',
                                id: channelId,
                                owner: owner
                            })];
                    case 4:
                        channelIdHash = _a.sent();
                        return [4 /*yield*/, createAccess([{
                                    id: channelIdHash,
                                    person: [],
                                    group: this.getGroups('federation', 'replicant', 'everyone'),
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 5:
                        _a.sent();
                        console.log("[NodeAccessRights] \u2705 Granted federation access to channel: ".concat(channelId));
                        return [3 /*break*/, 7];
                    case 6:
                        error_5 = _a.sent();
                        console.error("[NodeAccessRights] Failed to grant channel access for ".concat(channelId, ":"), error_5);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return NodeAccessRightsManager;
}());
exports.default = NodeAccessRightsManager;
