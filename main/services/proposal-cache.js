"use strict";
/**
 * ProposalCache Class
 * LRU cache for proposal results with TTL
 *
 * Reference: /specs/019-above-the-chat/research.md lines 88-157
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalCache = void 0;
var ProposalCache = /** @class */ (function () {
    /**
     * Create a new ProposalCache
     *
     * @param maxSize - Maximum number of entries (default: 50)
     * @param ttl - Time-to-live in milliseconds (default: 60000 = 60 seconds)
     */
    function ProposalCache(maxSize, ttl) {
        if (maxSize === void 0) { maxSize = 50; }
        if (ttl === void 0) { ttl = 60000; }
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }
    /**
     * Get cached proposals for a topic and current subjects
     *
     * @param topicId - Topic ID
     * @param currentSubjects - Array of current subject ID hashes
     * @returns Cached proposals or null if not found/expired
     */
    ProposalCache.prototype.get = function (topicId, currentSubjects) {
        var key = this.cacheKey(topicId, currentSubjects);
        var entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.proposals;
    };
    /**
     * Store proposals in cache
     *
     * @param topicId - Topic ID
     * @param currentSubjects - Array of current subject ID hashes
     * @param proposals - Proposals to cache
     */
    ProposalCache.prototype.set = function (topicId, currentSubjects, proposals) {
        var key = this.cacheKey(topicId, currentSubjects);
        // LRU eviction: Remove oldest entry if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            var firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            proposals: proposals,
            timestamp: Date.now(),
        });
    };
    /**
     * Invalidate all cache entries for a specific topic
     *
     * @param topicId - Topic ID to invalidate
     */
    ProposalCache.prototype.invalidate = function (topicId) {
        for (var _i = 0, _a = this.cache.keys(); _i < _a.length; _i++) {
            var key = _a[_i];
            if (key.startsWith(topicId)) {
                this.cache.delete(key);
            }
        }
    };
    /**
     * Clear all cache entries
     */
    ProposalCache.prototype.clear = function () {
        this.cache.clear();
    };
    /**
     * Get cache size
     */
    ProposalCache.prototype.size = function () {
        return this.cache.size;
    };
    /**
     * Generate cache key from topic ID and current subjects
     *
     * @param topicId - Topic ID
     * @param currentSubjects - Array of current subject ID hashes
     * @returns Cache key
     */
    ProposalCache.prototype.cacheKey = function (topicId, currentSubjects) {
        // Sort subject IDs for consistent keys
        var subjectIds = currentSubjects.map(function (s) { return String(s); }).sort();
        return "".concat(topicId, ":").concat(subjectIds.join(','));
    };
    return ProposalCache;
}());
exports.ProposalCache = ProposalCache;
