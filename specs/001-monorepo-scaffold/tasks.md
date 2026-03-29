# Tasks: pnpm Monorepo Scaffold

**Input**: Design documents from `/specs/001-monorepo-scaffold/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not requested in spec — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on other in-flight tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Workspace Skeleton)

**Purpose**: Root-level config files and directory structure. No package-level work yet.
**Reference**: Configs cross-validated against `jetadisyon-shadcn/` and `jetadisyon-turborepo/` official examples at repo root.

- [ ] T001 Create directory tree: `packages/electron/src/`, `packages/backend/src/`, `packages/frontend/src/`, `packages/shared/src/`, `supabase/migrations/`; create empty `supabase/seed.sql`
- [ ] T002 Create `/pnpm-workspace.yaml`:
  ```yaml
  packages:
    - "packages/*"
  ```
- [ ] T003 Create `/package.json`:
  ```json
  {
    "name": "jetadisyon",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "build": "turbo build",
      "dev": "turbo dev"
    },
    "devDependencies": {
      "typescript": "5.9.3"
    },
    "packageManager": "pnpm@9.15.9",
    "engines": {
      "node": ">=20"
    }
  }
  ```
  Note: `build`/`dev` reference turbo as a placeholder — turbo is not installed yet. Scripts satisfy FR-010. Replace with actual commands in a later feature.
- [ ] T004 [P] Create `/tsconfig.json` — base config only, NO `module` or `moduleResolution` (each package overrides independently):
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "strict": true,
      "skipLibCheck": true,
      "esModuleInterop": true,
      "resolveJsonModule": true,
      "forceConsistentCasingInFileNames": true
    }
  }
  ```
- [ ] T005 [P] Create `/.env.example` — one comment line: `# Environment variables — copy to .env and fill in values`
- [ ] T006 [P] Create `/.npmrc` — empty file (pnpm workspace convention; both official examples include it)

---

## Phase 2: Foundational (Four Package Manifests)

**Purpose**: All four `package.json` files must exist before `pnpm install` can link the workspace. This phase is a hard prerequisite for US1.

**⚠️ CRITICAL**: No user story work can begin until all four package manifests exist.

