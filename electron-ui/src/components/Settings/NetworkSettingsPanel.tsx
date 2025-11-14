import React, { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Separator
} from '@lama/ui';
import { Globe, Save } from 'lucide-react';
import InstancesView from '../InstancesView';
import { ipcStorage } from '@/services/ipc-storage';

export const NetworkSettingsPanel: React.FC = () => {
  const [eddaDomain, setEddaDomain] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load edda domain on mount
  React.useEffect(() => {
    const loadDomain = async () => {
      try {
        const domain = await ipcStorage.getItem('edda-domain');
        if (domain) {
          setEddaDomain(domain as string);
        }
      } catch (error) {
        console.error('Failed to load edda domain:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadDomain();
  }, []);

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEddaDomain(e.target.value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (eddaDomain) {
        await ipcStorage.setItem('edda-domain', eddaDomain);
      } else {
        await ipcStorage.removeItem('edda-domain');
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save edda domain:', error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading network settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Edda Domain Configuration */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4" />
          <h3 className="font-medium">Invitation Domain</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edda-domain">Edda Domain for Invitations</Label>
          <div className="flex space-x-2">
            <Input
              id="edda-domain"
              type="text"
              value={eddaDomain}
              onChange={handleDomainChange}
              placeholder="edda.dev.refinio.one"
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This domain will be used in invitation URLs. Use 'edda.dev.refinio.one' for development or 'edda.one' for production.
          </p>
        </div>
      </div>

      <Separator />

      {/* Instance Management */}
      <InstancesView />
    </div>
  );
};
