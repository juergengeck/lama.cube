import React, { useState, useEffect } from 'react';
import {
  Badge,
  Button,
  Label,
  Progress
} from '@lama/ui';
import {
  Download,
  CheckCircle,
  AlertCircle,
  Mic,
  FileText,
  RefreshCw,
  Trash2,
  Loader2
} from 'lucide-react';

interface LocalModel {
  id: string;
  name: string;
  type: 'embedding' | 'whisper';
  sizeBytes: number;
  status: 'not_installed' | 'downloading' | 'installed' | 'loading' | 'ready' | 'error';
  downloadProgress?: number;
  error?: string;
  bundled: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getTypeIcon = (type: 'embedding' | 'whisper') => {
  return type === 'whisper'
    ? <Mic className="h-4 w-4" />
    : <FileText className="h-4 w-4" />;
};

const getStatusBadge = (status: LocalModel['status']) => {
  switch (status) {
    case 'ready':
      return <Badge variant="default" className="text-xs bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
    case 'installed':
      return <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Installed</Badge>;
    case 'loading':
      return <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Loading</Badge>;
    case 'downloading':
      return <Badge variant="secondary" className="text-xs"><Download className="h-3 w-3 mr-1 animate-pulse" />Downloading</Badge>;
    case 'error':
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Not Installed</Badge>;
  }
};

export const LocalModelsSection: React.FC = () => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadModels();

    // Listen for model status updates
    const handleProgress = (_event: any, data: { modelId: string; progress: number }) => {
      setModels(prev => prev.map(m =>
        m.id === data.modelId
          ? { ...m, status: 'downloading' as const, downloadProgress: data.progress }
          : m
      ));
    };

    window.electronAPI?.on?.('localModels:progress', handleProgress);

    return () => {
      window.electronAPI?.off?.('localModels:progress', handleProgress);
    };
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI?.invoke('localModels:list');
      if (result?.success && result.data) {
        setModels(result.data);
      } else {
        // Fallback to static list if handler not available
        setModels([
          { id: 'nomic-embed-text-v1.5-q4', name: 'Nomic Embed (Quantized)', type: 'embedding', sizeBytes: 130_000_000, status: 'not_installed', bundled: true },
          { id: 'all-MiniLM-L6-v2', name: 'All MiniLM L6 v2', type: 'embedding', sizeBytes: 90_000_000, status: 'not_installed', bundled: false },
          { id: 'whisper-tiny', name: 'Whisper Tiny', type: 'whisper', sizeBytes: 75_000_000, status: 'not_installed', bundled: true },
          { id: 'whisper-base', name: 'Whisper Base', type: 'whisper', sizeBytes: 150_000_000, status: 'not_installed', bundled: false },
          { id: 'whisper-small', name: 'Whisper Small', type: 'whisper', sizeBytes: 500_000_000, status: 'not_installed', bundled: false },
        ]);
      }
    } catch (error) {
      console.error('[LocalModelsSection] Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (modelId: string) => {
    setActionInProgress(modelId);
    try {
      const result = await window.electronAPI?.invoke('localModels:download', { modelId });
      if (result?.success) {
        await loadModels();
      }
    } catch (error) {
      console.error(`[LocalModelsSection] Failed to download ${modelId}:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (modelId: string) => {
    setActionInProgress(modelId);
    try {
      const result = await window.electronAPI?.invoke('localModels:delete', { modelId });
      if (result?.success) {
        await loadModels();
      }
    } catch (error) {
      console.error(`[LocalModelsSection] Failed to delete ${modelId}:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  const embeddingModels = models.filter(m => m.type === 'embedding');
  const whisperModels = models.filter(m => m.type === 'whisper');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Local models for offline embeddings and speech-to-text
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadModels}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Embedding Models */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Embedding Models
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Used for semantic search and memory indexing
        </p>
        <div className="space-y-2">
          {embeddingModels.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              actionInProgress={actionInProgress === model.id}
              onDownload={() => handleDownload(model.id)}
              onDelete={() => handleDelete(model.id)}
            />
          ))}
        </div>
      </div>

      {/* Whisper Models */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Speech-to-Text Models
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Used for voice message transcription
        </p>
        <div className="space-y-2">
          {whisperModels.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              actionInProgress={actionInProgress === model.id}
              onDownload={() => handleDownload(model.id)}
              onDelete={() => handleDelete(model.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ModelRowProps {
  model: LocalModel;
  actionInProgress: boolean;
  onDownload: () => void;
  onDelete: () => void;
}

const ModelRow: React.FC<ModelRowProps> = ({ model, actionInProgress, onDownload, onDelete }) => {
  const isInstalled = model.status === 'installed' || model.status === 'ready' || model.status === 'loading';

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getTypeIcon(model.type)}
          <span className="font-medium text-sm">{model.name}</span>
          {model.bundled && (
            <Badge variant="outline" className="text-xs">Bundled</Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(model.status)}
          <span className="text-xs text-muted-foreground">
            {formatBytes(model.sizeBytes)}
          </span>
        </div>
      </div>

      {model.status === 'downloading' && model.downloadProgress !== undefined && (
        <div className="space-y-1">
          <Progress value={model.downloadProgress} className="h-1" />
          <p className="text-xs text-muted-foreground text-right">
            {model.downloadProgress.toFixed(0)}%
          </p>
        </div>
      )}

      {model.error && (
        <p className="text-xs text-destructive">{model.error}</p>
      )}

      <div className="flex justify-end space-x-2">
        {!isInstalled && model.status !== 'downloading' && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            disabled={actionInProgress}
          >
            {actionInProgress ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            Download
          </Button>
        )}
        {isInstalled && !model.bundled && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            disabled={actionInProgress}
            className="text-destructive hover:text-destructive"
          >
            {actionInProgress ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};
