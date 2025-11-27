/**
 * IPC handlers for chat memory operations
 * Provides toggle control and memory search for UI
 *
 * Uses lama.core's SubjectsPlan for subject management.
 * The Subject type from lama.core is the source of truth.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { subjectsPlan } from './subjects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';

export default function registerMemoryHandlers(ipcMain: any, nodeOneCore: any) {
  /**
   * Get memory status for a topic
   */
  ipcMain.handle('memory:getStatus', async (event: IpcMainInvokeEvent, params: { topicId: string }) => {
    try {
      if (!nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const status = nodeOneCore.chatMemoryHandler.getMemoryStatus(params.topicId);

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
  ipcMain.handle('memory:toggle', async (event: IpcMainInvokeEvent, params: { topicId: string }) => {
    try {
      if (!nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      const enabled = await nodeOneCore.chatMemoryHandler.toggleMemories(params.topicId);

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
  ipcMain.handle(
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

        const config = await nodeOneCore.chatMemoryHandler.enableMemories(
          params.topicId,
          params.autoExtract ?? true,
          params.keywords ?? []
        );

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
  ipcMain.handle('memory:disable', async (event: IpcMainInvokeEvent, params: { topicId: string }) => {
    try {
      if (!nodeOneCore?.chatMemoryHandler) {
        throw new Error('Chat Memory Handler not initialized');
      }

      await nodeOneCore.chatMemoryHandler.disableMemories(params.topicId);

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
  ipcMain.handle(
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
  ipcMain.handle(
    'memory:find',
    async (
      event: IpcMainInvokeEvent,
      params: {
        topicId?: string;
        keywords: string[];
        limit?: number;
      }
    ) => {
      try {
        if (!nodeOneCore?.chatMemoryHandler) {
          throw new Error('Chat Memory Handler not initialized');
        }

        const result = await nodeOneCore.chatMemoryHandler.findRelatedMemories(
          params.topicId || '',
          params.keywords,
          params.limit ?? 10
        );

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
   * Uses lama.core's SubjectsPlan - the source of truth for subjects
   */
  ipcMain.handle('memory:journal:list', async (event: IpcMainInvokeEvent, params?: { limit?: number }) => {
    try {
      // Get all subjects via lama.core's SubjectsPlan
      const response = await subjectsPlan.getAllSubjects();

      if (!response.success || !response.subjects) {
        throw new Error(response.error || 'Failed to get subjects');
      }

      // Map lama.core Subject to journal entry format
      const entries = await Promise.all(response.subjects.map(async (subject: any) => {
        // Calculate IdHash from keywords (Subject's ID property)
        const idHash = await calculateIdHashOfObj(subject);

        return {
          idHash: idHash || '',
          id: idHash || '',
          name: subject.description?.split('.')[0] || 'Untitled',
          description: subject.description || '',
          created: 0, // No longer available on Subject
          modified: 0, // No longer available on Subject
          topic: subject.topics?.[0] || '', // Use first topic from topics array
          keywords: subject.keywords || [],
          messageCount: 0, // No longer available on Subject
          metadata: {
            abstractionLevel: subject.abstractionLevel || 0,
            likes: 0, // No longer available on Subject
            dislikes: 0 // No longer available on Subject
          }
        };
      }));

      // Sort by ID (no created date available)
      entries.sort((a: any, b: any) => {
        const aId = a.idHash || '';
        const bId = b.idHash || '';
        return bId.localeCompare(aId);
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
   * Get a single journal entry (subject) with HTML content
   * Uses lama.core's SubjectsPlan - the source of truth for subjects
   */
  ipcMain.handle('memory:journal:get', async (event: IpcMainInvokeEvent, params: { idHash: string }) => {
    try {
      // Get all subjects and find the one matching the idHash
      const response = await subjectsPlan.getAllSubjects();

      if (!response.success || !response.subjects) {
        throw new Error(response.error || 'Failed to get subjects');
      }

      // Find subject by calculating IdHash for each and comparing
      let foundSubject: any = null;
      for (const subject of response.subjects) {
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
