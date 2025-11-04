import React from 'react';
import { useSettings } from '../../hooks/useSettings';

export const UISettingsPanel: React.FC = () => {
  const { settings, updateUI, loading, error } = useSettings();

  if (loading) {
    return <div className="p-4">Loading UI settings...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading settings: {error.message}</div>;
  }

  if (!settings || !settings.ui) {
    return <div className="p-4">No settings available</div>;
  }

  const handleUISettingChange = async (field: keyof typeof settings.ui, value: any) => {
    await updateUI({
      [field]: value
    });
  };

  const handleWordCloudChange = async (field: keyof typeof settings.ui.wordCloud, value: any) => {
    await updateUI({
      wordCloud: {
        ...settings.ui.wordCloud,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">UI Settings</h2>

      {/* Theme */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Theme</label>
        <select
          value={settings.ui.theme}
          onChange={(e) => handleUISettingChange('theme', e.target.value as 'dark' | 'light')}
          className="w-full p-2 border rounded"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      {/* Notifications */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={settings.ui.notifications}
          onChange={(e) => handleUISettingChange('notifications', e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium">Enable notifications</label>
      </div>

      {/* Word Cloud Settings */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">Word Cloud Settings</h3>

        {/* Max Words Per Subject */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Max Words Per Subject: {settings.ui.wordCloud.maxWordsPerSubject}
          </label>
          <input
            type="range"
            min="1"
            max="1000"
            step="10"
            value={settings.ui.wordCloud.maxWordsPerSubject}
            onChange={(e) => handleWordCloudChange('maxWordsPerSubject', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Min Word Frequency */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Min Word Frequency: {settings.ui.wordCloud.minWordFrequency}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={settings.ui.wordCloud.minWordFrequency}
            onChange={(e) => handleWordCloudChange('minWordFrequency', parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500">Minimum times a word must appear</p>
        </div>

        {/* Related Word Threshold */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Related Word Threshold: {settings.ui.wordCloud.relatedWordThreshold.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.ui.wordCloud.relatedWordThreshold}
            onChange={(e) => handleWordCloudChange('relatedWordThreshold', parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500">Similarity threshold for related words</p>
        </div>

        {/* Font Scale Min */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Min Font Size: {settings.ui.wordCloud.fontScaleMin}px
          </label>
          <input
            type="range"
            min="8"
            max="24"
            step="1"
            value={settings.ui.wordCloud.fontScaleMin}
            onChange={(e) => handleWordCloudChange('fontScaleMin', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Font Scale Max */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Max Font Size: {settings.ui.wordCloud.fontScaleMax}px
          </label>
          <input
            type="range"
            min="24"
            max="72"
            step="2"
            value={settings.ui.wordCloud.fontScaleMax}
            onChange={(e) => handleWordCloudChange('fontScaleMax', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Color Scheme */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Color Scheme</label>
          <select
            value={settings.ui.wordCloud.colorScheme}
            onChange={(e) => handleWordCloudChange('colorScheme', e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="default">Default</option>
            <option value="monochrome">Monochrome</option>
            <option value="warm">Warm</option>
            <option value="cool">Cool</option>
            <option value="pastel">Pastel</option>
          </select>
        </div>

        {/* Layout Density */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Layout Density</label>
          <select
            value={settings.ui.wordCloud.layoutDensity}
            onChange={(e) => handleWordCloudChange('layoutDensity', e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>

        {/* Show Summary Keywords */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.ui.wordCloud.showSummaryKeywords}
            onChange={(e) => handleWordCloudChange('showSummaryKeywords', e.target.checked)}
            className="w-4 h-4"
          />
          <label className="text-sm font-medium">Show keywords from summary</label>
        </div>
      </div>

      <div className="pt-4 border-t text-sm text-gray-500">
        Settings are automatically synced across all your LAMA instances via CHUM protocol.
      </div>
    </div>
  );
};
