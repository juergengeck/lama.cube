#!/usr/bin/env node
// Quick test script to trigger pairing via Electron's main process

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We can't directly call IPC from here, but we can use Electron's remote debugging
// For now, let's just output instructions

console.log('To test pairing:');
console.log('1. In Electron app, go to Devices view');
console.log('2. Click "Add Device" or "Pair Device" button');
console.log('3. Copy the invitation URL');
console.log('4. Open Chrome and navigate to that URL');
console.log('5. Watch both console outputs for [PairingManager] logs');
console.log('');
console.log('Or use the IPC directly via DevTools:');
console.log('  window.electronAPI.invoke("connection:createPairingInvitation", "IoP")');
