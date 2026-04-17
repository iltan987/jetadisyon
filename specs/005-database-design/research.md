# Research: Database Design

**Feature**: Database Design (`005-database-design`)
**Date**: 2026-04-17
**Phase**: Phase 0 — resolving unknowns before design

---

## Decision 1 — Hijri Calendar Library

**Decision**: Use `@tabby_ai/hijri-converter`

**Rationale**:

- Zero runtime dependencies → safe to include in `@repo/utils` (shared package consumed by NestJS server and React frontend alike)
- Runs in both Node.js and browser (ESM + CJS) — meets the requirement that `@repo/utils` works identically on both runtimes
- TypeScript-first with full type definitions
- Uses Umm al-Qura calendar, which is the standard referenced by Turkish Diyanet İşleri Başkanlığı for lunar holiday dates
- Date coverage: 1343–1500 AH (1924–2077 CE) — covers all foreseeable operational needs
- Lightweight: 11.4 KB gzipped

**API**:

```typescript
import { gregorianToHijri, hijriToGregorian } from "@tabby_ai/hijri-converter";

gregorianToHijri({ year: 2025, month: 3, day: 15 });
// → { year: 1446, month: 9, day: 15 }

hijriToGregorian({ year: 1446, month: 10, day: 1 });
// → Gregorian date of Ramazan Bayramı 1st day
```

**Mapping for Turkish Islamic holidays**:

- **Ramazan Ayı**: Hijri month 9 of given year; compute 1st and last day (29 or 30 days)
- **Ramazan Bayramı**: Hijri month 10, days 1–3
- **Kurban Bayramı**: Hijri month 12, days 10–13

**Alternatives considered**:

- `moment-hijri`: Last updated 1 year ago; depends on moment.js (maintenance-only). Rejected.
- `hijri-date`: Unmaintained 12+ months. Rejected.
- `islamic-date`: Active (updated 2 months ago) with built-in event calculations, but introduces additional dependencies. Rejected in favor of lighter library.
- Custom implementation: Risks divergence from Diyanet published dates. Rejected.

---

## Decision 2 — Local Persistent Storage (Tauri Desktop)

**Decision**: Use `@tauri-apps/plugin-sql` with SQLite via the official Tauri 2.x plugin

**Rationale**:

- Official Tauri team plugin; maintained in sync with Tauri 2.x releases
- Built on `sqlx` (battle-tested async Rust SQL library) with SQLite backend
- Supports migrations, transactions, and indexed queries — correctly handles queue semantics (retry counts, `expires_at` filtering, ordering by `queued_at`)
- Accessible from both the Rust backend and the React frontend via Tauri's command bridge
- SQLite file auto-persisted to `{app_data_dir}/app.db` — survives restarts, reboots
- Schema is defined as SQL migrations in `src-tauri/migrations/` — versionable alongside Rust code

**Setup**:

1. Add `tauri-plugin-sql` crate to `src-tauri/Cargo.toml`
2. Register plugin in `src-tauri/src/lib.rs` / `main.rs`
3. Define SQL migration files in `src-tauri/migrations/001_initial.sql`
4. From JavaScript frontend, import `Database` from `@tauri-apps/plugin-sql` and query via string SQL

**Alternatives considered**:

- `tauri-plugin-store`: Key-value JSON only — no indexing, no transactions, no queue-style row management. Suitable for simple preferences (e.g., window size) but not for `PendingOrderSync` retry logic or `ManualReviewQueue` timer tracking. Rejected.
- Direct `rusqlite` crate: Possible but not idiomatic in Tauri 2.x; requires duplicating all database operations in Rust commands with no JS-side access. More code surface for the same result. Rejected.
- In-memory only: No restart persistence. Violates FR-005 (queue must survive restarts). Rejected.

---

## Decision 3 — Monetary Value Storage

**Decision**: Use `Decimal @db.Decimal(10, 2)` in Prisma for all monetary fields (`Order.totalValue`, `OrderItem.unitPrice`, `DailySummary.totalRevenue`)

**Rationale**: Floating-point types (Float, Double) accumulate rounding errors unsuitable for financial calculations. PostgreSQL `DECIMAL(10,2)` stores exact values. Supports up to 99,999,999.99 — sufficient for Turkish lira order values.

**In application code**: Prisma returns `Decimal` objects (from the `decimal.js` library). Convert to `string` for JSON serialization to avoid float precision loss.

---

## Decision 4 — Date-Only Fields

**Decision**: Use `DateTime @db.Date` for all calendar-date fields (`HolidayCalendarEntry.startDate/endDate`, `WorkingDayOverride.date`, `DailySummary.date`)

**Rationale**: PostgreSQL `DATE` stores only the date component, no time or timezone. Since the application is Turkey-only (UTC+3), all "today" calculations are done in app code in Turkey local time before querying. This avoids timezone ambiguity in date comparisons.

---

## Decision 5 — Shared Package Strategy for @repo/utils

**Decision**: Create `packages/holidays/` as a new monorepo package extending `@repo/typescript-config`. No runtime dependencies except `@tabby_ai/hijri-converter`. Pure function exports only.

**Rationale**: The spec requires that the same holiday computation logic is used on both the NestJS server (schedule preview, working day enforcement) and in the React desktop frontend (local auto-accept enforcement from cached config). A shared package with no side effects satisfies this requirement with a single implementation.

**Tauri note**: The Rust backend of Tauri cannot import TypeScript packages directly. However, the holiday enforcement on the desktop uses the `LocalConfig` cache (pre-resolved working-day data fetched from the server). The Rust backend only needs to read the cached `LocalConfig` (effective schedules for upcoming dates, pre-computed by the server using `@repo/utils`) — it does not need to run the Hijri algorithm itself. This design was captured in the spec Assumptions section.
