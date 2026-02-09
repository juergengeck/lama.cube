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
} from '@refinio/lama.ui';
import { Trash2 } from 'lucide-react';

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
    // Main process nukes everything and relaunches — no browser cleanup needed
    window.electronAPI.invoke('app:clearData', {});
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
