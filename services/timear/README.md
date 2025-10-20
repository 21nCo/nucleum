# Timear Backend

Hono-based backend service for Timear time tracking application with Linear integration.

## Features

- **Linear OAuth Integration**: Authenticate users via Linear
- **Webhook Handler**: Sync workspace data (teams, projects, issues) from Linear
- **Time Tracking API**: Create, read, update, and delete time entries
- **Per-Workspace Isolation**: Each Linear workspace gets its own Turso database
- **Cloud-Agnostic**: Deployable on Vercel, Cloudflare Workers, AWS, etc.

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Linear OAuth
LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_client_secret
LINEAR_REDIRECT_URI=http://localhost:3000/oauth/callback
LINEAR_WEBHOOK_SECRET=your_webhook_secret

# Turso Database
TURSO_BASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
TURSO_GROUP=default

# Frontend
DASHBOARD_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5050
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Routes

### OAuth
- `GET /oauth/linear` - Initiate Linear OAuth flow
- `GET /oauth/callback` - OAuth callback handler
- `GET /oauth/session` - Check authentication status
- `POST /oauth/logout` - Logout

### Webhooks
- `POST /webhook/linear` - Linear webhook handler

### API (requires authentication)
- `GET /api/time-entries` - List time entries
- `POST /api/time-entries` - Create time entry
- `PATCH /api/time-entries/:id` - Update time entry
- `DELETE /api/time-entries/:id` - Delete time entry
- `GET /api/analytics` - Get analytics data
- `GET /api/linear/:type` - Get synced Linear data (teams/projects/issues/users)
- `GET /api/timer/active` - Get active timer
- `POST /api/timer/start` - Start timer
- `POST /api/timer/stop` - Stop timer

## Database Schema

The backend uses Turso (LibSQL) with per-workspace database isolation. Each workspace has the following tables:

- `time_entries` - Time tracking entries
- `issues` - Synced Linear issues
- `projects` - Synced Linear projects
- `teams` - Synced Linear teams
- `users` - Synced Linear users

## Deployment

The Hono backend is designed for Node.js server deployment:

### Vercel
```bash
npm install -g vercel
vercel deploy
```

### Node.js Server
```bash
npm run build
npm start
```

Note: This backend uses @hono/node-server and is not configured for Cloudflare Workers deployment.
