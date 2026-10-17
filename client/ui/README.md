# `client/ui` — portable, domain-free presentation (`@21n/ui`)

Charter: reusable UI that knows nothing about this product. It must be droppable
into any product or extension unchanged.

## Layers (import direction is one-way, top depends on bottom)

- `compositions` — compound UI built from primitives (charts, maps, breadcrumbs,
  nested lists, search controls, file presentation, duration/time inputs).
- `elements` — atomic controls and UI-only types.
- `actions` — generic DOM behaviors.
- `icons`, `illustrations`, `branding` — portable visual assets.
- `environment` — package-wide portable platform state.
- `hosts` — dependency-inversion contracts for product behavior.

`compositions` may use every lower layer. `elements`, `actions`, `icons`,
`illustrations`, `branding`, `environment`, and `hosts` must never import
`compositions`.

## Belongs here

Presentation with credible cross-product reuse and **no** dependency on domain,
state, navigation, or infrastructure. A single current consumer is fine if reuse
is intended.

## Never here (enforced by `npm run check:architecture`)

Any import, direct or transitive, of `composition`, `surfaces`, the shell, `products`,
`features`, `datafn`, `persistence`, `schema`, `shared-state`, or `runtime`.

## Junk-drawer test

If it needs application/domain state, navigation, a DataFn/domain type, or product branching, it
does **not** belong here. Feed those in through props or a `hosts` contract
configured by the owning application, shell, or feature layer.

Portable presentation stores are permitted: environment owns viewport, platform,
appearance and debug state, plus logger, haptic and asset-resolution contracts.
