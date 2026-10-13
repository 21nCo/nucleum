# `client/runtime` — browser infrastructure, no UI

Charter: how the client talks to the outside world and computes, with no
presentation and no product workflow. It sits at the bottom and may be imported
by everyone, including extensions and workers that never load the full app.

## Owners

`account` (session state + transport), `audio`, `connectivity`, `embed`,
`inference`, `logging`, `context`, `app-data`, `device`, `environment`,
`extensions`, `files`, `geolocation`, `media`, `navigation`, `network`,
`service-worker`, and `telemetry`.

## Belongs here

Transport, network authority, native/embed messaging, inference, audio decoding,
diagnostics, and the bare reactive state those need. Pure, low-dependency,
changes rarely.

## Never here (enforced)

Any import of `features`, `products`, `composition`, `surfaces`, the shell, `shared-state`,
or portable UI. Runtime may consume persistence and lower-level schema/shared contracts; it cannot depend on higher client owners.

## Junk-drawer test

- Has Svelte/DOM UI? -> not runtime.
- Coordinates a user-facing workflow (redirects, screens, prompts)? -> that
  workflow belongs in `surfaces` or a feature; keep only the primitive here.
  (Example: `account.store` state lives here; the sign-in workflow does not.)

Session cleanup owns remote sign-out and scoped storage cleanup. Account surfaces
own the login redirect/reload policy; HTTP transport requests it through the
configured session-recovery contract. Command-palette labels belong to commandBar.
