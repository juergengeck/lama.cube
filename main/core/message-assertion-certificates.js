"use strict";
/**
 * Message Assertion Certificates
 *
 * Creates and manages AffirmationCertificates for messages to enable
 * verifiable credential exports and audit trails.
 *
 * Each message gets an AffirmationCertificate that:
 * - Affirms the content is authentic and unmodified
 * - Links to the message via content-addressed hash
 * - Is signed by the sender's keys
 * - Can be exported as a verifiable credential
 */
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
exports.MessageAssertionManager = void 0;
/**
 * Message Assertion Manager
 * Handles certificate generation and verification for messages
 */
var MessageAssertionManager = /** @class */ (function () {
    function MessageAssertionManager(trustedKeysManager, leuteModel) {
        this.trust = trustedKeysManager;
        this.leuteModel = leuteModel;
        this.certificateCache = new Map(); // messageId -> certificate hash
    }
    /**
     * Create an AffirmationCertificate for a message
     *
     * @param {Object} message - The message to certify
     * @param {string} messageHash - SHA256 hash of the stored message
     * @returns {Promise<Object>} Certificate details
     */
    MessageAssertionManager.prototype.createMessageAssertion = function (message, messageHash) {
        return __awaiter(this, void 0, void 0, function () {
            var storeVersionedObject, AffirmationLicense, TrustedKeysManager, assertionData, assertionResult, assertionHash, certificateHash, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        console.log('[MessageAssertion] Creating assertion certificate for message:', message.id);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 1:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/recipes/Certificates/AffirmationCertificate.js'); })];
                    case 2:
                        AffirmationLicense = (_a.sent()).AffirmationLicense;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.models/lib/models/Leute/TrustedKeysManager.js'); })];
                    case 3:
                        TrustedKeysManager = _a.sent();
                        assertionData = {
                            $type$: 'MessageAssertion',
                            messageId: message.id,
                            messageHash: messageHash,
                            text: message.text,
                            timestamp: message.timestamp || new Date().toISOString(),
                            sender: message.sender || message.senderId,
                            subjects: message.subjects || [],
                            keywords: message.keywords || [],
                            version: message.version || 1,
                            // Add integrity metadata
                            assertedAt: new Date().toISOString(),
                            assertionType: 'content-authenticity',
                            assertionVersion: '1.0.0'
                        };
                        return [4 /*yield*/, storeVersionedObject(assertionData)];
                    case 4:
                        assertionResult = _a.sent();
                        assertionHash = assertionResult.idHash || assertionResult;
                        console.log('[MessageAssertion] Stored assertion data:', String(assertionHash).substring(0, 8));
                        return [4 /*yield*/, this.trust.certify('AffirmationCertificate', {
                                data: assertionHash // Reference to the assertion data
                            })];
                    case 5:
                        certificateHash = _a.sent();
                        console.log('[MessageAssertion] Created AffirmationCertificate:', String(certificateHash).substring(0, 8));
                        // Cache the certificate
                        this.certificateCache.set(message.id, certificateHash);
                        return [2 /*return*/, {
                                certificateHash: certificateHash,
                                assertionHash: assertionHash,
                                assertionData: assertionData,
                                messageHash: messageHash
                            }];
                    case 6:
                        error_1 = _a.sent();
                        console.error('[MessageAssertion] Error creating assertion:', error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verify an AffirmationCertificate for a message
     *
     * @param {string} certificateHash - Hash of the certificate to verify
     * @param {string} expectedMessageHash - Expected message hash
     * @returns {Promise<Object>} Verification result
     */
    MessageAssertionManager.prototype.verifyMessageAssertion = function (certificateHash, expectedMessageHash) {
        return __awaiter(this, void 0, void 0, function () {
            var getObjectByIdHash, certificates, affirmationCert, certificate, signature, assertionDataResult, assertionData, hashMatches, signatureValid, signerIdentity, signerResult, e_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        console.log('[MessageAssertion] Verifying certificate:', String(certificateHash).substring(0, 8));
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 1:
                        getObjectByIdHash = (_a.sent()).getObjectByIdHash;
                        return [4 /*yield*/, this.trust.getCertificates(certificateHash)];
                    case 2:
                        certificates = _a.sent();
                        affirmationCert = certificates.find(function (cert) { return cert.certificate.$type$ === 'AffirmationCertificate'; });
                        if (!affirmationCert) {
                            throw new Error('No AffirmationCertificate found');
                        }
                        certificate = affirmationCert.certificate;
                        signature = affirmationCert.signature;
                        return [4 /*yield*/, getObjectByIdHash(certificate.data)];
                    case 3:
                        assertionDataResult = _a.sent();
                        assertionData = assertionDataResult.obj;
                        if (assertionData.$type$ !== 'MessageAssertion') {
                            throw new Error('Certificate does not reference MessageAssertion data');
                        }
                        hashMatches = assertionData.messageHash === expectedMessageHash;
                        signatureValid = affirmationCert.trusted;
                        signerIdentity = null;
                        if (!(signature && signature.issuer)) return [3 /*break*/, 7];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, getObjectByIdHash(signature.issuer)];
                    case 5:
                        signerResult = _a.sent();
                        signerIdentity = signerResult.obj;
                        return [3 /*break*/, 7];
                    case 6:
                        e_1 = _a.sent();
                        console.warn('[MessageAssertion] Could not retrieve signer identity:', e_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/, {
                            valid: hashMatches && signatureValid,
                            hashMatches: hashMatches,
                            signatureValid: signatureValid,
                            assertionData: assertionData,
                            certificate: certificate,
                            signerIdentity: signerIdentity
                        }];
                    case 8:
                        error_2 = _a.sent();
                        console.error('[MessageAssertion] Error verifying assertion:', error_2);
                        return [2 /*return*/, {
                                valid: false,
                                error: error_2.message
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Export message with assertion as verifiable credential
     *
     * @param {string} messageId - ID of the message to export
     * @returns {Promise<Object>} Verifiable credential
     */
    MessageAssertionManager.prototype.exportAsVerifiableCredential = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var certificateHash, getObjectByIdHash, certificates, affirmationCert, certificate, signature, assertionDataResult, assertionData, me, mainProfile, verifiableCredential, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        certificateHash = this.certificateCache.get(messageId);
                        if (!certificateHash) {
                            throw new Error('No certificate found for message');
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 1:
                        getObjectByIdHash = (_a.sent()).getObjectByIdHash;
                        return [4 /*yield*/, this.trust.getCertificates(certificateHash)];
                    case 2:
                        certificates = _a.sent();
                        affirmationCert = certificates.find(function (cert) { return cert.certificate.$type$ === 'AffirmationCertificate'; });
                        if (!affirmationCert) {
                            throw new Error('No AffirmationCertificate found');
                        }
                        certificate = affirmationCert.certificate;
                        signature = affirmationCert.signature;
                        return [4 /*yield*/, getObjectByIdHash(certificate.data)];
                    case 3:
                        assertionDataResult = _a.sent();
                        assertionData = assertionDataResult.obj;
                        return [4 /*yield*/, this.leuteModel.me()];
                    case 4:
                        me = _a.sent();
                        return [4 /*yield*/, me.mainProfile()];
                    case 5:
                        mainProfile = _a.sent();
                        verifiableCredential = {
                            '@context': [
                                'https://www.w3.org/2018/credentials/v1',
                                'https://one.core/contexts/message-assertion/v1'
                            ],
                            type: ['VerifiableCredential', 'MessageAssertionCredential'],
                            // Credential metadata
                            id: "urn:one:cert:".concat(certificateHash),
                            issuer: {
                                id: "urn:one:person:".concat(me.personId),
                                name: (mainProfile === null || mainProfile === void 0 ? void 0 : mainProfile.name) || 'Unknown',
                                type: 'ONE.core Identity'
                            },
                            issuanceDate: assertionData.assertedAt,
                            // The actual claim
                            credentialSubject: {
                                id: "urn:one:msg:".concat(assertionData.messageId),
                                messageHash: assertionData.messageHash,
                                content: assertionData.text,
                                timestamp: assertionData.timestamp,
                                sender: assertionData.sender,
                                subjects: assertionData.subjects,
                                keywords: assertionData.keywords,
                                version: assertionData.version
                            },
                            // Proof (ONE.core signature)
                            proof: {
                                type: 'ONE.coreSignature2024',
                                created: assertionData.assertedAt,
                                proofPurpose: 'assertionMethod',
                                verificationMethod: "urn:one:keys:".concat(signature === null || signature === void 0 ? void 0 : signature.issuer),
                                certificateHash: certificateHash,
                                assertionHash: certificate.data
                            }
                        };
                        return [2 /*return*/, verifiableCredential];
                    case 6:
                        error_3 = _a.sent();
                        console.error('[MessageAssertion] Error exporting verifiable credential:', error_3);
                        throw error_3;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Batch create assertions for multiple messages
     *
     * @param {Array} messages - Array of messages with their hashes
     * @returns {Promise<Array>} Array of certificate results
     */
    MessageAssertionManager.prototype.createBatchAssertions = function (messages) {
        return __awaiter(this, void 0, void 0, function () {
            var results, _i, messages_1, _a, message, hash, result, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[MessageAssertion] Creating batch assertions for ".concat(messages.length, " messages"));
                        results = [];
                        _i = 0, messages_1 = messages;
                        _b.label = 1;
                    case 1:
                        if (!(_i < messages_1.length)) return [3 /*break*/, 6];
                        _a = messages_1[_i], message = _a.message, hash = _a.hash;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.createMessageAssertion(message, hash)];
                    case 3:
                        result = _b.sent();
                        results.push(__assign({ success: true, messageId: message.id }, result));
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _b.sent();
                        console.error("[MessageAssertion] Failed for message ".concat(message.id, ":"), error_4);
                        results.push({ success: false, messageId: message.id, error: error_4.message });
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * Get certificate for a message
     *
     * @param {string} messageId - Message ID
     * @returns {string|null} Certificate hash or null
     */
    MessageAssertionManager.prototype.getCertificateForMessage = function (messageId) {
        return this.certificateCache.get(messageId) || null;
    };
    /**
     * Clear certificate cache
     */
    MessageAssertionManager.prototype.clearCache = function () {
        this.certificateCache.clear();
        console.log('[MessageAssertion] Certificate cache cleared');
    };
    return MessageAssertionManager;
}());
exports.MessageAssertionManager = MessageAssertionManager;
/**
 * Export for use in chat handlers
 */
exports.default = {
    MessageAssertionManager: MessageAssertionManager
};
