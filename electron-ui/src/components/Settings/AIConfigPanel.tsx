import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Label,
  Separator
} from '@lama/ui';
import {
  Brain,
  Cpu,
  Code,
  Zap,
  MessageSquare,
  Circle,
  CheckCircle,
  Download,
  AlertTriangle
} from 'lucide-react';
import { lamaBridge } from '@/bridge/lama-bridge';

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: string;
  modelType: string;
  capabilities: string[];
  contextLength: number;
  size: number;
  isLoaded: boolean;
  isDefault: boolean;
}

interface AIConfigPanelProps {
  onNavigate?: (tab: string) => void;
}

const getProviderIcon = (provider: string) => {
  switch (provider.toLowerCase()) {
    case 'qwen': return <Brain className="h-4 w-4" />;
    case 'openai': return <Zap className="h-4 w-4" />;
    case 'anthropic': return <MessageSquare className="h-4 w-4" />;
    default: return <Cpu className="h-4 w-4" />;
  }
};

const getCapabilityIcon = (capability: string) => {
  switch (capability.toLowerCase()) {
    case 'coding': return <Code className="h-3 w-3" />;
    case 'reasoning': return <Brain className="h-3 w-3" />;
    case 'chat': return <MessageSquare className="h-3 w-3" />;
    default: return <Circle className="h-3 w-3" />;
  }
};

