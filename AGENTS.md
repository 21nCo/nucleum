# Tidigit Constitution

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

- Review `README.md`, `CONTRIBUTING.md`, and `WARP.md` before making changes.
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

- Read `docs/architecture/client-boundaries.md` and `docs/architecture/type-ownership.md` before changing package ownership or imports. Their current-contract sections are authoritative; historical validation records describe earlier snapshots.
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

- `WARP.md` for automation policies, CLI workflows, and PR review expectations.
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

The Tidigit constitution supersedes conflicting process documents for automated agents. Amendments require maintainer approval, an updated Sync Impact Report, and simultaneous updates to dependent templates. Versioning follows semantic rules: MAJOR for principle removals or redefinitions, MINOR for added principles or material scope expansions, PATCH for clarifications. Compliance is reviewed during major feature plans and code reviews; violations must be remediated before merge.

### Sync Impact Report

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

**Version**: 1.11.1 | **Ratified**: 2025-09-27 | **Last Amended**: 2026-09-26

<!-- radix:start -->
# Radix

Radix is an interactive UI for agent-native software engineering. It is a macOS
app that the user keeps running while they work with you, and it shows the
workspaces of the current repo only. All of the repo's Radix data lives in
`.radix`, which is checked into git.

Radix runs a single React app, and each workspace is a React page in that app.
The user reads the pages in the Radix window, uses them and leaves comments on
them. You write the pages and answer the comments with the `rx` command.

## What workspaces are for

Radix gives you and the user a shared place to work that can do far more than a
chat. A page the user can click, drag and type into is almost always better
than a block of text or markdown. You are free to build expressive interfaces
that help the user understand a problem or make a decision.

For example, if the user needs to choose the value of a colour variable in the
code, give them a colour picker. That works much better than the two of you
describing colours to each other.

Component state is saved to disk, so a page is a tool the user can come back to
and keep using. It does not have to be a short experiment that gets thrown
away. It does not have to be large either. A workspace can be a single small
tool, a note, or a few questions for the user that might lead to some
discussion.

Make a workspace when the result is something the user will want to look at,
change or comment on, such as a plan, a comparison, a review, a set of options
or a value to pick. Short answers can stay in the terminal.

## Commands

```
rx                                       open the Radix window
rx help                                  print every command
rx init                                  set up Radix in this directory
rx id                                    print a new UUID
rx workspace list                        print all workspaces as JSON
rx workspace new <title>                 make a workspace, print its id

rx state get <component>                 print a component's state
rx state get --workspace <id>            print a workspace's state
rx state set <component> <json>          set a component's state (- reads stdin)

rx comment list <component>              print a component's threads
rx comment list --workspace <id>         print every thread in a workspace
rx comment add <component> <text>        start a thread, print its id
rx comment add --workspace <id> <text>   start a thread on the workspace
rx comment reply <thread> <text>         reply to a thread
rx comment resolve <thread>              mark a thread resolved

rx describe [<workspace>]                print a workspace's components,
                                         their state and their actions
                                         (the open workspace if none given)
rx action <component> <name> [<json>]    run a component's action and print
                                         the result; args are a JSON array
                                         (- reads stdin)
rx open <workspace>                      show a workspace in the window
rx screenshot [<workspace>]              write a PNG of the page, print its path
rx errors                                print the compile and runtime errors
                                         the page has seen
rx action radix comments '[true]'        show or hide the comment drawer

rx proposal list [--open]                what you said you would do
rx proposal add <text> [--decision]      add a proposal, print it
              [--workspace <id>]
rx proposal ask <text> [--decision]      add one and wait for the answer
              [--workspace <id>] [--timeout <seconds>]
rx proposal decide <id> <answer> [<note>]  approved, rejected, later, undecided
rx proposal done <id> [<note>]           move an answered one to the record
rx record list                           what happened, append only
rx record add <text> [--decision]        record something you did
rx preference list                       the standing preferences
rx preference add <text>                 add one
rx preference pause <id> [off]           stop it applying, or start it again
rx preference retire <id>                remove it
rx message list [--open]                 what the user said, pulled out
rx message add <label> <text> <source>   question, task, decision,
                                         preference or note
rx message next                          the oldest one still open
rx message answer <id> <link>            a workspace, a thread or a commit
rx message drop <id> [<why>]             it needed no answer
```

A component or thread id is enough to find its workspace. Most of these
commands work on the files, so they work whether or not the window is open.
`rx open`, `rx screenshot`, `rx errors` and `rx action` need the window open.
`rx action` also needs the window showing the workspace that holds the
component, and `rx describe` only lists actions for the workspace on screen.
Use `rx open` to switch to it first.

`rx state set` and `rx comment add` find the workspace by looking for the id in
`Workspace.tsx`, so write the component into the page first.

Comments made with `rx` are marked as coming from the agent, and comments made
in the window as coming from the user. The inbox in the window uses this to
show which threads are waiting for the user and which are waiting for you.

