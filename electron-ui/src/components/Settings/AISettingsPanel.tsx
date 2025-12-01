import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export const AISettingsPanel: React.FC = () => {
  const { settings, updateAI, setApiKey, getApiKey, loading, error } = useSettings();
  const [claudeKey, setClaudeKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKeyMasked, setClaudeKeyMasked] = useState(true);
  const [openaiKeyMasked, setOpenaiKeyMasked] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Load existing API keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const claude = await getApiKey('anthropic');
        const openai = await getApiKey('openai');
        if (claude) setClaudeKey(claude);
        if (openai) setOpenaiKey(openai);
      } catch (err) {
        console.error('[AISettings] Failed to load API keys:', err);
      }
    };
    loadKeys();
  }, [getApiKey]);

  const handleSaveApiKey = async (provider: string, apiKey: string) => {
    try {
      setSaveStatus(`Saving ${provider} key...`);
      await setApiKey(provider, apiKey);
      setSaveStatus(`${provider} key saved!`);
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus(`Failed to save ${provider} key`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

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

      {/* Status message */}
      {saveStatus && (
        <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
          {saveStatus}
        </div>
      )}

      {/* API Keys Section */}
      <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold">API Keys</h3>

        {/* Claude API Key */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Claude (Anthropic) API Key</label>
          <div className="flex space-x-2">
            <input
              type={claudeKeyMasked ? 'password' : 'text'}
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 p-2 border rounded font-mono text-sm"
            />
            <button
              onClick={() => setClaudeKeyMasked(!claudeKeyMasked)}
              className="px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={claudeKeyMasked ? 'Show' : 'Hide'}
            >
              {claudeKeyMasked ? '👁' : '🙈'}
            </button>
            <button
              onClick={() => handleSaveApiKey('anthropic', claudeKey)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500">Get your key at console.anthropic.com</p>
        </div>

        {/* OpenAI API Key */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">OpenAI API Key</label>
          <div className="flex space-x-2">
            <input
              type={openaiKeyMasked ? 'password' : 'text'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 p-2 border rounded font-mono text-sm"
            />
            <button
              onClick={() => setOpenaiKeyMasked(!openaiKeyMasked)}
              className="px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={openaiKeyMasked ? 'Show' : 'Hide'}
            >
              {openaiKeyMasked ? '👁' : '🙈'}
            </button>
            <button
              onClick={() => handleSaveApiKey('openai', openaiKey)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500">Get your key at platform.openai.com</p>
        </div>
      </div>

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
