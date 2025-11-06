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
import type { TopicAnalysisHandler } from '@lama/core/handlers/TopicAnalysisHandler.js';
import type { Supply, Demand, Assembly } from '@assembly/core';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface Memory {
    $type$: 'Memory';
    content: string;
    author: SHA256IdHash<any>;
    memoryType: string;
    timestamp: string;
    importance?: number;
    tags?: string[];
    topicRef?: string;
    filename: string;
}

export interface StoreMemoryParams {
    content: string;
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
        private topicAnalysisHandler: TopicAnalysisHandler,
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

                            if (assembly && assembly.$type$ === 'CubeAssembly') {
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
                content,
                memoryType = 'note',
                category,
                importance,
                tags = [],
                topicRef
            } = params;

            if (!this.nodeOneCore.initialized || !this.nodeOneCore.ownerId) {
                throw new Error('ONE.core not initialized');
            }

            const timestamp = new Date();
            const filename = generateMemoryFilename(content, timestamp);
            const authorId = this.nodeOneCore.ownerId;

            // Add category as tag if provided
            const allTags = category ? [...tags, category] : tags;

            // Step 1: Create Memory object (versioned)
            console.log('[MemoryStorage] Creating Memory object...');
            const memory: Memory = {
                $type$: 'Memory',
                content,
                author: authorId,
                memoryType,
                timestamp: timestamp.toISOString(),
                importance,
                tags: allTags.length > 0 ? allTags : undefined,
                topicRef,
                filename
            };

            const memoryHash = await this.nodeOneCore.storeVersionedObject(memory);
            console.log('[MemoryStorage] Memory stored:', memoryHash);

            // Step 2: Analyze with LLM → extract keywords, subjects, summary
            console.log('[MemoryStorage] Analyzing memory content...');
            const analysis = await this.analyzeMemoryContent(content);
            console.log('[MemoryStorage] Analysis complete:', {
                keywords: analysis.keywords.length,
                subjects: analysis.subjects.length
            });

            // Step 3: Create Supply → what capability this memory offers
            console.log('[MemoryStorage] Creating Supply...');
            const supply = await this.createSupply(
                analysis.keywords,
                authorId,
                topicRef || 'lama',
                analysis.summary
            );

            // Step 4: Create Demand → what constraints it satisfies
            console.log('[MemoryStorage] Creating Demand...');
            const demand = await this.createDemand(
                analysis.keywords,
                authorId,
                content,
                topicRef
            );

            // Step 5: Create Assembly → wraps Memory + Supply + Demand
            console.log('[MemoryStorage] Creating Assembly...');
            const assembly: Assembly = {
                $type$: 'CubeAssembly',
                supply: supply.$idHash$!,
                instanceVersion: String(memoryHash), // Version hash of Memory
                demand: demand.$idHash$!,
                created: Date.now()
            };