Each thread belongs to one element on a page, given by the thread's `component`
field. That is either a component id from `useComponentState`, or a
`data-rx-id` that Radix added to a plain element when the user commented on it.
Search `Workspace.tsx` for the id to find the element. If the thread has a
`quote`, the comment is about that piece of text within the element.

After dealing with a comment, reply to the thread. Resolve it yourself when the
matter is settled, and leave it open when the user may want to answer or check
the result.

## The repo's four lists

`.radix/decisions.json` holds four lists that belong to the repo rather than to
any workspace. The window shows them in the inbox, a tab each, and the commands
above read and write the file, so they work with the window shut.

- **Proposals** are what you say you are about to do, before you do it. The
  user answers each one with approve, reject or later, and an answered one
  moves into the record with `rx proposal done`. Use `rx proposal ask` for the
  ones you cannot sensibly continue without an answer: it waits until the user
  answers, in the window or in another terminal.
- **The record** is what happened in the codebase. It only grows. Add the
  decisions you took by yourself as well as the work, so the user can see the
  calls you made without being asked.
- **Preferences** are the long lived ones, such as which files are off limits.
  Read them with `rx preference list` before starting a change, and add one
  when the user settles something that will apply again.
- **Messages** are the parts of what the user said that are worth keeping: a
  question, a task, a decision, a preference or a note. Do not pull out
  everything they write. Take something out only if it asks for an answer or
  changes what gets built, and give its source, such as which message or
  section it came from. The purpose of these messages are to ensure that nothing
  from the user gets missed, and that we have a record of what has been said
  in a format that can be acted upon later.

Work down the open messages with `rx message next`. Answer one wherever fits
best: by making or editing a workspace, by replying to a comment, or by
changing the code. Then close the row with a link to that workspace, that
thread or the commit. A reply on its own is not an answer, because nobody can
go and check it later; if a row turns out not to need an answer, drop it with a
reason instead.

At the end of a reply, propose what you are about to do next. When the work is
finished, move those proposals into the record and add what else you decided.

## Workspaces

A workspace is a folder in `.radix` named by a UUID. Make one with
`rx workspace new`, then edit its files directly. When the user refers to a
workspace by its title, find its id with `rx workspace list`.

- `Workspace.tsx` is the page. It must default export a React component.
- `metadata.json` holds the title. Edit it to rename the workspace.
- `state.json` holds component state, keyed by component id. Prefer
  `rx state set` to editing it by hand.
- `comments.json` holds comment threads. Use `rx comment` rather than editing
  it.

The window updates within a moment of any file being saved. There is no build
step and no type checker, and a compile error leaves the old page on screen
without saying anything. After an edit, run `rx errors` to check for problems
and `rx screenshot` to see the result.

Some workspaces show a Claude Code session. Their `metadata.json` has a
`session` field, and Radix writes their `Workspace.tsx` from the session's
transcript, adding a `Message` or `ToolCall` line for each new part of the
conversation. Do not edit these pages by hand.

## Writing a page

- Imports need file extensions, for example
  `import { Button } from "../components/ui/button.tsx"`.
- Packages you can import: `react`, `react-dom/client`, `@base-ui/react/*`,
  `clsx`, `tailwind-merge`, `class-variance-authority` and `marked`. Nothing
  else is installed.
- Shared components are in `.radix/components`. shadcn/ui components are in
  `.radix/components/ui`. Icons use `<Icon name="plus-sign" />` with Hugeicons
  names. Use `<Markdown text={...} />` to show markdown. `Text`, `Checkbox`,
  `Code`, `TextField` and `Diagram` are ready made components with saved state
  that each take an `id`.
- Keep the page as `export default function Workspace()` returning a single
  element. The user can add `Text`, `Checkbox`, `Code` and `Diagram` blocks
  between that element's children, and Radix writes them into `Workspace.tsx`.
  The file can change while you work, so read it again before editing it, and
  keep any blocks the user added.
- The user can comment on `p`, `h1` to `h6`, `li`, `pre`, `blockquote`, `table`
  and `img` elements, and on any component that spreads `selectable`. Layout
  elements such as `div` and `ul` cannot be commented on, so put text inside
  one of the elements above.
- Style with Tailwind classes. Plain `h1`, `h2`, `p` and `code` are already
  styled. `.radix/style.css` applies to every page, so do not change it for one
  page.
- `data-rx-id` attributes in a page are added by Radix when the user comments
  on something. Never remove or change them, or the comments lose their place.

## State and actions

Every component id is a UUID from `rx id`. Never invent one, and never change
one once written.

```tsx
const [value, setValue, selectable] = useComponentState(id, initial);
return <div {...selectable}>...</div>;
```

`useComponentState` comes from `../components/state.tsx`. Its value is saved to
`state.json`, so it is what you and the user can both read. Spread
`selectable` onto the root element so the user can comment on the component.
Use `useState` only for things that do not need to be read outside the page.

```tsx
const save = useAction(id, "save", (message: string) => { ... return result; });
<Button onClick={() => save("from a click")}>Save</Button>
```

