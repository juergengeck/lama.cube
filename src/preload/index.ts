/**
 * Electron Preload Script
 * Exposes IPC APIs to the renderer process and initializes ONE platform
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// NO ONE.CORE IN BROWSER
// Platform is loaded only in the main process
console.log('[PRELOAD] Script loaded at:', new Date().toISOString());
console.log('[PRELOAD] Browser does not load ONE.core - using IPC only');

// Platform is initialized in the main process for ESM modules
// The preload script runs in an isolated context and can't share module state
// We'll just report that the platform is ready since it's confirmed working in main
const platformInitialized = true; // Platform is loaded in main process
const platformError: Error | null = null;
const platformInitPromise = Promise.resolve(true);

console.log('[PRELOAD] Platform is initialized in main process (ESM modules)');
console.log('[PRELOAD] ✅ Using Node.js platform from main process');

// Set up log forwarding from main process to renderer console
ipcRenderer.on('main-process-log', (_event: IpcRendererEvent, logData: { timestamp: string; level: string; message: string }) => {
  const timestamp = new Date(logData.timestamp).toLocaleTimeString();
  const prefix = `[MAIN:${timestamp}]`;

  switch (logData.level) {
    case 'error':
      console.error(prefix, logData.message);
      break;
    case 'warn':
      console.warn(prefix, logData.message);
      break;
    default:
      console.log(prefix, logData.message);
      break;
  }
});

// IPC Event Whitelist
// IMPORTANT: Event names must match @lama/core/events registry (source of truth)
// See: lama.core/events/index.ts for canonical event definitions and types
const validChannels = [
  'navigate',
  'update:mainProcessLog',
  // AI assistant events
  'ai:responding',      // AI is working on response
  'ai:error',           // AI error
  'ai:creation-progress', // AI persona creation progress
  // Analysis data events
  'subjects:updated',   // Subjects extracted/changed
  'keywords:updated',   // Keywords extracted/changed
  // LLM model events
  'llm:stream',         // Streaming text chunk
  'llm:complete',       // Generation finished
  'llm:thinking',       // Reasoning/thinking stream
  'llm:status',         // Processing status
  // TTS model events
  'tts:progress',
  'tts:complete',
  'tts:error',
  // Contact events
  'contact:added',
  'contacts:updated',
  'contacts:pending:new',
  'contacts:accepted',
  'contacts:vc:received',
  // Chat events
  'chat:conversationCreated',
  'chat:messageSent',
  'chat:newMessages',
  'chat:composingChanged',
  'channel:updated',
  // System events
  'node-log',
  'onecore:init-progress',
  'localModels:textGenProgress',
  'localModels:textGenStream',
  'localModels:progress',
  // Discovery events
  'discovery:stateChanged',
  // WhatsApp/Baileys events
  'baileys:log',
  'baileys:syncStats',
  'baileys:importProgress',
  'baileys:qrCode',
  'baileys:qrCodeBase64',
  'baileys:pairingCode',
  'baileys:connectionChanged',
  'baileys:messageReceived',
  'baileys:error',
  'baileys:chatsDiscovered',
  // MCP events
  'mcp:statusChanged',
  // Job events
  'job:progress',
  'job:status',
  // Topic events (for useTopics refresh)
  'newTopic'
] as const;

type ValidChannel = typeof validChannels[number];

// Expose protected APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform status
  platform: 'nodejs',
  isElectron: true,
  isPlatformInitialized: () => platformInitialized,
  getPlatformError: () => platformError ? platformError.message : null,
  waitForPlatform: () => platformInitPromise,

  // UDP Socket APIs
  udpCreate: (socketId: string, type: string) => ipcRenderer.invoke('udp:create', socketId, type),
  udpBind: (socketId: string, port: number, address: string) => ipcRenderer.invoke('udp:bind', socketId, port, address),
  udpSend: (socketId: string, data: Uint8Array, port: number, address: string) => ipcRenderer.invoke('udp:send', socketId, data, port, address),
  udpClose: (socketId: string) => ipcRenderer.invoke('udp:close', socketId),
  onUDPMessage: (callback: (socketId: string, eventType: string, ...args: unknown[]) => void) => {
    ipcRenderer.on('udp:message', (_event: IpcRendererEvent, socketId: string, eventType: string, ...args: unknown[]) => {
      callback(socketId, eventType, ...args);
    });
  },

  // App control APIs
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // System info
  getPlatform: () => ipcRenderer.invoke('system:platform'),
  getVersion: () => ipcRenderer.invoke('system:version'),

  // File system (restricted)
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  selectFile: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('dialog:selectFile', filters),

  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  readFromClipboard: () => ipcRenderer.invoke('clipboard:read'),

  // File downloads
  downloadFile: (downloadId: string, url: string, filePath: string) => ipcRenderer.invoke('download:start', downloadId, url, filePath),
  cancelDownload: (downloadId: string) => ipcRenderer.invoke('download:cancel', downloadId),
  onDownloadProgress: (callback: (downloadId: string, progress: number) => void) => {
    ipcRenderer.on('download:progress', (_event: IpcRendererEvent, downloadId: string, progress: number) => {
      callback(downloadId, progress);
    });
  },
  onDownloadComplete: (callback: (downloadId: string) => void) => {
    ipcRenderer.on('download:complete', (_event: IpcRendererEvent, downloadId: string) => {
      callback(downloadId);
    });
  },
  onDownloadError: (callback: (downloadId: string, error: string) => void) => {
    ipcRenderer.on('download:error', (_event: IpcRendererEvent, downloadId: string, error: string) => {
      callback(downloadId, error);
    });
  },

  // File operations
  fileExists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
  getFileSize: (filePath: string) => ipcRenderer.invoke('file:size', filePath),

  // Transport APIs
  transport: {
    createWebRTCInvite: (params: unknown) => ipcRenderer.invoke('transport:createWebRTCInvite', params),
    completeWebRTCInvite: (params: unknown) => ipcRenderer.invoke('transport:completeWebRTCInvite', params),
    acceptWebRTCInvite: (params: unknown) => ipcRenderer.invoke('transport:acceptWebRTCInvite', params),
    cancelWebRTCInvite: (params: unknown) => ipcRenderer.invoke('transport:cancelWebRTCInvite', params),
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (validChannels.includes(channel as ValidChannel)) {
      // Strip the Electron IPC event object, only pass data to callback
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      // Return cleanup function
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    // Return no-op cleanup for invalid channels
    return () => {};
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    if (validChannels.includes(channel as ValidChannel)) {
      ipcRenderer.removeListener(channel, callback as (event: IpcRendererEvent, ...args: unknown[]) => void);
    }
  },
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
    if (validChannels.includes(channel as ValidChannel)) {
      ipcRenderer.removeListener(channel, callback as (event: IpcRendererEvent, ...args: unknown[]) => void);
    }
  },

  // Generic IPC invoke for platform bridge
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),

  // Dock badge API (macOS/Linux)
  setBadge: (count: number) => ipcRenderer.invoke('alerts:updateDockBadge', { count }),
  clearBadge: () => ipcRenderer.invoke('alerts:clearDockBadge')
});