const formatSize = (size: number) => {
  if (size === 0) return 'API-based';
  if (size >= 1e9) return `${(size / 1e9).toFixed(1)}B params`;
  if (size >= 1e6) return `${(size / 1e6).toFixed(1)}M params`;
  return `${size} bytes`;
};

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ onNavigate }) => {
  // State
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaStatus, setOllamaStatus] = useState<'unconfigured' | 'testing' | 'valid' | 'invalid'>('unconfigured');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'unconfigured' | 'testing' | 'valid' | 'invalid'>('unconfigured');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // Load models on mount
  useEffect(() => {
    void loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoadingModels(true);
      const modelList = await lamaBridge.getAvailableModels();
      setModels(modelList || []);
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveOllamaConfig = async () => {
    if (!ollamaUrl) {
      setOllamaStatus('invalid');
      return;
    }

    setOllamaStatus('testing');
    try {
      const result = await window.electronAPI?.invoke('llm:updateConfig', {
        provider: 'ollama',
        config: { baseUrl: ollamaUrl }
      });

      if (result?.success) {
        setOllamaStatus('valid');
        await loadModels();

        // Discover and create AI contacts for Ollama models
        const discoveryResult = await window.electronAPI?.invoke('ai:discoverOllamaModels');
        if (discoveryResult?.success && discoveryResult.data?.models) {
          const ollamaModels = discoveryResult.data.models;
          for (const model of ollamaModels) {
            try {
              await window.electronAPI?.invoke('ai:getOrCreateContact', {
                modelId: model.id
              });
            } catch (err) {
              console.warn(`Failed to create contact for ${model.name}:`, err);
            }
          }
          await loadModels();
        }
      } else {
        setOllamaStatus('invalid');
      }
    } catch (error) {
      console.error('Failed to save Ollama config:', error);
      setOllamaStatus('invalid');
    }
  };

  const handleSaveClaudeApiKey = async () => {
    if (!claudeApiKey) {
      setApiKeyStatus('invalid');
      return;
    }

    setApiKeyStatus('testing');
    try {
      const result = await window.electronAPI?.invoke('settings:setApiKey', {
        provider: 'anthropic',
        apiKey: claudeApiKey
      });

      if (result) {
        const testResult = await window.electronAPI?.invoke('llm:testApiKey', {
          provider: 'anthropic',
          apiKey: claudeApiKey
        });

        if (testResult?.success) {
          setApiKeyStatus('valid');

          // Discover and create AI contacts for Claude models
          const discoveryResult = await window.electronAPI?.invoke('ai:discoverClaudeModels', {
            apiKey: claudeApiKey
          });

          if (discoveryResult?.success && discoveryResult.data?.models) {
            const claudeModels = discoveryResult.data.models;
            for (const model of claudeModels) {
              try {
                await window.electronAPI?.invoke('ai:getOrCreateContact', {
                  modelId: model.id
                });
              } catch (err) {
                console.warn(`Failed to create contact for ${model.name}:`, err);
              }
            }
          }
          await loadModels();
        } else {
          setApiKeyStatus('invalid');
        }
      } else {
        throw new Error('Failed to store API key in UserSettings');
      }
    } catch (error) {
      console.error('Failed to save Claude API key:', error);
      setApiKeyStatus('invalid');
    }
  };

  const handleLoadModel = async (modelId: string) => {
    setLoadingStates(prev => ({ ...prev, [modelId]: true }));
    try {
      const success = await lamaBridge.loadModel(modelId);
      if (success) {
        await loadModels();
      }
    } catch (error) {
      console.error('Failed to load model:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [modelId]: false }));
    }
  };

  const handleStartChat = async (modelId: string, modelName: string) => {
    try {
      const contactResult = await window.electronAPI?.invoke('ai:getOrCreateContact', {
        modelId: modelId
      });

      if (!contactResult?.success || !contactResult.data?.personId) {
        console.error(`Failed to get or create AI contact for ${modelId}`);
        return;
      }

      const aiPersonId = contactResult.data.personId;

      const result = await window.electronAPI?.invoke('chat:createConversation', {
        type: 'direct',
        participants: [aiPersonId],
        name: modelName,
        aiModelId: modelId
      });

      if (result?.success && result?.data) {
        window.dispatchEvent(new CustomEvent('open-conversation', {
          detail: { conversationId: result.data.id }
        }));
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ollama Configuration */}
      <div className="space-y-2">
        <Label>Ollama Service URL</Label>
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
          <Button
            size="sm"
            onClick={handleSaveOllamaConfig}
            disabled={ollamaStatus === 'testing'}
          >
            {ollamaStatus === 'testing' ? 'Testing...' : 'Save'}
          </Button>
        </div>
        {ollamaStatus === 'valid' && (
          <p className="text-xs text-green-500">✓ Ollama service configured</p>
        )}
        {ollamaStatus === 'invalid' && (
          <p className="text-xs text-red-500">✗ Failed to configure Ollama service</p>
        )}
        <p className="text-xs text-muted-foreground">
          URL of your Ollama service (local or remote). Default: http://localhost:11434
        </p>
      </div>

      <Separator />

      {/* Claude API Key Configuration */}
      <div className="space-y-2">
        <Label>Claude API Key</Label>
        <div className="flex items-center space-x-2">
          <Input
            type={showApiKey ? "text" : "password"}
            value={claudeApiKey}
            onChange={(e) => setClaudeApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? 'Hide' : 'Show'}
          </Button>
          <Button
            size="sm"
            onClick={handleSaveClaudeApiKey}
            disabled={apiKeyStatus === 'testing'}
          >
            {apiKeyStatus === 'testing' ? 'Testing...' : 'Save'}
          </Button>
        </div>
        {apiKeyStatus === 'valid' && (
          <p className="text-xs text-green-500">✓ API key is valid</p>
        )}
        {apiKeyStatus === 'invalid' && (
          <p className="text-xs text-red-500">✗ Invalid API key</p>
        )}
      </div>

      <Separator />

      {/* AI Model Management */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Available AI Models</Label>
          {onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('contacts')}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Go to Contacts
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          AI models are automatically added as contacts. Go to Contacts tab to start chatting with them.
        </p>
        {loadingModels ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : models.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No AI models available. Configure Claude API key or Ollama above to add models.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <div key={model.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getProviderIcon(model.provider)}
                    <span className="font-medium">{model.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {model.provider}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {model.modelType === 'local' && !model.isLoaded && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadModel(model.id)}
                        disabled={loadingStates[model.id]}
                      >
                        {loadingStates[model.id] ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3 mr-1" />
                            Load
                          </>
                        )}
                      </Button>
                    )}
                    {model.isLoaded && model.modelType === 'local' && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Loaded
                      </Badge>
                    )}
                    {(model.isLoaded || model.modelType === 'remote') && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStartChat(model.id, model.name)}
                        className="text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Chat
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {model.description}
                </div>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  {model.size !== undefined && <span>{formatSize(model.size)}</span>}
                  {model.size !== undefined && <span>·</span>}
                  {model.contextLength !== undefined && <span>{model.contextLength.toLocaleString()} tokens</span>}
                  {model.capabilities && model.capabilities.length > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex items-center space-x-1">
                        {model.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs py-0">
                            {getCapabilityIcon(cap)}
                            <span className="ml-1">{cap}</span>
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
