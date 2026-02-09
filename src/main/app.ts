/**
 * Main Application Entry Point
 * Initializes all services and manages the application lifecycle
 */

import electron from 'electron';
const { app, BrowserWindow } = electron;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared path resolution for bundled/packaged apps (standard electron-vite conventions)
import { appPaths } from './utils/app-paths.js';

const { renderer: RENDERER_PATH, preload: PRELOAD_PATH, assets: ASSETS_PATH, devServerUrl: DEV_SERVER_URL } = appPaths;

// Extend global type for mainWindow
declare global {
  var mainWindow: electron.BrowserWindow | null;
}

// Core modules
import nodeProvisioning from './services/node-provisioning.js';
import ipcController from './ipc/controller.js';
import llmManager from './services/llm-manager-singleton.js';
import attachmentService from './services/attachment-service.js';
import assemblyManagerSingleton from './services/assembly-manager-singleton.js';
import { getInferenceManager } from './core/inference-manager.js';
import nodeInstance from './core/node-one-core.js';

class MainApplication {
  public mainWindow: any;
  public initialized: any;

  
  constructor() {
    this.mainWindow = null
    this.initialized = false
}

  async initialize(): Promise<any> {
    // Always reset initialization state on fresh start
    // This ensures we can properly reinitialize after a data reset
    if (this.initialized) {
      console.log('[MainApp] Already initialized, skipping...')
      return
    }

    console.log('[MainApp] Initializing application...')

    try {
      // Initialize Node provisioning listener
      // Node instance will be initialized when browser provisions it
      nodeProvisioning.initialize()

      // Initialize attachment service
      await attachmentService.initialize()
      console.log('[MainApp] Attachment service initialized')

      // Initialize LLM Manager with MCP support
      try {
        await llmManager.init()
        console.log('[MainApp] LLM Manager initialized with MCP tools')
      } catch (error) {
        console.warn('[MainApp] LLM Manager initialization failed (non-critical):', error)
        // Continue without LLM - can be initialized later
      }

      // Initialize Inference Manager for local embeddings
      try {
        const inferenceManager = getInferenceManager()
        inferenceManager.onProgress = (progress) => {
          console.log(`[MainApp] Inference loading: ${progress.stage} ${progress.percent}%`)
          const status = {
            state: progress.stage === 'download' ? 'downloading' as const : 'loading' as const,
            progress: progress.percent
          }
          // Track status so renderer can request it on mount
          inferenceManager.updateStatus(status)
          // Send progress to renderer
          if (this.mainWindow?.webContents) {
            this.mainWindow.webContents.send('inference:status', status)
          }
        }
        inferenceManager.onError = (error) => {
          console.error('[MainApp] Inference error:', error)
          const status = { state: 'error' as const, progress: 0, error: error.message }
          inferenceManager.updateStatus(status)
          if (this.mainWindow?.webContents) {
            this.mainWindow.webContents.send('inference:status', status)
          }
        }
        await inferenceManager.init()
        console.log(`[MainApp] Inference Manager initialized with ${inferenceManager.activeProvider}`)
        // Send ready state
        const readyStatus = { state: 'ready' as const, progress: 100 }
        inferenceManager.updateStatus(readyStatus)
        if (this.mainWindow?.webContents) {
          this.mainWindow.webContents.send('inference:status', readyStatus)
        }
      } catch (error) {
        console.warn('[MainApp] Inference Manager initialization failed (non-critical):', error)
        // Send error state
        const errorStatus = { state: 'error' as const, progress: 0, error: (error as Error).message }
        try {
          const inferenceManager = getInferenceManager()
          inferenceManager.updateStatus(errorStatus)
        } catch {}
        if (this.mainWindow?.webContents) {
          this.mainWindow.webContents.send('inference:status', errorStatus)
        }
        // Continue without inference - can be initialized later
      }

      // Set up state change listeners
      this.setupStateListeners()

      this.initialized = true
      console.log('[MainApp] Application ready for provisioning')
    } catch (error) {
      console.error('[MainApp] Failed to initialize:', error)
      // Don't set initialized on failure, allow retry
      throw error
    }
  }

  reset(): any {
    // Reset the application state for clean restart
    console.log('[MainApp] Resetting application state...')
    this.initialized = false
    this.mainWindow = null
  }

