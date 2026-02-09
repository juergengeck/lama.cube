/**
 * Local Models Settings Panel
 *
 * Manages local AI models for on-device inference (text generation, TTS, etc.)
 */
import React, { useState } from 'react';
import { useLocalModels, formatBytes } from '../../hooks/useLocalModels';
import { Download, Trash2, Play, Square, Loader2, Check, AlertCircle, Cpu, Volume2 } from 'lucide-react';
import { Button } from '@refinio/lama.ui/components/ui/button';
import { Progress } from '@refinio/lama.ui/components/ui/progress';
import { Badge } from '@refinio/lama.ui/components/ui/badge';

export const LocalModelsPanel: React.FC = () => {
  const {
    textGenModels,
    textGenStatus,
    ttsModels,
    ttsStatus,
    loading,
    error,
    loadModel,
    unloadModel,
    downloadModel,
    refreshModels,
    loadTTS,
    unloadTTS,
    downloadTTS
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
      {textGenStatus?.loaded && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-700 dark:text-green-300">
                Text generation ready
                {textGenStatus.provider && (
                  <span className="ml-2 text-xs font-normal">
                    ({textGenStatus.provider === 'ollama-lan' ? 'Ollama LAN' :
                      textGenStatus.provider === 'ollama-local' ? 'Ollama Local' : 'llama.cpp'})
                  </span>
                )}
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

      {/* TTS Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Text-to-Speech
        </h3>

        {ttsModels.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No TTS models available
          </p>
        ) : (
          <div className="grid gap-3">
            {ttsModels.map(model => (
              <TTSModelCard
                key={model.id}
                model={model}
                isLoaded={ttsStatus?.modelId === model.id && ttsStatus?.status === 'ready'}
                sampleRate={ttsStatus?.modelId === model.id ? ttsStatus?.sampleRate : null}
                isActionInProgress={actionInProgress === `tts-${model.id}`}
                onDownload={async () => {
                  try {
                    setActionInProgress(`tts-${model.id}`);
                    setActionError(null);
                    await downloadTTS(model.id);
                  } catch (err) {
                    setActionError((err as Error).message);
                  } finally {
                    setActionInProgress(null);
                  }
                }}
                onLoad={async () => {
                  try {
                    setActionInProgress(`tts-${model.id}`);
                    setActionError(null);
                    await loadTTS(model.id);
                  } catch (err) {
                    setActionError((err as Error).message);
                  } finally {
                    setActionInProgress(null);
                  }
                }}
                onUnload={async () => {
                  try {
                    setActionInProgress(`tts-${model.id}`);
                    setActionError(null);
                    await unloadTTS();
                  } catch (err) {
                    setActionError((err as Error).message);
                  } finally {
                    setActionInProgress(null);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text Generation Models */}
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
  // Consider model installed if status says so OR if it's currently loaded
  const isInstalled = model.status === 'installed' || model.status === 'ready' || isLoaded;
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

// TTS Model Card Component
interface TTSModelCardProps {
  model: {
    id: string;
    name: string;
    sizeBytes: number;
    status: string;
    downloadProgress?: number;
  };
  isLoaded: boolean;
  sampleRate: number | null;
  isActionInProgress: boolean;
  onDownload: () => void;
  onLoad: () => void;
  onUnload: () => void;
}

const TTSModelCard: React.FC<TTSModelCardProps> = ({
  model,
  isLoaded,
  sampleRate,
  isActionInProgress,
  onDownload,
  onLoad,
  onUnload
}) => {
  const isInstalled = model.status === 'installed' || model.status === 'ready' || isLoaded;
  const isDownloading = model.status === 'downloading';
  const isLoading = model.status === 'loading';

  return (
    <div className={`p-4 border rounded-lg ${isLoaded ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{model.name}</h4>
            <Badge variant="secondary" className="text-xs">{formatBytes(model.sizeBytes)}</Badge>
            {isLoaded && (
              <Badge variant="default" className="text-xs bg-green-500">Active</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            High-quality voice synthesis with voice cloning
          </p>
          {sampleRate && (
            <p className="text-xs text-gray-400 mt-1">
              Sample rate: {sampleRate} Hz
            </p>
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
              disabled={isActionInProgress || isLoading}
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
            <>
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Ready
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onUnload}
                disabled={isActionInProgress}
              >
                {isActionInProgress ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-1" />
                    Unload
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Download progress */}
      {isDownloading && model.downloadProgress !== undefined && (
        <div className="mt-3">
          <Progress value={model.downloadProgress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            Downloading: {model.downloadProgress.toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default LocalModelsPanel;
