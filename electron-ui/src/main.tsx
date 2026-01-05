console.log('[MAIN] Starting LAMA app...')

// Global error handler
window.onerror = (msg, url, line, col, error) => {
  console.error('[MAIN] Global error:', msg, url, line, col, error)
  document.body.innerHTML = `<pre style="color:red;padding:20px;">GLOBAL ERROR: ${msg}\n${url}:${line}:${col}\n${error?.stack || ''}</pre>`
}
window.onunhandledrejection = (event) => {
  console.error('[MAIN] Unhandled rejection:', event.reason)
  document.body.innerHTML = `<pre style="color:red;padding:20px;">UNHANDLED REJECTION: ${event.reason}\n${event.reason?.stack || ''}</pre>`
}
console.log('[MAIN] window.electronAPI available?', typeof window !== 'undefined' && !!window.electronAPI)
if (typeof window !== 'undefined' && window.electronAPI) {
  console.log('[MAIN] ✅ electronAPI is available with methods:', Object.keys(window.electronAPI))
  // Force a test message to main process
  if (window.electronAPI.log) {
    window.electronAPI.log('[MAIN] TEST - electronAPI is working!')
  }
} else {
  console.error('[MAIN] ❌ electronAPI is NOT available - preload script may not have run')
  // Try again after a delay
  setTimeout(() => {
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log('[MAIN] DELAYED TEST - electronAPI now available!')
    }
  }, 1000)
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('[MAIN] Before imports...')

// Create root once and reuse it
const rootElement = document.getElementById('root')
const reactRoot = rootElement ? ReactDOM.createRoot(rootElement) : null

if (reactRoot) {
  console.log('[MAIN] Rendering loading component...')
  reactRoot.render(
    <div style={{color: 'white', padding: 20}}>
      <h1>Loading...</h1>
      <p>If you see this, React works. Loading full app...</p>
    </div>
  )
}

// Now load the real app
Promise.all([
  import('./App.tsx'),
  import('./initialization/platform'),
  import('./services/browser-init.ts')
]).then(async ([{ default: App }, _, { browserInit }]) => {
  console.log('[MAIN] Modules loaded, initializing...')

  try {
    const initResult = await browserInit.initialize()
    console.log('[MAIN] Init result:', initResult)
  } catch (error) {
    console.error('[MAIN] Init error:', error)
  }

  console.log('[MAIN] Rendering full App...')
  if (reactRoot) {
    reactRoot.render(<App />)
  }
  console.log('[MAIN] ✅ Done')
}).catch(err => {
  console.error('[MAIN] ❌ Module load failed:', err)
  if (rootElement) {
    rootElement.innerHTML = `<pre style="color:red;padding:20px;">MODULE LOAD ERROR:\n${err}\n${err.stack}</pre>`
  }
})

// Development: Restart Node.js instance when HMR reloads the page
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', async () => {
    console.log('[MAIN] Vite HMR full reload detected - restarting Node.js instance...')
    if (window.electronAPI && window.electronAPI.invoke) {
      try {
        const result = await window.electronAPI.invoke('onecore:restartNode')
        console.log('[MAIN] Node restart result:', result)
      } catch (error) {
        console.error('[MAIN] Failed to restart Node instance:', error)
      }
    }
  })
}