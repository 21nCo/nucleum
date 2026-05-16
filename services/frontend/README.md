# Frontend Cloudflare Deployment

This service deploys the Nucleum, Memotron, and Pointron static frontend builds
to Cloudflare Workers Static Assets.

The existing AWS/CDK `turbo-deploy.yml` workflow is intentionally left in place.
Cloudflare frontend deploys use separate workflows and scripts.

## Domains

Frontend routes:

- Dev: `dev.<product-domain>`
- Pre: `pre.<product-domain>`
- Live: `web.<product-domain>`

Current products:

- `nucleum` -> `nucleum.app`
- `memotron` -> `memotron.app`
- `pointron` -> `pointron.app`

The app resolves the account service from the frontend origin, for example:

- `dev.memotron.app` -> `account-{region}-dev.memotron.app`
- `pre.pointron.app` -> `account-{region}-pre.pointron.app`
- `web.nucleum.app` -> `account-{region}.nucleum.app`

## Code Deploy

Code/assets deploys do not modify routes.

```sh
npm --workspace @21n/frontend-deploy run deploy:dev -- --products=all
npm --workspace @21n/frontend-deploy run deploy:pre -- --products=nucleum
npm --workspace @21n/frontend-deploy run deploy:live -- --products=memotron,pointron
```

Use `--dry-run` to validate the generated Wrangler config without publishing.
Use `--skip-build` only when `apps/<app>/build/index.html` already exists.

## Route Sync

Routes are synced separately, like the account service. This is intentionally
not part of continuous deploy.

```sh
npm --workspace @21n/frontend-deploy run routes:dev -- --products=all
npm --workspace @21n/frontend-deploy run routes:pre -- --products=all
npm --workspace @21n/frontend-deploy run routes:live -- --products=all
```

The route script preflights all requested Cloudflare zones before creating or
updating routes. If `memotron.app` or `pointron.app` is not visible to the API
token, the run fails before mutating any zone.

Required token permissions:

- Account Workers Scripts edit
- Zone read for each product zone
- Workers routes edit for each product zone

Optional zone ID overrides:

- `CLOUDFLARE_ZONE_ID_NUCLEUM_APP`
- `CLOUDFLARE_ZONE_ID_MEMOTRON_APP`
- `CLOUDFLARE_ZONE_ID_POINTRON_APP`

## GitHub Workflows

- `frontend-cloudflare-deploy.yml`
  - Push to `dev`: deploys all products to `dev`
  - `frontend-pre-*` tag: deploys all products to `pre`
  - `frontend-live-*` tag: deploys all products to `live`
  - Manual dispatch: deploy one product or all products

- `frontend-cloudflare-routes.yml`
  - Manual only
  - Syncs Worker routes for selected environment/products
