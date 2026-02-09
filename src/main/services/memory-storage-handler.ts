/**
 * Memory Storage Handler
 * Implements the complete memory storage flow:
 * 1. Create Memory object (versioned)
 * 2. Analyze with LLM → extract keywords, create Subject and Keyword ONE.core objects
 * 3. Create Supply → what capability this memory offers
 * 4. Create Demand → what constraints it satisfies
 * 5. Create Assembly → wraps Memory + Supply + Demand
 * 6. implode(Memory) → write to memoryDirectory/{filename}.html
 * 7. Post to "lama" journal → message with Assembly as attachment
 */

import type { SHA256IdHash, SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { TopicAnalysisPlan } from '@refinio/lama.core/plans/TopicAnalysisPlan.js';
import type { Supply, Demand, Assembly } from '@refinio/assembly.core';
import type { Memory, Fact, Entity, Relationship } from '@refinio/memory.core/types/Memory';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { wrapMessageWithMicrodata } from './html-export/implode-wrapper.js';
import { generateCompleteHTML } from './html-export/html-template.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StoreMemoryParams {
    /** Title for the memory (becomes part of ID) */
    title: string;
    /** Main prose content */
    content: string;
    /** Optional summary (auto-generated if not provided) */
    summary?: string;
    /** Source subject IDs this memory is constructed from */
    sourceSubjects?: string[];
    /** Related subject IDs (semantically linked) */
    relatedSubjects?: string[];
    /** Pre-computed embedding (optional - can be computed later, uses standard 768-dim model) */
    embedding?: number[];
    // Legacy fields for backwards compatibility
    memoryType?: string;
    category?: string;
    importance?: number;
    tags?: string[];
    topicRef?: string;
}

export interface StoreMemoryResult {
    success: boolean;
    memoryHash?: SHA256Hash<Memory>;
    assemblyHash?: SHA256Hash<Assembly>;
    journalMessageHash?: SHA256Hash<any>;
    filename?: string;
    keywords?: string[];
    subjects?: string[];
    keywordHashes?: SHA256Hash<any>[];
    subjectHashes?: SHA256Hash<any>[];
    error?: string;
}

/**
 * Generates a human-readable filename for a memory
 */
function generateMemoryFilename(content: string, timestamp: Date): string {
    // Extract first few words for filename
    const words = content.split(/\s+/).slice(0, 5).join('-');
    // Sanitize for filesystem
    const sanitized = words
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);

    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    return `${dateStr}-${sanitized}.html`;
}

/**
 * Memory Storage Handler
 */
export class MemoryStorageHandler {
    constructor(
        private nodeOneCore: any,  // NodeOneCoreInstance with topicModel, storeVersionedObject, etc.
        private topicAnalysisHandler: TopicAnalysisPlan,
        private memoryDirectory: string
    ) {}

