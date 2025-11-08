/**
 * Proposals IPC Plans (Thin Adapter)
 *
 * Maps Electron IPC calls to ProposalsHandler methods.
 * Business logic lives in ../../../lama.core/plans/ProposalsHandler.ts
 *
 * Implements Phase 2 (IPC Layer) for spec 019-above-the-chat
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
export const proposalPlans = void 0;
var ProposalsHandler_js_1 = require("@lama/core/plans/ProposalsHandler.js");
var proposal_engine_js_1 = require("../../services/proposal-engine.js");
var proposal_ranker_js_1 = require("../../services/proposal-ranker.js");
var proposal_cache_js_1 = require("../../services/proposal-cache.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
// Initialize services
var proposalEngine = null;
var proposalRanker = new proposal_ranker_js_1.ProposalRanker();
var proposalCache = new proposal_cache_js_1.ProposalCache(50, 60000); // 50 entries, 60s TTL
// Singleton handler instance
var proposalsHandler = null;
/**
 * Initialize ProposalEngine and handler
 */
function getProposalsHandler() {
    // Initialize ProposalEngine if needed
    if (!proposalEngine && node_one_core_js_1.default.topicAnalysisModel && node_one_core_js_1.default.channelManager) {
        proposalEngine = new proposal_engine_js_1.ProposalEngine(node_one_core_js_1.default.topicAnalysisModel, node_one_core_js_1.default.channelManager);
    }
    if (!proposalEngine) {
        throw new Error('ProposalEngine not initialized - nodeOneCore not ready');
    }
    // Initialize handler if needed
    if (!proposalsHandler) {
        proposalsHandler = new ProposalsHandler_js_1.ProposalsHandler(node_one_core_js_1.default, node_one_core_js_1.default.topicAnalysisModel, proposalEngine, proposalRanker, proposalCache);
    }
    return proposalsHandler;
}
/**
 * Get proposals for a specific topic
 * Handler: proposals:getForTopic
 */
function getForTopic(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler;
        var topicId = _b.topicId, currentSubjects = _b.currentSubjects, forceRefresh = _b.forceRefresh;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    handler = getProposalsHandler();
                    return [4 /*yield*/, handler.getForTopic({ topicId: topicId, currentSubjects: currentSubjects, forceRefresh: forceRefresh })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
/**
 * Update user's proposal configuration
 * Handler: proposals:updateConfig
 */
function updateConfig(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler;
        var config = _b.config;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    handler = getProposalsHandler();
                    return [4 /*yield*/, handler.updateConfig({ config: config })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
/**
 * Get current user's proposal configuration
 * Handler: proposals:getConfig
 */
function getConfig(event) {
    return __awaiter(this, void 0, void 0, function () {
        var handler;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    handler = getProposalsHandler();
                    return [4 /*yield*/, handler.getConfig({})];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Dismiss a proposal for the current session
 * Handler: proposals:dismiss
 */
function dismiss(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler;
        var proposalId = _b.proposalId, topicId = _b.topicId, pastSubjectIdHash = _b.pastSubjectIdHash;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    handler = getProposalsHandler();
                    return [4 /*yield*/, handler.dismiss({ proposalId: proposalId, topicId: topicId, pastSubjectIdHash: pastSubjectIdHash })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
/**
 * Share a proposal into the current conversation
 * Handler: proposals:share
 */
function share(event_1, _a) {
    return __awaiter(this, arguments, void 0, function (event, _b) {
        var handler;
        var proposalId = _b.proposalId, topicId = _b.topicId, pastSubjectIdHash = _b.pastSubjectIdHash, includeMessages = _b.includeMessages;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    handler = getProposalsHandler();
                    return [4 /*yield*/, handler.share({ proposalId: proposalId, topicId: topicId, pastSubjectIdHash: pastSubjectIdHash, includeMessages: includeMessages })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
/**
 * Export proposal plans
 */
export const proposalPlans = {
    'proposals:getForTopic': getForTopic,
    'proposals:updateConfig': updateConfig,
    'proposals:getConfig': getConfig,
    'proposals:dismiss': dismiss,
    'proposals:share': share,
};
