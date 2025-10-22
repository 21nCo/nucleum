# Rigorous Testing Initiative

## Overview
Establish a phased testing program that closes the repo’s critical coverage gaps, delivers unified tooling, and raises confidence across backend, client, and product code. The initiative follows the Testing Robustness Roadmap (`@testing-e869b0d1.plan.md`) and incorporates lessons from benchmarking high-maturity testing practices while avoiding anti-patterns identified in low-coverage audits.

## Requirements
### Functional Requirements
- Deliver a consolidated Vitest workspace configuration with shared setup, fixtures, and Istanbul coverage reporting that works across all packages and Turbo tasks.
- Provide reusable server and shared-layer test utilities (SurrealDB/Turso/Dynamo mocks, property-based helpers) and expand deterministic + fuzz coverage for `server/common`, `server/utils`, `shared/dbo`, and `shared/utils`.
- Introduce client-side testing infrastructure (Svelte Testing Library, DOM helpers, axe-core) and co-located suites for `client/utils`, `client/stores`, `client/components`, and `client/products` critical flows.
- Stand up integration suites that boot minimal SvelteKit servers for each app (`apps/{nucleus, memotron, pointron}`) and verify routing, state sync, and server-client contracts.
- Create an `apps/e2e-playwright` workspace running Playwright smoke and regression tests with a Page Object Model, trace/video capture, and environment orchestration inspired by Huly Platform’s practice.
- Enforce coverage thresholds per workspace, wire results into CI, and gate Turbo `test` tasks on minimum coverage; schedule nightly fuzz/soak jobs and persist artifacts.
- Update contributor documentation (`CONTRIBUTING.md`, `WARP.md`) with testing expectations, quick-start flows, and verification checklists, reflecting governance guidelines.

### Non-functional Requirements
- Full test pipeline SHALL complete within 10 minutes on CI runners and remain parallelizable via Turbo caching and split Playwright projects.
- Test suites MUST be deterministic, isolating data via disposable fixtures, seeded databases, or mocked services.
- CI MUST upload coverage (LCOV + HTML), Playwright traces, and fuzz logs; artifacts retained for at least 14 days.
- Tooling MUST support local development on macOS and Linux with Node 20+, Bun, and Docker-based optional services (SurrealDB, Dynamo emulator).

## Implementation
### Technical Approach
- **Phase 1 – Foundation & Tooling:** Audit existing Vitest configs, converge on `tests/vitest.workspace.ts`, and centralize setup (`tests/test.setup.ts`). Add `tests/fixtures/**` and `tests/utils/**` with reusable mock builders; enable Istanbul coverage output (text, HTML, LCOV) and ensure Turbo recognizes `coverage/**` artifacts.
- **Phase 2 – Server & Shared Coverage:** Extend deterministic unit and integration suites for `server/common/*`, `server/utils`, `server/database/providers/*`, and `shared/dbo`. Introduce fast-check powered property tests and mutation/fuzz tests targeting serialization paths, following roadmap guidance and avoiding Cap’s missing backend safeguards.
- **Phase 3 – Client Utilities & Components:** Add Svelte Testing Library setup (`tests/client/setup.ts`), co-locate tests beside utilities/components, and integrate axe-core accessibility assertions. Implement snapshot-like DOM state verifications and interaction coverage to validate critical UI behaviors.
- **Phase 4 – Integration & E2E:** Build integration harnesses that spin up lightweight SvelteKit servers per app, validate routing/state sync, and add Playwright smoke suites with Page Objects, multi-app projects, and standardized trace/video capture for observability.
- **Phase 5 – Quality Gates:** Configure coverage thresholds in Vitest (`lines`, `branches`, `functions` >= 70 for critical packages), fail Turbo tasks on regressions, and run nightly fuzz/soak jobs (random workspace mutations, concurrent sync simulations) with artifact retention.
- **Phase 6 – Developer Experience & Governance:** Update documentation, add CI workflows (`.github/workflows/tests.yml`, `tests-nightly.yml`), publish coverage to Codecov, and embed testing entry points in contributor guides to prevent governance gaps.

### File Structure
- `tests/vitest.workspace.ts` – Unified Vitest workspace configuration.
- `tests/test.setup.ts` & `tests/client/setup.ts` – Global setup for server/client suites.
- `tests/fixtures/**` – Shared fixtures, SurrealDB snapshots, Dynamo/Turso mocks.
- `tests/utils/**` – Helper utilities, data builders, property-based generators.
- `client/**/**.test.ts` & `client/**/**.spec.ts` – Co-located component, store, and utility tests.
- `server/**/**.test.ts` expansions – Additional deterministic & fuzz suites.
- `tests/integration/**` – SvelteKit integration harnesses per app.
- `apps/e2e-playwright/` – Playwright workspace with projects, page objects, and traces output.
- `.github/workflows/tests.yml` & `tests-nightly.yml` – CI pipelines for regular and fuzz testing.
- Documentation updates in `CONTRIBUTING.md`, `WARP.md`, and testing playbooks within `tests/`.

## Dependencies
- Vitest 2.x workspace support, Istanbul coverage reporters, fast-check for property testing.
- @testing-library/svelte, @testing-library/user-event, axe-core for accessibility checks.
- Playwright (Chromium, Firefox, WebKit) with trace/video storage; optional Allure/HTML reporters.
- Turbo monorepo orchestration, Node.js 20+, Bun, pnpm/npm compatibility.
- Local service emulators: SurrealDB, DynamoDB local, Turso/libSQL; optional Docker compose for integration tests.
- Codecov (or equivalent) for coverage publishing and GitHub Actions runners for CI integration.

