# Quickstart: Verifying Workspace Alias Migration

## Prerequisites
- Node environment bootstrapped (`npm install`).
- Feature branch `001-to-incrementally-replace` checked out.
- IDE TypeScript server restart capability (optional but recommended).

## 1. Sync Alias Configurations
1. Edit `/tools/alias-map.json` when adding or relocating shared packages.
2. Run the synchronization script to update every `tsconfig`:
   ```bash
   node tools/sync-aliases.mjs
   ```
3. Vite configs (`apps/*/vite.config.ts`, `extensions/memotron-share/vite.config.ts`) already rely on `buildViteAliases`; import the helper when introducing new apps/extensions.

## 2. Install Workspaces
```bash
npm install
```
This registers new workspace manifests (e.g., `client/data/package.json`) and refreshes `package-lock.json`.

## 3. Run Alias Codemod
```bash
npm run codemod:alias -- --dry-run        # inspect summary
npm run codemod:alias                     # apply changes
```
- Dry-run prints processed files, specifier counts, and unmapped imports.
- Use `--fail-on-unmapped` to halt if any paths lack alias coverage.

## 4. Manual Follow-up
- Review the “Unmapped specifiers” section; address asset/config imports that require bespoke treatment or document them in the backlog.
- Spot-check transformed files (Svelte + TypeScript) to ensure formatting survived the codemod.

## 5. Verification Matrix
1. Lint:
   ```bash
   npm run lint
   ```
2. Targeted tests:
   ```bash
   npx vitest run tests/unit/eslint/alias-imports.spec.ts tests/integration/codemods/alias-migration.spec.ts
   ```
3. Full test sweep (expected failures: `apps/memotron`, `apps/nucleus` report “No test files found”):
   ```bash
   npm run test
   ```
4. Optional smoke:
   ```bash
   npm run dev:memotron
   ```

## 6. IDE & DX Checks
- Restart the TypeScript server so new aliases resolve in autocomplete.
- Verify ESLint emits warnings (not errors) for `$lib` or relative imports; the rule lives at `tools/eslint/rules/alias-imports.mjs`.

## 7. Enforcement Roadmap
- Keep the rule at `warn` until the 16 documented exceptions are either aliased or carved out.
- Once compliance >90%, bump severity to `error` and update this quickstart.

## 8. Communicate Status
- Share codemod summaries and lint/test outcomes in engineering channels.
- Update product squads about remaining manual follow-ups (root config imports, Plasmo scaffolding, etc.).

