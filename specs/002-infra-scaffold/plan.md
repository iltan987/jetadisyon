# Implementation Plan: Infrastructure Scaffolding

**Branch**: `002-infra-scaffold` | **Date**: 2026-04-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-infra-scaffold/spec.md`

## Summary

Establish the full development and quality infrastructure for the JetAdisyon monorepo before any business logic is implemented. This covers: Vitest test runners for all frontend packages (with shared base configuration via a new `@repo/vite-config` package), three new shared packages (`@repo/types` for API response enums, `@repo/i18n` for Turkish i18n, `@repo/vite-config` for shared Vitest config), zod-based environment variable validation in each app, Prisma + PostgreSQL database layer in the API, a Docker Compose local dev environment, and a GitHub Actions CI pipeline. All work is additive — no existing packages or apps are structurally changed.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no any), Node.js ≥20, Rust 2021 (Tauri — unchanged)
**Primary Dependencies**: pnpm v10 workspaces, Turbo v2, NestJS v11 (API), React 19 + Vite v7 (frontend), Vitest (new — frontend tests), `@repo/vite-config` (new — shared Vitest base config), Prisma (new — ORM), i18next + react-i18next (new — i18n), zod (existing — env validation), Docker Compose v2 (new — local infra), GitHub Actions (new — CI)
**Storage**: PostgreSQL 17 (via Docker Compose for local dev; Prisma client in API)
**Testing**: Jest v30 (API, existing), Vitest + @testing-library/react (admin/desktop/ui, new); shared Vitest base config in `packages/vite-config`; coverage via `@vitest/coverage-v8`
**Target Platform**: Linux/WSL + macOS (local dev), Ubuntu (CI), Windows (desktop production — build verification out of scope for this feature)
**Project Type**: Monorepo — desktop-app (Tauri) + web-service (NestJS) + web-app (React+Vite)
**Performance Goals**: Full test suite <60s locally, CI pipeline <5min with Turbo cache hits, API startup <10s (constitution §IV)
**Constraints**: Strict TypeScript (no `any`), no schema changes without Prisma migration, test runner output must be deterministic (constitution §II)
**Scale/Scope**: 3 apps + 7 packages (4 existing + 3 new: `packages/types`, `packages/i18n`, `packages/vite-config`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                                         | Check                                                                                                            | Status |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| §I — Strict TypeScript, no `any`                                  | New packages extend `packages/typescript-config/base.json`; all code strict mode                                 | PASS   |
| §I — Shared configs mandatory                                     | New packages use `eslint-config/base`, `typescript-config/base`; Vitest config shared via `packages/vite-config` | PASS   |
| §I — Single responsibility                                        | Each new package has one job: types exports, i18n exports, or Vitest config export                               | PASS   |
| §II — Integration tests for critical paths                        | Placeholder tests added; critical path integration tests are a feature-level concern, not scaffold-level         | PASS   |
| §II — Deterministic tests                                         | Vitest config uses fixed seeds; no network/time dependencies in placeholder tests                                | PASS   |
| §III — All strings via `packages/i18n`                            | `packages/i18n` is being created by this feature; constitution compliance begins after merge                     | PASS   |
| §III — Turkish default, JSON-only locale addition                 | i18next configured with `tr.json`; adding a locale = adding a JSON file only                                     | PASS   |
| §IV — API p95 <500ms                                              | No API routes added in this feature; Prisma connection overhead benchmarked at <50ms typical                     | PASS   |
| §VI — Shared TypeScript enums                                     | `packages/types` is the single source of truth for `ResponseCode`                                                | PASS   |
| §VI — New code = enum + translation key                           | Protocol documented in contracts/api-response.md; enforced by TypeScript compile errors                          | PASS   |
| Development — Feature branch only                                 | All work on `002-infra-scaffold`                                                                                 | PASS   |
| Development — Turbo tasks pass in CI                              | CI pipeline enforces this as its primary purpose                                                                 | PASS   |
| Development — Shared package changes tested against all consumers | CI runs `turbo check-types build` across all packages on every PR                                                | PASS   |

**Result**: All gates PASS. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-infra-scaffold/
├── plan.md               # This file
├── research.md           # Phase 0 — technology decisions
├── data-model.md         # Phase 1 — structural contracts and schemas
├── quickstart.md         # Phase 1 — developer onboarding guide
├── contracts/
│   ├── api-response.md   # API response envelope contract
│   └── translation-keys.md  # i18n key naming contract
└── tasks.md              # Phase 2 — task list (generated by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── vite-config/                     NEW — shared Vitest base configuration
│   ├── package.json                 (@repo/vite-config, private; devDeps: vitest, @vitejs/plugin-react)
│   ├── tsconfig.json                (extends typescript-config/base.json)
│   └── vitest.shared.ts             (base defineConfig: jsdom environment, v8 coverage provider, react plugin)
│
├── types/                           NEW — shared TypeScript types and enums
│   ├── package.json                 (@repo/types, private, no runtime deps)
│   ├── tsconfig.json                (extends typescript-config/base.json)
│   └── src/
│       ├── index.ts                 (re-exports everything)
│       ├── response-codes.ts        (ResponseCode enum)
│       └── api-response.ts          (ApiResponse<T> interface)
│
└── i18n/                            NEW — centralized translations
    ├── package.json                 (@repo/i18n, private)
    ├── tsconfig.json                (extends typescript-config/react-library.json)
    └── src/
        ├── index.ts                 (re-exports useTranslation, t, TranslationKey, initI18n)
        ├── init.ts                  (i18next initialization, imports locale JSONs)
        ├── types.ts                 (TypeScript module augmentation for key safety)
        └── locales/
            └── tr.json              (canonical Turkish translation catalog)

apps/
├── api/
│   ├── .env.example                 NEW — documents all env vars with examples
│   ├── prisma/
│   │   └── schema.prisma            NEW — datasource + generator (no models yet)
│   └── src/
│       ├── config/
│       │   └── env.ts               NEW — zod schema, validated before NestFactory
│       └── database/
│           └── prisma.service.ts    NEW — PrismaService extends PrismaClient (v7.x PrismaPg adapter)
│
├── admin/
│   ├── .env.example                 NEW
│   ├── vitest.config.ts             NEW — merges @repo/vite-config/vitest.shared + app-specific overrides
│   └── src/
│       └── env.ts                   NEW — zod schema for VITE_* vars
│
└── desktop/
    ├── .env.example                 NEW
    ├── vitest.config.ts             NEW — merges @repo/vite-config/vitest.shared + app-specific overrides
    └── src/
        └── env.ts                   NEW — zod schema for VITE_* vars

packages/ui (existing — test infra added only):
    └── vitest.config.ts             NEW — merges @repo/vite-config/vitest.shared + package-specific overrides

docker-compose.yml                   NEW — PostgreSQL service definition (repo root)

.github/
└── workflows/
    └── ci.yml                       NEW — GitHub Actions CI pipeline
```

**Structure Decision**: Monorepo option. New packages follow the established `packages/` pattern exactly. New app files are additive to existing app directories. No structural changes to existing packages. The `packages/vite-config` package follows the same pattern as `packages/typescript-config` and `packages/eslint-config` — a shared config consumed by all packages that need it. `PrismaService` is registered directly in `AppModule.providers` with no separate `PrismaModule` wrapper (official Prisma v7.x + NestJS pattern).

## Complexity Tracking

> No constitution violations. Section not applicable.
