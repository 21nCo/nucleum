# `client/runtime` — browser infrastructure, no UI

Charter: how the client talks to the outside world and computes, with no
presentation and no product workflow. It sits at the bottom and may be imported
by everyone, including extensions and workers that never load the full app.

## Owners

`account` (session state + transport), `audio`, `connectivity`, `embed`,
`inference`, `logging`, `os`, `context`.

## Belongs here

Transport, network authority, native/embed messaging, inference, audio decoding,
diagnostics, and the bare reactive state those need. Pure, low-dependency,
changes rarely.

## Never here (enforced)

Any import of `features`, `products`, `application`, the shell, `shared-state`,
or portable UI. Runtime is a leaf that others depend on, not the reverse.

## Junk-drawer test

- Has Svelte/DOM UI? -> not runtime.
- Coordinates a user-facing workflow (redirects, screens, prompts)? -> that
  workflow belongs in `application` or a feature; keep only the primitive here.
  (Example: `account.store` state lives here; the sign-in workflow does not.)
