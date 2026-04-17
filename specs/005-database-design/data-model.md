# Data Model: Database Design

**Feature**: Database Design (`005-database-design`)
**Date**: 2026-04-17
**Storage Tiers**: PostgreSQL (server, via `@repo/db` + Prisma 7.7.0) · SQLite (Tauri desktop, local-only)

---

## Server-Side Schema (`@repo/db` / Prisma)

All entities in this section are defined in `packages/db/prisma/schema.prisma` and managed via Prisma migrations.

### `Restaurant`

Central entity. Represents one registered restaurant.

| Field                   | Type                          | Notes                                                   |
| ----------------------- | ----------------------------- | ------------------------------------------------------- |
| `id`                    | `String @id @default(cuid())` | Primary key                                             |
| `name`                  | `String`                      | Restaurant display name                                 |
| `preAcceptDelayMs`      | `Int @default(0)`             | 0 = instant auto-accept; >0 = configurable delay window |
| `manualAcceptTimeoutMs` | `Int @default(120000)`        | Default: 2 minutes                                      |
| `createdAt`             | `DateTime @default(now())`    |                                                         |
| `updatedAt`             | `DateTime @updatedAt`         |                                                         |

**Relations**: `weeklySchedule[]`, `platforms[]`, `orders[]`, `dailySummaries[]`, `holidayPolicies[]`, `workingDayOverrides[]`, `installationKey?`, `platformCredentials[]`

**Indexes**: `id` (PK). No composite indexes needed beyond unique constraints on relations.

---

### `WeeklyScheduleDay`

One day-of-week entry in a restaurant's base working schedule.

| Field          | Type                          | Notes                                  |
| -------------- | ----------------------------- | -------------------------------------- |
| `id`           | `String @id @default(cuid())` |                                        |
| `restaurantId` | `String`                      | FK → Restaurant                        |
| `dayOfWeek`    | `Int`                         | 0 = Sunday … 6 = Saturday              |
| `isOpen`       | `Boolean @default(true)`      |                                        |
| `startTime`    | `String`                      | `"HH:MM"` in Turkey local time (UTC+3) |
| `endTime`      | `String`                      | `"HH:MM"`                              |

**Unique**: `@@unique([restaurantId, dayOfWeek])`

---

### `DeliveryPlatform`

Static reference list of supported delivery platforms. Seed data only; not operator-editable.

| Field  | Type                          | Notes                                                      |
| ------ | ----------------------------- | ---------------------------------------------------------- |
| `id`   | `String @id @default(cuid())` |                                                            |
| `name` | `String @unique`              | e.g., "Yemeksepeti"                                        |
| `slug` | `String @unique`              | e.g., "yemeksepeti" — used for WebSocket adapter selection |

**Seed values**: Yemeksepeti, Trendyol Go, Getir, Migros Yemek

---

### `RestaurantPlatform`

Links a restaurant to a delivery platform it uses.

| Field          | Type                          | Notes                 |
| -------------- | ----------------------------- | --------------------- |
| `id`           | `String @id @default(cuid())` |                       |
| `restaurantId` | `String`                      | FK → Restaurant       |
| `platformId`   | `String`                      | FK → DeliveryPlatform |
| `isActive`     | `Boolean @default(true)`      |                       |

**Unique**: `@@unique([restaurantId, platformId])`

---

### `PlatformCredential`

Encrypted platform login credentials. Server stores ciphertext only — cannot derive plaintext without the installation key.

| Field            | Type                          | Notes                                                   |
| ---------------- | ----------------------------- | ------------------------------------------------------- |
| `id`             | `String @id @default(cuid())` |                                                         |
| `restaurantId`   | `String`                      | FK → Restaurant                                         |
| `platformId`     | `String`                      | FK → DeliveryPlatform                                   |
| `ciphertextBlob` | `Bytes`                       | AES-256-GCM encrypted credential payload                |
| `derivationSalt` | `Bytes`                       | Per-credential random salt                              |
| `algorithmId`    | `String`                      | e.g., `"AES-256-GCM-v1"` — algorithm version identifier |
| `createdAt`      | `DateTime @default(now())`    |                                                         |
| `updatedAt`      | `DateTime @updatedAt`         |                                                         |

