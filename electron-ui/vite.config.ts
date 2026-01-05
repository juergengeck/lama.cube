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
      { find: '@lama/core/events', replacement: path.resolve(__dirname, '../../lama.core/events/index.ts') },
      { find: '@lama/core', replacement: path.resolve(__dirname, '../../lama.core') },
      { find: '@lama/ui', replacement: path.resolve(__dirname, '../../lama.ui/src') },
      { find: '@ui/core', replacement: path.resolve(__dirname, '../../ui.core/src') },
      { find: '@local/core', replacement: path.resolve(__dirname, '../../local.core/src') },

      // lamejs ESM shim - must not be processed by Vite's optimizer
      { find: 'lamejs', replacement: path.resolve(__dirname, '../../lama.ui/src/lib/lamejs-shim.ts') },

      // path-browserify for workers (window.require doesn't work in workers)
      { find: 'path', replacement: 'path-browserify' },

      // Force kokoro-js to use web version (no Node.js dependencies)
      { find: 'kokoro-js', replacement: path.resolve(__dirname, 'node_modules/kokoro-js/dist/kokoro.web.js') }
    ]
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'tweetnacl',
      // CRITICAL: Include worker files in entries so Vite scans them for dependencies
      // at startup, not when the worker is first loaded (which triggers reload)
      './src/workers/tts.worker.ts'
    ],
    exclude: [
      'electron',
      'lamejs'  // Prevent Vite from breaking lamejs bundle structure
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  worker: {
    format: 'es',
    plugins: () => [
      // Don't use electronRenderer for workers - they can't access window.require
      react()
    ],
    rollupOptions: {
      output: {
        // Ensure transformers.js is fully inlined in the worker bundle
        inlineDynamicImports: true
      },
      // Workers can't use window.require, so use browser polyfills
      external: [],
      plugins: [
        {
          name: 'worker-node-polyfills',
          resolveId(id) {
            if (id === 'path') {
              return { id: 'path-browserify', external: false };
            }
            return null;
          }
        }
      ]
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
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* wss://comm.refinio.net wss://comm10.dev.refinio.one wss://*.refinio.net wss://*.refinio.one https://*.refinio.net https://*.refinio.one https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn-lfs.hf.co https://cdn-lfs-us-1.hf.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com http://localhost:11434; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:;"
    }
  }
})