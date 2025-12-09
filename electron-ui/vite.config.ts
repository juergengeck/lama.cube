import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { electronRenderer } from './vite-plugin-electron-renderer.js'

export default defineConfig({
  base: './',
  plugins: [
    electronRenderer(), // Must be first to handle Node modules
    react()
  ],
  resolve: {
    alias: [
      // CRITICAL: Order matters - more specific paths must come first
      // Map lama.ui's internal @/ imports to lama.ui (for ui components)
      { find: /^@\/components\/ui\/(.*)$/, replacement: path.resolve(__dirname, '../../lama.ui/src/components/ui/$1') },
      { find: '@/lib/utils', replacement: path.resolve(__dirname, '../../lama.ui/src/lib/utils') },

      // Local aliases for electron-ui
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@components', replacement: path.resolve(__dirname, './src/components') },
      { find: '@lib', replacement: path.resolve(__dirname, './src/lib') },

      // External packages
      { find: '@lama/core', replacement: path.resolve(__dirname, '../../lama.core') },
      { find: '@lama/ui', replacement: path.resolve(__dirname, '../../lama.ui/src') },
      { find: '@ui/core', replacement: path.resolve(__dirname, '../../ui.core/src') }
    ]
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['tweetnacl'],
    exclude: [
      'electron'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [
        'ws',
        'dgram'
      ],
      output: {
        format: 'es',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-avatar']
        }
      }
    }
  },
  server: {
    port: 5176,
    open: false,
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* wss://comm.refinio.net wss://comm10.dev.refinio.one wss://*.refinio.net wss://*.refinio.one https://*.refinio.net https://*.refinio.one https://huggingface.co https://*.huggingface.co http://localhost:11434; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    }
  }
})