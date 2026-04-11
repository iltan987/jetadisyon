# Tasks: Infrastructure Scaffolding

**Input**: Design documents from `/specs/002-infra-scaffold/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: No TDD tasks — placeholder tests in US1 are implementation tasks fulfilling FR-002 (acceptance criteria, not test-driven development).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US7)
- Exact file paths are included in every task description

---

## Phase 1: Setup — New Package Scaffolding

**Purpose**: Create the skeleton package manifests and tsconfigs for the three new workspace packages (`packages/vite-config`, `packages/types`, `packages/i18n`). No source implementation yet — just the package identity files that pnpm and Turbo need to recognize each package.

- [ ] T001 Create packages/vite-config/package.json: name @repo/vite-config, private: true, type: module, devDependencies for vitest and @vitejs/plugin-react, exports field mapping ./vitest.shared.ts
- [ ] T002 [P] Create packages/types/package.json: name @repo/types, private: true, type: module, no runtime dependencies, exports field mapping ./src/index.ts
- [ ] T003 [P] Create packages/i18n/package.json: name @repo/i18n, private: true, type: module, dependencies i18next and react-i18next, exports field mapping ./src/index.ts
- [ ] T004 Create packages/vite-config/tsconfig.json extending @repo/typescript-config/base.json with include: [vitest.shared.ts]
- [ ] T005 [P] Create packages/types/tsconfig.json extending @repo/typescript-config/base.json with include: [src/**]
- [ ] T006 [P] Create packages/i18n/tsconfig.json extending @repo/typescript-config/react-library.json with resolveJsonModule: true and include: [src/**]

---

## Phase 2: Foundational — Workspace Integration

**Purpose**: Declare the new packages as workspace dependencies in all consumer apps and update global config. Until workspace links exist, no `@repo/*` import in any user story will resolve.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Update apps/admin/package.json: add @repo/vite-config (devDependency workspace:_), @repo/types (devDependency workspace:_), @repo/i18n (dependency workspace:\*), zod (dependency — for env validation in US4)
- [ ] T008 [P] Update apps/desktop/package.json: add @repo/vite-config (devDependency workspace:_), @repo/types (devDependency workspace:_), @repo/i18n (dependency workspace:\*), zod (dependency — for env validation in US4)
- [ ] T009 [P] Update apps/api/package.json: add @repo/types (dependency workspace:\*), zod (dependency — for env validation in US4)
- [ ] T010 [P] Update packages/ui/package.json: add @repo/vite-config (devDependency workspace:\*)
- [ ] T011 Update turbo.json globalEnv array to include DATABASE_URL (required for Prisma client generation) — note: build graph ordering for new packages is satisfied by the workspace:\* declarations in T007–T010; no changes to the turbo.json pipeline task section are needed (Turbo v2 derives order from the pnpm package graph)
- [ ] T012 [P] Add "test": "turbo run test" script to root package.json (SC-001 requires monorepo-wide test command)

**Checkpoint**: Foundation ready — all workspace dependency links are declared. User story implementation can begin.

---

## Phase 3: User Story 1 — Frontend Test Infrastructure (Priority: P1) 🎯 MVP

**Goal**: Stand up Vitest in `apps/admin`, `apps/desktop`, and `packages/ui` using a shared base config from `packages/vite-config`; add placeholder tests to each; verify monorepo-wide `pnpm test` discovers all suites.

**Independent Test**: Run `pnpm --filter admin test`, `pnpm --filter desktop test`, and `pnpm --filter @repo/ui test` — each exits 0 with at least one passing test (FR-002, SC-001).

- [ ] T013 [US1] Implement packages/vite-config/vitest.shared.ts: export a base Vitest defineConfig with test.environment jsdom, coverage provider v8, and @vitejs/plugin-react as a plugin — this is the single shared config imported by all three frontend packages (FR-020)
- [ ] T014 [US1] Create apps/admin/vitest.config.ts: import shared config from @repo/vite-config/vitest.shared and apply mergeConfig + defineProject with admin-specific coverage include (src/\*\*); add vitest, @vitest/coverage-v8, and @testing-library/react devDependencies to apps/admin/package.json; add "test": "vitest run" script
- [ ] T015 [P] [US1] Create apps/desktop/vitest.config.ts: import shared config from @repo/vite-config/vitest.shared and apply mergeConfig + defineProject with desktop-specific coverage include; add vitest, @vitest/coverage-v8, and @testing-library/react devDependencies to apps/desktop/package.json; add "test": "vitest run" script
- [ ] T016 [P] [US1] Create packages/ui/vitest.config.ts: import shared config from @repo/vite-config/vitest.shared and apply mergeConfig + defineProject with ui-specific coverage include; add vitest, @vitest/coverage-v8, and @testing-library/react devDependencies to packages/ui/package.json; add "test": "vitest run" script
- [ ] T017 [US1] Create apps/admin/src/**tests**/placeholder.test.ts with a single passing test: expect(1 + 1).toBe(2)
- [ ] T018 [P] [US1] Create apps/desktop/src/**tests**/placeholder.test.ts with a single passing test: expect(1 + 1).toBe(2)
- [ ] T019 [P] [US1] Create packages/ui/src/**tests**/placeholder.test.ts with a single passing test: expect(1 + 1).toBe(2)

