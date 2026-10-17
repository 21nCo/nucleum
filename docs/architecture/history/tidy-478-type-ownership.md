# TIDY-478 type ownership journal

This file is the phase record formerly kept in `docs/architecture/type-ownership.md`. The current contract is [type ownership](../type-ownership.md). The checklist, audit narrative, verification counts, and historical refinement below are snapshots from the commits that landed them. The inventory JSON stayed at `docs/architecture/type-ownership-inventory.json` because the checker reads it there.

---

# Type and contract ownership

Tracked in TIDY-478; coordinated with TIDY-477. Module moves preserve runtime enum values and persisted representations.

## Conventions

Definitions stay beside their implementation unless independent consumers need a neutral contract. Feature contracts belong to the feature and external callers use explicit public entries. Portable UI controls own their structural prop and style types: primitives belong to `client/ui/elements`, package-wide host contracts belong to `client/ui/hosts`, portable platform state belongs to `client/ui/environment`, domain-neutral composition contracts belong to `client/ui/compositions`, generic DOM-action contracts belong to `client/ui/actions`, and visual asset contracts belong with `client/ui/icons`, `client/ui/illustrations`, or `client/ui/branding`. Those contracts must not derive from schema records, DataFn resources, runtime types, application actions, or state interfaces; owning adapters translate domain models at the UI boundary. Keyboard contracts are shared by controls and application shortcuts. Application action contracts belong to client configuration; shared command-host and event contracts belong to `client/shared-state/commands` and `client/shared-state/events`; resource-panel and notification models belong to their named capabilities. Browser ambient declarations live in client/ambient.

Schema owns cross-layer account, subscription, and legacy persistence wire contracts. Shared account contracts must not import client modules. Legacy serialized formats remain distinct from current DataFn records: deriving them from a newer schema would change their accepted shape. Generated AuthFn and DataFn/Drizzle files remain owned by services/account generation scripts and are never manually rewritten. Type-only dependencies use import type; enums used at runtime retain value imports.

The global client/types and shared/types packages are retired, without replacement catch-all packages or compatibility exports. Splits use direct imports to the actual owner. Billing presentation fields remain in surfaces/subscription; wire enums and billing data belong to schema/account. Store interfaces are separated from legacy mutation/filter wire contracts. Markdown validation and responsive text truncation leave shared utilities for their frontend owners.

## Current ownership follow-up

Product menu contracts live in `client/shell/navigation/app-menu.type.ts`. The inventory retains original paths as baseline provenance and updates destinations for current ownership. Portable UI, including both former icon systems, illustrations, and pure branding assets, is consolidated in the `@21n/ui` workspace, and the old elements, components, actions, icons, illustrations, branding, layout, state, and stores workspace aliases are retired. Product-independent cross-capability state, command ports, events, and services use named owners under `client/shared-state`; runtime context, persistent UI preferences, migrations, shell state, and product-aware branding adapters are colocated with their semantic owners. Historical manifest and alias snapshots remain as evidence; `currentPackages` records the 30 current manifests. `@nucleum/client`, `@nucleum/shared-state`, and `@21n/ui` are registered private source workspaces and are not independently publishable builds.

The empty legacy and catch-all client utility workspaces have since been retired; `currentPackages` now records 30 manifests. The current checker validates 383 module dispositions and 198 unchanged runtime enums, plus the explicitly audited retirement of the disconnected shell cache's `CacheKey` enum. No other runtime-enum retirement is exempted.

The following migration checklist and audit evidence describe the TIDY-478 baseline. Current application, navigation, account, file, and command ownership is described in [`client-boundaries.md`](../client-boundaries.md).

## Execution checklist

- [x] Inventory first-party declarations, imports, packages, aliases, and generated modules.
- [x] Define ownership and migration conventions before edits.
- [x] Complete module colocation and mixed-contract splits.
- [x] Retire global aliases/packages and update all callers.
- [x] Enforce contract ownership and audit schema derivation and exceptions.
- [x] Verify products, services, extensions, shared packages, and relevant workflows.
- [x] Deliver coherent commits and record issue completion.

The inventory records every discovered module, its declarations and consumers, original ownership, and disposition. Locally declared types in implementation modules remain colocated; generated schemas remain generated; explicit type modules are reviewed against their consumers.

## Audit evidence and retained contracts

[type-ownership-inventory.json](../type-ownership-inventory.json) records all 383 baseline type modules (1,168 declarations), their consumers and explicit dispositions, all 41 package manifests including nested deployment packages, and 462 exported constants. The baseline is commit `32154c37`; destinations reflect this migration. Embedded types remain beside their implementation. Packages without type declarations were audited for exports and dependencies too. Source aliases are build-time paths; `@nucleum/client` is a private source workspace, not an independently publishable package.

