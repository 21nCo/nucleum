# E2E tests (Playwright)

End-to-end tests for Nucleus and its products (Pointron, Memotron).

## Running tests

**By product:**

```bash
npx playwright test --project nucleus
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

Tests can use a saved session so you don’t log in every run.

- **Saved state (per product):** `.auth/user.json` (Nucleus), `.auth/user-memotron.json` (Memotron), `.auth/user-pointron.json` (Pointron). The `.auth/` folder is gitignored.
- **Base URL:** Set in `.env`: `APP_BASE_URL` (default), or `APP_BASE_URL_NUCLEUS`, `APP_BASE_URL_MEMOTRON`, `APP_BASE_URL_POINTRON` per project (e.g. `https://local.memotron.app`). If a saved auth file exists, the config can auto-adjust the project base URL to match the saved origin.

**First time or when the session expires (per product):**

| Product   | Command |
|-----------|---------|
| Nucleus   | `npm run e2e:save-auth:nucleus` (or set `APP_BASE_URL=https://local.nucleus.to` and run `npm run e2e:save-auth`) |
| Memotron  | `npm run e2e:save-auth:memotron` |
| Pointron  | `npm run e2e:save-auth:pointron` |

1. Run the command for the product you want. A browser opens at that product's login page.
2. Complete Google sign-in once. When you’re back on the app, the script saves the session to that product's auth file.
3. Run tests: `npx playwright test --project=memotron` (etc.).

If you see a login screen or “Embed token: false” during tests, the session may have expired or the base URL may not match the saved origin. Run the save-auth script again for that product, then re-run the tests.

## Structure

- **`tests/shared/`** – Overlapping features (run by one or more products):
  - **`navigation.spec.ts`** – Auth and nav (all products)
  - **`focus/`** – Goals and tasks (Pointron, Nucleus)
  - **`memory/`** – Capture and nodes (Memotron, Nucleus)
  - **`calendar/`**, **`overview/`**, **`collection/`** – Calendar, Overview, Library (all products)
- **`tests/nucleus/`** – Nucleus-only: app shell (nav), Settings
- **`tests/pointron/`**, **`tests/memotron/`** – Product-only specs (app nav, settings per product)
- **`tests/smoke/`** – Smoke (e.g. home load)
- **`tests/utils/`** – Shared helpers

Projects in `playwright.config.ts` control which specs run for each product. Pointron runs shared except `shared/memory/**`; Memotron runs shared except `shared/focus/**`.