**Checkpoint**: `pnpm test` from repo root discovers and runs tests in apps/admin, apps/desktop, packages/ui, and apps/api — all pass with zero failures (SC-001).

---

## Phase 4: User Story 2 — Shared Type Contracts (Priority: P1) 🎯 MVP

**Goal**: Create `packages/types` exporting `ResponseCode` string enum and `ApiResponse<T>` interface as the single source of truth for API contracts; TypeScript enforces the contract in all consuming packages at compile time.

**Independent Test**: Import `ResponseCode` from `@repo/types` in both apps/api and apps/admin; run `pnpm check-types` — TypeScript autocompletes all 9 codes and surfaces errors in all consumers if an enum value changes (SC-002).

- [ ] T020 [US2] Create packages/types/src/response-codes.ts: export ResponseCode string enum with 9 values (value equals name): SUCCESS, CREATED, VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INTERNAL_ERROR, FEATURE_NOT_IMPLEMENTED (per data-model.md §2 and contracts/api-response.md)
- [ ] T021 [P] [US2] Create packages/types/src/api-response.ts: export interface ApiResponse<T = undefined> with fields code: ResponseCode (required), message: string (required), data?: T (optional, present on success only) — per contracts/api-response.md envelope shape
- [ ] T022 [US2] Create packages/types/src/index.ts: barrel export re-exporting ResponseCode from ./response-codes and ApiResponse from ./api-response (requires T020, T021)

**Checkpoint**: `pnpm check-types` from repo root resolves @repo/types imports without errors in apps/api, apps/admin, and apps/desktop.

---

## Phase 5: User Story 3 — Centralized i18n Package (Priority: P2)

**Goal**: Create `packages/i18n` with i18next configured for Turkish as the sole required locale and TypeScript module augmentation so using an undefined translation key is a compile error.

**Independent Test**: Import `useTranslation` from `@repo/i18n` and call `t('api.SUCCESS')` — TypeScript autocompletes valid keys; `t('nonexistent.key')` produces a compile error (FR-007, FR-008).

