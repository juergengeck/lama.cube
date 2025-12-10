/**
 * New Chat Dialog
 *
 * Allows user to create a new AI chat with either cloud or local models.
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalModels, formatBytes } from '../hooks/useLocalModels';
import { Cloud, Cpu, Loader2, Download, AlertCircle } from 'lucide-react';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (chatName: string, modelType: 'cloud' | 'local', localModelId?: string) => void;
}

export function NewChatDialog({
  open,
  onOpenChange,
  onSubmit
}: NewChatDialogProps) {
  const [chatName, setChatName] = useState('');
  const [modelType, setModelType] = useState<'cloud' | 'local'>('cloud');
  const [selectedLocalModel, setSelectedLocalModel] = useState<string>('');
  const { textGenModels, loading: loadingModels, downloadModel } = useLocalModels();
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setChatName('');
      setModelType('cloud');
      setSelectedLocalModel('');
    }
  }, [open]);

  // Auto-select first installed local model
  useEffect(() => {
    if (modelType === 'local' && !selectedLocalModel) {
      const installedModel = textGenModels.find(m =>
        m.status === 'installed' || m.status === 'ready'
      );
      if (installedModel) {
        setSelectedLocalModel(installedModel.id);
      }
    }
  }, [modelType, textGenModels, selectedLocalModel]);

  const handleSubmit = () => {
    if (!chatName.trim()) return;

    if (modelType === 'local' && !selectedLocalModel) {
      alert('Please select a local model or download one first.');
      return;
    }

    onSubmit(
      chatName.trim(),
      modelType,
      modelType === 'local' ? selectedLocalModel : undefined
    );
    onOpenChange(false);
  };

  const handleDownload = async (modelId: string) => {
    try {
      setDownloadingModel(modelId);
      await downloadModel(modelId);
      setSelectedLocalModel(modelId);
    } catch (err) {
      console.error('Failed to download model:', err);
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const installedModels = textGenModels.filter(m =>
    m.status === 'installed' || m.status === 'ready'
  );
  const notInstalledModels = textGenModels.filter(m =>
    m.status !== 'installed' && m.status !== 'ready'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New AI Chat</DialogTitle>
          <DialogDescription>
            Create a new conversation with an AI assistant
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Chat Name */}
          <div className="grid gap-2">
            <Label htmlFor="chat-name">Chat Name</Label>
            <Input
              id="chat-name"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Project Ideas, Brainstorm..."
              autoFocus
            />
          </div>

          {/* Model Type Selection */}
          <div className="grid gap-2">
            <Label>AI Model</Label>
            <RadioGroup
              value={modelType}
              onValueChange={(value) => setModelType(value as 'cloud' | 'local')}
              className="grid gap-2"
            >
              <div className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 ${modelType === 'cloud' ? 'border-primary bg-accent/30' : ''}`}>
                <RadioGroupItem value="cloud" id="cloud" />
                <Label htmlFor="cloud" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    <span className="font-medium">Cloud AI</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use Ollama, Claude, or other configured providers
                  </p>
                </Label>
              </div>

              <div className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 ${modelType === 'local' ? 'border-primary bg-accent/30' : ''}`}>
                <RadioGroupItem value="local" id="local" />
                <Label htmlFor="local" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <span className="font-medium">Local AI</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run AI entirely on your device - private and offline
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Local Model Selection */}
          {modelType === 'local' && (
            <div className="grid gap-2">
              <Label>Select Local Model</Label>

              {loadingModels ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading models...
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Installed models */}
                  {installedModels.length > 0 ? (
                    <RadioGroup
                      value={selectedLocalModel}
                      onValueChange={setSelectedLocalModel}
                      className="grid gap-2"
                    >
                      {installedModels.map(model => (
                        <div
                          key={model.id}
                          className={`flex items-center space-x-3 p-2 border rounded cursor-pointer hover:bg-accent/50 ${selectedLocalModel === model.id ? 'border-primary bg-accent/30' : ''}`}
                        >
                          <RadioGroupItem value={model.id} id={model.id} />
                          <Label htmlFor={model.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{model.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatBytes(model.sizeBytes)}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">No local models installed</p>
                        <p className="text-xs mt-1">Download a model below to use local AI</p>
                      </div>
                    </div>
                  )}

                  {/* Available for download */}
                  {notInstalledModels.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">Available for download</Label>
                      <div className="grid gap-2 mt-2">
                        {notInstalledModels.map(model => (
                          <div
                            key={model.id}
                            className="flex items-center justify-between p-2 border rounded text-sm"
                          >
                            <div>
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatBytes(model.sizeBytes)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(model.id)}
                              disabled={downloadingModel === model.id}
                            >
                              {downloadingModel === model.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!chatName.trim() || (modelType === 'local' && !selectedLocalModel)}
          >
            Create Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