- `schema/account` owns profile and subscription wire data. `EmailParts` has one definition. `IPlan` is an application presentation model. The Apple verification response now has one source in the payment provider.
- `schema/legacy` owns the existing Surreal mutation, query, sync, resource-action and store-data encodings. The store-data enum is shared with query generation; Svelte observable interfaces remain in DataFn. Legacy contracts are not derived from modern database rows because their date unions and projected fields differ.
- `schema/datafn.ts` derives resource names from `nucleumDatafnSchema`; `schema/features.ts` derives resource/relation inputs from `defineSchema`. The installed schema API does not provide a compatible generic record inference helper for legacy UI models. Generated account/AuthFn and DataFn files remain unchanged and are produced by `db:generate` and `datafn:generate`; no authoritative schema changed in this task.
- Client `Resource`, `MetaResource` and `Product` compose schema values with the existing Next overlay. This composition is intentional; backend callers import schema directly. Memory node models include editor projections and legacy serialized dates and remain capability-owned rather than copying generated service database types.
- Native transcription model identifiers (`tiny.en`) and worker model identifiers (`Xenova/whisper-tiny.en`) are different protocols. Both live in runtime/inference, in separate native and worker modules with their original enum values. ImportSource and StepType enums in product import adapters likewise describe different supported inputs. Position types in the PDF annotator and media grid represent different coordinate contracts.
- Keyboard and interaction-mode definitions belong to `client/ui/elements`; package-wide portable host contracts belong to `client/ui/hosts`; resource-panel actions belong to `client/shared-state/resources`. Generic error codes are schema-owned, headless notification state belongs to `client/shared-state/notifications`, connected notification rendering belongs to `client/shell/notifications`, and error recovery screens belong to `client/surfaces/help/errors`. Markdown validation belongs to memory, and responsive truncation belongs to the text primitive; shared utilities no longer import client implementations.
- Existing shared utility tests import the relocated validation/truncation functions directly. Their assertions remain unchanged; moving test ownership can be considered separately. Architecture production-layer rules exclude tests, but retired aliases are forbidden in tests too.
- The legacy relay request contract now lives with its server endpoint in `server/common/relay/relay.type.ts` and imports only schema-owned resource and query contracts. Server-to-client imports have no exceptions.
- Existing frontend implementation cycles are not claimed to be removed. Type-only imports erase type dependencies; runtime composition and feature API reduction remain coordinated with TIDY-477. This issue enforces cross-layer contract ownership and deliberate feature entries, not complete acyclicity of the application.

## Import and export rules

Import interfaces and aliases with `import type` or named `type` specifiers. Runtime enum uses must remain value imports. Do not re-export a moved definition from its former location. Public feature entries are listed in `tools/check/feature-entrypoints.json` and must match the feature package exports. DataFn and schema expose their new contracts directly. Do not create a new generic types package.

`npm run check:architecture` checks static imports, exports, dynamic imports, import types, CommonJS requires and Vitest mock imports. It rejects production schema/shared/server/service imports into client code, rejects all server-to-client imports, and rejects the retired package aliases. Historical specs and append-only `.conduct` reports retain references to the old layout as historical evidence; active guidance and configuration use the new owners.

## Verification

`npm run check:apps` passes for Nucleum, Memotron, Pointron and Timear with zero errors (379, 302, 308 and 0 warnings respectively). Account-service typechecking passes. The repository unit suite passes 277 tests with 3 skips; Playwright discovers 549 tests in 55 files. Focus session and Markdown persistence browser probes pass on the local HTTPS Nucleum host.

The share extension production build passes. Its check now reports two pre-existing errors instead of 47: unsupported `aria-label` on the debug-log button component and an optional NodeType at the route boundary. The original commit reproduces both. Timear extension build cannot initialize because the installed Sharp native binary is missing. Account memory integration cannot initialize because installed zod-to-json-schema imports an unavailable zod/v3 export; the original commit reproduces this failure. The separate legacy server suite has identical original/current results: 27 failing suites, 2 passing suites, 9 failed tests, 35 passed and 9 skipped. These include removed legacy Flux imports, missing provider dependencies, real-service integration failures and existing assertions. They are not evidence of migration regressions or passing end-to-end coverage.

`node tools/check/type-ownership.mjs` checks all recorded destinations and compares 199 runtime enum declarations to the baseline. `npm run check:architecture`, `npm run check:no-fixed-test-waits`, `npm run check:no-legacy-runtime`, `npm run lint` and the Turbo build graph dry-run pass. Lint has no package lint scripts and runs the configured static build prerequisite; it is not a claim of repository-wide formatting or ESLint coverage. Existing source aliases remain build-time dependencies; they are not indiscriminately added as workspace dependencies, which would create Turbo cycles. Contract consumers use the schema dependency and the existing frontend package/alias model.

Reproduce the browser checks with `node apps/e2e-playwright/scripts/probe-review-session.mjs` and `node apps/e2e-playwright/scripts/probe-markdown-ownership.mjs` while the local product server is running. Neither requires existing user data; each runs in a fresh offline browser context. Full cross-product Playwright, live auth/sync, native app packaging and production deployment were not exercised.

## Historical overlay/resource ownership refinement

TIDY-477 originally moved reusable popup contracts to the then-current elements package, overlay state to the then-current stores workspace, active-resource/selection state to its resource group, and generic ResourceError to DataFn. The current destinations are `client/ui/elements/modal`, `client/shell/overlays`, `client/shared-state/resources`, and DataFn respectively. The default error message belongs to `client/shared-state/notifications`. The inventory destinations follow the current owners so baseline enum validation stays reproducible. See [client-boundaries.md](../client-boundaries.md) for the permanent overlay host contract and the remaining application-specific dependencies.
