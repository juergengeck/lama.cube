"use strict";
/**
 * ProposalRanker Service
 * Ranks proposals by relevance score and limits results
 *
 * Reference: /specs/019-above-the-chat/data-model.md lines 146-176
 * Reference: /specs/019-above-the-chat/research.md lines 60-72
 */
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
exports.ProposalRanker = void 0;
var ProposalRanker = /** @class */ (function () {
    function ProposalRanker() {
    }
    /**
     * Rank proposals by relevance score and limit to maxProposals
     *
     * @param proposals - Array of proposals to rank
     * @param config - Proposal configuration
     * @returns Ranked proposals (descending by relevanceScore)
     */
    ProposalRanker.prototype.rankProposals = function (proposals, config) {
        if (!proposals || proposals.length === 0) {
            return [];
        }
        // Sort by relevanceScore descending (highest relevance first)
        var sorted = __spreadArray([], proposals, true).sort(function (a, b) { return b.relevanceScore - a.relevanceScore; });
        // Limit to maxProposals
        return sorted.slice(0, config.maxProposals);
    };
    /**
     * Calculate relevance score for a single proposal
     * This is a utility method for testing or recalculating scores
     *
     * @param jaccard - Jaccard similarity (0.0-1.0)
     * @param recency - Recency boost (0.0-1.0)
     * @param config - Proposal configuration
     * @returns Relevance score (0.0-1.0)
     */
    ProposalRanker.prototype.calculateRelevanceScore = function (jaccard, recency, config) {
        return jaccard * config.matchWeight + recency * config.recencyWeight;
    };
    /**
     * Calculate recency boost for a past subject
     *
     * @param createdAt - When past subject was created (timestamp)
     * @param recencyWindow - Time window for recency boost (milliseconds)
     * @returns Recency boost (0.0-1.0)
     */
    ProposalRanker.prototype.calculateRecencyBoost = function (createdAt, recencyWindow) {
        var age = Date.now() - createdAt;
        return Math.max(0, 1 - age / recencyWindow);
    };
    return ProposalRanker;
}());
exports.ProposalRanker = ProposalRanker;
