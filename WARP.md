# Repository guide

`AGENTS.md` is the governing agent policy. Read it before changes. The current architecture is documented in [client boundaries](docs/architecture/client-boundaries.md) and [type ownership](docs/architecture/type-ownership.md).

## Organization

- `schema/`: cross-layer product/resource definitions, wire contracts, and legacy serialization contracts.
- `client/datafn/`: client storage, queries, sync, and DataFn resource adapters.
- `client/runtime/`: UI-independent auth/account transport, connectivity, logging, native messaging, audio, and inference.
- `client/features/`: shared capabilities such as memory, focus, calendar, collections, and spaces.
- `client/products/`: product-specific composition, configuration, and integrations.
- `client/config/`: client product identity, navigation metadata, and command identifiers.
- `client/composition/`: composition, lifecycle orchestration, chrome/branding adapters, and startup/action rendering.
- `client/surfaces/`: account, subscription, settings, help, sharing, command and library workflows.
- `client/shell/`: navigation, panels, tabs, modal chrome, viewport behavior and connected shell presentation.
- `client/ui/`: the domain-free `@21n/ui` package. Import atomic controls from `@21n/ui/elements`, reusable compound UI from `@21n/ui/compositions`, generic DOM behavior from `@21n/ui/actions`, portable icons from `@21n/ui/icons`, illustrations from `@21n/ui/illustrations`, pure visual brand assets from `@21n/ui/branding`, portable platform state from `@21n/ui/environment`, and host contracts from `@21n/ui/hosts`.
- `client/shared-state/`: the product-independent `@nucleum/shared-state` package with named app-context, appearance, commands, events, files, notifications, preferences, resources, and shortcuts owners.
- `client/persistence/`: persistence helpers and legacy backup/recovery boundaries.
- `services/account/`: AuthFn/DataFn account service, database mappings, lookup integrations, and Node/Worker deployments.
- `shared/`: cross-layer utilities and remaining legacy database objects.
- `apps/`, `extensions/`: deployable product and extension bundles; `apps/e2e-playwright` owns browser verification.

There is no global `client/types`, `shared/types`, or `client/utils` package. Helpers and tests follow their semantic owners; `@21n/utils` is retired. Import contracts from their domain owner. The unused `@nucleum/cx` workspace is retired.

## Composition rules

App context does not implement navigation or command execution. Shared state exposes the command port; `client/surfaces/commands` executes commands whose definitions live with their semantic owners and whose ordered registry is assembled in application composition. The application shell changes URL/history and owns connected notification rendering plus global shortcut execution. Shortcut settings presentation belongs under `client/surfaces/settings/shortcuts`. Application and extension shells install command, overlay, resource, renderer, shortcut, recents, icon-asset, and UI-environment hosts through `client/composition/configure-hosts.ts` before mounting consumers.

Compositions may use elements, actions, icons, illustrations, branding, environment, and hosts; those lower UI layers must not depend on compositions. Nothing under `client/ui` may directly or transitively depend on application state, runtime, shell, products, features, DataFn, persistence, schema, or domain state. Supply connected behavior through props or narrow host contracts and keep the adapter with its application, shell, or feature owner. Product-aware branding is an application adapter over portable brand assets. Do not move a domain-neutral composition merely because it currently has only one consumer. A portable-looking renderer such as breadcrumbs belongs in UI; route and resource resolution remain in a shell adapter.

Capabilities may depend on lower-level runtime, DataFn, persistence, schema, and portable UI contracts, but never on application, feature, or product implementations. Add only named capability directories and explicit subpath imports; do not add a capabilities barrel or generic `shared`, `core`, `state`, or `stores` bucket.

Use direct imports after moves, without compatibility wrappers. Shared runtime code must not transitively load capability or application implementations. Features use declared public entries when consuming another capability. Source aliases do not enforce package exports, so run the architecture checker.

## Commands

Run commands from the repository root using npm workspaces and Turbo:

```sh
npm ci --legacy-peer-deps
npm run dev:nucleus
npm run dev:memotron
npm run dev:pointron
npm run check:architecture
node tools/check/type-ownership.mjs
npm run check:apps
npm --workspace @21n/account-service run typecheck
npm run test
npm run lint
npm run build:nucleus
npm run build:memotron-share
```

Use the Caddy HTTPS hosts and account-service health checks in `AGENTS.md` for local browser work. Run one product server and browser worker at a time when practical. Do not treat compiler success as browser, cloud, native-device, or deployment proof.

## Database changes

Regenerate DataFn mappings with the account-service scripts. Generate and commit a forward migration for physical schema changes; never edit an applied migration. Deployment executes the checked-in migration journal. A successful local `datafn:push:local` does not prove that deployment migrations are complete.

## Review and delivery

Preserve unrelated checkout changes. Review product configuration and callers before editing. Follow the existing-test and user-facing behavior approval rules in `AGENTS.md`. Keep code free of inline comments and document exported APIs with JSDoc. PR descriptions must identify changed behavior, relevant verification, and unverified environments.