**Unique**: `@@unique([restaurantId, platformId])`

---

### `InstallationKey`

The restaurant's installation key, stored encrypted at rest. Retrievable by operators for credential recovery.

| Field          | Type                          | Notes                                      |
| -------------- | ----------------------------- | ------------------------------------------ |
| `id`           | `String @id @default(cuid())` |                                            |
| `restaurantId` | `String @unique`              | FK → Restaurant (one-to-one)               |
| `encryptedKey` | `Bytes`                       | Key encrypted at rest with server-side KEK |
| `createdAt`    | `DateTime @default(now())`    |                                            |

**Note**: Generated once during onboarding. Displayed to operator once, then stored. No `updatedAt` — intended to be immutable.

---

### `Order`

One delivery order and its lifecycle outcome. Central operational record.

| Field             | Type                          | Notes                                                      |
| ----------------- | ----------------------------- | ---------------------------------------------------------- |
| `id`              | `String @id @default(cuid())` |                                                            |
| `restaurantId`    | `String`                      | FK → Restaurant                                            |
| `platformId`      | `String`                      | FK → DeliveryPlatform                                      |
| `platformOrderId` | `String`                      | Platform-assigned order ID (deduplication key)             |
| `totalValue`      | `Decimal @db.Decimal(10, 2)`  | Sum of items; excluded from revenue if cancelled/timed-out |
| `receivedAt`      | `DateTime`                    | When order arrived at desktop (UTC)                        |
| `outcomeStatus`   | `OrderOutcome`                | Enum — see below                                           |
| `outcomeAt`       | `DateTime`                    | When outcome was determined                                |
| `operatorNotes`   | `String?`                     | Free-text annotation by operator                           |
| `createdAt`       | `DateTime @default(now())`    |                                                            |
| `updatedAt`       | `DateTime @updatedAt`         |                                                            |

**Unique**: `@@unique([restaurantId, platformOrderId])` — deduplication constraint

**Indexes**: `@@index([restaurantId, receivedAt])` — order history queries; `@@index([restaurantId, outcomeStatus])` — filter by outcome

**Relations**: `items[]`, `auditLogs[]`

**Status transitions allowed**:

- `auto_accepted` → `cancelled_by_platform` (platform cancels after acceptance)
- `manually_accepted` → `cancelled_by_platform`

#### `OrderOutcome` enum

```
AUTO_ACCEPTED
MANUALLY_ACCEPTED
TIMED_OUT
CANCELLED_BY_PLATFORM
```

---

### `OrderItem`

One line item within an order.

| Field       | Type                          | Notes                               |
| ----------- | ----------------------------- | ----------------------------------- |
| `id`        | `String @id @default(cuid())` |                                     |
| `orderId`   | `String`                      | FK → Order                          |
| `name`      | `String`                      | Item name as received from platform |
| `quantity`  | `Int`                         |                                     |
| `unitPrice` | `Decimal @db.Decimal(10, 2)`  | Price per unit at time of order     |

---

### `OrderAuditLog`

Immutable record of every operator-initiated edit to an Order field.

| Field           | Type                          | Notes                                                                  |
| --------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `id`            | `String @id @default(cuid())` |                                                                        |
| `orderId`       | `String`                      | FK → Order                                                             |
| `field`         | `String`                      | Name of the changed field (e.g., `"operatorNotes"`, `"outcomeStatus"`) |
| `originalValue` | `String?`                     | Serialized original value                                              |
| `newValue`      | `String?`                     | Serialized new value                                                   |
| `editedAt`      | `DateTime @default(now())`    |                                                                        |
| `operatorId`    | `String`                      | Operator identifier (placeholder — auth spec to formalize)             |

**Immutability**: No `updatedAt`, no `UPDATE` operations permitted. `DELETE` is also prohibited at application level. Only `INSERT`.

---

### `HolidayType`

Permanent reference entity — one row per named recurring Turkish holiday or period. Seeded once; not modified at runtime.

| Field      | Type                          | Notes                                                             |
| ---------- | ----------------------------- | ----------------------------------------------------------------- |
| `id`       | `String @id @default(cuid())` |                                                                   |
| `name`     | `String @unique`              | Turkish name: e.g., "Ramazan Bayramı", "30 Ağustos Zafer Bayramı" |
| `category` | `HolidayCategory`             | Enum — `FIXED_DATE` or `LUNAR`                                    |