- [ ] T023 [US3] Create packages/i18n/src/locales/tr.json: initial Turkish translation catalog per data-model.md §3 — api namespace (9 keys matching ResponseCode values exactly: SUCCESS, CREATED, VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INTERNAL_ERROR, FEATURE_NOT_IMPLEMENTED with Turkish values), common namespace (save, cancel, confirm, error, loading), error namespace (required_field, invalid_format)
- [ ] T024 [US3] Create packages/i18n/src/types.ts: TypeScript module augmentation — declare module 'i18next' setting interface CustomTypeOptions { defaultNS: 'translation'; resources: { translation: typeof import('./locales/tr.json') } } — derives all valid keys from tr.json at compile time (FR-008)
- [ ] T025 [US3] Create packages/i18n/src/init.ts: export function initI18n() calling i18next.init with lng: 'tr', fallbackLng: 'tr', interpolation: { escapeValue: false }, and resources: { tr: { translation: trLocale } } importing from ./locales/tr.json (FR-009 — adding a locale requires only adding a JSON file and one import here)
- [ ] T026 [US3] Create packages/i18n/src/index.ts: barrel export re-exporting useTranslation from react-i18next, initI18n from ./init, and type TranslationKey as Parameters<ReturnType<typeof useTranslation>['t']>[0] (requires T023, T024, T025)

**Checkpoint**: `pnpm check-types` resolves @repo/i18n imports; using `t('api.DOES_NOT_EXIST')` in a consuming file produces a TypeScript compile error.

---

## Phase 6: User Story 4 — Environment Variable Validation (Priority: P2)

**Goal**: Add zod-based env schemas to all three apps so any missing or malformed required variable causes an immediate, named startup failure; document all variables in `.env.example` (FR-010, FR-011, FR-012).

**Independent Test**: Start any app with a required env variable removed — process exits within 3 seconds with a clear error naming the specific missing variable (SC-004).