- [ ] T007 [P] Create `packages/shared/package.json`:
  ```json
  {
    "name": "@jetadisyon/shared",
    "version": "0.1.0",
    "private": true,
    "main": "./src/index.ts",
    "types": "./src/index.ts",
    "exports": {
      ".": {
        "types": "./src/index.ts",
        "default": "./src/index.ts"
      }
    },
    "scripts": {
      "build": "tsc --noEmit",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
- [ ] T008 [P] Create `packages/electron/package.json`:
  ```json
  {
    "name": "@jetadisyon/electron",
    "version": "0.1.0",
    "private": true,
    "dependencies": {
      "@jetadisyon/shared": "workspace:*"
    },
    "scripts": {
      "build": "tsc --noEmit",
      "dev": "",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
- [ ] T009 [P] Create `packages/backend/package.json`:
  ```json
  {
    "name": "@jetadisyon/backend",
    "version": "0.1.0",
    "private": true,
    "dependencies": {
      "@jetadisyon/shared": "workspace:*"
    },
    "scripts": {
      "build": "tsc --noEmit",
      "dev": "",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
  Must NOT list `@jetadisyon/frontend` as a dependency (FR-009).
- [ ] T010 [P] Create `packages/frontend/package.json`:
  ```json
  {
    "name": "@jetadisyon/frontend",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "dependencies": {
      "@jetadisyon/shared": "workspace:*"
    },
    "scripts": {
      "build": "tsc --noEmit",
      "dev": "",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
  Must NOT list `@jetadisyon/backend` as a dependency (FR-009).

**Checkpoint**: All four package.json files exist — `pnpm install` can now be run.

---

## Phase 3: User Story 1 — Developer Bootstraps the Workspace (Priority: P1) 🎯 MVP

**Goal**: `pnpm install` from the repo root links all four packages as workspace members with no errors. Filter-targeted commands work.

**Independent Test**: `pnpm install` exits 0 → `pnpm ls -r` lists exactly four packages with workspace symlinks.

- [ ] T011 [P] [US1] Create `packages/shared/src/index.ts`:
  ```typescript
  // Shared TypeScript types — no runtime logic
  export type Placeholder = Record<string, never>;
  ```
  (Single placeholder type satisfies `include` glob and avoids TS18003 "no inputs found")
- [ ] T012 [P] [US1] Create `packages/electron/src/index.ts` — single line: `// Entry point`
- [ ] T013 [P] [US1] Create `packages/backend/src/index.ts` — single line: `// Entry point`
- [ ] T014 [P] [US1] Create `packages/frontend/src/index.ts` — single line: `// Entry point`
- [ ] T015 [US1] Run `pnpm install` from repo root (check `pnpm --version` first); confirm exit code 0 and that `node_modules/@jetadisyon/shared` exists as a symlink pointing to `packages/shared`
- [ ] T016 [US1] Verify `pnpm ls -r` output lists exactly four workspace packages (`@jetadisyon/electron`, `@jetadisyon/backend`, `@jetadisyon/frontend`, `@jetadisyon/shared`) with `<-` (local) links for shared
- [ ] T017 [US1] Verify filter targeting: run `pnpm --filter @jetadisyon/shared build` — must exit 0 scoped to the `shared` package only

**Checkpoint**: US1 complete — workspace bootstraps correctly. MVP deliverable validated.

---

## Phase 4: User Story 2 — TypeScript Compiles Cleanly (Priority: P2)

**Goal**: `tsc --noEmit` in each of the four packages exits with code 0 and zero errors.

**Independent Test**: Run `tsc --noEmit` in each package individually; all four exit 0.
Note: TypeScript is in root `devDependencies` (T003). Run `pnpm install` first (T015) so it is linked into `node_modules/.bin/tsc`.

- [ ] T018 [P] [US2] Create `packages/shared/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "lib": ["ES2022"],
      "rootDir": "./src",
      "outDir": "./dist",
      "declaration": true,
      "emitDeclarationOnly": true
    },
    "include": ["src/**/*"]
  }
  ```
  (No `composite: true` — deferred to build pipeline feature. `emitDeclarationOnly` keeps intent clear for future.)

- [ ] T019 [P] [US2] Create `packages/electron/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "lib": ["ES2022"],
      "rootDir": "./src",
      "outDir": "./dist",
      "declaration": true
    },
    "include": ["src/**/*"]
  }
  ```

- [ ] T020 [P] [US2] Create `packages/backend/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "module": "CommonJS",
      "moduleResolution": "Node10",
      "lib": ["ES2022"],
      "rootDir": "./src",
      "outDir": "./dist",
      "declaration": true,
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true
    },
    "include": ["src/**/*"]
  }
  ```
  (`Node10` resolves `main`/`types` fields in package.json — correct for NestJS CommonJS.)

- [ ] T021 [P] [US2] Create `packages/frontend/tsconfig.json` — adopted from official `jetadisyon-shadcn` example:
  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "noEmit": true,
      "allowImportingTsExtensions": true,
      "verbatimModuleSyntax": true,
      "moduleDetection": "force",
      "rootDir": "./src"
    },
    "include": ["src/**/*"]
  }
  ```
  (`allowImportingTsExtensions` is safe because `noEmit: true`. Do NOT set `composite: true`.)

- [ ] T022 [US2] Run `tsc --noEmit` in each package individually:
  ```bash
  pnpm --filter @jetadisyon/shared exec tsc --noEmit
  pnpm --filter @jetadisyon/electron exec tsc --noEmit
  pnpm --filter @jetadisyon/backend exec tsc --noEmit
  pnpm --filter @jetadisyon/frontend exec tsc --noEmit
  ```
  All four must exit code 0 with zero errors. Fix any tsconfig issue before proceeding.

**Checkpoint**: US2 complete — TypeScript strict mode compiles cleanly in all four packages.

---

## Phase 5: User Story 3 — Cross-Package Type Imports Resolve (Priority: P3)

**Goal**: A type exported from `@jetadisyon/shared` resolves correctly when imported in `backend` and `frontend` under strict mode, with no `tsconfig.json` edits. Resolution works because `Node10` (backend) and `bundler` (frontend) both follow the `types` field in `packages/shared/package.json`.

**Independent Test**: Add a named type to `packages/shared/src/index.ts`, import it in `packages/backend/src/index.ts`, run `tsc --noEmit` in backend — exits 0. Repeat for frontend. Revert both files.

- [ ] T023 [US3] Verify cross-package resolution from backend:
  1. Add to `packages/shared/src/index.ts`: `export type TestOrder = { id: string; platform: string };`
  2. Add to `packages/backend/src/index.ts`: `import type { TestOrder } from '@jetadisyon/shared'; const _order: TestOrder = { id: '1', platform: 'yemeksepeti' };`
  3. Run `pnpm --filter @jetadisyon/backend exec tsc --noEmit` — must exit 0
  4. Revert both files to their scaffold content after passing
- [ ] T024 [US3] Verify cross-package resolution from frontend:
  1. Same additions as T023 step 1–2 but target `packages/frontend/src/index.ts`
  2. Run `pnpm --filter @jetadisyon/frontend exec tsc --noEmit` — must exit 0
  3. Revert both files after passing

**Checkpoint**: US3 complete — cross-package type resolution works end to end without manual path config.

---

## Phase 6: Polish & Final Validation

**Purpose**: Confirm the complete scaffold matches SPEC.md exactly and all success criteria are met.

- [ ] T025 Verify directory tree matches SPEC.md exactly: confirm presence of `packages/electron/`, `packages/backend/`, `packages/frontend/`, `packages/shared/`, `supabase/migrations/`, `supabase/seed.sql`, `.env.example`, `.npmrc`, `pnpm-workspace.yaml`, `package.json`; no extra top-level directories
- [ ] T026 Confirm SC-005: inspect all source files — zero application logic, zero business stubs, only config files and minimal comments/placeholder types in `src/index.ts` files
- [ ] T027 Run complete quickstart.md verification suite (Steps 1–6) and confirm all acceptance criteria SC-001 through SC-005 pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — creates `src/index.ts` files, then runs `pnpm install`
- **Phase 4 (US2)**: Depends on Phase 3 (pnpm install must have succeeded to resolve workspace symlinks for tsc)
- **Phase 5 (US3)**: Depends on Phase 4 (all tsconfig files must exist and pass noEmit first)
- **Phase 6 (Polish)**: Depends on all user story phases completing

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (all package.json files) — no other story dependency
- **US2 (P2)**: Depends on US1 (pnpm install ran, workspace symlinks exist)
- **US3 (P3)**: Depends on US2 (tsconfig files created with correct moduleResolution)

### Parallel Opportunities

- T004, T005, T006 (Phase 1): all parallel — different root files
- T007, T008, T009, T010 (Phase 2): all parallel — each is a different package's package.json
- T011, T012, T013, T014 (Phase 3): all parallel — different src/index.ts files
- T016, T017 (Phase 3): sequential after T015 (depend on pnpm install completing)
- T018, T019, T020, T021 (Phase 4): all parallel — different tsconfig files

---

## Parallel Example: Phase 2

```bash
# All four package manifests can be created simultaneously:
Task: "Create packages/shared/package.json"        → T007
Task: "Create packages/electron/package.json"      → T008
Task: "Create packages/backend/package.json"       → T009
Task: "Create packages/frontend/package.json"      → T010
```

## Parallel Example: Phase 4

```bash
# All four tsconfig files can be created simultaneously:
Task: "Create packages/shared/tsconfig.json"       → T018
Task: "Create packages/electron/tsconfig.json"     → T019
Task: "Create packages/backend/tsconfig.json"      → T020
Task: "Create packages/frontend/tsconfig.json"     → T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T010) — CRITICAL, blocks everything
3. Complete Phase 3: User Story 1 (T011–T017)
4. **STOP and VALIDATE**: `pnpm ls -r` lists 4 packages, filter targeting works
5. US1 delivered — workspace ready for all subsequent features

### Incremental Delivery

1. Phase 1 + Phase 2 + Phase 3 → US1 ✅ (`pnpm install` works)
2. Phase 4 → US2 ✅ (`tsc --noEmit` clean per package)
3. Phase 5 → US3 ✅ (cross-package type imports resolve)
4. Phase 6 → Final validation ✅

---

## Notes

- **CLI-first rule**: Before creating any config file manually, check if a CLI tool can generate it (`pnpm init`, `tsc --init`). Verify current CLI flags with `--help` before running.
- **No third-party installs**: The only install in this task list is `pnpm install` to link workspace packages. No npm packages are installed as part of this feature (TypeScript may need to be added as a devDependency if not present — state the package name and reason before adding per CLAUDE.md rules).
- **Zero logic rule**: `src/index.ts` files contain only a comment or a single placeholder type. No business logic, no imports from external packages.
- **Revert verification imports**: T022 and T023 add temporary imports for verification — revert these immediately after confirming the test passes.
- Commit after Phase 3 (US1 complete) and again after Phase 5 (all stories complete).
