#!/usr/bin/env node

// Build script for @nucleus/static
// This script can copy assets to consuming apps or prepare them for distribution

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🏗️  Building @nucleus/static package...');

// Create a manifest of all assets for easy reference
const createAssetManifest = () => {
  const assetsDir = path.join(__dirname);
  const manifest = {
    name: '@nucleus/static',
    version: '0.0.0',
    assets: {},
    timestamp: new Date().toISOString()
  };

  // Scan for asset files
  const scanDirectory = (dir, prefix = '') => {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(prefix, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !['node_modules', '.git'].includes(item)) {
        scanDirectory(fullPath, relativePath);
      } else if (stat.isFile() && !item.startsWith('.') && !item.endsWith('.js') && !item.endsWith('.json')) {
        manifest.assets[relativePath.replace(/\\/g, '/')] = {
          size: stat.size,
          modified: stat.mtime.toISOString()
        };
      }
    });
  };

  scanDirectory(assetsDir);
  
  // Write manifest
  fs.writeFileSync(
    path.join(__dirname, 'assets-manifest.json'), 
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`📦 Generated manifest with ${Object.keys(manifest.assets).length} assets`);
};

// Copy assets to a target directory (for apps that need them)
export const copyAssetsTo = (targetDir) => {
  console.log(`📂 Copying assets to ${targetDir}`);
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy all asset files
  const copyRecursive = (src, dest) => {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }
      
      const items = fs.readdirSync(src);
      items.forEach(item => {
        if (!item.startsWith('.') && !item.endsWith('.js') && !item.endsWith('.json')) {
          copyRecursive(path.join(src, item), path.join(dest, item));
        }
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };
  
  copyRecursive(__dirname, targetDir);
  console.log('✅ Assets copied successfully');
};

// Main build process
const build = () => {
  createAssetManifest();
  console.log('✅ Static assets package built successfully!');
};

// Run build if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}
