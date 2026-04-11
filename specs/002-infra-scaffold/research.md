# Research: Infrastructure Scaffolding

**Branch**: `002-infra-scaffold` | **Date**: 2026-04-10
**Purpose**: Resolve all NEEDS CLARIFICATION items and document technology decisions before design

---

## Decision 1: Frontend Test Runner

**Decision**: Vitest

**Rationale**: `apps/admin` and `apps/desktop` both use Vite v7. Vitest is Vite-native — it reuses the same config, transform pipeline, and module resolution, giving near-zero setup overhead. It is API-compatible with Jest, so test patterns from `apps/api` (describe/it/expect) transfer directly. No separate transformer or Babel config is needed.

**Alternatives considered**:

- **Jest** with `ts-jest` and `jsdom`: Would require a second Babel/SWC transform pipeline separate from Vite; more config surface area; slower cold start.
- **Playwright Component Testing**: Overkill for unit and component tests; appropriate for e2e only (out of scope for this feature).

**Implications**:

- Each frontend package (`apps/admin`, `apps/desktop`, `packages/ui`) gets a `vitest.config.ts` using the shared Vite config.
- Test environment: `jsdom` for browser APIs in admin/ui; `jsdom` for desktop too (Tauri APIs are mocked in tests).
- `@testing-library/react` and `@testing-library/user-event` added for component rendering.
- Turbo `test` task already uses `no-cache: true` — remains unchanged.

---

## Decision 2: ORM for NestJS API

**Decision**: Prisma (v7.7.0 — latest stable as of 2026-04-11)

**Rationale**: Prisma is schema-first: the `schema.prisma` file is the single source of truth for the database model and generates fully-typed TypeScript client code. This aligns with the constitution's strict type-safety requirement. Migration tooling (`prisma migrate dev`, `prisma migrate deploy`) provides versioned, reviewable migrations with a clear history.

**IMPORTANT — v7.x breaking changes vs v5/v6**: Prisma v7 changed the official NestJS integration pattern significantly:

- The generated client is output to `./generated/prisma/` (not `@prisma/client`)
- A PostgreSQL driver adapter (`@prisma/adapter-pg`) is now required
- `PrismaService` imports `PrismaClient` from the local generated path and passes the adapter in `super({ adapter })`
- The lifecycle `onModuleInit` / `$connect()` hook is **no longer needed** in v7
- **CLI-first**: every schema or migration operation goes through the Prisma CLI; no manual edits to generated files

The official Prisma NestJS recipe (sourced from prisma.io/docs/guides/frameworks/nestjs) is the starting point with no unnecessary changes.

**Alternatives considered**:

- **TypeORM**: Traditional NestJS choice; decorator-based; already supported by the `nestjs.json` tsconfig. Weaker type safety for query results; migration tooling less ergonomic.
- **DrizzleORM**: Newer, TypeScript-native, very type-safe. Excellent DX but less mature NestJS integration and smaller community for this domain.
- **MikroORM**: Entity-based like TypeORM; strong typing; good NestJS support. Prisma chosen over MikroORM due to broader ecosystem and tooling (Prisma Studio, Accelerate).

**Implications**:

- `apps/api/prisma/schema.prisma` — schema file (initialized via `prisma init`)
- Generator output path: `./generated/prisma` (configured in `schema.prisma`)
- `PrismaService` extends `PrismaClient` from `./generated/prisma/client.js`, passes `PrismaPg` adapter
- `PrismaService` registered directly in `AppModule.providers` — no separate `PrismaModule` wrapper needed (simplest official pattern)
- Prisma CLI scripts added to `apps/api/package.json`: `db:migrate`, `db:studio`, `db:generate`, `db:seed`
- Version pinned at implementation time to whatever `prisma@latest` resolves to (run `pnpm add prisma@latest @prisma/client@latest @prisma/adapter-pg`)

---

## Decision 3: Database

**Decision**: PostgreSQL

