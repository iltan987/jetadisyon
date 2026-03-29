# Feature Specification: pnpm Monorepo Scaffold

**Feature Branch**: `001-monorepo-scaffold`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Set up the monorepo structure for JetAdisyon as defined in SPEC.md. Four packages: electron, backend (NestJS), frontend (React + Vite), shared (types only). Include workspace config, root package.json, tsconfig for each package, and empty folder structure. No application logic. No dependencies installed yet."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer bootstraps the workspace (Priority: P1)

A developer clones the repo and runs `pnpm install` from the root. pnpm resolves workspaces and links the four packages together. The developer can run workspace-level commands targeting any package.

**Why this priority**: Without a working workspace root, nothing else can be built. All subsequent work depends on this.

**Independent Test**: Run `pnpm ls -r` from the root — must list all four packages as workspace members with no errors, even before any third-party dependencies are declared.

**Acceptance Scenarios**:

1. **Given** a fresh clone with no `node_modules`, **When** `pnpm install` is run from the root, **Then** all four packages are recognized as workspace members with no errors.
2. **Given** the workspace is initialized, **When** `pnpm --filter @jetadisyon/shared build` is run, **Then** the command targets only the `shared` package without errors.

---

### User Story 2 - TypeScript compiles cleanly across all packages (Priority: P2)

A developer runs `tsc --noEmit` in each package and gets zero errors, even with strict mode enabled and no source files beyond minimal entry points.

**Why this priority**: TypeScript config correctness is the foundation for all subsequent code. Catching misconfiguration early prevents compounding errors.

**Independent Test**: Run `tsc --noEmit` in each of the four packages individually. Each must exit with code 0.

**Acceptance Scenarios**:

1. **Given** a package with only a `tsconfig.json` and a minimal entry point, **When** `tsc --noEmit` is run, **Then** TypeScript exits cleanly with zero errors.
2. **Given** the `shared` package is referenced in another package's `tsconfig.json`, **When** `tsc --noEmit` is run in that package, **Then** TypeScript resolves the path correctly via workspace symlinks.

---

### User Story 3 - Cross-package type imports resolve correctly (Priority: P3)

A developer adds a type to `packages/shared/src/index.ts` and imports it in `packages/backend`. TypeScript resolves the import without manual path manipulation or `paths` aliases.

**Why this priority**: Cross-package imports are the primary reason for the monorepo structure. Verifying this at scaffold stage prevents late-stage surprises.

**Independent Test**: Add a single exported type to `shared`, import it in `backend`, run `tsc --noEmit` in `backend` — must pass under strict mode.

**Acceptance Scenarios**:

1. **Given** a type exported from `@jetadisyon/shared`, **When** imported in `backend`, **Then** TypeScript resolves it without error.
2. **Given** a type exported from `@jetadisyon/shared`, **When** imported in `frontend`, **Then** TypeScript resolves it without error.

---

### Edge Cases

- What happens when a developer runs `pnpm install` inside a package subfolder instead of the root? pnpm should still resolve the workspace root correctly.
- What if `pnpm-workspace.yaml` lists a glob that matches no packages? The root `pnpm ls -r` command must surface the mismatch rather than silently producing an empty list.
- What if a package's `tsconfig.json` references a base config that does not exist? TypeScript must fail at config-parse time with a clear error, not silently skip strict mode.
- What if `frontend` accidentally imports from `backend`? There is no enforced import barrier at scaffold stage — this is a convention enforced by code review, documented in SPEC.md.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The root MUST include a `pnpm-workspace.yaml` that lists `packages/*` as workspace members.
- **FR-002**: Each package MUST have a `package.json` with a scoped name: `@jetadisyon/electron`, `@jetadisyon/backend`, `@jetadisyon/frontend`, `@jetadisyon/shared`.
- **FR-003**: Each package MUST have a `tsconfig.json` with `strict: true` and settings appropriate for its role (Node.js target for `electron`/`backend`, browser/bundler target for `frontend`, library/declaration output for `shared`).
- **FR-004**: The root MUST have a base `tsconfig.json` with `strict: true` extended by each package's own tsconfig.
- **FR-005**: The `shared` package MUST be importable as `@jetadisyon/shared` from any other package via pnpm workspace linking — no manual `paths` aliases required.
- **FR-006**: The folder structure MUST exactly match SPEC.md: `packages/electron/`, `packages/backend/`, `packages/frontend/`, `packages/shared/`, `supabase/migrations/`, `supabase/seed.sql`.
- **FR-007**: A `.env.example` file MUST exist at the root.
- **FR-008**: No application logic, no platform-specific code, and no third-party dependencies installed. Package `dependencies`/`devDependencies` MAY list expected packages for documentation, but `node_modules` will be empty or absent.
- **FR-009**: `frontend` and `backend` MUST NOT list each other as dependencies in their `package.json` files.
- **FR-010**: The root `package.json` MUST include a `scripts` section with at minimum `build` and `dev` entries (may be empty placeholder commands for now).

### Key Entities

- **Workspace root**: Controls pnpm workspace membership, shared scripts, and the base TypeScript config.
- **Package**: An independent pnpm workspace member (`electron`, `backend`, `frontend`, `shared`) with its own `package.json` and `tsconfig.json`.
- **`shared` package**: Exports TypeScript types only — no runtime logic, no framework dependencies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm ls -r` from the root lists exactly four workspace packages with no errors.
- **SC-002**: `tsc --noEmit` passes in each of the four packages individually with zero errors and zero warnings.
- **SC-003**: The directory tree matches the structure in SPEC.md with zero missing and zero extra top-level directories.
- **SC-004**: A type added to `shared` and imported in `backend` or `frontend` resolves correctly under TypeScript strict mode without any `tsconfig.json` edits.
- **SC-005**: Zero application logic, business stubs, or placeholder implementations exist anywhere — only config files and minimal empty entry points where required.

## Assumptions

- No dependencies will be installed as part of this scaffold — `package.json` files list expected packages for future reference but `pnpm install` will not pull third-party code.
- `supabase/` folder is created as an empty directory structure with `migrations/` and `seed.sql` — actual Supabase CLI initialization is a separate feature.
- Each package will have a minimal `src/index.ts` only if required by the TypeScript `rootDir` or `include` config to avoid TS errors — contents will be a single comment or empty export.
- CLI tools (`pnpm`, `tsc`) will be invoked only after verifying their current usage via `--help` or current documentation, not assumed from prior knowledge.
- The new rule applies: if a CLI tool can scaffold something automatically (e.g., `pnpm init`, `tsc --init`), prefer that over manual file creation, after checking current CLI flags.
