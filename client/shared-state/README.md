# `client/shared-state` — product-independent shared client state (`@nucleum/shared-state`)

Charter: reactive state and cross-cutting ports consumed across many features,
products, extensions, and the application shell. Not UI, not infrastructure, not
a single feature's state.

Named `shared-state`, **not** `capabilities`: user-facing capabilities are
`features/` (and product surfaces). This layer is the state they share.

## Owners (import named subpaths, no root barrel)

`app-context`, `appearance`, `commands`, `events`, `files`, `notifications`,
`preferences`, `product`, `resources`, `shortcuts`.

`events` owns the focus and memory event contracts; runtime extensions own
clipper transport events. `product` exposes the configured presentation host
consumed by surfaces without importing application composition.
`resources` owns headless resource state and host contracts; connected record
actions and bulk mutations live in `features/records`.

Example: `@nucleum/shared-state/preferences/preferences.store`.

## Belongs here

State or a contract that more than one feature/product needs and that has no UI
and no product-specific workflow. Concrete command *execution* lives in
`surfaces/commands`; final action registry assembly lives in `composition`.
The command *port* lives here because everyone consumes it.

## Never here (enforced)

Any import, direct or transitive, of `composition`, `surfaces`, the shell,
`features`, or `products`.
May consume `config`, `runtime`, `datafn`, `persistence`, `theme`, `schema`, shared
utilities, and portable UI contracts.

## Junk-drawer test

- Renders a screen? -> a `feature/` or product surface, not here.
- Pure infrastructure with no UI? -> `runtime/`.
- State owned by one feature? -> that feature.
- Do not add a generic `shared`, `core`, `state`, or `stores` bucket; file it
  under a named owner above.
