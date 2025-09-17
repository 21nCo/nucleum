// Shared asset copying utilities with path validation for static
import fs from 'fs';
import path from 'path';

// Path validation utility to prevent directory traversal
export function validatePath(inputPath, basePath) {
  const normalizedPath = path.normalize(inputPath);
  const resolvedPath = path.resolve(basePath, normalizedPath);
  const resolvedBase = path.resolve(basePath);
  
  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error(`Path traversal attempt detected: ${inputPath}`);
  }
  
  return resolvedPath;
}

// Validate item names to prevent malicious filenames
export function validateItemName(item) {
  if (item.includes('..') || item.includes('/') || item.includes('\\')) {
    console.warn(`Skipping potentially malicious item: ${item}`);
    return false;
  }
  return true;
}

// Shared asset copying function with security validation
export function copyAssetsRecursive(src, dest, srcBase, destBase) {
  const validatedSrc = validatePath(src, srcBase);
  const validatedDest = validatePath(dest, destBase);
  const stat = fs.statSync(validatedSrc);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(validatedDest)) {
      fs.mkdirSync(validatedDest, { recursive: true });
    }
    
    const items = fs.readdirSync(validatedSrc);
    items.forEach(item => {
      if (!validateItemName(item)) {
        return;
      }
      
      if (!item.startsWith('.') && !item.endsWith('.js') && !item.endsWith('.json')) {
        copyAssetsRecursive(
          path.join(src, item), 
          path.join(dest, item),
          srcBase,
          destBase
        );
      }
    });
  } else {
    fs.copyFileSync(validatedSrc, validatedDest);
  }
}

// Scan directory for assets with security validation
export function scanDirectoryForAssets(dir, basePath, prefix = '', manifest = null) {
  const validatedDir = validatePath(dir, basePath);
  const items = fs.readdirSync(validatedDir);
  const results = [];
  
  items.forEach(item => {
    if (!validateItemName(item)) {
      return;
    }
    
    const fullPath = validatePath(path.join(dir, item), basePath);
    const relativePath = path.join(prefix, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !['node_modules', '.git'].includes(item)) {
      const subResults = scanDirectoryForAssets(fullPath, basePath, relativePath, manifest);
      results.push(...subResults);
    } else if (stat.isFile() && !item.startsWith('.') && !item.endsWith('.js') && !item.endsWith('.json')) {
      const assetInfo = {
        path: relativePath.replace(/\\\\/g, '/'),
        size: stat.size,
        modified: stat.mtime.toISOString()
      };
      
      if (manifest) {
        manifest.assets[assetInfo.path] = {
          size: assetInfo.size,
          modified: assetInfo.modified
        };
      }
      
      results.push(assetInfo);
    }
  });
  
  return results;
}
