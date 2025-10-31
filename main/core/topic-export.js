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
exports.TopicExporter = void 0;
/**
 * Topic Export Service with Attestation Support
 *
 * Exports topics with structured data including attestations
 * Supports HTML with microdata, JSON, and pure microdata formats
 */
/**
 * Topic Exporter with attestation support
 */
var TopicExporter = /** @class */ (function () {
    function TopicExporter(channelManager, attestationManager) {
        this.channelManager = channelManager;
        this.attestationManager = attestationManager;
    }
    /**
     * Export topic with attestations
     *
     * @param {Object} params
     * @param {string} params.topicId - Topic to export
     * @param {boolean} params.includeAttestations - Include attestations
     * @param {string} params.format - 'html', 'json', or 'microdata'
     * @returns {Promise<Object>} Export result
     */
    TopicExporter.prototype.exportTopicWithAttestations = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var topicId, _a, includeAttestations, _b, format, topicData, messages, attestations, attestationsByMessage, exportData, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        topicId = params.topicId, _a = params.includeAttestations, includeAttestations = _a === void 0 ? true : _a, _b = params.format, format = _b === void 0 ? 'html' : _b;
                        if (!topicId) {
                            throw new Error('Topic ID is required for export');
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, this.getTopicData(topicId)];
                    case 2:
                        topicData = _c.sent();
                        return [4 /*yield*/, this.getTopicMessages(topicId)];
                    case 3:
                        messages = _c.sent();
                        attestations = [];
                        if (!(includeAttestations && this.attestationManager)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.attestationManager.getAttestationsForTopic(topicId)];
                    case 4:
                        attestations = _c.sent();
                        _c.label = 5;
                    case 5:
                        attestationsByMessage = this.groupAttestationsByMessage(attestations);
                        exportData = void 0;
                        switch (format) {
                            case 'json':
                                exportData = this.exportAsJSON(topicData, messages, attestationsByMessage);
                                break;
                            case 'microdata':
                                exportData = this.exportAsMicrodata(topicData, messages, attestationsByMessage);
                                break;
                            case 'html':
                            default:
                                exportData = this.exportAsHTML(topicData, messages, attestationsByMessage);
                                break;
                        }
                        return [2 /*return*/, {
                                format: format,
                                data: exportData,
                                metadata: {
                                    exportedAt: new Date().toISOString(),
                                    topicId: topicId,
                                    messageCount: messages.length,
                                    attestationCount: attestations.length
                                }
                            }];
                    case 6:
                        error_1 = _c.sent();
                        console.error('[TopicExporter] Error exporting topic:', error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Export as JSON
     *
     * @private
     */
    TopicExporter.prototype.exportAsJSON = function (topicData, messages, attestationsByMessage) {
        var exportObj = {
            $type$: 'AuditedTopic',
            topicId: topicData.id,
            topicName: topicData.name || 'Unnamed Topic',
            exportedAt: new Date().toISOString(),
            exportedBy: topicData.exportedBy || 'unknown',
            schemaVersion: '1.0.0',
            schemaUrl: 'https://one.core/schemas/audited-topic',
            messages: messages.map(function (msg) { return ({
                hash: msg.hash,
                version: msg.version || 1,
                content: msg.text || msg.content,
                timestamp: msg.timestamp,
                sender: msg.sender || msg.senderId,
                senderName: msg.senderName,
                subjects: msg.subjects || [],
                attestations: attestationsByMessage.get(msg.hash) || []
            }); })
        };
        return JSON.stringify(exportObj, null, 2);
    };
    /**
     * Export as HTML with microdata
     *
     * @private
     */
    TopicExporter.prototype.exportAsHTML = function (topicData, messages, attestationsByMessage) {
        var _this = this;
        var html = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Audited Topic: ".concat(this.escapeHtml(topicData.name || 'Unnamed'), "</title>\n  <style>\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n      max-width: 1200px;\n      margin: 40px auto;\n      padding: 20px;\n      background: #f5f5f5;\n    }\n    .topic-header {\n      background: white;\n      padding: 20px;\n      border-radius: 8px;\n      margin-bottom: 20px;\n      box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n    }\n    .message {\n      background: white;\n      padding: 20px;\n      border-radius: 8px;\n      margin-bottom: 15px;\n      box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n    }\n    .message-header {\n      display: flex;\n      justify-content: space-between;\n      margin-bottom: 10px;\n      color: #666;\n      font-size: 14px;\n    }\n    .message-content {\n      margin: 15px 0;\n      line-height: 1.6;\n    }\n    .attestation {\n      background: #e3f2fd;\n      border: 1px solid #90caf9;\n      border-radius: 4px;\n      padding: 10px;\n      margin-top: 10px;\n    }\n    .attestation-header {\n      font-weight: bold;\n      color: #1976d2;\n      margin-bottom: 5px;\n    }\n    .hash {\n      font-family: monospace;\n      font-size: 12px;\n      color: #999;\n    }\n    .version-badge {\n      display: inline-block;\n      background: #e0e0e0;\n      padding: 2px 8px;\n      border-radius: 12px;\n      font-size: 12px;\n    }\n  </style>\n</head>\n<body>\n  <div itemscope itemtype=\"https://one.core/Topic\" class=\"topic-header\">\n    <h1 itemprop=\"name\">").concat(this.escapeHtml(topicData.name || 'Audited Topic'), "</h1>\n    <meta itemprop=\"id\" content=\"").concat(topicData.id, "\">\n    <meta itemprop=\"exportedAt\" content=\"").concat(new Date().toISOString(), "\">\n    <div class=\"export-info\">\n      <p>Topic ID: <span class=\"hash\">").concat(topicData.id, "</span></p>\n      <p>Exported: ").concat(new Date().toLocaleString(), "</p>\n      <p>Messages: ").concat(messages.length, " | Attestations: ").concat(this.countTotalAttestations(attestationsByMessage), "</p>\n    </div>\n  </div>\n\n  ").concat(messages.map(function (msg) { return _this.renderMessage(msg, attestationsByMessage.get(msg.hash) || []); }).join('\n'), "\n</body>\n</html>");
        return html;
    };
    /**
     * Render a single message with attestations
     *
     * @private
     */
    TopicExporter.prototype.renderMessage = function (message, attestations) {
        var _this = this;
        var _a;
        return "\n  <div itemscope itemtype=\"https://one.core/Message\" class=\"message\">\n    <meta itemprop=\"hash\" content=\"".concat(message.hash, "\">\n    <meta itemprop=\"version\" content=\"").concat(message.version || 1, "\">\n\n    <div class=\"message-header\">\n      <span itemprop=\"sender\">").concat(this.escapeHtml(message.senderName || message.sender || 'Unknown'), "</span>\n      <span>\n        <span class=\"version-badge\">v").concat(message.version || 1, "</span>\n        <time itemprop=\"timestamp\" datetime=\"").concat(message.timestamp, "\">\n          ").concat(new Date(message.timestamp).toLocaleString(), "\n        </time>\n      </span>\n    </div>\n\n    <div itemprop=\"content\" class=\"message-content\">\n      ").concat(this.escapeHtml(message.text || message.content || ''), "\n    </div>\n\n    <div class=\"hash\">Hash: ").concat((_a = message.hash) === null || _a === void 0 ? void 0 : _a.substring(0, 16), "...</div>\n\n    ").concat(attestations.map(function (att) { return _this.renderAttestation(att); }).join('\n'), "\n  </div>");
    };
    /**
     * Render an attestation
     *
     * @private
     */
    TopicExporter.prototype.renderAttestation = function (attestation) {
        return "\n    <div itemscope itemtype=\"https://one.core/Attestation\" class=\"attestation\">\n      <meta itemprop=\"messageHash\" content=\"".concat(attestation.messageHash, "\">\n      <meta itemprop=\"auditorId\" content=\"").concat(attestation.auditorId, "\">\n      <meta itemprop=\"timestamp\" content=\"").concat(attestation.timestamp, "\">\n\n      <div class=\"attestation-header\">\n        \u2713 Attestation by <span itemprop=\"auditorName\">").concat(this.escapeHtml(attestation.auditorName || 'Auditor'), "</span>\n      </div>\n\n      <div itemprop=\"claim\">\n        ").concat(this.escapeHtml(attestation.attestationClaim || 'Content verified'), "\n      </div>\n\n      <div style=\"font-size: 12px; color: #666; margin-top: 5px;\">\n        Type: <span itemprop=\"type\">").concat(attestation.attestationType, "</span> |\n        <time datetime=\"").concat(attestation.timestamp, "\">\n          ").concat(new Date(attestation.timestamp).toLocaleString(), "\n        </time>\n      </div>\n    </div>");
    };
    /**
     * Export as pure microdata
     *
     * @private
     */
    TopicExporter.prototype.exportAsMicrodata = function (topicData, messages, attestationsByMessage) {
        var _this = this;
        var microdata = "<div itemscope itemtype=\"https://one.core/Topic\">\n  <meta itemprop=\"id\" content=\"".concat(topicData.id, "\">\n  <meta itemprop=\"name\" content=\"").concat(this.escapeHtml(topicData.name || ''), "\">\n  <meta itemprop=\"exportedAt\" content=\"").concat(new Date().toISOString(), "\">\n\n  ").concat(messages.map(function (msg) { return "\n  <div itemprop=\"message\" itemscope itemtype=\"https://one.core/Message\">\n    <meta itemprop=\"hash\" content=\"".concat(msg.hash, "\">\n    <meta itemprop=\"version\" content=\"").concat(msg.version || 1, "\">\n    <meta itemprop=\"sender\" content=\"").concat(msg.sender || msg.senderId, "\">\n    <meta itemprop=\"timestamp\" content=\"").concat(msg.timestamp, "\">\n    <div itemprop=\"content\">").concat(_this.escapeHtml(msg.text || msg.content || ''), "</div>\n\n    ").concat((attestationsByMessage.get(msg.hash) || []).map(function (att) { return "\n    <div itemprop=\"attestation\" itemscope itemtype=\"https://one.core/Attestation\">\n      <meta itemprop=\"messageHash\" content=\"".concat(att.messageHash, "\">\n      <meta itemprop=\"auditorId\" content=\"").concat(att.auditorId, "\">\n      <meta itemprop=\"auditorName\" content=\"").concat(_this.escapeHtml(att.auditorName || ''), "\">\n      <meta itemprop=\"timestamp\" content=\"").concat(att.timestamp, "\">\n      <meta itemprop=\"type\" content=\"").concat(att.attestationType, "\">\n      <div itemprop=\"claim\">").concat(_this.escapeHtml(att.attestationClaim || ''), "</div>\n    </div>"); }).join('\n'), "\n  </div>"); }).join('\n'), "\n</div>");
        return microdata;
    };
    /**
     * Get topic data
     *
     * @private
     */
    TopicExporter.prototype.getTopicData = function (topicId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // In a real implementation, this would fetch from TopicModel
                return [2 /*return*/, {
                        id: topicId,
                        name: topicId, // Would be fetched from topic metadata
                        exportedBy: 'current-user' // Would be current user ID
                    }];
            });
        });
    };
    /**
     * Get messages from topic
     *
     * @private
     */
    TopicExporter.prototype.getTopicMessages = function (topicId) {
        return __awaiter(this, void 0, void 0, function () {
            var entries, messages, error_2;
            var _this = this;
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
                        messages = entries
                            .filter(function (entry) { return entry.data && entry.data.$type$ !== 'MessageAttestation'; })
                            .map(function (entry) { return ({
                            hash: entry.hash || _this.generateHash(entry.data),
                            version: entry.data.version || 1,
                            text: entry.data.text,
                            content: entry.data.content || entry.data.text,
                            timestamp: entry.timestamp || entry.data.timestamp,
                            sender: entry.author || entry.data.sender,
                            senderName: entry.data.senderName,
                            subjects: entry.data.subjects || []
                        }); });
                        return [2 /*return*/, messages];
                    case 3:
                        error_2 = _a.sent();
                        console.error('[TopicExporter] Error getting messages:', error_2);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Group attestations by message hash
     *
     * @private
     */
    TopicExporter.prototype.groupAttestationsByMessage = function (attestations) {
        var grouped = new Map();
        for (var _i = 0, attestations_1 = attestations; _i < attestations_1.length; _i++) {
            var attestation = attestations_1[_i];
            var hash = attestation.messageHash;
            if (!grouped.has(hash)) {
                grouped.set(hash, []);
            }
            grouped.get(hash).push(attestation);
        }
        return grouped;
    };
    /**
     * Count total attestations
     *
     * @private
     */
    TopicExporter.prototype.countTotalAttestations = function (attestationsByMessage) {
        var count = 0;
        for (var _i = 0, _a = attestationsByMessage.values(); _i < _a.length; _i++) {
            var attestations = _a[_i];
            count += attestations.length;
        }
        return count;
    };
    /**
     * Escape HTML
     *
     * @private
     */
    TopicExporter.prototype.escapeHtml = function (text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return (text || '').replace(/[&<>"']/g, function (m) { return map[m]; });
    };
    /**
     * Generate hash for data (simplified)
     *
     * @private
     */
    TopicExporter.prototype.generateHash = function (data) {
        // In production, this would use proper SHA256 hashing
        return 'hash-' + JSON.stringify(data).substring(0, 16);
    };
    return TopicExporter;
}());
exports.TopicExporter = TopicExporter;
exports.default = TopicExporter;