#### `HolidayCategory` enum

```
FIXED_DATE    # Fixed Gregorian date each year (e.g., 29 Ekim, 30 Ağustos, 23 Nisan, 1 Mayıs, 19 Mayıs, 15 Temmuz)
LUNAR         # Computed from Islamic Hijri calendar (Ramazan month, Ramazan Bayramı, Kurban Bayramı)
```

**Seed values** (Turkish national holidays + Islamic observances):

| Name                         | Category   | Notes                                    |
| ---------------------------- | ---------- | ---------------------------------------- |
| 1 Ocak — Yılbaşı             | FIXED_DATE | Jan 1                                    |
| 23 Nisan — Ulusal Egemenlik  | FIXED_DATE | Apr 23                                   |
| 1 Mayıs — Emek ve Dayanışma  | FIXED_DATE | May 1                                    |
| 19 Mayıs — Atatürk'ü Anma    | FIXED_DATE | May 19                                   |
| 15 Temmuz — Demokrasi        | FIXED_DATE | Jul 15                                   |
| 30 Ağustos — Zafer Bayramı   | FIXED_DATE | Aug 30                                   |
| 29 Ekim — Cumhuriyet Bayramı | FIXED_DATE | Oct 29                                   |
| Ramazan Ayı                  | LUNAR      | Full month, computed from Hijri calendar |
| Ramazan Bayramı              | LUNAR      | 3 days (1–3 Şevval)                      |
| Kurban Bayramı               | LUNAR      | 4 days (10–13 Zilhicce)                  |

---

### `HolidayCalendarEntry`

One yearly occurrence of a `HolidayType`. Pre-computed and cached; operator-reviewable.

| Field            | Type                          | Notes                                               |
| ---------------- | ----------------------------- | --------------------------------------------------- |
| `id`             | `String @id @default(cuid())` |                                                     |
| `holidayTypeId`  | `String`                      | FK → HolidayType                                    |
| `year`           | `Int`                         | Gregorian year                                      |
| `startDate`      | `DateTime @db.Date`           | Inclusive start (UTC date, no time)                 |
| `endDate`        | `DateTime @db.Date`           | Inclusive end (same as start for single-day events) |
| `approvalStatus` | `HolidayApprovalStatus`       | Default: `AUTO_APPROVED`                            |

**Unique**: `@@unique([holidayTypeId, year])` — one entry per type per year

**Indexes**: `@@index([year])` — calendar view queries

#### `HolidayApprovalStatus` enum

```
AUTO_APPROVED         # Computed by algorithm, not yet reviewed or accepted as-is
OPERATOR_OVERRIDDEN   # Operator corrected the dates; takes precedence over future recomputation
```

---

### `RestaurantHolidayPolicy`

A restaurant's standing yearly rule for one `HolidayType`. Stored once; applies to all future years automatically.

| Field           | Type                          | Notes                                         |
| --------------- | ----------------------------- | --------------------------------------------- |
| `id`            | `String @id @default(cuid())` |                                               |
| `restaurantId`  | `String`                      | FK → Restaurant                               |
| `holidayTypeId` | `String`                      | FK → HolidayType                              |
| `effect`        | `HolidayPolicyEffect`         | Enum — see below                              |
| `startTime`     | `String?`                     | `"HH:MM"` — only when `effect = CUSTOM_HOURS` |
| `endTime`       | `String?`                     | `"HH:MM"` — only when `effect = CUSTOM_HOURS` |

**Unique**: `@@unique([restaurantId, holidayTypeId])` — one policy per (restaurant, holiday type)

#### `HolidayPolicyEffect` enum

```
CLOSED        # Restaurant does not operate
CUSTOM_HOURS  # Works a different schedule (startTime + endTime required)
OPEN_NORMAL   # Works regular weekly hours (explicitly marks as working day)
```

---

### `WorkingDayOverride`

A manual exception for one restaurant on one specific calendar date. Highest priority in schedule resolution.

