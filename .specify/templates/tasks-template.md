# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract product context, impacted surfaces, repo commands
2. Load supporting design documents:
   → data-model.md: entities, stores, Dexie schema updates → implementation tasks
   → contracts/: each file → contract or interaction task (Flux sync, DynamoDB APIs)
   → research.md: decisions → setup/verification tasks
   → quickstart.md: smoke path → validation tasks
3. Generate tasks grouped by Tidigit surfaces:
   → Setup & Tooling (repo scripts, environment checks)
   → Verification (tests first, linting)
   → Shared types & stores
   → Client persistence & Flux (Dexie provider, resource stores)
   → Extensions (browser integrations, share surfaces)
   → Backend & Sync (DynamoDB providers, API handlers)
   → Apps/ bundles or deployment updates
   → Polish (docs, manual validation)
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file or dependent state = sequential (no [P])
   → Tests before implementation (respect repo workflows)
5. Number tasks sequentially (T001, T002...)
6. Capture dependencies between tasks
7. Provide parallel execution examples when meaningful
8. Validate completeness vs plan.md:
   → All entities mapped to implementation
   → All contracts covered by tests & code
   → Dexie ↔ DynamoDB sync paths addressed
   → Quickstart steps supported by tasks
   → Verification scripts listed
9. Return SUCCESS when tasks list satisfies above gates
```

## Format: `[ID] [P?] Description`
- **[P]**: Task can run in parallel (different files, no dependencies)
- Include precise paths (e.g., `client/persistence/dexie/...`, `server/database/providers/dynamodb.provider.ts`)
- Reference repo scripts for verification (e.g., `npm run test`, `npm run lint`)

## Path Conventions
- **Client**: `client/products/`, `client/components/`, `client/elements/`, `client/stores/`, `client/persistence/dexie/`, `client/utils/`
- **Server**: `server/database/providers/`, `server/common/`, `server/spaces/`, `server/utils/`
- **Shared**: `shared/types/`, `shared/utils/`
- **Apps**: `apps/memotron/`, `apps/pointron/`, `apps/nucleus/`, `apps/gathery/`
- **Extensions**: `extensions/<product>/`
- **Tests**: `tests/integration/`, `tests/unit/`, `tests/fixtures/`
- **Deployment**: `deployment/cdk/`, `deployment/pipelines/`

## Phase 3.1: Setup & Environment
- [ ] T001 Confirm product context, feature gates, persistence providers, and dependencies
- [ ] T002 Prepare environment (ensure `npm install`, feature branch naming, env vars like `MASTER_DB_TABLE_NAME`)
- [ ] T003 [P] Validate tooling via `npm run lint` / `npm run test` dry run if required

## Phase 3.2: Tests First (TDD focus)
**Write failing tests before implementation**
- [ ] T004 Define/update tests per contracts (e.g., `tests/integration/...`, `tests/unit/...`)
- [ ] T005 [P] Add contract tests referencing `contracts/` or sync expectations
- [ ] T006 [P] Add store/component tests for Flux persistence flows
- [ ] T007 Ensure quickstart path has automated or manual validation steps defined

## Phase 3.3: Shared Types & Stores
- [ ] T008 Update or create shared types in `shared/types/...`
- [ ] T009 [P] Adjust stores in `client/stores/...` or `client/products/...` configurations
- [ ] T010 Align persistence logic with Dexie schemas and Flux adapters

## Phase 3.4: Client Persistence & UI
- [ ] T011 Update Dexie provider or flux mediators (`client/persistence/dexie/...`, `client/components/flux/...`)
- [ ] T012 Implement/modify Svelte components under `client/components/` or `client/elements/`
- [ ] T013 [P] Wire UI to stores ensuring Dexie sync triggers remain consistent (no inline comments)

## Phase 3.5: Extensions (include when relevant)
- [ ] T014 Update extension integration logic or stores under `extensions/<product>/...`
- [ ] T015 [P] Adjust extension manifests or build scripts (`extensions/<product>/manifest.*`, bundlers)
- [ ] T016 Ensure extension-to-app messaging and Flux persistence hooks stay aligned

## Phase 3.6: Backend & Sync (use only if server work required)
- [ ] T017 Update DynamoDB provider logic (`server/database/providers/dynamodb.provider.ts`)
- [ ] T018 Adjust API handlers or sync flows in `server/common`, `server/spaces`, or `server/utils`
- [ ] T019 [P] Update environment variables, AWS configuration, or supporting worker scripts referenced in plan.md

## Phase 3.7: Apps/Deployment (include when relevant)
- [ ] T020 Adjust Turbo/workspace or app-specific configs (`apps/<bundle>/...`)
- [ ] T021 Update deployment definitions (`deployment/cdk`, pipelines)

## Phase 3.8: Polish & Verification
- [ ] T022 [P] Update documentation or `quickstart.md`
- [ ] T023 Execute verification scripts in order (tests, lint, builds)
- [ ] T024 Capture manual validation steps aligned with product, extension, and sync scenarios
- [ ] T025 Clean up feature branch state, ensure specs and plan updated

## Dependencies
- Tests (T004-T007) must be completed before client/server implementation tasks
- Shared types/stores (T008-T010) precede UI/persistence tasks depending on them
- Client persistence and UI updates (T011-T013) depend on shared type decisions
- Extension work (T014-T016) relies on updated stores and persistence flows
- Backend updates (T017-T019) depend on shared/store definitions and extension messaging where relevant
- Deployment changes (T020-T021) depend on application implementations
- Verification tasks (T022-T025) run after implementation tasks

## Parallel Example
```
# Example: independent Dexie and database provider updates
Task: "T011 Update Dexie provider in client/persistence/dexie/..." [P]
Task: "T017 Update DynamoDB provider in server/database/providers/dynamodb.provider.ts" [P]
Task: "T008 Update shared types in shared/types/..." (blocks both)
```

## Notes
- Mark `[P]` only when tasks touch distinct files with no ordering dependency
- Ensure each task references absolute or clearly rooted paths
- Require failing tests before moving to implementation
- Encourage small, reviewable commits aligned with tasks

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts & Quickstart**:
   - Each contract file → test + implementation tasks
   - Quickstart steps → verification or manual validation tasks
2. **From Data Model / Stores**:
   - Each entity/store change → shared types + Dexie persistence tasks
   - Sync relationships → DynamoDB provider or API tasks
3. **From Product Context**:
   - Product-specific menus/settings → update `client/products/...`
   - Cross-product changes → ensure each affected product has dedicated tasks
4. **Ordering**:
   - Setup → Tests → Shared types/stores → Persistence/UI → Backend/Sync → Apps/Deployment → Polish
   - Break down large tasks to avoid multi-surface coupling

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] Every requirement in plan.md has at least one task
- [ ] All tests precede implementation tasks
- [ ] Parallel tasks operate on independent files
- [ ] Each task references exact paths or scripts
- [ ] Verification tasks cover automated and manual checks
- [ ] Dexie ↔ DynamoDB sync considerations captured
- [ ] Tasks align with Tidigit constitution (reuse, product context, workflows)