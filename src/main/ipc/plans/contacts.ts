/**
 * Contact Management IPC Handlers (Thin Adapter)
 *
 * Maps Electron IPC calls to ContactsHandler methods.
 * Business logic lives in ../../../lama.core/handlers/ContactsHandler.ts
 *
 * IMPORTANT: This module's registerContactPlans() must only be called
 * AFTER NodeOneCore is initialized. The IPC controller handles this
 * via demand/supply initialization order.
 */

import electron from 'electron';
const { ipcMain, BrowserWindow } = electron;
import nodeOneCore from '../../core/node-one-core.js';
import { ContactsPlan } from '@refinio/chat.core/plans/ContactsPlan.js';
import type { IpcMainInvokeEvent } from 'electron';

// Plan instance - recreated automatically when nodeOneCore re-initializes (epoch change)
let contactsPlan: ContactsPlan | null = null;
let contactsPlanEpoch = -1;

/** @deprecated No-op: plan cache invalidates automatically via initEpoch */
export function resetContactsPlanSingleton(): void {}

interface PersonInfo {
  name: string;
  email: string;
}

/**
 * Register contact management IPC handlers
 *
 * PREREQUISITE: NodeOneCore must be initialized before calling this.
 * This is enforced by the IPC controller's demand/supply initialization.
 */
export function registerContactPlans(handle: (channel: string, handler: any) => void) {
  // Verify demand is satisfied
  if (!nodeOneCore.initialized) {
    throw new Error('[ContactsIPC] Cannot register: NodeOneCore not initialized (demand not satisfied)');
  }

  // Create plan instance now that NodeOneCore is ready (epoch-aware)
  if (!contactsPlan || contactsPlanEpoch !== nodeOneCore.initEpoch) {
    contactsPlan = new ContactsPlan(nodeOneCore);
    contactsPlanEpoch = nodeOneCore.initEpoch;
  }

  // Get all contacts with trust status
  handle('contacts:list-with-trust', async (): Promise<any> => {
    return await contactsPlan!.getContactsWithTrust();
  });

  // Get all contacts
  handle('contacts:list', async (): Promise<any> => {
    const response = await contactsPlan!.getContacts();

    // Enrich contacts with LLM metadata (same as getConversations)
    if (response.success && response.contacts && nodeOneCore.aiAssistantModel) {
      try {
        response.contacts = response.contacts.map((contact: any) => {
          const isAI = nodeOneCore.aiAssistantModel.isAIPerson(contact.personId);
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
  handle('contacts:pending:list', async (): Promise<any> => {
    return await contactsPlan!.getPendingContacts();
  });

  // Get specific pending contact details
  handle('contacts:pending:get', async (event: IpcMainInvokeEvent, pendingId: string): Promise<any> => {
    return await contactsPlan!.getPendingContact(pendingId);
  });

  // Accept a contact (update trust level)
  handle('contacts:accept', async (event: IpcMainInvokeEvent, personId: string, options: any = {}): Promise<any> => {
    return await contactsPlan!.acceptContact(personId, options);
  });

  // Block a contact
  handle('contacts:block', async (event: IpcMainInvokeEvent, personId: string, reason: string): Promise<any> => {
    return await contactsPlan!.blockContact(personId, reason);
  });

  // Legacy: Accept a pending contact (for backward compatibility)
  handle('contacts:pending:accept', async (event: IpcMainInvokeEvent, pendingId: string, options: any = {}): Promise<any> => {
    // This is now handled through trust manager
    return { success: false, error: 'Use contacts:accept instead' };
  });

  // Reject a pending contact
  handle('contacts:pending:reject', async (event: IpcMainInvokeEvent, pendingId: string, reason: string): Promise<any> => {
    return await contactsPlan!.rejectContact(pendingId, reason);
  });

  // Add contact
  handle('contacts:add', async (event: IpcMainInvokeEvent, personInfo: PersonInfo): Promise<any> => {
    return await contactsPlan!.addContact(personInfo);
  });

  // Remove contact
  handle('contacts:remove', async (event: IpcMainInvokeEvent, contactId: string): Promise<any> => {
    return await contactsPlan!.removeContact(contactId);
  });

  // Revoke contact's VC
  handle('contacts:revoke', async (event: IpcMainInvokeEvent, personId: string): Promise<any> => {
    return await contactsPlan!.revokeContactVC(personId);
  });

  // Upload avatar image
  handle('contacts:uploadAvatar', async (event: IpcMainInvokeEvent, request: { dataUrl: string }): Promise<any> => {
    return await contactsPlan!.uploadAvatar(request);
  });

  // Get profile for a contact
  handle('contacts:getProfile', async (event: IpcMainInvokeEvent, request: { personId: string }): Promise<any> => {
    return await contactsPlan!.getProfile(request);
  });

  // Get all profiles for a Someone contact
  handle('contacts:getProfilesForSomeone', async (event: IpcMainInvokeEvent, request: { personId: string }): Promise<any> => {
    return await contactsPlan!.getProfilesForSomeone(request);
  });

  // Update profile for a contact
  handle('contacts:updateProfile', async (event: IpcMainInvokeEvent, request: any): Promise<any> => {
    const result = await contactsPlan!.updateProfile(request);

    // If this is updating the owner's name, also update mDNS discovery
    if (result.success && request.name && request.personId === nodeOneCore.ownerId) {
      nodeOneCore.updateDiscoveryDisplayName(request.name);
    }

    return result;
  });

  // Get avatar as data URL from blob hash
  handle('contacts:getAvatarDataUrl', async (event: IpcMainInvokeEvent, request: { blobHash: string }): Promise<any> => {
    return await contactsPlan!.getAvatarDataUrl(request);
  });

  // Get lama avatar config for rendering client-side
  handle('contacts:getLamaAvatarConfig', async (event: IpcMainInvokeEvent, request: { personId: string; name?: string }): Promise<any> => {
    return await contactsPlan!.getLamaAvatarConfig(request);
  });

  // Save lama avatar config
  handle('contacts:saveLamaAvatarConfig', async (event: IpcMainInvokeEvent, request: { personId: string; name?: string; lamaConfig: any }): Promise<any> => {
    return await contactsPlan!.saveLamaAvatarConfig(request);
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

  console.log('[ContactsIPC] Handlers registered (NodeOneCore ready)');
}

export { contactsPlan };