  setupStateListeners(): any {
    // State changes will be handled through CHUM sync
    // No longer using centralized state manager
    console.log('[MainApp] State listeners configured for CHUM sync')
  }

  createWindow(): any {
    // Set up window icon
    const iconPath = path.join(ASSETS_PATH, 'icons', 'icon-512.png')
    let windowIcon = undefined
    if (fs.existsSync(iconPath)) {
      windowIcon = iconPath
      console.log(`[MainApp] Using window icon: ${iconPath}`)
    } else {
      console.warn(`[MainApp] Icon file not found: ${iconPath}`)
    }

    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      icon: windowIcon,
      webPreferences: {
        nodeIntegration: false,    // Clean browser environment
        contextIsolation: true,     // Enable for security
        preload: PRELOAD_PATH,
        webSecurity: true,          // Must be true for preload contextBridge to work
        partition: 'persist:lama'   // Use persistent partition for IndexedDB
      },
      title: 'LAMA',
      backgroundColor: '#0a0a0a',
      show: false,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 20, y: 20 }
    })
    
    // Set global reference for IPC handlers to use
    global.mainWindow = this.mainWindow

    // Initialize IPC controller with window
    ipcController.initialize(this.mainWindow)

    // Load the app - follows standard electron-vite pattern
    // Dev mode: use ELECTRON_RENDERER_URL (set by electron-vite dev)
    // Production/built: load from built files at out/renderer/index.html
    if (DEV_SERVER_URL) {
      this.mainWindow.loadURL(DEV_SERVER_URL)
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(path.join(RENDERER_PATH, 'index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show()
    })

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
      global.mainWindow = null
    })
  }

  async start(): Promise<any> {
    console.log('[MainApp] Starting application...')

    // Create main window FIRST so user sees the app immediately
    this.createWindow()
    console.log('[MainApp] Window created, initializing services in background...')

    // Initialize core services in background (don't block window display)
    // Using setImmediate to yield to event loop and let window render
    setImmediate(async () => {
      try {
        await this.initialize()
        console.log('[MainApp] Background initialization complete')
      } catch (error) {
        console.error('[MainApp] Background initialization failed:', error)
        // App is still usable, just without some features
      }
    })

    console.log('[MainApp] Application started')
  }

  async shutdown(): Promise<any> {
    console.log('[MainApp] Shutting down...')

    // Shutdown Inference Manager
    try {
      const inferenceManager = getInferenceManager()
      if (inferenceManager.initialized) {
        await inferenceManager.shutdown()
      }
    } catch (error) {
      console.error('[MainApp] Error shutting down Inference Manager:', error)
    }

    // Shutdown LLM Manager
    try {
      await llmManager.shutdown()
    } catch (error) {
      console.error('[MainApp] Error shutting down LLM Manager:', error)
    }

    // Shutdown IPC
    if (ipcController && ipcController.shutdown) {
      ipcController.shutdown()
    }

    // Deprovision Node instance if provisioned
    if (nodeProvisioning && nodeProvisioning.isProvisioned && nodeProvisioning.isProvisioned()) {
      await nodeProvisioning.deprovision()
    }

    // Reset the application state
    this.reset()

    console.log('[MainApp] Shutdown complete')
  }

  getMainWindow(): any {
    return this.mainWindow
  }

  /**
   * Reinitialize the application after data clear (for dev mode)
   * In dev mode, we can't use app.relaunch() because the Vite dev server
   * won't be available to the relaunched process.
   *
   * NOTE: We don't call initialize() again because IPC handlers are already
   * registered and Electron throws if you try to register them twice.
   * We just reset the node state - the renderer will reload and re-login.
   */
  async reinitialize(): Promise<void> {
    console.log('[MainApp] Reinitializing application for dev mode...')

    // Reset provisioning state so user can login fresh
    nodeProvisioning.resetProvisioningState()

    // Reset our internal state
    this.initialized = false

    console.log('[MainApp] Reinitialization complete - renderer will reload')
  }

  async getState(): Promise<any> {
    // State is now managed by ONE.CORE instances
    if (nodeProvisioning.isProvisioned()) {
      return nodeInstance.models?.state?.getAll() || {};
    }
    return {};
  }
}

// Export singleton instance
export default new MainApplication();