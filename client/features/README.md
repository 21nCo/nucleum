# `client/features` — user-facing content capabilities (`@nucleum/features`)

Charter: the marquee things a user creates and manages. Each feature is a
self-contained capability reached from outside only through declared entry
points.

## Owners

`calendar`, `collections`, `focus`, `memory`, `records`, `spaces`.

## Belongs here

A cohesive content capability with its own UI, state, and logic.
`records` owns connected record actions and bulk mutations; shared-state
supplies their headless selection state and application-configured host.

## Import rules (enforced)

- May import `config`, `datafn`, `persistence`, `runtime`, `shared-state`,
  `shell`, `theme`, and `ui`, plus permitted schema/shared contracts.
- May **not** import `products`, `surfaces`, or `composition`.
- Cross-feature imports must target a path declared in
  `tools/check/feature-entrypoints.json`; there is no barrel.

## Junk-drawer test

If the thing operates *across* features or is *about the app itself* — account
and billing, the command palette, the resource library/browser, settings,
onboarding, help — it is a **product surface** and belongs in the top-level
`client/surfaces/` workspace (see `docs/architecture/client-boundaries.md`).
`features/` must never import `surfaces/`; the checker rejects that edge.
