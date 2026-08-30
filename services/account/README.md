# Nucleus Account Service

## Environments

Account API domains are product-owned so browser and WKWebView cookies stay
first-party for each app. The same regional Worker deployment is routed from
each product account hostname.

| Environment | Domain pattern |
| --- | --- |
| local | `https://account-{region}-local.<product-domain>` |
| dev | `https://account-{region}-dev.<product-domain>` |
| pre | `https://account-{region}-pre.<product-domain>` |
| live | `https://account-{region}.<product-domain>` |

Current product domains:

- `nucleum.app`
- `memotron.app`
- `pointron.app`

Regions:

- `insouth` placed near `aws:ap-south-1`
- `useast` placed near `aws:us-east-1`
- `euwest` placed near `aws:eu-west-2`

## Sync Database

The account service hosts DataFn under `/datafn/*`, but sync data must
use a separate regional database from the AuthFn account database.

Node entrypoints require:

```bash
DATAFN_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/nucleus_datafn_sync
```

Cloudflare Workers require either a `SYNC_DB` Hyperdrive binding or a
`DATAFN_DATABASE_URL` secret. Do not point these at `DATABASE_URL` or
`ACCOUNT_DB`; AuthFn tables and sync tables are intentionally separate.

Deployments apply the committed Drizzle migrations in `drizzle/datafn` to each
selected regional sync database before deploying any Worker. Configure these
environment-scoped GitHub secrets with direct Postgres URLs that verify the
server certificate:

- `DATAFN_INSOUTH_DATABASE_URL`
- `DATAFN_USEAST_DATABASE_URL`
- `DATAFN_EUWEST_DATABASE_URL`

Optional sync settings:

```bash
DATAFN_DB_POOL_SIZE=5
DATAFN_MAX_PAYLOAD_BYTES=5242880
```

## Running Local Apps Against Account Backends

All local browser flows should go through Caddy so cookies, OAuth redirects, and
same-site behavior use HTTPS app/account domains instead of raw localhost.

First make sure `/etc/hosts` has the entries from the root `Caddyfile`, then
run Caddy from the repo root:

```bash
caddy trust
caddy run --config Caddyfile
```

Useful local app domains:

- Nucleum: `https://local.nucleum.app` -> `localhost:5050`
- Memotron: `https://local.memotron.app` -> `localhost:5002`
- Pointron: `https://local.pointron.app` -> `localhost:5001`

### Local App Against Dev Workers

Use this when the frontend is local but account auth should hit the deployed dev
Cloudflare Workers.

Do not start a local account service. By default, the app derives the account
domain from the current product host. For example, `https://local.memotron.app`
uses `https://account-{region}-local.memotron.app`.

To force a deployed account environment from a local app, start the app with a
regional account URL template:

```bash
VITE_ACCOUNT_BASE_URL_TEMPLATE=https://account-{region}-dev.{domain} npm --workspace nucleus-app run debug
```

Then open:

```text
https://local.nucleum.app
```

Equivalent app commands:

```bash
VITE_ACCOUNT_BASE_URL_TEMPLATE=https://account-{region}-dev.{domain} npm --workspace memotron-app run debug
VITE_ACCOUNT_BASE_URL_TEMPLATE=https://account-{region}-dev.{domain} npm --workspace pointron-app run debug
```

Notes:

- Dev account Workers allow local app origins in CORS.
- `VITE_ACCOUNT_BASE_URL_TEMPLATE` is region-aware. It replaces `{region}` with
  the selected account region, so signup/OAuth/OTP requests go to
  `account-insouth-dev`, `account-useast-dev`, or `account-euwest-dev`.
- `VITE_ACCOUNT_BASE_URL` is still supported as an explicit single-authority
  override. Use it only when you intentionally want every selected region to
  hit one backend.

### Account URL Override Matrix

| Local frontend target | Account env vars | Region behavior |
| --- | --- | --- |
| Dev Workers | `VITE_ACCOUNT_BASE_URL_TEMPLATE=https://account-{region}-dev.{domain}` | Multi-region |
| Pre Workers | `VITE_ACCOUNT_BASE_URL_TEMPLATE=https://account-{region}-pre.{domain}` | Multi-region |
| Live Workers | `VITE_ACCOUNT_BASE_URL_TEMPLATE=https://account-{region}.{domain}` | Multi-region |
| Local single backend | `VITE_ACCOUNT_BASE_URL=https://account-insouth-local.<product-domain>` | Single backend by design |
| Local multi-region backends | no account URL override while using `https://local.<product-domain>` | Multi-region via `account-{region}-local.<product-domain>` |

Templates also support `{env}`, `{envSuffix}`, and `{domain}` for host-derived
environments. Example:

```bash
VITE_ACCOUNT_BASE_URL_TEMPLATE=https://account-{region}{envSuffix}.{domain}
```

### Local App Against Local Single-Region Backend

Use this for the fastest local account-service development loop against the
Node/Hono entrypoint.

