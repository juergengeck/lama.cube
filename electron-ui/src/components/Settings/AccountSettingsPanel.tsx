import React from 'react';
import { Button } from '@lama/ui';
import { LogOut } from 'lucide-react';

interface AccountSettingsPanelProps {
  onLogout?: () => void;
}

export const AccountSettingsPanel: React.FC<AccountSettingsPanelProps> = ({ onLogout }) => {
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        className="w-full"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );
};
