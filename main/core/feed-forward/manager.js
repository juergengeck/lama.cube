"use strict";
/**
 * Feed-Forward Manager
 * Main orchestrator for Supply/Demand matching and trust-based knowledge sharing
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var events_1 = require("events");
var crypto_1 = require("crypto");
var FeedForwardManager = /** @class */ (function (_super) {
    __extends(FeedForwardManager, _super);
    function FeedForwardManager(options) {
        var _this = _super.call(this) || this;
        _this.supplyCache = new Map();
        _this.demandCache = new Map();
        _this.initialized = false;
        _this.nodeOneCore = options.nodeOneCore;
        _this.keywordExtractor = options.keywordExtractor;
        _this.trustManager = options.trustManager;
        return _this;
    }
    /**
     * Initialize the feed-forward manager
     */
    FeedForwardManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var RealTimeKeywordExtractor, ContactTrustManager;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.initialized) {
                            return [2 /*return*/];
                        }
                        console.log('[FeedForwardManager] Initializing...');
                        // Validate dependencies
                        if (!this.nodeOneCore) {
                            throw new Error('NodeOneCore is required');
                        }
                        if (!!this.keywordExtractor) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@lama/core/one-ai/services/RealTimeKeywordExtractor.js'); })];
                    case 1:
                        RealTimeKeywordExtractor = (_a.sent()).default;
                        this.keywordExtractor = new RealTimeKeywordExtractor();
                        _a.label = 2;
                    case 2:
                        if (!!this.trustManager) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../contact-trust-manager.js'); })];
                    case 3:
                        ContactTrustManager = (_a.sent()).default;
                        this.trustManager = new ContactTrustManager(this.nodeOneCore);
                        _a.label = 4;
                    case 4:
                        this.initialized = true;
                        console.log('[FeedForwardManager] Initialized successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a Supply object from conversation keywords
     */
    FeedForwardManager.prototype.createSupply = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var getInstanceOwnerIdHash, creatorId, keywordHashes, trustScore, supplyId, supply, storeVersionedObject, result, supplyHash, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.initialize()
                            // Validate parameters
                        ];
                    case 1:
                        _a.sent();
                        // Validate parameters
                        if (!params.keywords || !Array.isArray(params.keywords) || params.keywords.length === 0) {
                            return [2 /*return*/, { success: false, error: 'Keywords are required and must be a non-empty array' }];
                        }
                        if (params.keywords.length > 20) {
                            return [2 /*return*/, { success: false, error: 'Maximum 20 keywords allowed' }];
                        }
                        if (!params.contextLevel || params.contextLevel < 1 || params.contextLevel > 5) {
                            return [2 /*return*/, { success: false, error: 'Context level must be between 1 and 5' }];
                        }
                        if (!params.conversationId) {
                            return [2 /*return*/, { success: false, error: 'Conversation ID is required' }];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 2:
                        getInstanceOwnerIdHash = (_a.sent()).getInstanceOwnerIdHash;
                        creatorId = getInstanceOwnerIdHash();
                        if (!creatorId) {
                            return [2 /*return*/, { success: false, error: 'User not authenticated' }];
                        }
                        keywordHashes = params.keywords.map(function (keyword) {
                            return crypto_1.default.createHash('sha256').update(keyword.toLowerCase().trim()).digest('hex');
                        });
                        return [4 /*yield*/, this.getTrustScoreForParticipant(creatorId)
                            // Generate unique ID for the Supply
                        ];
                    case 3:
                        trustScore = _a.sent();
                        supplyId = crypto_1.default.randomUUID();
                        supply = {
                            $type$: 'Supply',
                            id: supplyId,
                            keywords: keywordHashes,
                            contextLevel: params.contextLevel,
                            conversationId: params.conversationId,
                            creatorId: creatorId,
                            trustScore: trustScore.score,
                            created: Date.now(),
                            metadata: params.metadata || {},
                            isRecursive: false
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 4:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, storeVersionedObject(supply)];
                    case 5:
                        result = _a.sent();
                        supplyHash = result.hash;
                        // Cache locally for fast matching
                        this.supplyCache.set(supplyHash, supply);
                        console.log('[FeedForwardManager] Supply created:', {
                            supplyHash: supplyHash,
                            keywords: params.keywords,
                            keywordHashes: keywordHashes.slice(0, 3), // Log first 3 for debugging
                            contextLevel: params.contextLevel
                        });
                        this.emit('supply-created', {
                            supplyHash: supplyHash,
                            supply: supply,
                            originalKeywords: params.keywords
                        });
                        return [2 /*return*/, {
                                success: true,
                                supplyHash: supplyHash,
                                keywordHashes: keywordHashes
                            }];
                    case 6:
                        error_1 = _a.sent();
                        console.error('[FeedForwardManager] Error creating supply:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown error creating supply'
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a Demand object for requesting knowledge
     */
    FeedForwardManager.prototype.createDemand = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var getInstanceOwnerIdHash, requesterId, keywordHashes, demandId, demand, storeVersionedObject, result, demandHash, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.initialize()
                            // Validate parameters
                        ];
                    case 1:
                        _a.sent();
                        // Validate parameters
                        if (!params.keywords || !Array.isArray(params.keywords) || params.keywords.length === 0) {
                            return [2 /*return*/, { success: false, error: 'Keywords are required and must be a non-empty array' }];
                        }
                        if (params.keywords.length > 10) {
                            return [2 /*return*/, { success: false, error: 'Maximum 10 keywords allowed for demands' }];
                        }
                        if (!params.urgency || params.urgency < 1 || params.urgency > 10) {
                            return [2 /*return*/, { success: false, error: 'Urgency must be between 1 and 10' }];
                        }
                        if (!params.context || params.context.length > 500) {
                            return [2 /*return*/, { success: false, error: 'Context is required and must be <= 500 characters' }];
                        }
                        if (params.expires && params.expires <= Date.now()) {
                            return [2 /*return*/, { success: false, error: 'Expiration time must be in the future' }];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/instance.js'); })];
                    case 2:
                        getInstanceOwnerIdHash = (_a.sent()).getInstanceOwnerIdHash;
                        requesterId = getInstanceOwnerIdHash();
                        if (!requesterId) {
                            return [2 /*return*/, { success: false, error: 'User not authenticated' }];
                        }
                        keywordHashes = params.keywords.map(function (keyword) {
                            return crypto_1.default.createHash('sha256').update(keyword.toLowerCase().trim()).digest('hex');
                        });
                        demandId = crypto_1.default.randomUUID();
                        demand = {
                            $type$: 'Demand',
                            id: demandId,
                            keywords: keywordHashes,
                            urgency: params.urgency,
                            context: params.context,
                            criteria: params.criteria || {},
                            requesterId: requesterId,
                            created: Date.now(),
                            expires: params.expires,
                            maxResults: params.maxResults
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 3:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, storeVersionedObject(demand)];
                    case 4:
                        result = _a.sent();
                        demandHash = result.hash;
                        // Cache locally
                        this.demandCache.set(demandHash, demand);
                        console.log('[FeedForwardManager] Demand created:', {
                            demandHash: demandHash,
                            keywords: params.keywords,
                            urgency: params.urgency
                        });
                        this.emit('demand-created', {
                            demandHash: demandHash,
                            demand: demand,
                            originalKeywords: params.keywords
                        });
                        return [2 /*return*/, {
                                success: true,
                                demandHash: demandHash
                            }];
                    case 5:
                        error_2 = _a.sent();
                        console.error('[FeedForwardManager] Error creating demand:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Unknown error creating demand'
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find Supply objects that match a Demand
     */
    FeedForwardManager.prototype.matchSupplyDemand = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var minTrust, limit, demand_1, getObjectByIdHash, ensureIdHash, demandResult, error_3, matches, _i, _a, _b, supplyHash, supply, matchedKeywords, overlapRatio, matchScore, trustWeight, limitedMatches, _c, limitedMatches_1, match, matchRecord, storeUnversionedObject, error_4;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 13, , 14]);
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _d.sent();
                        minTrust = params.minTrust || 0.3;
                        limit = params.limit || 10;
                        // Validate parameters
                        if (!params.demandHash) {
                            return [2 /*return*/, { success: false, error: 'Demand hash is required' }];
                        }
                        if (minTrust < 0 || minTrust > 1) {
                            return [2 /*return*/, { success: false, error: 'Min trust must be between 0 and 1' }];
                        }
                        if (limit < 1 || limit > 100) {
                            return [2 /*return*/, { success: false, error: 'Limit must be between 1 and 100' }];
                        }
                        demand_1 = this.demandCache.get(params.demandHash);
                        if (!!demand_1) return [3 /*break*/, 7];
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 6, , 7]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 3:
                        getObjectByIdHash = (_d.sent()).getObjectByIdHash;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/type-checks.js'); })];
                    case 4:
                        ensureIdHash = (_d.sent()).ensureIdHash;
                        return [4 /*yield*/, getObjectByIdHash(ensureIdHash(params.demandHash))];
                    case 5:
                        demandResult = _d.sent();
                        demand_1 = demandResult.obj;
                        if (demand_1) {
                            this.demandCache.set(params.demandHash, demand_1);
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        error_3 = _d.sent();
                        return [2 /*return*/, { success: false, error: 'Demand not found' }];
                    case 7:
                        if (!demand_1) {
                            return [2 /*return*/, { success: false, error: 'Demand not found' }];
                        }
                        matches = [];
                        // For now, search in cache - later we'll implement proper storage queries
                        for (_i = 0, _a = this.supplyCache.entries(); _i < _a.length; _i++) {
                            _b = _a[_i], supplyHash = _b[0], supply = _b[1];
                            // Skip if trust score too low
                            if (supply.trustScore < minTrust) {
                                continue;
                            }
                            matchedKeywords = supply.keywords.filter(function (hash) {
                                return demand_1.keywords.includes(hash);
                            });
                            if (matchedKeywords.length === 0) {
                                continue;
                            }
                            overlapRatio = matchedKeywords.length / Math.max(supply.keywords.length, demand_1.keywords.length);
                            matchScore = overlapRatio;
                            trustWeight = supply.trustScore * matchScore;
                            matches.push({
                                supplyHash: supplyHash,
                                matchScore: matchScore,
                                trustWeight: trustWeight,
                                matchedKeywords: matchedKeywords,
                                conversationId: supply.conversationId
                            });
                        }
                        // Sort by trust-weighted score and limit results
                        matches.sort(function (a, b) { return b.trustWeight - a.trustWeight; });
                        limitedMatches = matches.slice(0, limit);
                        _c = 0, limitedMatches_1 = limitedMatches;
                        _d.label = 8;
                    case 8:
                        if (!(_c < limitedMatches_1.length)) return [3 /*break*/, 12];
                        match = limitedMatches_1[_c];
                        matchRecord = {
                            $type$: 'SupplyDemandMatch',
                            demandHash: params.demandHash,
                            supplyHash: match.supplyHash,
                            matchScore: match.matchScore,
                            matchedKeywords: match.matchedKeywords,
                            trustWeight: match.trustWeight,
                            created: Date.now()
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-unversioned-objects.js'); })];
                    case 9:
                        storeUnversionedObject = (_d.sent()).storeUnversionedObject;
                        return [4 /*yield*/, storeUnversionedObject(matchRecord)];
                    case 10:
                        _d.sent();
                        _d.label = 11;
                    case 11:
                        _c++;
                        return [3 /*break*/, 8];
                    case 12:
                        console.log('[FeedForwardManager] Found matches:', {
                            demandHash: params.demandHash,
                            matchCount: limitedMatches.length,
                            totalSupplies: this.supplyCache.size
                        });
                        return [2 /*return*/, {
                                success: true,
                                matches: limitedMatches
                            }];
                    case 13:
                        error_4 = _d.sent();
                        console.error('[FeedForwardManager] Error matching supply/demand:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4 instanceof Error ? error_4.message : 'Unknown error matching supply/demand'
                            }];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get or calculate trust score for a participant
     */
    FeedForwardManager.prototype.getTrustScoreForParticipant = function (participantId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingScore, components, score, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getTrustScore(participantId)];
                    case 1:
                        existingScore = _a.sent();
                        if (existingScore.score !== undefined) {
                            return [2 /*return*/, existingScore];
                        }
                        return [4 /*yield*/, this.calculateTrustComponents(participantId)];
                    case 2:
                        components = _a.sent();
                        score = this.calculateOverallTrustScore(components);
                        // Store the trust score
                        return [4 /*yield*/, this.storeTrustScore(participantId, score, components)];
                    case 3:
                        // Store the trust score
                        _a.sent();
                        return [2 /*return*/, { score: score, components: components }];
                    case 4:
                        error_5 = _a.sent();
                        console.error('[FeedForwardManager] Error getting trust score:', error_5);
                        // Return default trust score for new users
                        return [2 /*return*/, {
                                score: 0.5,
                                components: {
                                    identityVerification: 0.5,
                                    historicalAccuracy: 0.5,
                                    peerEndorsements: 0.0,
                                    activityConsistency: 0.5,
                                    accountAge: 0.0
                                }
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get trust score for a participant
     */
    FeedForwardManager.prototype.getTrustScore = function (participantId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    // Query for existing TrustScore object
                    // For now, return default - later implement storage query
                    return [2 /*return*/, {
                            score: 0.5,
                            components: {
                                identityVerification: 0.5,
                                historicalAccuracy: 0.5,
                                peerEndorsements: 0.0,
                                activityConsistency: 0.5,
                                accountAge: 0.0
                            },
                            history: []
                        }];
                }
                catch (error) {
                    console.error('[FeedForwardManager] Error getting trust score:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Calculate trust score components for a participant
     */
    FeedForwardManager.prototype.calculateTrustComponents = function (participantId) {
        return __awaiter(this, void 0, void 0, function () {
            var components;
            return __generator(this, function (_a) {
                components = {
                    identityVerification: 0.5, // Has verified identity?
                    historicalAccuracy: 0.5, // Past information quality
                    peerEndorsements: 0.0, // Other users' trust
                    activityConsistency: 0.5, // Regular, non-spam behavior
                    accountAge: 0.0 // Time in network
                };
                // TODO: Implement actual trust calculation logic
                // For now, return defaults for new users
                return [2 /*return*/, components];
            });
        });
    };
    /**
     * Calculate overall trust score from components
     */
    FeedForwardManager.prototype.calculateOverallTrustScore = function (components) {
        // Weighted algorithm from research.md
        return (0.3 * components.identityVerification +
            0.2 * components.historicalAccuracy +
            0.2 * components.peerEndorsements +
            0.2 * components.activityConsistency +
            0.1 * components.accountAge);
    };
    /**
     * Store trust score in ONE.core
     */
    FeedForwardManager.prototype.storeTrustScore = function (participantId, score, components) {
        return __awaiter(this, void 0, void 0, function () {
            var trustScore, storeVersionedObject;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        trustScore = {
                            $type$: 'TrustScore',
                            participantId: participantId,
                            score: score,
                            components: components,
                            history: [],
                            lastUpdated: Date.now(),
                            endorsers: []
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 1:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, storeVersionedObject(trustScore)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update trust score for a participant
     */
    FeedForwardManager.prototype.updateTrust = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var currentTrust, newScore, components, recalculatedScore, historyEntry, updatedTrustScore, storeVersionedObject, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.initialize()
                            // Validate parameters
                        ];
                    case 1:
                        _a.sent();
                        // Validate parameters
                        if (!params.participantId) {
                            return [2 /*return*/, { success: false, error: 'Participant ID is required' }];
                        }
                        if (params.adjustment < -0.1 || params.adjustment > 0.1) {
                            return [2 /*return*/, { success: false, error: 'Adjustment must be between -0.1 and 0.1' }];
                        }
                        if (!params.reason) {
                            return [2 /*return*/, { success: false, error: 'Reason is required' }];
                        }
                        return [4 /*yield*/, this.getTrustScore(params.participantId)
                            // Apply adjustment
                        ];
                    case 2:
                        currentTrust = _a.sent();
                        newScore = Math.max(0, Math.min(1, currentTrust.score + params.adjustment));
                        components = __assign({}, currentTrust.components);
                        // For now, apply adjustment to historicalAccuracy
                        components.historicalAccuracy = Math.max(0, Math.min(1, components.historicalAccuracy + params.adjustment));
                        recalculatedScore = this.calculateOverallTrustScore(components);
                        historyEntry = {
                            timestamp: Date.now(),
                            change: params.adjustment,
                            reason: params.reason,
                            evidence: params.evidence
                        };
                        updatedTrustScore = {
                            $type$: 'TrustScore',
                            participantId: params.participantId,
                            score: recalculatedScore,
                            components: components,
                            history: __spreadArray(__spreadArray([], currentTrust.history, true), [historyEntry], false),
                            lastUpdated: Date.now(),
                            endorsers: []
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                    case 3:
                        storeVersionedObject = (_a.sent()).storeVersionedObject;
                        return [4 /*yield*/, storeVersionedObject(updatedTrustScore)];
                    case 4:
                        _a.sent();
                        console.log('[FeedForwardManager] Trust updated:', {
                            participantId: params.participantId,
                            oldScore: currentTrust.score,
                            newScore: recalculatedScore,
                            adjustment: params.adjustment,
                            reason: params.reason
                        });
                        this.emit('trust-updated', {
                            participantId: params.participantId,
                            oldScore: currentTrust.score,
                            newScore: recalculatedScore,
                            components: components
                        });
                        return [2 /*return*/, {
                                success: true,
                                newScore: recalculatedScore,
                                components: components
                            }];
                    case 5:
                        error_6 = _a.sent();
                        console.error('[FeedForwardManager] Error updating trust:', error_6);
                        return [2 /*return*/, {
                                success: false,
                                error: error_6 instanceof Error ? error_6.message : 'Unknown error updating trust'
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Enable or disable sharing for a conversation
     */
    FeedForwardManager.prototype.enableSharing = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var previousState, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.initialize()
                            // Validate parameters
                        ];
                    case 1:
                        _a.sent();
                        // Validate parameters
                        if (!params.conversationId) {
                            return [2 /*return*/, { success: false, error: 'Conversation ID is required' }];
                        }
                        if (typeof params.enabled !== 'boolean') {
                            return [2 /*return*/, { success: false, error: 'Enabled must be a boolean' }];
                        }
                        previousState = false // TODO: Get actual previous state
                        ;
                        console.log('[FeedForwardManager] Sharing setting updated:', {
                            conversationId: params.conversationId,
                            enabled: params.enabled,
                            retroactive: params.retroactive,
                            previousState: previousState
                        });
                        this.emit('sharing-updated', {
                            conversationId: params.conversationId,
                            enabled: params.enabled,
                            previousState: previousState
                        });
                        return [2 /*return*/, {
                                success: true,
                                previousState: previousState
                            }];
                    case 2:
                        error_7 = _a.sent();
                        console.error('[FeedForwardManager] Error updating sharing:', error_7);
                        return [2 /*return*/, {
                                success: false,
                                error: error_7 instanceof Error ? error_7.message : 'Unknown error updating sharing'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get training corpus stream
     */
    FeedForwardManager.prototype.getCorpusStream = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var entries, hasMore, nextCursor, error_8;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.initialize()
                            // Validate parameters
                        ];
                    case 1:
                        _b.sent();
                        // Validate parameters
                        if (params.minQuality && (params.minQuality < 0 || params.minQuality > 1)) {
                            return [2 /*return*/, { success: false, error: 'Min quality must be between 0 and 1' }];
                        }
                        if (params.since && params.since < 0) {
                            return [2 /*return*/, { success: false, error: 'Since timestamp must be non-negative' }];
                        }
                        entries = [];
                        hasMore = false;
                        nextCursor = 'end';
                        console.log('[FeedForwardManager] Corpus stream requested:', {
                            since: params.since,
                            minQuality: params.minQuality,
                            keywords: ((_a = params.keywords) === null || _a === void 0 ? void 0 : _a.length) || 0
                        });
                        return [2 /*return*/, {
                                success: true,
                                entries: entries,
                                hasMore: hasMore,
                                nextCursor: nextCursor
                            }];
                    case 2:
                        error_8 = _b.sent();
                        console.error('[FeedForwardManager] Error getting corpus stream:', error_8);
                        return [2 /*return*/, {
                                success: false,
                                error: error_8 instanceof Error ? error_8.message : 'Unknown error getting corpus stream'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return FeedForwardManager;
}(events_1.EventEmitter));
exports.default = FeedForwardManager;
