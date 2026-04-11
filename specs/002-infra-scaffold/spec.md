# Feature Specification: Infrastructure Scaffolding

**Feature Branch**: `002-infra-scaffold`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Setup testing infrastructure, shared packages (types, i18n), environment variable validation, database layer, local dev infrastructure, and CI/CD pipeline"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Frontend Test Infrastructure (Priority: P1)

A developer working on the admin dashboard, desktop app, or shared UI library wants to write and run automated tests for their components and utilities. Currently, only the API has test infrastructure; frontend packages have none.

**Why this priority**: Without test infrastructure in frontend packages, the constitution's requirement for integration tests on critical paths cannot be fulfilled. This blocks all further quality assurance work.

**Independent Test**: A developer can navigate to any frontend package, run the test command, and see a working test runner that discovers and executes test files — even if only a single placeholder test exists.

**Acceptance Scenarios**:

1. **Given** a developer is in `apps/admin`, **When** they run the package's test command, **Then** the test runner starts and reports results (pass/fail)
2. **Given** a developer is in `apps/desktop`, **When** they run the package's test command, **Then** the test runner starts and reports results
3. **Given** a developer is in `packages/ui`, **When** they run the package's test command, **Then** the test runner starts and reports results
4. **Given** a developer runs the monorepo-wide test command from the repo root, **When** all packages are targeted, **Then** tests from all packages (frontend and backend) are executed and reported together

---

### User Story 2 - Shared Type Contracts (Priority: P1)

A developer building the API and another building the desktop client both need to agree on the codes and shapes that API responses carry. Currently there is no shared contract — each side would have to define its own types or rely on string comparisons, leading to drift and runtime bugs.

**Why this priority**: The project constitution mandates machine-readable response codes and code-based control flow (no string checks). This shared contract must exist before any API endpoint or client code is written.

**Independent Test**: A developer can import a response code enum from the shared types package in both an API module and a frontend module, and TypeScript catches any mismatch at compile time.

**Acceptance Scenarios**:

1. **Given** the shared types package exists, **When** a developer imports a response code enum, **Then** TypeScript provides autocomplete and type-checking for all valid codes
2. **Given** a response code is referenced in both the API and a client, **When** the code is changed in the shared package, **Then** TypeScript reports errors in all consumers that need updating
3. **Given** a developer adds a new response code to the shared package, **When** they save the file, **Then** it becomes immediately available to all consuming packages without duplication

---

### User Story 3 - Centralized i18n Package (Priority: P2)

A developer adding any user-facing string to the admin or desktop app needs a consistent way to define and retrieve translations, with Turkish as the default language.

**Why this priority**: The constitution mandates centralized i18n with Turkish as default. Without this package, each app might implement its own translation approach, leading to inconsistency across the product.

**Independent Test**: A developer can import a translation function from the i18n package and retrieve a Turkish string by key, with TypeScript catching invalid keys at compile time.

**Acceptance Scenarios**:

1. **Given** the i18n package exists, **When** a developer calls the translation function with a valid key, **Then** the Turkish string for that key is returned
2. **Given** a translation key does not exist, **When** a developer uses that key, **Then** TypeScript reports a compile-time error (no silent runtime failures)
3. **Given** Turkish is the default locale, **When** no locale is specified, **Then** Turkish strings are used

---

### User Story 4 - Environment Variable Validation (Priority: P2)

A developer setting up the project locally (or deploying to a new environment) needs to know exactly which environment variables are required and what happens if they are missing. Currently there is no env documentation or validation — an app would silently misbehave if a variable were absent.

**Why this priority**: Silent runtime configuration errors are hard to diagnose and can cause unexpected behavior in production. Fail-fast validation and documentation prevent wasted debugging time.

**Independent Test**: A developer can start any app with a missing required variable and immediately receive a clear, actionable error message identifying the missing variable by name.

**Acceptance Scenarios**:

1. **Given** a required environment variable is missing, **When** any app starts, **Then** it refuses to start and prints which variable is missing
2. **Given** a required variable has an invalid value (wrong type or format), **When** any app starts, **Then** it refuses to start with a clear validation message
3. **Given** a developer sets up the project fresh, **When** they read the `.env.example` file for any app, **Then** they find every required and optional variable documented with descriptions and example values

---

### User Story 5 - Database Layer for API (Priority: P2)

A developer starting to write API endpoints needs a configured, working database connection with schema management support. Currently, the NestJS app is scaffolded but has no database layer, no schema definition, and no way to manage schema changes over time.

**Why this priority**: No API feature can persist data without a database layer. This is the last infrastructure piece blocking API development.

**Independent Test**: A developer can start the local development environment, confirm the API connects to a running database, and apply a schema migration successfully.

**Acceptance Scenarios**:

1. **Given** the local infrastructure is running, **When** the API starts in development mode, **Then** it connects to the database without errors and logs a successful connection
2. **Given** a schema migration exists, **When** the developer runs the migration command, **Then** the schema is updated and the migration is recorded in the migration history
3. **Given** the database is not running, **When** the API attempts to start, **Then** it fails with a clear error rather than silently degrading

---

### User Story 6 - Local Development Infrastructure (Priority: P2)

A developer cloning the repository for the first time needs to get all required infrastructure (database, etc.) running with a single command, without manually installing or configuring external services on their host machine.

**Why this priority**: Developer onboarding speed directly affects productivity. A reproducible one-command setup removes the "works on my machine" problem and reduces setup time.

**Independent Test**: A developer with only the repository cloned and a container runtime installed can start all infrastructure services with one command and see them healthy within 60 seconds.

**Acceptance Scenarios**:

1. **Given** a developer has cloned the repository and has a container runtime installed, **When** they run the single startup command, **Then** all required infrastructure services start and report healthy
2. **Given** infrastructure services are running, **When** the API is started in dev mode, **Then** it connects to those services without any additional manual configuration
3. **Given** services are running, **When** the developer runs the stop command, **Then** all services are cleanly shut down and their state is preserved for the next startup

---

### User Story 7 - CI/CD Pipeline (Priority: P3)

A developer opening a pull request wants automatic validation that their changes do not break the build, types, linting, or tests across the entire monorepo. Currently, only local pre-commit hooks exist — there is no server-side enforcement.

**Why this priority**: Pre-commit hooks can be bypassed and only run locally. CI enforces quality gates for all contributors before code reaches the main branch, which is a constitution requirement.

**Independent Test**: A developer can open a pull request and observe that all quality checks run automatically with clear pass/fail status visible on the PR.

**Acceptance Scenarios**:

1. **Given** a pull request is opened or updated, **When** CI runs, **Then** build, lint, type-check, and tests are all executed across all packages
2. **Given** any CI check fails, **When** viewing the PR, **Then** the merge button is blocked and the failing check is clearly identified with enough detail to diagnose the issue
3. **Given** all CI checks pass, **When** viewing the PR, **Then** the merge button is enabled
4. **Given** a developer pushes a second commit to an open PR, **When** CI runs, **Then** packages unchanged since the last run use cached results and are not rebuilt (fast CI)

---

### Edge Cases