| Field          | Type                          | Notes                                         |
| -------------- | ----------------------------- | --------------------------------------------- |
| `id`           | `String @id @default(cuid())` |                                               |
| `restaurantId` | `String`                      | FK → Restaurant                               |
| `date`         | `DateTime @db.Date`           | Specific calendar date (no time component)    |
| `effect`       | `WorkingDayEffect`            | Enum — same values as `HolidayPolicyEffect`   |
| `startTime`    | `String?`                     | `"HH:MM"` — only when `effect = CUSTOM_HOURS` |
| `endTime`      | `String?`                     | `"HH:MM"` — only when `effect = CUSTOM_HOURS` |

**Unique**: `@@unique([restaurantId, date])` — one override per (restaurant, date)

**Indexes**: `@@index([restaurantId, date])` — schedule resolution queries

#### `WorkingDayEffect` enum

```
CLOSED
CUSTOM_HOURS
OPEN_NORMAL
```

---

### `DailySummary`

Server-computed daily aggregate for one restaurant on one calendar day.

| Field               | Type                          | Notes                                                          |
| ------------------- | ----------------------------- | -------------------------------------------------------------- |
| `id`                | `String @id @default(cuid())` |                                                                |
| `restaurantId`      | `String`                      | FK → Restaurant                                                |
| `date`              | `DateTime @db.Date`           | Calendar day                                                   |
| `acceptedCount`     | `Int`                         | Orders with status `AUTO_ACCEPTED` or `MANUALLY_ACCEPTED`      |
| `failedCount`       | `Int`                         | Orders with status `TIMED_OUT` or `CANCELLED_BY_PLATFORM`      |
| `totalRevenue`      | `Decimal @db.Decimal(10, 2)`  | Sum of `totalValue` for accepted orders only                   |
| `platformBreakdown` | `Json`                        | `{ [platformId]: { acceptedCount: number, revenue: string } }` |
| `peakHour`          | `Int?`                        | 0–23 (hour of most accepted orders); null if no orders         |
| `topItems`          | `Json`                        | `[{ name: string, quantity: number }]` — top 10 by quantity    |
| `computedAt`        | `DateTime @default(now())`    | Last recomputation timestamp                                   |

**Unique**: `@@unique([restaurantId, date])` — one summary per (restaurant, date); upserted on recomputation

**Indexes**: `@@index([restaurantId, date])` — summary history queries

---

## Schedule Resolution Logic (shared `@repo/utils` package)

The effective working schedule for a restaurant on a given date is computed on demand by a pure function — no per-year data storage required.

```
resolveEffectiveSchedule(
  date: Date,
  weeklySchedule: WeeklyScheduleDay[],
  workingDayOverrides: WorkingDayOverride[],    // pre-filtered: this restaurant, dates near query
  holidayPolicies: RestaurantHolidayPolicy[],   // pre-fetched: this restaurant
  calendarEntries: HolidayCalendarEntry[]        // pre-fetched: year of query date
) → EffectiveSchedule
```

**Priority chain** (FR-022):

1. `WorkingDayOverride` matching `date` — highest priority, manual exception
2. `RestaurantHolidayPolicy` where a matching `HolidayCalendarEntry` covers `date` — standing yearly rule
3. `WeeklyScheduleDay` for `date.dayOfWeek` — base weekly schedule fallback

**`EffectiveSchedule` result shape**:

```typescript
type EffectiveSchedule =
  | { status: "closed" }
  | {
      status: "open";
      startTime: string;
      endTime: string;
      source: "override" | "holiday_policy" | "weekly";
    };
```

**Invariants**:

- Same inputs → same output (deterministic, no side effects, no external calls)
- Usable in both NestJS (server schedule preview) and Tauri React frontend (local enforcement from cached config)
- Zero external dependencies beyond the data passed in

---

## Local-Only Data (Tauri Desktop App)

The following entities exist only on the desktop machine. They are **never synced to the server** and are **not** part of the Prisma schema.

Implementation technology determined in `research.md`. See `quickstart.md` for setup steps.

### `ManualReviewQueue`

Orders held locally when auto-accept conditions are not met.

