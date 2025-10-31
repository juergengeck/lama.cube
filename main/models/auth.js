"use strict";
/**
 * Authentication Model
 * Handles user authentication with ONE.CORE
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
var manager_js_1 = require("../state/manager.js");
var AuthModel = /** @class */ (function () {
    function AuthModel() {
        this.currentUser = null;
        this.multiUser = null;
    }
    AuthModel.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // AUTH MODEL DOES NOT INITIALIZE NODE
                // Node initialization happens only through provision:node IPC handler
                // This prevents competing control flows
                console.log('[AuthModel] Skipping initialization - handled by provision:node');
                return [2 /*return*/];
            });
        });
    };
    AuthModel.prototype.login = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    console.log("[AuthModel] Login not handled here - browser handles auth");
                    // AUTH MODEL DOES NOT HANDLE LOGIN
                    // Browser handles login and provisions Node via IPC
                    // This prevents competing control flows
                    return [2 /*return*/, {
                            success: false,
                            error: 'Login must be initiated from browser UI'
                        }];
                }
                catch (error) {
                    console.error('[AuthModel] Login error:', error);
                    return [2 /*return*/, {
                            success: false,
                            error: error.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    AuthModel.prototype.register = function (username_1, password_1) {
        return __awaiter(this, arguments, void 0, function (username, password, email) {
            if (email === void 0) { email = null; }
            return __generator(this, function (_a) {
                try {
                    console.log("[AuthModel] Registration not handled here - browser handles auth");
                    // AUTH MODEL DOES NOT HANDLE REGISTRATION
                    // Browser handles registration and provisions Node via IPC
                    // This prevents competing control flows
                    return [2 /*return*/, {
                            success: false,
                            error: 'Registration must be initiated from browser UI'
                        }];
                }
                catch (error) {
                    console.error('[AuthModel] Registration error:', error);
                    return [2 /*return*/, {
                            success: false,
                            error: error.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    AuthModel.prototype.logout = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (!this.multiUser) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.multiUser.logout()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.currentUser = null;
                        manager_js_1.default.clearUser();
                        console.log('[AuthModel] Logged out');
                        return [2 /*return*/, { success: true }];
                    case 3:
                        error_1 = _a.sent();
                        console.error('[AuthModel] Logout error:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1.message
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AuthModel.prototype.checkAuth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isAuthenticated, userId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.multiUser) {
                            return [2 /*return*/, { authenticated: false }];
                        }
                        return [4 /*yield*/, this.multiUser.isAuthenticated()];
                    case 1:
                        isAuthenticated = _a.sent();
                        if (!(isAuthenticated && !this.currentUser)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.multiUser.getCurrentUserId()];
                    case 2:
                        userId = _a.sent();
                        this.currentUser = {
                            id: userId,
                            name: 'User',
                            email: 'user@lama.local'
                        };
                        manager_js_1.default.setUser(this.currentUser);
                        _a.label = 3;
                    case 3: return [2 /*return*/, {
                            authenticated: isAuthenticated,
                            user: this.currentUser
                        }];
                }
            });
        });
    };
    AuthModel.prototype.getCurrentUser = function () {
        return this.currentUser;
    };
    AuthModel.prototype.isAuthenticated = function () {
        return this.currentUser !== null;
    };
    return AuthModel;
}());
exports.default = new AuthModel();
