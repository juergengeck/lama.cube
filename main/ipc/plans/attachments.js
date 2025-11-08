/**
 * Attachment IPC Plans
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
var attachment_service_js_1 = require("../../services/attachment-service.js");
var attachmentPlans = {
    /**
     * Store an attachment
     */
    storeAttachment: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var buffer, result, error_1;
            var data = _b.data, metadata = _b.metadata;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[AttachmentHandler] Store attachment:', metadata.name);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        buffer = void 0;
                        if (typeof data === 'string') {
                            // Base64 encoded
                            buffer = Buffer.from(data, 'base64');
                        }
                        else if (Buffer.isBuffer(data)) {
                            // Already a Buffer
                            buffer = data;
                        }
                        else if (data instanceof ArrayBuffer) {
                            // ArrayBuffer
                            buffer = Buffer.from(data);
                        }
                        else if (data instanceof Uint8Array) {
                            // Uint8Array
                            buffer = Buffer.from(data);
                        }
                        else {
                            throw new Error('Invalid attachment data type');
                        }
                        return [4 /*yield*/, attachment_service_js_1.default.storeAttachment(buffer, {
                                name: metadata.name,
                                type: metadata.mimeType || metadata.type,
                                size: metadata.size
                            })];
                    case 2:
                        result = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result
                            }];
                    case 3:
                        error_1 = _c.sent();
                        console.error('[AttachmentHandler] Error storing attachment:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Get an attachment by hash
     */
    getAttachment: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var attachment, base64Data, error_2;
            var hash = _b.hash;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[AttachmentHandler] Get attachment:', hash);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, attachment_service_js_1.default.getAttachment(hash)
                            // Convert buffer to base64 for IPC transfer
                        ];
                    case 2:
                        attachment = _c.sent();
                        base64Data = attachment.data.toString('base64');
                        return [2 /*return*/, {
                                success: true,
                                data: {
                                    data: base64Data,
                                    metadata: attachment.metadata
                                }
                            }];
                    case 3:
                        error_2 = _c.sent();
                        console.error('[AttachmentHandler] Error getting attachment:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Get attachment metadata only
     */
    getAttachmentMetadata: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var metadata;
            var hash = _b.hash;
            return __generator(this, function (_c) {
                console.log('[AttachmentHandler] Get attachment metadata:', hash);
                try {
                    metadata = attachment_service_js_1.default.getAttachmentMetadata(hash);
                    return [2 /*return*/, {
                            success: true,
                            data: metadata
                        }];
                }
                catch (error) {
                    console.error('[AttachmentHandler] Error getting metadata:', error);
                    return [2 /*return*/, {
                            success: false,
                            error: error.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    },
    /**
     * Store multiple attachments
     */
    storeAttachments: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var results, _i, attachments_1, attachment, buffer, result, error_3, error_4;
            var attachments = _b.attachments;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[AttachmentHandler] Store multiple attachments:', attachments.length);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 8, , 9]);
                        results = [];
                        _i = 0, attachments_1 = attachments;
                        _c.label = 2;
                    case 2:
                        if (!(_i < attachments_1.length)) return [3 /*break*/, 7];
                        attachment = attachments_1[_i];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        buffer = void 0;
                        if (typeof attachment.data === 'string') {
                            buffer = Buffer.from(attachment.data, 'base64');
                        }
                        else if (Buffer.isBuffer(attachment.data)) {
                            buffer = attachment.data;
                        }
                        else if (attachment.data instanceof ArrayBuffer) {
                            buffer = Buffer.from(attachment.data);
                        }
                        else if (attachment.data instanceof Uint8Array) {
                            buffer = Buffer.from(attachment.data);
                        }
                        else {
                            throw new Error('Invalid attachment data type');
                        }
                        return [4 /*yield*/, attachment_service_js_1.default.storeAttachment(buffer, attachment.metadata)];
                    case 4:
                        result = _c.sent();
                        results.push(result);
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _c.sent();
                        console.error("[AttachmentHandler] Failed to store ".concat(attachment.metadata.name, ":"), error_3);
                        results.push({
                            error: error_3.message,
                            name: attachment.metadata.name
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, {
                            success: true,
                            data: results
                        }];
                    case 8:
                        error_4 = _c.sent();
                        console.error('[AttachmentHandler] Error storing attachments:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4.message
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    }
};
export default attachmentPlans;
