"use strict";
/**
 * QR Generation Service for Audit Flow
 *
 * Generates QR codes compatible with ONE.core contact invites
 * that reference attestations for Topics or Messages
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
exports.QRGenerator = void 0;
var qrcode_1 = require("qrcode");
/**
 * QR Generator for audit attestations
 */
var QRGenerator = /** @class */ (function () {
    function QRGenerator() {
        this.version = '1.0.0';
        this.baseUrl = 'one://';
    }
    /**
     * Generate QR code for message attestation
     * Compatible with ONE.core contact invite format
     *
     * @param {Object} options
     * @param {string} options.messageHash - SHA256 hash of the message
     * @param {number} options.messageVersion - Version number
     * @param {string} options.topicId - Topic containing the message
     * @param {string} options.attestationType - 'message' or 'topic'
     * @returns {Promise<Object>} QR data URL and text
     */
    QRGenerator.prototype.generateQRForMessage = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var messageHash, messageVersion, topicId, _a, attestationType, qrData, qrDataUrl, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        messageHash = options.messageHash, messageVersion = options.messageVersion, topicId = options.topicId, _a = options.attestationType, attestationType = _a === void 0 ? 'message' : _a;
                        if (!messageHash) {
                            throw new Error('Message hash is required for QR generation');
                        }
                        qrData = this.createInviteUrl({
                            type: attestationType,
                            hash: messageHash,
                            version: messageVersion,
                            topicId: topicId
                        });
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, qrcode_1.default.toDataURL(qrData, {
                                errorCorrectionLevel: 'M',
                                type: 'image/png',
                                margin: 1,
                                color: {
                                    dark: '#000000',
                                    light: '#FFFFFF'
                                },
                                width: 256
                            })];
                    case 2:
                        qrDataUrl = _b.sent();
                        return [2 /*return*/, {
                                qrDataUrl: qrDataUrl,
                                qrText: qrData,
                                metadata: {
                                    version: this.version,
                                    type: 'attestation',
                                    attestationType: attestationType,
                                    messageHash: messageHash,
                                    messageVersion: messageVersion,
                                    topicId: topicId,
                                    timestamp: new Date().toISOString()
                                }
                            }];
                    case 3:
                        error_1 = _b.sent();
                        console.error('[QRGenerator] Error generating QR code:', error_1);
                        throw new Error("Failed to generate QR code: ".concat(error_1.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate QR code for topic attestation
     *
     * @param {Object} options
     * @param {string} options.topicId - Topic ID
     * @param {string} options.topicHash - Topic content hash
     * @returns {Promise<Object>} QR data
     */
    QRGenerator.prototype.generateQRForTopic = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var topicId, topicHash, qrData, qrDataUrl, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        topicId = options.topicId, topicHash = options.topicHash;
                        if (!topicId || !topicHash) {
                            throw new Error('Topic ID and hash are required');
                        }
                        qrData = this.createInviteUrl({
                            type: 'topic',
                            hash: topicHash,
                            topicId: topicId
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, qrcode_1.default.toDataURL(qrData, {
                                errorCorrectionLevel: 'H', // Higher correction for topic QRs
                                type: 'image/png',
                                width: 256
                            })];
                    case 2:
                        qrDataUrl = _a.sent();
                        return [2 /*return*/, {
                                qrDataUrl: qrDataUrl,
                                qrText: qrData,
                                metadata: {
                                    version: this.version,
                                    type: 'attestation',
                                    attestationType: 'topic',
                                    topicId: topicId,
                                    topicHash: topicHash,
                                    timestamp: new Date().toISOString()
                                }
                            }];
                    case 3:
                        error_2 = _a.sent();
                        console.error('[QRGenerator] Error generating topic QR:', error_2);
                        throw new Error("Failed to generate topic QR: ".concat(error_2.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create ONE.core invite-compatible URL
     *
     * @private
     * @param {Object} params
     * @returns {string} ONE.core URL
     */
    QRGenerator.prototype.createInviteUrl = function (params) {
        var type = params.type, hash = params.hash, version = params.version, topicId = params.topicId;
        // Base URL for attestation invites
        var url = "".concat(this.baseUrl, "attestation/").concat(type, "/").concat(hash);
        // Add query parameters
        var queryParams = [];
        if (version !== undefined) {
            queryParams.push("v=".concat(version));
        }
        if (topicId) {
            queryParams.push("topic=".concat(topicId));
        }
        if (queryParams.length > 0) {
            url += "?".concat(queryParams.join('&'));
        }
        return url;
    };
    /**
     * Parse QR code data (for scanning)
     *
     * @param {string} qrText - Scanned QR text
     * @returns {Object} Parsed data
     */
    QRGenerator.prototype.parseQRData = function (qrText) {
        if (!qrText.startsWith('one://')) {
            throw new Error('Invalid QR format - must be ONE.core URL');
        }
        var url = new URL(qrText.replace('one://', 'https://'));
        var pathParts = url.pathname.split('/').filter(function (p) { return p; });
        if (pathParts[0] !== 'attestation') {
            throw new Error('Not an attestation QR code');
        }
        var parsed = {
            type: pathParts[1], // 'message' or 'topic'
            hash: pathParts[2],
            version: url.searchParams.get('v') ? parseInt(url.searchParams.get('v')) : undefined,
            topicId: url.searchParams.get('topic')
        };
        return parsed;
    };
    /**
     * Generate batch QR codes for multiple messages
     *
     * @param {Array} messages - Array of message objects
     * @returns {Promise<Array>} Array of QR results
     */
    QRGenerator.prototype.generateBatchQRCodes = function (messages) {
        return __awaiter(this, void 0, void 0, function () {
            var results, _i, messages_1, message, qr, error_3, successCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[QRGenerator] Generating ".concat(messages.length, " QR codes"));
                        results = [];
                        _i = 0, messages_1 = messages;
                        _a.label = 1;
                    case 1:
                        if (!(_i < messages_1.length)) return [3 /*break*/, 6];
                        message = messages_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.generateQRForMessage({
                                messageHash: message.hash,
                                messageVersion: message.version,
                                topicId: message.topicId,
                                attestationType: 'message'
                            })];
                    case 3:
                        qr = _a.sent();
                        results.push(__assign({ success: true, messageId: message.id }, qr));
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        results.push({
                            success: false,
                            messageId: message.id,
                            error: error_3.message
                        });
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        successCount = results.filter(function (r) { return r.success; }).length;
                        console.log("[QRGenerator] Generated ".concat(successCount, "/").concat(messages.length, " QR codes"));
                        return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * Validate QR data against message
     *
     * @param {string} qrText - QR text to validate
     * @param {Object} message - Message to validate against
     * @returns {boolean} Is valid
     */
    QRGenerator.prototype.validateQRAgainstMessage = function (qrText, message) {
        try {
            var parsed = this.parseQRData(qrText);
            return parsed.hash === message.hash &&
                (!parsed.version || parsed.version === message.version);
        }
        catch (error) {
            console.error('[QRGenerator] QR validation failed:', error);
            return false;
        }
    };
    return QRGenerator;
}());
exports.QRGenerator = QRGenerator;
// Export singleton instance
var qrGenerator = new QRGenerator();
exports.default = qrGenerator;
