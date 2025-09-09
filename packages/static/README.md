# @nucleus/static

Shared static assets package for all Nucleus apps.

## Usage

### Basic Import
```javascript
import { assets, assetPath } from '@nucleus/static';

// Use predefined assets
const logoSrc = assets.nucleusLogo;
const soundFile = assets.sounds.dingding;
const iconSrc = assets.icons.arrowBack;

// Or construct paths dynamically
const customPath = assetPath('my-custom-asset.png');
```

### In Svelte Components
```svelte
<script>
  import { assets } from '@nucleus/static';
</script>

<img src={assets.nucleusLogo} alt="Nucleus Logo" />
<audio src={assets.sounds.upchime} />
<img src={assets.icons.arrowBack} alt="Back Arrow" />
```

### Available Assets

#### Images
- `assets.nucleusLogo` - Main nucleus logo
- `assets.favicon` - Favicon

#### Sounds  
- `assets.sounds.dingding` - Notification sound
- `assets.sounds.tick` - UI tick sound
- `assets.sounds.upchime` - Success sound
- `assets.sounds.ping` - Alert sound

#### Icons
- `assets.icons.solarBold` - Solar icon sprite
- `assets.icons.lucideBase` - Lucide icon sprite
- `assets.icons.arrowBack` - Back arrow icon

## Setup for Apps

### 1. Add to dependencies
```json
{
  "dependencies": {
    "@nucleus/static": "*"
  }
}
```

### 2. Configure static serving

**For SvelteKit apps:**
```javascript
// vite.config.js
import { nucleusStaticPlugin } from '@nucleus/static/vite-plugin.js';

export default defineConfig({
  plugins: [
    sveltekit(),
    nucleusStaticPlugin()
  ]
});
```

**Manual setup:**
Copy assets to your app's static directory during build:
```javascript
import { copyAssetsTo } from '@nucleus/static/build.js';
copyAssetsTo('./static');
```

## Adding New Assets

1. Add asset files to the appropriate subdirectory in `packages/static/`
2. Update `index.js` to export the new asset paths
3. Update `index.d.ts` with TypeScript definitions
4. Run `npm run build` to update the manifest

## Benefits

- ✅ **Centralized**: All shared assets in one place
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Optimized**: Only copy what you need
- ✅ **Consistent**: Same asset paths across all apps
- ✅ **Maintainable**: Update once, use everywhere
