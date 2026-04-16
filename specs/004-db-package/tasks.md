# Tasks: Separate Database Package

**Input**: Design documents from `/specs/004-db-package/`
**Plan**: plan.md | **Spec**: spec.md | **Research**: research.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every description

---

## Phase 1: Setup

**Purpose**: Create the `packages/db` workspace package skeleton.

- [x] T001 Create directory structure: `packages/db/prisma/`, `packages/db/src/`, `packages/db/generated/`
- [x] T002 Create `packages/db/package.json` per plan.md §1.1 (name: `@repo/db`, exports `./src/index.ts`, deps: `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`; devDeps: `prisma`, shared configs)
- [x] T003 Create `packages/db/tsconfig.json` per plan.md §1.2 (extends `@repo/typescript-config/base.json`, includes `src` and `prisma.config.ts`, excludes `generated`)

**Checkpoint**: `packages/db` is a valid workspace package; `pnpm install` from root recognises it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Move Prisma files, run generation, and wire Turbo — all user stories require this to be complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 `git mv apps/api/prisma/schema.prisma packages/db/prisma/schema.prisma` then update `output` in generator block to `"../generated/prisma"` in `packages/db/prisma/schema.prisma`
- [x] T005 [P] `git mv apps/api/prisma.config.ts packages/db/prisma.config.ts` (content unchanged — paths in `defineConfig` are relative to the file and stay valid)
- [x] T006 [P] Move `apps/api/prisma/migrations/` to `packages/db/prisma/migrations/` (directory is empty; preserve with a `.gitkeep` if needed)
- [x] T007 Update `turbo.json`: add `"^db:generate"` to `build.dependsOn` and `dev.dependsOn` per plan.md §Phase 5; add `"generated/prisma/**"` to `build.outputs`; rename `db:deploy` → `db:migrate:deploy`
- [x] T008 Run `pnpm install` from repo root so pnpm links `@repo/db` in the workspace
- [x] T009 Run `pnpm --filter @repo/db db:generate` and verify `packages/db/generated/prisma/` is populated with `client.ts`, `models.ts`, `enums.ts`, `browser.ts`, `commonInputTypes.ts`
- [x] T010 Add `generated/prisma/` to `packages/db/.gitignore` (or confirm root `.gitignore` covers it)

**Checkpoint**: `packages/db/generated/prisma/client.ts` exists; `turbo.json` ensures generation precedes all builds.

---

## Phase 3: User Story 1 — Import Database Types in API (Priority: P1)

**Goal**: All Prisma types are importable from `@repo/db` in `apps/api`; zero duplication.

**Independent Test**: Run `pnpm --filter api check-types` after completing this phase — it must resolve `PrismaClient` and the `Prisma` namespace from `@repo/db` with no errors.

- [x] T011 [US1] Create `packages/db/src/index.ts` — re-export from generated: `export * from '../generated/prisma/client.js'` (exports `PrismaClient`, all model types, input types, enums, `Prisma` namespace)
- [x] T012 [US1] Update `apps/api/package.json`: add `"@repo/db": "workspace:*"` to `dependencies`; remove `@prisma/client` from `dependencies` and `prisma` from `devDependencies`
- [x] T013 [US1] Run `pnpm install` from repo root to apply dependency changes
- [x] T014 [US1] Run `pnpm --filter api check-types` and confirm `PrismaClient` resolves from `@repo/db` with no type errors

**Checkpoint**: `apps/api` compiles with Prisma types sourced entirely from `@repo/db`. Existing `PrismaService` still builds (import path update comes in US2).

---

## Phase 4: User Story 2 — Use Database Client Singleton (Priority: P1)

**Goal**: Single `PrismaClient` instance (with `PrismaPg` adapter) exported from `packages/db`; `apps/api` uses it via `PrismaService`.

**Independent Test**: `apps/api` starts without error; `PrismaService` holds the singleton from `@repo/db`; `apps/api` has zero `@prisma/adapter-pg`, `pg`, or `@prisma/client` direct dependencies.

