# Nucleum Constitution

## Core Principles

### I. Product Context First

Agents MUST confirm the active product context before touching UI or workflow code. They MUST inspect `client/products/*` configurations and the app context exposed from `client/shared-state/app-context` to respect feature gates and product-specific behaviors. Rationale: enforcing product awareness prevents regressions across Nucleus, Memotron, Pointron, and future bundles.

### II. Reuse Shared System

Agents MUST reuse the domain-free `@21n/ui` package and correctly owned state and utilities when delivering changes. `client/ui/elements` is the permanent atomic-control layer, `client/ui/compositions` is the permanent layer for domain-neutral compound UI intended for reuse across capabilities or products, `client/ui/actions` owns generic DOM behavior, `client/ui/icons` owns portable icon assets and rendering, `client/ui/illustrations` owns portable illustrations, `client/ui/branding` owns pure visual brand assets, and package-wide environment and host contracts live in `client/ui/environment` and `client/ui/hosts`. Nothing under `client/ui` may depend directly or transitively on application state, runtime infrastructure, the application shell, products, features, DataFn, persistence, schema, or domain state. Product-connected behavior MUST enter through props or narrow host contracts configured by an application shell or feature owner. Prefer these layers, helpers such as `generateResourceId` and `generateSimpleRandomId`, and correctly owned logic instead of duplicating behavior. Rationale: reuse stays portable only when reusable presentation is independent of Nucleum composition and state.

### III. Safe State & Data Handling

Agents MUST persist preferences with the correct `Preference` enums, sub-variable scopes, and helper APIs. Frontend persistence MUST use the current DataFn runtime and shared resource stores (`client/datafn/`, `client/features/`, and `schema/`) while respecting legacy local persistence, Dexie, and backup/recovery boundaries under `client/persistence`. Remote synchronization MUST align with the account-service DataFn routes, schemas, generated Drizzle mappings, and lookup helpers under `services/account/src/datafn`, `services/account/src/db`, and `services/account/src/lookup`. Rationale: disciplined state management keeps local stores, DataFn sync state, and account-service records consistent across clients and services.

### IV. Verified Delivery via Repo Workflows

Agents MUST run repository scripts (`npm run dev`, targeted Turbo commands, lint, and tests) that correspond to touched surfaces, and document verification steps alongside changes. Code MUST remain free of inline comments while using JSDoc comments for exported symbols, public APIs, and non-obvious functions. Svelte components MUST follow established structure (script, markup, style). Rationale: shared workflows and TDD discipline keep quality high and reproducible.

### V. Security & Secrets Discipline

Agents MUST prevent exposure of credentials or sensitive data. Environment configuration MUST rely on documented variables such as `VITE_PRODUCT`, `VITE_STATIC_URL`, `VITE_ACCOUNT_BASE_URL`, `VITE_ACCOUNT_BASE_URL_TEMPLATE`, `ACCOUNT_*`, `AUTHFN_*`, `DATAFN_*`, `DEBUG_SINK_URL`, `DEBUG_SINK_WRITE_TOKEN`, and cloud credentials required by deployment or lookup integrations. Storage, auth, sync, and observability integrations MUST use vetted helpers in `services/account`, `schema`, `client/datafn`, and Superfunctions packages instead of ad-hoc secret handling. Rationale: consistent security practices safeguard users and hosting environments.

## Onboarding Checklist

### Orientation

