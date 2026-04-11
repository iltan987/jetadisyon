# Tasks: Infrastructure Scaffolding

**Feature**: `002-infra-scaffold`
**Input**: Design documents from `/specs/002-infra-scaffold/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story for independent implementation and testing. Tests are not explicitly requested in this feature spec — no TDD tasks are included. Placeholder tests in US1 are implementation tasks fulfilling FR-002 (not test-driven development).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete task dependencies)
- **[Story]**: Which user story this task belongs to (US1–US7)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

**Purpose**: Turbo pipeline configuration so new workspace packages participate in the correct build graph

- [ ] T001 Update `turbo.json` to confirm the `build`, `check-types`, `lint`, and `test` pipeline tasks all include `"dependsOn": ["^build"]` (or `"^check-types"` for type-check tasks) so `packages/types` and `packages/i18n` are built before their consuming apps

---

## Phase 2: Foundational (Blocking Prerequisites)

> No hard foundational prerequisites for this feature — all user stories are independent and can begin in parallel after Phase 1 completes. Turbo auto-discovers new workspace packages from the `packages/*` glob already declared in `pnpm-workspace.yaml`.

**Checkpoint**: T001 complete → all user stories can proceed in parallel

---

## Phase 3: User Story 1 — Frontend Test Infrastructure (Priority: P1) 🎯 MVP

**Goal**: Configure Vitest in `apps/admin`, `apps/desktop`, and `packages/ui` so each discovers and runs tests independently; wire into the monorepo-wide `pnpm test` command via Turbo

**Independent Test**: Navigate to any of the three packages and run `pnpm test` — the test runner starts, discovers the placeholder test, and reports pass (FR-002, SC-001)

### Add Vitest dependencies and test scripts

- [ ] T002 [P] [US1] Add `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` to devDependencies and add `"test": "vitest run"` script in `apps/admin/package.json`
- [ ] T003 [P] [US1] Add `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` to devDependencies and add `"test": "vitest run"` script in `apps/desktop/package.json`
- [ ] T004 [P] [US1] Add `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` to devDependencies and add `"test": "vitest run"` script in `packages/ui/package.json`

### Create Vitest configuration files

- [ ] T005 [P] [US1] Create `apps/admin/vitest.config.ts` using `mergeConfig` from `vitest/config` to extend the existing `vite.config.ts`, with `test.environment: 'jsdom'` and coverage reporter configuration
- [ ] T006 [P] [US1] Create `apps/desktop/vitest.config.ts` using `mergeConfig` from `vitest/config` to extend the existing `vite.config.ts`, with `test.environment: 'jsdom'` and coverage reporter configuration
- [ ] T007 [P] [US1] Create `packages/ui/vitest.config.ts` as a standalone config (no vite.config.ts in this package) with `@vitejs/plugin-react`, `test.environment: 'jsdom'`, and coverage reporter configuration

### Create placeholder tests

- [ ] T008 [P] [US1] Create `apps/admin/src/app.test.tsx` with a single passing trivial assertion (`expect(true).toBe(true)`) to verify the test runner is wired and discoverable
- [ ] T009 [P] [US1] Create `apps/desktop/src/app.test.tsx` with a single passing trivial assertion to verify the test runner is wired and discoverable
- [ ] T010 [P] [US1] Create `packages/ui/src/index.test.ts` with a single passing trivial assertion to verify the test runner is wired and discoverable

**Checkpoint**: `pnpm test` from repo root executes tests in all three packages and reports 3 passing tests (SC-001)

---

## Phase 4: User Story 2 — Shared Type Contracts (Priority: P1)

**Goal**: Create `packages/types` workspace package exporting `ResponseCode` string enum and `ApiResponse<T>` interface; add it as a dependency in all three apps so TypeScript enforces the shared contract at compile time

**Independent Test**: Import `ResponseCode` from `@repo/types` in any app — TypeScript autocompletes all 9 enum values; modifying an enum value in the package surfaces errors in all consumers without manual intervention (SC-002)

### Create packages/types package files

- [ ] T011 [P] [US2] Create `packages/types/package.json` with name `@repo/types`, `"private": true`, `"main": "./src/index.ts"`, `"types": "./src/index.ts"`, and scripts `"build": "tsc"`, `"check-types": "tsc --noEmit"` (no runtime dependencies)
- [ ] T012 [P] [US2] Create `packages/types/tsconfig.json` extending `../../packages/typescript-config/base.json` with `"include": ["src"]`
- [ ] T013 [P] [US2] Create `packages/types/src/response-codes.ts` with exported `ResponseCode` string enum — 9 values with string value matching enum key: `SUCCESS`, `CREATED`, `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR`, `FEATURE_NOT_IMPLEMENTED` (per data-model.md §2)
- [ ] T014 [P] [US2] Create `packages/types/src/api-response.ts` with exported `ApiResponse<T = undefined>` interface: `code: ResponseCode` (required), `message: string` (required), `data?: T` (optional on success only) — per contracts/api-response.md
- [ ] T015 [US2] Create `packages/types/src/index.ts` as barrel export re-exporting `ResponseCode` from `./response-codes` and `ApiResponse` from `./api-response` (requires T013, T014)

### Wire @repo/types into consuming packages

- [ ] T016 [US2] Add `"@repo/types": "workspace:*"` to `dependencies` in `apps/api/package.json`, `apps/admin/package.json`, and `apps/desktop/package.json`

**Checkpoint**: `pnpm check-types` from repo root compiles `packages/types` and all three apps without type errors

---

## Phase 5: User Story 3 — Centralized i18n Package (Priority: P2)

**Goal**: Create `packages/i18n` workspace package with i18next configured for Turkish (default) and TypeScript module augmentation for compile-time translation key safety

**Independent Test**: Import `useTranslation` from `@repo/i18n` in a component — TypeScript autocompletes valid keys from `tr.json`; using an undefined key like `t('nonexistent.key')` produces a compile error (FR-008)

### Create packages/i18n package files

- [ ] T017 [P] [US3] Create `packages/i18n/package.json` with name `@repo/i18n`, `"private": true`, runtime dependencies `i18next` and `react-i18next`, devDependency `@types/react`, and scripts `"build": "tsc"`, `"check-types": "tsc --noEmit"`
- [ ] T018 [P] [US3] Create `packages/i18n/tsconfig.json` extending `../../packages/typescript-config/react-library.json` with `"resolveJsonModule": true` in compilerOptions and `"include": ["src"]`
- [ ] T019 [P] [US3] Create `packages/i18n/src/locales/tr.json` with Turkish translations for all three namespaces defined in data-model.md §3: `api.*` (9 keys, one per `ResponseCode` value), `common.*` (save, cancel, confirm, error, loading), `error.*` (required_field, invalid_format)
- [ ] T020 [P] [US3] Create `packages/i18n/src/init.ts` exporting `initI18n()` function that calls `i18next.init()` with `lng: 'tr'`, `fallbackLng: 'tr'`, `interpolation: { escapeValue: false }`, and `resources: { tr: { translation: trJson } }` (imports `tr.json`)
- [ ] T021 [US3] Create `packages/i18n/src/types.ts` with TypeScript `declare module 'i18next'` augmentation: `interface CustomTypeOptions { defaultNS: 'translation'; resources: { translation: typeof import('./locales/tr.json') } }` — all keys from `tr.json` become compile-time checked (requires T019)
- [ ] T022 [US3] Create `packages/i18n/src/index.ts` barrel export re-exporting `useTranslation` from `react-i18next`, `initI18n` from `./init`, and `type TranslationKey` derived as `Parameters<ReturnType<typeof useTranslation>['t']>[0]` (requires T020, T021)

### Wire @repo/i18n into consuming apps

- [ ] T023 [US3] Add `"@repo/i18n": "workspace:*"` to `dependencies` in `apps/admin/package.json` and `apps/desktop/package.json`

**Checkpoint**: `pnpm check-types` resolves `@repo/i18n` without errors; using an undefined translation key in a consuming file produces a TypeScript compile error

---

## Phase 6: User Story 4 — Environment Variable Validation (Priority: P2)

**Goal**: Add zod-based env schema and `.env.example` to each app so missing or malformed required variables cause an immediate, named error at startup — no silent degradation

**Independent Test**: Start any app with a required env variable removed — the process exits within 3 seconds with an error message naming the specific missing variable (SC-004, FR-012)

### Create .env.example files

- [ ] T024 [P] [US4] Create `apps/api/.env.example` documenting three variables with inline comments: `DATABASE_URL` (PostgreSQL connection string, example: `postgres://postgres:postgres@localhost:5432/jetadisyon`), `PORT` (default: `3000`), `NODE_ENV` (enum: `development`/`production`/`test`, default: `development`)
- [ ] T025 [P] [US4] Create `apps/admin/.env.example` documenting two variables with inline comments: `VITE_API_URL` (example: `http://localhost:3000`) and `VITE_APP_ENV` (enum: `development`/`production`, default: `development`)
- [ ] T026 [P] [US4] Create `apps/desktop/.env.example` documenting one variable with an inline comment: `VITE_API_URL` (example: `http://localhost:3000`)

### Create env validation modules

- [ ] T027 [P] [US4] Create `apps/api/src/config/env.ts` with zod schema `ApiEnvSchema` (`DATABASE_URL: z.string().url()`, `PORT: z.coerce.number().default(3000)`, `NODE_ENV: z.enum(['development','production','test']).default('development')`) and exported `validateEnv()` that parses `process.env`, prints a formatted field-by-field error on failure, and throws
- [ ] T028 [P] [US4] Create `apps/admin/src/env.ts` with zod schema for `AdminEnv` (`VITE_API_URL: z.string().url()`, `VITE_APP_ENV: z.enum(['development','production']).default('development')`) validated against `import.meta.env`; throw with named field on failure
- [ ] T029 [P] [US4] Create `apps/desktop/src/env.ts` with zod schema for `DesktopEnv` (`VITE_API_URL: z.string().url()`) validated against `import.meta.env`; throw with named field on failure

### Wire validation at startup

- [ ] T030 [US4] Update `apps/api/src/main.ts` to call `validateEnv()` from `./config/env` as the very first line before `NestFactory.create()`, ensuring invalid configuration causes immediate process exit (requires T027)

**Checkpoint**: Start the API with `DATABASE_URL` unset → process exits immediately with a clear error naming `DATABASE_URL` as the missing variable

---

## Phase 7: User Story 6 — Local Development Infrastructure (Priority: P2)

**Goal**: Define all backing services (PostgreSQL) in a single `docker-compose.yml`; add root npm scripts so any developer with a container runtime can start and stop infrastructure with one command

**Independent Test**: Run `pnpm dev:infra` → `docker compose ps` shows `postgres` service as healthy within 60 seconds; `pnpm dev:infra:stop` cleanly shuts it down (SC-003)

- [ ] T031 [US6] Create `docker-compose.yml` at repo root with a `postgres` service: image `postgres:17-alpine`, environment `POSTGRES_USER: postgres`, `POSTGRES_PASSWORD: postgres`, `POSTGRES_DB: jetadisyon`, port mapping `5432:5432`, named volume `postgres_data` for persistence between restarts, and `pg_isready` health check
- [ ] T032 [US6] Add `"dev:infra": "docker compose up -d"` and `"dev:infra:stop": "docker compose down"` scripts to root `package.json`

**Checkpoint**: `pnpm dev:infra` starts a healthy PostgreSQL container; `pnpm dev:infra:stop` stops it cleanly with data volume preserved

---

## Phase 8: User Story 5 — Database Layer for API (Priority: P2)

**Goal**: Install Prisma v7.x in `apps/api`, configure `schema.prisma` for PostgreSQL with generated output to `./generated/prisma`, implement `PrismaService` using the `PrismaPg` adapter pattern, and register it in `AppModule`

**Independent Test**: With Docker Compose running (`pnpm dev:infra`), start the API in dev mode — logs show a successful database connection; run `pnpm --filter api db:migrate` — the migration history is initialized with an empty baseline

**Prerequisite**: Phase 7 (US6) must be complete — the `docker-compose.yml` is needed to test database connectivity locally

### Add Prisma dependencies and CLI scripts

- [ ] T033 [US5] Update `apps/api/package.json`: add `prisma` and `@prisma/adapter-pg` to devDependencies, `@prisma/client` to dependencies; add scripts `"db:migrate": "prisma migrate dev"`, `"db:studio": "prisma studio"`, `"db:generate": "prisma generate"`, `"db:seed": "prisma db seed"`

### Configure Prisma schema

- [ ] T034 [US5] Create `apps/api/prisma/schema.prisma` with `datasource db` (provider: `"postgresql"`, url: `env("DATABASE_URL")`) and `generator client` (provider: `"prisma-client-js"`, output: `"../generated/prisma"`) — Prisma v7.x outputs to a local path, NOT `node_modules/@prisma/client` (per research.md §Decision 2)

### Implement PrismaService

- [ ] T035 [US5] Create `apps/api/src/database/prisma.service.ts` as an `@Injectable()` class extending `PrismaClient` (imported from `../generated/prisma`): constructor instantiates `new PrismaPg({ connectionString: process.env.DATABASE_URL })` (from `@prisma/adapter-pg`) then calls `super({ adapter })` — the official Prisma v7.x NestJS integration pattern; no `onModuleInit` / `$connect()` needed

### Register in AppModule

- [ ] T036 [US5] Add `PrismaService` to the `providers` array in `apps/api/src/app.module.ts` so it is available for injection across the application

### Finalize Prisma setup

- [ ] T037 [US5] Add `generated/` to `apps/api/.gitignore` to exclude the generated Prisma client directory from version control
- [ ] T038 [US5] Run `pnpm install` in repo root then `pnpm --filter api db:generate` to verify `apps/api/generated/prisma/` is created and the Prisma client builds from `schema.prisma` without errors (requires T033, T034)

**Checkpoint**: `pnpm check-types --filter api` passes; `pnpm --filter api db:migrate` with Docker running creates the migrations directory and initializes migration history

---

## Phase 9: User Story 7 — CI/CD Pipeline (Priority: P3)

**Goal**: Create `.github/workflows/ci.yml` that automatically runs build, lint, check-types, and test on every PR and every push to `main`, using Turbo remote caching so unchanged packages are not rebuilt (SC-006)

**Independent Test**: Open a PR with a deliberate type error — CI fails within 5 minutes and blocks merge (SC-005); fix the error — CI passes and merge is unblocked

- [ ] T039 [US7] Create `.github/workflows/ci.yml`: trigger on `pull_request` (all branches) and `push` to `main`; steps: `actions/checkout@v4`, `pnpm/action-setup` (pnpm v10), `actions/setup-node@v4` (Node 20 with pnpm cache), `actions/cache@v4` for pnpm store (key: `${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}`), `pnpm install --frozen-lockfile`, `pnpm turbo build lint check-types test` with env vars `TURBO_TOKEN` and `TURBO_TEAM` for Vercel Remote Cache

**Checkpoint**: The workflow file is valid YAML; the first PR opened after merge triggers all four Turbo tasks and reports pass/fail status on the PR

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final integration validation — confirm all pieces resolve together and the monorepo-wide commands work end-to-end

- [ ] T040 Run `pnpm install` from repo root to resolve all new workspace dependencies and regenerate `pnpm-lock.yaml` with new packages
- [ ] T041 [P] Run `pnpm check-types` from repo root; resolve any TypeScript errors surfaced across all packages (packages/types, packages/i18n, apps/\*)
- [ ] T042 [P] Run `pnpm test` from repo root; verify all placeholder tests pass in `apps/admin`, `apps/desktop`, and `packages/ui`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1, US2 (Phases 3–4)**: Depend on Phase 1 — can start in parallel after T001
- **US3, US4, US6 (Phases 5–7)**: No cross-story dependencies — can start concurrently with US1/US2
- **US5 (Phase 8)**: Soft dependency on US6 — Docker Compose must exist to test database connectivity locally
- **US7 (Phase 9)**: Logically last — the CI pipeline validates all other stories; implement after all others are working
- **Polish (Phase 10)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 1
- **US2 (P1)**: Independent after Phase 1
- **US3 (P2)**: Independent; `api.*` keys align with `ResponseCode` values — implement after US2 for consistency
- **US4 (P2)**: Independent — no story dependencies
- **US5 (P2)**: Soft dependency on US6 (Docker Compose needed for local testing)
- **US6 (P2)**: Independent — pure file creation
- **US7 (P3)**: Logically depends on all others — CI must execute valid checks

### Within Each User Story

- `package.json` declarations before config files that import the new packages
- Constituent source files before barrel exports (`index.ts`)
- Service/module implementation before AppModule wiring
- Foundational packages (`packages/types`, `packages/i18n`) before consumer apps where there is a dependency

### Parallel Opportunities

- **T002, T003, T004**: All three `package.json` updates (different files, different packages)
- **T005, T006, T007**: All three `vitest.config.ts` files (different files)
- **T008, T009, T010**: All three placeholder tests (different files)
- **T011–T014**: All four `packages/types` creation tasks (different files in same package)
- **T017–T020**: All four `packages/i18n` creation tasks (different files in same package)
- **T024–T029**: All six `.env.example` and `env.ts` files (different files across different apps)
- **T031, T032**: `docker-compose.yml` + root `package.json` scripts (different files)
- **T041, T042**: `check-types` and `test` validations (read-only verification)

---

## Parallel Example: User Story 1

```bash
# Wave 1 — package.json updates (all in parallel, different files):
Task T002: apps/admin/package.json
Task T003: apps/desktop/package.json
Task T004: packages/ui/package.json

# Wave 2 — vitest configs (all in parallel, different files):
Task T005: apps/admin/vitest.config.ts
Task T006: apps/desktop/vitest.config.ts
Task T007: packages/ui/vitest.config.ts

# Wave 3 — placeholder tests (all in parallel, different files):
Task T008: apps/admin/src/app.test.tsx
Task T009: apps/desktop/src/app.test.tsx
Task T010: packages/ui/src/index.test.ts
```

## Parallel Example: User Story 2

```bash
# Wave 1 — packages/types source files (all in parallel):
Task T011: packages/types/package.json
Task T012: packages/types/tsconfig.json
Task T013: packages/types/src/response-codes.ts
Task T014: packages/types/src/api-response.ts

# Wave 2 — barrel export + consumer wiring (sequential after Wave 1):
Task T015: packages/types/src/index.ts
Task T016: add @repo/types to apps/*/package.json
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 3: US1 — Frontend Test Infrastructure (T002–T010)
3. Complete Phase 4: US2 — Shared Type Contracts (T011–T016)
4. **STOP and VALIDATE**: `pnpm test` passes; `pnpm check-types` passes
5. Demo: All frontend packages have working test runners; all apps share typed response codes