**Rationale**: Restaurant order management is inherently relational: orders have line items, restaurants have menus, menus have categories, etc. PostgreSQL's ACID guarantees are essential for order state transitions (order acceptance, cancellation). It is the canonical Prisma + NestJS database and has excellent Docker support.

**Alternatives considered**:

- **SQLite**: Zero-setup, file-based. Not suitable for the API use case — no concurrent write support for multiple connections, and Prisma's SQLite driver has feature gaps.
- **MySQL/MariaDB**: Viable alternative to PostgreSQL; slightly different SQL dialect. PostgreSQL chosen for richer feature set (JSONB, better constraints, better array support).

**Implications**:

- `docker-compose.yml` at repo root defines a `postgres` service
- Default local DB: `postgres://postgres:postgres@localhost:5432/jetadisyon`
- `DATABASE_URL` is the required env variable for the API

---

## Decision 4: i18n Library

**Decision**: i18next + react-i18next, with TypeScript module augmentation for key safety

**Rationale**: i18next is the most widely-used i18n library in the React ecosystem with strong TypeScript support. Critically, it supports JSON locale files out of the box — satisfying the constitution requirement that "adding languages without code changes — only new locale JSON files." TypeScript module augmentation (`declare module 'i18next'`) enables compile-time key checking, satisfying FR-008.

**Alternatives considered**:

- **@lingui/react**: Macro-based, requires Babel transform; heavier setup; better for large-scale multi-locale apps.
- **react-intl (FormatJS)**: More complex API; JSON-based but type checking requires additional codegen step.
- **Custom solution**: Lightweight but loses plugin ecosystem; type-checking would need to be hand-rolled.

**Implications**:

- `packages/i18n` exports: `useTranslation` re-export, `TranslationKey` type, `initI18n()` function
- `packages/i18n/src/locales/tr.json` is the canonical Turkish translation catalog
- TypeScript module augmentation in `packages/i18n/src/types.ts` declares `DefaultNamespace` and `Resources`
- Adding a new locale requires only: (1) adding `XX.json` to `locales/`, (2) adding `import XX from './locales/XX.json'` to the init function — no structural changes
- Translation key format: flat namespaced keys, e.g. `"api.ORDER_ACCEPTED"`, `"error.printer_offline"`, `"common.save"`

---

## Decision 5: Environment Variable Validation

**Decision**: zod (custom, no additional library)

**Rationale**: `zod` is already a direct dependency of `packages/ui`. Using it for env validation keeps the dependency count flat and the approach consistent. A thin custom validator at each app's entry point reads `process.env` / `import.meta.env`, runs a zod schema, and throws on failure with the field name and expected type.

**Alternatives considered**:

- **@t3-oss/env**: Purpose-built, good DX. Adds a dependency; primarily designed for Next.js (though framework-agnostic core exists). Decided against given zod already available.
- **class-validator + @nestjs/config**: NestJS-idiomatic for the API but would mean two different validation patterns (class-validator for API, something else for Vite apps). Consistency wins.
- **dotenv-safe**: Simpler (checks only presence, not type). Insufficient — we need type validation and helpful error messages.

**Implications**:

- `apps/api/src/config/env.ts` — zod schema + validation call, imported before `NestFactory.create()`
- `apps/admin/src/env.ts` — zod schema for `import.meta.env`, validated at module top-level
- `apps/desktop/src/env.ts` — same pattern as admin
- Each app's `.env.example` documents all variables with example values
- If validation fails, the process exits with code 1 and a human-readable error listing each invalid field

---

## Decision 6: Local Development Infrastructure

**Decision**: Docker Compose v2 (`docker-compose.yml` at repo root)

**Rationale**: Docker Compose is the universal standard for defining multi-service local dev environments. Docker Desktop supports it on macOS and Windows; Docker Engine + Compose plugin works on Linux/WSL. A single `docker compose up -d` starts all backing services; `docker compose down` stops them cleanly. Constitution requires the tool to work on Linux/WSL and macOS — Compose satisfies both.

