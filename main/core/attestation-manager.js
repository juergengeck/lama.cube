"use strict";
/**
 * Attestation Manager for Message Audit
 *
 * Manages creation, storage, and retrieval of attestations
 * Attestations are stored as Topic objects and synced via ONE.core
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
exports.AttestationManager = void 0;
/**
 * Attestation Manager
 */
var AttestationManager = /** @class */ (function () {
    function AttestationManager(channelManager, trustedKeysManager, leuteModel) {
        this.channelManager = channelManager;
        this.trust = trustedKeysManager;
        this.leuteModel = leuteModel;
        this.attestationCache = new Map(); // messageHash -> attestations[]
    }
    /**
     * Create an attestation for a message
     *
     * @param {Object} params
     * @param {string} params.messageHash - SHA256 hash of message version
     * @param {number} params.messageVersion - Version number
     * @param {string} params.attestedContent - Content being attested
     * @param {string} params.attestationType - Type of attestation
     * @param {string} params.attestationClaim - Human-readable claim
     * @param {string} params.topicId - Topic containing the message
     * @returns {Promise<Object>} Created attestation
     */
    AttestationManager.prototype.createAttestation = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var messageHash, messageVersion, attestedContent, _a, attestationType, attestationClaim, topicId, me, profile, auditorId, auditorName, attestation, storeUnversionedObject, result, attestationHash, certificateHash, error_1, error_2, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        messageHash = params.messageHash, messageVersion = params.messageVersion, attestedContent = params.attestedContent, _a = params.attestationType, attestationType = _a === void 0 ? 'reproduction-correct' : _a, attestationClaim = params.attestationClaim, topicId = params.topicId;
                        if (!messageHash || !attestedContent) {
                            throw new Error('Message hash and content are required');
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 14, , 15]);
                        return [4 /*yield*/, this.leuteModel.me()];
                    case 2:
                        me = _b.sent();
                        return [4 /*yield*/, me.mainProfile()];
                    case 3:
                        profile = _b.sent();
                        auditorId = me.personId;
                        auditorName = (profile === null || profile === void 0 ? void 0 : profile.name) || 'Unknown Auditor';
                        attestation = {
                            $type$: 'MessageAttestation',
                            messageHash: messageHash,
                            messageVersion: messageVersion || 1,
                            attestedContent: attestedContent,
                            auditorId: auditorId,
                            auditorName: auditorName,
                            timestamp: new Date().toISOString(),
                            attestationType: attestationType,
                            attestationClaim: attestationClaim || "I attest that this ".concat(attestationType, " is correct"),
                            attestationMethod: 'manual-verification',
                            topicId: topicId
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 4:
                        storeUnversionedObject = (_b.sent()).storeUnversionedObject;
                        return [4 /*yield*/, storeUnversionedObject(attestation)];
                    case 5:
                        result = _b.sent();
                        attestationHash = result.hash;
                        console.log('[AttestationManager] Created attestation:', String(attestationHash).substring(0, 8));
                        certificateHash = null;
                        if (!this.trust) return [3 /*break*/, 9];
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.trust.certify('AffirmationCertificate', {
                                data: attestationHash
                            })];
                    case 7:
                        certificateHash = _b.sent();
                        console.log('[AttestationManager] Created certificate:', String(certificateHash).substring(0, 8));
                        return [3 /*break*/, 9];
                    case 8:
                        error_1 = _b.sent();
                        console.warn('[AttestationManager] Could not create certificate:', error_1.message);
                        return [3 /*break*/, 9];
                    case 9:
                        if (!(this.channelManager && topicId)) return [3 /*break*/, 13];
                        _b.label = 10;
                    case 10:
                        _b.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, this.storeInTopic(topicId, attestation, attestationHash)];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        error_2 = _b.sent();
                        console.warn('[AttestationManager] Could not store in topic:', error_2.message);
                        return [3 /*break*/, 13];
                    case 13:
                        // Cache the attestation
                        this.addToCache(messageHash, attestation);
                        return [2 /*return*/, {
                                attestation: attestation,
                                hash: attestationHash,
                                certificateHash: certificateHash
                            }];
                    case 14:
                        error_3 = _b.sent();
                        console.error('[AttestationManager] Error creating attestation:', error_3);
                        throw error_3;
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store attestation in Topic structure
     *
     * @private
     */
    AttestationManager.prototype.storeInTopic = function (topicId, attestation, attestationHash) {
        return __awaiter(this, void 0, void 0, function () {
            var channelEntry, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.channelManager) {
                            console.warn('[AttestationManager] ChannelManager not available');
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        channelEntry = {
                            $type$: 'ChannelEntry',
                            channel: topicId,
                            data: attestation,
                            timestamp: attestation.timestamp,
                            author: attestation.auditorId
                        };
                        // Store through channel manager (this will sync)
                        return [4 /*yield*/, this.channelManager.addToChannel(topicId, channelEntry)];
                    case 2:
                        // Store through channel manager (this will sync)
                        _a.sent();
                        console.log('[AttestationManager] Stored attestation in topic:', topicId);
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        console.error('[AttestationManager] Failed to store in topic:', error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get attestations for a message
     *
     * @param {string} messageHash - Message hash
     * @returns {Promise<Array>} Array of attestations
     */
    AttestationManager.prototype.getAttestationsForMessage = function (messageHash) {
        return __awaiter(this, void 0, void 0, function () {
            var getObject, getAllEntries, attestationHashes, attestations, _i, attestationHashes_1, hash, attestation, error_5, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Check cache first
                        if (this.attestationCache.has(messageHash)) {
                            return [2 /*return*/, (_a = this.attestationCache) === null || _a === void 0 ? void 0 : _a.get(messageHash)];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 11, , 12]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 2:
                        getObject = (_b.sent()).getObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/reverse-map-query.js'); })];
                    case 3:
                        getAllEntries = (_b.sent()).getAllEntries;
                        return [4 /*yield*/, getAllEntries(messageHash, 'MessageAttestation')];
                    case 4:
                        attestationHashes = _b.sent();
                        attestations = [];
                        _i = 0, attestationHashes_1 = attestationHashes;
                        _b.label = 5;
                    case 5:
                        if (!(_i < attestationHashes_1.length)) return [3 /*break*/, 10];
                        hash = attestationHashes_1[_i];
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, getObject(hash)];
                    case 7:
                        attestation = _b.sent();
                        if (attestation.messageHash === messageHash) {
                            attestations.push(attestation);
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        error_5 = _b.sent();
                        console.warn('[AttestationManager] Could not retrieve attestation:', hash);
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 5];
                    case 10:
                        // Update cache
                        this.attestationCache.set(messageHash, attestations);
                        return [2 /*return*/, attestations];
                    case 11:
                        error_6 = _b.sent();
                        console.error('[AttestationManager] Error getting attestations:', error_6);
                        return [2 /*return*/, []];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all attestations for a topic
     *
     * @param {string} topicId - Topic ID
     * @returns {Promise<Array>} Array of attestations
     */
    AttestationManager.prototype.getAttestationsForTopic = function (topicId) {
        return __awaiter(this, void 0, void 0, function () {
            var entries, attestations, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.channelManager) {
                            return [2 /*return*/, []];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.channelManager.getChannelEntries(topicId)];
                    case 2:
                        entries = _a.sent();
                        attestations = entries
                            .filter(function (entry) { var _a; return ((_a = entry.data) === null || _a === void 0 ? void 0 : _a.$type$) === 'MessageAttestation'; })
                            .map(function (entry) { return entry.data; });
                        return [2 /*return*/, attestations];
                    case 3:
                        error_7 = _a.sent();
                        console.error('[AttestationManager] Error getting topic attestations:', error_7);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get attestations by auditor
     *
     * @param {string} auditorId - Auditor person ID
     * @returns {Promise<Array>} Array of attestations
     */
    AttestationManager.prototype.getAttestationsByAuditor = function (auditorId) {
        return __awaiter(this, void 0, void 0, function () {
            var getAllEntries, getObject, attestationHashes, attestations, _i, attestationHashes_2, hash, attestation, error_8, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 11]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/reverse-map-query.js'); })];
                    case 1:
                        getAllEntries = (_a.sent()).getAllEntries;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 2:
                        getObject = (_a.sent()).getObject;
                        return [4 /*yield*/, getAllEntries(auditorId, 'MessageAttestation')];
                    case 3:
                        attestationHashes = _a.sent();
                        attestations = [];
                        _i = 0, attestationHashes_2 = attestationHashes;
                        _a.label = 4;
                    case 4:
                        if (!(_i < attestationHashes_2.length)) return [3 /*break*/, 9];
                        hash = attestationHashes_2[_i];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, getObject(hash)];
                    case 6:
                        attestation = _a.sent();
                        if (attestation.auditorId === auditorId) {
                            attestations.push(attestation);
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_8 = _a.sent();
                        console.warn('[AttestationManager] Could not retrieve attestation:', hash);
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9: return [2 /*return*/, attestations];
                    case 10:
                        error_9 = _a.sent();
                        console.error('[AttestationManager] Error getting auditor attestations:', error_9);
                        return [2 /*return*/, []];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verify an attestation
     *
     * @param {string} attestationHash - Hash of attestation
     * @param {string} expectedMessageHash - Expected message hash
     * @returns {Promise<Object>} Verification result
     */
    AttestationManager.prototype.verifyAttestation = function (attestationHash, expectedMessageHash) {
        return __awaiter(this, void 0, void 0, function () {
            var getObject, signatureVerify, attestation, hashMatches, signatureValid, auditorTrusted, trusted, error_10, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 1:
                        getObject = (_a.sent()).getObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/crypto/sign.js'); })];
                    case 2:
                        signatureVerify = (_a.sent()).signatureVerify;
                        return [4 /*yield*/, getObject(attestationHash)];
                    case 3:
                        attestation = _a.sent();
                        if (attestation.$type$ !== 'MessageAttestation') {
                            throw new Error('Not a MessageAttestation object');
                        }
                        hashMatches = attestation.messageHash === expectedMessageHash;
                        signatureValid = true;
                        if (attestation.signature) {
                            try {
                                // Note: signatureVerify needs the data, signature, and public key separately
                                // This is a placeholder - actual implementation needs proper signature verification
                                signatureValid = false; // TODO: Implement proper signature verification
                            }
                            catch (error) {
                                signatureValid = false;
                            }
                        }
                        auditorTrusted = false;
                        if (!(this.trust && attestation.auditorId)) return [3 /*break*/, 7];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.trust.isTrusted(attestation.auditorId)];
                    case 5:
                        trusted = _a.sent();
                        auditorTrusted = trusted;
                        return [3 /*break*/, 7];
                    case 6:
                        error_10 = _a.sent();
                        auditorTrusted = false;
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/, {
                            valid: hashMatches && signatureValid,
                            messageHash: attestation.messageHash,
                            auditorId: attestation.auditorId,
                            verifiedAt: new Date().toISOString(),
                            signatureValid: signatureValid,
                            hashMatches: hashMatches,
                            auditorTrusted: auditorTrusted,
                            attestation: attestation
                        }];
                    case 8:
                        error_11 = _a.sent();
                        console.error('[AttestationManager] Error verifying attestation:', error_11);
                        return [2 /*return*/, {
                                valid: false,
                                error: error_11.message,
                                verifiedAt: new Date().toISOString()
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get audit trail for a message
     *
     * @param {string} messageHash - Message hash
     * @returns {Promise<Array>} Chronological audit trail
     */
    AttestationManager.prototype.getAuditTrail = function (messageHash) {
        return __awaiter(this, void 0, void 0, function () {
            var attestations;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAttestationsForMessage(messageHash)];
                    case 1:
                        attestations = _a.sent();
                        // Sort by timestamp
                        attestations.sort(function (a, b) {
                            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                        });
                        return [2 /*return*/, attestations];
                }
            });
        });
    };
    /**
     * Sync attestations for a topic
     *
     * @param {string} topicId - Topic ID
     * @returns {Promise<Array>} Synced attestations
     */
    AttestationManager.prototype.syncAttestations = function (topicId) {
        return __awaiter(this, void 0, void 0, function () {
            var attestations, _i, attestations_1, attestation, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.channelManager) {
                            return [2 /*return*/, []];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        // Force sync of the topic channel
                        return [4 /*yield*/, this.channelManager.syncChannel(topicId)];
                    case 2:
                        // Force sync of the topic channel
                        _a.sent();
                        return [4 /*yield*/, this.getAttestationsForTopic(topicId)];
                    case 3:
                        attestations = _a.sent();
                        // Update cache for each message
                        for (_i = 0, attestations_1 = attestations; _i < attestations_1.length; _i++) {
                            attestation = attestations_1[_i];
                            this.addToCache(attestation.messageHash, attestation);
                        }
                        console.log("[AttestationManager] Synced ".concat(attestations === null || attestations === void 0 ? void 0 : attestations.length, " attestations for topic"));
                        return [2 /*return*/, attestations];
                    case 4:
                        error_12 = _a.sent();
                        console.error('[AttestationManager] Error syncing attestations:', error_12);
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store attestation (for testing)
     */
    AttestationManager.prototype.storeAttestation = function (attestation) {
        return __awaiter(this, void 0, void 0, function () {
            var storeUnversionedObject, result, hash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 1:
                        storeUnversionedObject = (_a.sent()).storeUnversionedObject;
                        return [4 /*yield*/, storeUnversionedObject(attestation)];
                    case 2:
                        result = _a.sent();
                        hash = (result === null || result === void 0 ? void 0 : result.idHash) || result;
                        this.addToCache(attestation.messageHash, attestation);
                        return [2 /*return*/, {
                                hash: hash,
                                linkedTo: attestation.messageHash,
                                version: attestation.messageVersion
                            }];
                }
            });
        });
    };
    /**
     * Add attestation to cache
     *
     * @private
     */
    AttestationManager.prototype.addToCache = function (messageHash, attestation) {
        if (!this.attestationCache.has(messageHash)) {
            this.attestationCache.set(messageHash, []);
        }
        var cache = this.attestationCache.get(messageHash);
        if (cache) {
            cache.push(attestation);
        }
    };
    /**
     * Clear attestation cache
     */
    AttestationManager.prototype.clearCache = function () {
        this.attestationCache.clear();
        console.log('[AttestationManager] Cache cleared');
    };
    return AttestationManager;
}());
exports.AttestationManager = AttestationManager;
exports.default = AttestationManager;
