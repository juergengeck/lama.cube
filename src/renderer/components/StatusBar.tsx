import { useState } from 'react'
import { Loader2, Wifi, WifiOff, RefreshCw, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { cn, Slider } from '@refinio/lama.ui'

type VisibleItem = 'response' | 'proposals' | 'discovery' | 'info'

interface StatusBarProps {
  /** App version string (e.g., "v1.0.0") */
  version: string
  /** MCP status (Electron only) */
  mcpStatus?: {
    running: boolean
    toolCount: number
    onReconnect?: () => void
    reconnecting?: boolean
    /** Toggle MCP on/off */
    onToggle?: (enabled: boolean) => void
    /** Whether toggle is in progress */
    toggling?: boolean
  }
  /** Memory scan status (Electron only) */
  memoryScanStatus?: {
    scanning: boolean
    progress?: string
  }
  /** Response length slider (0-1) */
  responseLength?: {
    value: number
    onChange: (value: number) => void
  }
  /** Proposals sensitivity slider (0-1) */
  proposals?: {
    value: number
    onChange: (value: number) => void
  }
  /** Discovery toggle */
  discovery?: {
    enabled: boolean
    onChange: (enabled: boolean) => void
  }
  /** Navigate to a settings section by ID */
  onNavigateToSection?: (sectionId: string) => void
  /** Hide on mobile screens - deprecated, now always shows mobile-optimized view */
  hideOnMobile?: boolean
  /** Additional class names */
  className?: string
}

export function StatusBar({
  version,
  mcpStatus,
  memoryScanStatus,
  responseLength,
  proposals,
  discovery,
  onNavigateToSection,
  hideOnMobile: _hideOnMobile = true,
  className
}: StatusBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [visibleItems, setVisibleItems] = useState<Set<VisibleItem>>(new Set(['response']))

  const toggleVisibility = (item: VisibleItem) => {
    setVisibleItems(prev => {
      const next = new Set(prev)
      if (next.has(item)) {
        next.delete(item)
      } else {
        next.add(item)
      }
      return next
    })
  }

  return (
    <div className={cn('border-t bg-card px-4 py-2', className)}>
      {/* Desktop view - show everything in one row */}
      <div className="hidden md:flex items-center justify-between text-xs text-muted-foreground">
        {/* Left side - version, MCP status */}
        <div className="flex items-center space-x-4">
          <span>{version}</span>

          {mcpStatus && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                {mcpStatus.onToggle ? (
                  <>
                    <button
                      onClick={() => mcpStatus.onToggle!(!mcpStatus.running)}
                      disabled={mcpStatus.toggling}
                      className={cn(
                        'inline-flex items-center gap-1.5 p-0.5 rounded transition-colors',
                        'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
                        mcpStatus.running ? 'text-green-500' : 'text-muted-foreground'
                      )}
                      title={mcpStatus.running ? 'Click to disable MCP' : 'Click to enable MCP'}
                    >
                      {mcpStatus.toggling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : mcpStatus.running ? (
                        <Wifi className="h-3.5 w-3.5" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button onClick={() => onNavigateToSection?.('mcp-servers')} className="hover:text-foreground transition-colors cursor-pointer">MCP{mcpStatus.toggling ? '...' : mcpStatus.running && mcpStatus.toolCount > 0 ? ` (${mcpStatus.toolCount})` : ''}</button>
                  </>
                ) : (
                  <>
                    {mcpStatus.running ? (
                      <>
                        <Wifi className="h-3.5 w-3.5 text-green-500" />
                        <button onClick={() => onNavigateToSection?.('mcp-servers')} className="hover:text-foreground transition-colors cursor-pointer">MCP{mcpStatus.toolCount > 0 ? ` (${mcpStatus.toolCount})` : ''}</button>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                        <button onClick={() => onNavigateToSection?.('mcp-servers')} className="hover:text-foreground transition-colors cursor-pointer">MCP</button>
                        {mcpStatus.onReconnect && (
                          <button
                            onClick={mcpStatus.onReconnect}
                            disabled={mcpStatus.reconnecting}
                            className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reconnect MCP servers"
                          >
                            <RefreshCw className={cn('h-3 w-3', mcpStatus.reconnecting && 'animate-spin')} />
                            <span>{mcpStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {memoryScanStatus?.scanning && (
            <>
              <span>·</span>
              <button onClick={() => onNavigateToSection?.('memory')} className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span>{memoryScanStatus.progress || 'Scanning memories...'}</span>
              </button>
            </>
          )}
        </div>

        {/* Right side - sliders and discovery */}
        <div className="flex items-center space-x-4">
          {responseLength && (
            <>
              <div className="flex items-center space-x-2">
                <button onClick={() => onNavigateToSection?.('ai')} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Response:</button>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[responseLength.value]}
                  onValueChange={(values) => responseLength.onChange(values[0])}
                  className="w-24"
                  title="AI response length: 20% = shorter responses, 100% = full length"
                />
                <span className="font-mono min-w-[3ch]">{(responseLength.value * 100).toFixed(0)}%</span>
              </div>
              <span>·</span>
            </>
          )}

          {proposals && (
            <>
              <div className="flex items-center space-x-2">
                <button onClick={() => onNavigateToSection?.('proposals')} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Proposals:</button>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[proposals.value]}
                  onValueChange={(values) => proposals.onChange(values[0])}
                  className="w-24"
                  title="Minimum match threshold: 10% = show most proposals, 90% = only very similar"
                />
                <span className="font-mono min-w-[3ch]">{(proposals.value * 100).toFixed(0)}%</span>
              </div>
              <span>·</span>
            </>
          )}

          {discovery && (
            <div className="flex items-center space-x-2">
              <button onClick={() => onNavigateToSection?.('devices')} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Discovery</button>
              <button
                role="switch"
                aria-checked={discovery.enabled}
                onClick={() => discovery.onChange(!discovery.enabled)}
                className={cn(
                  'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  discovery.enabled ? 'bg-primary' : 'bg-muted'
                )}
                title="Enable/disable device discovery"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out',
                    discovery.enabled ? 'translate-x-3' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile view - compact with expandable options */}
      <div className="md:hidden text-xs text-muted-foreground">
        {/* Controls row with expand chevron on right */}
        <div className="flex items-center">
          {/* Selected visible items */}
          <div className="flex-1 flex items-center gap-3 overflow-x-auto">
            {visibleItems.has('response') && responseLength && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-muted-foreground">Resp:</span>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[responseLength.value]}
                  onValueChange={(values) => responseLength.onChange(values[0])}
                  className="w-16"
                />
                <span className="font-mono text-[10px]">{(responseLength.value * 100).toFixed(0)}%</span>
              </div>
            )}

            {visibleItems.has('proposals') && proposals && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-muted-foreground">Prop:</span>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[proposals.value]}
                  onValueChange={(values) => proposals.onChange(values[0])}
                  className="w-16"
                />
                <span className="font-mono text-[10px]">{(proposals.value * 100).toFixed(0)}%</span>
              </div>
            )}

            {visibleItems.has('discovery') && discovery && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-muted-foreground">Disc</span>
                <button
                  role="switch"
                  aria-checked={discovery.enabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    discovery.onChange(!discovery.enabled)
                  }}
                  className={cn(
                    'relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    discovery.enabled ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-background shadow-lg transition',
                      discovery.enabled ? 'translate-x-2.5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            )}

            {visibleItems.has('info') && (
              <div className="flex items-center gap-2 shrink-0">
                <span>{version}</span>
                {mcpStatus && (
                  <>
                    <span>·</span>
                    {mcpStatus.onToggle ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          mcpStatus.onToggle!(!mcpStatus.running)
                        }}
                        disabled={mcpStatus.toggling}
                        className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                        title={mcpStatus.running ? 'Click to disable MCP' : 'Click to enable MCP'}
                      >
                        {mcpStatus.toggling ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : mcpStatus.running ? (
                          <Wifi className="h-3 w-3 text-green-500" />
                        ) : (
                          <WifiOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    ) : mcpStatus.running ? (
                      <Wifi className="h-3 w-3 text-green-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </>
                )}
                {memoryScanStatus?.scanning && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
              </div>
            )}
          </div>

          {/* Expand chevron on right */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 hover:bg-muted rounded transition-colors ml-2"
            title={isExpanded ? 'Collapse options' : 'Expand options'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Expanded panel with checkboxes */}
        {isExpanded && (
          <div className="pb-2 mb-2 border-b border-muted space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">Show in footer:</div>

            {responseLength && (
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVisibility('response')
                  }}
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                    visibleItems.has('response')
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {visibleItems.has('response') && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <span>Response length</span>
              </label>
            )}

            {proposals && (
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVisibility('proposals')
                  }}
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                    visibleItems.has('proposals')
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {visibleItems.has('proposals') && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <span>Proposal threshold</span>
              </label>
            )}

            {discovery && (
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVisibility('discovery')
                  }}
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                    visibleItems.has('discovery')
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {visibleItems.has('discovery') && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <span>Discovery toggle</span>
              </label>
            )}

            {(mcpStatus || memoryScanStatus || version) && (
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVisibility('info')
                  }}
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                    visibleItems.has('info')
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {visibleItems.has('info') && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <span>Info (version, MCP status)</span>
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