**Alternatives considered**:

- **devenv / Nix**: Reproducible and declarative, but requires Nix installation — high barrier to entry.
- **Podman Compose**: Open-source alternative to Docker. Less universal; most developers have Docker installed.
- **Manual installation docs**: No tooling, just instructions. Doesn't meet SC-003 (60-second startup with single command).

**Implications**:

- `docker-compose.yml` at monorepo root defines: `postgres` service (image: `postgres:17-alpine`)
- Named volume for data persistence between restarts
- `pnpm dev:infra` root script aliases `docker compose up -d`
- `pnpm dev:infra:stop` aliases `docker compose down`

---

## Decision 7: CI/CD Platform

**Decision**: GitHub Actions

**Rationale**: Stated in spec assumptions: repository is hosted on GitHub. GitHub Actions has native integration, free for public repos, and generous limits for private repos. Turbo provides `turborepo/action` for remote caching, reducing CI time for unchanged packages.

**Alternatives considered**:

- **GitLab CI**: Not applicable — repo is on GitHub.
- **CircleCI / Buildkite**: External services; more setup; no advantage over native GitHub Actions for this project scale.

**Implications**:

- `.github/workflows/ci.yml` — triggered on `pull_request` and `push` to `main`
- Node.js v20 + pnpm setup via `pnpm/action-setup` and `actions/setup-node`
- `pnpm install --frozen-lockfile` for reproducible installs
- Turbo runs: `pnpm turbo build lint check-types test`
- Turbo remote cache: `TURBO_TOKEN` and `TURBO_TEAM` secrets enable Vercel Remote Cache (or self-hosted if preferred)
- Branch protection rule: require all checks to pass before merge

---

## Decision 8: Response Code Layers (Clarification)

**Decision**: Two distinct layers — domain `ResponseCode` enum in `packages/types` + `http-status-codes` library in `apps/api` for HTTP transport

**Rationale**: These are separate concerns that must not be conflated:

- `ResponseCode` enum (domain layer): application-semantic codes in the response body `code` field — values like `ORDER_ACCEPTED`, `PRINTER_OFFLINE`. These mean something to the application business logic.
- HTTP status codes (transport layer): numeric codes that determine HTTP semantics — `200`, `404`, `409`. The API exception filter maps from `ResponseCode` to HTTP status.

The `http-status-codes` library (v2.3.0, no dependencies) provides `StatusCodes` (numbers) and `ReasonPhrases` (strings). NestJS's built-in `HttpStatus` enum is also an option for the API layer. Using `http-status-codes` keeps the mapping logic framework-agnostic.

**Implications**:

- `packages/types` contains ONLY domain codes — no HTTP numeric codes
- `apps/api` exception filter uses `http-status-codes` (or `@nestjs/common` `HttpStatus`) to set the HTTP response status
- Frontends should NEVER branch on HTTP status codes — only on the body `code` field (constitution §VI)

---

## Summary Table

| Decision             | Chosen                          | Key Reason                                                                           |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| Frontend test runner | Vitest                          | Vite-native, zero extra config, Jest-compatible API                                  |
| API ORM              | Prisma v7.x                     | Schema-first, generated types, best-in-class migration CLI; adapter pattern required |
| Database             | PostgreSQL                      | Relational, ACID, canonical Prisma partner                                           |
| i18n library         | i18next + react-i18next         | JSON locales, TS type augmentation, constitution-compliant                           |
| Env validation       | zod (custom)                    | Already a dependency, one consistent pattern across apps                             |
| Local infra          | Docker Compose v2               | Universal, single-command, works on Linux/WSL + macOS                                |
| CI/CD                | GitHub Actions                  | Native GitHub integration, Turbo remote cache support                                |
| Response code layers | Domain enum + http-status-codes | Two concerns: semantic body codes vs HTTP transport codes                            |
| Barrel exports       | `index.ts` per package          | Standard library pattern; no performance concern at package scale                    |