- Review `README.md` and `CONTRIBUTING.md` before making changes.
- Recognize the monorepo layout:
  - `client/`: SvelteKit frontends, shared client services, features, and product composition.
  - `client/ui/`: Domain-free portable UI package (`@21n/ui`) with `elements`, `compositions`, `actions`, `icons`, `illustrations`, `branding`, `environment`, and `hosts` subpaths.
  - `client/shared-state/`: Product-independent shared Nucleum client state (`@nucleum/shared-state`) grouped by semantic owner, including app context, appearance, commands, events, files, notifications, preferences, resources, and shortcuts.
  - `client/features/`: Multi-product content capabilities (`@nucleum/features`).
  - `client/surfaces/`: Cross-feature product surfaces (`@nucleum/surfaces`): account, subscription, onboarding, help, settings, the command surface, and library. Surfaces may compose features; features never import surfaces.
  - `client/shell/`: Application shell (`@nucleum/shell`): navigation, panels, split views, tabs, trails, overlays, modal chrome, and extension-support layers. Base/user application layers live in `client/composition`.
  - `client/datafn/`: Client DataFn runtime (`@nucleum/datafn`).
  - `client/composition/`: Composition root (`configure-hosts.ts`, `global-commands.ts`, `settings-actions.ts`, `shortcuts.config.ts`), base/user application layers under `layers/`, connected chrome under `chrome/`, and root action, loading, and branding adapters. The root source allowlist is enforced by the architecture checker.
  - `client/runtime/`: UI-independent browser transport, application environment context, account authority, native messaging, inference, and logging.
  - `client/config/`: Client product identity, declarative navigation metadata, and command identifiers.
  - `services/account/`: account-service AuthFn, DataFn, SearchFn, debug-sink, local Node, and Cloudflare Worker integrations.
  - `schema/`: Product and DataFn schema (`@nucleum/schema`).
  - `shared/`: Cross-layer types and utilities.
  - `apps/`: Deployable product bundles and e2e Playwright harnesses (Memotron, Pointron, Nucleus, Timear, and `apps/e2e-playwright`).
  - `deployment/`: Infrastructure scripts and CDK stacks.
- Confirm product context through `client/products/*` configurations and the app-context store before editing UI flows.

### Ownership and composition

