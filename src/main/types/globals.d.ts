// Global type declarations for the project

import type { LamaConfig } from '../config/lama-config.js';
import type { BrowserWindow } from 'electron';

declare module '@refinio/one.core' {
  export * from '@refinio/one.core/lib/types';
  export * from '@refinio/one.core/lib/storage';
  export * from '@refinio/one.core/lib/signatures';
  export * from '@refinio/one.core/lib/recipes';
}

declare module '@refinio/one.models/lib/models/Topics/TopicModel.js' {
  export const TopicModel: any;
  export const TopicRoom: any;
}

// Extend global types
declare global {
  var lamaConfig: LamaConfig;
  var mainWindow: BrowserWindow | null;

  interface Window {
    WebSocket: typeof WebSocket;
  }
}
