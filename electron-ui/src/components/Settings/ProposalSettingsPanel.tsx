import React from 'react';
import { useSettings } from '../../hooks/useSettings';

export const ProposalSettingsPanel: React.FC = () => {
  const { settings, updateProposals, loading, error } = useSettings();

  if (loading) {
    return <div className="p-4">Loading proposal settings...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading settings: {error.message}</div>;
  }

  if (!settings || !settings.proposals) {
    return <div className="p-4">No settings available</div>;
  }

  const handleProposalSettingChange = async (field: keyof typeof settings.proposals, value: any) => {
    await updateProposals({
      [field]: value
    });
  };

  const totalWeight = settings.proposals.matchWeight + settings.proposals.recencyWeight;
  const normalizedMatchWeight = totalWeight > 0 ? settings.proposals.matchWeight / totalWeight : 0.5;
  const normalizedRecencyWeight = totalWeight > 0 ? settings.proposals.recencyWeight / totalWeight : 0.5;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Proposal Settings</h2>

      <p className="text-sm text-gray-600">
        Configure how LAMA suggests relevant past conversations based on subject and keyword matching.
      </p>

      {/* Match Weight */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Match Weight: {settings.proposals.matchWeight.toFixed(2)}
          <span className="text-gray-500 ml-2">
            ({(normalizedMatchWeight * 100).toFixed(0)}% of total)
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.proposals.matchWeight}
          onChange={(e) => handleProposalSettingChange('matchWeight', parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          How much to prioritize keyword overlap (Jaccard similarity)
        </p>
      </div>

      {/* Recency Weight */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Recency Weight: {settings.proposals.recencyWeight.toFixed(2)}
          <span className="text-gray-500 ml-2">
            ({(normalizedRecencyWeight * 100).toFixed(0)}% of total)
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.proposals.recencyWeight}
          onChange={(e) => handleProposalSettingChange('recencyWeight', parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          How much to prioritize recent conversations
        </p>
      </div>

      {/* Recency Window */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Recency Window: {Math.floor(settings.proposals.recencyWindow / (24 * 60 * 60 * 1000))} days
        </label>
        <input
          type="range"
          min={1 * 24 * 60 * 60 * 1000}
          max={90 * 24 * 60 * 60 * 1000}
          step={24 * 60 * 60 * 1000}
          value={settings.proposals.recencyWindow}
          onChange={(e) => handleProposalSettingChange('recencyWindow', parseInt(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          Time window for recency boost (1-90 days)
        </p>
      </div>

      {/* Min Jaccard */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Minimum Similarity: {settings.proposals.minJaccard.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.proposals.minJaccard}
          onChange={(e) => handleProposalSettingChange('minJaccard', parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          Minimum Jaccard similarity threshold (0.0-1.0)
        </p>
      </div>

      {/* Max Proposals */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Max Proposals: {settings.proposals.maxProposals}
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={settings.proposals.maxProposals}
          onChange={(e) => handleProposalSettingChange('maxProposals', parseInt(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          Maximum number of proposals to display (1-50)
        </p>
      </div>

      {/* Example Calculation */}
      <div className="mt-6 p-4 bg-gray-50 rounded border">
        <h3 className="text-sm font-semibold mb-2">Example Calculation</h3>
        <div className="text-xs font-mono space-y-1">
          <div>Jaccard Similarity: 0.40 (40% keywords match)</div>
          <div>Recency Boost: 0.80 (recent conversation)</div>
          <div className="border-t pt-1 mt-1">
            Relevance Score = (0.40 × {normalizedMatchWeight.toFixed(2)}) + (0.80 × {normalizedRecencyWeight.toFixed(2)})
          </div>
          <div className="font-semibold">
            = {(0.40 * normalizedMatchWeight + 0.80 * normalizedRecencyWeight).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t text-sm text-gray-500">
        Settings are automatically synced across all your LAMA instances via CHUM protocol.
      </div>
    </div>
  );
};