- Read `docs/architecture/client-boundaries.md` and `docs/architecture/type-ownership.md` before changing package ownership or imports. Those files are the current contracts. Phase journals live in `docs/architecture/history/`.
- Preserve the permanent UI dependency direction: compositions may use elements, actions, icons, illustrations, branding, environment, and hosts; elements, actions, icons, illustrations, branding, environment, and hosts MUST NOT depend on compositions. Keep application, runtime, product, feature, DataFn, persistence, schema, and domain-state imports out of `client/ui`, including through transitive utility imports.
- Keep a domain-neutral composition in `client/ui/compositions` when it has credible future reuse even if only one feature consumes it today. Usage count alone does not determine ownership. Move domain-connected workflows and state access to `client/features` or `client/surfaces`; keep only final product wiring and connected adapters in `client/composition`.
- Supply portable UI with data and behavior through explicit props or narrow contracts under `client/ui/hosts`; keep UI-wide platform and presentation state under `client/ui/environment`. Configure both from the owning composition layer. Do not add compatibility wrappers or a generic service locator.
- Keep generic DOM actions in `client/ui/actions`; place capability-specific actions beside their consumer. Consume the package only through its explicit `@21n/ui/elements`, `@21n/ui/compositions`, `@21n/ui/actions`, `@21n/ui/icons`, `@21n/ui/illustrations`, `@21n/ui/branding`, `@21n/ui/environment`, or `@21n/ui/hosts` subpaths. Do not retain empty workspaces or aliases without implemented exports.
- Keep pure logos, provider marks, and illustrations in UI. Branding that selects a product, reads persistence, resolves account/runtime identity, or otherwise performs application behavior belongs in an explicitly named application adapter that composes portable assets through props.
- Portable-looking presentation in the application shell is not automatically shell-owned. Move neutral renderers such as breadcrumbs and scroll containers to `client/ui/compositions`; keep route, history, resource, product, and shell behavior in explicitly named adapters under `client/shell` that pass structural data and callbacks into UI.
- The concrete shell, URL/history navigation, tabs, sidebars, overlays, and product chrome belong in the top-level `client/shell` workspace (`@nucleum/shell`). Features may consume its explicit shell surface when participating in application composition, but MUST NOT import unrelated application workflows. Shell is acyclic: it MUST NOT import composition, surfaces, or products directly or transitively. Product navigation config enters only through `@nucleum/shared-state/product/product-config-host`, and concrete chrome (brand/logo, account avatar, search input, bulk-edit bar, offline status, capture, profile section) enters only through optional Svelte snippet props wired by the composition chrome adapters (`client/composition/chrome/`).
- Application-wide context belongs to the named `client/shared-state/app-context` owner. Shared command ports and application-event contracts belong in `client/shared-state/commands` and `client/shared-state/events`; command execution infrastructure lives in `client/surfaces/commands`, action definitions stay with their semantic owners, and final registry assembly lives at the `client/composition` root. Runtime environment state belongs in `client/runtime`, persisted UI preference state belongs in `client/shared-state/preferences`, and migration helpers belong in `client/persistence/migrations`. The generic `client/state`, standalone `client/commands`, `client/events`, `client/layout`, `client/branding`, `client/illustrations`, `client/icons`, and `client/iconsV2` directories and their aliases are permanently retired.
- `client/utils` and `@21n/utils` are retired. Colocate helpers and their tests with semantic owners; do not replace them with generic nested utility buckets.
- Do not create a new catch-all `stores`, `state`, `shared`, or `core` directory. The `client/shared-state` workspace is the single approved home for product-independent shared client state and MUST keep named owners with no root barrel or generic dumping at its root. Colocate feature and domain state with its semantic owner. Product-independent client behavior shared by multiple features or products belongs to a named owner under `client/shared-state`, never directly in the shared-state root.
- `@nucleum/shared-state` may depend on lower-level runtime, DataFn, persistence, schema, and portable UI contracts, but MUST NOT depend directly or transitively on application, feature, or product implementations. Features, the shell, products, and application composition may consume explicit shared-state subpaths. Do not add a shared-state root barrel.
- Account state must not own file processing, deletion confirmation, or subscription workflows. Shared uploads belong in `client/shared-state/files`, and user workflows belong in `client/surfaces/account` or `client/surfaces/subscription`.
- Keep generic UI-state persistence in `client/shared-state/preferences`; tabs, sidebar behavior, and product menu customization belong with the application shell. Headless notification and shortcut state belongs in shared-state. Connected notification rendering and global shortcut execution belong under `client/shell`; shortcut settings presentation belongs under `client/surfaces/settings/shortcuts`. The former `client/application/notifications` and `client/application/shortcuts` paths remain retired; do not recreate them under `client/composition`. Focus owns its scheduled notifications; runtime owns native message delivery.
- Update all callers directly when moving a module. Do not add compatibility re-exports or duplicate entry points. Update feature exports, dependency declarations, retirement rules, and type-inventory destinations with the move.
- Run `npm run check:architecture` and `node tools/check/type-ownership.mjs` for ownership changes. Passing import checks does not replace reviewing semantic ownership or testing workflows.
- Regenerated DataFn mappings must ship with a forward migration when physical database definitions change. Verify both a fresh database and upgrading the checked-in migration history.

### Tooling & Commands

- Use npm workspaces and Turbo tasks; run `npm run dev`, `npm run build`, or filtered commands such as `npm run dev:nucleus` and `npm run build:pointron` when verifying changes.
- Prefer repository scripts over ad-hoc commands to mirror how existing apps are started, built, and tested.

### Local Debugging & Observability

- Use Caddy HTTPS product hosts for browser debugging, not raw localhost, unless the task explicitly targets localhost behavior:
  - Nucleum: `https://local.nucleum.app` -> `localhost:5050`.
  - Pointron: `https://local.pointron.app` -> `localhost:5001`.
  - Memotron: `https://local.memotron.app` -> `localhost:5002`.
- Before diagnosing a local app screen as a frontend bug, verify the account backend is reachable through Caddy. For Nucleum local single-region debugging, start the account service with:
  ```bash
  npm --workspace @21n/account-service run dev:local
  ```
