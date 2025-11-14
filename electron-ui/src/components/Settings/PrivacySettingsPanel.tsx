import React from 'react';
import {
  Button,
  Label,
  Separator,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@lama/ui';
import { Trash2 } from 'lucide-react';
import { ipcStorage } from '@/services/ipc-storage';

interface PrivacySettings {
  autoEncrypt: boolean;
  saveHistory: boolean;
}

interface PrivacySettingsPanelProps {
  privacy: PrivacySettings;
  onToggleAutoEncrypt: () => Promise<void>;
  onToggleSaveHistory: () => Promise<void>;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  privacy,
  onToggleAutoEncrypt,
  onToggleSaveHistory
}) => {
  const handleResetAllData = async () => {
    try {
      console.log('[PrivacySettings] Starting app reset...');

      // Show immediate feedback
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1f2937;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        text-align: center;
        font-family: system-ui;
      `;
      alertDiv.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 10px;">🔄 Clearing App Data</div>
        <div style="font-size: 14px; opacity: 0.8;">This will take a few seconds...</div>
        <div style="margin-top: 15px; font-size: 12px; opacity: 0.6;">
          The app will automatically restart when complete
        </div>
      `;
      document.body.appendChild(alertDiv);

      // Clear browser-side data first
      console.log('[PrivacySettings] Clearing browser storage...');

      // Clear localStorage and sessionStorage
      await ipcStorage.clear();
      sessionStorage.clear();

      // Clear IndexedDB databases
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          for (const db of databases) {
            if (db.name) {
              await indexedDB.deleteDatabase(db.name);
              console.log(`[PrivacySettings] Deleted IndexedDB database: ${db.name}`);
            }
          }
        } catch (e) {
          console.error('[PrivacySettings] Error clearing IndexedDB:', e);
        }
      }

      // Clear service worker caches if any
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('[PrivacySettings] Service worker caches cleared');
        } catch (e) {
          console.error('[PrivacySettings] Error clearing caches:', e);
        }
      }

      console.log('[PrivacySettings] Browser storage cleared, calling main process...');

      // Call main process to clear Node.js side data
      if (window.electronAPI?.invoke) {
        try {
          alertDiv.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 10px;">🔄 Clearing Storage</div>
            <div style="font-size: 14px; opacity: 0.8;">Removing all ONE.core data...</div>
          `;

          const result = await window.electronAPI.invoke('system:clearAllData', {});

          if (result?.success) {
            console.log('[PrivacySettings] App data cleared successfully, app will restart...');

            alertDiv.innerHTML = `
              <div style="font-size: 16px; margin-bottom: 10px;">✅ Reset Complete</div>
              <div style="font-size: 14px; opacity: 0.8;">Application restarting...</div>
            `;

            // The main process handles restart
          } else {
            console.error('[PrivacySettings] Failed to clear app data:', result?.error);
            alertDiv.innerHTML = `
              <div style="font-size: 16px; margin-bottom: 10px;">⚠️ Partial Reset</div>
              <div style="font-size: 14px; opacity: 0.8;">Some data cleared, restarting app...</div>
            `;

            // Force restart anyway
            setTimeout(() => window.location.reload(), 2000);
          }
        } catch (e) {
          console.error('[PrivacySettings] Main process call failed:', e);
          alertDiv.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 10px;">⚠️ Error</div>
            <div style="font-size: 14px; opacity: 0.8;">Failed to contact main process, reloading...</div>
          `;
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        console.log('[PrivacySettings] No Electron API available, reloading after browser cleanup...');
        alertDiv.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 10px;">🔄 Browser Reset</div>
          <div style="font-size: 14px; opacity: 0.8;">Browser data cleared, reloading...</div>
        `;
        setTimeout(() => window.location.reload(), 1000);
      }

    } catch (error) {
      console.error('[PrivacySettings] Failed to reset app data:', error);

      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #dc2626;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        text-align: center;
        font-family: system-ui;
      `;
      errorDiv.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 10px;">❌ Reset Error</div>
        <div style="font-size: 14px; opacity: 0.9;">
          Failed to reset completely. Please restart the app manually.
        </div>
        <div style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
          Error: ${error.message}
        </div>
      `;
      document.body.appendChild(errorDiv);

      // Auto-remove error after 5 seconds
      setTimeout(() => document.body.removeChild(errorDiv), 5000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-encrypt Messages */}
      <div className="flex items-center justify-between">
        <Label>Auto-encrypt Messages</Label>
        <Button
          variant={privacy.autoEncrypt ? "default" : "outline"}
          size="sm"
          onClick={onToggleAutoEncrypt}
        >
          {privacy.autoEncrypt ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {/* Save Chat History */}
      <div className="flex items-center justify-between">
        <Label>Save Chat History</Label>
        <Button
          variant={privacy.saveHistory ? "default" : "outline"}
          size="sm"
          onClick={onToggleSaveHistory}
        >
          {privacy.saveHistory ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      <Separator />

      {/* Reset All App Data */}
      <div className="pt-2 space-y-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Reset All App Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This action cannot be undone. This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All chat history and messages</li>
                  <li>All contacts and connections</li>
                  <li>All settings and preferences</li>
                  <li>All locally stored AI models</li>
                  <li>Your identity and keys</li>
                </ul>
                <p className="font-semibold text-red-500">
                  You will need to create a new identity or restore from backup after this operation.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleResetAllData}
              >
                Reset Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
