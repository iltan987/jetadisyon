# Feature Specification: Separate Database Package

**Feature Branch**: `004-db-package`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "i think it's better to have a separate db package. prisma generates lots of stuff which can then be exported, i guess? such as Resturant type, input types etc."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Import Database Types in API (Priority: P1)

A developer writing a NestJS service in `apps/api` needs to reference the `Restaurant` entity type, Prisma input types, or enum values without duplicating definitions. Currently, generated types live inside the API app itself, making them unavailable to other consumers.

**Why this priority**: This is the core value of the package — a single canonical source of truth for all database-related types across the monorepo. All other stories depend on this being resolved first.

**Independent Test**: A developer can add `@repo/db` to `apps/api`'s dependencies and import `Restaurant`, `Prisma.RestaurantCreateInput`, and any generated enum directly from `@repo/db` with full TypeScript type-checking.

**Acceptance Scenarios**:

1. **Given** `@repo/db` is added as a dependency in `apps/api`, **When** a developer imports `Restaurant` from `@repo/db`, **Then** TypeScript resolves the type correctly with full autocomplete
2. **Given** the Prisma schema is updated and types are regenerated, **When** a consumer package imports from `@repo/db`, **Then** it picks up the updated types automatically on the next build
3. **Given** an invalid field is referenced on a Prisma type, **When** the developer saves the file, **Then** TypeScript reports a compile-time error

---

### User Story 2 - Use Database Client from the Package (Priority: P1)

A developer writing a repository class in `apps/api` needs a configured `PrismaClient` instance. Without a shared package, each app would instantiate its own client, leading to connection pool fragmentation and duplication.

**Why this priority**: Centralising the client prevents multiple client instances competing for database connections and ensures all apps share the same client configuration (logging, error formatting, etc.).

**Independent Test**: A developer imports `prisma` (the singleton client) from `@repo/db` in an API service, calls a query, and receives results — with no second client instantiated elsewhere.

**Acceptance Scenarios**:

1. **Given** `@repo/db` exports a singleton `PrismaClient` instance, **When** `apps/api` imports and uses it, **Then** only one client connection pool is opened for the process
2. **Given** the client export is used in a service, **When** a Prisma query runs, **Then** results are returned with correct TypeScript types inferred
3. **Given** the database is unreachable, **When** a query is attempted, **Then** the error propagates to the caller without being swallowed inside the package

---

### User Story 3 - Import Types in Future Consumer Packages (Priority: P2)

A developer building a future package (e.g., a reporting module or a CLI tool) needs the same database types without depending on `apps/api` or duplicating the schema. The monorepo architecture supports multiple consumers.

**Why this priority**: The separation is only valuable long-term if the package is truly reusable across the workspace. This story validates the architecture holds for any future consumer.

**Independent Test**: A new workspace package can add `@repo/db` as a dependency and import types without depending on `apps/api`.

**Acceptance Scenarios**:

1. **Given** a new package in the monorepo adds `@repo/db` as a dependency, **When** it imports from `@repo/db`, **Then** it compiles without errors and without needing `apps/api` in its dependency graph
2. **Given** `@repo/db` is a proper workspace package, **When** the workspace is bootstrapped fresh, **Then** `@repo/db` resolves for all dependents via the workspace protocol

---

### Edge Cases

- What happens when a consumer imports from `@repo/db` before Prisma types have been generated? The build should fail with a clear error, not a silent type mismatch.
- What happens if the Prisma schema is updated but the generated client is not regenerated? The stale exports should cause a type error detectable at build time.
- What if the API instantiates `PrismaClient` directly instead of using the shared instance? This should be preventable via a lint rule or documented convention.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The workspace MUST include a `packages/db` package that owns the Prisma schema file and the generated Prisma client
- **FR-002**: `packages/db` MUST export the generated Prisma model types (e.g., `Restaurant`, `Order`) consumable by other workspace packages
- **FR-003**: `packages/db` MUST export Prisma namespace types (e.g., `Prisma.RestaurantCreateInput`, `Prisma.OrderWhereUniqueInput`) for use in service and repository layers
- **FR-004**: `packages/db` MUST export a singleton `PrismaClient` instance so consumers do not need to instantiate their own
- **FR-005**: `packages/db` MUST be listed as a workspace dependency in `apps/api` replacing any direct Prisma client usage currently in the API app
- **FR-006**: The Prisma `generate` command MUST be runnable from `packages/db` and MUST produce output scoped to that package
- **FR-007**: The `packages/db` package MUST be included in the Turbo build pipeline so generated types are always up to date before dependent packages build
- **FR-008**: The package MUST have a TypeScript configuration that produces correct type declarations consumable by dependents

### Key Entities

- **Database Package (`packages/db`)**: Owns the Prisma schema, runs client generation, and re-exports all generated types and the singleton client
- **PrismaClient Singleton**: A single configured client instance exported from `packages/db` to be shared across the API process
- **Generated Types**: Model types, input types, enum types, and filter types produced by Prisma from the schema

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All Prisma model and input types are importable from a single package entry point (`@repo/db`) by any workspace package, with zero duplication across the monorepo
- **SC-002**: Adding `@repo/db` as a dependency to a new workspace package and importing a type compiles successfully without additional configuration
- **SC-003**: Running the monorepo-wide build command regenerates Prisma types before any dependent package compiles, with no manual ordering required
- **SC-004**: `apps/api` contains zero direct `PrismaClient` instantiations after the migration — all database access goes through the shared singleton

## Assumptions

- The Prisma schema already exists or will be defined in `specs/003-core-data-model` — this package is the home for that schema, not the author of it
- `apps/api` is the only current consumer; the package design must support additional consumers without rework
- The monorepo already uses pnpm workspaces with the `workspace:*` protocol for internal dependencies
- Prisma client generation output will be directed into `packages/db/src/generated/` or a similar local path, not into `node_modules` globally
- A single `PrismaClient` instance is sufficient for the API process (no multi-tenant or per-request client requirements at this stage)
