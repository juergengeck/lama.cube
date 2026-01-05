import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, UserPlus, Search, Bot, User, Edit } from 'lucide-react'
import { useLama } from '@/hooks/useLama'
import { usePlans, ProfileEditor, ContactCard, AddContactDialog, type TimelinePath } from '@lama/ui'

interface ContactsViewProps {
  onNavigateToChat?: (topicId: string, contactName: string) => void
}

export function ContactsView({ onNavigateToChat }: ContactsViewProps) {
  const { bridge } = useLama()
  const plans = usePlans()
  const [contacts, setContacts] = useState<any[]>([])
  const [ownerContact, setOwnerContact] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [creatingTopic, setCreatingTopic] = useState<string | null>(null)
  const [loadingModel, setLoadingModel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ownerProfileOpen, setOwnerProfileOpen] = useState(false)
  const [ownerProfileRequired, setOwnerProfileRequired] = useState(false)
  const [defaultModel, setDefaultModel] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<any | null>(null)
  const [contactProfileOpen, setContactProfileOpen] = useState(false)
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false)

  useEffect(() => {
    loadContacts()
    loadDefaultModel()

    // Listen for contact updates
    const handleContactsUpdated = () => {
      console.log('[ContactsView] Contacts updated event received')
      loadContacts()
    }

    // Listen for IPC contact added events from Node.js
    const handleContactAdded = () => {
      console.log('[ContactsView] Contact added via IPC')
      loadContacts()
    }

    // Listen for default model changes
    const handleDefaultModelChanged = () => {
      console.log('[ContactsView] Default model changed')
      loadDefaultModel()
      loadContacts() // Reload contacts to update AI contact visibility
    }

    window.addEventListener('contacts:updated', handleContactsUpdated)

    // Listen for IPC events if in Electron
    if (window.electronAPI?.on) {
      window.electronAPI.on('contact:added', handleContactAdded)
      window.electronAPI.on('ai:defaultModelChanged', handleDefaultModelChanged)
    }

    // REMOVED: Periodic polling that was causing thousands of database queries
    // Now relies on events only: contacts:updated, contact:added, ai:defaultModelChanged

    return () => {
      window.removeEventListener('contacts:updated', handleContactsUpdated)
    }
  }, [plans.contacts, bridge])

  const loadDefaultModel = async () => {
    if (!bridge) return

    try {
      const model = await bridge.getDefaultModel()
      console.log('[ContactsView] Default model:', model)
      setDefaultModel(model)
    } catch (error) {
      console.error('[ContactsView] Failed to load default model:', error)
      setDefaultModel(null)
    }
  }

  const loadContacts = async () => {
    if (!plans.contacts) return

    setLoading(true)
    try {
      // Get contacts with trust information using platform-agnostic plan
      const result = await plans.contacts.getContactsWithTrust()

      if (!result.success || !result.contacts) {
        console.error('[ContactsView] Failed to load contacts:', result.error)
        setContacts([])
        setOwnerContact(null)
        return
      }

      const allContacts = result.contacts
      console.log('[ContactsView] Loaded contacts with trust:', allContacts)
      console.log('[ContactsView] Contact count:', allContacts?.length)
      allContacts?.forEach((c: any, i: number) => {
        console.log(`[ContactsView]   Contact ${i}: ${c.name || c.displayName} (${c.id?.substring(0, 8)}...) trust=${c.trustLevel}`)
      })

      // Separate owner (self) from other contacts
      const owner = allContacts.find((c: any) => c.trustLevel === 'self' || c.status === 'owner')
      const nonOwnerContacts = allContacts.filter((c: any) => c.trustLevel !== 'self' && c.status !== 'owner')

      setOwnerContact(owner || null)

      // Enrich AI contacts with model information
      const enrichedContacts = await Promise.all(
        nonOwnerContacts.map(async (contact: any) => {
          if (contact.isAI && bridge) {
            try {
              // Get all models
              const models = await bridge.getAvailableModels()

              // Find the model for this AI contact by matching the contact name to model ID
              const contactModel = models.find((m: any) =>
                m.id === contact.name ||
                m.name === contact.name ||
                contact.name?.includes(m.id) ||
                m.id?.includes(contact.name)
              )

              console.log(`[ContactsView] AI contact ${contact.name} matched to model:`, contactModel)

              // Merge model info into contact
              return {
                ...contact,
                modelInfo: contactModel
              }
            } catch (error) {
              console.error(`[ContactsView] Failed to get model info for ${contact.name}:`, error)
              return contact
            }
          }
          return contact
        })
      )

      setContacts(enrichedContacts)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const name = contact.name || contact.displayName || ''
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter out AI contacts if no default model is selected
    if (contact.isAI && !defaultModel) {
      return false
    }

    return matchesSearch
  })

  // Convert contact trust paths to TimelinePath format for ContactCard
  const getTrustPaths = useMemo(() => (contact: any): TimelinePath[] => {
    if (!contact.trustPaths || contact.trustPaths.length === 0) return []
    return contact.trustPaths.map((path: any, idx: number) => ({
      id: `path-${idx}`,
      nodes: path.nodes?.map((node: any, nodeIdx: number) => ({
        id: `node-${nodeIdx}`,
        label: node.name || node.label || 'Unknown',
        timestamp: node.timestamp ? new Date(node.timestamp) : undefined
      })) || [],
      selected: idx === 0
    }))
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      case 'disconnected': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Online'
      case 'connecting': return 'Connecting...'
      case 'disconnected': return 'Offline'
      default: return 'Unknown'
    }
  }

  const handleMessageClick = async (contact: any) => {
    console.log('[ContactsView] Message clicked for contact:', contact)
    
    if (!bridge) {
      console.error('[ContactsView] Bridge not available')
      return
    }
    
    // Set loading state for this contact
    setCreatingTopic(contact.id)
    
    try {
      // Get or create topic for this contact
      const topicId = await bridge.getOrCreateTopicForContact(contact.id)
      
      if (topicId) {
        console.log('[ContactsView] Navigating to chat with topic:', topicId)
        // Call the navigation callback if provided, including contact name
        if (onNavigateToChat) {
          const contactName = contact.displayName || contact.name || 'Unknown'
          onNavigateToChat(topicId, contactName)
        } else {
          console.warn('[ContactsView] No navigation handler provided')
        }
      } else {
        console.error('[ContactsView] Failed to create topic for contact')
      }
    } catch (error) {
      console.error('[ContactsView] Error creating topic:', error)
    } finally {
      setCreatingTopic(null)
    }
  }

  const handleLoadModel = async (contact: any) => {
    if (!contact.modelInfo || !bridge) return

    setLoadingModel(contact.id)
    try {
      console.log(`[ContactsView] Loading model: ${contact.modelInfo.id}`)
      const success = await bridge.loadModel(contact.modelInfo.id)
      if (success) {
        // Reload contacts to update model status
        await loadContacts()
      }
    } catch (error) {
      console.error('[ContactsView] Failed to load model:', error)
    } finally {
      setLoadingModel(null)
    }
  }

  const handleAddContact = async () => {
    try {
      if (!plans.contacts) {
        alert('Contacts plan not available')
        return
      }

      // Check if user has a PersonName set
      const nameCheck = await plans.contacts.hasPersonName()

      if (!nameCheck.success || !nameCheck.hasName) {
        // No name set - show dialog as required
        console.log('[ContactsView] No PersonName set, showing required dialog')
        setOwnerProfileRequired(true)
        setOwnerProfileOpen(true)
        return
      }

      // Name is set, open the add contact dialog
      setAddContactDialogOpen(true)
    } catch (error: any) {
      console.error('[ContactsView] Failed to open add contact dialog:', error)
      alert(error.message || 'Failed to open add contact dialog')
    }
  }

  const createInvitation = async () => {
    try {
      if (!plans.contacts) {
        alert('Contacts plan not available')
        return
      }

      // Use createInvitation from contacts plan
      const result = await plans.contacts.createInvitation()

      if (result.success && result.invitation) {
        // Copy invitation URL to clipboard
        await navigator.clipboard.writeText(result.invitation.url)
        alert('Invitation link copied to clipboard! Share it with your contact.')
      } else {
        alert(result.error || 'Failed to create invitation')
      }
    } catch (error: any) {
      console.error('[ContactsView] Failed to create invitation:', error)
      alert(error.message || 'Failed to create invitation')
    }
  }

  const handleProfileSaved = () => {
    // Reload contacts to get updated owner name
    loadContacts()

    // If this was required for adding a contact, open the add contact dialog
    if (ownerProfileRequired) {
      setOwnerProfileRequired(false)
      setAddContactDialogOpen(true)
    }
  }

  const handleContactClick = (contact: any) => {
    console.log('[ContactsView] Contact clicked:', contact)
    setSelectedContact(contact)
    setContactProfileOpen(true)
  }

  const handleBlockContact = async (contact: any) => {
    if (!plans.contacts) return
    try {
      const result = await plans.contacts.blockContact(contact.personId || contact.id, 'User blocked')
      if (result.success) {
        loadContacts() // Refresh the list
      } else {
        console.error('[ContactsView] Failed to block contact:', result.error)
      }
    } catch (error: any) {
      console.error('[ContactsView] Failed to block contact:', error)
    }
  }

  return (
    <div className="h-full w-full flex flex-col space-y-4 p-4">
      {/* My Profile Card */}
      {ownerContact && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>My Profile</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOwnerProfileRequired(false)
                  setOwnerProfileOpen(true)
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback style={{ backgroundColor: ownerContact.color }}>
                  {(ownerContact.displayName || ownerContact.name || 'ME').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{ownerContact.displayName || ownerContact.name || 'Set your name'}</p>
                <p className="text-sm text-muted-foreground">{ownerContact.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Add Contact */}
      <Card>
        <CardHeader className="sm:block hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Contacts</CardTitle>
            </div>
            <Button size="sm" onClick={handleAddContact}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        {/* Mobile: just the Add Contact button */}
        <div className="sm:hidden flex justify-end p-3 border-b">
          <Button size="sm" onClick={handleAddContact}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-2 max-h-[calc(100vh-300px)]">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {!defaultModel && contacts.some(c => c.isAI) ? (
                    // AI contacts exist but are hidden due to no default model
                    <>
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Select an AI Model First</p>
                      <p className="text-sm mt-2">
                        AI contacts are hidden until you select a default model.
                      </p>
                      <p className="text-sm mt-1">
                        Go to <strong>Settings → AI Models</strong> to choose one.
                      </p>
                    </>
                  ) : (
                    // No contacts at all
                    <>
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No contacts found</p>
                      <p className="text-sm mt-2">Add contacts to start messaging</p>
                    </>
                  )}
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    id={contact.id}
                    name={contact.displayName || contact.name || 'Unknown'}
                    identityHash={contact.personId || contact.id}
                    trustPaths={getTrustPaths(contact)}
                    onSelect={() => handleContactClick(contact)}
                    onSendMessage={() => handleMessageClick(contact)}
                    onBlock={contact.status !== 'owner' && !contact.isAI ? () => handleBlockContact(contact) : undefined}
                    onViewProperties={() => handleContactClick(contact)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Owner Profile Editor */}
      <ProfileEditor
        open={ownerProfileOpen}
        onOpenChange={setOwnerProfileOpen}
        contactId={ownerContact?.personId || ownerContact?.id}
        currentName={ownerContact?.displayName || ownerContact?.name || ''}
        mode="edit"
        required={ownerProfileRequired}
        onSave={handleProfileSaved}
      />

      {/* Contact Profile Viewer */}
      {selectedContact && (
        <ProfileEditor
          open={contactProfileOpen}
          onOpenChange={setContactProfileOpen}
          contactId={selectedContact.personId || selectedContact.id}
          currentName={selectedContact.displayName || selectedContact.name}
          mode="view"
        />
      )}

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={addContactDialogOpen}
        onOpenChange={setAddContactDialogOpen}
        onContactAdded={() => {
          loadContacts()
          setAddContactDialogOpen(false)
        }}
      />
    </div>
  )
}