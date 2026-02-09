/**
 * Baileys IPC Handlers (WhatsApp Integration)
 *
 * Maps Electron IPC calls to BaileysModule plans.
 * Handles QR code display, pairing code auth, and message sending.
 */

import type { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { getModuleRegistry } from '../../registry/module-registry-init.js';
import type { BaileysModule } from '@refinio/lama.core/modules/BaileysModule.js';

/**
 * Get BaileysModule from ModuleRegistry
 */
function getBaileysModule(): BaileysModule {
    const registry = getModuleRegistry();
    if (!registry) {
        throw new Error('[Baileys IPC] ModuleRegistry not initialized');
    }

    const baileysModule = registry.getModule<BaileysModule>('BaileysModule');
    if (!baileysModule) {
        throw new Error('[Baileys IPC] BaileysModule not available');
    }

    return baileysModule;
}

/**
 * Connect to WhatsApp
 * Returns QR code or pairing code for authentication
 */
/**
 * Confirm import — user has selected chats in filter mode, flush buffered messages
 */
async function confirmImport(event: IpcMainInvokeEvent) {
    console.log('[Baileys IPC] confirmImport called');

    try {
        const baileysModule = getBaileysModule();
        await baileysModule.confirmImport();
        return { success: true };
    } catch (error) {
        console.error('[Baileys IPC] confirmImport error:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Set enabled state for a chat (controls content import)
 */
async function setChatEnabled(
    event: IpcMainInvokeEvent,
    params: { chatJid: string; enabled: boolean }
): Promise<{ success: boolean; error?: string }> {
    console.log('[Baileys IPC] setChatEnabled called, chatJid:', params.chatJid?.substring(0, 12) + '...', 'enabled:', params.enabled);

    if (!params.chatJid) {
        return { success: false, error: 'chatJid is required' };
    }

    try {
        const baileysModule = getBaileysModule();
        await baileysModule.setChatEnabled(params.chatJid, params.enabled);
        return { success: true };
    } catch (error) {
        console.error('[Baileys IPC] setChatEnabled error:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Connect to WhatsApp
 * Returns QR code or pairing code for authentication
 */
async function connect(
    event: IpcMainInvokeEvent,
    params: { useQR?: boolean; phoneNumber?: string; forceNewSession?: boolean; filterMode?: boolean } = {}
) {
    console.log('[Baileys IPC] 📱 connect called, useQR:', params.useQR ?? true);

    // Emit log event immediately so UI shows activity
    const window = global.mainWindow;
    console.log('[Baileys IPC] mainWindow available:', !!window, 'destroyed:', window?.isDestroyed());
    if (window && !window.isDestroyed()) {
        console.log('[Baileys IPC] 📤 Sending baileys:log to renderer');
        window.webContents.send('baileys:log', {
            level: 'info',
            message: 'Initiating WhatsApp connection...',
            timestamp: Date.now()
        });
    }

    try {
        const baileysModule = getBaileysModule();

        // Set filter mode before connecting (affects chat preference defaults)
        if (params.filterMode !== undefined) {
            baileysModule.setFilterMode(params.filterMode);
        }

        console.log('[Baileys IPC] Got BaileysModule, calling connectionPlan.connect...');

        const result = await baileysModule.connectionPlan.connect(params);

        console.log('[Baileys IPC] connect result:', {
            success: result.success,
            hasQR: !!result.qrCode,
            qrCodeLength: result.qrCode?.length,
            hasPairingCode: !!result.pairingCode,
            error: result.error
        });

        return result;
    } catch (error) {
        console.error('[Baileys IPC] connect error:', error);
        // Send error to UI
        const errorWindow = global.mainWindow;
        if (errorWindow && !errorWindow.isDestroyed()) {
            errorWindow.webContents.send('baileys:log', {
                level: 'error',
                message: `Connection error: ${(error as Error).message}`,
                timestamp: Date.now()
            });
        }
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Wait for connection to complete (with timeout)
 */
async function waitForConnection(
    event: IpcMainInvokeEvent,
    params: { timeoutMs?: number } = {}
) {
    console.log('[Baileys IPC] ⏳ waitForConnection called');

    const baileysModule = getBaileysModule();
    return await baileysModule.connectionPlan.waitForConnection(params.timeoutMs);
}

/**
 * Disconnect from WhatsApp (preserves session for auto-reconnect)
 */
async function disconnect(event: IpcMainInvokeEvent) {
    console.log('[Baileys IPC] 📴 disconnect called (preserving session)');

    const baileysModule = getBaileysModule();
    return await baileysModule.connectionPlan.disconnect();
}

/**
 * Unlink device from WhatsApp — destructive, requires new QR scan
 */
async function unlink(event: IpcMainInvokeEvent) {
    console.log('[Baileys IPC] 🔓 unlink called (removing device)');

    const baileysModule = getBaileysModule();
    return await baileysModule.connectionPlan.unlink();
}

/**
 * Get connection status (includes persisted status from ONE.core)
 */
async function getStatus(event: IpcMainInvokeEvent) {
    const baileysModule = getBaileysModule();
    const liveStatus = await baileysModule.connectionPlan.getStatus();
    const persistedStatus = baileysModule.getWhatsAppStatus();

    console.log('[Baileys IPC] getStatus: live.connected=%s, persisted.connected=%s',
        liveStatus.connected, persistedStatus?.connected);

    return {
        ...liveStatus,
        filterMode: baileysModule.isFilterMode(),
        // Always include persisted stats (useful both when connected and disconnected)
        ...(persistedStatus ? {
            phoneNumber: liveStatus.phoneNumber || persistedStatus.phoneNumber,
            lastConnectedAt: persistedStatus.lastConnectedAt,
            lastDisconnectedAt: persistedStatus.lastDisconnectedAt,
            disconnectReason: liveStatus.connected ? undefined : persistedStatus.disconnectReason,
            contactsCount: persistedStatus.contactsCount,
            chatsCount: persistedStatus.chatsCount,
            messagesCount: persistedStatus.messagesCount,
            earliestMessageAt: persistedStatus.earliestMessageAt,
            latestMessageAt: persistedStatus.latestMessageAt
        } : {})
    };
}

/**
 * Request pairing code (for phone number authentication)
 */
async function requestPairingCode(
    event: IpcMainInvokeEvent,
    params: { phoneNumber: string }
) {
    console.log('[Baileys IPC] 🔢 requestPairingCode called');

    if (!params.phoneNumber) {
        return { success: false, error: 'Phone number is required' };
    }

    const baileysModule = getBaileysModule();
    return await baileysModule.connectionPlan.requestPairingCode(params.phoneNumber);
}

/**
 * Get current QR code (if available)
 */
async function getQRCode(event: IpcMainInvokeEvent) {
    const baileysModule = getBaileysModule();
    const qr = baileysModule.connectionPlan.getQRCode();
    return { success: true, qrCode: qr };
}

/**
 * Get current pairing code (if available)
 */
async function getPairingCode(event: IpcMainInvokeEvent) {
    const baileysModule = getBaileysModule();
    const code = baileysModule.connectionPlan.getPairingCode();
    return { success: true, pairingCode: code };
}

/**
 * Send a message via WhatsApp
 */
async function sendMessage(
    event: IpcMainInvokeEvent,
    params: { topicId: string; text: string }
) {
    console.log('[Baileys IPC] 📨 sendMessage called, topicId:', params.topicId?.substring(0, 8) + '...');

    if (!params.topicId || !params.text) {
        return { success: false, error: 'topicId and text are required' };
    }

    const baileysModule = getBaileysModule();
    return await baileysModule.messagePlan.sendMessage(params);
}

/**
 * Send a message directly to a WhatsApp JID
 */
async function sendMessageToJid(
    event: IpcMainInvokeEvent,
    params: { jid: string; text: string }
) {
    console.log('[Baileys IPC] 📨 sendMessageToJid called, jid:', params.jid?.substring(0, 12) + '...');

    if (!params.jid || !params.text) {
        return { success: false, error: 'jid and text are required' };
    }

    const baileysModule = getBaileysModule();
    return await baileysModule.messagePlan.sendMessageToJid(params.jid, params.text);
}

/**
 * Get all WhatsApp chats with their contact import preferences
 */
async function getChats(event: IpcMainInvokeEvent): Promise<{
    success: boolean;
    chats?: Array<{
        chatJid: string;
        chatName?: string;
        isGroup: boolean;
        importContacts: boolean;
        enabled: boolean;
    }>;
    error?: string;
}> {
    console.log('[Baileys IPC] 📋 getChats called');

    try {
        const baileysModule = getBaileysModule();
        const chats = await baileysModule.getWhatsAppChats();
        return { success: true, chats };
    } catch (error) {
        console.error('[Baileys IPC] getChats error:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Set contact import preference for a WhatsApp chat
 */
async function setChatPreference(
    event: IpcMainInvokeEvent,
    params: { chatJid: string; importContacts: boolean }
): Promise<{ success: boolean; error?: string }> {
    console.log('[Baileys IPC] ⚙️ setChatPreference called, chatJid:', params.chatJid?.substring(0, 12) + '...', 'importContacts:', params.importContacts);

    if (!params.chatJid) {
        return { success: false, error: 'chatJid is required' };
    }

    try {
        const baileysModule = getBaileysModule();
        await baileysModule.setChatPreference(params.chatJid, params.importContacts);
        return { success: true };
    } catch (error) {
        console.error('[Baileys IPC] setChatPreference error:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Setup event forwarding to renderer
 * Called during module initialization to wire BaileysModule events to the UI
 */
export function setupBaileysEventForwarding(getWindow: () => BrowserWindow | null): void {
    try {
        const baileysModule = getBaileysModule();

        // Forward QR code events
        baileysModule.onQRCode.listen((qr) => {
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:qrCode', { qr });
            }
        });

        baileysModule.onQRCodeBase64.listen((qrBase64) => {
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:qrCodeBase64', { qrBase64 });
            }
        });

        // Forward pairing code events
        baileysModule.onPairingCode.listen((code) => {
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:pairingCode', { code });
            }
        });

        // Forward connection state changes
        baileysModule.onConnectionChanged.listen((connected) => {
            console.log('[Baileys IPC] 🔗 Connection changed:', connected);
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                console.log('[Baileys IPC] Sending baileys:connectionChanged to renderer');
                window.webContents.send('baileys:connectionChanged', { connected });
            } else {
                console.warn('[Baileys IPC] Window not available for connectionChanged event');
            }
        });

        // Forward message received events
        baileysModule.onMessageReceived.listen((topicId) => {
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:messageReceived', { topicId });
            }
        });

        // Forward new topic events (triggers UI refresh in useTopics)
        baileysModule.onNewTopic.listen((topicId) => {
            console.log('[Baileys IPC] 🆕 New topic created, forwarding to UI:', topicId);
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('newTopic', { topicId });
            }
        });

        // Forward error events
        baileysModule.onError.listen((error) => {
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:error', { error: error.message });
            }
        });

        // Forward log events
        baileysModule.onLog.listen((entry) => {
            console.log('[Baileys IPC] 📝 Forwarding log to UI:', entry.message);
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:log', entry);
            } else {
                console.warn('[Baileys IPC] Cannot forward log - window not available');
            }
        });

        // Forward sync stats events
        baileysModule.onSyncStats.listen((stats) => {
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:syncStats', stats);
            }
        });

        // Forward import progress events
        baileysModule.onImportProgress.listen((progress) => {
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:importProgress', progress);
            }
        });

        // Forward chats discovered events (for filter mode UI)
        baileysModule.onChatsDiscovered.listen((chats) => {
            console.log('[Baileys IPC] Chats discovered, forwarding to UI:', chats.length);
            const window = getWindow();
            if (window && !window.isDestroyed()) {
                window.webContents.send('baileys:chatsDiscovered', { chats });
            }
        });

        console.log('[Baileys IPC] Event forwarding setup complete');
    } catch (error) {
        console.warn('[Baileys IPC] Event forwarding setup skipped - module not available yet');
    }
}

export default {
    connect,
    waitForConnection,
    disconnect,
    unlink,
    getStatus,
    requestPairingCode,
    getQRCode,
    getPairingCode,
    sendMessage,
    sendMessageToJid,
    getChats,
    setChatPreference,
    setChatEnabled,
    confirmImport
};