Run the account service:

```bash
npm --workspace @21n/account-service run db:push:local
npm --workspace @21n/account-service run dev:local
```

In another terminal, run the app:

```bash
npm --workspace nucleus-app run debug
```

Then open:

```text
https://local.nucleum.app
```

With a `local.*` app host, the frontend resolves account URLs to local account
domains. For the default `insouth` region:

```text
https://account-insouth-local.<product-domain> -> localhost:8787
```

`dev:local` reads `services/account/.env.local`. For OTP testing, keep
`ACCOUNT_EMAIL_LOCAL_DELIVERY=true` if you want local outbox/console delivery
instead of real SendFn delivery.

### Local App Against Local Multi-Region Backend

Use this when testing region lookup, region mismatch, and cross-region routing
from a local app.

Run all local regional Workers:

```bash
npm --workspace @21n/account-service run dev:worker:multi
```

In another terminal, run the app:

```bash
npm --workspace nucleus-app run debug
```

Then open:

```text
https://local.nucleum.app
```

Caddy routes each local regional account authority for each product domain:

- `https://account-insouth-local.<product-domain>` -> `localhost:8787`
- `https://account-useast-local.<product-domain>` -> `localhost:8788`
- `https://account-euwest-local.<product-domain>` -> `localhost:8789`

The local Worker setup uses local account-service code with Cloudflare Worker
runtime behavior. It is configured to use the dev Hyperdrive IDs, dev KV cache,
and dev Durable Object lookup store so local multi-region behavior matches the
deployed dev topology closely.

You can run one local region when needed:

```bash
npm --workspace @21n/account-service run dev:worker:insouth
npm --workspace @21n/account-service run dev:worker:useast
npm --workspace @21n/account-service run dev:worker:euwest
```

If auth behavior looks stale while switching between these modes, clear browser
storage/cookies for `nucleum.app`, `memotron.app`, or `pointron.app`, especially
the AuthFn session cookies and `authfn:user-region-map`/Nucleus region cache.

## Cloudflare Config Source Of Truth

`services/account/config/environments.json` is the source of truth for
regional account-service infrastructure config:

- account/product domains
- local/dev/pre/live URL shape
- regional Worker env names
- Hyperdrive IDs
- KV namespace IDs
- Durable Object lookup Worker names
- placement hints
- CORS/OAuth return origins

`wrangler.toml` is intentionally minimal. Deploy and local Worker scripts
generate `.wrangler/wrangler.<env>.deploy.toml` from `environments.json`.
Generated deploy configs do not contain routes.
Run the route sync scripts when adding a product domain so Cloudflare maps the
product account hostnames to the existing regional Workers.

## Cloudflare Setup Needed

Dev Hyperdrive is configured for all three regions:

- `dev-insouth-nucleum`
- `dev-useast-nucleum`
- `dev-euwest-nucleum`
- `dev-insouth-nucleum-sync`
- `dev-useast-nucleum-sync`
- `dev-euwest-nucleum-sync`

These live Hyperdrive IDs still need to be created and added either to `services/account/config/environments.json` or as GitHub environment variables with the same placeholder names:

- `TODO_LIVE_INSOUTH_HYPERDRIVE_ID`
- `TODO_LIVE_USEAST_HYPERDRIVE_ID`
- `TODO_LIVE_EUWEST_HYPERDRIVE_ID`
- `TODO_LIVE_INSOUTH_SYNC_HYPERDRIVE_ID`
- `TODO_LIVE_USEAST_SYNC_HYPERDRIVE_ID`
- `TODO_LIVE_EUWEST_SYNC_HYPERDRIVE_ID`

KV namespaces are already created:

- dev: `0cad2abe3c97473cb481c11d960e7996`
- pre cache: `72bb56e048d941ec92aad94df99d9e36`
- live: `18a83200ea7542fa9b6929257711065b`

Pre is configured to use live DB/lookup persistence with a separate pre KV cache and `nucleus_pre` cookie prefix.

## Secrets Store

Worker secrets are bound through Cloudflare account-level Secrets Store so
regional Workers do not each maintain duplicated secret values.

Configured store:

- `default_secrets_store`: `3bc19f61d4d8498d9fa50d7175085316`

Secret names are generated from `services/account/config/environments.json`:

- `NUCLEUS_ACCOUNT_{ENV}_RESEND_API_KEY`
- `NUCLEUS_ACCOUNT_{ENV}_GOOGLE_OAUTH_CLIENT_ID`
- `NUCLEUS_ACCOUNT_{ENV}_GOOGLE_OAUTH_CLIENT_SECRET`
- `NUCLEUS_ACCOUNT_{ENV}_APPLE_OAUTH_CLIENT_ID`
- `NUCLEUS_ACCOUNT_{ENV}_APPLE_JWT`
- `NUCLEUS_ACCOUNT_{ENV}_APPLE_OAUTH_CLIENT_SECRET`
- `NUCLEUS_ACCOUNT_{ENV}_APPLE_TEAM_ID`
- `NUCLEUS_ACCOUNT_{ENV}_APPLE_KEY_ID`
- `NUCLEUS_ACCOUNT_{ENV}_DATAFN_OPENSEARCH_URL`
- `NUCLEUS_ACCOUNT_{ENV}_DATAFN_OPENSEARCH_API_KEY`