| Field               | Type    | Notes                                                  |
| ------------------- | ------- | ------------------------------------------------------ |
| `id`                | TEXT PK | Local ULID or UUID                                     |
| `platform_order_id` | TEXT    | From platform websocket                                |
| `platform_id`       | TEXT    | DeliveryPlatform slug                                  |
| `items_json`        | TEXT    | JSON-serialized items array                            |
| `total_value`       | REAL    | Order total                                            |
| `received_at`       | INTEGER | Unix timestamp (ms)                                    |
| `expires_at`        | INTEGER | Unix timestamp (ms) — when manual-accept timer expires |

**Lifecycle**: Created on order arrival if auto-accept fails. Deleted when owner accepts, timer expires (outcome → `TIMED_OUT`), or platform sends cancellation event.

---

### `PendingOrderSync`

Accepted orders awaiting server confirmation.

| Field               | Type    | Notes                                                                      |
| ------------------- | ------- | -------------------------------------------------------------------------- |
| `id`                | TEXT PK | Local ID                                                                   |
| `order_payload`     | TEXT    | JSON of full order record to POST to server                                |
| `outcome_status`    | TEXT    | `auto_accepted`, `manually_accepted`, `timed_out`, `cancelled_by_platform` |
| `queued_at`         | INTEGER | Unix timestamp (ms)                                                        |
| `retry_count`       | INTEGER | Incremented on each failed attempt                                         |
| `last_attempted_at` | INTEGER | Unix timestamp (ms)                                                        |

**Lifecycle**: Created when an order outcome is determined. Deleted once the server returns a success response. Retried with exponential back-off on failure.

---

### `LocalConfig`

Cached copy of server-side restaurant configuration, used for offline auto-accept decisions.

| Field        | Type    | Notes                                                                    |
| ------------ | ------- | ------------------------------------------------------------------------ |
| `key`        | TEXT PK | Config key (e.g., `"restaurant"`, `"platforms"`, `"upcoming_overrides"`) |
| `value_json` | TEXT    | JSON-serialized config value                                             |
| `fetched_at` | INTEGER | Unix timestamp (ms)                                                      |

**Lifecycle**: Populated on app startup and refreshed every 5 minutes. Separate rows per config key allow partial updates. Entire table can be cleared and re-fetched after credential rotation.

---

## `@repo/utils` Package API

New package: `packages/utils/`. Generic shared utilities package. Holiday/schedule logic lives under `packages/utils/src/holidays/`. Stateless TypeScript module with no runtime dependencies beyond `@tabby_ai/hijri-converter` (see `research.md` for library choice).

### Exported functions

```typescript
/** Compute Gregorian start/end dates for all Islamic holidays in a Gregorian year. */
computeIslamicHolidays(gregorianYear: number): {
  ramazanStart: Date;
  ramazanEnd: Date;
  ramazanBayramiStart: Date;
  ramazanBayramiEnd: Date;
  kurbanBayramiStart: Date;
  kurbanBayramiEnd: Date;
}

/** Compute all HolidayCalendarEntry values for a given year (fixed + lunar). */
computeHolidayCalendar(year: number): Array<{
  holidayTypeName: string;
  startDate: Date;
  endDate: Date;
}>

/** Resolve the effective working schedule for a restaurant on a given date. */
resolveEffectiveSchedule(
  date: Date,
  context: ScheduleResolutionContext
): EffectiveSchedule

/** For a date range, return each date with its effective schedule. */
previewSchedule(
  from: Date,
  to: Date,
  context: ScheduleResolutionContext
): Array<{ date: Date; schedule: EffectiveSchedule }>
```

### Input/output types

```typescript
interface ScheduleResolutionContext {
  weeklySchedule: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    startTime: string;
    endTime: string;
  }>;
  workingDayOverrides: Array<{
    date: Date;
    effect: "closed" | "custom_hours" | "open_normal";
    startTime?: string;
    endTime?: string;
  }>;
  holidayPolicies: Array<{
    holidayTypeName: string;
    effect: "closed" | "custom_hours" | "open_normal";
    startTime?: string;
    endTime?: string;
  }>;
  calendarEntries: Array<{
    holidayTypeName: string;
    startDate: Date;
    endDate: Date;
  }>;
}

type EffectiveSchedule =
  | { status: "closed"; source: "override" | "holiday_policy" | "weekly" }
  | {
      status: "open";
      startTime: string;
      endTime: string;
      source: "override" | "holiday_policy" | "weekly";
    };
```
