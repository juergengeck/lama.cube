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
var ContentSharingManager = /** @class */ (function () {
    function ContentSharingManager(nodeOneCore) {
        this.nodeOneCore = nodeOneCore;
        this.browserPersonId = undefined;
        this.nodePersonId = undefined;
        this.sharingEnabled = false;
    }
    /**
     * Initialize content sharing between Browser and Node
     * @param {string} browserPersonId - The browser instance's person ID
     */
    ContentSharingManager.prototype.initializeSharing = function (browserPersonId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[ContentSharing] Initializing content sharing...');
                        this.browserPersonId = browserPersonId;
                        this.nodePersonId = this.nodeOneCore.ownerId;
                        if (!this.browserPersonId || !this.nodePersonId) {
                            console.error('[ContentSharing] Missing person IDs for sharing setup');
                            return [2 /*return*/];
                        }
                        console.log('[ContentSharing] Browser Person:', ((_a = this.browserPersonId) === null || _a === void 0 ? void 0 : _a.substring(0, 8)) + '...');
                        console.log('[ContentSharing] Node Person:', ((_b = this.nodePersonId) === null || _b === void 0 ? void 0 : _b.substring(0, 8)) + '...');
                        // ALWAYS create Access objects for CHUM sync to work
                        // Access objects determine what data is shared during sync
                        return [4 /*yield*/, this.grantAccessToExistingContent()
                            // Set up listeners for new content
                        ];
                    case 1:
                        // ALWAYS create Access objects for CHUM sync to work
                        // Access objects determine what data is shared during sync
                        _c.sent();
                        // Set up listeners for new content
                        return [4 /*yield*/, this.setupNewContentListeners()];
                    case 2:
                        // Set up listeners for new content
                        _c.sent();
                        this.sharingEnabled = true;
                        console.log('[ContentSharing] ✅ Content sharing initialized - Access objects created');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Grant access to existing content
     */
    ContentSharingManager.prototype.grantAccessToExistingContent = function () {
        return __awaiter(this, void 0, void 0, function () {
            var createAccess, SET_ACCESS_MODE;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[ContentSharing] Granting access to existing content...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                    case 1:
                        createAccess = (_a.sent()).createAccess;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                    case 2:
                        SET_ACCESS_MODE = (_a.sent()).SET_ACCESS_MODE;
                        // 1. Grant access to Someone objects (contacts)
                        return [4 /*yield*/, this.grantAccessToContacts(createAccess, SET_ACCESS_MODE)
                            // 2. Grant access to channels (for messages)
                        ];
                    case 3:
                        // 1. Grant access to Someone objects (contacts)
                        _a.sent();
                        // 2. Grant access to channels (for messages)
                        return [4 /*yield*/, this.grantAccessToChannels(createAccess, SET_ACCESS_MODE)];
                    case 4:
                        // 2. Grant access to channels (for messages)
                        _a.sent();
                        console.log('[ContentSharing] ✅ Access granted to existing content');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Grant access to Someone objects (contacts in address book)
     */
    ContentSharingManager.prototype.grantAccessToContacts = function (createAccess, SET_ACCESS_MODE) {
        return __awaiter(this, void 0, void 0, function () {
            var others, _i, others_1, someone, profiles, _a, profiles_1, profile, error_1, error_2;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[ContentSharing] Granting access to contacts...');
                        if (!this.nodeOneCore.leuteModel) {
                            console.warn('[ContentSharing] LeuteModel not available');
                            return [2 /*return*/];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 14, , 15]);
                        return [4 /*yield*/, this.nodeOneCore.leuteModel.others()];
                    case 2:
                        others = _c.sent();
                        console.log("[ContentSharing] Found ".concat(others.length, " contacts to share"));
                        _i = 0, others_1 = others;
                        _c.label = 3;
                    case 3:
                        if (!(_i < others_1.length)) return [3 /*break*/, 13];
                        someone = others_1[_i];
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 11, , 12]);
                        // Grant the browser person access to this Someone object
                        return [4 /*yield*/, createAccess([{
                                    id: someone.idHash,
                                    person: [this.browserPersonId],
                                    group: [],
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 5:
                        // Grant the browser person access to this Someone object
                        _c.sent();
                        console.log("[ContentSharing] Granted access to contact: ".concat((_b = someone.idHash) === null || _b === void 0 ? void 0 : _b.substring(0, 8), "..."));
                        return [4 /*yield*/, someone.profiles()];
                    case 6:
                        profiles = _c.sent();
                        _a = 0, profiles_1 = profiles;
                        _c.label = 7;
                    case 7:
                        if (!(_a < profiles_1.length)) return [3 /*break*/, 10];
                        profile = profiles_1[_a];
                        return [4 /*yield*/, createAccess([{
                                    id: profile.idHash,
                                    person: [this.browserPersonId],
                                    group: [],
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9:
                        _a++;
                        return [3 /*break*/, 7];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        error_1 = _c.sent();
                        console.warn("[ContentSharing] Failed to grant access to contact:", error_1.message);
                        return [3 /*break*/, 12];
                    case 12:
                        _i++;
                        return [3 /*break*/, 3];
                    case 13:
                        console.log('[ContentSharing] ✅ Contact access granted');
                        return [3 /*break*/, 15];
                    case 14:
                        error_2 = _c.sent();
                        console.error('[ContentSharing] Failed to grant contact access:', error_2);
                        return [3 /*break*/, 15];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Grant access to channels (for message sync)
     */
    ContentSharingManager.prototype.grantAccessToChannels = function (createAccess, SET_ACCESS_MODE) {
        return __awaiter(this, void 0, void 0, function () {
            var calculateIdHashOfObj, channelInfos, _i, channelInfos_1, channelInfo, channelInfoId, error_3, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[ContentSharing] Granting access to channels...');
                        if (!this.nodeOneCore.channelManager) {
                            console.warn('[ContentSharing] ChannelManager not available');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                    case 1:
                        calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 11, , 12]);
                        return [4 /*yield*/, this.nodeOneCore.channelManager.getAllChannelInfos()];
                    case 3:
                        channelInfos = _a.sent();
                        console.log("[ContentSharing] Found ".concat(channelInfos.length, " channels to share"));
                        _i = 0, channelInfos_1 = channelInfos;
                        _a.label = 4;
                    case 4:
                        if (!(_i < channelInfos_1.length)) return [3 /*break*/, 10];
                        channelInfo = channelInfos_1[_i];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 9]);
                        return [4 /*yield*/, calculateIdHashOfObj({
                                $type$: 'ChannelInfo',
                                id: channelInfo.id,
                                owner: channelInfo.owner
                            })
                            // Grant access to the channel
                        ];
                    case 6:
                        channelInfoId = _a.sent();
                        // Grant access to the channel
                        return [4 /*yield*/, createAccess([{
                                    id: channelInfoId,
                                    person: [this.browserPersonId],
                                    group: [],
                                    mode: SET_ACCESS_MODE.ADD
                                }])];
                    case 7:
                        // Grant access to the channel
                        _a.sent();
                        console.log("[ContentSharing] Granted access to channel: ".concat(channelInfo.id));
                        return [3 /*break*/, 9];
                    case 8:
                        error_3 = _a.sent();
                        console.warn("[ContentSharing] Failed to grant access to channel ".concat(channelInfo.id, ":"), error_3.message);
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 4];
                    case 10:
                        console.log('[ContentSharing] ✅ Channel access granted');
                        return [3 /*break*/, 12];
                    case 11:
                        error_4 = _a.sent();
                        console.error('[ContentSharing] Failed to grant channel access:', error_4);
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set up listeners to grant access to new content automatically
     * This ensures Access objects are created for ALL new content
     */
    ContentSharingManager.prototype.setupNewContentListeners = function () {
        return __awaiter(this, void 0, void 0, function () {
            var OEvent, OEvent;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browserPersonId) {
                            console.warn('[ContentSharing] Cannot set up listeners - no browser person ID');
                            return [2 /*return*/];
                        }
                        console.log('[ContentSharing] Setting up listeners for new content...');
                        if (!this.nodeOneCore.leuteModel) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../../electron-ui/node_modules/@refinio/one.models/lib/misc/OEvent.js'); })];
                    case 1:
                        OEvent = (_a.sent()).OEvent;
                        // Listen for when a new Someone is added to "other" array
                        this.nodeOneCore.leuteModel.onSomeoneAdded = this.nodeOneCore.leuteModel.onSomeoneAdded || new OEvent();
                        this.nodeOneCore.leuteModel.onSomeoneAdded.listen(function (someoneId) { return __awaiter(_this, void 0, void 0, function () {
                            var createAccess, SET_ACCESS_MODE;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        console.log("[ContentSharing] New contact added: ".concat(String(someoneId).substring(0, 8), "..."));
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/access.js'); })];
                                    case 1:
                                        createAccess = (_a.sent()).createAccess;
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-base-common.js'); })];
                                    case 2:
                                        SET_ACCESS_MODE = (_a.sent()).SET_ACCESS_MODE;
                                        if (!this.browserPersonId) return [3 /*break*/, 4];
                                        return [4 /*yield*/, createAccess([{
                                                    id: someoneId,
                                                    person: [this.browserPersonId],
                                                    group: [],
                                                    mode: SET_ACCESS_MODE.ADD
                                                }])];
                                    case 3:
                                        _a.sent();
                                        _a.label = 4;
                                    case 4:
                                        console.log("[ContentSharing] \u2705 Access granted to new contact");
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        _a.label = 2;
                    case 2:
                        if (!this.nodeOneCore.channelManager) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../../electron-ui/node_modules/@refinio/one.models/lib/misc/OEvent.js'); })];
                    case 3:
                        OEvent = (_a.sent()).OEvent;
                        // ChannelManager has an onChannelCreated event
                        this.nodeOneCore.channelManager.onChannelCreated = this.nodeOneCore.channelManager.onChannelCreated || new OEvent();
                        this.nodeOneCore.channelManager.onChannelCreated.listen(function (channelInfo) { return __awaiter(_this, void 0, void 0, function () {
                            var createAccess, SET_ACCESS_MODE, calculateIdHashOfObj, channelInfoId;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        console.log("[ContentSharing] New channel created: ".concat(channelInfo.id));
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
                                                id: channelInfo.id,
                                                owner: channelInfo.owner
                                            })
                                            // Grant access to the new channel
                                        ];
                                    case 4:
                                        channelInfoId = _a.sent();
                                        if (!this.browserPersonId) return [3 /*break*/, 6];
                                        return [4 /*yield*/, createAccess([{
                                                    id: channelInfoId,
                                                    person: [this.browserPersonId],
                                                    group: [],
                                                    mode: SET_ACCESS_MODE.ADD
                                                }])];
                                    case 5:
                                        _a.sent();
                                        _a.label = 6;
                                    case 6:
                                        console.log("[ContentSharing] \u2705 Access granted to new channel");
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        _a.label = 4;
                    case 4:
                        console.log('[ContentSharing] ✅ New content listeners configured');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get sharing status
     */
    ContentSharingManager.prototype.getStatus = function () {
        return {
            enabled: this.sharingEnabled,
            browserPersonId: this.browserPersonId,
            nodePersonId: this.nodePersonId,
            samePersonMode: this.browserPersonId === this.nodePersonId
        };
    };
    return ContentSharingManager;
}());
exports.default = ContentSharingManager;