Sync missing secrets from local env files:

```bash
npm --workspace @21n/account-service run secrets:sync:dev
npm --workspace @21n/account-service run secrets:sync:pre
npm --workspace @21n/account-service run secrets:sync:live
```

Use `-- --replace` to update existing Secrets Store values:

```bash
npm --workspace @21n/account-service run secrets:sync:dev -- --replace
```

The sync script reads `services/account/.env.local` first, then
`services/account/.env.<env>`, with the environment-specific file taking
precedence. It requires `CLOUDFLARE_ACCOUNT_ID` plus one token in this order:

1. `CLOUDFLARE_SECRETS_STORE_TOKEN`
2. `CLOUDFLARE_API_TOKEN`
3. `CLOUDFLARE_USER_TOKEN`

Sync the OpenSearch URL and API key for every environment before deploying the
account DataFn search surface. Pre/live account and search values still need to
be synced before deploying those environments.

## Deployments

The CI path expects Superfunctions/AuthFn/ApiFn packages to be published on the
public npm registry. It intentionally does not clone or authenticate against a
private Superfunctions repository.

```bash
npm --workspace @21n/account-service run deploy:dev
npm --workspace @21n/account-service run deploy:pre
npm --workspace @21n/account-service run deploy:live
```

Deployments apply regional DataFn database migrations, then update Worker code,
vars, bindings, placement, and Durable Object migrations. They intentionally do
not create or mutate custom-domain routes.

CI deploys:

- every push to `dev` -> all dev regions
- `backend-pre-<version>` tags -> all pre regions
- `backend-live-<version>` tags -> all live regions

The CI Cloudflare token needs Worker deploy permissions, access to the
configured Hyperdrive/KV/DO bindings, and permission to bind Secrets Store
secrets. It does not need Workers Route edit permissions.

## Route Setup

Custom-domain Worker routes are one-time zone infrastructure. They need a token
with zone Workers Routes permissions on every product domain zone and are
managed separately:

```bash
npm --workspace @21n/account-service run routes:dev
npm --workspace @21n/account-service run routes:pre
npm --workspace @21n/account-service run routes:live
```

Token precedence:

1. `CLOUDFLARE_ROUTES_TOKEN`
2. `CLOUDFLARE_USER_TOKEN`
3. `CLOUDFLARE_API_TOKEN`

The route script resolves the Cloudflare zone for each product domain in
`config/environments.json`. You can optionally provide zone IDs explicitly with
environment variables like `CLOUDFLARE_ZONE_ID_NUCLEUM_APP`,
`CLOUDFLARE_ZONE_ID_MEMOTRON_APP`, and `CLOUDFLARE_ZONE_ID_POINTRON_APP`.
`CLOUDFLARE_ZONE_ID` is only used as the fallback for the canonical
`nucleum.app` account domain.

Each product account hostname also needs DNS in that product's Cloudflare zone
to be proxied by Cloudflare. For example, `account-insouth-dev.memotron.app`
must resolve through the `memotron.app` Cloudflare zone before the Worker route
can serve it.

Normal CI deploys do not need route permissions once routes exist.

## WAF Exceptions

Account browser auth routes can trip Cloudflare managed WAF anomaly rule
`949110: Inbound Anomaly Score Exceeded`, especially OAuth callbacks, session
checks, and region lookups following redirects. Sync path-scoped exceptions
separately from Worker deploys:

```bash
npm --workspace @21n/account-service run waf:dev -- --regions=insouth --products=nucleum
npm --workspace @21n/account-service run waf:pre
npm --workspace @21n/account-service run waf:live
```

The exception applies only to configured account hosts, browser auth methods,
and the `/auth/` namespace. It skips only the managed rule configured there;
other WAF rules and non-auth account routes remain unchanged. Provide a token
with zone read and zone WAF write access through `CLOUDFLARE_WAF_TOKEN`, or via
the route-token fallback variables.

## iOS Endpoint Switching

The iOS native layer reads `NUCLEUS_APP_ENVIRONMENT`, `NUCLEUS_PRODUCT`, and
`NUCLEUS_ACCOUNT_DOMAIN` from Xcode build settings. The web bundle inside
`www/` also needs to be generated for the same environment because Vite bakes
mode-specific values at build time.

From repo root, generate app web bundles for the target environment:

```bash
npm run build:ios:local
npm run build:ios:dev
npm run build:ios:pre
npm run build:ios:live
```

Or generate only one product:

```bash
npm run build:ios:nucleum:dev
npm run build:ios:memotron:dev
npm run build:ios:pointron:dev
```
