// Initialize timestamped logging FIRST before any other imports
import './utils/logger.js';

import { app, BrowserWindow, ipcMain, session, Menu, nativeImage, nativeTheme } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';

// Type augmentation for global object
declare global {
  var lamaConfig: LamaConfig | undefined;
}

// Import the shared clear data function
import { clearAppDataShared, setMainWindow as setClearDataMainWindow } from './utils/clear-app-data.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared path resolution (standard electron-vite conventions)
import { appPaths } from './utils/app-paths.js';

const { renderer: RENDERER_PATH, preload: PRELOAD_PATH, assets: ASSETS_PATH } = appPaths;

// Import the main application
import mainApp from './app.js';
import { autoInitialize } from './startup/auto-init.js';
import ipcLogger from './utils/ipc-logger.js';
import { loadConfig, type LamaConfig } from './config/lama-config.js';
import ipcController from './ipc/controller.js';
import nodeProvisioning from './services/node-provisioning.js';

// Set app name
app.setName('LAMA');

// Enable WebGPU in Web Workers for TTS acceleration
app.commandLine.appendSwitch('enable-features', 'Vulkan,WebGPU,WebGPUService');
app.commandLine.appendSwitch('enable-unsafe-webgpu');  // Allow WebGPU in Workers

// Single instance lock - prevent multiple instances from running
// This is critical for proper reset/relaunch behavior
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running, quitting this one');
  app.quit();
  // Must use process.exit to stop execution immediately
  // app.quit() is async and code below would still run
  process.exit(0);
}

console.log('[Main] Starting LAMA instance with PID:', process.pid);

