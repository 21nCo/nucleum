# Contract: Alias Governance Configuration

## 1. Alias Source of Truth
- Maintain `tools/alias-map.json` as the definitive list of `@21n/*` aliases.
- Shared helpers (`tools/alias-utils.mjs`, `tools/alias-utils.cjs`, `tools/alias-utils.d.ts`) emit TypeScript and Vite mappings—no other file should duplicate paths.
- Governance rule: alias additions/removals merge only after the map and utilities are updated.

## 2. TypeScript Path Mapping
- Regenerate root and workspace `tsconfig.json` files via `node tools/sync-aliases.mjs` on every alias change.
- Manual edits to `compilerOptions.paths` are prohibited; add CI to compare generated output with committed files.

## 3. Bundler Alignment
- Apps/extensions import `buildViteAliases` from `tools/alias-utils.mjs` and spread into `resolve.alias`.
- Additional bundlers (Storybook, Rollup, etc.) must reuse the helper—no bespoke alias lists allowed.

## 4. ESLint Enforcement
- Rule location: `tools/eslint/rules/alias-imports.mjs`, registered in `eslint.config.mjs` with severity `warn`.
- The rule flags `$lib/*`, parent-relative escapes, and direct `client/`/`apps/` imports when alias coverage exists.
- Tests: `tests/unit/eslint/alias-imports.spec.ts` must remain green after rule adjustments.

## 5. Codemod Workflow
- Command: `npm run codemod:alias [--dry-run] [--fail-on-unmapped]`.
- Implementation: `tools/codemods/alias-migration/index.ts` rewrites import/export/require/dynamic-import specifiers using ts-morph.
- Summary output (files processed, files changed, specifiers updated, unmapped list) is mandatory release evidence.
- Integration coverage: `tests/integration/codemods/alias-migration.spec.ts` validates behaviour across TS and Svelte inputs.

## 6. Governance Checklist
Each alias change must satisfy:
1. Update `tools/alias-map.json` and rerun the sync script.
2. Ensure a workspace `package.json` exists with wildcard exports.
3. Confirm ESLint recognises the alias (no false positives) and extend tests if required.
4. Verify the codemod maps the path (dry-run should yield zero related unmapped specifiers).

## 7. Enforcement Escalation
- **Phase 1 (current)**: warnings only; 16 documented exceptions remain (root assets, Plasmo scaffolding, workspace metadata).
- **Phase 2**: once exceptions are resolved/whitelisted, bump severity to `error` and add pre-commit enforcement.
- **Phase 3**: remove legacy `$lib`/direct path fallbacks from configs and enforce error-level violations globally.
