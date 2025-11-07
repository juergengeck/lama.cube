/**
 * IPC handlers for chat memory operations
 * Provides toggle control and memory search for UI
 */

import type { IpcMainInvokeEvent } from 'electron';

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
   */
  ipcMain.handle('memory:journal:list', async (event: IpcMainInvokeEvent, params?: { limit?: number }) => {
    try {
      if (!nodeOneCore?.subjectHandler) {
        throw new Error('Subject Handler not initialized');
      }

      // Get all subject ID hashes
      const idHashes = await nodeOneCore.subjectHandler.listSubjects();

      // Retrieve all subjects with details
      const subjects = await Promise.all(
        idHashes.map(async (idHash: any) => {
          const subject = await nodeOneCore.subjectHandler.getSubject(idHash);
          if (!subject) return null;

          return {
            idHash,
            id: subject.id,
            name: subject.name,
            description: subject.description,
            created: subject.created,
            modified: subject.modified,
            metadata: subject.metadata ? Object.fromEntries(subject.metadata) : {}
          };
        })
      );

      // Filter out nulls and sort by created date (newest first)
      const validSubjects = subjects.filter((s: any) => s !== null);
      validSubjects.sort((a: any, b: any) => (b.created || 0) - (a.created || 0));

      // Apply limit if specified
      const limited = params?.limit ? validSubjects.slice(0, params.limit) : validSubjects;

      return {
        entries: limited,
        total: validSubjects.length
      };
    } catch (error) {
      console.error('[IPC:memory:journal:list] Error:', error);
      throw error;
    }
  });

  /**
   * Get a single journal entry (subject) with HTML content
   */
  ipcMain.handle('memory:journal:get', async (event: IpcMainInvokeEvent, params: { idHash: string }) => {
    try {
      if (!nodeOneCore?.subjectHandler) {
        throw new Error('Subject Handler not initialized');
      }

      if (!nodeOneCore?.fileStorageService) {
        throw new Error('File Storage Service not initialized');
      }

      // Get subject details
      const subject = await nodeOneCore.subjectHandler.getSubject(params.idHash);

      if (!subject) {
        return null;
      }

      // Get the HTML file path
      const filePath = nodeOneCore.fileStorageService.getFilePath(params.idHash, 'subjects');

      // Read raw HTML for display
      const html = await nodeOneCore.fileStorageService.readRawHtml(params.idHash, 'subjects');

      return {
        idHash: params.idHash,
        id: subject.id,
        name: subject.name,
        description: subject.description,
        created: subject.created,
        modified: subject.modified,
        metadata: subject.metadata ? Object.fromEntries(subject.metadata) : {},
        filePath,
        html
      };
    } catch (error) {
      console.error('[IPC:memory:journal:get] Error:', error);
      throw error;
    }
  });

  console.log('[IPC] ✅ Memory handlers registered');
}
