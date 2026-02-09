/**
 * Browser UI Initialization (NO ONE.CORE)
 * Browser is ONLY a UI layer - all ONE.core operations go through IPC to Node.js
 */

console.log('[BrowserInit] Module loaded - UI layer only')

// NO ONE.CORE IN BROWSER - Just a UI layer that uses IPC

export class BrowserInit {
  private initialized = false
  private currentUser: any = null
  private loginCredentials: { username: string; password: string } | null = null

  async initialize(): Promise<{ ready: boolean; needsAuth: boolean }> {
    if (this.initialized) {
      console.log('[BrowserInit] Already initialized - ready for login')
      return { ready: true, needsAuth: !this.currentUser }
    }

    console.log('[BrowserInit] Browser is just UI - checking if Node already provisioned...')

    // Check if main process already has an initialized instance (e.g., from auto-init)
    if (window.electronAPI) {
      try {
        const status = await window.electronAPI.invoke('onecore:getNodeStatus')
        console.log('[BrowserInit] Node status:', status)

        if (status.success && status.initialized && status.ownerId) {
          // Node is already provisioned - set currentUser from main process state
          console.log('[BrowserInit] Node already initialized, recovering session...')

          // Get user info from stateManager via IPC
          const userResponse = await window.electronAPI.invoke('state:get', { path: 'user' })
          console.log('[BrowserInit] User state response from main:', userResponse)

          // Unwrap IPC response - data is wrapped in { success, data }
          const userState = userResponse?.data || userResponse
          console.log('[BrowserInit] User state unwrapped:', userState)

          if (userState && (userState.name || userState.id)) {
            this.currentUser = {
              instanceName: status.name || `lama-${userState.name}`,
              name: userState.name || 'User',
              id: userState.id || status.ownerId,
              loggedInAt: new Date().toISOString()
            }
            console.log('[BrowserInit] ✅ Recovered session for user:', this.currentUser.name)
            this.initialized = true
            return { ready: true, needsAuth: false }
          }
        }
      } catch (error) {
        console.log('[BrowserInit] Failed to check node status:', error)
        // Fall through to require login
      }
    }

    // Try auto-login from saved credentials
    try {
      const saved = localStorage.getItem('lama-last-user')
      if (saved) {
        const { username, hint } = JSON.parse(saved)
        if (username && hint) {
          console.log('[BrowserInit] Auto-login with saved credentials for:', username)
          await this.login(username, hint)
          return { ready: true, needsAuth: false }
        }
      }
    } catch (error) {
      console.warn('[BrowserInit] Auto-login failed:', error)
      // Fall through to login screen
    }

    // Mark as ready so the UI can render the login screen
    this.initialized = true

    // Need auth - Node.js not provisioned or no user state
    return { ready: true, needsAuth: true }
  }

  /**
   * Handle user login - Just forwards to Node.js via IPC
   */
  async login(username: string, password: string): Promise<any> {
    console.log('[BrowserInit] User login:', username)

    // Store credentials for UI purposes
    this.loginCredentials = { username, password }

    try {
      // Call Node.js to initialize ONE.core instance
      console.log('[BrowserInit] Calling Node.js to initialize ONE.core...')

      if (!window.electronAPI) {
        throw new Error('Electron API not available - cannot communicate with Node.js')
      }

      // Set up progress event listener
      const progressListener = (data: { stage: string; percent: number; message: string }) => {
        console.log(`[BrowserInit] Initialization progress: ${data.percent}% - ${data.message}`)
        // UI can listen to this event to show progress (e.g., via custom event)
        window.dispatchEvent(new CustomEvent('onecore-init-progress', { detail: data }))
      }

      // Register progress listener (returns cleanup function)
      const cleanupListener = window.electronAPI.on('onecore:init-progress', progressListener)

      // Initialize Node.js ONE.core instance with timeout
      const INIT_TIMEOUT = 30000 // 30 seconds
      const t0 = performance.now()
      console.log('[BrowserInit] ⏱️ Calling onecore:initializeNode at', t0.toFixed(1), 'ms')
      const nodeResult = await Promise.race([
        window.electronAPI.invoke('onecore:initializeNode', {
          user: {
            name: username,
            password: password
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Initialization timeout - Node.js did not respond within 30 seconds')), INIT_TIMEOUT)
        )
      ])
      const t1 = performance.now()
      console.log('[BrowserInit] ⏱️ onecore:initializeNode returned after', (t1-t0).toFixed(1), 'ms')

      // Cleanup progress listener
      cleanupListener()

      console.log('[BrowserInit] Node.js response:', nodeResult)

      if (!nodeResult || !nodeResult.success) {
        throw new Error(`Failed to initialize Node.js instance: ${nodeResult?.error || 'No response'}`)
      }

      // Store user info for UI
      this.currentUser = {
        instanceName: `lama-${username}`,
        name: username,
        id: `lama-${username}`,
        password: password,
        loggedInAt: new Date().toISOString()
      }

      console.log('[BrowserInit] ✅ Node.js ONE.core initialized:', nodeResult.nodeId)

      // NOTE: Default chats are created automatically by AIAssistantHandler.init()
      // which is called during Node.js ONE.core initialization in node-one-core.ts
      // No separate IPC call needed here

      // Store Node info for debugging
      ;(window as any).nodeInstanceInfo = {
        nodeId: nodeResult.nodeId,
        endpoint: nodeResult.endpoint || 'ws://localhost:8765'
      }

      return { success: true, user: this.currentUser }

    } catch (error) {
      console.error('[BrowserInit] Login failed:', error)
      throw error
    }
  }

  async logout(): Promise<void> {
    console.log('[BrowserInit] Logout')
    this.currentUser = null
    this.loginCredentials = null
    // TODO: Call Node.js to logout if needed
  }

  getCurrentUser(): any {
    return this.currentUser
  }

  isInitialized(): boolean {
    return this.initialized
  }

  // These return null - no browser ONE.core models
  getLeuteModel(): any {
    // NO BROWSER ONE.CORE - Use IPC
    return null
  }

  getChannelManager(): any {
    // NO BROWSER ONE.CORE - Use IPC
    return null
  }

  getAppModel(): any {
    // NO BROWSER ONE.CORE - Use IPC
    return null
  }
}

export const browserInit = new BrowserInit()