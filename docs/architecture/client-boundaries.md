# Client ownership and import boundaries

Current ownership contract for the client. The constitution and semantic ownership rules are authoritative. The matrix and checker enforce import policy; passing them does not establish correct semantic ownership. Resolve disagreements by updating the implementation, policy, and documentation together. Update this file in the same change that moves an owner or an allowed edge.

Diagrams and the direct-import matrix live in [client dependency map](client-dependency-map.md). Type placement lives in [type ownership](type-ownership.md). The TIDY-477 phase journal lives in [history/tidy-477-client-boundaries.md](history/tidy-477-client-boundaries.md).

## Ownership

| Owner | Owns |
| --- | --- |
| `schema` | Resource definitions, cross-layer product identity (`schema/product.type.ts`), and billing wire contracts (`schema/account`). |
| `client/config` | Client product identity, action identifiers, and declarative navigation metadata. |
| `client/datafn` | DataFn record storage, local search storage, record migration, the sync runtime, visibility sync, and the live DataFn client in `datafn.store.ts`. |
| `client/runtime` | Account transport and session state, network authority, connectivity, logging, browser and embed context, service-worker registration, native messages, inference, telemetry SDK mechanics, media codecs, file transport, device and geolocation mechanics, and navigation request transport. |
| `client/persistence` | Browser/extension key-value storage, device identity, legacy local storage, migrations, and legacy backup. The logger arrives through `persistence/logging-host`. |
| `client/ui` | Domain-free portable presentation (`@21n/ui`). See the UI layers below. |
| `client/shared-state` | Product-independent client behavior under the named owners below. No root barrel. |
| `client/shell` | Navigation, panels, split views, tabs, trails, overlays, modal chrome, connected notification rendering, and global shortcut execution (`@nucleum/shell`). |
| `client/features` | Capability implementations. Memory owns Markdown editing and tags. Spaces owns combinations. Records owns connected record menus and bulk mutations. Focus owns its scheduled notification queue. |
| `client/surfaces` | Cross-feature product surfaces: account, subscription, onboarding, help, settings, the command surface, search, sharing, and library (`@nucleum/surfaces`). |
| `client/products` | Product experiences composed from those capabilities. Product source does not import composition. |
| `client/composition` | The composition root, `layers/`, and `chrome/`: host installation, base and user layers, command-registry assembly, and product-aware branding adapters (`@nucleum/composition`). |
| `client/routes` | The shared SvelteKit route tree for Nucleum, Memotron, and Pointron. |
| `client/extensions` | Shared extension layers and clipper source; deployable extension hosts live under `extensions/`. |
| `client/theme` | Portable appearance contracts and design tokens. |
| `client/static` | Shared assets and their build/serving integration. |
| `client/ambient` | Browser and build-time ambient declarations. |
| `client/next` | Optional product/resource overlay contracts; this checkout maps the alias to `next/noop`. |
| `extensions/` | Deployable extension hosts, separate from shared `client/extensions` source. |
| `apps/` | Thin product hosts. `apps/<product>/src/local.ts` selects that product's base layer. Timear keeps its own routes. |

`client/ui` layers:

| Layer | Owns |
| --- | --- |
| `elements` | Atomic controls and UI-only types. Keyboard and interaction-mode contracts live in `elements/keyboard`. |
| `compositions` | Domain-neutral compound UI, including charts, maps, breadcrumbs, nested lists, search controls, file presentation, keyboard listeners, duration inputs, scroll containers, and time selectors. |
| `actions` | Generic DOM behavior. Capability-specific actions stay beside their consumer. |
| `icons`, `illustrations`, `branding` | Portable icons, artwork, and pure visual marks. |
| `environment` | Portable viewport, platform, appearance and debug state, plus logger, haptic and asset-resolution contracts. |
| `hosts` | Dependency-inversion contracts shared by controls and compositions. |

`client/shared-state` owners: `app-context`, `appearance`, `commands`, `events`, `files`, `notifications`, `preferences`, `product`, `resources`, `shortcuts`. Import a named subpath such as `@nucleum/shared-state/preferences/preferences.store`.

State that looks shared but has a narrower owner:

| Concern | Owner |
| --- | --- |
| Browser and embed environment | `client/runtime/context.store.ts` |
| Account session state | `client/runtime/account/account.store.ts` |
| Sign-in, sign-out, bootstrap, and DataFn teardown | `client/surfaces/account/account-session.ts` |
| Account deletion | `client/surfaces/account/account-deletion.ts` |
| Subscription operations | `client/surfaces/subscription` |
| File workflow orchestration | `client/shared-state/files`; conversion primitives live in `runtime/media`, transport in `runtime/files`, and legacy storage mechanics in persistence. |
| URL and resource navigation | `client/shell/navigation/navigation.ts` |
| Command lookup and execution | `client/surfaces/commands/action-runner.ts` |
| Command definitions | The feature, surface, shell, or product that owns the action. `client/composition/global-commands.ts` only preserves assembly order. |
| Headless notifications | `client/shared-state/notifications` |
| Connected notification rendering | `client/shell/notifications` |
| Shortcut persistence and matching | `client/shared-state/shortcuts` |
| Global shortcut execution | `client/shell/shortcuts` |
| Shortcut settings | `client/surfaces/settings/shortcuts` |
| Selection state and the resource-action host | `client/shared-state/resources` |
| Support integration | `client/surfaces/help/support`, mounted by composition |
| Diagnostics and error screens | `client/surfaces/help` |
| Legacy recovery presentation | `client/surfaces/settings/data-recovery` |

