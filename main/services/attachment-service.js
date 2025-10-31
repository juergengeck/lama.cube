"use strict";
/**
 * Attachment Service - Node.js side
 * Manages file attachments using ONE.core BLOB storage
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
var promises_1 = require("fs/promises");
var path_1 = require("path");
var url_1 = require("url");
// Get __dirname equivalent in ESM
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var AttachmentService = /** @class */ (function () {
    function AttachmentService() {
        this.attachments = new Map(); // hash -> metadata
        this.tempDir = path_1.default.join(process.cwd(), 'temp-attachments');
    }
    AttachmentService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Create temp directory for processing files
                    return [4 /*yield*/, promises_1.default.mkdir(this.tempDir, { recursive: true })];
                    case 1:
                        // Create temp directory for processing files
                        _a.sent();
                        console.log('[AttachmentService] Initialized with temp dir:', this.tempDir);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store an attachment as a BLOB in ONE.core
     * @param {Buffer} data - File data
     * @param {Object} metadata - File metadata (name, type, size)
     * @returns {Object} Attachment info with hash
     */
    AttachmentService.prototype.storeAttachment = function (data, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var storeArrayBufferAsBlob, arrayBuffer, result, hash, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        // Load Node.js platform first
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/system/load-nodejs.js'); })];
                    case 1:
                        // Load Node.js platform first
                        _a.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-blob.js'); })];
                    case 2:
                        storeArrayBufferAsBlob = (_a.sent()).storeArrayBufferAsBlob;
                        arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
                        return [4 /*yield*/, storeArrayBufferAsBlob(arrayBuffer)];
                    case 3:
                        result = _a.sent();
                        hash = result.hash;
                        // Store metadata
                        this.attachments.set(hash, {
                            name: metadata.name,
                            type: metadata.type,
                            size: metadata.size || data.length,
                            storedAt: new Date().toISOString()
                        });
                        console.log("[AttachmentService] Stored attachment ".concat(metadata.name, " as ").concat(hash));
                        return [2 /*return*/, {
                                hash: hash,
                                name: metadata.name,
                                type: metadata.type,
                                size: metadata.size || data.length
                            }];
                    case 4:
                        error_1 = _a.sent();
                        console.error('[AttachmentService] Failed to store attachment:', error_1);
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieve an attachment by hash
     * @param {string} hash - Attachment hash
     * @returns {Object} Attachment data and metadata
     */
    AttachmentService.prototype.getAttachment = function (hash) {
        return __awaiter(this, void 0, void 0, function () {
            var readBlobAsArrayBuffer, metadata, arrayBuffer, buffer, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        // Load Node.js platform first
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/system/load-nodejs.js'); })];
                    case 1:
                        // Load Node.js platform first
                        _a.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-blob.js'); })];
                    case 2:
                        readBlobAsArrayBuffer = (_a.sent()).readBlobAsArrayBuffer;
                        metadata = this.attachments.get(hash);
                        if (!metadata) {
                            console.warn("[AttachmentService] No metadata for hash ".concat(hash, ", using defaults"));
                        }
                        return [4 /*yield*/, readBlobAsArrayBuffer(hash)];
                    case 3:
                        arrayBuffer = _a.sent();
                        buffer = Buffer.from(arrayBuffer);
                        return [2 /*return*/, {
                                data: buffer,
                                metadata: metadata || {
                                    name: 'attachment',
                                    type: 'application/octet-stream',
                                    size: buffer.length
                                }
                            }];
                    case 4:
                        error_2 = _a.sent();
                        console.error("[AttachmentService] Failed to get attachment ".concat(hash, ":"), error_2);
                        throw error_2;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get attachment metadata without loading data
     * @param {string} hash - Attachment hash
     * @returns {Object} Attachment metadata
     */
    AttachmentService.prototype.getAttachmentMetadata = function (hash) {
        return this.attachments.get(hash);
    };
    /**
     * Save uploaded file temporarily
     * @param {string} filename - Original filename
     * @param {Buffer} data - File data
     * @returns {string} Temp file path
     */
    AttachmentService.prototype.saveTempFile = function (filename, data) {
        return __awaiter(this, void 0, void 0, function () {
            var tempPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tempPath = path_1.default.join(this.tempDir, "".concat(Date.now(), "-").concat(filename));
                        return [4 /*yield*/, promises_1.default.writeFile(tempPath, data)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, tempPath];
                }
            });
        });
    };
    /**
     * Clean up temp files older than 1 hour
     */
    AttachmentService.prototype.cleanupTempFiles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, now, _i, files_1, file, filePath, stats, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, promises_1.default.readdir(this.tempDir)];
                    case 1:
                        files = _a.sent();
                        now = Date.now();
                        _i = 0, files_1 = files;
                        _a.label = 2;
                    case 2:
                        if (!(_i < files_1.length)) return [3 /*break*/, 6];
                        file = files_1[_i];
                        filePath = path_1.default.join(this.tempDir, file);
                        return [4 /*yield*/, promises_1.default.stat(filePath)
                            // Delete files older than 1 hour
                        ];
                    case 3:
                        stats = _a.sent();
                        if (!(now - stats.mtimeMs > 3600000)) return [3 /*break*/, 5];
                        return [4 /*yield*/, promises_1.default.unlink(filePath)];
                    case 4:
                        _a.sent();
                        console.log("[AttachmentService] Cleaned up temp file: ".concat(file));
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_3 = _a.sent();
                        console.error('[AttachmentService] Cleanup error:', error_3);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return AttachmentService;
}());
exports.default = new AttachmentService();