            const assemblyHash = await this.nodeOneCore.storeUnversionedObject(assembly);
            console.log('[MemoryStorage] Assembly stored:', assemblyHash);

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
     */
    private async analyzeMemoryContent(content: string): Promise<{
        keywords: string[];
        subjects: string[];
        summary: string;
        keywordHashes: SHA256Hash<any>[];
        subjectHashes: SHA256Hash<any>[];
    }> {
        // Extract keywords using TopicAnalysisHandler
        const keywordsResult = await this.topicAnalysisHandler.extractKeywords({
            text: content,
            limit: 10
        });

        // Extract keyword strings from result
        let keywords: string[] = [];
        if (keywordsResult.success && keywordsResult.data) {
            if (Array.isArray(keywordsResult.data)) {
                keywords = keywordsResult.data;
            } else if (typeof keywordsResult.data === 'object' && 'keywords' in keywordsResult.data) {
                const keywordObjects = (keywordsResult.data as any).keywords;
                keywords = Array.isArray(keywordObjects)
                    ? keywordObjects.map((k: any) => typeof k === 'string' ? k : k.text || k.keyword || String(k))
                    : [];
            }
        }

        // Generate summary (first 100 chars)
        const summary = content.length > 100
            ? content.substring(0, 97) + '...'
            : content;

        // Create Keyword ONE.core objects
        const keywordHashes: SHA256Hash<any>[] = [];
        const now = Date.now();

        for (const term of keywords) {
            const normalizedTerm = term.toLowerCase();

            // Check if Keyword already exists
            const existingKeywords = await this.nodeOneCore.loadObjectByIdHash('Keyword', normalizedTerm);

            if (existingKeywords && existingKeywords.length > 0) {
                // Update existing keyword (increment frequency)
                const existing = existingKeywords[0];
                const updated = {
                    ...existing,
                    frequency: (existing.frequency || 0) + 1,
                    lastSeen: now
                };
                const hash = await this.nodeOneCore.storeVersionedObject(updated);
                keywordHashes.push(hash);
            } else {
                // Create new Keyword object
                const keyword = {
                    $type$: 'Keyword',
                    term: normalizedTerm,
                    frequency: 1,
                    subjects: [],
                    score: 1.0,
                    createdAt: now,
                    lastSeen: now
                };
                const hash = await this.nodeOneCore.storeVersionedObject(keyword);
                keywordHashes.push(hash);
            }
        }

        // Identify subjects from keywords (top 3 keywords = subjects)
        const topKeywords = keywords.slice(0, 3);
        const subjectId = topKeywords.map(k => k.toLowerCase()).sort().join('+');

        // Create Subject ONE.core object
        const subjectHashes: SHA256Hash<any>[] = [];

        if (topKeywords.length > 0) {
            // Check if Subject already exists
            const existingSubjects = await this.nodeOneCore.loadObjectByIdHash('Subject', subjectId);

            if (existingSubjects && existingSubjects.length > 0) {
                // Update existing subject
                const existing = existingSubjects[0];
                const updated = {
                    ...existing,
                    messageCount: (existing.messageCount || 0) + 1,
                    lastSeenAt: now,
                    timeRanges: [
                        ...(existing.timeRanges || []),
                        { start: now, end: now }
                    ]
                };
                const hash = await this.nodeOneCore.storeVersionedObject(updated);
                subjectHashes.push(hash);
            } else {
                // Create new Subject object
                const subject = {
                    $type$: 'Subject',
                    id: subjectId,
                    topic: 'lama', // Memory topic
                    keywords: topKeywords.map(k => k.toLowerCase()),
                    timeRanges: [{ start: now, end: now }],
                    messageCount: 1,
                    createdAt: now,
                    lastSeenAt: now,
                    archived: false
                };
                const hash = await this.nodeOneCore.storeVersionedObject(subject);
                subjectHashes.push(hash);
            }

            // Update Keyword objects to reference this Subject
            for (const keywordHash of keywordHashes) {
                const keyword = await this.nodeOneCore.loadObject(keywordHash);
                if (keyword && !keyword.subjects.includes(subjectId)) {
                    const updated = {
                        ...keyword,
                        subjects: [...keyword.subjects, subjectId]
                    };
                    await this.nodeOneCore.storeVersionedObject(updated);
                }
            }
        }

        return {
            keywords,
            subjects: topKeywords,
            summary,
            keywordHashes,
            subjectHashes
        };
    }

    /**
     * Create Supply object for memory
     */
    private async createSupply(
        keywords: string[],
        creatorId: SHA256IdHash<any>,
        conversationId: string,
        metadata: string
    ): Promise<Supply & { $idHash$?: SHA256IdHash<Supply> }> {
        const supply: Supply = {
            $type$: 'AssemblySupply',
            id: `supply-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            keywords,
            contextLevel: 1,
            conversationId,
            creatorId: String(creatorId),
            trustScore: 1.0,
            created: Date.now(),
            metadata: { summary: metadata },
            isRecursive: false
        };

        const supplyHash = await this.nodeOneCore.storeVersionedObject(supply);

        // Get ID hash
        const supplyIdHash = await this.nodeOneCore.calculateIdHashOfVersionedObject(supply);

        return {
            ...supply,
            $idHash$: supplyIdHash as SHA256IdHash<Supply>
        };
    }

    /**
     * Create Demand object for memory
     */
    private async createDemand(
        keywords: string[],
        requesterId: SHA256IdHash<any>,
        context: string,
        topicRef?: string
    ): Promise<Demand & { $idHash$?: SHA256IdHash<Demand> }> {
        const demand: Demand = {
            $type$: 'AssemblyDemand',
            id: `demand-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            keywords,
            urgency: 5,
            context: context.substring(0, 200), // Truncate for storage
            criteria: topicRef ? { topicRef } : undefined,
            requesterId: String(requesterId),
            created: Date.now(),
            expires: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
            maxResults: 10
        };

        const demandHash = await this.nodeOneCore.storeVersionedObject(demand);

        // Get ID hash
        const demandIdHash = await this.nodeOneCore.calculateIdHashOfVersionedObject(demand);

        return {
            ...demand,
            $idHash$: demandIdHash as SHA256IdHash<Demand>
        };
    }

    /**
     * Write memory to file using HTML export renderer
     */
    private async writeMemoryFile(
        memoryHash: SHA256Hash<Memory>,
        filename: string
    ): Promise<void> {
        // Ensure memory directory exists
        await fs.mkdir(this.memoryDirectory, { recursive: true });

        // Import HTML export services
        const { wrapMessageWithMicrodata } = await import('./html-export/implode-wrapper.js');
        const { generateCompleteHTML } = await import('./html-export/html-template.js');

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
