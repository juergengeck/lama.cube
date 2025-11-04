import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'

interface JournalEntry {
  idHash: string
  id: string
  name: string
  description?: string
  created: number
  modified?: number
  metadata: Record<string, string>
}

interface JournalEntryDetails extends JournalEntry {
  filePath: string
  html: string
}

export function JournalView() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await (window as any).electronAPI.invoke('memory:journal:list', {})
      setEntries(result.entries || [])
    } catch (err: any) {
      console.error('Failed to load journal entries:', err)
      setError(err.message || 'Failed to load journal entries')
    } finally {
      setLoading(false)
    }
  }

  const loadEntryDetails = async (idHash: string) => {
    try {
      const details = await (window as any).electronAPI.invoke('memory:journal:get', { idHash })
      setSelectedEntry(details)
    } catch (err: any) {
      console.error('Failed to load entry details:', err)
      setError(err.message || 'Failed to load entry details')
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredEntries = entries.filter(entry =>
    searchTerm === '' ||
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedEntry) {
    // Detail view
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="border-b p-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedEntry(null)}
            className="hover:bg-accent p-2 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{selectedEntry.name}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(selectedEntry.created)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedEntry.description && (
            <p className="text-muted-foreground mb-6">{selectedEntry.description}</p>
          )}

          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedEntry.html }}
          />

          {selectedEntry.modified && (
            <p className="text-xs text-muted-foreground mt-6 pt-6 border-t">
              Last modified: {formatDate(selectedEntry.modified)}
            </p>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold mb-4">Journal</h1>
        <input
          type="text"
          placeholder="Search entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-md bg-background"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading journal...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={loadEntries}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            {searchTerm ? (
              <p>No entries matching "{searchTerm}"</p>
            ) : (
              <>
                <p>No journal entries yet</p>
                <p className="text-sm mt-2">Memories from your conversations will appear here</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredEntries.map((entry) => (
            <button
              key={entry.idHash}
              onClick={() => loadEntryDetails(entry.idHash)}
              className="w-full text-left p-6 border-b hover:bg-accent transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">{entry.name}</h2>
                <time className="text-sm text-muted-foreground">{formatDate(entry.created)}</time>
              </div>
              {entry.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}