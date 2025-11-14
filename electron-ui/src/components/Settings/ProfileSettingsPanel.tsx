import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Label,
  Separator
} from '@lama/ui';
import {
  Smile,
  Frown,
  Angry,
  Wind,
  Sparkles,
  Coffee,
  Target,
  Minus,
  Circle
} from 'lucide-react';

interface ProfileSettings {
  name: string;
  id: string;
  publicKey: string;
}

interface ProfileSettingsPanelProps {
  profile: ProfileSettings;
  onUpdateName: (name: string) => Promise<void>;
  onCopyId?: () => void;
  onExportKey?: () => void;
}

const MOODS = [
  { value: 'happy', label: 'Happy' },
  { value: 'sad', label: 'Sad' },
  { value: 'angry', label: 'Angry' },
  { value: 'calm', label: 'Calm' },
  { value: 'excited', label: 'Excited' },
  { value: 'tired', label: 'Tired' },
  { value: 'focused', label: 'Focused' },
  { value: 'neutral', label: 'Neutral' }
];

const getMoodIcon = (mood: string) => {
  switch (mood) {
    case 'happy': return <Smile className="h-4 w-4" />;
    case 'sad': return <Frown className="h-4 w-4" />;
    case 'angry': return <Angry className="h-4 w-4" />;
    case 'calm': return <Wind className="h-4 w-4" />;
    case 'excited': return <Sparkles className="h-4 w-4" />;
    case 'tired': return <Coffee className="h-4 w-4" />;
    case 'focused': return <Target className="h-4 w-4" />;
    case 'neutral': return <Minus className="h-4 w-4" />;
    default: return <Circle className="h-4 w-4" />;
  }
};

export const ProfileSettingsPanel: React.FC<ProfileSettingsPanelProps> = ({
  profile,
  onUpdateName,
  onCopyId,
  onExportKey
}) => {
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [savingMood, setSavingMood] = useState(false);
  const [localName, setLocalName] = useState(profile.name);

  // Load current mood on mount
  useEffect(() => {
    const loadMood = async () => {
      try {
        const result = await window.electronAPI?.invoke('onecore:getMood', {});
        if (result?.mood) {
          setCurrentMood(result.mood);
        }
      } catch (error) {
        console.error('Failed to load mood:', error);
      }
    };
    void loadMood();
  }, []);

  const handleUpdateMood = async (mood: string | null) => {
    setSavingMood(true);
    try {
      const result = await window.electronAPI?.invoke('onecore:updateMood', { mood });
      if (result?.success) {
        setCurrentMood(mood);
      }
    } catch (error) {
      console.error('Failed to update mood:', error);
    } finally {
      setSavingMood(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalName(e.target.value);
  };

  const handleNameBlur = async () => {
    if (localName !== profile.name) {
      await onUpdateName(localName);
    }
  };

  return (
    <div className="space-y-4">
      {/* Display Name */}
      <div>
        <Label>Display Name</Label>
        <Input
          value={localName}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
        />
      </div>

      {/* Identity ID */}
      <div>
        <Label>Identity ID</Label>
        <div className="flex items-center space-x-2">
          <Input value={profile.id} disabled />
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyId}
          >
            Copy
          </Button>
        </div>
      </div>

      {/* Public Key */}
      <div>
        <Label>Public Key</Label>
        <div className="flex items-center space-x-2">
          <code className="text-xs bg-muted p-2 rounded flex-1">
            {profile.publicKey}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportKey}
          >
            Export
          </Button>
        </div>
      </div>

      <Separator />

      {/* Avatar Mood */}
      <div>
        <Label className="mb-2 block">Avatar Mood</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Set your current mood to change your avatar color
        </p>
        <div className="grid grid-cols-4 gap-2">
          {MOODS.map((mood) => (
            <Button
              key={mood.value}
              variant={currentMood === mood.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleUpdateMood(mood.value)}
              disabled={savingMood}
              className="flex items-center gap-2"
            >
              {getMoodIcon(mood.value)}
              <span className="text-xs">{mood.label}</span>
            </Button>
          ))}
        </div>
        {currentMood && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Current: {currentMood.charAt(0).toUpperCase() + currentMood.slice(1)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateMood(null)}
              disabled={savingMood}
              className="text-xs"
            >
              Clear Mood
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
