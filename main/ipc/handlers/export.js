"use strict";
/**
 * Export IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to ExportHandler methods.
 * Business logic lives in ../../../lama.core/handlers/ExportHandler.ts
 * Platform-specific operations (dialog, fs, notifications) handled here.
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
var electron_1 = require("electron");
var dialog = electron_1.default.dialog, app = electron_1.default.app, Notification = electron_1.default.Notification;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var ExportHandler_js_1 = require("@chat/core/handlers/ExportHandler.js");
// Singleton handler instance
var exportHandler = null;
/**
 * Get handler instance (creates on first use with services)
 */
function getHandler() {
    return __awaiter(this, void 0, void 0, function () {
        var implodeWrapper, formatter, htmlTemplate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!exportHandler) return [3 /*break*/, 4];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../services/html-export/implode-wrapper.js'); })];
                case 1:
                    implodeWrapper = _a.sent();
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../services/html-export/formatter.js'); })];
                case 2:
                    formatter = _a.sent();
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../services/html-export/html-template.js'); })];
                case 3:
                    htmlTemplate = _a.sent();
                    exportHandler = new ExportHandler_js_1.ExportHandler(implodeWrapper, formatter.default, htmlTemplate.default);
                    _a.label = 4;
                case 4: return [2 /*return*/, exportHandler];
            }
        });
    });
}
/**
 * Export a file with save dialog
 */
function exportFile(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var win, dialogOptions, result, _c, error_1;
        var content = _b.content, filename = _b.filename, filters = _b.filters;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 6, , 7]);
                    console.log('[Export] exportFile called:', { filename: filename, contentLength: content.length });
                    win = event.sender.getOwnerBrowserWindow();
                    console.log('[Export] Window for dialog:', win ? 'Found' : 'Not found');
                    // Show save dialog
                    console.log('[Export] Showing save dialog...');
                    dialogOptions = {
                        defaultPath: filename,
                        filters: filters || [
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    };
                    if (!win) return [3 /*break*/, 2];
                    return [4 /*yield*/, dialog.showSaveDialog(win, dialogOptions)];
                case 1:
                    _c = _d.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, dialog.showSaveDialog(dialogOptions)];
                case 3:
                    _c = _d.sent();
                    _d.label = 4;
                case 4:
                    result = _c;
                    console.log('[Export] Dialog result:', result);
                    if (result.canceled) {
                        console.log('[Export] User canceled save dialog');
                        return [2 /*return*/, { success: false, canceled: true }];
                    }
                    // Write file
                    return [4 /*yield*/, promises_1.default.writeFile(result.filePath, content)];
                case 5:
                    // Write file
                    _d.sent();
                    console.log('[Export] File saved successfully:', result.filePath);
                    return [2 /*return*/, {
                            success: true,
                            filePath: result.filePath
                        }];
                case 6:
                    error_1 = _d.sent();
                    console.error('[Export] Error saving file:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message
                        }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Export file without dialog (auto-download to downloads folder)
 */
function exportFileAuto(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var downloadsPath, finalPath, counter, ext, nameWithoutExt, error_2;
        var content = _b.content, filename = _b.filename, mimeType = _b.mimeType;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 5, , 6]);
                    console.log('[Export] exportFileAuto called:', { filename: filename, mimeType: mimeType, contentLength: content.length });
                    downloadsPath = app.getPath('downloads');
                    finalPath = path_1.default.join(downloadsPath, filename);
                    counter = 1;
                    ext = path_1.default.extname(filename);
                    nameWithoutExt = path_1.default.basename(filename, ext);
                    _c.label = 1;
                case 1: return [4 /*yield*/, promises_1.default.access(finalPath).then(function () { return true; }).catch(function () { return false; })];
                case 2:
                    if (!_c.sent()) return [3 /*break*/, 3];
                    finalPath = path_1.default.join(downloadsPath, "".concat(nameWithoutExt, " (").concat(counter, ")").concat(ext));
                    counter++;
                    return [3 /*break*/, 1];
                case 3: 
                // Write file
                return [4 /*yield*/, promises_1.default.writeFile(finalPath, content)];
                case 4:
                    // Write file
                    _c.sent();
                    console.log('[Export] File auto-saved to:', finalPath);
                    // Show notification
                    new Notification({
                        title: 'File Downloaded',
                        body: "Saved to: ".concat(path_1.default.basename(finalPath))
                    }).show();
                    return [2 /*return*/, {
                            success: true,
                            filePath: finalPath
                        }];
                case 5:
                    error_2 = _c.sent();
                    console.error('[Export] Error auto-saving file:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2.message
                        }];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Export message as various formats
 */
function exportMessage(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler, result, error_3;
        var format = _b.format, content = _b.content, metadata = _b.metadata;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    console.log('[Export] exportMessage called:', { format: format, contentLength: content.length });
                    return [4 /*yield*/, getHandler()];
                case 1:
                    handler = _c.sent();
                    return [4 /*yield*/, handler.exportMessage({ format: format, content: content, metadata: metadata })];
                case 2:
                    result = _c.sent();
                    if (!result.success) {
                        return [2 /*return*/, {
                                success: false,
                                error: result.error
                            }];
                    }
                    // Use platform-specific file dialog
                    return [2 /*return*/, exportFile(event, {
                            content: result.fileContent,
                            filename: result.filename,
                            filters: result.filters
                        })];
                case 3:
                    error_3 = _c.sent();
                    console.error('[Export] Error exporting message:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            error: error_3.message
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Export conversation as HTML with microdata markup
 * Uses ONE.core's implode() function to embed referenced objects
 */
function exportHtmlWithMicrodata(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler, result, error_4;
        var topicId = _b.topicId, format = _b.format, _c = _b.options, options = _c === void 0 ? {} : _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 3, , 4]);
                    console.log('[Export] exportHtmlWithMicrodata called:', { topicId: topicId, format: format, options: options });
                    return [4 /*yield*/, getHandler()];
                case 1:
                    handler = _d.sent();
                    return [4 /*yield*/, handler.exportHtmlWithMicrodata({ topicId: topicId, format: format, options: options })];
                case 2:
                    result = _d.sent();
                    return [2 /*return*/, result];
                case 3:
                    error_4 = _d.sent();
                    console.error('[Export] Error exporting HTML with microdata:', error_4);
                    return [2 /*return*/, {
                            success: false,
                            error: error_4.message
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.default = {
    exportFile: exportFile,
    exportFileAuto: exportFileAuto,
    exportMessage: exportMessage,
    exportHtmlWithMicrodata: exportHtmlWithMicrodata
};