    /**
     * Emit scan status update to UI
     */
    private emitScanStatus(scanning: boolean, progress?: string): void {
        try {
            const { BrowserWindow } = require('electron');
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                windows[0].webContents.send('memory:scanStatus', { scanning, progress });
            }
        } catch (error) {
            // Silently fail if Electron not available (e.g., in tests)
        }
    }

    /**
     * Scan memory directory and journal for existing memories that haven't been indexed
     */
    async scanAndIndexExistingMemories(): Promise<{
        scanned: number;
        indexed: number;
        journalScanned: number;
        journalIndexed: number;
        journalCreated: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let scanned = 0;
        let indexed = 0;
        let journalScanned = 0;
        let journalIndexed = 0;
        let journalCreated = 0;

        try {
            this.emitScanStatus(true, 'Starting memory scan...');

            // 1. Scan memory directory for HTML files
            await fs.mkdir(this.memoryDirectory, { recursive: true });

            const files = await fs.readdir(this.memoryDirectory);
            const htmlFiles = files.filter(f => f.endsWith('.html'));

            console.log(`[MemoryStorage] Scanning ${htmlFiles.length} memory files...`);
            this.emitScanStatus(true, `Scanning ${htmlFiles.length} memory files...`);

            for (const filename of htmlFiles) {
                scanned++;
                this.emitScanStatus(true, `Scanning file ${scanned}/${htmlFiles.length}...`);

                try {
                    const filePath = path.join(this.memoryDirectory, filename);
                    const htmlContent = await fs.readFile(filePath, 'utf-8');

                    // Extract memory content from HTML
                    const content = this.extractContentFromHTML(htmlContent);

                    if (!content) {
                        console.warn(`[MemoryStorage] Could not extract content from ${filename}`);
                        continue;
                    }

                    // Check if this memory has already been analyzed
                    const hasBeenAnalyzed = await this.checkIfMemoryAnalyzed(content);

                    if (!hasBeenAnalyzed) {
                        console.log(`[MemoryStorage] Indexing ${filename}...`);
                        this.emitScanStatus(true, `Indexing ${filename}...`);

                        // Analyze and create Subject/Keyword objects
                        const analysis = await this.analyzeMemoryContent(content);
                        indexed++;

                        // Check if journal entry exists, create if not
                        const hasJournalEntry = await this.checkJournalEntryExists(content);
                        if (!hasJournalEntry) {
                            await this.createJournalEntry(content, analysis.keywords, analysis.subjects);
                            journalCreated++;
                        }

                        console.log(`[MemoryStorage] Indexed ${filename}`);
                    }
                } catch (error: any) {
                    console.error(`[MemoryStorage] Error processing ${filename}:`, error);
                    errors.push(`${filename}: ${error.message}`);
                }
            }

            // 2. Scan journal topic for memory messages with Assembly attachments
            try {
                console.log(`[MemoryStorage] Scanning journal for memory references...`);
                this.emitScanStatus(true, 'Scanning journal...');

                const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom('lama');
                const messages = await topicRoom.retrieveAllMessages();

                for (const message of messages) {
                    if (!message.attachments || message.attachments.length === 0) {
                        continue;
                    }

                    journalScanned++;
                    this.emitScanStatus(true, `Scanning journal message ${journalScanned}...`);

                    try {
                        // Check if attachment is an Assembly (memory reference)
                        for (const attachmentHash of message.attachments) {
                            const assembly = await this.nodeOneCore.loadObject(attachmentHash);

                            if (assembly && assembly.$type$ === 'Assembly') {
                                // Extract memory content from message text
                                const messageText = message.text || '';

                                // Check if starts with "Memory stored:" prefix
                                if (messageText.startsWith('Memory stored:')) {
                                    const contentMatch = messageText.match(/^Memory stored: (.+?)(?:\n\n|$)/s);

                                    if (contentMatch) {
                                        const content = contentMatch[1].trim();

                                        // Check if already analyzed
                                        const hasBeenAnalyzed = await this.checkIfMemoryAnalyzed(content);

                                        if (!hasBeenAnalyzed && content.length > 0) {
                                            console.log(`[MemoryStorage] Indexing journal memory: ${content.substring(0, 50)}...`);

                                            // Analyze and create Subject/Keyword objects
                                            await this.analyzeMemoryContent(content);
                                            journalIndexed++;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (error: any) {
                        console.error(`[MemoryStorage] Error processing journal message:`, error);
                        errors.push(`journal message: ${error.message}`);
                    }
                }

                console.log(`[MemoryStorage] Journal scan complete: ${journalScanned} messages, ${journalIndexed} indexed`);
            } catch (error: any) {
                console.error('[MemoryStorage] Error scanning journal:', error);
                errors.push(`journal scan: ${error.message}`);
            }

            console.log(`[MemoryStorage] Total scan complete: ${scanned} files + ${journalScanned} journal messages, ${indexed + journalIndexed} total indexed, ${journalCreated} journal entries created`);

            // Emit completion status
            this.emitScanStatus(false, '');

            return { scanned, indexed, journalScanned, journalIndexed, journalCreated, errors };
        } catch (error: any) {
            console.error('[MemoryStorage] Error scanning memory directory:', error);
            this.emitScanStatus(false, '');
            return { scanned, indexed, journalScanned, journalIndexed, journalCreated, errors: [error.message] };
        }
    }

    /**
     * Extract text content from memory HTML file
     */
    private extractContentFromHTML(html: string): string | null {
        // Simple extraction - look for microdata content
        // The memory content is stored in the message text within microdata

        // Try to extract from <div itemtype="https://schema.org/Message">
        const messageMatch = html.match(/<div[^>]*itemtype="https?:\/\/schema\.org\/Message"[^>]*>([\s\S]*?)<\/div>/i);
        if (messageMatch) {
            // Extract text content from the message div
            const messageDiv = messageMatch[1];

            // Look for itemprop="text" content
            const textMatch = messageDiv.match(/<[^>]*itemprop="text"[^>]*>([\s\S]*?)<\/[^>]*>/i);
            if (textMatch) {
                // Strip HTML tags and decode entities
                return textMatch[1]
                    .replace(/<[^>]+>/g, '')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .trim();
            }
        }

        // Fallback: extract all text content
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return textContent.length > 0 ? textContent : null;
    }

    /**
     * Check if a memory has already been analyzed (has Subject/Keyword objects)
     */
    private async checkIfMemoryAnalyzed(content: string): Promise<boolean> {
        // Simple heuristic: extract a few words and see if we have Subject objects with those keywords
        const words = content
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3)
            .slice(0, 3);

        if (words.length === 0) return true; // No content to analyze

        // Check if we have any Subject with these keywords
        const subjectId = words.sort().join('+');

        try {
            const existingSubjects = await this.nodeOneCore.loadObjectByIdHash('Subject', subjectId);
            return existingSubjects && existingSubjects.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Check if a journal entry exists for this memory content
     */
    private async checkJournalEntryExists(content: string): Promise<boolean> {
        try {
            const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom('lama');
            const messages = await topicRoom.retrieveAllMessages();

            // Check if any message contains this memory content
            for (const message of messages) {
                const messageText = message.text || '';
                if (messageText.includes(content)) {
                    return true;
                }
            }

            return false;
        } catch {
            return false;
        }
    }

    /**
     * Create a journal entry for a memory
     */
    private async createJournalEntry(
        content: string,
        keywords: string[],
        subjects: string[]
    ): Promise<void> {
        try {
            const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom('lama');

            // Format journal message (same as postToJournal)
            const journalContent = `Memory stored: ${content}\n\nKeywords: ${keywords.join(', ')}\nSubjects: ${subjects.join(', ')}`;

            // Post to journal without attachment (we don't have the Assembly hash)
            await topicRoom.postText(journalContent);

            console.log('[MemoryStorage] Created journal entry for memory');
        } catch (error: any) {
            console.error('[MemoryStorage] Failed to create journal entry:', error);
            throw error;
        }
    }

    /**
     * Store a memory with full Assembly.core integration
     */
    async storeMemory(params: StoreMemoryParams): Promise<StoreMemoryResult> {
        try {
            const {
                title,
                content,
                summary,
                sourceSubjects = [],
                relatedSubjects,
                embedding
            } = params;

            if (!this.nodeOneCore.initialized || !this.nodeOneCore.ownerId) {
                throw new Error('ONE.core not initialized');
            }

            const timestamp = new Date();
            const filename = generateMemoryFilename(title || content, timestamp);
            const authorId = this.nodeOneCore.ownerId;

            // Step 1: Create Memory object (versioned) using memory.core type
            console.log('[MemoryStorage] Creating Memory object...');
            const memory: Memory = {
                $type$: 'Memory',
                title: title || content.substring(0, 100),
                author: authorId,
                facts: [],  // Will be populated by analysis
                entities: [],  // Will be populated by analysis
                relationships: [],  // Will be populated by analysis
                prose: content,
                summary,
                sourceSubjects,
                relatedSubjects,
                embedding
            };

            const memoryResult = await storeVersionedObject(memory);
            const memoryHash = memoryResult.hash;
            console.log('[MemoryStorage] Memory stored:', memoryHash);

            // Step 2: Analyze with LLM → extract keywords, subjects, summary
            console.log('[MemoryStorage] Analyzing memory content...');
            const analysis = await this.analyzeMemoryContent(content);
            console.log('[MemoryStorage] Analysis complete:', {
                keywords: analysis.keywords.length,
                subjects: analysis.subjects.length
            });

            // Supply/Demand/Assembly creation temporarily disabled - being migrated to new Assembly system
            // Step 3: Create Supply → what capability this memory offers
            // console.log('[MemoryStorage] Creating Supply...');
            // const supply = await this.createSupply(
            //     analysis.keywords,
            //     authorId,
            //     topicRef || 'lama',
            //     analysis.summary
            // );

            // Step 4: Create Demand → what constraints it satisfies
            // console.log('[MemoryStorage] Creating Demand...');
            // const demand = await this.createDemand(
            //     analysis.keywords,
            //     authorId,
            //     content,
            //     topicRef
            // );

            // Step 5: Create Assembly → wraps Memory + Supply + Demand
            // console.log('[MemoryStorage] Creating Assembly...');
            // Create a placeholder plan ID for memory storage (Assembly requires aiAssistantCall)
            // const memoryPlanId = await this.nodeOneCore.calculateIdHashOfObj({
            //     $type$: 'AssemblyPlan',
            //     id: 'memory-storage-plan',
            //     name: 'Memory Storage Plan'
            // }) as SHA256IdHash<any>;

            // Assembly creation temporarily disabled - being migrated to new Assembly system
            // const assembly: Assembly = {
            //     $type$: 'CubeAssembly',
            //     aiAssistantCall: memoryPlanId,
            //     property: 'memory',
            //     supply: supply.$idHash$!,
            //     demand: demand.$idHash$!,
            //     instanceVersion: String(memoryHash), // Version hash of Memory
            //     created: Date.now()
            // };

            // const assemblyHash = await this.nodeOneCore.storeUnversionedObject(assembly);
            // console.log('[MemoryStorage] Assembly stored:', assemblyHash);
            const assemblyHash = null; // Placeholder

            // Step 6: implode(Memory) → write to memoryDirectory/{filename}.md
            console.log('[MemoryStorage] Writing memory file...');
            await this.writeMemoryFile(memoryHash, filename);

            // Step 7: Post to "lama" journal → message with Assembly as attachment
            console.log('[MemoryStorage] Posting to journal...');
            const journalMessage = await this.postToJournal(
                content,
                assemblyHash,
                analysis.keywords,
                analysis.subjects
            );

            return {
                success: true,
                memoryHash,
                assemblyHash,
                journalMessageHash: journalMessage.data?.hash,
                filename,
                keywords: analysis.keywords,
                subjects: analysis.subjects,
                keywordHashes: analysis.keywordHashes,
                subjectHashes: analysis.subjectHashes
            };

        } catch (error: any) {
            console.error('[MemoryStorage] Error storing memory:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze memory content using LLM and create ONE.core Subject and Keyword objects
     * Uses TopicAnalysisPlan.createSubject() to ensure subjects are tracked in session
     */
    private async analyzeMemoryContent(content: string): Promise<{
        keywords: string[];
        subjects: string[];
        summary: string;
        keywordHashes: SHA256Hash<any>[];
        subjectHashes: SHA256Hash<any>[];
    }> {
        console.log('[MemoryStorage] analyzeMemoryContent called with content length:', content.length);

        // Extract keywords using TopicAnalysisHandler
        const keywordsResult = await this.topicAnalysisHandler.extractKeywords({
            text: content,
            limit: 10
        });

        console.log('[MemoryStorage] extractKeywords result:', JSON.stringify(keywordsResult, null, 2));

        // Extract keyword strings from result
        let keywords: string[] = [];
        if (keywordsResult.success && keywordsResult.data) {
            if (Array.isArray(keywordsResult.data)) {
                keywords = keywordsResult.data;
            } else if (typeof keywordsResult.data === 'object' && 'keywords' in keywordsResult.data) {
                const keywordObjects = (keywordsResult.data as { keywords: unknown }).keywords;
                keywords = Array.isArray(keywordObjects)
                    ? keywordObjects.map((k: any) => typeof k === 'string' ? k : k.term || k.text || k.keyword || String(k))
                    : [];
            }
        }

        console.log('[MemoryStorage] Extracted keywords:', keywords);

        // Generate summary (first 100 chars)
        const summary = content.length > 100
            ? content.substring(0, 97) + '...'
            : content;

        // Identify subjects from keywords (top 3 keywords = subjects)
        const topKeywords = keywords.slice(0, 3);
        const subjectHashes: SHA256Hash<any>[] = [];

        // Use TopicAnalysisPlan.createSubject() to ensure proper tracking in session
        // This makes subjects appear in getSubjects() and the Memory View
        if (topKeywords.length > 0) {
            // Get the "lama" topic ID for memory storage
            const lamaTopicId = await this.getLamaTopicId();

            const result = await this.topicAnalysisHandler.createSubject({
                topicId: lamaTopicId,
                keywords: topKeywords,
                description: summary,
                confidence: 0.8
            });

            if (result.success && result.data) {
                subjectHashes.push(result.data.idHash as SHA256Hash<any>);
                console.log('[MemoryStorage] Created subject via TopicAnalysisPlan:', result.data.idHash);
            } else {
                console.warn('[MemoryStorage] Failed to create subject:', result.error);
            }
        }

        // Keywords are created as part of createSubject(), so we don't need separate keyword hashes
        // The createSubject method handles keyword creation with proper subject references

        return {
            keywords,
            subjects: topKeywords,
            summary,
            keywordHashes: [], // Keywords created via createSubject
            subjectHashes
        };
    }

    /**
     * Get or create the "lama" topic ID for memory storage
     */
    private async getLamaTopicId(): Promise<string> {
        try {
            const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom('lama');
            return topicRoom.topicId || 'lama';
        } catch {
            // If topic doesn't exist, use 'lama' as identifier
            return 'lama';
        }
    }

    // Supply/Demand creation methods temporarily disabled - being migrated to new Assembly system
    // These will be replaced with calls to AssemblyPlan.createAssembly() with inline supply/demand

    // /**
    //  * Create Supply object for memory
    //  */
    // private async createSupply(...) { ... }

    // /**
    //  * Create Demand object for memory
    //  */
    // private async createDemand(...) { ... }

    /**
     * Write memory to file using HTML export renderer
     */
    private async writeMemoryFile(
        memoryHash: SHA256Hash<Memory>,
        filename: string
    ): Promise<void> {
        // Ensure memory directory exists
        await fs.mkdir(this.memoryDirectory, { recursive: true });

        // Get imploded microdata for the memory
        const implodedMicrodata = await wrapMessageWithMicrodata(String(memoryHash));

        // Generate complete HTML with styling
        const htmlContent = generateCompleteHTML({
            metadata: {
                title: filename.replace('.html', '').replace(/-/g, ' '),
                topicId: 'memory',
                messageCount: 1,
                participants: [],
                exportDate: new Date().toISOString()
            },
            messages: [implodedMicrodata],
            options: {
                theme: 'light'
            }
        });

        // Write HTML file
        const filePath = path.join(this.memoryDirectory, filename);
        await fs.writeFile(filePath, htmlContent, 'utf-8');

        console.log('[MemoryStorage] Memory HTML written to:', filePath);
    }

    /**
     * Post memory to "lama" journal with Assembly attachment
     */
    private async postToJournal(
        content: string,
        assemblyHash: SHA256Hash<Assembly>,
        keywords: string[],
        subjects: string[]
    ): Promise<any> {
        try {
            // Format journal message
            const journalContent = `Memory stored: ${content}\n\nKeywords: ${keywords.join(', ')}\nSubjects: ${subjects.join(', ')}`;

            // Post to "lama" topic with Assembly as attachment
            const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom('lama');

            // Create message with attachment
            const messageHash = await topicRoom.postText(journalContent, {
                attachments: [assemblyHash]
            });

            console.log('[MemoryStorage] Posted to journal:', messageHash);

            return {
                success: true,
                data: { hash: messageHash }
            };
        } catch (error: any) {
            console.warn('[MemoryStorage] Failed to post to journal:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