// Handle second instance attempts - focus existing window
app.on('second-instance', (event, commandLine, workingDirectory) => {
  console.log('[Main] Second instance attempted, focusing existing window');
  // Focus the main window if it exists
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Handle EPIPE errors gracefully (when renderer disconnects unexpectedly)
process.on('uncaughtException', (error: any) => {
  if (error.code === 'EPIPE' || (error.message && error.message.includes('EPIPE'))) {
    // Ignore EPIPE errors - these happen when renderer closes while main is writing
    // Use process.stderr.write to avoid potential console issues
    try {
      process.stderr.write('[Main] Caught EPIPE error - renderer disconnected\n');
    } catch (e) {
      // Even stderr might fail, just ignore
    }
    return;
  }
  // For other uncaught exceptions, log and exit gracefully
  console.error('[Main] Uncaught exception:', error);
  console.error(error.stack);
  // Don't re-throw in production, just exit gracefully
  if (process.env.NODE_ENV === 'production') {
    app.quit();
  } else {
    // In development, allow the error to be seen but don't crash
    console.error('[Main] Development mode - continuing despite error');
  }
});

// Also handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Track all child processes for this instance
const childProcesses = new Set<ChildProcess>();

// Clean up on process exit
process.on('exit', () => {
  console.log(`[Main-${process.pid}] Process exiting, cleaning up child processes...`);
  // Kill any remaining child processes
  childProcesses.forEach((child: ChildProcess) => {
    try {
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
    } catch (e) {
      // Process might already be gone
    }
  });
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log(`[Main-${process.pid}] Received SIGTERM, closing gracefully...`);
  app.quit();
});

process.on('SIGINT', () => {
  console.log(`[Main-${process.pid}] Received SIGINT, closing gracefully...`);
  app.quit();
});

let mainWindow: BrowserWindow | null = null;
let viteProcess: ChildProcess | null = null;

function createWindow(): void {
  // Use PNG for better compatibility, platform-specific icons can be set separately
  const iconPath = path.join(ASSETS_PATH, 'icons', 'icon-512.png');

  // Check if icon file exists, fallback to no icon if not found
  let windowIcon: string | undefined = undefined;
  if (fs.existsSync(iconPath)) {
    windowIcon = iconPath;
    console.log(`Using window icon: ${iconPath}`);
  } else {
    console.warn(`Icon file not found: ${iconPath}`);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: windowIcon,
    webPreferences: {
      nodeIntegration: false,  // Disable Node in renderer for cleaner browser environment
      contextIsolation: true,   // Enable context isolation for security
      preload: PRELOAD_PATH,
      webSecurity: true,  // Must be true for preload to work
      partition: 'persist:lama'  // Use persistent partition for IndexedDB
    },
    title: 'LAMA',
    backgroundColor: '#0a0a0a',
    show: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 }
  });

  // Set up IPC logger to send Node logs to browser
  ipcLogger.setMainWindow(mainWindow);
  ipcLogger.enable(); // Enable to debug welcome message generation

  // Update IPC controller with the main window
  ipcController.setMainWindow(mainWindow!);

  // Update clear data module with the main window
  setClearDataMainWindow(mainWindow);
  
  // In development, load from Vite dev server
  if (process.env.NODE_ENV !== 'production') {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
    mainWindow?.loadURL(rendererUrl);
    
    // Workaround: Inject electronAPI after page loads when webSecurity is disabled
    mainWindow?.webContents.once('dom-ready', () => {
      console.log('[Main] Injecting electronAPI workaround for dev mode...');
      mainWindow?.webContents.executeJavaScript(`
        if (!window.electronAPI) {
          console.warn('[Injection] electronAPI not found, this indicates preload issues with webSecurity:false');
          // The preload should have set this up, but with webSecurity:false it doesn't work
          // This is a dev-only workaround
        }
      `);
    });
    
    mainWindow?.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow?.loadFile(path.join(RENDERER_PATH, 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // AUTO-LOGIN FOR TESTING FEDERATION
  if (process.env.AUTO_LOGIN === 'true') {
    mainWindow?.webContents.once('did-finish-load', async () => {
      console.log('[AutoLogin] Page loaded, waiting for DOM elements...')

      // Poll for login form elements instead of arbitrary delay
      const waitForLoginForm = async () => {
        const result = await mainWindow?.webContents.executeJavaScript(`
          (function() {
            const usernameInput = document.querySelector('input[name="username"]')
            const passwordInput = document.querySelector('input[type="password"]')
            const loginButton = document.querySelector('button[type="submit"]')
            return usernameInput && passwordInput && loginButton
          })()
        `);

        if (result) {
          console.log('[AutoLogin] Login form found, attempting automatic login...')
          mainWindow?.webContents.executeJavaScript(`
            (async () => {
              console.log('[AutoLogin] Filling login form...')
              const usernameInput = document.querySelector('input[name="username"]')
              const passwordInput = document.querySelector('input[type="password"]')
              const loginButton = document.querySelector('button[type="submit"]')

              usernameInput.value = 'testuser'
              passwordInput.value = 'testpass123'
              usernameInput.dispatchEvent(new Event('input', { bubbles: true }))
              passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

              // Wait for next tick to ensure React state updates
              await new Promise(resolve => requestAnimationFrame(resolve))
              loginButton.click()
              return 'Login triggered'
            })()
          `).then(result => console.log('[AutoLogin]', result))
        } else {
          console.log('[AutoLogin] Login form not ready, retrying...')
          setTimeout(waitForLoginForm, 100)
        }
      };

      waitForLoginForm()
    })
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null;
    setClearDataMainWindow(null);
  });
}

function startViteServer(): Promise<void> {
  return new Promise<void>((resolve) => {
    // Check if server is already running
    http.get('http://localhost:5176', (res: any) => {
      console.log('Vite server already running');
      resolve();
    }).on('error', () => {
      // Start Vite server
      console.log(`[Main-${process.pid}] Starting Vite dev server...`);
      // __dirname is dist/ after compilation, go up one level to project root
      const projectRoot = path.join(__dirname, '..');
      viteProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(projectRoot, 'electron-ui'),
        shell: true,
        stdio: 'pipe',
        env: { ...process.env }
      });

      // Track this child process
      childProcesses.add(viteProcess);

      // Remove from tracking when it exits
      if (viteProcess) {
        viteProcess.on('exit', () => {
          childProcesses.delete(viteProcess!);
          console.log(`[Main-${process.pid}] Vite process exited`);
        });
      }

      viteProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        if (output.includes('Local:')) {
          console.log('Vite server ready, verifying with HTTP health check...');
          // Verify server is actually responding instead of arbitrary delay
          const checkServer = async () => {
            try {
              const response = await fetch('http://localhost:5176');
              if (response.ok) {
                console.log('Vite server verified and responding');
                resolve();
              } else {
                throw new Error(`Server returned ${response.status}`);
              }
            } catch (error) {
              console.log('Server not ready yet, retrying...');
              setTimeout(checkServer, 100);
            }
          };
          checkServer();
        }
      });

      viteProcess.stderr?.on('data', (data) => {
        console.error(`Vite error: ${data}`);
      });
    });
  });
}

// Handle browser console logs
ipcMain.on('browser-log', (event: Electron.IpcMainEvent, level: string, message: string) => {
  console.log(`[Browser ${level}]`, message);
});

