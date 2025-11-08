/**
 * Chat IPC Plans
 * Thin adapter that delegates to chat.core ChatHandler
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
export const chatPlan = exports.chatPlans = void 0;
var ChatHandler_js_1 = require("@chat/core/plans/ChatHandler.js");
var manager_js_1 = require("../../state/manager.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
var message_versioning_js_1 = require("../../core/message-versioning.js");
var message_assertion_certificates_js_1 = require("../../core/message-assertion-certificates.js");
var electron_1 = require("electron");
var BrowserWindow = electron_1.default.BrowserWindow;
// Message version manager instance
var messageVersionManager = null;
// Message assertion manager instance
var messageAssertionManager = null;
// Initialize ChatHandler with dependencies
var chatPlan = new ChatHandler_js_1.ChatHandler(node_one_core_js_1.default, manager_js_1.default, messageVersionManager, messageAssertionManager);
export { chatPlan };
// Initialize message managers when they become available
function initializeMessageManagers() {
    if (!messageVersionManager && node_one_core_js_1.default.channelManager) {
        messageVersionManager = new message_versioning_js_1.MessageVersionManager(node_one_core_js_1.default.channelManager);
    }
    if (!messageAssertionManager && node_one_core_js_1.default.leuteModel && node_one_core_js_1.default.leuteModel.trust) {
        messageAssertionManager = new message_assertion_certificates_js_1.MessageAssertionManager(node_one_core_js_1.default.leuteModel.trust, node_one_core_js_1.default.leuteModel);
    }
    if (messageVersionManager && messageAssertionManager) {
        chatPlan.setMessageManagers(messageVersionManager, messageAssertionManager);
    }
}
var chatPlans = {
    // NOTE: initializeDefaultChats removed - default chats are created automatically
    // by AIAssistantHandler.init() in node-one-core.ts during ONE.core initialization
    uiReady: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var mainWindow_1, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Platform-specific: Update PeerMessageListener with current window
                        if (node_one_core_js_1.default.peerMessageListener) {
                            mainWindow_1 = BrowserWindow.getAllWindows()[0];
                            if (mainWindow_1) {
                                node_one_core_js_1.default.peerMessageListener.setMainWindow(mainWindow_1);
                                console.log('[ChatHandler] Updated PeerMessageListener with current window');
                            }
                        }
                        return [4 /*yield*/, chatPlan.uiReady({})];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, { success: response.success, error: response.error }];
                }
            });
        });
    },
    sendMessage: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var conversationId = _b.conversationId, text = _b.text, _c = _b.attachments, attachments = _c === void 0 ? [] : _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, chatPlan.sendMessage({
                            conversationId: conversationId,
                            content: text, // Map 'text' to 'content'
                            attachments: attachments
                        })];
                    case 1:
                        response = _d.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                data: response.data,
                                error: response.error
                            }];
                }
            });
        });
    },
    getMessages: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var conversationId = _b.conversationId, _c = _b.limit, limit = _c === void 0 ? 50 : _c, _d = _b.offset, offset = _d === void 0 ? 0 : _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, chatPlan.getMessages({ conversationId: conversationId, limit: limit, offset: offset })];
                    case 1:
                        response = _e.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                messages: response.messages,
                                total: response.total,
                                hasMore: response.hasMore,
                                error: response.error
                            }];
                }
            });
        });
    },
    createConversation: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var _c = _b.type, type = _c === void 0 ? 'direct' : _c, _d = _b.participants, participants = _d === void 0 ? [] : _d, _e = _b.name, name = _e === void 0 ? null : _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, chatPlan.createConversation({ type: type, participants: participants, name: name })];
                    case 1:
                        response = _f.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                data: response.data,
                                error: response.error
                            }];
                }
            });
        });
    },
    getConversations: function (event_1) {
        return __awaiter(this, arguments, void 0, function (event, _a) {
            var response;
            var _b = _a === void 0 ? {} : _a, _c = _b.limit, limit = _c === void 0 ? 20 : _c, _d = _b.offset, offset = _d === void 0 ? 0 : _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, chatPlan.getConversations({ limit: limit, offset: offset })];
                    case 1:
                        response = _e.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                data: response.data,
                                error: response.error
                            }];
                }
            });
        });
    },
    getConversation: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var conversationId = _b.conversationId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, chatPlan.getConversation({ conversationId: conversationId })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                data: response.data,
                                error: response.error
                            }];
                }
            });
        });
    },
    getCurrentUser: function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, chatPlan.getCurrentUser({})];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                user: response.user,
                                error: response.error
                            }];
                }
            });
        });
    },
    addParticipants: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var conversationId = _b.conversationId, participantIds = _b.participantIds;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, chatPlan.addParticipants({ conversationId: conversationId, participantIds: participantIds })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                data: response.data,
                                error: response.error
                            }];
                }
            });
        });
    },
    clearConversation: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var conversationId = _b.conversationId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Initialize message managers if needed
                        initializeMessageManagers();
                        return [4 /*yield*/, chatPlan.clearConversation({ conversationId: conversationId })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                error: response.error
                            }];
                }
            });
        });
    },
    editMessage: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var messageId = _b.messageId, conversationId = _b.conversationId, newText = _b.newText, editReason = _b.editReason;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Initialize message managers if needed
                        initializeMessageManagers();
                        return [4 /*yield*/, chatPlan.editMessage({ messageId: messageId, conversationId: conversationId, newText: newText, editReason: editReason })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                data: response.data,
                                error: response.error
                            }];
                }
            });
        });
    },
    deleteMessage: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var messageId = _b.messageId, conversationId = _b.conversationId, reason = _b.reason;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Initialize message managers if needed
                        initializeMessageManagers();
                        return [4 /*yield*/, chatPlan.deleteMessage({ messageId: messageId, conversationId: conversationId, reason: reason })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                error: response.error
                            }];
                }
            });
        });
    },
    getMessageHistory: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var messageId = _b.messageId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Initialize message managers if needed
                        initializeMessageManagers();
                        return [4 /*yield*/, chatPlan.getMessageHistory({ messageId: messageId })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                history: response.history,
                                error: response.error
                            }];
                }
            });
        });
    },
    exportMessageCredential: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var messageId = _b.messageId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Initialize message managers if needed
                        initializeMessageManagers();
                        return [4 /*yield*/, chatPlan.exportMessageCredential({ messageId: messageId })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                credential: response.credential,
                                error: response.error
                            }];
                }
            });
        });
    },
    verifyMessageAssertion: function (event_1, _a) {
        return __awaiter(this, arguments, void 0, function (event, _b) {
            var response;
            var certificateHash = _b.certificateHash, messageHash = _b.messageHash;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Initialize message managers if needed
                        initializeMessageManagers();
                        return [4 /*yield*/, chatPlan.verifyMessageAssertion({ certificateHash: certificateHash, messageHash: messageHash })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: response.success,
                                valid: response.valid,
                                error: response.error
                            }];
                }
            });
        });
    }
};
export { chatPlans };