- [ ] T027 [US4] Create apps/api/.env.example: document DATABASE_URL (example: postgres://postgres:postgres@localhost:5432/jetadisyon), PORT (default: 3000), NODE_ENV (enum: development/production/test, default: development) with inline comments per data-model.md §4
- [ ] T028 [P] [US4] Create apps/admin/.env.example: document VITE_API_URL (example: http://localhost:3000) and VITE_APP_ENV (enum: development/production, default: development) with inline comments
- [ ] T029 [P] [US4] Create apps/desktop/.env.example: document VITE_API_URL (example: http://localhost:3000) with inline comment
- [ ] T030 [US4] Create apps/api/src/config/env.ts: zod schema ApiEnvSchema with DATABASE_URL: z.string().url(), PORT: z.coerce.number().default(3000), NODE_ENV: z.enum(['development','production','test']).default('development'); export validateEnv() that parses process.env, prints a field-by-field error list on failure, and calls process.exit(1)
- [ ] T031 [P] [US4] Create apps/admin/src/env.ts: zod schema for AdminEnv (VITE_API_URL: z.string().url(), VITE_APP_ENV: z.enum(['development','production']).default('development')) validated against import.meta.env at module top-level; on failure, log a field-by-field error list to console.error then throw a descriptive Error naming the invalid field — the throw prevents the app from mounting (no UI rendered)
- [ ] T032 [P] [US4] Create apps/desktop/src/env.ts: zod schema for DesktopEnv (VITE_API_URL: z.string().url()) validated against import.meta.env at module top-level; on failure, log a field-by-field error list to console.error then throw a descriptive Error naming the invalid field — the throw prevents the app from mounting (no UI rendered)
- [ ] T033 [US4] Update apps/api/src/main.ts to call validateEnv() from ./config/env as the very first statement before NestFactory.create() so invalid configuration causes immediate process exit (requires T030)

**Checkpoint**: Unsetting DATABASE_URL and starting the API exits immediately with a message identifying DATABASE_URL as the cause.

---

## Phase 7: User Story 6 — Local Development Infrastructure (Priority: P2)

**Goal**: Define all backing services in `docker-compose.yml` at repo root; wire start/stop into root npm scripts so any developer with a container runtime can get PostgreSQL running with one command.

**Independent Test**: Run `pnpm dev:infra` — `docker compose ps` shows postgres service healthy within 60 seconds; `pnpm dev:infra:stop` shuts it down cleanly with data preserved (SC-003).

- [ ] T034 [US6] Create docker-compose.yml at repo root: postgres service using image postgres:17-alpine, environment POSTGRES_USER=postgres / POSTGRES_PASSWORD=postgres / POSTGRES_DB=jetadisyon, port mapping 5432:5432, named volume jetadisyon_pgdata for persistence, and pg_isready healthcheck
- [ ] T035 [US6] Add dev:infra (docker compose up -d) and dev:infra:stop (docker compose down) scripts to root package.json
- [ ] T036 [P] [US6] Update root .gitignore: exclude apps/\*\*/.env (sensitive local secrets) while keeping .env.example committed; add apps/api/generated/ to prevent the Prisma generated client from being committed

**Checkpoint**: `pnpm dev:infra` starts a healthy PostgreSQL container; `pnpm dev:infra:stop` preserves data in the named volume.

---

## Phase 8: User Story 5 — Database Layer for API (Priority: P2)

**Goal**: Install Prisma v7.x in `apps/api`, configure `schema.prisma` to output the generated client to `./generated/prisma` (v7.x pattern), implement `PrismaService` with the `PrismaPg` adapter, and register it in `AppModule`.

**Independent Test**: With `pnpm dev:infra` running, start the API — logs show a successful database connection; `pnpm --filter api db:migrate` initializes migration history with no errors (US5 acceptance scenario 1 and 2).

**Prerequisite**: Phase 7 (US6) must be complete — Docker Compose is needed to run Prisma migrations locally.

- [ ] T037 [US5] Update apps/api/package.json: add prisma (devDependency), @prisma/client and @prisma/adapter-pg (dependencies); add CLI scripts db:migrate (prisma migrate dev), db:generate (prisma generate), db:studio (prisma studio), db:seed (prisma db seed) per quickstart.md
- [ ] T038 [US5] Create apps/api/prisma/schema.prisma: datasource db with provider "postgresql" and url env("DATABASE_URL"); generator client with provider "prisma-client-js" and output "../generated/prisma" — v7.x writes to a local path, NOT node_modules/@prisma/client (research.md §Decision 2)
- [ ] T039 [US5] Create apps/api/src/database/prisma.service.ts: @Injectable() class PrismaService extends PrismaClient (imported from ../../generated/prisma); constructor instantiates new PrismaPg({ connectionString: process.env.DATABASE_URL }) (from @prisma/adapter-pg) then calls super({ adapter }) — official v7.x pattern; no onModuleInit / $connect() needed
- [ ] T040 [US5] Register PrismaService in apps/api/src/app.module.ts providers array — direct registration, no separate PrismaModule wrapper (official Prisma v7.x + NestJS recipe; plan.md §Source Code)
- [ ] T041 [P] [US5] Add pg to apps/api/package.json dependencies (required at runtime by @prisma/adapter-pg)
- [ ] T042 [US5] Run pnpm install then pnpm --filter api db:generate to produce apps/api/generated/prisma/ from schema.prisma and verify the generated client compiles without errors (requires T037, T038)

**Checkpoint**: `pnpm check-types --filter api` passes; `pnpm --filter api db:migrate` with Docker running initializes the migrations directory and records the baseline migration.

---

## Phase 9: User Story 7 — CI/CD Pipeline (Priority: P3)

**Goal**: Create `.github/workflows/ci.yml` that runs build, lint, check-types, and test across all packages on every PR and push to main, using Turbo remote caching so unchanged packages are skipped between runs.

**Independent Test**: Open a PR with a deliberate type error — CI blocks merge with the failing check visible within 5 minutes (SC-005); a second commit touching one package shows cache hit logs for all others (SC-006).

- [ ] T043 [US7] Create .github/workflows/ci.yml: trigger on pull_request (all branches) and push to main; single ci job on ubuntu-latest with steps: actions/checkout@v4, pnpm/action-setup (version from packageManager field), actions/setup-node@v4 (Node 20 with pnpm cache enabled), actions/cache@v4 for pnpm store (key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}), pnpm install --frozen-lockfile, pnpm turbo build lint check-types test
- [ ] T044 [US7] Add TURBO_TOKEN and TURBO_TEAM environment variables to the turbo step in ci.yml sourced from GitHub Actions secrets — enables Vercel Remote Cache so unchanged packages use cached results between CI runs (SC-006, FR-019) (requires T043)
- [ ] T049 [US7] Configure GitHub branch protection on `main`: require the `ci` status check to pass before merging; enable "Dismiss stale pull request approvals when new commits are pushed" — use `gh api repos/{owner}/{repo}/branches/main/protection` or the GitHub repository Settings → Branches UI; document the steps in quickstart.md (FR-018, SC-005)

**Checkpoint**: First PR after merge triggers all four Turbo tasks and reports pass/fail (FR-017); after T049, the merge button is blocked when any check fails (FR-018).

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Integration sweep — confirm the full monorepo resolves, type-checks, and tests cleanly, and the quickstart onboarding flow works end to end.

- [ ] T045 Run pnpm install from repo root to regenerate pnpm-lock.yaml after all package.json changes across phases 1–9; verify no dependency conflicts
- [ ] T046 [P] Run pnpm check-types from repo root and resolve any TypeScript errors introduced by new source files — particularly verify @repo/types and @repo/i18n exports resolve correctly in all consumers (SC-002, SC-007)
- [ ] T047 [P] Run pnpm lint from repo root and fix any ESLint violations in new files (packages/vite-config, packages/types, packages/i18n, apps/api/src/config/, apps/api/src/database/, env.ts files); audit all new source files for inline response-code string literals — any file using a raw string where ResponseCode is expected violates FR-005 and must be updated to use the enum value
- [ ] T048 Verify the complete quickstart.md onboarding flow: pnpm install → copy .env.example files → pnpm dev:infra → pnpm --filter api db:migrate → pnpm build → pnpm check-types → pnpm test — all must exit 0 (SC-001, SC-003, SC-004, SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1, US2 (Phases 3–4, P1)**: Can start in parallel after Phase 2
- **US3, US4, US6 (Phases 5–7, P2)**: Can start in parallel after Phase 2; no cross-story dependencies among these three
- **US5 (Phase 8, P2)**: Depends on Phase 2 AND US6 — Docker Compose must exist to run Prisma migrations locally
- **US7 (Phase 9, P3)**: Logically last — CI must validate all other stories; implement after all others work
- **Polish (Phase 10)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2
- **US2 (P1)**: Independent after Phase 2
- **US3 (P2)**: Independent after Phase 2; implement after US2 for consistency (api.\* keys mirror ResponseCode values)
- **US4 (P2)**: Independent after Phase 2
- **US5 (P2)**: Soft dependency on US6 (needs Docker Compose to test Prisma connection locally)
- **US6 (P2)**: Independent after Phase 2 — pure file creation
- **US7 (P3)**: Logically depends on all others — CI must execute valid checks across the whole codebase

### Within Each User Story

- package.json / tsconfig.json before source files that import from the package
- Constituent source files before barrel export (index.ts)
- env.ts before startup wiring (main.ts)
- schema.prisma + dependencies before PrismaService implementation
- PrismaService before AppModule registration

### Parallel Opportunities

- **Phase 1**: T002, T003, T005, T006 in parallel (after T001/T004 respectively)
- **Phase 2**: T008, T009, T010 in parallel after T007; T012 in parallel with T011
- **Phase 3**: T015, T016 in parallel after T013 (same wave as T014); T018, T019 in parallel after T017
- **Phase 4**: T021 in parallel with T020
- **Phase 6**: T028, T029 in parallel after T027; T031, T032 in parallel after T030
- **Phase 8**: T041 in parallel with T039
- **Phase 9**: T043 → T044 → T049 sequentially (T043 creates ci.yml, T044 edits it, T049 configures branch protection)
- **Phase 10**: T046, T047 in parallel after T045

---

## Parallel Example: User Story 1

```bash
# T013 must complete first (shared vitest.shared.ts)
# Then wave 2 — all three vitest.config.ts files in parallel:
Task T014: apps/admin/vitest.config.ts + package.json
Task T015: apps/desktop/vitest.config.ts + package.json
Task T016: packages/ui/vitest.config.ts + package.json

# After T014 completes, wave 3 — all three placeholder tests in parallel:
Task T017: apps/admin/src/__tests__/placeholder.test.ts
Task T018: apps/desktop/src/__tests__/placeholder.test.ts
Task T019: packages/ui/src/__tests__/placeholder.test.ts
```

## Parallel Example: User Story 2

```bash
# Wave 1 — all four packages/types files in parallel (different files, same package):
Task T020: packages/types/src/response-codes.ts
Task T021: packages/types/src/api-response.ts

# Wave 2 — depends on wave 1:
Task T022: packages/types/src/index.ts (barrel, requires T020 + T021)
```

## Parallel Example: User Story 4 (Env Validation)

```bash
# Wave 1 — all three .env.example files in parallel:
Task T027: apps/api/.env.example
Task T028: apps/admin/.env.example
Task T029: apps/desktop/.env.example

# Wave 2 — all three env.ts schemas in parallel:
Task T030: apps/api/src/config/env.ts
Task T031: apps/admin/src/env.ts
Task T032: apps/desktop/src/env.ts

# Wave 3 — wiring (depends on T030):
Task T033: apps/api/src/main.ts (calls validateEnv)
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T012) — **critical gate**
3. Complete Phase 3: US1 — Frontend Test Infrastructure (T013–T019)
4. Complete Phase 4: US2 — Shared Type Contracts (T020–T022)
5. **STOP and VALIDATE**: `pnpm test` passes in all packages; `pnpm check-types` passes
6. MVP delivered: all frontend packages have test infrastructure; API and frontends share typed response contracts

### Incremental Delivery

1. Phase 1 + Phase 2 → workspace wired
2. US1 + US2 (P1, parallel) → test infra + shared types → **MVP validated**
3. US3 + US4 + US6 (P2, parallel) → i18n + env validation + Docker Compose
4. US5 (P2, after US6) → database layer wired
5. US7 (P3) → CI gates all of the above on every PR
6. Polish → integration sweep

### Parallel Team Strategy

With multiple developers after Phase 2:

- Developer A: US1 (T013–T019) — Vitest in three packages
- Developer B: US2 (T020–T022) + US3 (T023–T026) — shared types and i18n
- Developer C: US4 (T027–T033) + US6 (T034–T036) + US5 (T037–T042) — env validation, Docker, Prisma
- All converge: US7 (T043–T044, T049) + Polish (T045–T048)

---

## Notes

- [P] tasks touch different files with no dependency on incomplete tasks — safe to run concurrently
- [Story] label maps every task to a user story for traceability during implementation
- **packages/vite-config exports TypeScript source directly** (no build step) — same pattern as packages/typescript-config and packages/eslint-config; consumers must have @repo/vite-config as a devDependency
- **Prisma v7.x pattern**: generated client lives at ./generated/prisma (NOT node_modules/@prisma/client); PrismaService uses PrismaPg adapter in constructor; onModuleInit / $connect() is NOT needed — see research.md §Decision 2
- **zod is a direct dep of packages/ui** but must also be declared directly in each app that validates env vars (pnpm workspace strict isolation — transitive deps are not importable directly)
- **Response code extension rule** (constitution §VI): after this feature, adding any ResponseCode requires a simultaneous update to packages/types/src/response-codes.ts AND packages/i18n/src/locales/tr.json in the same commit
- **Translation key format**: namespace.identifier only (two levels max); api.\* keys use SCREAMING_SNAKE_CASE matching ResponseCode enum values exactly — per contracts/translation-keys.md
- **DATABASE_URL is the only sensitive variable** — all other env vars in .env.example may use real example values and be committed
- Run `pnpm install` from repo root after any package.json change before running scripts in that package
