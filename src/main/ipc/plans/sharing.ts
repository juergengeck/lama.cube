/**
 * Sharing IPC Handlers
 *
 * Query what data is shared with contacts and what could be shared.
 * Used by the Contact Card "Shared" section.
 */

import type { IpcMainInvokeEvent } from 'electron';
import type { IndexModule } from '@refinio/lama.core/modules/IndexModule.js';
import nodeOneCore from '../../core/node-one-core.js';
import { getModuleRegistry } from '../../registry/module-registry-init.js';

/**
 * Shared item for UI display
 */
interface SharedItem {
    type: 'topic' | 'profile' | 'whatsapp';
    id: string;
    name?: string;
    sharedAt?: number;
}

/**
 * Get data shared with a contact.
 *
 * For now returns a simplified list - profile is always shared,
 * and we indicate topics via a placeholder.
 */
async function getSharedWith(
    _event: IpcMainInvokeEvent,
    { personId }: { personId: string }
): Promise<{ items: SharedItem[]; error?: string }> {
    try {
        if (!nodeOneCore.initialized) {
            return { items: [], error: 'Not initialized' };
        }

        const items: SharedItem[] = [];

        // Profile is always shared with contacts (default context)
        items.push({
            type: 'profile',
            id: 'main',
            name: 'Main Profile'
        });

        // Check if we have topics with this person
        // This is a simplified check - in a full implementation,
        // we'd query the CertificateIndex for topic-specific access contexts
        try {
            // O(1) lookup via ContactDimension (replaces leuteModel.others().find())
            const registry = getModuleRegistry();
            const indexModule = registry?.getModule<IndexModule>('IndexModule');
            const contactDimension = indexModule?.contactDimension;

            // personId param can be either a someoneIdHash or personIdHash
            const hasContact = contactDimension
                ? (contactDimension.getBySomeoneId(personId) || contactDimension.getByPersonId(personId))
                : null;

            if (hasContact) {
                items.push({
                    type: 'topic',
                    id: 'shared-chats',
                    name: 'Shared conversations'
                });
            } else if (!contactDimension && nodeOneCore.leuteModel) {
                // Fallback: ContactDimension not available
                const others = await nodeOneCore.leuteModel.others();
                const contact = others.find((c: any) => {
                    return c.id === personId || c.idHash === personId;
                });

                if (contact) {
                    items.push({
                        type: 'topic',
                        id: 'shared-chats',
                        name: 'Shared conversations'
                    });
                }
            }
        } catch (err) {
            console.warn('[Sharing] Error checking contacts:', err);
        }

        return { items };
    } catch (error) {
        console.error('[Sharing] Error getting shared items:', error);
        return {
            items: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get data that COULD be shared with a contact (not yet shared).
 *
 * For now returns an empty list - full implementation would require
 * querying all topics and filtering by participant.
 */
async function getMayShareWith(
    _event: IpcMainInvokeEvent,
    { personId }: { personId: string }
): Promise<{ items: SharedItem[]; error?: string }> {
    try {
        if (!nodeOneCore.initialized) {
            return { items: [], error: 'Not initialized' };
        }

        // For now, return empty - implementing proper "may share" requires
        // significant work to enumerate all topics and check participants
        const items: SharedItem[] = [];

        return { items };
    } catch (error) {
        console.error('[Sharing] Error getting may-share items:', error);
        return {
            items: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

const sharingHandlers = {
    getSharedWith,
    getMayShareWith
};

export default sharingHandlers;