## Closed edges

`npm run check:architecture` enforces the matrix in `tools/check/client-dependency-matrix.json`, including type-only imports. These are the edges that are easy to miss from the matrix alone:

- Features do not import products, surfaces, or composition. Shell is the only app-level layer they may use. Surfaces may compose features.
- Surfaces do not import composition. Product fields arrive through `@nucleum/shared-state/product/surface-config-host`.
- Shell does not import composition, surfaces, or products, directly or transitively. Product navigation arrives through `@nucleum/shared-state/product/product-config-host`.
- Shared-state does not import composition, features, or products, directly or transitively, including through type-only imports.
- DataFn and runtime do not import features, products, composition, shell, UI, or shared-state.
- UI does not import application state, runtime, shell, products, features, DataFn, persistence, schema, or domain state, directly or transitively.
- Inside UI, compositions may use elements, actions, icons, illustrations, branding, environment, and hosts. Those lower layers do not import compositions.
- Focus composition calculations (`features/focus/composition.utils.ts`) do not import the focus session singleton.
- A caller outside a capability uses a source file listed in `tools/check/feature-entrypoints.json`. That list is the public surface, not a barrel. Additions are an explicit contract change. Package exports expose the same paths.

Tests and specs are outside the production-source boundary gate. Stories are included in that gate, but excluded from workspace dependency and export checks. Retired import checks also inspect tests. `client/ui` is one matrix owner; the lower-layer rule above is separate. The aggregate `client/package.json` is not a matrix owner.

## Hosts

Lower layers do not import composition to reach product behavior. `installApplicationHosts()` in `client/composition/configure-hosts.ts` runs during base, user, extension, and sheet component initialization, before presentation or command execution. Each root registers its returned disposer with `onDestroy`. Bindings have application lifetime; one reference-counted platform subscription is shared by mounted roots and unsubscribed after the last root is destroyed. A later mount reinstalls bindings. Simultaneous products in one JavaScript realm are not supported.

| Contract | Installed by | Read by |
| --- | --- | --- |
| Command, action renderer, overlay, resource action, resource panel, record renderer, recents, shortcut, and product-presentation hosts | `configure-hosts.ts` | Shell, features, and surfaces |
| `@21n/ui/hosts` and `@21n/ui/environment` | `configure-hosts.ts`, or the owning shell or feature adapter | Portable UI |
| Product resource table host (`shared-state/product/product-resources`) | Composition | Record cover capability |
| Invalid-session recovery (`runtime/account/session-recovery-host`) | Composition | HTTP transport; account surface owns redirect/reload policy |
| `product-config-host` | Composition | Shell |
| `surface-config-host` | Composition | Surfaces |
| Chrome snippets (brand, search, bulk edit, offline status, capture, profile) | `client/composition/chrome/` | Shell, through optional snippet props |
| `persistence/logging-host` | Composition | Persistence |

Shell and feature adapters pass view-specific props such as keyboard matching, time scales, and address resolution. Do not add a compatibility wrapper or a generic service locator.

## Placement rules

These rules are semantic. The import checker does not decide them.

- A single current consumer does not make a composition feature-owned. Keep a domain-neutral composition in `client/ui/compositions` when future reuse is intentional.
- A component moves to UI only when its public contract can be expressed without product or domain vocabulary. Neutral breadcrumbs and scroll containers live in UI. `client/shell/navigation/components/AppBreadcrumbs.svelte` turns resource and path metadata into those items. Sidebars, tabs, split views, panels, and trails stay in the shell while they own URL state, resource resolution, or product menus.
- Product-aware branding that reads persistence or account identity stays in a named composition adapter, such as `client/composition/SubAtomLogo.svelte`, and composes portable marks through props.
- Shared Markdown display owns portable parsing. Memory owns Markdown editing.
- Account runtime state does not own file processing, deletion confirmation, or subscription workflows.
- Do not recreate `client/utils`, `client/stores`, `client/state`, `client/commands`, `client/events`, `client/layout`, `client/branding`, `client/illustrations`, `client/icons`, `client/iconsV2`, or `client/application`. Do not add a catch-all `stores`, `state`, `shared`, or `core` directory.
- When moving a module, update callers, feature exports, dependency declarations, and type-inventory destinations directly. Do not leave a compatibility re-export.

## App assembly and package contracts

Only shared routes import app-local assembly through `$local`. The root route passes product startup data to `BaseLayer`; the app route mounts the selected product layer. Product implementations cannot import app entrypoints. The checker reads literal aliases from each app SvelteKit config, resolves shared routes for every applicable host, and recognizes `$app`, `$env`, and `$service-worker` as framework modules. App-supplied route aliases are graph edges, not package dependency declarations.

Workspace source aliases do not grant public package access: consumed cross-package subpaths must be exported. The aggregate client manifest still groups runtime/config/next and has reciprocal package relationships with higher layers; owner-level acyclicity does not imply workspace-level acyclicity. See the dependency map for external-owner rules and system flow.