- For cloud-user, login, local-sync, or DataFn failures, check the Caddy-fronted account endpoints first:
  ```bash
  curl -k -i https://account-insouth-local.nucleum.app/auth/session
  curl -k -i -X OPTIONS https://account-insouth-local.nucleum.app/datafn/query \
    -H 'Origin: https://local.nucleum.app' \
    -H 'Access-Control-Request-Method: POST'
  ```
  Healthy local signals include `/auth/session` returning an HTTP response from the account service, DataFn preflights returning `204`, and `access-control-allow-origin: https://local.nucleum.app`.
- Do not confuse the local account API upstream with the debug-sink upstream:
  - `https://account-insouth-local.<product-domain>/debug-sink/*` routes to `localhost:8790`.
  - Normal `/auth/*` and `/datafn/*` account-service traffic routes to `localhost:8787` for `insouth`, `localhost:8788` for `useast`, and `localhost:8789` for `euwest`.
    A `502` on `/auth/session` or `/datafn/*` usually means the account service is not running on the expected account upstream, not that the debug sink is down.
- Debug-sink logging is diagnostic-only and MUST NOT be required for auth or sync behavior. The account service sends debug logs through `DEBUG_SINK_URL` and optional `DEBUG_SINK_WRITE_TOKEN`; production sends nothing without a token. The sink redacts common sensitive fields, but agents MUST still avoid adding logs that expose raw credentials, cookies, OTPs, OAuth codes, tokens, email addresses, private keys, or user content.
- When investigating login, sync, OAuth, or DataFn failures, collect evidence in this order:
  1. Browser console and network status for `/auth/session`, `/auth/regions/lookup`, `/datafn/query`, `/datafn/pull`, `/datafn/push`, and `/datafn/search`.
  2. Account-service terminal logs from `dev:local`.
  3. Caddy route health and upstream port checks.
  4. Database assertions only after the request path is known to be reaching the expected backend.
- For Chrome-extension manual QA, keep using `https://local.nucleum.app` so saved auth state, cookies, CORS, and account authority resolution match the product runtime. Treat raw `http://localhost:5050` auth-shell failures as suspect until reproduced on the local HTTPS product host.

For more developer specific information, overrides -> check `local-context.md`

### Coding Standards

- Default to TypeScript, Svelte, and Tailwind conventions already present in the repo.
- Match existing Svelte component organization: `<script lang="ts">`, markup, then `<style>` if needed, with shared logic kept in stores or utilities.
- Keep code free of inline comments per repository policy.
- Add concise JSDoc comments for exported symbols, public APIs, and functions whose purpose or constraints are not immediately obvious from the implementation.
- Honor accessibility and UX patterns by reusing primitives from `@21n/ui/elements` and domain-neutral compositions from `@21n/ui/compositions`. Connect them to preferences, app state, and workflows only from the owning application, shell, or feature layer.
- Follow naming conventions (`camelCase` for functions, `PascalCase` for components, enums colocated with their owning feature, primitive, runtime, or schema).

### Frontend Guidelines

- When editing preferences, use `preferences.save` with the correct `Preference` enum and scoped variables to avoid clobbering user settings.
- Memoize IDs with helpers such as `generateResourceId` and `generateSimpleRandomId` instead of introducing new randomization logic.
- Handle markdown or node manipulation through utilities like `generateMarkdownText` and `NodularMarkdown` instead of new pipelines.
- Respect feature gating via product checks, including comparisons against `Product.NUCLEUM` and `Product.MEMOTRON`.

### Backend & Shared Code

