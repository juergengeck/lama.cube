/**
 * Contact Management IPC Plans (Thin Adapter)
 *
 * Maps Electron IPC calls to ContactsHandler methods.
 * Business logic lives in ../../../lama.core/plans/ContactsHandler.ts
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
export { registerContactPlans };
var electron_1 = require("electron");
var ipcMain = electron_1.default.ipcMain, BrowserWindow = electron_1.default.BrowserWindow;
var node_one_core_js_1 = require("../../core/node-one-core.js");
var ContactsHandler_js_1 = require("@chat/core/plans/ContactsHandler.js");
// Create handler instance with Electron-specific dependencies
var contactsHandler = new ContactsHandler_js_1.ContactsHandler(node_one_core_js_1.default);
/**
 * Register contact management IPC plans
 */
function registerContactPlans() {
    var _this = this;
    var _a;
    // Get all contacts with trust status
    ipcMain.handle('contacts:list-with-trust', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.getContactsWithTrust()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Get all contacts
    ipcMain.handle('contacts:list', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.getContacts()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Get pending contacts for review
    ipcMain.handle('contacts:pending:list', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.getPendingContacts()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Get specific pending contact details
    ipcMain.handle('contacts:pending:get', function (event, pendingId) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.getPendingContact(pendingId)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Accept a contact (update trust level)
    ipcMain.handle('contacts:accept', function (event_1, personId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([event_1, personId_1], args_1, true), void 0, function (event, personId, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, contactsHandler.acceptContact(personId, options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    });
    // Block a contact
    ipcMain.handle('contacts:block', function (event, personId, reason) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.blockContact(personId, reason)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Legacy: Accept a pending contact (for backward compatibility)
    ipcMain.handle('contacts:pending:accept', function (event_1, pendingId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([event_1, pendingId_1], args_1, true), void 0, function (event, pendingId, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                // This is now handled through trust manager
                return [2 /*return*/, { success: false, error: 'Use contacts:accept instead' }];
            });
        });
    });
    // Reject a pending contact
    ipcMain.handle('contacts:pending:reject', function (event, pendingId, reason) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.rejectContact(pendingId, reason)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Add contact
    ipcMain.handle('contacts:add', function (event, personInfo) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.addContact(personInfo)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Remove contact
    ipcMain.handle('contacts:remove', function (event, contactId) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.removeContact(contactId)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Revoke contact's VC
    ipcMain.handle('contacts:revoke', function (event, personId) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, contactsHandler.revokeContactVC(personId)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // Listen for pending contact events and forward to renderer (Electron-specific)
    if ((_a = node_one_core_js_1.default.quicTransport) === null || _a === void 0 ? void 0 : _a.leuteModel) {
        node_one_core_js_1.default.quicTransport.leuteModel.on('pending-contact', function (data) {
            // Send to all windows
            BrowserWindow.getAllWindows().forEach(function (window) {
                window.webContents.send('contacts:pending:new', data);
            });
        });
        node_one_core_js_1.default.quicTransport.leuteModel.on('contact-accepted', function (data) {
            BrowserWindow.getAllWindows().forEach(function (window) {
                window.webContents.send('contacts:accepted', data);
            });
        });
        node_one_core_js_1.default.quicTransport.leuteModel.on('dedicated-vc-received', function (data) {
            BrowserWindow.getAllWindows().forEach(function (window) {
                window.webContents.send('contacts:vc:received', data);
            });
        });
    }
}
