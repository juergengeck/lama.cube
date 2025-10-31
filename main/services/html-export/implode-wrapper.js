"use strict";
/**
 * Implode Wrapper Service
 * Integrates ONE.core's implode() function for HTML export
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
exports.wrapMessageWithMicrodata = wrapMessageWithMicrodata;
exports.processMessages = processMessages;
exports.addSignature = addSignature;
exports.addTimestamp = addTimestamp;
var microdata_imploder_js_1 = require("@refinio/one.core/lib/microdata-imploder.js");
/**
 * Wraps a message hash with imploded microdata
 * @param {string} messageHash - SHA-256 hash of the message
 * @returns {Promise<string>} - Imploded HTML microdata
 */
function wrapMessageWithMicrodata(messageHash) {
    return __awaiter(this, void 0, void 0, function () {
        var implodedMicrodata, microdataWithHash, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('[ImplodeWrapper] Processing message hash:', messageHash);
                    return [4 /*yield*/, (0, microdata_imploder_js_1.implode)(messageHash)];
                case 1:
                    implodedMicrodata = _a.sent();
                    microdataWithHash = addHashAttribute(implodedMicrodata, messageHash);
                    console.log('[ImplodeWrapper] Successfully imploded message');
                    return [2 /*return*/, microdataWithHash];
                case 2:
                    error_1 = _a.sent();
                    console.error('[ImplodeWrapper] Error imploding message:', error_1);
                    throw new Error("Failed to implode message ".concat(messageHash, ": ").concat(error_1.message));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Process multiple messages in batches for performance
 * @param {string[]} messageHashes - Array of message hashes
 * @param {Object} options - Processing options
 * @returns {Promise<string[]>} - Array of imploded microdata strings
 */
function processMessages(messageHashes_1) {
    return __awaiter(this, arguments, void 0, function (messageHashes, options) {
        var _a, batchSize, results, i, batch, batchPromises, batchResults;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = options.batchSize, batchSize = _a === void 0 ? 50 : _a;
                    if (!messageHashes || messageHashes.length === 0) {
                        return [2 /*return*/, []];
                    }
                    console.log("[ImplodeWrapper] Processing ".concat(messageHashes.length, " messages in batches of ").concat(batchSize));
                    results = [];
                    i = 0;
                    _b.label = 1;
                case 1:
                    if (!(i < messageHashes.length)) return [3 /*break*/, 4];
                    batch = messageHashes.slice(i, i + batchSize);
                    console.log("[ImplodeWrapper] Processing batch ".concat(Math.floor(i / batchSize) + 1, "/").concat(Math.ceil(messageHashes.length / batchSize)));
                    batchPromises = batch.map(function (hash) { return wrapMessageWithMicrodata(hash); });
                    return [4 /*yield*/, Promise.all(batchPromises)];
                case 2:
                    batchResults = _b.sent();
                    results.push.apply(results, batchResults);
                    _b.label = 3;
                case 3:
                    i += batchSize;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("[ImplodeWrapper] Successfully processed ".concat(results.length, " messages"));
                    return [2 /*return*/, results];
            }
        });
    });
}
/**
 * Add signature to imploded microdata
 * @param {string} microdata - Imploded HTML microdata
 * @param {string} signature - Digital signature (optional)
 * @returns {string} - Microdata with signature attribute
 */
function addSignature(microdata, signature) {
    if (!signature) {
        return microdata;
    }
    // Find the root element and add data-signature attribute
    var rootElementMatch = String(microdata).match(/^(<[^>]+)(>)/);
    if (rootElementMatch) {
        var openTag = rootElementMatch[1], closeChar = rootElementMatch[2];
        var updatedOpenTag = "".concat(openTag, " data-signature=\"").concat(signature, "\"").concat(closeChar);
        return microdata.replace(rootElementMatch[0], updatedOpenTag);
    }
    return microdata;
}
/**
 * Add hash attribute to the root element of microdata
 * @param {string} microdata - HTML microdata string
 * @param {string} hash - Message hash
 * @returns {string} - Microdata with hash attribute
 */
function addHashAttribute(microdata, hash) {
    // Find the root element (first tag) and add data-hash attribute
    var rootElementMatch = String(microdata).match(/^(<[^>]+)(>)/);
    if (rootElementMatch) {
        var openTag = rootElementMatch[1], closeChar = rootElementMatch[2];
        // Check if data-hash already exists (from implode)
        if (openTag.includes('data-hash=')) {
            return microdata; // Already has hash attribute
        }
        // Add data-hash attribute
        var updatedOpenTag = "".concat(openTag, " data-hash=\"").concat(hash, "\"").concat(closeChar);
        return microdata.replace(rootElementMatch[0], updatedOpenTag);
    }
    // If no root element found, wrap in a span with hash
    return "<span data-hash=\"".concat(hash, "\">").concat(microdata, "</span>");
}
/**
 * Add timestamp information to microdata
 * @param {string} microdata - HTML microdata
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Microdata with timestamp
 */
function addTimestamp(microdata, timestamp) {
    if (!timestamp) {
        return microdata;
    }
    // Add data-timestamp attribute to root element
    var rootElementMatch = String(microdata).match(/^(<[^>]+)(>)/);
    if (rootElementMatch) {
        var openTag = rootElementMatch[1], closeChar = rootElementMatch[2];
        var updatedOpenTag = "".concat(openTag, " data-timestamp=\"").concat(timestamp, "\"").concat(closeChar);
        return microdata.replace(rootElementMatch[0], updatedOpenTag);
    }
    return microdata;
}
exports.default = {
    wrapMessageWithMicrodata: wrapMessageWithMicrodata,
    processMessages: processMessages,
    addSignature: addSignature,
    addTimestamp: addTimestamp
};
