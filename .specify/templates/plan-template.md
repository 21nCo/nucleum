
# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Identify active product (Memotron, Pointron, Nucleus, Gathery, cross-product)
   → Confirm relevant surfaces across client/, server/, shared/, apps/
3. Fill Constitution Check using Tidigit principles (Product Context, Reuse, Safe State, Verified Delivery, Security)
4. Evaluate Constitution Check
   → If violations exist: document in Complexity Tracking
   → If justification impossible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → Investigate `client/products/*` configs when UI changes apply
   → Confirm reuse of `client/elements`, `client/stores`, `shared/types`, `client/persistence/dexie`, and extension entrypoints under `extensions/` when relevant
   → Validate backend touchpoints against DynamoDB integrations in `server/database/providers/dynamodb.provider.ts`
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → data-model.md, quickstart.md, contracts/, update `AGENTS.md`
   → Map entities to `shared/types` or note extensions
   → Define store interactions, Flux persistence flows, and DynamoDB contracts
   → Capture persistence decisions referencing DynamoDB contracts
7. Re-evaluate Constitution Check
   → If new violations: refine design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe `/tasks` strategy (do NOT create tasks.md)
9. STOP - Ready for `/tasks`
```

**IMPORTANT**: The /plan command stops at step 7. Later phases are handled by `/tasks` and implementation workflows.

## Summary
[Primary requirement + intended outcome grounded in product context]

## Technical Context
**Active Product**: [Memotron | Pointron | Nucleus | Gathery | Cross-product | NEEDS CLARIFICATION]  
**Surfaces**: [client/products/... , client/components/... , client/stores/... , client/persistence/dexie/... , extensions/... , server/database/providers/dynamodb.provider.ts , shared/... , apps/... , deployment/... or NEEDS CLARIFICATION]  
**Data Flow**: [Flux + Dexie offline provider, sync via DynamoDB endpoints, other mechanisms]  
**Languages/Frameworks**: [SvelteKit, Tailwind, Node.js, AWS SDK, Dexie, others]  
**Shared Modules to reuse**: [List stores, utilities, components, helpers or NEEDS CLARIFICATION]  
**Backend Integrations**: [DynamoDB tables/indexes, AWS services, sync handlers]  
**Testing/Linting**: [Vitest, Playwright, npm run lint, npm run test, product-specific scripts]  
**Performance & UX Targets**: [Offline-first, sync latency, load thresholds, etc.]  
**Constraints & Risks**: [Feature gating, absolute path usage, no inline comments, AWS limits, NEEDS CLARIFICATION]

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status (PASS/FAIL) | Notes |
|-----------|--------------------|-------|
| Product Context First | | |
| Reuse Shared System | | |
| Safe State & Data Handling (Dexie ↔ DynamoDB) | | |
| Verified Delivery via Repo Workflows | | |
| Security & Secrets Discipline | | |

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md            # created by `/tasks`
```

### Source Surfaces
```
# Tailor this tree to the feature; include only impacted areas
client/
├── products/
├── components/
├── elements/
├── stores/
├── persistence/dexie/
├── utils/

extensions/
├── <product>/

server/
├── database/providers/dynamodb.provider.ts
├── common/
├── spaces/
├── utils/

shared/
├── types/
├── utils/

apps/
├── memotron/
├── pointron/
├── nucleus/
├── gathery/

tests/
├── integration/
├── unit/
├── fixtures/

deployment/
├── cdk/
└── pipelines/
```

**Structure Decision**: [Describe actual directories/files to touch. Include absolute paths when possible.]

## Phase 0: Outline & Research
1. Resolve NEEDS CLARIFICATION entries from Technical Context
   - Inspect existing implementations before proposing new modules
   - Review product config (`client/products/...`), stores, Flux data providers, extension entrypoints, and utilities for reuse patterns
   - Confirm DynamoDB access patterns in `server/database/providers/dynamodb.provider.ts`, table usage, and sync constraints
2. Capture findings in `research.md` using Decision/Rationale/Alternatives format
3. Identify verification scripts to run (dev/build/test) and list blockers

**Output**: research.md with product alignment and open questions cleared

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. Map data/state updates
   - Detail entities, stores, Dexie persistence behavior, sync expectations in `data-model.md`
   - Reference `shared/types` or specify new additions
   - Note DynamoDB-specific persistence considerations tied to provider helpers
2. Define interactions and contracts
   - UI: components, stores, feature flags, cross-product impacts
   - Persistence: Dexie schema changes, Flux dispatcher updates, sync triggers
   - Backend: DynamoDB table items, AWS SDK flows, worker scripts
   - Infrastructure: deployment changes, environment variables
   - Place schemas, endpoint shapes, interface diagrams in `contracts/`
3. Quickstart path
   - Outline minimal steps to validate feature locally using repo scripts (include Dexie setup, sync verification)
4. Update agent context
   - Run `.specify/scripts/bash/update-agent-context.sh cursor`
   - Capture new tech or commands introduced by this plan

**Output**: data-model.md, quickstart.md, contracts/, updated AGENTS.md entry

## Phase 2: Task Planning Approach
*Describe inputs for `/tasks`; do not produce tasks.md here*

**Task Generation Strategy**:
- Use `.specify/templates/tasks-template.md`
- Derive tasks from Phase 1 artifacts (entities, contracts, quickstart)
- Reference concrete paths (e.g., `client/persistence/dexie/...`, `server/database/providers/dynamodb.provider.ts`)

**Ordering Strategy**:
- Tests before implementation following repo scripts (npm run test, npm run lint)
- Group by surface: shared types → stores/Persistence → UI → extensions → DynamoDB/backend → deployment → polish

**Expected Output**: `tasks.md` with Tidigit-aware ordering, dependencies, parallel guidance

## Phase 3+: Future Implementation
*Beyond `/plan` scope*

**Phase 3**: `/tasks` generates executable tasks  
**Phase 4**: Implementation via repo workflows  
**Phase 5**: Validation with automated tests, quickstart, manual checks

## Complexity Tracking
*Fill only if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

## Progress Tracking
*Update during execution*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Tidigit Constitution v1.1.0 — see `/memory/constitution.md`*