`useAction` comes from `../components/actions.tsx`. Give a component an action
for anything a button does that state cannot express. Wire the returned
function to the button, so a click and `rx action` run the same code. What it
returns is what `rx action` prints, and what it throws is the command's error.

When you build a tool, give it an action for everything the user can do with
it, not only its buttons. Drags, resizes, selections and typed values should
each call an action, so the pointer code and `rx action` run the same code.
You should be able to do anything the user can do on the page, and more,
without asking them to try it for you. This is like driving a browser, except
that you write the controls yourself, so make them easy to use. Leave an action
out only when running it without the user could do harm, for example by
deleting their work or sending something outside the machine. Once an action
exists, test it with `rx action` and check the result with `rx screenshot`.

## Diagrams

`<Diagram id="..." />` from `../components/Diagram.tsx` is a drawing the user
edits in the page. Use it for architecture sketches, flows and anything else
that is clearer as a picture. Its state is plain JSON, so you can write it with
`rx state set`:

```json
{
  "height": 300,
  "shapes": [
    {
      "id": "s1",
      "type": "rect",
      "x": 40,
      "y": 40,
      "w": 120,
      "h": 50,
      "text": "Client"
    },
    {
      "id": "s2",
      "type": "ellipse",
      "x": 300,
      "y": 40,
      "w": 120,
      "h": 50,
      "text": "Server",
      "fill": "#bfdbfe",
      "stroke": "#3b82f6"
    },
    { "id": "s3", "type": "line", "from": "s1", "to": "s2", "text": "requests" }
  ]
}
```

- The drawing is 800 units wide and `height` units tall. Shapes are drawn in
  order, so later shapes sit on top.
- `rect`, `ellipse` and `diamond` have `x`, `y` (the top left corner), `w`,
  `h`, `fill` and, for `rect`, `radius`.
- `line` has `x1`, `y1`, `x2`, `y2` and `arrow` (`"none"`, `"end"` or
  `"both"`). Set `from` or `to` to a shape's id to attach that end to the
  shape, and the line follows it when it moves.
- Every shape has `stroke`, `strokeWidth`, `dash`, `text`, `fontSize` and
  `textColor`. Anything left out gets a default when the page draws it.
- Colours are any CSS colour, `"none"`, or a theme colour such as
  `"var(--foreground)"`, which also works in dark mode.
- Text on its own is a `rect` with `fill` and `stroke` set to `"none"`.

While the workspace is open, the actions `add`, `update`, `remove`,
`reorder`, `setHeight` and `svg` check their input and fill in defaults.
`select` highlights a shape and opens its settings, which is a way to point
the user at it; pass `null` to clear it.
`rx action <id> svg` prints the drawing as a standalone SVG, which is a
quick way to check positions. Use `rx screenshot` to see whether shapes
overlap.

## Values in the code

When a component shows a value that is written in the project's code, such as
a colour, a constant or a threshold, bind it with `useSource` so the user can
change it from the page.

```tsx
const [accent, setAccent, error] = useSource(
  "src/theme.css",
  /--accent:\s*(#[0-9a-f]{6})/i,
);
<input
  type="color"
  value={accent ?? "#000000"}
  onChange={(e) => setAccent(e.target.value)}
/>;

const [speed, setSpeed] = useSource("src/config.ts", /const SPEED = (\d+)/, {
  parse: Number,
  format: String,
});
```

`useSource` comes from `../components/source.tsx`. The path is relative to the
project, meaning the folder that holds `.radix`. The pattern's first group is
the value. The pattern must match exactly once in the file, so anchor it on the
declaration and not on the value alone. The value is the text in the file, so
use `parse` and `format` for numbers and booleans.

Editing the file updates the component, and setting the value edits the file.
The value is `undefined` until the file has been read. If the binding cannot
find its value, or a new value would not match the pattern, nothing is
written. The problem is returned as `error` and also shows up in `rx errors`.

For anything `useSource` does not cover, a page can use
`radix.files.read(path)` and `radix.files.write(path, text)` directly. Only
files that already exist can be written.

## A complete page

This page has one component, a counter the user can click and you can reset
with `rx action`. Replace the id with one from `rx id`.

```tsx
import React from "react";

import { Button } from "../components/ui/button.tsx";
import { useAction } from "../components/actions.tsx";
import { useComponentState } from "../components/state.tsx";

const COUNTER = "3f6c1a52-0000-4000-8000-000000000000";

function Counter() {
  const [count, setCount, selectable] = useComponentState(COUNTER, 0);
  const reset = useAction(COUNTER, "reset", () => {
    setCount(0);
    return 0;
  });

  return (
    <div className="flex items-center gap-2" {...selectable}>
      <span className="font-mono text-sm">{count}</span>
      <Button onClick={() => setCount(count + 1)}>Add one</Button>
      <Button variant="outline" onClick={() => reset()}>
        Reset
      </Button>
    </div>
  );
}

export default function Workspace() {
  return (
    <div>
      <h1>Counter</h1>
      <Counter />
    </div>
  );
}
```

<!-- radix:end -->
<!-- radix:end -->