- Backend modules under `services/account/` own AuthFn, account routing, DataFn sync/search, delivery, rate limits, observability, and local/Worker runtime wiring; reuse helpers in `services/account/src`, `schema`, `shared/utils`, and Superfunctions packages instead of duplicating logic.
- When debugging account/auth/DataFn behavior, inspect `services/account/src/app.ts`, `services/account/src/auth.ts`, `services/account/src/debug-sink.ts`, `services/account/src/datafn/`, and `schema/` before changing frontend code.
- Update generated DataFn/Drizzle mappings, schema definitions, and migrations carefully, and coordinate application-side schema expectations with `schema/datafn.ts`.
- Keep shared types with their domain owner in `schema`, `client/features`, `client/runtime`, or `client/datafn`, aligning serialization logic with these definitions before modifying APIs.
- Fix account-service, AuthFn, DataFn, SearchFn, or Superfunctions bugs at their source package rather than masking them in product UI code.

### Testing & Verification

- Run relevant Turbo tasks such as `npm run test`, `npm run lint`, or targeted `turbo run <task> --filter=<project>` after significant changes.
- For UI work, consider Storybook or component-specific verification when available; otherwise smoke test the affected product app.
- Document manual verification steps in pull requests when automated coverage is lacking.

### End-to-End Test Organization

- Organize Playwright suites by shared product capability when the same behavior exists in multiple products. Capability suites such as `tests/focus/` and `tests/memory/` MUST run through product projects and model real product differences through E2E contracts instead of duplicated product-specific specs.
- Keep cross-cutting capability workflows at the capability root and group resource-specific workflows in plural resource directories such as `nodes/`, `objectives/`, and `tasks/`. Resource test directories MUST use plural names.
- Keep a scoped spec at the capability root unless more than two test files clearly belong to the same subdomain. Do not create a nested directory such as `settings/` for one or two specs; use root files such as `settings.spec.ts` instead.
- Centralize repeated capability setup and user workflows in a root helper such as `memory-test-helpers.ts` or `focus-test-helpers.ts`. Keep feature-specific assertions and editor interactions in their owning spec rather than growing a generic helper with unrelated behavior.
- Seed durable precondition state through the E2E DataFn seed fixture (`seed.focus`, `seed.memory`, `seed.collections`) when that state is not the behavior under test. Prefer seed options such as `isPinnedForQuickFocus`, `objectiveId`, and `parentId` over command-bar or panel setup for fixtures. Keep creation, Capture, pin, link, or other setup UI only when that UI path or its side effects is what the test asserts.
- Use Playwright tags only for cross-cutting selection that folder or file paths cannot express. Keep tags such as `@smoke`, `@context-menu`, `@bulk-editor`, `@record-page`, `@creation`, `@browse`, `@settings`, and `@auth`. Do NOT add tags that mirror a directory or file (for example `@focus-feature`, `@session-items`, `@presets`) or capability-scoped smoke/feature aliases such as `@focus-smoke` or `@memory-feature`; select those suites with paths (`tests/focus/`, `tests/focus/active-session/session-items.spec.ts`) and combine with `@smoke` when needed (`tests/focus/ --grep @smoke`).
- Assert immediate user-visible outcomes directly after UI actions: verify the resulting resource, selected bucket, or visible product surface. An action completing, a toast appearing, a store or runtime mutation, or a search result matching is not sufficient proof when stronger visible-state evidence is available.
- Assert DOM readiness and visibility with Playwright web-first locator assertions so UI mode and trace snapshots record the asserted element. For any-of readiness, use `expectAnyLocatorVisible`; for correlated UI conditions, use `expect(...).toPass()` with locator assertions inside. Do not poll `locator.isVisible()` or `locator.isHidden()` booleans.
- Use `expect.poll` only for non-DOM values such as runtime state, persistence, URLs, browser APIs, or serialized collections. Retained polls MUST include a diagnostic `message`; when the polled state has a user-visible consequence, follow it with a direct locator assertion.
- When a workflow writes data that is expected to persist, Playwright tests MUST make both assertions in order: first verify the immediate visible UI feedback, then cross a persistence boundary by closing and reopening the owning page or panel or by reloading the app and navigating back, and verify the durable data again. Do not remove the immediate UI assertion when adding persistence coverage; neither immediate in-memory state nor the post-reopen assertion substitutes for the other.
- Prefer accessible roles, stable test IDs, E2E surface contracts, resource contracts, and shared navigation helpers over CSS structure or product-name branching. Avoid fixed waits where a locator, URL, or persisted-state condition can be awaited.
- Keep specs cohesive and split them when unrelated workflows make ownership or failure diagnosis unclear. Do not copy large specs, repeated route setup, or fallback chains into new resource suites when a shared helper or contract can express the behavior once.

