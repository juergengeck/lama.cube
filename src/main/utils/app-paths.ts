/**
 * Shared path resolution for electron-vite apps
 *
 * Uses standard electron-vite conventions:
 * - Output structure: out/main/, out/preload/, out/renderer/
 * - Dev mode: use ELECTRON_RENDERER_URL env var
 * - Production: use path.join(__dirname, '../renderer/index.html')
 */

import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppPaths {
  /** Path to renderer directory */
  renderer: string;
  /** Path to preload script */
  preload: string;
  /** Path to assets directory */
  assets: string;
  /** Dev server URL (only set in dev mode) */
  devServerUrl: string | undefined;
}

/**
 * Resolve application paths using standard electron-vite conventions
 */
export function resolveAppPaths(): AppPaths {
  const isPackaged = app.isPackaged;
  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];

  if (isPackaged) {
    // Packaged app: files are in asar, assets in extraResources
    const appPath = app.getAppPath();
    const resourcesPath = process.resourcesPath;
    return {
      renderer: path.join(appPath, 'out', 'renderer'),
      preload: path.join(appPath, 'out', 'preload', 'index.cjs'),
      assets: path.join(resourcesPath, 'assets'),
      devServerUrl: undefined
    };
  }

  // Non-packaged (dev or preview mode)
  // In bundled output: __dirname = out/main (this file is bundled into main)
  // Standard electron-vite paths: ../renderer, ../preload relative to main
  return {
    renderer: path.join(__dirname, '..', 'renderer'),
    preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
    assets: path.join(__dirname, '..', '..', 'assets'),
    devServerUrl
  };
}

// Singleton instance
let _paths: AppPaths | null = null;

export function getAppPaths(): AppPaths {
  if (!_paths) {
    _paths = resolveAppPaths();
  }
  return _paths;
}

// Named exports for convenience
export const appPaths = {
  get renderer() { return getAppPaths().renderer; },
  get preload() { return getAppPaths().preload; },
  get assets() { return getAppPaths().assets; },
  get devServerUrl() { return getAppPaths().devServerUrl; }
};
