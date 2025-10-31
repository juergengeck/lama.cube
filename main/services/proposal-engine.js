"use strict";
/**
 * ProposalEngine Service
 * Generates knowledge sharing proposals by matching current subjects with past subjects
 *
 * Reference: /specs/019-above-the-chat/data-model.md lines 146-190
 * Reference: /specs/019-above-the-chat/research.md lines 59-72
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
exports.ProposalEngine = void 0;
var storage_versioned_objects_js_1 = require("@refinio/one.core/lib/storage-versioned-objects.js");
var object_js_1 = require("@refinio/one.core/lib/util/object.js");
var ProposalEngine = /** @class */ (function () {
    function ProposalEngine(topicAnalysisModel, channelManager) {
        this.topicAnalysisModel = topicAnalysisModel;
        this.channelManager = channelManager;
    }
    /**
     * Get proposals for a topic based on current subjects
     *
     * @param topicId - Current topic ID
     * @param currentSubjects - Array of current subject ID hashes
     * @param config - Proposal configuration
     * @param allSubjects - Optional pre-fetched array of all subjects (for performance)
     * @returns Array of proposals with matched keywords
     */
    ProposalEngine.prototype.getProposalsForTopic = function (topicId, currentSubjects, config, allSubjects) {
        return __awaiter(this, void 0, void 0, function () {
            var currentSubjectObjects, _i, currentSubjects_1, subjectIdHash, result, error_1, pastSubjects, _a, eligiblePastSubjects, proposals, _b, currentSubjectObjects_1, currentSubject, _c, eligiblePastSubjects_1, pastSubject, currentKeywordTerms, pastKeywordTerms, jaccard, pastCreatedAt, age, recencyBoost, relevanceScore, matchedKeywords, currentSubjectIdHash, pastSubjectIdHash, proposal;
            var _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (!currentSubjects || currentSubjects.length === 0) {
                            return [2 /*return*/, []];
                        }
                        currentSubjectObjects = [];
                        _i = 0, currentSubjects_1 = currentSubjects;
                        _h.label = 1;
                    case 1:
                        if (!(_i < currentSubjects_1.length)) return [3 /*break*/, 6];
                        subjectIdHash = currentSubjects_1[_i];
                        _h.label = 2;
                    case 2:
                        _h.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.getObjectByIdHash)(subjectIdHash)];
                    case 3:
                        result = _h.sent();
                        if (result && result.obj) {
                            currentSubjectObjects.push(result.obj);
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _h.sent();
                        console.error("[ProposalEngine] Error fetching subject ".concat(subjectIdHash, ":"), error_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        if (currentSubjectObjects.length === 0) {
                            return [2 /*return*/, []];
                        }
                        _a = allSubjects;
                        if (_a) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.fetchAllSubjects()];
                    case 7:
                        _a = (_h.sent());
                        _h.label = 8;
                    case 8:
                        pastSubjects = _a;
                        eligiblePastSubjects = pastSubjects.filter(function (s) { return s.topic !== topicId; });
                        proposals = [];
                        console.log("[ProposalEngine] Starting with ".concat(currentSubjectObjects.length, " current subjects, ").concat(eligiblePastSubjects.length, " eligible past subjects, minJaccard: ").concat(config.minJaccard));
                        _b = 0, currentSubjectObjects_1 = currentSubjectObjects;
                        _h.label = 9;
                    case 9:
                        if (!(_b < currentSubjectObjects_1.length)) return [3 /*break*/, 17];
                        currentSubject = currentSubjectObjects_1[_b];
                        console.log("[ProposalEngine] Current subject \"".concat(currentSubject.id, "\" has ").concat(((_d = currentSubject.keywords) === null || _d === void 0 ? void 0 : _d.length) || 0, " keywords"));
                        _c = 0, eligiblePastSubjects_1 = eligiblePastSubjects;
                        _h.label = 10;
                    case 10:
                        if (!(_c < eligiblePastSubjects_1.length)) return [3 /*break*/, 16];
                        pastSubject = eligiblePastSubjects_1[_c];
                        console.log("[ProposalEngine] Comparing with past subject \"".concat(pastSubject.id, "\" from topic \"").concat(pastSubject.topic, "\" (").concat(((_e = pastSubject.keywords) === null || _e === void 0 ? void 0 : _e.length) || 0, " keywords)"));
                        return [4 /*yield*/, this.resolveKeywordTerms(currentSubject.keywords)];
                    case 11:
                        currentKeywordTerms = _h.sent();
                        return [4 /*yield*/, this.resolveKeywordTerms(pastSubject.keywords)];
                    case 12:
                        pastKeywordTerms = _h.sent();
                        console.log("[ProposalEngine] Keyword terms - Current: [".concat(currentKeywordTerms.join(', '), "], Past: [").concat(pastKeywordTerms.join(', '), "]"));
                        jaccard = this.calculateJaccardFromTerms(currentKeywordTerms, pastKeywordTerms);
                        console.log("[ProposalEngine] Jaccard: ".concat(jaccard.toFixed(3), " (threshold: ").concat(config.minJaccard, ") - ").concat(jaccard >= config.minJaccard ? 'MATCH' : 'skip'));
                        // Skip if below threshold
                        if (jaccard < config.minJaccard) {
                            return [3 /*break*/, 15];
                        }
                        pastCreatedAt = ((_g = (_f = pastSubject.timeRanges) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.start) || 0;
                        age = Date.now() - pastCreatedAt;
                        recencyBoost = Math.max(0, 1 - age / config.recencyWindow);
                        relevanceScore = jaccard * config.matchWeight + recencyBoost * config.recencyWeight;
                        matchedKeywords = this.getMatchedKeywordTerms(currentKeywordTerms, pastKeywordTerms);
                        return [4 /*yield*/, (0, object_js_1.calculateIdHashOfObj)(currentSubject)];
                    case 13:
                        currentSubjectIdHash = _h.sent();
                        return [4 /*yield*/, (0, object_js_1.calculateIdHashOfObj)(pastSubject)];
                    case 14:
                        pastSubjectIdHash = _h.sent();
                        proposal = {
                            id: "prop-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(7)),
                            pastSubject: pastSubjectIdHash,
                            currentSubject: currentSubjectIdHash,
                            matchedKeywords: matchedKeywords,
                            relevanceScore: relevanceScore,
                            sourceTopicId: pastSubject.topic,
                            pastSubjectName: pastSubject.id || pastSubject.description || 'Unknown Subject',
                            createdAt: pastCreatedAt,
                        };
                        proposals.push(proposal);
                        console.log("[ProposalEngine] \u2705 Generated proposal: \"".concat(pastSubject.id, "\" -> \"").concat(currentSubject.id, "\" (score: ").concat(proposal.relevanceScore.toFixed(3), ", keywords: ").concat(matchedKeywords.length, ")"));
                        _h.label = 15;
                    case 15:
                        _c++;
                        return [3 /*break*/, 10];
                    case 16:
                        _b++;
                        return [3 /*break*/, 9];
                    case 17:
                        console.log("[ProposalEngine] Proposal generation complete: ".concat(proposals.length, " proposals generated"));
                        return [2 /*return*/, proposals];
                }
            });
        });
    };
    /**
     * Resolve keyword ID hashes to actual keyword terms
     */
    ProposalEngine.prototype.resolveKeywordTerms = function (keywordIdHashes) {
        return __awaiter(this, void 0, void 0, function () {
            var terms, _i, _a, idHash, result, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        terms = [];
                        _i = 0, _a = keywordIdHashes || [];
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        idHash = _a[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.getObjectByIdHash)(idHash)];
                    case 3:
                        result = _b.sent();
                        if (result && result.obj && result.obj.term) {
                            terms.push(result.obj.term.toLowerCase().trim());
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _b.sent();
                        console.error("[ProposalEngine] Error resolving keyword ".concat(idHash, ":"), error_2);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, terms];
                }
            });
        });
    };
    /**
     * Calculate Jaccard similarity between two sets of keyword TERMS (strings)
     * Formula: |intersection| / |union|
     */
    ProposalEngine.prototype.calculateJaccardFromTerms = function (termsA, termsB) {
        if (termsA.length === 0 || termsB.length === 0) {
            return 0;
        }
        var setA = new Set(termsA);
        var setB = new Set(termsB);
        // Calculate intersection
        var intersection = new Set(__spreadArray([], setA, true).filter(function (k) { return setB.has(k); }));
        // Calculate union
        var union = new Set(__spreadArray(__spreadArray([], setA, true), setB, true));
        return intersection.size / union.size;
    };
    /**
     * Get matched keyword terms (intersection of two term sets)
     */
    ProposalEngine.prototype.getMatchedKeywordTerms = function (termsA, termsB) {
        var setA = new Set(termsA);
        var setB = new Set(termsB);
        // Return intersection
        return __spreadArray([], setA, true).filter(function (k) { return setB.has(k); });
    };
    /**
     * Calculate Jaccard similarity between two keyword ID hash sets (DEPRECATED - use calculateJaccardFromTerms)
     * Formula: |intersection| / |union|
     */
    ProposalEngine.prototype.calculateJaccard = function (keywordsA, keywordsB) {
        if (keywordsA.length === 0 || keywordsB.length === 0) {
            return 0;
        }
        var setA = new Set(keywordsA);
        var setB = new Set(keywordsB);
        // Calculate intersection
        var intersection = new Set(__spreadArray([], setA, true).filter(function (k) { return setB.has(k); }));
        // Calculate union
        var union = new Set(__spreadArray(__spreadArray([], setA, true), setB, true));
        return intersection.size / union.size;
    };
    /**
     * Get matched keywords (intersection of two keyword sets)
     * Returns keyword terms as strings
     */
    ProposalEngine.prototype.getMatchedKeywords = function (keywordsA, keywordsB) {
        return __awaiter(this, void 0, void 0, function () {
            var setA, setB, intersection, terms, _i, intersection_1, keywordIdHash, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setA = new Set(keywordsA);
                        setB = new Set(keywordsB);
                        intersection = __spreadArray([], setA, true).filter(function (k) { return setB.has(k); });
                        terms = [];
                        _i = 0, intersection_1 = intersection;
                        _a.label = 1;
                    case 1:
                        if (!(_i < intersection_1.length)) return [3 /*break*/, 6];
                        keywordIdHash = intersection_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, storage_versioned_objects_js_1.getObjectByIdHash)(keywordIdHash)];
                    case 3:
                        result = _a.sent();
                        if (result && result.obj && result.obj.term) {
                            terms.push(result.obj.term);
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        console.error("[ProposalEngine] Error fetching keyword ".concat(keywordIdHash, ":"), error_3);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, terms];
                }
            });
        });
    };
    /**
     * Fetch all subjects from ONE.core by querying all topics
     */
    ProposalEngine.prototype.fetchAllSubjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            var channels, topicIds, _i, channels_1, channel, allSubjects, _a, topicIds_1, topicId, subjects, error_4, error_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 8, , 9]);
                        if (!this.channelManager || !this.topicAnalysisModel) {
                            console.warn('[ProposalEngine] Missing dependencies for fetching subjects');
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, this.channelManager.channels()];
                    case 1:
                        channels = _b.sent();
                        topicIds = new Set();
                        for (_i = 0, channels_1 = channels; _i < channels_1.length; _i++) {
                            channel = channels_1[_i];
                            if (channel.id) {
                                topicIds.add(channel.id);
                            }
                        }
                        console.log("[ProposalEngine] Fetching subjects from ".concat(topicIds.size, " topics"));
                        allSubjects = [];
                        _a = 0, topicIds_1 = topicIds;
                        _b.label = 2;
                    case 2:
                        if (!(_a < topicIds_1.length)) return [3 /*break*/, 7];
                        topicId = topicIds_1[_a];
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.topicAnalysisModel.getSubjects(topicId)];
                    case 4:
                        subjects = (_b.sent());
                        if (subjects && subjects.length > 0) {
                            allSubjects.push.apply(allSubjects, subjects);
                            console.log("[ProposalEngine] Found ".concat(subjects.length, " subjects in topic ").concat(topicId));
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_4 = _b.sent();
                        console.error("[ProposalEngine] Error fetching subjects for topic ".concat(topicId, ":"), error_4);
                        return [3 /*break*/, 6];
                    case 6:
                        _a++;
                        return [3 /*break*/, 2];
                    case 7:
                        console.log("[ProposalEngine] Total subjects fetched: ".concat(allSubjects.length));
                        return [2 /*return*/, allSubjects];
                    case 8:
                        error_5 = _b.sent();
                        console.error('[ProposalEngine] Error in fetchAllSubjects:', error_5);
                        return [2 /*return*/, []];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return ProposalEngine;
}());
exports.ProposalEngine = ProposalEngine;
