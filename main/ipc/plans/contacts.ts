/**
 * Contact Management IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to ContactsHandler methods.
 * Business logic lives in ../../../lama.core/handlers/ContactsHandler.ts
 */

import electron from 'electron';
const { ipcMain, BrowserWindow } = electron;
import nodeOneCore from '../../core/node-one-core.js';
import { ContactsPlan } from '@chat/core/plans/ContactsPlan.js';
import type { IpcMainInvokeEvent } from 'electron';

// Create plan instance with Electron-specific dependencies
const contactsPlan = new ContactsPlan(nodeOneCore);

interface PersonInfo {
  name: string;
  email: string;
}

/**
 * Register contact management IPC handlers
 */
export function registerContactPlans() {
  // Get all contacts with trust status
  ipcMain.handle('contacts:list-with-trust', async (): Promise<any> => {
    return await contactsPlan.getContactsWithTrust();
  });

  // Get all contacts
  ipcMain.handle('contacts:list', async (): Promise<any> => {
    const response = await contactsPlan.getContacts();

    // Enrich contacts with LLM metadata (same as getConversations)
    if (response.success && response.contacts && nodeOneCore.aiAssistantModel) {
      try {
        response.contacts = response.contacts.map((contact: any) => {
          const isAI = nodeOneCore.aiAssistantModel.isAIPerson(contact.id);
          return {
            ...contact,
            isAI,
            isLLM: isAI  // Backward compatibility
          };
        });
      } catch (error) {
        console.error('[ContactsIPC] Error enriching contacts with LLM info:', error);
      }
    }

    return response;
  });

  // Get pending contacts for review
  ipcMain.handle('contacts:pending:list', async (): Promise<any> => {
    return await contactsPlan.getPendingContacts();
  });

  // Get specific pending contact details
  ipcMain.handle('contacts:pending:get', async (event: IpcMainInvokeEvent, pendingId: string): Promise<any> => {
    return await contactsPlan.getPendingContact(pendingId);
  });

  // Accept a contact (update trust level)
  ipcMain.handle('contacts:accept', async (event: IpcMainInvokeEvent, personId: string, options: any = {}): Promise<any> => {
    return await contactsPlan.acceptContact(personId, options);
  });

  // Block a contact
  ipcMain.handle('contacts:block', async (event: IpcMainInvokeEvent, personId: string, reason: string): Promise<any> => {
    return await contactsPlan.blockContact(personId, reason);
  });

  // Legacy: Accept a pending contact (for backward compatibility)
  ipcMain.handle('contacts:pending:accept', async (event: IpcMainInvokeEvent, pendingId: string, options: any = {}): Promise<any> => {
    // This is now handled through trust manager
    return { success: false, error: 'Use contacts:accept instead' };
  });

  // Reject a pending contact
  ipcMain.handle('contacts:pending:reject', async (event: IpcMainInvokeEvent, pendingId: string, reason: string): Promise<any> => {
    return await contactsPlan.rejectContact(pendingId, reason);
  });

  // Add contact
  ipcMain.handle('contacts:add', async (event: IpcMainInvokeEvent, personInfo: PersonInfo): Promise<any> => {
    return await contactsPlan.addContact(personInfo);
  });

  // Remove contact
  ipcMain.handle('contacts:remove', async (event: IpcMainInvokeEvent, contactId: string): Promise<any> => {
    return await contactsPlan.removeContact(contactId);
  });

  // Revoke contact's VC
  ipcMain.handle('contacts:revoke', async (event: IpcMainInvokeEvent, personId: string): Promise<any> => {
    return await contactsPlan.revokeContactVC(personId);
  });

  // Upload avatar image
  ipcMain.handle('contacts:uploadAvatar', async (event: IpcMainInvokeEvent, request: { dataUrl: string }): Promise<any> => {
    return await contactsPlan.uploadAvatar(request);
  });

  // Get profile for a contact
  ipcMain.handle('contacts:getProfile', async (event: IpcMainInvokeEvent, request: { personId: string }): Promise<any> => {
    return await contactsPlan.getProfile(request);
  });

  // Get all profiles for a Someone contact
  ipcMain.handle('contacts:getProfilesForSomeone', async (event: IpcMainInvokeEvent, request: { personId: string }): Promise<any> => {
    return await contactsPlan.getProfilesForSomeone(request);
  });

  // Update profile for a contact
  ipcMain.handle('contacts:updateProfile', async (event: IpcMainInvokeEvent, request: any): Promise<any> => {
    return await contactsPlan.updateProfile(request);
  });

  // Get avatar as data URL from blob hash
  ipcMain.handle('contacts:getAvatarDataUrl', async (event: IpcMainInvokeEvent, request: { blobHash: string }): Promise<any> => {
    return await contactsPlan.getAvatarDataUrl(request);
  });

  // Get lama avatar config for rendering client-side
  ipcMain.handle('contacts:getLamaAvatarConfig', async (event: IpcMainInvokeEvent, request: { personId: string; name?: string }): Promise<any> => {
    return await contactsPlan.getLamaAvatarConfig(request);
  });

  // Save lama avatar config
  ipcMain.handle('contacts:saveLamaAvatarConfig', async (event: IpcMainInvokeEvent, request: { personId: string; name?: string; lamaConfig: any }): Promise<any> => {
    return await contactsPlan.saveLamaAvatarConfig(request);
  });

  // Listen for pending contact events and forward to renderer (Electron-specific)
  if (nodeOneCore.quicTransport?.leuteModel) {
    nodeOneCore.quicTransport.leuteModel.on('pending-contact', (data: any) => {
      // Send to all windows
      BrowserWindow.getAllWindows().forEach((window: any) => {
        window.webContents.send('contacts:pending:new', data);
      });
    });

    nodeOneCore.quicTransport.leuteModel.on('contact-accepted', (data: any) => {
      BrowserWindow.getAllWindows().forEach((window: any) => {
        window.webContents.send('contacts:accepted', data);
      });
    });

    nodeOneCore.quicTransport.leuteModel.on('dedicated-vc-received', (data: any) => {
      BrowserWindow.getAllWindows().forEach((window: any) => {
        window.webContents.send('contacts:vc:received', data);
      });
    });
  }
}
export { contactsPlan };