- What happens when the shared types package is imported by a package that has a diverging TypeScript version? (Managed by root pnpm version overrides; types must be compatible.)
- What happens if a developer adds a translation key without providing a Turkish value? (Must fail TypeScript compilation rather than silently falling back.)
- What happens when a container runtime is not installed on the developer's machine? (The startup command prints a clear prerequisite error and exits without attempting to start services.)
- What if a database migration conflicts with existing local data? (Migration tooling's built-in conflict detection handles this; developer receives a descriptive error and must resolve manually.)
- What if the CI runner cannot access a container runtime for tests requiring a database? (Test infrastructure must support in-memory or mocked alternatives for CI-only environments.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The monorepo MUST have a unified test command at the root that discovers and runs tests across all packages
- **FR-002**: `apps/admin`, `apps/desktop`, and `packages/ui` MUST each have test runner configuration with at least one passing placeholder test
- **FR-003**: A shared types package MUST exist under `packages/` and be declared as a workspace dependency usable by all other packages
- **FR-004**: The shared types package MUST export TypeScript enums covering domain-level semantic response codes (e.g., `ORDER_ACCEPTED`, `PRINTER_OFFLINE`, `LICENSE_EXPIRED`) — these are application-layer codes that appear in the response body `code` field, not HTTP status codes
- **FR-005**: All packages that reference API response outcomes MUST use the shared enums (no inline string literals for response codes)
- **FR-006**: A shared i18n package MUST exist under `packages/` and be consumable by all frontend packages
- **FR-007**: The i18n package MUST provide Turkish as the default and sole required locale
- **FR-008**: Translation keys MUST be type-safe — using an undefined key MUST produce a TypeScript compile error
- **FR-009**: The i18n package MUST be designed to accommodate additional locales in future without structural breaking changes
- **FR-010**: Each application MUST validate all required environment variables at process startup before accepting any traffic or rendering any UI
- **FR-011**: Each application MUST have an `.env.example` file listing all required and optional environment variables with human-readable descriptions and example values
- **FR-012**: Applications MUST exit with a descriptive, actionable error message when a required environment variable is absent or fails validation
- **FR-013**: The API MUST have a database connection module with ORM support registered in the root application module, following the ORM's official NestJS integration recipe as the starting point
- **FR-014**: The API MUST support schema-based database migrations with version tracking; all schema and migration operations MUST be performed via the ORM CLI — no manual edits to generated files or migration history
- **FR-015**: The project MUST include a local infrastructure definition that starts all required services with a single command
- **FR-016**: All consumer packages MUST declare `workspace:*` dependencies on the new shared packages so Turbo v2 can infer the correct build graph order — Turbo v2 derives build ordering automatically from the pnpm package graph; no manual changes to the `turbo.json` pipeline section are required for build ordering
- **FR-017**: A CI/CD pipeline MUST automatically run build, lint, check-types, and test on every pull request and push to the main branch
- **FR-018**: The CI/CD pipeline MUST block merges when any quality check fails
- **FR-019**: The CI/CD pipeline MUST use monorepo-aware caching so that unchanged packages are not rebuilt between runs
- **FR-020**: A shared `packages/vite-config` workspace package MUST provide the base Vitest configuration (test environment, coverage provider) consumed by all frontend packages; Vitest configuration MUST NOT be duplicated across `apps/admin`, `apps/desktop`, and `packages/ui`

### Key Entities

- **Shared Vite/Vitest Config Package** (`packages/vite-config`): A workspace package exporting the shared Vitest base configuration (`defineConfig` with jsdom environment and v8 coverage provider) consumed by all frontend packages — follows the `packages/typescript-config` / `packages/eslint-config` pattern; each frontend package's `vitest.config.ts` is a minimal file that imports from here and applies package-specific overrides via `mergeConfig` + `defineProject`
- **Shared Types Package** (`packages/types`): A workspace package exporting TypeScript type definitions, interfaces, and enums shared across apps; has no runtime dependencies and no business logic. The `ResponseCode` enum contains domain-level semantic codes (not HTTP status codes) — HTTP status mapping is a separate concern handled in the API layer via the framework's built-in HTTP status constants or the `http-status-codes` library
- **Shared i18n Package** (`packages/i18n`): A workspace package providing translation functions and a type-safe translation key catalog; owns the canonical Turkish translation strings
- **Environment Configuration Schema**: Per-app declaration of all required and optional configuration variables, their expected types, and validation rules
- **Database Schema**: The relational data model for the API, managed entirely through versioned migration files; no ad-hoc schema changes permitted. The ORM integration follows the official NestJS recipe; all schema operations must go through the ORM CLI
- **Local Infrastructure Definition**: A declarative file describing all services (database, etc.) needed to run the project locally, executable with a single CLI command
- **CI Pipeline**: Automated quality gate running on every pull request, enforcing all constitution-mandated checks before merge is permitted

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Running the monorepo-wide test command executes tests in all packages (api, admin, desktop, ui, and any new packages that have tests) with zero failures on a clean install
- **SC-002**: A TypeScript type error introduced in the shared types package is surfaced at compile time in all consuming packages without any manual intervention
- **SC-003**: A developer with a clean repository clone can start all local infrastructure services within 60 seconds using a single command
- **SC-004**: Any app started with a missing required environment variable surfaces a descriptive error naming the missing variable without accepting traffic or rendering UI — the API (Node.js process) exits within 3 seconds; Vite frontend apps throw at module initialization, preventing the app from mounting
- **SC-005**: A pull request containing a failing test, type error, or lint violation is automatically blocked from merging, with the failure visible within 5 minutes of the PR being opened
- **SC-006**: A CI run on a second commit that touches only one package shows cache hits for all unchanged packages (verified by CI log output)
- **SC-007**: All workspace packages (existing 6 plus 3 new packages added by this feature: `packages/types`, `packages/i18n`, `packages/vite-config`) are recognized by Turbo and participate in the correct build graph order

## Clarifications

### Session 2026-04-11

- Q: Does `response-codes.ts` contain HTTP status codes or application-domain codes? → A: Domain-level semantic codes only (e.g., `ORDER_ACCEPTED`, `PRINTER_OFFLINE`). HTTP status mapping is a separate API-layer concern; the `http-status-codes` library or NestJS's built-in HTTP status constants handle that layer.
- Q: Are barrel exports (`index.ts`) an appropriate pattern for library packages? → A: Yes — barrel exports are standard and appropriate for library packages, providing a stable public API surface. The TypeScript performance drawbacks of barrel exports only apply at application code scale, not to small, purpose-built packages.
- Q: What ORM integration pattern and tooling approach to use? → A: Follow the official NestJS ORM integration recipe as the starting point with no unnecessary changes; all schema and migration operations performed via CLI only; version pinned to latest stable at time of implementation.
- Q: How should shared Vitest configuration be centralized to avoid duplicating `vitest.config.ts` across the three frontend packages? → A: New `packages/vite-config` workspace package following the existing `packages/typescript-config` / `packages/eslint-config` pattern; it exports the shared Vitest base config (jsdom environment, v8 coverage); each frontend package's `vitest.config.ts` imports from `@repo/vite-config` and applies package-specific overrides via `mergeConfig` + `defineProject`.

## Assumptions

- The database technology will be relational (SQL-based), consistent with the NestJS ecosystem and the restaurant management domain
- Turkish is the only locale required for initial launch; the i18n package structure must accommodate additional locales later without requiring a rewrite
- CI/CD will target GitHub Actions, as the repository is hosted on GitHub
- The local development infrastructure tool must work on Linux/WSL and macOS (primary developer environments; Windows native is not required for this tooling)
- The CI pipeline does not build or test the Tauri desktop binary at this stage (native binary builds are out of scope for this feature)
- Integration with external services (payment gateways, delivery platforms) is out of scope for this feature
- The existing packages (`packages/ui`, `packages/eslint-config`, `packages/typescript-config`) remain unchanged in structure; this feature only adds new packages
- Test infrastructure for frontend packages uses the same test runner pattern to maintain consistency across the monorepo; shared Vitest base configuration lives in `packages/vite-config` and is imported by all frontend packages — Vitest configuration is not duplicated
- Library packages (`packages/types`, `packages/i18n`) expose their public API via a single barrel export (`index.ts`); this is standard for package code and does not carry the TypeScript performance drawbacks seen in large application codebases
- All ORM schema and migration operations are performed via the ORM CLI — no direct editing of generated client code, schema drift files, or migration history
- HTTP status code constants (200, 404, etc.) are a separate concern from the domain `ResponseCode` enum; the API layer maps between the two using the `http-status-codes` library or framework utilities
