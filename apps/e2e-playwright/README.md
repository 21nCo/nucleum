# E2E tests (Playwright)

End-to-end tests for Nucleum and its products (Pointron, Memotron).

## Running tests

**By product:**

```bash
npx playwright test --project nucleum
npx playwright test --project pointron
npx playwright test --project memotron
```

**By tag:**

```bash
npx playwright test --grep @smoke
npx playwright test --grep @regression
npx playwright test --project pointron --grep @smoke
```

**All tests:**

```bash
npx playwright test
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

Projects in `playwright.config.ts` control which specs run for each product. Pointron runs shared except `shared/memory/**`; Memotron runs shared except `shared/focus/**`.
