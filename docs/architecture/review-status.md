# Architecture review follow-through

Status for the October 3, 2026 working-tree cleanup. This is a delivery checklist,
not a replacement for the ownership contracts or historical migration journals.

## Completed

- [x] Resolve app-local imports in all applicable SvelteKit hosts; distinguish framework modules and fail unresolved local source imports.
- [x] Remove the product resolver: shared routes select app assembly and pass startup data into BaseLayer.
- [x] Check consumed workspace export keys and their agreement with source aliases; repair shared-state product exports and DataFn visibility/filter exports. Internal DataFn implementation imports use relative paths.
- [x] Refresh the client TypeScript include roots and remove nonexistent static export declarations.
- [x] Correct documentation scope, ownership rows, startup gates, UI environment responsibilities, and checker authority. Validate the dependency table against the matrix.
- [x] Move calendar selection/touch state, avatar selection state, support identity, command-palette labels, and the product-resource host to semantic owners.
- [x] Remove the unused left-threshold state export.
- [x] Separate runtime session cleanup from the account surface's redirect/reload policy through a narrow recovery contract.
- [x] Remove analytics helper/store and navigation/tab-store cycles. Navigation owns tab/trail activation; the stores own state.
- [x] Replace import-side-effect host setup with explicit installation and reference-counted platform subscription disposal.
- [x] Add type-ownership and retired-runtime checks to CI; retain retirement protections and fix extensionless retired-path matching.
- [x] Retire the four explicitly approved Gathery product files and its broken dev script. Preserve Spaces implementations; remove the two public exports whose only outside consumer was Gathery.
- [x] Remove the dev script for the absent clipper workspace; preserve shared clipper source. Rename the test workspace and selector to `@nucleum/tests`; repair `build:packages` selectors.

## Retained candidates and decisions

| Area | Evidence and disposition |
| --- | --- |
| Shared clipper source | `client/extensions/clipper` remains, but this checkout has no deployable clipper workspace. Confirm external packaging/host ownership before retiring source. |
| Spaces document/browser code | Retired: the shared Spaces browser, documents, `space.store`, and `GatheryEvent` are no longer needed and have been removed. Combination spaces under `client/features/spaces/combination` remain the live Spaces implementation. |
| `client/routes/play` | Routes are entrypoints; zero static importers is not evidence of dead code. Preserve pending a product decision. |
| Old shell/UI renderers, icons and static assets | Public exports, dynamic lookup, external consumers and build asset copying must be included in reachability analysis. No bulk deletion was performed. |
| `runtime/os.enum.ts`, `runtime/environment/variables.ts`, empty `OpenPreviewMode.svelte`, `apps/fetch-json-data.js` | Audit candidates, not approved deletions. Check runtime enum inventory, deployment consumers and entrypoint use before removal. |
| Runtime/config workspaces | Splitting the aggregate client package is deferred. The current owner graph and npm dependency/peer graph are explicitly distinguished. |
| Command result/component types | Some command and Svelte rendering contracts still use `any`. Tightening them needs a coordinated descriptor/caller migration; changing only the host signature would conceal the actual typing work. |
| Navigation event declaration | The legacy GlobalEvent enum retains its audited declaration. The transport literal and enum member remain duplication debt; do not introduce a runtime-to-shared-state dependency to eliminate it. |
| Legacy recovery and Next overlay | Retained compatibility responsibilities, not unused-code conclusions. |

Retired path lists intentionally retain names that no longer exist. Their job is
to reject reintroduction, so absence alone is not a reason to delete a rule.

## Verification and manual follow-up

Verified locally after implementation:

- Architecture: 2,230 source files, 11,566 resolved imports, zero violations and zero unresolved local imports; 11 checker tests pass.
- Dependency table: all 13 importing-owner rows match the matrix.
- Type ownership: 383 module dispositions, 198 unchanged runtime enums and one audited retirement; zero failures.
- All four app compiler checks pass; warnings remain in the product apps.
- `npm run build:products` passes all five scheduled tasks. Turbo warns that the static build task has no declared output files.
- 53 client tests pass across 11 focused files, including adjacent account/resource-action suites.
- `npm run lint` passes its configured checks and static build prerequisite; this is not a claim of repository-wide ESLint coverage.
- Updated test and package-build selectors resolve successfully in Turbo dry runs.

Run `npm run check:architecture`, `npm run check:type-ownership`,
`npm run check:no-legacy-runtime`, and `npm run check:apps`. Targeted client tests
cover session cleanup/recovery, network recovery, cover uploads, command labels,
tab activation/replacement and host unmount/remount. Use coverage-disabled focused
Vitest runs to avoid unrelated whole-tree coverage collection.

The share-extension check reports two errors in untouched source: Button's
`aria-label` prop in `client/extensions/SheetDebugLogs.svelte`, and optional
`nodeType` passed to a required prop in `extensions/memotron-share/src/routes/[...route]/+page.svelte`.
These were not changed or established against a clean-checkout baseline.

Browser QA remains unverified: the available Aside browser returned
`ERR_CONNECTION_REFUSED` for the HTTPS app while shell requests to the app and
account service returned HTTP 200. The Chrome computer-use provider was unavailable.
HTTP reachability and compiler success do not prove mounted UI behavior.

Manual checks on [Nucleum](https://local.nucleum.app),
[Memotron](https://local.memotron.app), and [Pointron](https://local.pointron.app):

1. Load the product and verify its own navigation, branding and library appear.
2. Open an existing resource in a tab, activate another tab, replace a tab, and return to the originating page. Reopen/reload to verify persisted tabs.
3. Navigate through horizontal/vertical trails and verify the selected resource and return path.
4. Edit an analytics page label/order, verify the immediate result, then reopen the page to verify persistence.
5. Open and close account/settings surfaces, reload, and verify startup completes without missing-host errors. Verify sign-out/recovery only with a designated test account.
6. Verify share-sheet startup and extension session recovery once the extension compiler errors are resolved.
