# `client/shell` — application shell: arrangement and navigation (`@nucleum/shell`)

Charter: how the app is arranged and moved through, independent of what content
fills it. Pure "where things go and how you move", never "what a screen does".

## Owners

`navigation` (URL/history, resource navigation), `topNav`, `bottomNav`,
`leftPanel`, `rightPanel`, `trail`, `layers` (theme, metadata, embed),
`overlays`, `modal`, `paint` (page and
resource resolvers fed through the shared-state action renderer), `split views`,
`tabs`, `interaction`, `navigator`, `shortcuts`, `sync` and `notifications` chrome.

`navigation/NavigationLayout.svelte` owns route-driven arrangement and receives
connected nav snippets from application. `overlays/ModalLayer.svelte` owns the
overlay stack and resolves action content through the registered renderer.

## Belongs here

Anything that owns URL state, panel arrangement, tab/sidebar behavior, product
menus, or shell events. If removing it would not change what any single screen
does, only how screens are framed and reached, it belongs here.

## Not here

- Domain screens and workflows (account, library, settings, command) ->
  `surfaces/`.
- Portable domain-free UI -> `ui/`.
- Content capabilities -> `features/`.
- Sync scheduling -> `datafn/visibility-sync`; telemetry mechanics ->
  `runtime/telemetry`; consent/lifecycle wiring -> application layers;
  connected support -> `surfaces/help/support`.
- Application composition layers that wire the running product together
  (base/user layers, the action `ComponentResolver`, `AppLoadingView`, and the
  final settings action assembly) -> `composition/`.

## Dependency direction (enforced)

Shell is acyclic: it must not import `composition/`, `surfaces/`, or
`products/`, directly or transitively. Product navigation config enters through
`@nucleum/shared-state/product/product-config-host`; concrete chrome
(brand/logo, account avatar, search input, bulk-edit bar, offline status,
capture, profile section) enters through optional Svelte snippet props provided
by the application chrome adapters (`client/composition/chrome/`).

## Junk-drawer test

A shell component may read navigation and shell state, but it must not contain a
feature workflow. If it orchestrates a domain task (sign-in, billing, resource
browsing), it is a surface, not shell.
