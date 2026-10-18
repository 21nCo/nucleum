# `client/surfaces` — cross-feature product surfaces (`@nucleum/surfaces`)

Charter: user-facing surfaces that are about the app itself or operate across
all content features. Second-order UI: it composes `features/`, `shell/`, and
shared state into product-level experiences.

## Owners

`account` (identity workflows), `subscription` (billing and native purchases), `onboarding`, `help` (docs, support, error recovery and shipped diagnostics),
`settings` (including data recovery), `sharing`, `commandBar` + `commands` + `search` (command surface), `library`
(resource browsing and rendering).
Settings defines its action descriptors; product-specific settings define theirs
under the owning product. Application composes the final registry order.

## Why not `features/`

Features are first-order content capabilities a user creates and manages
(memory, focus, collections, spaces, calendar). Surfaces are about the product:
identity, billing, settings, command dispatch, and browsing every resource type.

## Import rules (enforced)

- May import `config`, `datafn`, `features`, `next`, `persistence`, `runtime`,
  `shared-state`, `shell`, `theme`, and `ui`. Product fields and application-selected presentation enter
  through narrow shared-state hosts configured before surfaces mount.
- Must not import `products` or `composition`; these owners assemble surfaces.
- `features/` must never import `surfaces/` — this edge is rejected by
  `npm run check:architecture`.

## Junk-drawer test

- A first-order content capability? -> `features/`.
- Pure arrangement/navigation chrome? -> `shell/`.
- Product wiring (host-contract configuration, base layers)? -> `composition`.
- Dev-only probes and experimental fixtures? -> `tools/`, stories, or delete.
- Shipped troubleshooting actions and diagnostics? -> `help/diagnostics`, preserving their existing access gates.
