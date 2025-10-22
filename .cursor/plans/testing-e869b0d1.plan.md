<!-- e869b0d1-43ed-497e-b2a7-052e57f1c6fa f42b497b-c943-47ad-8cad-ca5a534166fe -->
# Testing Robustness Roadmap

## Current Gaps

- Existing suites are limited to alias linting (`tests/unit/eslint/alias-imports.spec.ts`) and a few shared/server helpers (`shared/utils/**/*.test.ts`, `server/utils.test.ts`), leaving most client, server, and integration logic untested.
- No unified test runner for workspaces; coverage and regression gates are absent, and Turbo’s `test` task fails when sub-apps lack tests.

## Phase 1 — Foundation & Tooling

- Audit test entry points across workspaces, consolidate under a root Vitest config (e.g., `tests/vitest.config.ts`), and wire Turbo `test` to execute targeted suites via `test.setup.ts`.
- Add shared test utilities (mocks, fixtures) in `tests/fixtures` and `tests/utils` for server (SurrealDB/Dynamo mocks) and client (Svelte rendering helpers).
- Configure coverage reporting with Istanbul + HTML/LCOV output, and store baselines for comparison.

## Phase 2 — Critical Server & Shared Coverage

- Expand unit tests for `server/utils.ts`, `server/common/*`, and database providers (`server/database/providers/*.ts`) using deterministic fixtures and property-based checks (fast-check) for parsing/state helpers.
- Introduce mutation/fuzz tests for serialization logic in `shared/utils` and schema definitions in `shared/dbo`, mirroring SQLite’s random tester philosophy.

## Phase 3 — Client Utilities, Components & Store Testing

- Co-locate Vitest suites beside every utility in `client/utils` (e.g., `client/utils/foo.test.ts`) to guarantee function-level coverage, backed by reusable mock helpers.
- Add Svelte Testing Library setup (e.g., `tests/client/setup.ts`) to exercise `client/components`, `client/stores`, and product-specific flows under `client/products/*` with mocked appStore/product context.
- Cover accessibility regressions with axe-core integration and snapshot-like DOM assertions for critical UI primitives (`client/elements/Button.svelte`, routing shells in `client/layout`).

## Phase 4 — Integration & End-to-End Flows

- Build integration suites that boot minimal SvelteKit servers for each app (`apps/{nucleus,memotron,pointron}`) and validate routing/state sync; reuse `tests/integration` for server-client contracts.
- Introduce Playwright-driven smoke tests scoped to a dedicated workspace (e.g., `apps/e2e-playwright`) with one project per app, shared fixtures, and reusable auth/data helpers.
- Wire the Playwright workspace into Turbo via a `test:e2e` task that depends on app builds, configure `webServer` entries to reuse existing `npm run dev:<product>` commands, and standardize trace/video artifacts.
- Record golden responses for API endpoints in `server/index.ts` alongside Playwright regression baselines.

## Phase 5 — Continuous Quality Gates

- Enforce coverage thresholds per package via Vitest config, fail Turbo tasks when coverage dips below target, and publish reports in CI.
- Add nightly long-haul fuzz/soak jobs (randomized workspace mutations, concurrent sync simulations) comparable to SQLite’s “torture tests.”

## Phase 6 — Developer Experience & Governance

- Update `CONTRIBUTING.md` and `WARP.md` with testing expectations, quick-start commands, and verification checklists.
- Automate CI via GitHub Actions (or existing pipeline) to run unit, integration, and fuzz jobs on matrix of Node versions, ensuring reproducibility.

### To-dos

- [ ] Create consolidated Vitest config, shared fixtures, and coverage reporting infrastructure.
- [ ] Write deterministic and property-based tests for server/common utilities and shared schema helpers.
- [ ] Introduce Svelte Testing Library setup and cover critical components and stores.
- [ ] Implement app-level integration tests and Playwright smoke suites.
- [ ] Enforce coverage thresholds, add fuzz/soak jobs, and integrate CI governance updates.