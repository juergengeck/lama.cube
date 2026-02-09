/**
 * IPC handlers for chat memory operations
 * Provides toggle control and memory search for UI
 *
 * Uses lama.core's SubjectsPlan for subject management.
 * The Subject type from lama.core is the source of truth.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';

export default function registerMemoryHandlers(handle: (channel: string, handler: any) => void, nodeOneCore: any) {
  /**
   * Get memory status for a topic
   */
  handle('memory:getStatus', async (event: IpcMainInvokeEvent, params: { topicId: string }) => {
    try {
      if (!nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const status = nodeOneCore.chatMemoryHandler.getMemoryStatus({ topicId: params.topicId });

      return {
        enabled: status.enabled,
        config: status.config
      };
    } catch (error) {
      console.error('[IPC:memory:getStatus] Error:', error);
      throw error;
    }
  });

  /**
   * Toggle memory extraction for a topic
   */
  handle('memory:toggle', async (event: IpcMainInvokeEvent, params: { topicId: string }) => {
    try {
      if (!nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const enabled = await nodeOneCore.chatMemoryHandler.toggleMemories({ topicId: params.topicId });

      return {
        enabled
      };
    } catch (error) {
      console.error('[IPC:memory:toggle] Error:', error);
      throw error;
    }
  });

  /**
   * Enable memory extraction for a topic
   */
  handle(
    'memory:enable',
    async (
      event: IpcMainInvokeEvent,
      params: {
        topicId: string;
        autoExtract?: boolean;
        keywords?: string[];
      }
    ) => {
      try {
        if (!nodeOneCore?.chatMemoryHandler) {
          throw new Error('Chat Memory Handler not initialized');
        }

        const config = await nodeOneCore.chatMemoryHandler.enableMemories({
          topicId: params.topicId,
          autoExtract: params.autoExtract ?? true,
          keywords: params.keywords ?? []
        });

        return {
          enabled: true,
          config
        };
      } catch (error) {
        console.error('[IPC:memory:enable] Error:', error);
        throw error;
      }
    }
  );

  /**
   * Disable memory extraction for a topic
   */
  handle('memory:disable', async (event: IpcMainInvokeEvent, params: { topicId: string }) => {
    try {
      if (!nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      await nodeOneCore.chatMemoryHandler.disableMemories({ topicId: params.topicId });

      return {
        enabled: false
      };
    } catch (error) {
      console.error('[IPC:memory:disable] Error:', error);
      throw error;
    }
  });

  /**
   * Extract subjects from chat history
   */
  handle(
    'memory:extract',
    async (
      event: IpcMainInvokeEvent,
      params: {
        topicId: string;
        limit?: number;
      }
    ) => {
      try {
        if (!nodeOneCore?.chatMemoryHandler) {
          throw new Error('Chat Memory Handler not initialized');
        }

        const result = await nodeOneCore.chatMemoryHandler.extractSubjects({
          topicId: params.topicId,
          limit: params.limit ?? 50,
          includeContext: true
        });

        return {
          subjects: result.subjects,
          totalMessages: result.totalMessages,
          processingTime: result.processingTime
        };
      } catch (error) {
        console.error('[IPC:memory:extract] Error:', error);
        throw error;
      }
    }
  );

  /**
   * Find related memories by keywords
   */
  handle(
    'memory:find',
    async (
      event: IpcMainInvokeEvent,
      params: {
        topicId?: string;
        keywords: string[] | string;  // MCP may pass comma-separated string
        limit?: number;
      }
    ) => {
      try {
        if (!nodeOneCore?.chatMemoryHandler) {
          throw new Error('Chat Memory Handler not initialized');
        }

        // Handle keywords as string or array (MCP may pass comma-separated string)
        let keywords = params.keywords;
        if (typeof keywords === 'string') {
          keywords = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
        }

        const result = await nodeOneCore.chatMemoryHandler.findRelatedMemories({
          topicId: params.topicId || '',
          keywords,
          limit: params.limit ?? 10
        });

        return {
          memories: result.memories,
          searchKeywords: result.searchKeywords,
          totalFound: result.totalFound
        };
      } catch (error) {
        console.error('[IPC:memory:find] Error:', error);
        throw error;
      }
    }
  );

  /**
   * Get all journal entries (subjects) sorted chronologically
   * Uses nodeOneCore.topicAnalysisModel directly
   */
  handle('memory:journal:list', async (event: IpcMainInvokeEvent, params?: { limit?: number }) => {
    try {
      // Get all subjects directly from TopicAnalysisModel
      if (!nodeOneCore?.topicAnalysisModel) {
        throw new Error('TopicAnalysisModel not initialized');
      }

      const topics = await nodeOneCore.topicAnalysisModel.getAllTopics();
      const allSubjects: any[] = [];

      // Build a map of keyword IdHash -> term for resolving keyword references
      const keywordTermMap = new Map<string, string>();

      for (const topicId of topics) {
        const subjects = await nodeOneCore.topicAnalysisModel.getSubjects(topicId);
        // Attach topicId to each subject for later reference
        for (const subject of subjects) {
          subject._sourceTopicId = topicId;
        }
        allSubjects.push(...subjects);

        // Get keywords for this topic and build the term map
        const keywords = await nodeOneCore.topicAnalysisModel.getKeywords(topicId);
        for (const keyword of keywords) {
          // Keyword.term is the ID property, calculate its IdHash
          const keywordIdHash = await calculateIdHashOfObj(keyword);
          if (keywordIdHash && keyword.term) {
            keywordTermMap.set(keywordIdHash, keyword.term);
          }
        }
      }

      // Map subjects to journal entry format
      const entries = await Promise.all(allSubjects.map(async (subject: any) => {
        // Calculate IdHash from keywords (Subject's ID property)
        const idHash = await calculateIdHashOfObj(subject);

        // Resolve keyword IdHashes to actual term strings
        const keywordTerms: string[] = [];
        if (subject.keywords && Array.isArray(subject.keywords)) {
          for (const keywordIdHash of subject.keywords) {
            const term = keywordTermMap.get(keywordIdHash);
            if (term) {
              keywordTerms.push(term);
            }
          }
        }

        return {
          idHash: idHash || '',
          id: idHash || '',
          name: subject.description?.split('.')[0] || 'Untitled',
          description: subject.description || '',
          created: subject.createdAt || 0,
          modified: subject.lastSeenAt || 0,
          topic: subject._sourceTopicId || subject.topics?.[0] || '',
          keywords: keywordTerms,
          messageCount: subject.messageCount || 0,
          metadata: {
            abstractionLevel: subject.abstractionLevel || 0,
            likes: 0,
            dislikes: 0
          }
        };
      }));

      // Sort by most recent first (lastSeenAt or created)
      entries.sort((a: any, b: any) => {
        const aTime = a.modified || a.created || 0;
        const bTime = b.modified || b.created || 0;
        return bTime - aTime;
      });

      // Apply limit if specified
      const limited = params?.limit ? entries.slice(0, params.limit) : entries;

      return {
        entries: limited,
        total: entries.length
      };
    } catch (error) {
      console.error('[IPC:memory:journal:list] Error:', error);
      throw error;
    }
  });

  /**
   * List all Memory objects
   * Scans the "lama" journal topic for Assembly attachments containing Memory objects
   */
  handle('memory:listMemories', async (event: IpcMainInvokeEvent, params?: { limit?: number }) => {
    try {
      if (!nodeOneCore?.topicModel) {
        throw new Error('TopicModel not initialized');
      }

      const memories: Array<{
        idHash: string;
        title: string;
        summary?: string;
        factsCount: number;
        entitiesCount: number;
        sourceSubjects: string[];
        createdAt?: number;
      }> = [];

      // Scan the "lama" journal topic for Memory objects via Assembly attachments
      try {
        const topicRoom = await nodeOneCore.topicModel.enterTopicRoom('lama');
        const messages = await topicRoom.retrieveAllMessages();

        for (const message of messages) {
          if (!message.attachments || message.attachments.length === 0) {
            continue;
          }

          for (const attachmentHash of message.attachments) {
            try {
              const attachment = await nodeOneCore.loadObject(attachmentHash);

              // Check if attachment is an Assembly containing a Memory
              if (attachment && attachment.$type$ === 'Assembly') {
                // Assembly wraps Memory - get the wrapped object
                const wrappedHash = attachment.wrapped;
                if (wrappedHash) {
                  const wrapped = await nodeOneCore.loadObject(wrappedHash);
                  if (wrapped && wrapped.$type$ === 'Memory') {
                    const memory = wrapped;
                    const memoryIdHash = await calculateIdHashOfObj(memory);

                    memories.push({
                      idHash: memoryIdHash || attachmentHash,
                      title: memory.title || 'Untitled Memory',
                      summary: memory.summary,
                      factsCount: memory.facts?.length || 0,
                      entitiesCount: memory.entities?.length || 0,
                      sourceSubjects: memory.sourceSubjects || [],
                      createdAt: message.sendTime // Use message time as creation time
                    });
                  }
                }
              }

              // Also check if attachment is directly a Memory
              if (attachment && attachment.$type$ === 'Memory') {
                const memory = attachment;
                const memoryIdHash = await calculateIdHashOfObj(memory);

                memories.push({
                  idHash: memoryIdHash || attachmentHash,
                  title: memory.title || 'Untitled Memory',
                  summary: memory.summary,
                  factsCount: memory.facts?.length || 0,
                  entitiesCount: memory.entities?.length || 0,
                  sourceSubjects: memory.sourceSubjects || [],
                  createdAt: message.sendTime
                });
              }
            } catch (err) {
              // Silently skip attachments we can't load
              console.warn('[IPC:memory:listMemories] Failed to load attachment:', err);
            }
          }
        }
      } catch (err) {
        console.warn('[IPC:memory:listMemories] Failed to scan lama topic:', err);
        // Continue - will return empty list if journal doesn't exist yet
      }

      // Sort by most recent first
      memories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Apply limit if specified
      const limited = params?.limit ? memories.slice(0, params.limit) : memories;

      return {
        memories: limited,
        total: memories.length
      };
    } catch (error) {
      console.error('[IPC:memory:listMemories] Error:', error);
      throw error;
    }
  });

  /**
   * Get a single journal entry (subject) with HTML content
   * Uses nodeOneCore.topicAnalysisModel directly
   */
  handle('memory:journal:get', async (event: IpcMainInvokeEvent, params: { idHash: string }) => {
    try {
      // Get all subjects directly from TopicAnalysisModel
      if (!nodeOneCore?.topicAnalysisModel) {
        throw new Error('TopicAnalysisModel not initialized');
      }

      const topics = await nodeOneCore.topicAnalysisModel.getAllTopics();
      const allSubjects: any[] = [];
      for (const topicId of topics) {
        const subjects = await nodeOneCore.topicAnalysisModel.getSubjects(topicId);
        allSubjects.push(...subjects);
      }

      // Find subject by calculating IdHash for each and comparing
      let foundSubject: any = null;
      for (const subject of allSubjects) {
        const idHash = await calculateIdHashOfObj(subject);
        if (idHash === params.idHash) {
          foundSubject = subject;
          break;
        }
      }

      if (!foundSubject) {
        return null;
      }

      // Map lama.core Subject to journal entry format
      return {
        idHash: params.idHash,
        id: params.idHash,
        name: foundSubject.description?.split('.')[0] || 'Untitled',
        description: foundSubject.description || '',
        created: 0, // No longer available on Subject
        modified: 0, // No longer available on Subject
        topic: foundSubject.topics?.[0] || '', // Use first topic from topics array
        keywords: foundSubject.keywords || [],
        messageCount: 0, // No longer available on Subject
        metadata: {
          abstractionLevel: foundSubject.abstractionLevel || 0,
          likes: 0, // No longer available on Subject
          dislikes: 0 // No longer available on Subject
        },
        // HTML content not available from lama.core subjects
        filePath: null,
        html: null
      };
    } catch (error) {
      console.error('[IPC:memory:journal:get] Error:', error);
      throw error;
    }
  });

  console.log('[IPC] ✅ Memory handlers registered');
}