### Workflow Discipline

- Plan work with TODO tracking when tasks involve multiple steps, and close items as progress is made.
- Prefer absolute paths for tooling interactions to avoid ambiguity in the monorepo.
- Use repository-aware tooling, including ripgrep and apply_patch, rather than manual edits that bypass formatting expectations.

### Safety & Secrets

- Never commit environment secrets; rely on documented environment variables such as `VITE_PRODUCT`, `VITE_STATIC_URL`, account-service `ACCOUNT_*` / `AUTHFN_*` / `DATAFN_*` settings, and debug-sink `DEBUG_SINK_*` settings.
- Treat user data and analytics integrations cautiously; consult existing stores or services before changing persistence behavior.

### Additional References

- `deployment/README.md` for infrastructure deployment steps.
- Product-specific docs or configs within `client/products/` for feature toggles and navigation.
- Tests under `tests/`, `apps/e2e-playwright/tests/`, package-local `*.test.ts` files, and fixtures such as `apps/e2e-playwright/tests/fixtures/` to understand existing coverage.
- Always validate assumptions by reading nearby code before rewriting patterns, and ask for clarification when unsure.

## Operational Constraints

- Maintain ASCII-only edits unless files already contain extended characters, never introduce inline comments when modifying code, and prefer JSDoc comments for symbol or function documentation.
- During migrations or refactors, agents MUST NOT introduce intermediary scaffolding, compatibility shims, bridge layers, duplicate config/schema entrypoints, or temporary wrapper APIs unless the user explicitly asks for them. Replace old patterns directly with the target architecture, remove obsolete callers and files in the same change, and stop to ask if a temporary bridge appears unavoidable.

### Non-Negotiable Change Rules

- Any agent fixing issues or bugs, or working on new features, MUST NOT modify existing Playwright or unit tests unless the master explicitly permits each modification.
- Agents MUST NOT modify user-facing UI or functionality unless the master explicitly confirms the change.
- Agents MAY add new Playwright or unit tests when working on new features.

## Workflow Expectations

- Perform code discovery before changes to avoid reimplementing behavior and to understand adjacent systems, especially `client/datafn/`, `client/features/`, `schema/`, `client/persistence`, and `services/account/src/datafn`.
- Align UI updates with accessibility and interaction patterns established in shared components.
- When introducing infrastructure or backend changes, review `deployment/README.md` and coordinate account-service, DataFn, lookup-store, and Cloud deployments with application expectations.
- Record manual verification steps whenever automated coverage is insufficient, ensuring reviewers can reproduce validation.
- Evaluate extension surfaces under `extensions/` whenever share flows or browser integrations are affected to keep host app and extension behavior cohesive.

## Governance

The Nucleum constitution supersedes conflicting process documents for automated agents. Amendments require maintainer approval, an updated Sync Impact Report, and simultaneous updates to dependent templates. Versioning follows semantic rules: MAJOR for principle removals or redefinitions, MINOR for added principles or material scope expansions, PATCH for clarifications. Compliance is reviewed during major feature plans and code reviews; violations must be remediated before merge.

### Sync Impact Report

- Version change: 1.11.2 to 1.11.3.
- Clarified that `docs/architecture/client-boundaries.md` and `docs/architecture/type-ownership.md` are the current contracts, and that the TIDY-477 and TIDY-478 journals live in `docs/architecture/history/`. No principle or workflow changes.

- Version change: 1.11.1 to 1.11.2.
- Renamed the constitution from Tidigit to Nucleum. No principle or workflow changes.

