
# Tidigit Constitution

## Core Principles

### I. Product Context First
Agents MUST confirm the active product context before touching UI or workflow code. They MUST inspect `client/products/*` configurations and `$appStore.product` to respect feature gates and product-specific behaviors. Rationale: enforcing product awareness prevents regressions across Nucleus, Memotron, Pointron, and future bundles.

### II. Reuse Shared System
Agents MUST reuse existing primitives, stores, and utilities when delivering changes. Prefer components in `client/elements/`, helpers such as `generateResourceId` and `generateSimpleRandomId`, and shared logic in `client/stores` or `shared/utils` instead of duplicating behavior. Rationale: reuse keeps the monorepo coherent and avoids parallel implementations that drift over time.

### III. Safe State & Data Handling
Agents MUST persist preferences with the correct `Preference` enums, sub-variable scopes, and helper APIs. Frontend persistence MUST rely on the Flux data layer while respecting the Dexie offline provider (`client/persistence/dexie`) and its sync boundaries. Remote synchronization MUST align with the DynamoDB schemas and helpers defined under `server/database/providers/dynamodb.provider.ts`. Rationale: disciplined state management keeps local Dexie stores and DynamoDB records consistent across clients and services.

### IV. Verified Delivery via Repo Workflows
Agents MUST run repository scripts (`npm run dev`, targeted Turbo commands, lint, and tests) that correspond to touched surfaces, and document verification steps alongside changes. Code MUST remain free of inline comments and follow established Svelte structure (script, markup, style). Rationale: shared workflows and TDD discipline keep quality high and reproducible.

### V. Security & Secrets Discipline
Agents MUST prevent exposure of credentials or sensitive data. Environment configuration MUST rely on documented variables such as `VITE_PRODUCT`, `VITE_STATIC_URL`, `MASTER_DB_TABLE_NAME`, and AWS credentials required by DynamoDB integrations. Storage integrations MUST use vetted helpers in `server/utils`, S3 utilities, and DynamoDB providers. Rationale: consistent security practices safeguard users and hosting environments.

## Onboarding Checklist

### Orientation
- Review `README.md`, `CONTRIBUTING.md`, and `WARP.md` before making changes.
- Recognize the monorepo layout:
  - `client/`: SvelteKit frontends, shared UI primitives, product-specific code.
  - `server/`: Node.js services, SurrealDB helpers, cloud integrations.
  - `shared/`: Cross-layer types and utilities.
  - `apps/`: Deployable product bundles (Memotron, Pointron, Nucleus, Gathery).
  - `deployment/`: Infrastructure scripts and CDK stacks.
- Confirm product context through `client/products/*` configurations and `$appStore.product` usage before editing UI flows.

### Tooling & Commands
- Use npm workspaces and Turbo tasks; run `npm run dev`, `npm run build`, or filtered commands such as `npm run dev:nucleus` and `npm run build:pointron` when verifying changes.
- Prefer repository scripts over ad-hoc commands to mirror how existing apps are started, built, and tested.

### Coding Standards
- Default to TypeScript, Svelte, and Tailwind conventions already present in the repo.
- Match existing Svelte component organization: `<script lang="ts">`, markup, then `<style>` if needed, with shared logic kept in stores or utilities.
- Keep code free of inline comments per repository policy.
- Honor accessibility and UX patterns by reusing primitives from `client/elements/` and shared stores such as `preferences` and `appStore`.
- Follow naming conventions (`camelCase` for functions, `PascalCase` for components, enums from `client/types/`).

### Frontend Guidelines
- When editing preferences, use `preferences.save` with the correct `Preference` enum and scoped variables to avoid clobbering user settings.
- Memoize IDs with helpers such as `generateResourceId` and `generateSimpleRandomId` instead of introducing new randomization logic.
- Handle markdown or node manipulation through utilities like `generateMarkdownText` and `NodularMarkdown` instead of new pipelines.
- Respect feature gating via product checks, including comparisons against `Product.NUCLEUS` and `Product.MEMOTRON`.

### Backend & Shared Code
- Backend modules under `server/` assume SurrealDB and AWS-compatible storage; reuse helpers in `server/utils`, `server/s3.ts`, and `shared/utils` instead of duplicating logic.
- Update database migrations in `server/surreal-archive/` carefully and coordinate changes with application-side schema expectations.
- Keep shared types in `shared/types` or `client/types`, aligning serialization logic with these definitions before modifying APIs.

### Testing & Verification
- Run relevant Turbo tasks such as `npm run test`, `npm run lint`, or targeted `turbo run <task> --filter=<project>` after significant changes.
- For UI work, consider Storybook or component-specific verification when available; otherwise smoke test the affected product app.
- Document manual verification steps in pull requests when automated coverage is lacking.

### Workflow Discipline
- Plan work with TODO tracking when tasks involve multiple steps, and close items as progress is made.
- Prefer absolute paths for tooling interactions to avoid ambiguity in the monorepo.
- Use repository-aware tooling, including ripgrep and apply_patch, rather than manual edits that bypass formatting expectations.

### Safety & Secrets
- Never commit environment secrets; rely on documented environment variables such as `VITE_PRODUCT` and `VITE_STATIC_URL`.
- Treat user data and analytics integrations cautiously; consult existing stores or services before changing persistence behavior.

### Additional References
- `WARP.md` for automation policies, CLI workflows, and PR review expectations.
- `deployment/README.md` for infrastructure deployment steps.
- Product-specific docs or configs within `client/products/` for feature toggles and navigation.
- Tests under `tests/` and fixtures in `tests/fixtures/` to understand existing coverage.
- Always validate assumptions by reading nearby code before rewriting patterns, and ask for clarification when unsure.

## Operational Constraints

- Maintain ASCII-only edits unless files already contain extended characters, and never introduce inline comments when modifying code.

## Workflow Expectations

- Perform code discovery before changes to avoid reimplementing behavior and to understand adjacent systems, especially `flux.ts`, `dexie.local.ts`, and DynamoDB providers.
- Align UI updates with accessibility and interaction patterns established in shared components.
- When introducing infrastructure or backend changes, review `deployment/README.md` and coordinate DynamoDB schema or Cloud deployments with application expectations.
- Record manual verification steps whenever automated coverage is insufficient, ensuring reviewers can reproduce validation.
- Evaluate extension surfaces under `extensions/` whenever share flows or browser integrations are affected to keep host app and extension behavior cohesive.

## Governance

The Tidigit constitution supersedes conflicting process documents for automated agents. Amendments require maintainer approval, an updated Sync Impact Report, and simultaneous updates to dependent templates. Versioning follows semantic rules: MAJOR for principle removals or redefinitions, MINOR for added principles or material scope expansions, PATCH for clarifications. Compliance is reviewed during major feature plans and code reviews; violations must be remediated before merge.

**Version**: 1.1.0 | **Ratified**: 2025-09-27 | **Last Amended**: 2025-09-29