- [ ] T015 [US2] Create `packages/db/src/client.ts` — singleton `PrismaClient` with `PrismaPg` adapter and `globalThis` guard per plan.md §1.3
- [ ] T016 [US2] Update `packages/db/src/index.ts` to also export the singleton: `export { prisma } from './client.js'`
- [ ] T017 [US2] Rewrite `apps/api/src/database/prisma.service.ts` to wrap the singleton per plan.md §4.2 (implements `OnModuleInit`/`OnModuleDestroy`; no adapter instantiation in the API)
- [ ] T018 [US2] Update `apps/api/package.json`: remove `@prisma/adapter-pg`, `pg`, `@types/pg` from all dependency sections
- [ ] T019 [US2] Delete `apps/api/scripts/ensure-prisma-client.mjs`; remove all `pnpm run ensure:prisma &&` prefixes from `dev`, `build`, `start`, `start:debug`, `check-types` scripts in `apps/api/package.json`
- [ ] T020 [US2] Delete `apps/api/prisma/` directory (now empty after T004/T006) and `apps/api/generated/` directory; update `apps/api/package.json` `clean` script to remove `generated/prisma` entry
- [ ] T021 [US2] Run `pnpm install` from root; run `pnpm --filter api build` and confirm it succeeds with generation running first via Turbo

**Checkpoint**: `apps/api` has no direct Prisma dependencies; `PrismaService.db` is the `packages/db` singleton; build pipeline works end-to-end via Turbo.

---

## Phase 5: User Story 3 — Reusable by Future Consumers (Priority: P2)

**Goal**: Any workspace package can add `@repo/db` and import types without depending on `apps/api`.

**Independent Test**: Install `@repo/db` in one other workspace package, import a type, and confirm TypeScript resolves it without `apps/api` in the dep graph.

- [ ] T022 [US3] Verify `packages/db/package.json` `exports` field is `{ ".": "./src/index.ts" }` and no `apps/api` path appears in `packages/db`'s dependency tree (`pnpm why @repo/db --filter @repo/db`)
- [ ] T023 [US3] Add `"@repo/db": "workspace:*"` to `packages/types/package.json` as a smoke-test devDependency; add a type-only import in `packages/types/src/index.ts` (e.g., `import type { PrismaClient } from '@repo/db'`); run `pnpm --filter @repo/types check-types` and confirm it passes; revert the temporary import and dependency after verification

**Checkpoint**: `@repo/db` is a self-contained, re-usable package with no app-layer coupling.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full pipeline verification and final cleanup.

- [ ] T024 Run `pnpm run build` from repo root via Turbo; confirm `@repo/db#db:generate` runs before `api#build` in the task graph
- [ ] T025 [P] Run `pnpm run check-types` from repo root; confirm zero errors across all packages
- [ ] T026 [P] Run `pnpm run lint` from repo root; confirm zero new lint violations
- [ ] T027 Confirm `pnpm --filter @repo/db db:migrate` can reach the database and runs migration commands (requires local Docker infra running)
- [ ] T028 Confirm `turbo run dev` starts without requiring any manual generation step

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (needs `packages/db/src/index.ts` from T011)
- **Phase 5 (US3)**: Depends on Phase 4 (singleton must be in place before verifying reusability)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **US1 (P1)**: Can start once Phase 2 is done
- **US2 (P1)**: Depends on US1 completion (T011 must exist before T015–T016 update it)
- **US3 (P2)**: Depends on US2 completion

### Within Each Phase

- Tasks marked [P] within the same phase can run in parallel
- T004/T005/T006 in Phase 2 are independent file moves — T005 and T006 are [P] with each other; T004 can also run in parallel

---

## Parallel Opportunities

### Phase 2 Parallel Group

```
T004 — move schema.prisma + update output path
T005 — move prisma.config.ts                   [P with T004]
T006 — move migrations/                        [P with T004, T005]
```

### Phase 6 Parallel Group

```
T025 — check-types                             [P]
T026 — lint                                    [P with T025]
```

---

## Implementation Strategy

### MVP (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: US1 — types importable from `@repo/db`
4. Complete Phase 4: US2 — singleton client in place, `apps/api` clean
5. **STOP and VALIDATE**: `pnpm run build && pnpm run check-types` both pass
6. US3 and Polish are low-risk and can follow immediately

### Task Count Summary

| Phase                 | Tasks  | Parallelizable                           |
| --------------------- | ------ | ---------------------------------------- |
| Phase 1: Setup        | 3      | 0                                        |
| Phase 2: Foundational | 7      | 3 (T005, T006, and T004 with each other) |
| Phase 3: US1          | 4      | 0                                        |
| Phase 4: US2          | 7      | 0                                        |
| Phase 5: US3          | 2      | 0                                        |
| Phase 6: Polish       | 5      | 2 (T025, T026)                           |
| **Total**             | **28** | **5**                                    |
