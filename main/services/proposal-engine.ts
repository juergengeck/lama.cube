/**
 * ProposalEngine Service
 * Generates knowledge sharing proposals by matching current subjects with past subjects
 *
 * Reference: /specs/019-above-the-chat/data-model.md lines 146-190
 * Reference: /specs/019-above-the-chat/research.md lines 59-72
 */

import { getObjectByIdHash } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Subject as CoreSubject } from '@lama/core/one-ai/types/Subject.js';
import type { Keyword as CoreKeyword } from '@lama/core/one-ai/types/Keyword.js';

export interface Proposal {
  id: string;
  pastSubject: SHA256IdHash<CoreSubject>;
  currentSubject: SHA256IdHash<CoreSubject>;
  matchedKeywords: string[];
  relevanceScore: number;
  sourceTopicId: string;
  pastSubjectName: string;
  pastSubjectDescription?: string; // LLM-generated description of the subject
  createdAt: number;
  // Memory-related fields
  type?: 'conversation' | 'memory';  // Type of proposal
  memoryIdHash?: string;  // ID hash if this is a memory proposal
  memoryContent?: string;  // Preview of memory content
}

export interface ProposalConfig {
  userEmail: string;
  matchWeight: number;
  recencyWeight: number;
  recencyWindow: number;
  minJaccard: number;
  maxProposals: number;
  updatedAt: number;
}

// Re-export Subject type from core for compatibility
export type Subject = CoreSubject;

export class ProposalEngine {
  private topicAnalysisModel: unknown;
  private channelManager: unknown;
  private memoryPlan?: unknown;  // Optional memory plan for direct memory access

