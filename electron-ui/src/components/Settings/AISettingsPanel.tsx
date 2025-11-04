import React from 'react';
import { useSettings } from '../../hooks/useSettings';

export const AISettingsPanel: React.FC = () => {
  const { settings, updateAI, loading, error } = useSettings();

  if (loading) {
    return <div className="p-4">Loading AI settings...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading settings: {error.message}</div>;
  }

  if (!settings || !settings.ai) {
    return <div className="p-4">No settings available</div>;
  }

  const handleAISettingChange = async (field: keyof typeof settings.ai, value: any) => {
    await updateAI({
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">AI Settings</h2>

      {/* Default Provider */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Default Provider</label>
        <select
          value={settings.ai.defaultProvider || 'ollama'}
          onChange={(e) => handleAISettingChange('defaultProvider', e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="ollama">Ollama</option>
          <option value="claude">Claude</option>
          <option value="lmstudio">LM Studio</option>
        </select>
      </div>

      {/* Default Model ID */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Default Model ID</label>
        <input
          type="text"
          value={settings.ai.defaultModelId || ''}
          onChange={(e) => handleAISettingChange('defaultModelId', e.target.value)}
          placeholder="e.g., qwen2.5:7b"
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Temperature: {settings.ai.temperature?.toFixed(2) || '0.70'}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.ai.temperature || 0.7}
          onChange={(e) => handleAISettingChange('temperature', parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          Lower = more focused, Higher = more creative
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Max Tokens</label>
        <input
          type="number"
          value={settings.ai.maxTokens || 2048}
          onChange={(e) => handleAISettingChange('maxTokens', parseInt(e.target.value))}
          min="128"
          max="32768"
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Auto-Select Best Model */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={settings.ai.autoSelectBestModel || false}
          onChange={(e) => handleAISettingChange('autoSelectBestModel', e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium">Auto-select best model for task</label>
      </div>

      {/* Stream Responses */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={settings.ai.streamResponses !== false}
          onChange={(e) => handleAISettingChange('streamResponses', e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium">Stream responses (real-time)</label>
      </div>

      {/* Auto-Summarize */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={settings.ai.autoSummarize || false}
          onChange={(e) => handleAISettingChange('autoSummarize', e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium">Auto-summarize conversations</label>
      </div>

      {/* Enable MCP */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={settings.ai.enableMCP !== false}
          onChange={(e) => handleAISettingChange('enableMCP', e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium">Enable MCP (Model Context Protocol)</label>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Custom System Prompt (Optional)</label>
        <textarea
          value={settings.ai.systemPrompt || ''}
          onChange={(e) => handleAISettingChange('systemPrompt', e.target.value)}
          placeholder="Enter custom system prompt..."
          rows={4}
          className="w-full p-2 border rounded font-mono text-sm"
        />
      </div>

      {/* Preferred Model IDs */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Preferred Models (comma-separated)</label>
        <input
          type="text"
          value={settings.ai.preferredModelIds?.join(', ') || ''}
          onChange={(e) => handleAISettingChange(
            'preferredModelIds',
            e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          )}
          placeholder="e.g., qwen2.5:7b, llama3.2:3b"
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="pt-4 border-t text-sm text-gray-500">
        Settings are automatically synced across all your LAMA instances via CHUM protocol.
      </div>
    </div>
  );
};
