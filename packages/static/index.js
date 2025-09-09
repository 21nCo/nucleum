// @nucleus/static - Shared static assets
// This package provides access to shared static assets across all apps

// Asset path helpers
export const assetPath = (path) => `/static/${path}`;

// Common assets
export const assets = {
  // Images
  nucleusLogo: assetPath('nucleus.png'),
  favicon: assetPath('favicon.ico'),
  
  // Sounds
  sounds: {
    dingding: assetPath('sounds/dingding.mp3'),
    tick1: assetPath('sounds/tick1.mp3'),
    tick: assetPath('sounds/tick.mp3'),
    upchime: assetPath('sounds/upchime.mp3'),
    ping: assetPath('sounds/ping.wav')
  },
  
  // Icons
  icons: {
    arrowBack: assetPath('icons/arrow_back.svg')
  }
};

// Manifest
export const manifest = assetPath('manifest.json');
export const worker = assetPath('worker.js');

// Re-export everything as default
export default assets;
