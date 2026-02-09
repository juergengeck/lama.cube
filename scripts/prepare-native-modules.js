#!/usr/bin/env node
/**
 * Prepare native modules for Electron bundling
 *
 * Copies node-llama-cpp and platform-specific binaries to a staging folder
 * that electron-builder can include in extraResources.
 *
 * Usage: node scripts/prepare-native-modules.js [platform]
 * Platform: linux-x64, darwin-arm64, darwin-x64, win32-x64
 */

import { cp, mkdir, rm, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const monorepoRoot = join(projectRoot, '..', '..');
const pnpmStore = join(monorepoRoot, 'node_modules', '.pnpm');

// Map platform to @node-llama-cpp package name
const platformPackages = {
  'linux-x64': '@node-llama-cpp/linux-x64',
  'linux-arm64': '@node-llama-cpp/linux-arm64',
  'darwin-arm64': '@node-llama-cpp/mac-arm64-metal',
  'darwin-x64': '@node-llama-cpp/mac-x64',
  'win32-x64': '@node-llama-cpp/win-x64',
  'win32-arm64': '@node-llama-cpp/win-arm64'
};

async function findPackageInPnpmStore(packageName) {
  // Find the package directory in pnpm store
  // Format: @scope+name@version or name@version
  const searchName = packageName.replace('@', '').replace('/', '+');

  const entries = await readdir(pnpmStore);
  const match = entries.find(e => e.startsWith(searchName + '@'));

  if (!match) {
    throw new Error(`Package ${packageName} not found in pnpm store`);
  }

  // Navigate to the actual package inside node_modules
  const packagePath = join(pnpmStore, match, 'node_modules', packageName);

  if (!existsSync(packagePath)) {
    throw new Error(`Package path not found: ${packagePath}`);
  }

  return packagePath;
}

async function prepareNativeModules(platform) {
  const outputDir = join(projectRoot, 'native-modules');

  console.log(`Preparing native modules for ${platform}...`);
  console.log(`Output: ${outputDir}`);

  // Clean and create output directory
  if (existsSync(outputDir)) {
    await rm(outputDir, { recursive: true });
  }
  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputDir, 'node_modules'), { recursive: true });
  await mkdir(join(outputDir, 'node_modules', '@node-llama-cpp'), { recursive: true });

  // 1. Copy node-llama-cpp
  console.log('\n1. Copying node-llama-cpp...');
  const nodeLlamaCppPath = await findPackageInPnpmStore('node-llama-cpp');
  await cp(nodeLlamaCppPath, join(outputDir, 'node_modules', 'node-llama-cpp'), { recursive: true });
  console.log(`   Copied from: ${nodeLlamaCppPath}`);

  // 2. Copy platform-specific package
  const platformPkg = platformPackages[platform];
  if (!platformPkg) {
    throw new Error(`Unknown platform: ${platform}. Valid: ${Object.keys(platformPackages).join(', ')}`);
  }

  console.log(`\n2. Copying ${platformPkg}...`);
  const platformPath = await findPackageInPnpmStore(platformPkg);
  const platformName = platformPkg.split('/')[1]; // e.g., 'linux-x64'
  await cp(platformPath, join(outputDir, 'node_modules', '@node-llama-cpp', platformName), { recursive: true });
  console.log(`   Copied from: ${platformPath}`);

  // 3. Report sizes
  console.log('\n=== Native modules prepared ===');
  const { execSync } = await import('child_process');
  const size = execSync(`du -sh "${outputDir}"`, { encoding: 'utf8' }).trim();
  console.log(`Total size: ${size.split('\t')[0]}`);

  return outputDir;
}

// Main
const platform = process.argv[2] || `${process.platform}-${process.arch}`;
prepareNativeModules(platform).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
