# Implementation Plan: Database Design

**Branch**: `005-database-design` | **Date**: 2026-04-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/005-database-design/spec.md`

## Summary

Design and implement the server-side Prisma schema and local-only desktop data layer for JetAdisyon — covering orders, restaurant configuration, holiday scheduling, and credential storage. The architecture splits storage into two tiers: a PostgreSQL server database (accessed via `@repo/db` + Prisma 7.7.0) holding all shared data, and SQLite local storage in the Tauri Rust backend holding ephemeral operational state. A shared TypeScript package (`@repo/utils`) will encapsulate stateless holiday-date computation (Hijri calendar + fixed rules + schedule resolution), reused by the NestJS API and the React desktop frontend.

## Technical Context

**Language/Version**: TypeScript 5.x strict (backend, admin, shared packages); Rust 2021 (Tauri desktop backend)
**Primary Dependencies**:

- Server: NestJS v11, Prisma 7.7.0 + `@prisma/adapter-pg`, `@repo/db` shared package
- Desktop: Tauri 2.x (Rust + React 19 + Vite v7); `tokio-tungstenite` (platform WebSockets); `tauri-plugin-sql` or `rusqlite` (local storage — see research.md)
- Shared: `@repo/utils` (new package — Hijri calendar + schedule resolution); `@repo/types` (existing)
- pnpm v10 workspaces, Turbo v2
  **Storage**: PostgreSQL (server, via `@repo/db`); SQLite (Tauri local-only layer)
  **Testing**: Vitest (backend/admin/packages); `cargo test` + `cargo clippy` (Rust)
  **Target Platform**: Linux/cloud server (NestJS API + admin web); Windows (Tauri desktop)
  **Project Type**: Full-stack — NestJS REST API + React admin SPA + Tauri desktop app (monorepo)
  **Performance Goals**: Order acceptance < 3s (constitution hard ceiling); API CRUD p95 < 500ms; order sync to server ≤ 30s (SC-001); post-outage sync within 60s (SC-002)
  **Constraints**: Non-blocking UI (all I/O async on Tauri UI thread); offline capable; memory stable 12h+; startup < 10s; Turkey-only timezone UTC+3 no DST as system constant
  **Scale/Scope**: SC-007: 500 restaurants; 12 months order history without degradation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                                               | Gate                                                                            | Status                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| I – TypeScript strict, no `any`                                         | All new TS code: strict + no any                                                | ✅ Pass — enforced by shared tsconfig |
| I – Rust zero warnings + Clippy                                         | Tauri Rust crates must compile clean                                            | ✅ Pass — existing rule, no new risk  |
| I – Shared configs from `packages/`                                     | New packages must extend `@repo/typescript-config`, `@repo/eslint-config`       | ✅ Pass — template clear              |
| II – Critical path integration tests                                    | Order acceptance, queue persistence, and sync retry must have integration tests | ✅ Pass — flagged in tasks            |
| II – Deterministic tests                                                | Holiday computation is pure/stateless — unit-testable                           | ✅ Pass                               |
| III – UI strings via `packages/i18n`                                    | Admin app and desktop app holiday/schedule UI strings must use i18n             | ✅ Pass                               |
| IV – Order acceptance < 3s                                              | Auto-accept is instant by design; no blocking server calls on accept path       | ✅ Pass — FR-007 non-blocking sync    |
| IV – API p95 < 500ms                                                    | All CRUD endpoints; schedule preview is computed query (needs index coverage)   | ✅ Pass — flagged in data model       |
| V – Safety: no auto-accept when printer offline / outside working hours | Schedule resolution (FR-022 priority chain) enforced on desktop                 | ✅ Pass                               |
| VI – Machine-readable `code` in all responses                           | All new NestJS endpoints must return typed `code` enum                          | ✅ Pass — flagged in contracts        |
| Reliability – WebSocket health checks every 30s                         | Tauri Rust backend monitors each platform connection                            | ✅ Pass — existing constitution rule  |

**Result**: All gates pass. No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/005-database-design/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── desktop-sync.md  # Desktop ↔ server sync endpoints
│   └── admin-api.md     # Admin app REST endpoints
└── tasks.md             # Phase 2 output (generated by /speckit-tasks)
```

### Source Code (repository root)

```text
packages/
├── db/                          # @repo/db — existing Prisma package
│   └── prisma/schema.prisma     # EXTEND with all server-side entities
├── utils/                       # @repo/utils — NEW generic shared utilities package
│   ├── src/
│   │   ├── holidays/
│   │   │   ├── hijri.ts         # Hijri ↔ Gregorian conversion
│   │   │   ├── holiday-types.ts # Turkish national holiday definitions
│   │   │   ├── calendar.ts      # HolidayCalendarEntry computation
│   │   │   └── schedule.ts      # Effective schedule resolution (priority chain)
│   │   └── index.ts             # Re-exports all public functions and types
│   ├── package.json
│   └── tsconfig.json
├── types/                       # @repo/types — existing; extend with DB types
└── ...existing packages...

apps/
├── api/                         # NestJS — add new modules
│   └── src/
│       ├── restaurants/         # Restaurant CRUD module
│       ├── orders/              # Order ingestion + sync module
│       ├── summaries/           # Daily summary computation module
│       ├── holidays/            # Holiday calendar + policy module
│       ├── credentials/         # Credential vault module
│       └── config-sync/         # Desktop config sync endpoint
├── admin/                       # React admin — add new pages
│   └── src/
│       ├── pages/
│       │   ├── restaurants/
│       │   ├── orders/
│       │   ├── summaries/
│       │   └── holidays/
│       └── ...
└── desktop/                     # Tauri app — add local data layer
    └── src-tauri/
        └── src/
            ├── local_db/        # SQLite local storage (ManualReviewQueue, PendingOrderSync, LocalConfig)
            ├── platform_ws/     # WebSocket connections + health checks
            └── sync/            # Background server sync queue
```

**Structure Decision**: Monorepo with feature modules added to existing apps. New `@repo/utils` package is the only new top-level package; holiday/schedule logic lives under `packages/utils/src/holidays/`. All other work extends existing apps and `@repo/db`.

## Complexity Tracking

> No constitution violations to justify.