- Version change: 1.11.0 to 1.11.1.
- Renamed the composition-root workspace to `client/composition` (`@nucleum/composition`), flattened the single-purpose branding, paint, and wiring files to its root, and renamed host registration to `configure-hosts.ts`.
- Updated direct imports, workspace metadata, architecture enforcement, current package inventory, and ownership guidance without changing test or user-facing behavior authorization rules.

- Version change: 1.10.1 to 1.11.0.
- Retired client/utils and @21n/utils; colocated helpers and tests with semantic owners.
- Removed workspace/alias/dependency entries and updated architecture enforcement and type inventory.

- Version change: 1.10.0 to 1.10.1.
- Corrected stale command ownership guidance to match the implemented surface runner and application registry assembly.
- Updated application/shell charters and architecture documentation for named transports, account screens, telemetry, sync scheduling and decomposed feature workflows.
- Preserved the existing test and user-facing behavior authorization rules.

- Version change: 1.9.0 to 1.10.0.
- Restricted application source to composition, layers, chrome, branding and paint; retired the remaining workflow and experiment directories.
- Assigned mixed-resource rendering and bulk editing to library, sharing to its surface, OAuth and session resolution to account, diagnostics/errors/support to help, and recovery/update workflows to settings. Modal chrome belongs to shell.
- Extracted runtime host/service-worker/native-message mechanics, shared metadata/timezone/file behavior, and product-configured plan access from application layers. Portable map/capture/quick-access presentation remains in UI with named connected adapters.
- Updated the ownership charters, architecture enforcement, retired-path rules and type-inventory destinations together.

- Version change: 1.8.1 to 1.9.0.
- Made the application shell acyclic: `client/shell` no longer imports `application`, `surfaces`, or `products`; the architecture checker enforces the ban symmetrically with the existing features rule, and the demoted `@nucleum/shell` dependencies on those packages are removed.
- Added the narrow product navigation config host (`client/shared-state/product/product-config-host`, registered from `resource-hosts.ts`) as the only product data the shell reads.
- Injected the five remaining chrome couplings (top nav brand/search/bulk-edit/sync status, left nav profile, app-menu capture) as optional Svelte snippet props wired by the new `client/application/chrome/` adapters; stale paths below are amended accordingly.

- Version change: 1.8.0 to 1.8.1.
- Relocated the base/user application layers (`BaseLayer`, `UserBaseLayer`, `UserLayout`, `AuthGuard`, `ModalLayer`, debug layers), the paint roots (`ComponentResolver`, `AppLoadingView`), and `settingsActionMap` from `client/shell` to `client/application`, since they wire the running product together and were never arrangement-only shell.
- Moved product shortcut defaults (`shortcuts.config.ts`) into `client/application/composition`, already consumed through the `ShortcutHost` contract.
- Relocated `resolveTrialDaysLeft` to `client/runtime/account/plan.utils` and the library resource predicates to `client/shared-state/resources/library.utils`, removing the remaining shell imports of features and subscription surfaces.
- Shell paint resolvers now render named actions through the shared-state action renderer host instead of importing application composition directly.

- Version change: 1.7.0 to 1.8.0.
- Renamed the shared client state workspace from `client/capabilities` to `client/shared-state` (`@nucleum/shared-state`), approving that name as the single shared-state home while retaining the named-owner and no-root-barrel rules.
- Lifted the application shell to the top-level `client/shell` workspace (`@nucleum/shell`); it remains the only app-level layer features may consume.
- Established the top-level `client/surfaces` workspace (`@nucleum/surfaces`) for cross-feature product surfaces (account, subscription, onboarding, help, settings, command, search, library) and enforced that features never import surfaces.
- Narrowed `client/application` toward the composition root, modal orchestration, record presentation, and app-specific integrations.
- Synchronized the architecture references and per-layer charter READMEs; retained existing test and UI authorization rules.

**Version**: 1.11.3 | **Ratified**: 2025-09-27 | **Last Amended**: 2026-10-03
