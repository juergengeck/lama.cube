"use strict";
/**
 * Message Utilities for AI Chat
 * Adapted from LAMA for Electron app
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
exports.MessageCertificateTypes = void 0;
exports.createAIMessage = createAIMessage;
exports.createUserMessage = createUserMessage;
exports.isAIMessage = isAIMessage;
exports.sha256Hash = sha256Hash;
var type_checks_js_1 = require("@refinio/one.core/lib/util/type-checks.js");
var crypto_helpers_js_1 = require("@refinio/one.core/lib/system/crypto-helpers.js");
var buffer_1 = require("buffer");
/**
 * Certificate types for different message categories
 */
var MessageCertificateTypes = {
    SYSTEM: 'system-message-authentication',
    USER: 'user-message-authentication',
    AI: 'ai-message-authentication'
};
exports.MessageCertificateTypes = MessageCertificateTypes;
/**
 * Helper to calculate SHA256 hash of an object
 */
function sha256Hash(data) {
    return __awaiter(this, void 0, void 0, function () {
        var jsonStr, base64Hash, buffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jsonStr = JSON.stringify(data);
                    return [4 /*yield*/, (0, crypto_helpers_js_1.createCryptoHash)(jsonStr)];
                case 1:
                    base64Hash = _a.sent();
                    buffer = buffer_1.Buffer.from(base64Hash, 'base64');
                    return [2 /*return*/, buffer.toString('hex')];
            }
        });
    });
}
/**
 * Creates an AI message with proper identity
 *
 * @param {string} text - Message text
 * @param {string} senderId - AI sender ID (personId)
 * @param {string} [previousMessageHash] - Optional hash of previous message
 * @param {string} [channelIdHash] - Optional channel ID
 * @param {string} [topicIdHash] - Optional topic ID
 * @param {string} [modelId] - Optional model ID for metadata
 * @returns {Promise<Object>} ChatMessage object
 */
function createAIMessage(text, senderId, previousMessageHash, channelIdHash, topicIdHash, modelId) {
    return __awaiter(this, void 0, void 0, function () {
        var senderIdHash, thinkRegex, attachments, visibleText, message;
        return __generator(this, function (_a) {
            if (!text) {
                throw new Error('AI message text cannot be empty');
            }
            if (!senderId) {
                throw new Error('AI message sender ID cannot be empty');
            }
            senderIdHash = (0, type_checks_js_1.ensureIdHash)(senderId);
            thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
            attachments = [];
            visibleText = text.replace(thinkRegex, '').trim();
            // Fallback if no visible text remains
            if (!visibleText) {
                visibleText = 'I apologize, something went wrong with my previous response.';
            }
            message = {
                $type$: 'ChatMessage',
                text: visibleText,
                sender: senderIdHash,
                attachments: attachments.length > 0 ? attachments : undefined
            };
            console.log("[messageUtils] Created AI message with sender: ".concat(senderIdHash.toString().substring(0, 8), "..."));
            return [2 /*return*/, message];
        });
    });
}
/**
 * Create a user message
 */
function createUserMessage(text, sender, attachments) {
    if (attachments === void 0) { attachments = []; }
    return {
        $type$: 'ChatMessage',
        text: text,
        sender: sender,
        attachments: attachments
    };
}
/**
 * Check if a message is from an AI
 */
function isAIMessage(message, aiPersonIds) {
    if (!message || !message.sender)
        return false;
    var senderId = message.sender.toString();
    return aiPersonIds.some(function (aiId) { return aiId.toString() === senderId; });
}
