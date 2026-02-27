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

- **Saved state:** `.auth/user.json` (cookies + localStorage). This folder is gitignored.
- **Base URL:** Set `APP_BASE_URL` in `.env` (e.g. `https://local.nucleus.to`). The config uses this for navigation. If you have saved auth, the base URL is auto-adjusted to match the origin in the saved state when needed.

**First time or when the session expires:**

1. Set `APP_BASE_URL` in `.env` to the same URL you use in the browser (e.g. `https://local.nucleus.to`).
2. Run: `npm run e2e:save-auth`
3. Complete Google sign-in once in the opened browser. When you’re back on the app, the script saves the session to `.auth/user.json`.
4. Run tests as above.

If you see a login screen or “Embed token: false” during tests, the session may have expired or the base URL may not match the saved origin. Run `npm run e2e:save-auth` again with the correct `APP_BASE_URL`, then re-run the tests.

## Structure

- **`tests/shared/`** – Auth and nav (used by all products)
- **`tests/nucleus/`** – App shell, Overview, Calendar, Library, Settings
- **`tests/core/focus/`** – Goals and tasks (Pointron)
- **`tests/core/memory/`** – Capture and nodes (Memotron)
- **`tests/pointron/`**, **`tests/memotron/`** – App-specific specs (placeholders)
- **`tests/smoke/`** – Smoke (e.g. home load)
- **`tests/utils/`** – Shared helpers

Projects in `playwright.config.ts` control which specs run for each product (`nucleus`, `pointron`, `memotron`).
