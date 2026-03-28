# App Check Reporter

`tools/check/run-app-checks.mjs` is the repo-root reporter for the four app workspaces covered by the check-fix spec.

## Supported commands

- `npm run check:apps`
- `node tools/check/run-app-checks.mjs --format=json`
- `node tools/check/run-app-checks.mjs --format=text`
- `node tools/check/run-app-checks.mjs --workspace=nucleus-app --format=json`
- `node tools/check/run-app-checks.mjs --workspace=memotron-app --format=json`
- `node tools/check/run-app-checks.mjs --workspace=pointron-app --format=json`
- `node tools/check/run-app-checks.mjs --workspace=timear --format=json`

## Workspace order

The reporter always evaluates workspaces in this deterministic order:

1. `nucleus-app`
2. `memotron-app`
3. `pointron-app`
4. `timear`

If `--workspace` is provided, the reporter filters that list without changing the canonical ordering.

## Output modes

- `json`
  - Canonical automation format.
  - Emits `status`, `generatedAt`, `workspaceOrder`, `results`, and `errors`.
  - Each result includes `workspace`, `cwd`, `exitCode`, `errors`, `warnings`, and `durationMs`.
- `text`
  - Emits one summary line per workspace.
  - Emits classified error lines after the workspace summaries when failures are present.

## Error codes

- `CHK_BASELINE_FAILED`
  - A targeted workspace check exited non-zero.
- `CHK_CONFIG_ROLLBACK`
  - A targeted app tsconfig no longer keeps `strict: true` or `checkJs: true`.
- `CHK_REPORTER_USAGE`
  - The reporter received an unsupported workspace, output format, or argument.

## Path and message rules

- `cwd` and any error `path` values are repository-relative.
- Reporter messages are summary-only and do not echo raw `svelte-check` diagnostics.
