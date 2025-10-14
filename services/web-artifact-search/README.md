# Web Artifact Search Service

This service exposes a token-protected API for searching web artifacts (movies, books, podcasts, recipes, videos, articles) that powers the Memotron capture experience.

It is designed to run as a standalone serverless service that can be deployed to platforms such as Vercel or Cloudflare Workers while sharing authentication logic with the existing `server/` codebase.

## Highlights

- **Framework**: [Hono](https://hono.dev) for lightweight HTTP routing.
- **Auth**: Reuses the existing RSA-based token validation (`server/common/auth/auth.utils.ts`).
- **Providers**: Pulls live data from services like TMDB, Open Library, ListenNotes, Spoonacular, YouTube, and NewsAPI.
- **Schema**: Input validation with `zod` and typed response contracts for the capture modal.

## Project structure

```
services/web-artifact-search/
├── api/index.ts               # Vercel entry point
├── src/
│   ├── index.ts               # Local dev entry point
│   ├── router.ts              # App wiring & middleware
│   ├── middleware/
│   │   └── auth.ts            # Bearer token validation
│   ├── providers/             # Third-party data fetchers
│   │   ├── articles.ts        # NewsAPI
│   │   ├── books.ts           # Open Library
│   │   ├── movies.ts          # TMDB
│   │   ├── podcasts.ts        # ListenNotes
│   │   ├── recipes.ts         # Spoonacular
│   │   ├── videos.ts          # YouTube Data API
│   │   └── utils.ts           # Shared helpers
│   ├── repositories/
│   │   └── webArtifact.repository.ts # Routes provider requests
│   ├── routes/
│   │   └── search.ts          # /api/web-artifacts/search endpoint
│   └── types.ts               # Shared enums and interfaces
├── package.json
├── tsconfig.json
└── README.md
```

## Running locally

```bash
cd services/web-artifact-search
pnpm install   # or npm install / bun install
pnpm dev       # starts http://localhost:8787
```

Set the required environment variables (see below) before starting the service.

## Environment variables

The service expects the same JWT secrets used by the existing backend plus provider API keys:

```
TOKEN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
TOKEN_NAME="blank"
DOMAIN="https://memotron.io"
USER_NS="user"
SPACE_NS="space"
PORT=8787

# Movies (TMDB)
TMDB_API_KEY=""
# Optional: TMDB_BEARER_TOKEN for v4 auth

# Podcasts (Listen Notes)
LISTEN_NOTES_API_KEY=""

# Recipes (Spoonacular)
SPOONACULAR_API_KEY=""

# Videos (YouTube Data API v3)
YOUTUBE_API_KEY=""

# Articles (NewsAPI)
NEWSAPI_KEY=""
```

Open Library does not require an API key.

You can use a local `.env` file—the project loads it automatically via `dotenv`.

## Endpoint contract

`GET /api/web-artifacts/search`

| Query Param | Type | Description |
|-------------|------|-------------|
| `category`  | `MOVIES` \| `BOOKS` \| `PODCASTS` \| `RECIPES` \| `VIDEOS` \| `ARTICLES` | **Required** |
| `query`     | string | Optional search string (max 200 chars). Some providers return nothing without it. |
| `page`      | number | Optional page number (default 1). Pagination support varies by provider. |
| `limit`     | number | Optional page size (category-specific clamped ranges, default 10). |

Headers:
- `Authorization: Bearer <token>` (required)

Response:

```json
{
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "limit": 10,
    "hasMore": false
  },
  "category": "MOVIES",
  "query": "inception",
  "fetchedAt": "2025-10-10T12:00:00.000Z"
}
```

## Deployment notes

- **Vercel**: deploy the folder as a Team project or include it in the main Vercel configuration. The `api/index.ts` handler is compatible with the Node 18 runtime. Add a `vercel.json` at the repo root or inside this folder to map environment variables.
- **Cloudflare Workers**: use `app.fetch` from `src/router.ts` as the Worker export. Create a `wrangler.toml` and add a Workers build step if we choose this route.
- **Other platforms**: any provider capable of running Node 18 or Deno + Hono can host this service.

## Next steps

- Add caching plus rate limiting around provider requests.
- Extend logging/metrics for observability.
- Harden pagination handling for providers that require tokens (e.g., YouTube nextPageToken).
- Write integration tests once the data layer solidifies.
