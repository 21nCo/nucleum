# Timear for Linear - Browser Extension

Plasmo-based browser extension for time tracking directly from Linear.

## Features

- **In-Page Timer**: Start/stop timer directly from Linear issue pages
- **Auto-Detection**: Automatically detects current Linear issue
- **Timer State Sync**: Syncs timer state across tabs and with backend
- **Visual Indicator**: Shows elapsed time with live updates
- **Quick Actions**: Switch timer between issues or stop active timer

## Installation

### Development

```bash
# Install dependencies
npm install

# Run development build (with hot reload)
npm run dev

# Load the extension in Chrome:
# 1. Navigate to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the build/chrome-mv3-dev directory
```

### Production

```bash
# Build for production
npm run build

# Package for distribution
npm run package
```

## Usage

1. Install the extension in your browser
2. Navigate to any Linear issue page
3. Click "Start Timer" to begin tracking time
4. Timer will show elapsed time in the top-right corner
5. Click "Stop" to stop the timer
6. Time entries are automatically synced to the backend

## Extension Structure

```
src/
├── background/
│   └── index.ts              # Background service worker
├── content/
│   └── linear-timer.svelte   # Timer UI component
└── content.ts                # Content script entry point
```

## Permissions

The extension requires:

- `storage` - Store timer state locally
- `activeTab` - Detect current Linear issue
- Host permissions for:
  - `https://linear.app/*` - Inject timer UI
  - `https://api.linear.app/*` - API calls (future use)
  - `http://localhost:3000/*` - Backend API (development)

## Development Notes

- Built with Plasmo framework for modern extension development
- Uses Svelte for UI components
- Communicates with background service worker via Chrome messaging API
- Timer state persists across browser sessions
- Automatically refreshes timer state every minute
