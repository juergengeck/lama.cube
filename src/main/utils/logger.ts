/**
 * Timestamped logger using pino with file output
 * Import this early in the main process to add timestamps to all logs
 */

import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Get log directory - use Electron's log path or fallback
const getLogPath = (): string => {
  try {
    // app.getPath('logs') returns platform-specific log directory
    // Linux: ~/.config/{app name}/logs
    // macOS: ~/Library/Logs/{app name}
    // Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs
    const logsDir = app.getPath('logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  } catch {
    // Fallback if app isn't ready yet
    const fallbackDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
};

const logDir = getLogPath();
const logFile = path.join(logDir, `lama-${new Date().toISOString().split('T')[0]}.log`);

// Create pino transport with multiple targets
const transport = pino.transport({
  targets: [
    // File transport - JSON format for machine parsing
    {
      target: 'pino/file',
      options: { destination: logFile },
      level: 'trace'
    },
    // Pretty print to stdout
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
        sync: true // Use sync mode to avoid worker thread issues in Electron
      },
      level: 'trace'
    }
  ]
});

// Create the logger
const logger = pino({
  level: 'trace',
  base: { pid: process.pid }, // Include PID for multi-process debugging
}, transport);

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

// Track startup time
const startTime = Date.now();

function formatMessage(args: unknown[]): string {
  return args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }).join(' ');
}

// Patch console methods to use pino
console.log = (...args: unknown[]) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
  logger.info({ elapsed: `+${elapsed}s` }, formatMessage(args));
};

console.info = (...args: unknown[]) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
  logger.info({ elapsed: `+${elapsed}s` }, formatMessage(args));
};

console.warn = (...args: unknown[]) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
  logger.warn({ elapsed: `+${elapsed}s` }, formatMessage(args));
};

console.error = (...args: unknown[]) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
  logger.error({ elapsed: `+${elapsed}s` }, formatMessage(args));
};

console.debug = (...args: unknown[]) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
  logger.debug({ elapsed: `+${elapsed}s` }, formatMessage(args));
};

// Export for direct use
export { logger, originalConsole, logFile, logDir };

// Log initialization
logger.info({ logFile }, '[Logger] Pino logging initialized');
