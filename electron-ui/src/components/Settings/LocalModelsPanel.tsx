/**
 * Local Models Settings Panel
 *
 * Manages local text generation models for on-device AI inference.
 */
import React, { useState } from 'react';
import { useLocalModels, formatBytes } from '../../hooks/useLocalModels';
import { Download, Trash2, Play, Square, Loader2, Check, AlertCircle, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export const LocalModelsPanel: React.FC = () => {
  const {
    textGenModels,
    textGenStatus,
    loading,
    error,
    loadModel,
    unloadModel,
    downloadModel,
    refreshModels
  } = useLocalModels();

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDownload = async (modelId: string) => {
    try {
      setActionInProgress(modelId);
      setActionError(null);
      await downloadModel(modelId);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLoad = async (modelId: string) => {
    try {
      setActionInProgress(modelId);
      setActionError(null);
      await loadModel(modelId);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnload = async () => {
    try {
      setActionInProgress('unload');
      setActionError(null);
      await unloadModel();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading local models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Error: {error}
        <Button variant="outline" size="sm" className="ml-4" onClick={refreshModels}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="w-6 h-6" />
            Local AI Models
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Run AI models locally on your device for privacy and offline use
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshModels}>
          Refresh
        </Button>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {actionError}
        </div>
      )}

      {/* Currently loaded model */}
      {textGenStatus?.loaded && textGenStatus.modelId && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-700 dark:text-green-300">
                Model loaded: {textGenModels.find(m => m.id === textGenStatus.modelId)?.name || textGenStatus.modelId}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnload}
              disabled={actionInProgress === 'unload'}
            >
              {actionInProgress === 'unload' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Square className="w-4 h-4 mr-1" />
                  Unload
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Model will auto-unload after 5 minutes of inactivity
          </p>
        </div>
      )}

      {/* Model list */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Text Generation Models</h3>

        {textGenModels.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No text generation models available
          </p>
        ) : (
          <div className="grid gap-3">
            {textGenModels.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                isLoaded={textGenStatus?.modelId === model.id}
                isActionInProgress={actionInProgress === model.id}
                onDownload={() => handleDownload(model.id)}
                onLoad={() => handleLoad(model.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
        <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">About Local Models</h4>
        <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
          <li>Models run entirely on your device - no data sent to servers</li>
          <li>First load downloads the model (~1-5GB depending on model)</li>
          <li>Requires sufficient RAM (8GB+ recommended for 2B models)</li>
          <li>Smaller models are faster but less capable</li>
        </ul>
      </div>
    </div>
  );
};

interface ModelCardProps {
  model: {
    id: string;
    name: string;
    sizeBytes: number;
    status: string;
    downloadProgress?: number;
    error?: string;
    familyName?: string;
    contextLength?: number;
  };
  isLoaded: boolean;
  isActionInProgress: boolean;
  onDownload: () => void;
  onLoad: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isLoaded,
  isActionInProgress,
  onDownload,
  onLoad
}) => {
  const isInstalled = model.status === 'installed' || model.status === 'ready';
  const isDownloading = model.status === 'downloading';
  const isLoading = model.status === 'loading';
  const hasError = model.status === 'error';

  return (
    <div className={`p-4 border rounded-lg ${isLoaded ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{model.name}</h4>
            {model.familyName && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                {model.familyName}
              </span>
            )}
            {isLoaded && (
              <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{formatBytes(model.sizeBytes)}</span>
            {model.contextLength && (
              <span>{(model.contextLength / 1024).toFixed(0)}K context</span>
            )}
          </div>
          {hasError && model.error && (
            <p className="text-sm text-red-500 mt-1">{model.error}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isInstalled && !isDownloading && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={isActionInProgress}
            >
              {isActionInProgress ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </>
              )}
            </Button>
          )}

          {isInstalled && !isLoaded && (
            <Button
              variant="default"
              size="sm"
              onClick={onLoad}
              disabled={isActionInProgress}
            >
              {isActionInProgress || isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Load
                </>
              )}
            </Button>
          )}

          {isLoaded && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Download/Loading progress */}
      {(isDownloading || isLoading) && model.downloadProgress !== undefined && (
        <div className="mt-3">
          <Progress value={model.downloadProgress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {isDownloading ? 'Downloading' : 'Loading'}: {model.downloadProgress.toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default LocalModelsPanel;
