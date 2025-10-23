# Timear Dashboard

SvelteKit-based web dashboard for Timear time tracking analytics.

## Features

- **Linear OAuth Login**: Authenticate via Linear workspace
- **Time Analytics**: View time spent per issue, user, team, or project
- **Time Period Filtering**: Filter analytics by date range
- **Recent Entries**: View recent time tracking entries
- **Workspace Management**: Manage workspace-level settings

## Environment Variables

```env
# Backend API
VITE_API_URL=http://localhost:3000
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte          # Root layout
│   ├── +page.svelte            # Home/redirect page
│   ├── login/
│   │   └── +page.svelte        # Login page
│   ├── auth/
│   │   └── success/
│   │       └── +page.svelte    # OAuth success redirect
│   └── dashboard/
│       └── +page.svelte        # Main dashboard
└── app.css                     # Global styles
```

## Usage

1. Navigate to the dashboard URL
2. Click "Sign in with Linear"
3. Authorize the application in Linear
4. View your time tracking data and analytics

## Deployment

The dashboard can be deployed as a static site to:

- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting service

```bash
npm run build
# Deploy the build/ directory
```