  constructor(topicAnalysisModel: unknown, channelManager: unknown, memoryPlan?: unknown) {
    this.topicAnalysisModel = topicAnalysisModel;
    this.channelManager = channelManager;
    this.memoryPlan = memoryPlan;
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
  async getProposalsForTopic(
    topicId: string,
    currentSubjects: SHA256IdHash<CoreSubject>[],
    config: ProposalConfig,
    allSubjects?: CoreSubject[]
  ): Promise<Proposal[]> {
    if (!currentSubjects || currentSubjects.length === 0) {
      return [];
    }

    // Fetch current subjects from ONE.core
    const currentSubjectObjects: CoreSubject[] = [];
    for (const subjectIdHash of currentSubjects) {
      try {
        const result = await getObjectByIdHash(subjectIdHash);
        if (result && result.obj) {
          currentSubjectObjects.push(result.obj as CoreSubject);
        }
      } catch (error) {
        console.error(`[ProposalEngine] Error fetching subject ${subjectIdHash}:`, error);
      }
    }

    if (currentSubjectObjects.length === 0) {
      return [];
    }

    // Fetch or use provided past subjects
    const pastSubjects = allSubjects || (await this.fetchAllSubjects());

    // Filter out subjects from same topic
    const eligiblePastSubjects = pastSubjects.filter((s) => s.topic !== topicId);

    // Generate proposals for each current subject
    const proposals: Proposal[] = [];

    console.log(`[ProposalEngine] Starting with ${currentSubjectObjects.length} current subjects, ${eligiblePastSubjects.length} eligible past subjects, minJaccard: ${config.minJaccard}`);

    for (const currentSubject of currentSubjectObjects) {
      console.log(`[ProposalEngine] Current subject "${currentSubject.id}" has ${currentSubject.keywords?.length || 0} keywords`);

      for (const pastSubject of eligiblePastSubjects) {
        console.log(`[ProposalEngine] Comparing with past subject "${pastSubject.id}" from topic "${pastSubject.topic}" (${pastSubject.keywords?.length || 0} keywords)`);

        // Resolve keyword terms from ID hashes for both subjects
        const currentKeywordTerms = await this.resolveKeywordTerms(currentSubject.keywords as SHA256IdHash<CoreKeyword>[]);
        const pastKeywordTerms = await this.resolveKeywordTerms(pastSubject.keywords as SHA256IdHash<CoreKeyword>[]);

        console.log(`[ProposalEngine] Keyword terms - Current: [${currentKeywordTerms.join(', ')}], Past: [${pastKeywordTerms.join(', ')}]`);

        // Calculate Jaccard similarity on TERMS (not hashes)
        const jaccard = this.calculateJaccardFromTerms(
          currentKeywordTerms,
          pastKeywordTerms
        );

        console.log(`[ProposalEngine] Jaccard: ${jaccard.toFixed(3)} (threshold: ${config.minJaccard}) - ${jaccard >= config.minJaccard ? 'MATCH' : 'skip'}`);

        // Skip if below threshold
        if (jaccard < config.minJaccard) {
          continue;
        }

        // Calculate recency boost
        const pastCreatedAt = pastSubject.timeRanges?.[0]?.start || 0;
        const age = Date.now() - pastCreatedAt;
        const recencyBoost = Math.max(0, 1 - age / config.recencyWindow);

        // Calculate combined relevance score
        const relevanceScore =
          jaccard * config.matchWeight + recencyBoost * config.recencyWeight;

        // Get matched keywords (intersection of terms)
        const matchedKeywords = this.getMatchedKeywordTerms(
          currentKeywordTerms,
          pastKeywordTerms
        );

        // Calculate current and past subject ID hashes
        const currentSubjectIdHash = await calculateIdHashOfObj(currentSubject as any);
        const pastSubjectIdHash = await calculateIdHashOfObj(pastSubject as any);

        const proposal: Proposal = {
          id: `prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          pastSubject: pastSubjectIdHash,
          currentSubject: currentSubjectIdHash,
          matchedKeywords,
          relevanceScore,
          sourceTopicId: pastSubject.topic,
          pastSubjectName: pastSubject.id || 'Unknown Subject',
          pastSubjectDescription: pastSubject.description, // Include LLM-generated description
          createdAt: pastCreatedAt,
        };

        proposals.push(proposal);
        console.log(`[ProposalEngine] ✅ Generated proposal: "${pastSubject.id}" -> "${currentSubject.id}" (score: ${proposal.relevanceScore.toFixed(3)}, keywords: ${matchedKeywords.length})`);
      }
    }

    console.log(`[ProposalEngine] Proposal generation complete: ${proposals.length} proposals generated`);

    return proposals;
  }

  /**
   * Resolve keyword ID hashes to actual keyword terms
   */
  private async resolveKeywordTerms(keywordIdHashes: SHA256IdHash<CoreKeyword>[]): Promise<string[]> {
    const terms: string[] = [];
    for (const idHash of keywordIdHashes || []) {
      try {
        const result = await getObjectByIdHash(idHash);
        if (result && result.obj) {
          const keyword = result.obj as CoreKeyword;
          if (keyword.term) {
            terms.push(keyword.term.toLowerCase().trim());
          }
        }
      } catch (error: any) {
        // Skip missing keywords silently (can happen after storage clear)
        if (error?.code !== 'SB-READ2' || error?.type !== 'vheads') {
          console.error(`[ProposalEngine] Error resolving keyword ${idHash}:`, error);
        }
      }
    }
    return terms;
  }

  /**
   * Calculate Jaccard similarity between two sets of keyword TERMS (strings)
   * Formula: |intersection| / |union|
   */
  private calculateJaccardFromTerms(
    termsA: string[],
    termsB: string[]
  ): number {
    if (termsA.length === 0 || termsB.length === 0) {
      return 0;
    }

    const setA = new Set(termsA);
    const setB = new Set(termsB);

    // Calculate intersection
    const intersection = new Set([...setA].filter((k) => setB.has(k)));

    // Calculate union
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Get matched keyword terms (intersection of two term sets)
   */
  private getMatchedKeywordTerms(
    termsA: string[],
    termsB: string[]
  ): string[] {
    const setA = new Set(termsA);
    const setB = new Set(termsB);

    // Return intersection
    return [...setA].filter((k) => setB.has(k));
  }

  /**
   * Calculate Jaccard similarity between two keyword ID hash sets (DEPRECATED - use calculateJaccardFromTerms)
   * Formula: |intersection| / |union|
   */
  private calculateJaccard(
    keywordsA: SHA256IdHash<CoreKeyword>[],
    keywordsB: SHA256IdHash<CoreKeyword>[]
  ): number {
    if (keywordsA.length === 0 || keywordsB.length === 0) {
      return 0;
    }

    const setA = new Set(keywordsA);
    const setB = new Set(keywordsB);

    // Calculate intersection
    const intersection = new Set([...setA].filter((k) => setB.has(k)));

    // Calculate union
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Get matched keywords (intersection of two keyword sets)
   * Returns keyword terms as strings
   */
  private async getMatchedKeywords(
    keywordsA: SHA256IdHash<CoreKeyword>[],
    keywordsB: SHA256IdHash<CoreKeyword>[]
  ): Promise<string[]> {
    const setA = new Set(keywordsA);
    const setB = new Set(keywordsB);

    // Get intersection of ID hashes
    const intersection = [...setA].filter((k) => setB.has(k));

    // Retrieve keyword terms from ONE.core
    const terms: string[] = [];
    for (const keywordIdHash of intersection) {
      try {
        const result = await getObjectByIdHash(keywordIdHash);
        if (result && result.obj) {
          const keyword = result.obj as CoreKeyword;
          if (keyword.term) {
            terms.push(keyword.term);
          }
        }
      } catch (error) {
        console.error(`[ProposalEngine] Error fetching keyword ${keywordIdHash}:`, error);
      }
    }

    return terms;
  }

  /**
   * Get proposals based on user's current input text (real-time analysis)
   * Extracts keywords from input and matches against past subjects
   *
   * @param topicId - Current topic ID
   * @param inputText - Text user is currently typing
   * @param config - Proposal configuration
   * @returns Array of proposals matching the input text
   */
  async getProposalsForInput(
    topicId: string,
    inputText: string,
    config: ProposalConfig
  ): Promise<Proposal[]> {
    if (!inputText || inputText.trim().length < 3) {
      return []; // Require at least 3 characters
    }

    // Extract keywords from input text (simple tokenization)
    const inputKeywords = this.extractKeywordsFromText(inputText);

    if (inputKeywords.length === 0) {
      return [];
    }

    console.log(`[ProposalEngine] Input analysis: "${inputText}" -> keywords: [${inputKeywords.join(', ')}]`);

    // Fetch all subjects (excluding current topic)
    const allSubjects = await this.fetchAllSubjects();
    const eligiblePastSubjects = allSubjects.filter((s) => s.topic !== topicId);

    // Match input keywords against past subjects
    const proposals: Proposal[] = [];

    for (const pastSubject of eligiblePastSubjects) {
      // Resolve keyword terms for past subject
      const pastKeywordTerms = await this.resolveKeywordTerms(pastSubject.keywords as SHA256IdHash<CoreKeyword>[]);

      // Calculate Jaccard similarity between input keywords and past subject keywords
      const jaccard = this.calculateJaccardFromTerms(inputKeywords, pastKeywordTerms);

      if (jaccard < config.minJaccard) {
        continue;
      }

      // Calculate recency boost
      const pastCreatedAt = pastSubject.timeRanges?.[0]?.start || 0;
      const age = Date.now() - pastCreatedAt;
      const recencyBoost = Math.max(0, 1 - age / config.recencyWindow);

      // Calculate combined relevance score
      const relevanceScore = jaccard * config.matchWeight + recencyBoost * config.recencyWeight;

      // Get matched keywords
      const matchedKeywords = this.getMatchedKeywordTerms(inputKeywords, pastKeywordTerms);

      // Calculate past subject ID hash
      const pastSubjectIdHash = await calculateIdHashOfObj(pastSubject as any);

      const proposal: Proposal = {
        id: `input-prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        pastSubject: pastSubjectIdHash,
        currentSubject: pastSubjectIdHash, // Use same hash for input-based proposals
        matchedKeywords,
        relevanceScore,
        sourceTopicId: pastSubject.topic,
        pastSubjectName: pastSubject.id || 'Unknown Subject',
        pastSubjectDescription: pastSubject.description, // Include LLM-generated description
        createdAt: pastCreatedAt,
      };

      proposals.push(proposal);
      console.log(`[ProposalEngine] Input match: "${pastSubject.id}" (score: ${relevanceScore.toFixed(3)}, keywords: ${matchedKeywords.join(', ')})`);
    }

    // Sort by relevance and limit to maxProposals
    const sortedProposals = proposals
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, config.maxProposals);

    console.log(`[ProposalEngine] Input proposals: ${sortedProposals.length} matches for "${inputText}"`);
    return sortedProposals;
  }

  /**
   * Extract keywords from raw text input
   * Simple tokenization: lowercase, split on whitespace/punctuation, remove stopwords
   */
  private extractKeywordsFromText(text: string): string[] {
    // Common English stopwords to filter out
    const stopwords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'i', 'you', 'we', 'they', 'this',
      'what', 'when', 'where', 'who', 'how', 'can', 'could', 'would',
      'should', 'do', 'does', 'did', 'have', 'had', 'been', 'am'
    ]);

