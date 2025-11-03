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
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib')
    }
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