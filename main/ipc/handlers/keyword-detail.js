"use strict";
/**
 * Keyword Detail IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to KeywordDetailHandler methods.
 * Business logic lives in ../../../lama.core/handlers/KeywordDetailHandler.ts
 *
 * Implements Phase 2 (IPC Layer) for spec 015-keyword-detail-preview
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
exports.getKeywordDetails = getKeywordDetails;
exports.updateKeywordAccessState = updateKeywordAccessState;
var KeywordDetailHandler_js_1 = require("@lama/core/handlers/KeywordDetailHandler.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
var TopicAnalysisModel_js_1 = require("@lama/core/one-ai/models/TopicAnalysisModel.js");
var keywordAccessStorage = require("@lama/core/one-ai/storage/keyword-access-storage.js");
var keywordEnrichment = require("@lama/core/one-ai/services/keyword-enrichment.js");
// Singleton model instance
var topicAnalysisModel = null;
var keywordDetailHandler = null;
/**
 * Initialize TopicAnalysisModel singleton and handler
 */
function initializeHandler() {
    return __awaiter(this, void 0, void 0, function () {
        var channelManager, topicModel;
        return __generator(this, function (_a) {
            if (keywordDetailHandler && (topicAnalysisModel === null || topicAnalysisModel === void 0 ? void 0 : topicAnalysisModel.state.currentState) === 'Initialised') {
                return [2 /*return*/, keywordDetailHandler];
            }
            if (!(node_one_core_js_1.default === null || node_one_core_js_1.default === void 0 ? void 0 : node_one_core_js_1.default.initialized)) {
                throw new Error('ONE.core not initialized');
            }
            channelManager = node_one_core_js_1.default.channelManager;
            if (!channelManager) {
                throw new Error('ChannelManager not available');
            }
            topicModel = node_one_core_js_1.default.topicModel;
            if (!topicModel) {
                throw new Error('TopicModel not available');
            }
            if (!topicAnalysisModel) {
                topicAnalysisModel = new TopicAnalysisModel_js_1.default(channelManager, topicModel);
            }
            if (!keywordDetailHandler) {
                keywordDetailHandler = new KeywordDetailHandler_js_1.KeywordDetailHandler(node_one_core_js_1.default, topicAnalysisModel, keywordAccessStorage, keywordEnrichment);
            }
            return [2 /*return*/, keywordDetailHandler];
        });
    });
}
/**
 * Get keyword details with subjects, access states, and topic references
 * Handler for: keywordDetail:getKeywordDetails
 * Contract: /specs/015-keyword-detail-preview/contracts/getKeywordDetails.md
 */
function getKeywordDetails(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler, error_1;
        var keyword = _b.keyword, topicId = _b.topicId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, initializeHandler()];
                case 1:
                    handler = _c.sent();
                    return [4 /*yield*/, handler.getKeywordDetails({ keyword: keyword, topicId: topicId })];
                case 2: return [2 /*return*/, _c.sent()];
                case 3:
                    error_1 = _c.sent();
                    console.error('[KeywordDetail] Error in IPC handler:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message,
                            data: {
                                keyword: null,
                                subjects: [],
                                accessStates: []
                            }
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Update or create access state for a keyword and principal
 * Handler for: keywordDetail:updateKeywordAccessState
 * Contract: /specs/015-keyword-detail-preview/contracts/updateKeywordAccessState.md
 */
function updateKeywordAccessState(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler, error_2;
        var keyword = _b.keyword, topicId = _b.topicId, principalId = _b.principalId, principalType = _b.principalType, state = _b.state;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, initializeHandler()];
                case 1:
                    handler = _c.sent();
                    return [4 /*yield*/, handler.updateKeywordAccessState({
                            keyword: keyword,
                            topicId: topicId,
                            principalId: principalId,
                            principalType: principalType,
                            state: state
                        })];
                case 2: return [2 /*return*/, _c.sent()];
                case 3:
                    error_2 = _c.sent();
                    console.error('[KeywordDetail] Error in IPC handler:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2.message,
                            data: {
                                accessState: null,
                                created: false
                            }
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Export all handlers
exports.default = {
    getKeywordDetails: getKeywordDetails,
    updateKeywordAccessState: updateKeywordAccessState
};
