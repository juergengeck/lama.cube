import { resolve, join, dirname } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pinoBundle from 'rollup-plugin-pino-bundle'
import { cpSync, existsSync, readdirSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin to fix legacy octal escapes (\033) in node_modules
 * Transforms them to hex escapes (\x1b) which are valid in ES modules
 * Only applied to specific packages known to have this issue
 */
const OCTAL_ESCAPE_PACKAGES = ['qrcode-terminal', '@whiskeysockets/baileys']

function fixLegacyOctalEscapes(): Plugin {
  return {
    name: 'fix-legacy-octal-escapes',
    enforce: 'pre',
    transform(code, id) {
      // Only process files from packages that need this fix
      if (!OCTAL_ESCAPE_PACKAGES.some(pkg => id.includes(pkg))) return null
      if (!code.includes('\\033')) return null

      // Replace \033 with \x1b (both represent ESC character)
      const fixed = code.replace(/\\033/g, '\\x1b')
      return { code: fixed, map: null }
    }
  }
}

/**
 * Vite plugin to inject __dirname and __filename polyfills for ESM
 *
 * Some CommonJS packages (like pino-pretty used by node-llama-cpp) use __dirname.
 * In ESM bundles, these need to be computed from import.meta.url.
 *
 * This plugin adds the polyfill at the top of the bundle.
 */
function injectDirnamePolyfill(): Plugin {
  return {
    name: 'inject-dirname-polyfill',
    renderChunk(code, chunk) {
      // Only inject in main entry chunk
      if (!chunk.isEntry) return null

      // Check if __dirname or __filename is used
      if (!code.includes('__dirname') && !code.includes('__filename')) {
        return null
      }

      // Inject polyfill at the top
      const polyfill = `
import { fileURLToPath as __polyfill_fileURLToPath } from 'url';
import { dirname as __polyfill_dirname } from 'path';
const __filename = __polyfill_fileURLToPath(import.meta.url);
const __dirname = __polyfill_dirname(__filename);
`
      return {
        code: polyfill + code,
        map: null
      }
    }
  }
}

/**
 * Vite plugin to bundle node-llama-cpp native binaries
 *
 * node-llama-cpp looks for binaries in this order:
 * 1. {node-llama-cpp}/bins/{platform}/ (local prebuilt)
 * 2. @node-llama-cpp/{platform} package (dynamic import)
 *
 * We copy the platform binaries to out/main/bins/ at build time,
 * so they're found via path (1) without needing the @node-llama-cpp packages.
 */
function bundleNodeLlamaCppBinaries(): Plugin {
  const platformPackages: Record<string, string> = {
    'linux-x64': '@node-llama-cpp+linux-x64',
    'linux-arm64': '@node-llama-cpp+linux-arm64',
    'darwin-arm64': '@node-llama-cpp+mac-arm64-metal',
    'darwin-x64': '@node-llama-cpp+mac-x64',
    'win32-x64': '@node-llama-cpp+win-x64',
    'win32-arm64': '@node-llama-cpp+win-arm64'
  }

  return {
    name: 'bundle-node-llama-cpp-binaries',
    apply: 'build',
    closeBundle() {
      const platform = `${process.platform}-${process.arch}`
      const pkgPrefix = platformPackages[platform]

      if (!pkgPrefix) {
        console.log(`[node-llama-cpp] No prebuilt binaries for ${platform}, skipping`)
        return
      }

      const pnpmStore = join(__dirname, '..', '..', 'node_modules', '.pnpm')
      const entries = readdirSync(pnpmStore)
      const pkgDir = entries.find(e => e.startsWith(pkgPrefix + '@'))

      if (!pkgDir) {
        console.warn(`[node-llama-cpp] Package ${pkgPrefix} not found in pnpm store`)
        return
      }

      const platformName = pkgPrefix.replace('@node-llama-cpp+', '')
      const srcBins = join(pnpmStore, pkgDir, 'node_modules', '@node-llama-cpp', platformName, 'bins')

      if (!existsSync(srcBins)) {
        console.warn(`[node-llama-cpp] Bins not found at ${srcBins}`)
        return
      }

      const destBins = join(__dirname, 'out', 'main', 'bins')
      cpSync(srcBins, destBins, { recursive: true })
      console.log(`[node-llama-cpp] Binaries copied for ${platform}`)

      // Also copy binariesGithubRelease.json
      const nodeLlamaCppDir = entries.find(e => e.startsWith('node-llama-cpp@'))
      if (nodeLlamaCppDir) {
        const srcJson = join(pnpmStore, nodeLlamaCppDir, 'node_modules', 'node-llama-cpp', 'llama', 'binariesGithubRelease.json')
        const destLlama = join(__dirname, 'out', 'llama')
        if (existsSync(srcJson)) {
          if (!existsSync(destLlama)) {
            mkdirSync(destLlama, { recursive: true })
          }
          cpSync(srcJson, join(destLlama, 'binariesGithubRelease.json'))
        }
      }
    }
  }
}

// All workspace packages for externalizeDepsPlugin exclude
// Also include legacy packages that need octal escape transformation
const workspacePackages = [
  '@refinio/api', '@refinio/assembly.core', '@refinio/chat.baileys', '@refinio/chat.core',
  '@refinio/connection.btle', '@refinio/connection.core', '@refinio/cube.core', '@refinio/glue.moltbook',
  '@refinio/lama.core', '@refinio/lama.ui', '@refinio/lama.youtube', '@refinio/local.core', '@refinio/local.llama',
  '@refinio/mcp.core', '@refinio/meaning.core', '@refinio/memory.core', '@refinio/one.core',
  '@refinio/one.knowledge', '@refinio/one.models', '@refinio/settings.core', '@refinio/transport.core',
  '@refinio/transport.node', '@refinio/trust.abac', '@refinio/trust.core', '@refinio/ui.core',
  // Legacy packages that need octal escape transformation to bundle
  'qrcode-terminal',
  '@whiskeysockets/baileys',
  // jimp-compact - required by baileys for image processing
  'jimp-compact',
  // node-llama-cpp - bundle the JS, copy binaries separately via plugin
  'node-llama-cpp',
  // pino ecosystem - rollup-plugin-pino-bundle needs these available for bundling
  'pino',
  'pino-pretty',
  'thread-stream'
  // Note: @roamhq/wrtc is NOT bundled - transport.node handles missing wrtc gracefully
]

// Only these 3 packages lack "exports" field - they need manual aliases
// because Vite can't resolve their deep imports (e.g., @refinio/one.core/lib/foo.js)
// All other packages have proper exports and will resolve via node resolution
const packagesWithoutExports = [
  { name: '@refinio/one.core', dir: '../one.core' },
  { name: '@refinio/one.models', dir: '../one.models' },
  { name: '@refinio/one.knowledge', dir: '../one.knowledge' }
  // Note: trust.abac was removed - it has proper exports field
]

// Aliases only for packages without exports
const legacyPackageAliases = packagesWithoutExports.map(({ name, dir }) => ({
  find: new RegExp(`^${name.replace(/[.]/g, '\\.')}(/.*)?$`),
  replacement: resolve(dir) + '$1'
}))

// Pino deep imports that rollup-plugin-pino-bundle needs to resolve
// These packages don't have proper "exports" fields for deep imports
const pinoDeepImportAliases = [
  {
    find: 'thread-stream/lib/worker.js',
    replacement: join(__dirname, '..', '..', 'node_modules', '.pnpm', 'thread-stream@2.7.0', 'node_modules', 'thread-stream', 'lib', 'worker.js')
  },
  {
    find: 'pino/lib/worker.js',
    replacement: join(__dirname, '..', '..', 'node_modules', '.pnpm', 'pino@8.21.0', 'node_modules', 'pino', 'lib', 'worker.js')
  },
  {
    find: 'pino/file.js',
    replacement: join(__dirname, '..', '..', 'node_modules', '.pnpm', 'pino@8.21.0', 'node_modules', 'pino', 'file.js')
  }
]

// ============================================================================
// NATIVE MODULES - CRITICAL WARNING
// ============================================================================
// Packages listed here are EXCLUDED FROM THE ENTIRE BUNDLE!
// They will NOT be available at runtime in the packaged app!
//
// The final AppImage/DMG does NOT include node_modules - everything must be
// bundled into out/main/index.js or copied via custom plugins.
//
// If you NEED a native module at runtime:
//   1. REMOVE it from this array
//   2. Create a custom Vite plugin to copy its binaries (see bundleNodeLlamaCppBinaries)
//   3. Or stub it out if the feature can be disabled
//
// Example: node-llama-cpp is NOT in this array - we bundle its JS and copy
// binaries via bundleNodeLlamaCppBinaries plugin.
//
// Example: onnxruntime-node WAS here but we removed main process ONNX entirely.
// TTS now uses renderer-side worker with WebGPU/WASM (no native deps).
// ============================================================================
const nativeModules = [
  // Bluetooth native modules - BTLE features will NOT work in packaged app!
  '@abandonware/noble',
  '@abandonware/bleno',
  '@abandonware/bluetooth-hci-socket',
  // wrtc - externalized, transport.node handles missing gracefully at runtime
  '@roamhq/wrtc',
  '@roamhq/wrtc-linux-x64',
  '@roamhq/wrtc-linux-arm64',
  '@roamhq/wrtc-darwin-x64',
  '@roamhq/wrtc-darwin-arm64',
  '@roamhq/wrtc-win32-x64',
  '@roamhq/wrtc-win32-arm64',
  // Note: onnxruntime-node was removed - main process ONNX providers are now stubs
  // TTS uses renderer-side worker (tts.worker.ts) with WebGPU/WASM instead
  // node-llama-cpp platform-specific bindings - externalized because:
  // 1. They contain native .node addons
  // 2. They're dynamically imported by node-llama-cpp
  // 3. Our bundleNodeLlamaCppBinaries plugin copies the bins directly,
  //    so these packages are never actually loaded at runtime
  '@node-llama-cpp/mac-arm64-metal',
  '@node-llama-cpp/mac-x64',
  '@node-llama-cpp/linux-arm64',
  '@node-llama-cpp/linux-armv7l',
  '@node-llama-cpp/linux-x64',
  '@node-llama-cpp/linux-x64-cuda',
  '@node-llama-cpp/linux-x64-cuda-ext',
  '@node-llama-cpp/linux-x64-vulkan',
  '@node-llama-cpp/win-arm64',
  '@node-llama-cpp/win-x64',
  '@node-llama-cpp/win-x64-cuda',
  '@node-llama-cpp/win-x64-cuda-ext',
  '@node-llama-cpp/win-x64-vulkan'
  // Note: node-llama-cpp itself is now BUNDLED (in workspacePackages)
  // The binaries are copied by bundleNodeLlamaCppBinaries plugin
]

export default defineConfig({
  main: {
    // Externalize npm deps but NOT workspace packages (they need to be bundled)
    // fixLegacyOctalEscapes transforms \033 to \x1b for qrcode-terminal/baileys
    // bundleNodeLlamaCppBinaries copies platform-specific native binaries
    // injectDirnamePolyfill adds __dirname/__filename for CommonJS compat
    plugins: [
      // Bundle pino with its worker threads and transports
      // This plugin emits chunks that need to be resolved before externalization
      pinoBundle({ transports: ['pino-pretty'] }),
      fixLegacyOctalEscapes(),
      externalizeDepsPlugin({ exclude: workspacePackages }),
      bundleNodeLlamaCppBinaries()
      // Note: injectDirnamePolyfill removed - electron-vite handles CJS shims
    ],
    resolve: {
      // Follow symlinks for pnpm workspace resolution
      preserveSymlinks: false,
      // Aliases for packages without exports field + pino deep imports + jimp alias
      alias: [
        ...legacyPackageAliases,
        ...pinoDeepImportAliases,
        // baileys imports 'jimp' but we use jimp-compact (lighter version)
        { find: 'jimp', replacement: 'jimp-compact' }
      ]
    },
    build: {
      rollupOptions: {
        external: nativeModules
      }
    }
  },
  preload: {
    plugins: [
      fixLegacyOctalEscapes(),
      externalizeDepsPlugin({ exclude: workspacePackages })
    ],
    resolve: {
      preserveSymlinks: false,
      alias: legacyPackageAliases
    },
    build: {
      rollupOptions: {
        external: nativeModules,
        output: {
          // Preload scripts MUST be CJS for contextIsolation to work properly
          // ESM preload causes "Electron API not available" errors in renderer
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@': resolve('src/renderer'),
        '@components': resolve('src/renderer/components'),
        '@lib': resolve('src/renderer/lib'),
        // Workspace package aliases for renderer
        '@lama/ui': resolve('../lama.ui/src'),
        '@refinio/lama.ui': resolve('../lama.ui/src'),
        '@ui/core': resolve('../ui.core/src'),
        '@refinio/ui.core': resolve('../ui.core/src'),
        '@settings/core': resolve('../settings.core/src'),
        '@refinio/settings.core': resolve('../settings.core/src'),
        'lamejs': resolve('../lama.ui/src/lib/lamejs-shim.ts'),
        'path': 'path-browserify',
        'kokoro-js': resolve('node_modules/kokoro-js/dist/kokoro.web.js'),
        '@huggingface/transformers': resolve('../../node_modules/.pnpm/kokoro-js@1.2.1/node_modules/@huggingface/transformers/dist/transformers.js')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        external: ['ws', 'dgram']
      }
    },
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      include: ['tweetnacl'],
      exclude: ['electron', 'lamejs']
    }
  }
})
