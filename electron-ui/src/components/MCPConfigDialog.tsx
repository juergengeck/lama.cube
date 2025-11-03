import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Info } from 'lucide-react'
import { lamaBridge } from '@/bridge/lama-bridge'

interface MCPConfig {
  inboundEnabled: boolean   // AI can use MCP tools in this chat
  outboundEnabled: boolean  // External systems can access this chat via MCP
  allowedTools?: string[]   // Specific tools allowed (empty = all tools)
}

interface MCPConfigDialogProps {
  open: boolean
  conversationId: string | null
  conversationName?: string
  onClose: () => void
}

export function MCPConfigDialog({
  open,
  conversationId,
  conversationName,
  onClose
}: MCPConfigDialogProps) {
  const [config, setConfig] = useState<MCPConfig>({
    inboundEnabled: false,
    outboundEnabled: false,
    allowedTools: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [availableTools, setAvailableTools] = useState<string[]>([])

  // Load configuration when dialog opens
  useEffect(() => {
    if (open && conversationId) {
      loadConfiguration()
    }
  }, [open, conversationId])

  const loadConfiguration = async () => {
    if (!conversationId) return

    setLoading(true)
    try {
      // Load MCP configuration for this topic
      const result = await window.electronAPI.invoke('mcp:getTopicConfig', {
        topicId: conversationId
      })

      if (result.success && result.config) {
        setConfig(result.config)
      }

      // Load available tools
      const toolsResult = await window.electronAPI.invoke('mcp:getAvailableTools')
      if (toolsResult.success && toolsResult.tools) {
        setAvailableTools(toolsResult.tools.map((t: any) => t.fullName))
      }
    } catch (error) {
      console.error('Failed to load MCP configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!conversationId) return

    setSaving(true)
    try {
      const result = await window.electronAPI.invoke('mcp:setTopicConfig', {
        topicId: conversationId,
        config
      })

      if (result.success) {
        onClose()
      } else {
        alert(`Failed to save configuration: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Failed to save MCP configuration:', error)
      alert(`Failed to save configuration: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>MCP Configuration</DialogTitle>
          <DialogDescription>
            Configure Model Context Protocol settings for {conversationName || 'this conversation'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Inbound MCP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="inbound-toggle" className="text-base font-medium">
                    Inbound MCP
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI participants to use MCP tools in this conversation
                  </p>
                </div>
                <Switch
                  id="inbound-toggle"
                  checked={config.inboundEnabled}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, inboundEnabled: checked })
                  }
                />
              </div>

              {config.inboundEnabled && (
                <div className="ml-4 space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">AI can access:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Filesystem operations (read/write project files)</li>
                        <li>Memory tools (search conversation history)</li>
                        <li>Cube tools (create Assemblies, Plans, Stories)</li>
                      </ul>
                      <p className="mt-2 text-xs">
                        Total: {availableTools.length} tools available
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Outbound MCP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="outbound-toggle" className="text-base font-medium">
                    Outbound MCP Server
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Expose this conversation's tools via MCP for external access
                  </p>
                </div>
                <Switch
                  id="outbound-toggle"
                  checked={config.outboundEnabled}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, outboundEnabled: checked })
                  }
                />
              </div>

              {config.outboundEnabled && (
                <div className="ml-4 space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">External systems can access:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Send messages to this conversation</li>
                        <li>Read conversation messages</li>
                        <li>Access cube.core tools (Assemblies, Plans)</li>
                        <li>Query conversation subjects and keywords</li>
                      </ul>
                      <p className="mt-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Traffic Storage Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">MCP Traffic Recording</p>
                  <p className="text-xs opacity-80">
                    All MCP tool calls and results are stored as message attachments in this conversation
                    for full transparency and auditability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