app.whenReady().then(async () => {
  // Load configuration from environment variables and config files
  console.log('[Main] Loading LAMA configuration...');
  global.lamaConfig = await loadConfig();
  console.log('[Main] Configuration loaded successfully');

  // Set dock icon and custom menu for macOS after app is ready
  if (process.platform === 'darwin') {
    // Use PNG icons: lama-512.png for light mode, lamaFilled-512.png for dark mode
    const setDockIcon = () => {
      const isDark = nativeTheme.shouldUseDarkColors;
      const iconName = isDark ? 'lamaFilled-512.png' : 'lama-512.png';
      const iconPath = path.join(ASSETS_PATH, 'icons', iconName);

      if (fs.existsSync(iconPath)) {
        try {
          const icon = nativeImage.createFromPath(iconPath);
          app.dock.setIcon(icon);
          console.log(`Dock icon set successfully: ${iconPath}`);
        } catch (error) {
          console.warn('Failed to set dock icon:', error instanceof Error ? error.message : String(error));
        }
      } else {
        console.warn(`Dock icon file not found: ${iconPath}`);
      }
    };

    // Set initial dock icon
    setDockIcon();

    // Update dock icon when system theme changes
    nativeTheme.on('updated', setDockIcon);

    // Create custom application menu with "LAMA" as the app name
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'LAMA',
        submenu: [
          { role: 'about', label: 'About LAMA' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide', label: 'Hide LAMA' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', label: 'Quit LAMA' }
        ]
      },
      {
        label: 'File',
        submenu: [
          { role: 'close' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  // CRITICAL: Register IPC handlers IMMEDIATELY, before anything creates a window
  // This prevents "No handler registered" errors if window is created during auto-init
  ipcController.initialize(null); // Window will be set later by mainApp.start() or createWindow()
  console.log('[Main] IPC handlers registered early');

  // Note: electron-vite handles the renderer dev server automatically
  // No need to start a separate Vite server in development mode

  // Start the main application FIRST to show window immediately
  try {
    await mainApp.start();
    // Sync local mainWindow with mainApp's window
    mainWindow = mainApp.getMainWindow();
    setClearDataMainWindow(mainWindow);
    console.log('Main application started successfully');
  } catch (error) {
    console.error('Failed to start main application:', error);
    // Still create window even if initialization fails
    createWindow();
  }

  // Try to auto-initialize instances in background (non-blocking)
  setImmediate(async () => {
    try {
      const initResult = await autoInitialize();
      if (initResult.recovered) {
        console.log('Auto-recovered existing ONE.core instances');
      } else if (initResult.needsSetup) {
        console.log('Need to set up ONE.core instances via UI');
      }
    } catch (error) {
      console.error('Auto-initialization error:', error);
    }
  });
});

app.on('window-all-closed', () => {
  console.log(`[Main-${process.pid}] All windows closed for this instance`);

  // Clean up this instance's Vite process
  if (viteProcess) {
    console.log(`[Main-${process.pid}] Killing Vite process...`);
    viteProcess.kill('SIGTERM');
  }

  // Quit on all platforms when window closes
  console.log(`[Main-${process.pid}] Quitting application...`);

  // Force shutdown after brief cleanup period
  // This ensures the app exits even if there are lingering timers/intervals
  setTimeout(() => {
    console.log(`[Main-${process.pid}] Force exiting...`);
    process.exit(0);
  }, 500);

  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  console.log(`[Main-${process.pid}] App instance is quitting, cleaning up...`);
  
  if (viteProcess) {
    viteProcess.kill();
  }
  
  // Shutdown main application
  if (mainApp && mainApp.shutdown) {
    await mainApp.shutdown();
  }
});

// IPC handlers for native features
ipcMain.handle('create-udp-socket', async (event: Electron.IpcMainInvokeEvent, options: any) => {
  // Placeholder for UDP socket creation
  console.log('Creating UDP socket:', options);
  return { id: 'socket-' + Date.now() };
});

// Crypto handlers are now registered via IPCController

// Handler for clearing app data - uses shared function from utils
ipcMain.handle('app:clearData', async (event: Electron.IpcMainInvokeEvent) => {
  return await clearAppDataShared();
});

// Auto-login test function for debugging
async function autoLoginTest(): Promise<void> {
  setTimeout(async () => {
    console.log('[AutoLogin] Triggering login with demo/demo...')
    try {
      const result = await nodeProvisioning.provision({
        user: {
          name: 'demo',
          password: 'demo'
        }
      })
      console.log('[AutoLogin] Provision result:', JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('[AutoLogin] Error:', error)
    }
  }, 5000)
}

// Uncomment to enable auto-login for testing
// autoLoginTest();