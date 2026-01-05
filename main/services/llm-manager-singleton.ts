/**
 * LLM Manager Singleton
 *
 * Creates a single instance of lama.core's LLMManager with Electron-specific dependencies.
 * This is the ONLY llm-manager instance used throughout the application.
 */

import { LLMManager } from '@lama/core/services/llm-manager.js'
import { ElectronLLMPlatform } from '../../adapters/electron-llm-platform.js'
import mcpManager from './mcp-manager.js'
import electron from 'electron'

const { BrowserWindow } = electron

/**
 * Get the main window (may not exist at module load time)
 */
function getMainWindow(): electron.BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] || null
}

/**
 * Forward logs to renderer process for debugging
 */
function forwardLog(level: string, message: string): void {
  try {
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('main-process-log', {
        level,
        message,
        timestamp: Date.now()
      })
    }
  } catch (e) {
    // No main window available
  }
}

/**
 * Create Electron-specific LLM platform for local model inference
 * Uses getMainWindow() since window may not exist at module load time
 */
const electronLLMPlatform = new ElectronLLMPlatform(getMainWindow)

/**
 * Create singleton instance of lama.core's LLMManager with Electron dependencies
 */
const llmManager = new LLMManager(
  electronLLMPlatform,  // Platform for local model inference (TransformersAdapter)
  mcpManager,           // MCP manager for tool integration
  forwardLog            // Log forwarding to renderer
)

export default llmManager