### Incremental Delivery

1. Setup + US1 + US2 → MVP: test infrastructure and shared types
2. US6 (Docker Compose) → US5 (Database): API has a working database layer
3. US3 (i18n) + US4 (Env Validation): Apps fail-fast on bad config; i18n is ready
4. US7 (CI): Automated quality gate enforces all of the above on every PR
5. Polish: Integration validation across the full monorepo

### Parallel Team Strategy

With multiple developers after Phase 1 (T001):

- Developer A: US1 (T002–T010) — Vitest in all three packages
- Developer B: US2 (T011–T016) + US3 (T017–T023) — shared packages/types and packages/i18n
- Developer C: US4 (T024–T030) + US6 (T031–T032) + US5 (T033–T038) — env validation, Docker, database
- All converge: US7 (T039) + Polish (T040–T042)

---

## Notes

- [P] tasks touch different files and have no dependency on incomplete tasks — safe to execute concurrently
- [Story] labels map every implementation task to a specific user story for traceability
- No TDD tasks — placeholder tests in US1 are infrastructure verification, not business-logic tests
- Run `pnpm install` at repo root after any `package.json` change before running scripts in that package
- **Prisma v7.x pattern**: generated client output is `./generated/prisma` (not `node_modules/@prisma/client`); `PrismaService` uses the `PrismaPg` adapter in the constructor; `onModuleInit` / `$connect()` is not needed — see research.md §Decision 2
- **Response code extension rule** (constitution §VI): adding any `ResponseCode` after this feature requires a simultaneous update to `packages/types/src/response-codes.ts` AND `packages/i18n/src/locales/tr.json` in the same commit
- `DATABASE_URL` is the only sensitive variable — all other env vars may be committed in `.env.example` with real example values
- `VITE_*` prefix is required for Vite to expose variables to the browser bundle; the API uses `process.env` directly
