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
exports.MessageVersionManager = exports.VersionedMessage = void 0;
var VersionedMessage = /** @class */ (function () {
    function VersionedMessage(data) {
        // Extract version metadata from attachments if it exists
        var attachments = data.attachments || [];
        var versionAttachment = attachments.find(function (a) { return a.type === 'version-metadata'; });
        this.versionMetadata = (versionAttachment === null || versionAttachment === void 0 ? void 0 : versionAttachment.data) || {
            type: 'version-metadata',
            version: data.version || 1,
            previousVersion: data.previousVersion,
            editedAt: data.editedAt,
            editReason: data.editReason,
            isRetracted: data.isRetracted || false,
            retractedAt: data.retractedAt,
            retractReason: data.retractReason
        };
        this.message = {
            text: data.text,
            author: data.author,
            timestamp: data.timestamp || Date.now(),
            subjects: data.subjects || [],
            keywords: data.keywords || [],
            attachments: attachments
        };
    }
    /**
     * Create an edited version of this message
     */
    VersionedMessage.prototype.createEditedVersion = function (newText, editReason) {
        if (editReason === void 0) { editReason = null; }
        return new VersionedMessage({
            id: this.id, // Keep original ID
            versionId: generateVersionId(),
            version: this.version + 1,
            previousVersion: this.versionId, // Link to current version
            text: newText,
            format: this.format,
            subjects: this.subjects,
            keywords: this.keywords,
            attachments: this.attachments,
            author: this.author,
            timestamp: this.timestamp, // Keep original timestamp
            editedAt: new Date().toISOString(),
            editReason: editReason,
            isRetracted: false, // Edits clear retraction
            trustLevel: this.trustLevel
        });
    };
    /**
     * Create a retraction marker for this message
     */
    VersionedMessage.prototype.createRetraction = function (reason) {
        if (reason === void 0) { reason = null; }
        return new VersionedMessage({
            id: this.id,
            versionId: generateVersionId(),
            version: this.version + 1,
            previousVersion: this.versionId,
            text: '[Message retracted]',
            format: 'plain',
            subjects: [],
            keywords: [],
            attachments: [], // Attachments not included in retraction
            author: this.author,
            timestamp: this.timestamp,
            isRetracted: true,
            retractedAt: new Date().toISOString(),
            retractReason: reason,
            trustLevel: this.trustLevel
        });
    };
    return VersionedMessage;
}());
exports.VersionedMessage = VersionedMessage;
/**
 * Message Version Manager
 * Handles version chains and retrieval
 */
