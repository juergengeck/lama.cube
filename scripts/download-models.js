#!/usr/bin/env node
/**
 * Download bundled models for distribution
 *
 * Checks for existing cached copies before downloading.
 * Models are placed in models/ directory for electron-builder to include.
 */

import { pipeline, env } from '@huggingface/transformers';
import { existsSync, mkdirSync, cpSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// Models to bundle (from ModelRegistry bundled: true)
const BUNDLED_MODELS = [
  {
    id: 'all-MiniLM-L6-v2',
    repo: 'Xenova/all-MiniLM-L6-v2',  // Open model, no auth required
    type: 'embedding',
    size: '~90MB'
  },
  {
    id: 'whisper-tiny',
    repo: 'Xenova/whisper-tiny',
    type: 'whisper',
    size: '~75MB'
  }
];

// Possible cache locations to check
const CACHE_LOCATIONS = [
  // transformers.js default (node)
  join(homedir(), '.cache', 'huggingface', 'hub'),
  // Electron app cache (development)
  join(homedir(), 'Library', 'Application Support', 'LAMA', 'models'),
  // Alternate location
  join(homedir(), '.cache', 'transformers'),
];

const OUTPUT_DIR = join(process.cwd(), 'models');

/**
 * Find model in cache locations
 * Returns path if found, null otherwise
 */
function findCachedModel(repo) {
  // transformers.js cache format: "models--Xenova--whisper-tiny"
  const cacheKey = `models--${repo.replace('/', '--')}`;

  for (const cacheDir of CACHE_LOCATIONS) {
    const modelPath = join(cacheDir, cacheKey);
    if (existsSync(modelPath)) {
      // Verify it has actual model files
      const snapshotsPath = join(modelPath, 'snapshots');
      if (existsSync(snapshotsPath)) {
        const snapshots = readdirSync(snapshotsPath);
        if (snapshots.length > 0) {
          const latestSnapshot = join(snapshotsPath, snapshots[snapshots.length - 1]);
          // Check for onnx directory or model files
          if (existsSync(join(latestSnapshot, 'onnx')) ||
              readdirSync(latestSnapshot).some(f => f.endsWith('.onnx'))) {
            return latestSnapshot;
          }
        }
      }
    }
  }

  // Also check for models already in output directory (preserves / as hierarchy)
  const [org, name] = repo.split('/');
  const outputPath = join(OUTPUT_DIR, org, name);
  if (existsSync(outputPath)) {
    try {
      const files = readdirSync(outputPath);
      if (files.some(f => f.endsWith('.onnx') || f === 'onnx')) {
        return outputPath;
      }
    } catch {}
  }

  return null;
}

/**
 * Copy model from cache to output directory
 * Preserves org/name hierarchy: Xenova/whisper-tiny -> models/Xenova/whisper-tiny
 */
function copyFromCache(sourcePath, repo) {
  const [org, name] = repo.split('/');
  const destPath = join(OUTPUT_DIR, org, name);

  if (existsSync(destPath)) {
    console.log(`  Already in output: ${destPath}`);
    return destPath;
  }

  console.log(`  Copying from cache: ${sourcePath}`);
  mkdirSync(destPath, { recursive: true });
  cpSync(sourcePath, destPath, { recursive: true });

  return destPath;
}

/**
 * Download model using transformers.js
 */
async function downloadModel(model) {
  console.log(`  Downloading from HuggingFace: ${model.repo}`);

  // Set cache to output directory (transformers.js will create org/name structure)
  env.cacheDir = OUTPUT_DIR;
  env.allowLocalModels = true;
  env.useBrowserCache = false;

  try {
    // Download by loading the pipeline
    if (model.type === 'embedding') {
      await pipeline('feature-extraction', model.repo, {
        progress_callback: (progress) => {
          if (progress.status === 'download' && progress.progress) {
            process.stdout.write(`\r  Downloading: ${progress.progress.toFixed(1)}%`);
          }
        }
      });
    } else if (model.type === 'whisper') {
      await pipeline('automatic-speech-recognition', model.repo, {
        progress_callback: (progress) => {
          if (progress.status === 'download' && progress.progress) {
            process.stdout.write(`\r  Downloading: ${progress.progress.toFixed(1)}%`);
          }
        }
      });
    }
    console.log('\n  Download complete');
    return true;
  } catch (error) {
    console.error(`\n  Download failed: ${error.message}`);
    return false;
  }
}

/**
 * Get total size of directory
 */
function getDirSize(dir) {
  let size = 0;
  const files = readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = join(dir, file.name);
    if (file.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += statSync(filePath).size;
    }
  }
  return size;
}

/**
 * Format bytes as human-readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function main() {
  console.log('=== LAMA Model Bundler ===\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalSize = 0;
  let successCount = 0;

  for (const model of BUNDLED_MODELS) {
    console.log(`\n[${model.id}] (${model.size})`);

    // Check for cached copy
    const cachedPath = findCachedModel(model.repo);

    if (cachedPath) {
      console.log(`  Found cached copy`);
      const destPath = copyFromCache(cachedPath, model.repo);
      const size = getDirSize(destPath);
      totalSize += size;
      console.log(`  Size: ${formatBytes(size)}`);
      successCount++;
    } else {
      // Download
      const success = await downloadModel(model);
      if (success) {
        const [org, name] = model.repo.split('/');
        const destPath = join(OUTPUT_DIR, org, name);
        if (existsSync(destPath)) {
          const size = getDirSize(destPath);
          totalSize += size;
          console.log(`  Size: ${formatBytes(size)}`);
          successCount++;
        }
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Models bundled: ${successCount}/${BUNDLED_MODELS.length}`);
  console.log(`Total size: ${formatBytes(totalSize)}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  if (successCount < BUNDLED_MODELS.length) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
