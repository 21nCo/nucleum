# E2E tests (Playwright)

End-to-end tests for Nucleum and its products (Pointron, Memotron).

## Running tests

All commands below are runnable from the repository root.

### Full matrix

```bash
npm run test --workspace=e2e-playwright -- --reporter=line
```

### Smoke and feature layers

```bash
npm run test --workspace=e2e-playwright -- --grep @smoke
npm run test --workspace=e2e-playwright -- --grep @feature
```

**By product:**

```bash
npm run test --workspace=e2e-playwright -- --project nucleum
npm run test --workspace=e2e-playwright -- --project pointron
npm run test --workspace=e2e-playwright -- --project memotron
```

**By tag:**

```bash
npm run test --workspace=e2e-playwright -- --grep @smoke
npm run test --workspace=e2e-playwright -- --grep @feature
npm run test --workspace=e2e-playwright -- --project pointron --grep @smoke
```

**All tests:**

```bash
npm run test --workspace=e2e-playwright --
```

## Auth and session


- **Login (recommended):** Set in `.env`: `E2E_LOGIN_EMAIL` and `E2E_LOGIN_PASSWORD`. Tests will log in at the start of each run. In CI, set these as secrets.
- **Base URL:** Set in `.env`: `APP_BASE_URL` (default), or `APP_BASE_URL_NUCLEUM`, `APP_BASE_URL_MEMOTRON`, `APP_BASE_URL_POINTRON` per project (e.g. `https://local.nucleum.app`).
- **Fallback:** If login env vars are not set, tests use "Continue offline" to reach the app.


## Structure

- **`tests/shared/`** – Overlapping features (run by one or more products):
  - **`navigation.spec.ts`** – Auth and nav (all products)
  - **`focus/`** – Goals and tasks (Pointron, Nucleum)
  - **`memory/`** – Capture and nodes (Memotron, Nucleum)
  - **`calendar/`**, **`overview/`**, **`collection/`** – Calendar, Overview, Library (all products)
- **`tests/nucleum/`** – Nucleum-only: app shell (nav), Settings
- **`tests/pointron/`**, **`tests/memotron/`** – Product-only specs (app nav, settings per product)
- **`tests/smoke/`** – Smoke (e.g. home load)
- **`tests/utils/`** – Shared helpers

## Shared area tags

- `@calendar-smoke`, `@calendar-feature`
- `@overview-smoke`, `@overview-feature`
- `@focus-smoke`, `@focus-feature`
- `@library-smoke`, `@library-feature`
- `@settings-smoke`, `@settings-feature`

Projects in `playwright.config.ts` control which specs run for each product. Pointron runs shared except `shared/memory/**`; Memotron runs shared except `shared/focus/**`.