var MessageVersionManager = /** @class */ (function () {
    function MessageVersionManager(channelManager) {
        this.channelManager = channelManager;
        this.versionCache = new Map(); // messageId -> version chain
        this.latestVersions = new Map(); // messageId -> latest version hash
    }
    /**
     * Store a new message or version
     */
    MessageVersionManager.prototype.storeMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var storeUnversionedObject, result, hash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 1:
                        storeUnversionedObject = (_a.sent()).storeUnversionedObject;
                        return [4 /*yield*/, storeUnversionedObject(message)];
                    case 2:
                        result = _a.sent();
                        hash = result.hash;
                        // Update version tracking
                        if (!this.versionCache.has(message.id)) {
                            this.versionCache.set(message.id, []);
                        }
                        this.versionCache.get(message.id).push({
                            hash: hash,
                            version: message.version,
                            timestamp: message.editedAt || message.timestamp,
                            isRetracted: message.isRetracted
                        });
                        // Update latest version
                        this.latestVersions.set(message.id, hash);
                        console.log("[MessageVersioning] Stored message ".concat(message.id, " v").concat(message.version, ": ").concat(hash.toString().substring(0, 8), "..."));
                        return [2 /*return*/, hash];
                }
            });
        });
    };
    /**
     * Get the latest version of a message
     */
    MessageVersionManager.prototype.getLatestVersion = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var latestHash, getObject, message, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        latestHash = this.latestVersions.get(messageId);
                        if (!latestHash) {
                            return [2 /*return*/, null];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 2:
                        getObject = (_a.sent()).getObject;
                        return [4 /*yield*/, getObject(latestHash)];
                    case 3:
                        message = _a.sent();
                        return [2 /*return*/, message];
                    case 4:
                        error_1 = _a.sent();
                        console.error("[MessageVersioning] Failed to get message ".concat(messageId, ":"), error_1);
                        return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all versions of a message
     */
    MessageVersionManager.prototype.getVersionHistory = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var versionChain, getObject, versions, _i, versionChain_1, versionInfo, message, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        versionChain = this.versionCache.get(messageId);
                        if (!versionChain) {
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 1:
                        getObject = (_a.sent()).getObject;
                        versions = [];
                        _i = 0, versionChain_1 = versionChain;
                        _a.label = 2;
                    case 2:
                        if (!(_i < versionChain_1.length)) return [3 /*break*/, 7];
                        versionInfo = versionChain_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, getObject(versionInfo.hash)];
                    case 4:
                        message = _a.sent();
                        versions.push(__assign(__assign({}, message), { hash: versionInfo.hash }));
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        console.warn("[MessageVersioning] Could not retrieve version ".concat(versionInfo.hash, ":"), error_2);
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, versions.sort(function (a, b) { return (a.version || 0) - (b.version || 0); })];
                }
            });
        });
    };
    /**
     * Edit a message (creates new version)
     */
    MessageVersionManager.prototype.editMessage = function (messageId_1, newText_1) {
        return __awaiter(this, arguments, void 0, function (messageId, newText, editReason) {
            var currentMessage, editedMessage, hash;
            if (editReason === void 0) { editReason = null; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getLatestVersion(messageId)];
                    case 1:
                        currentMessage = _a.sent();
                        if (!currentMessage) {
                            throw new Error("Message ".concat(messageId, " not found"));
                        }
                        if (currentMessage.isRetracted) {
                            throw new Error('Cannot edit a retracted message');
                        }
                        editedMessage = currentMessage.createEditedVersion(newText, editReason);
                        return [4 /*yield*/, this.storeMessage(editedMessage)];
                    case 2:
                        hash = _a.sent();
                        // Notify listeners
                        this.notifyVersionChange(messageId, editedMessage, 'edited');
                        return [2 /*return*/, {
                                hash: hash,
                                message: editedMessage
                            }];
                }
            });
        });
    };
    /**
     * Retract a message (soft delete)
     */
    MessageVersionManager.prototype.retractMessage = function (messageId_1) {
        return __awaiter(this, arguments, void 0, function (messageId, reason) {
            var currentMessage, retraction, hash;
            if (reason === void 0) { reason = null; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getLatestVersion(messageId)];
                    case 1:
                        currentMessage = _a.sent();
                        if (!currentMessage) {
                            throw new Error("Message ".concat(messageId, " not found"));
                        }
                        if (currentMessage.isRetracted) {
                            console.warn("Message ".concat(messageId, " is already retracted"));
                            return [2 /*return*/, null];
                        }
                        retraction = currentMessage.createRetraction(reason);
                        return [4 /*yield*/, this.storeMessage(retraction)];
                    case 2:
                        hash = _a.sent();
                        // Notify listeners
                        this.notifyVersionChange(messageId, retraction, 'retracted');
                        return [2 /*return*/, {
                                hash: hash,
                                message: retraction
                            }];
                }
            });
        });
    };
    /**
     * Build version chain from channel data
     */
    MessageVersionManager.prototype.buildVersionChain = function (channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, messageGroups, _i, messages_1, msg, _a, messageGroups_1, _b, messageId, versions, latest;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("[MessageVersioning] Building version chain for channel ".concat(channelId));
                        return [4 /*yield*/, this.channelManager.getChannelMessages(channelId)];
                    case 1:
                        messages = _c.sent();
                        messageGroups = new Map();
                        for (_i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
                            msg = messages_1[_i];
                            if (!messageGroups.has(msg.id)) {
                                messageGroups.set(msg.id, []);
                            }
                            messageGroups.get(msg.id).push(msg);
                        }
                        // Build chains
                        for (_a = 0, messageGroups_1 = messageGroups; _a < messageGroups_1.length; _a++) {
                            _b = messageGroups_1[_a], messageId = _b[0], versions = _b[1];
                            // Sort by version number
                            versions.sort(function (a, b) { return a.version - b.version; });
                            // Cache the chain
                            this.versionCache.set(messageId, versions.map(function (v) { return ({
                                hash: v.hash,
                                version: v.version,
                                timestamp: v.editedAt || v.timestamp,
                                isRetracted: v.isRetracted
                            }); }));
                            latest = versions[versions.length - 1];
                            this.latestVersions.set(messageId, latest.hash);
                        }
                        console.log("[MessageVersioning] Built ".concat(messageGroups.size, " message chains"));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Notify listeners of version changes
     * TODO: Implement IPC-based notification to UI if needed
     */
    MessageVersionManager.prototype.notifyVersionChange = function (messageId, newVersion, changeType) {
        // Main process cannot dispatch window events - would need IPC here
        // For now, just log
        console.log('[MessageVersioning] Version change:', { messageId: messageId, newVersion: newVersion, changeType: changeType });
    };
    /**
     * Get display version of message (handles retraction)
     */
    MessageVersionManager.prototype.getDisplayMessage = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getLatestVersion(messageId)];
                    case 1:
                        message = _a.sent();
                        if (!message) {
                            return [2 /*return*/, null];
                        }
                        if (message.isRetracted) {
                            // Return sanitized retracted message
                            return [2 /*return*/, __assign(__assign({}, message), { text: "[Message retracted".concat(message.retractReason ? ': ' + message.retractReason : '', "]"), attachments: [], subjects: [], keywords: [] })];
                        }
                        return [2 /*return*/, message];
                }
            });
        });
    };
    return MessageVersionManager;
}());
exports.MessageVersionManager = MessageVersionManager;
/**
 * Generate unique version ID
 */
function generateVersionId() {
    return "".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
}
/**
 * Export for use in chat handlers
 */
exports.default = {
    VersionedMessage: VersionedMessage,
    MessageVersionManager: MessageVersionManager
};
