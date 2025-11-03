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

  console.log('[IPC] ✅ Memory handlers registered');
}
