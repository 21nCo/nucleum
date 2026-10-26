# Product composition (@nucleum/composition)

This workspace wires independently owned implementations into a running product.
It is not the default owner of connected components or workflows.

## Permanent owners

- root files: `configure-hosts.ts` registers hosts, `shortcuts.config.ts` supplies product shortcut defaults, `global-commands.ts` and `settings-actions.ts` assemble owner-defined actions, `SubAtomLogo.svelte` connects product identity to portable marks, and `AppLoadingView.svelte` and `ComponentResolver.svelte` connect startup and action presentation.
- layers: startup ordering, account access gating, connected user layout assembly, shell overlay mounting, product base layer wiring and telemetry consent/lifecycle wiring.
- chrome: product-connected snippets supplied to the independent shell, including native capture.

The root source files are an explicit allowlist in the architecture checker.
New root files or directories require an ownership decision and checker update.

## Responsibilities owned elsewhere

- shell/navigation and shell/layers: browser navigation, route decoding, route-driven layout, platform classes and viewport handling.
- shell/overlays and shell/modal: modal stacking, chrome and dismissal; composition registers the concrete action renderer and mounts the overlay layer.
- surfaces/settings and product settings owners: settings action definitions; composition preserves their final registry order.
- surfaces/library: mixed-resource rendering and bulk selection presentation; features/records owns record actions and bulk mutations.
- surfaces/account: OAuth, session hydration, extension login and environment-change sign-out.
- surfaces/subscription: plan reconciliation and native purchase outcomes.
- surfaces/settings/data-recovery: recovery decisions, UI, and DataFn import orchestration; persistence owns backup parsing and local storage mechanics.
- surfaces/settings/about: application-update workflow.
- surfaces/help: documentation, support, connected error recovery and shipped diagnostics.
- surfaces/sharing: permissions and public-link workflows.
- runtime: host detection, native message validation, service workers and log capture.
- shared-state/app-context, preferences and files: application metadata, timezone preferences and native file responses.
- ui/compositions: quick-access grids, hold-action presentation and point-map rendering.
- features/memory/maps: memory popup content and its map adapter.

Composition keeps lifecycle sequencing and supplies narrow callbacks to the
owning workflows. Do not move a large layer wholesale into another generic
controller, service, state or utilities directory. Do not add compatibility
re-exports at retired paths.

## Verification

Run npm run check:architecture, node tools/check/type-ownership.mjs, the product
compiler checks and relevant unit suites. Compiler/import success does not
prove browser, native purchase, legacy-data recovery or cloud behavior.

For the presentation-host and settings splits, manually verify account sign-in,
extension login, onboarding, branded loading, account navigation status,
library search and empty states, backup and restore, E2EE controls, and cache
actions on the Caddy HTTPS product hosts. Reopen settings and library surfaces
after writes to confirm persistent results.