    // Tokenize: lowercase, split on non-word characters, filter
    const tokens = text
      .toLowerCase()
      .split(/[^\w]+/)
      .filter((token) => {
        return (
          token.length >= 3 && // Minimum 3 characters
          !stopwords.has(token) && // Not a stopword
          !/^\d+$/.test(token) // Not a pure number
        );
      });

    // Return unique tokens
    return [...new Set(tokens)];
  }

  /**
   * Fetch all subjects from ONE.core by querying all topics
   * INCLUDES memory subjects from the "lama" topic
   */
  private async fetchAllSubjects(): Promise<CoreSubject[]> {
    try {
      if (!this.channelManager || !this.topicAnalysisModel) {
        console.warn('[ProposalEngine] Missing dependencies for fetching subjects');
        return [];
      }

      // Get all channels (each channel ID is a topic ID)
      const channels = (await (this.channelManager as { channels(): Promise<unknown[]> }).channels()) as Array<{ id?: string }>;

      // Get unique topic IDs
      const topicIds = new Set<string>();
      for (const channel of channels) {
        if (channel.id) {
          topicIds.add(channel.id);
        }
      }

      // CRITICAL: Explicitly include "lama" topic for memory subjects
      // Even if no channel exists, memories may have subjects/keywords
      topicIds.add('lama');

      console.log(`[ProposalEngine] Fetching subjects from ${topicIds.size} topics (including memory topic "lama")`);

      // Fetch subjects from each topic
      const allSubjects: CoreSubject[] = [];
      for (const topicId of topicIds) {
        try {
          const subjects = (await (this.topicAnalysisModel as { getSubjects(topicId: string): Promise<CoreSubject[]> }).getSubjects(topicId));
          if (subjects && subjects.length > 0) {
            allSubjects.push(...subjects);
            console.log(`[ProposalEngine] Found ${subjects.length} subjects in topic ${topicId}${topicId === 'lama' ? ' (MEMORY)' : ''}`);
          }
        } catch (error) {
          // Don't log error for "lama" topic if it has no subjects yet
          if (topicId !== 'lama') {
            console.error(`[ProposalEngine] Error fetching subjects for topic ${topicId}:`, error);
          }
        }
      }

      console.log(`[ProposalEngine] Total subjects fetched: ${allSubjects.length}`);
      return allSubjects;
    } catch (error) {
      console.error('[ProposalEngine] Error in fetchAllSubjects:', error);
      return [];
    }
  }

  /**
   * Get memory-based proposals by matching keywords with stored memories
   *
   * @param currentKeywords - Keywords from current context
   * @param config - Proposal configuration
   * @returns Array of memory proposals
   */
  async getMemoryProposals(
    currentKeywords: string[],
    config: ProposalConfig
  ): Promise<Proposal[]> {
    if (!this.memoryPlan || !currentKeywords || currentKeywords.length === 0) {
      return [];
    }

    try {
      // Get memory list from plan
      const memoryList = await (this.memoryPlan as any).listSubjects();

      if (!memoryList || memoryList.length === 0) {
        console.log('[ProposalEngine] No memories found');
        return [];
      }

      console.log(`[ProposalEngine] Searching ${memoryList.length} memories for keyword matches`);

      const memoryProposals: Proposal[] = [];

      for (const memoryIdHash of memoryList) {
        try {
          // Fetch memory details
          const memory = await (this.memoryPlan as any).getSubject(memoryIdHash);

          if (!memory || !memory.metadata) {
            continue;
          }

          // Extract keywords from memory metadata
          const memoryKeywords = this.extractMemoryKeywords(memory);

          if (memoryKeywords.length === 0) {
            continue;
          }

          // Calculate keyword overlap (Jaccard similarity)
          const matchedKeywords = currentKeywords.filter(k =>
            memoryKeywords.some(mk => mk.toLowerCase() === k.toLowerCase())
          );

          if (matchedKeywords.length === 0) {
            continue;
          }

          const union = new Set([...currentKeywords, ...memoryKeywords]);
          const jaccard = matchedKeywords.length / union.size;

          // Check against minimum threshold
          if (jaccard < config.minJaccard) {
            continue;
          }

          // Calculate relevance score
          const matchScore = jaccard * config.matchWeight;

          // Recency boost based on memory creation time
          const createdAt = memory.created || Date.now();
          const ageMs = Date.now() - createdAt;
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          const recencyBoost = ageDays < config.recencyWindow
            ? (1 - ageDays / config.recencyWindow) * config.recencyWeight
            : 0;

          const relevanceScore = matchScore + recencyBoost;

          // Create a synthetic subject ID hash for the memory
          const syntheticSubjectId = `memory:${memory.id}` as SHA256IdHash<CoreSubject>;

          // Extract memory content preview (first 200 chars)
          const memoryContent = memory.description
            ? memory.description.substring(0, 200)
            : memory.name.substring(0, 200);

          const proposal: Proposal = {
            id: `memory-prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            pastSubject: syntheticSubjectId,
            currentSubject: syntheticSubjectId,
            matchedKeywords,
            relevanceScore,
            sourceTopicId: 'lama',  // Memories come from lama topic
            pastSubjectName: memory.name,
            pastSubjectDescription: memory.description,
            createdAt,
            type: 'memory',
            memoryIdHash: String(memoryIdHash),
            memoryContent
          };

          memoryProposals.push(proposal);
          console.log(`[ProposalEngine] Memory match: "${memory.name}" (score: ${relevanceScore.toFixed(3)}, keywords: ${matchedKeywords.join(', ')})`);

        } catch (error) {
          console.error(`[ProposalEngine] Error processing memory ${memoryIdHash}:`, error);
        }
      }

      // Sort by relevance
      const sortedProposals = memoryProposals
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, Math.floor(config.maxProposals / 2)); // Reserve half the slots for memories

      console.log(`[ProposalEngine] Found ${sortedProposals.length} memory proposals`);
      return sortedProposals;

    } catch (error) {
      console.error('[ProposalEngine] Error fetching memory proposals:', error);
      return [];
    }
  }

  /**
   * Extract keywords from memory metadata
   * Looks for keywords in metadata or parses them from description
   */
  private extractMemoryKeywords(memory: any): string[] {
    const keywords: string[] = [];

    // Check if metadata has keywords field
    if (memory.metadata) {
      const metadataMap = memory.metadata instanceof Map
        ? memory.metadata
        : new Map(Object.entries(memory.metadata));

      const keywordsValue = metadataMap.get('keywords');
      if (keywordsValue) {
        // Parse keywords (could be comma-separated string or array)
        if (typeof keywordsValue === 'string') {
          keywords.push(...keywordsValue.split(',').map(k => k.trim().toLowerCase()));
        } else if (Array.isArray(keywordsValue)) {
          keywords.push(...keywordsValue.map(k => String(k).toLowerCase()));
        }
      }

      // Also check for tags
      const tagsValue = metadataMap.get('tags');
      if (tagsValue) {
        if (typeof tagsValue === 'string') {
          keywords.push(...tagsValue.split(',').map(k => k.trim().toLowerCase()));
        } else if (Array.isArray(tagsValue)) {
          keywords.push(...tagsValue.map(k => String(k).toLowerCase()));
        }
      }
    }

    // If no explicit keywords, extract from memory name (Subject-based memories)
    if (keywords.length === 0 && memory.name) {
      // Memory names like "photo+iphone+morning" become keywords
      const nameKeywords = memory.name.split(/[+\-_\s]+/).filter(k => k.length >= 3);
      keywords.push(...nameKeywords.map(k => k.toLowerCase()));
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Get combined proposals from both conversations and memories
   *
   * @param topicId - Current topic ID
   * @param currentSubjects - Current subject ID hashes
   * @param config - Proposal configuration
   * @returns Combined array of conversation and memory proposals
   */
  async getCombinedProposals(
    topicId: string,
    currentSubjects: SHA256IdHash<CoreSubject>[],
    config: ProposalConfig
  ): Promise<Proposal[]> {
    // Fetch conversation proposals (existing logic)
    const conversationProposals = await this.getProposalsForTopic(
      topicId,
      currentSubjects,
      config
    );

    // Mark conversation proposals with type
    conversationProposals.forEach(p => p.type = 'conversation');

    // Extract keywords from current subjects for memory search
    const currentSubjectObjects: CoreSubject[] = [];
    for (const subjectIdHash of currentSubjects) {
      try {
        const result = await getObjectByIdHash(subjectIdHash);
        if (result && result.obj) {
          currentSubjectObjects.push(result.obj as CoreSubject);
        }
      } catch (error) {
        console.error(`[ProposalEngine] Error fetching subject ${subjectIdHash}:`, error);
      }
    }

    // Collect all keywords from current subjects
    const allKeywords = new Set<string>();
    for (const subject of currentSubjectObjects) {
      if (subject.keywords) {
        subject.keywords.forEach(k => allKeywords.add(k.toLowerCase()));
      }
    }

    // Fetch memory proposals
    const memoryProposals = await this.getMemoryProposals(
      Array.from(allKeywords),
      config
    );

    // Combine and sort by relevance
    const combinedProposals = [...conversationProposals, ...memoryProposals]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, config.maxProposals);

    console.log(`[ProposalEngine] Combined proposals: ${conversationProposals.length} conversations + ${memoryProposals.length} memories = ${combinedProposals.length} total`);

    return combinedProposals;
  }
}
