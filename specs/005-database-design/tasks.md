# Tasks: Database Design

**Input**: Design documents from `specs/005-database-design/`
**Prerequisites**: plan.md ✓ · spec.md ✓ · research.md ✓ · data-model.md ✓ · contracts/ ✓ · quickstart.md ✓

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story label (US1–US7, maps to spec.md)
- Paths relative to repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New package scaffolding and plugin installation needed before any story can begin.

- [x] T001 Create `packages/utils/` package scaffold: `package.json` (name `@repo/utils`, extends `@repo/typescript-config`, dependency `@tabby_ai/hijri-converter`), `tsconfig.json`, empty `src/index.ts`, and subdirectory `src/holidays/` for holiday/schedule logic — structure allows future utilities to be added at `src/` level alongside `holidays/`
- [x] T002 [P] Install `@tabby_ai/hijri-converter` in the new package: run `pnpm --filter @repo/utils add @tabby_ai/hijri-converter`
- [x] T003 [P] Install Tauri SQL plugin: from `apps/desktop/`, run `pnpm tauri add sql` (installs Rust crate + JS package + wires Tauri 2 permissions automatically)
- [x] T004 [P] Add `@repo/utils` as workspace dependency to API and admin apps: `pnpm --filter @repo/api add @repo/utils@workspace:*` and `pnpm --filter @repo/admin add @repo/utils@workspace:*`

**Checkpoint**: Package scaffold exists and deps installed. No compilation yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on. Nothing in Phases 3–8 can begin until this phase is complete.

**⚠️ CRITICAL**: Complete and verify this entire phase before starting any user story.

### Prisma Schema & Database

- [x] T005 Extend `packages/db/prisma/schema.prisma` with all 13 server-side entities and enums per `data-model.md`: `Restaurant`, `WeeklyScheduleDay`, `DeliveryPlatform`, `RestaurantPlatform`, `PlatformCredential`, `InstallationKey`, `Order` (with `OrderOutcome` enum), `OrderItem`, `OrderAuditLog`, `HolidayType` (with `HolidayCategory` enum), `HolidayCalendarEntry` (with `HolidayApprovalStatus` enum), `RestaurantHolidayPolicy` (with `HolidayPolicyEffect` enum), `WorkingDayOverride` (with `WorkingDayEffect` enum), `DailySummary` — include all unique constraints and indexes from data-model.md
- [x] T006 Run Prisma migration and regenerate client: `pnpm --filter @repo/db db:migrate -- --name init_database_design` then `pnpm --filter @repo/db db:generate` — verify build passes with `pnpm --filter @repo/db build`
- [x] T007 [P] Create `packages/db/prisma/seed.ts`: seed 4 `DeliveryPlatform` rows (Yemeksepeti/yemeksepeti, Trendyol Go/trendyol-go, Getir/getir, Migros Yemek/migros-yemek) and 10 `HolidayType` rows per data-model.md seed table (7 fixed-date + 3 lunar)
- [x] T008 Run seed: `pnpm --filter @repo/db db:seed` — verify all 14 rows inserted (depends on T006 + T007)

### `@repo/utils` Package

- [x] T009 [P] Implement `packages/utils/src/holidays/hijri.ts`: export `gregorianToHijri(date: {year,month,day})` and `hijriToGregorian(date: {year,month,day})` wrappers over `@tabby_ai/hijri-converter`; export helper `islamicMonthDays(hijriYear, hijriMonth): number` to determine 29 vs 30 day months
- [x] T010 [P] Implement `packages/utils/src/holidays/holiday-types.ts`: export `FIXED_HOLIDAYS` constant array mapping holiday name → Gregorian month+day; export `LUNAR_HOLIDAYS` constant (Ramazan: month 9, Ramazan Bayramı: month 10 days 1–3, Kurban Bayramı: month 12 days 10–13)
- [x] T011 Implement `packages/utils/src/holidays/calendar.ts`: export `computeIslamicHolidays(gregorianYear: number)` returning `{ramazanStart, ramazanEnd, ramazanBayramiStart, ramazanBayramiEnd, kurbanBayramiStart, kurbanBayramiEnd}` using T009 + T010; export `computeHolidayCalendar(year: number)` returning `Array<{holidayTypeName, startDate, endDate}>` (all fixed + lunar holidays for year)
- [x] T012 Implement `packages/utils/src/holidays/schedule.ts`: export `resolveEffectiveSchedule(date: Date, context: ScheduleResolutionContext): EffectiveSchedule` implementing the 3-priority chain from data-model.md (WorkingDayOverride → RestaurantHolidayPolicy via HolidayCalendarEntry → WeeklyScheduleDay); export `previewSchedule(from: Date, to: Date, context: ScheduleResolutionContext): Array<{date, schedule}>`; export all TypeScript types (`ScheduleResolutionContext`, `EffectiveSchedule`)
- [x] T013 [P] Implement `packages/utils/src/holidays/index.ts`: re-export all public functions and types from calendar.ts, schedule.ts, hijri.ts — NO default export, named exports only
- [x] T014 [P] Build and verify `@repo/utils`: run `pnpm --filter @repo/utils check-types` — fix all type errors

### Tauri Local Storage

- [x] T015 Create `apps/desktop/src-tauri/migrations/001_create_local_tables.sql` with `CREATE TABLE IF NOT EXISTS` statements for `manual_review_queue`, `pending_order_sync`, and `local_config` per data-model.md schema (exact column names and types)
- [x] T016 Register `tauri-plugin-sql` in `apps/desktop/src-tauri/src/lib.rs`: import `tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind}`; define `migrations` vec with one `Migration { version: 1, description: "create_local_tables", sql: include_str!("../migrations/001_create_local_tables.sql"), kind: MigrationKind::Up }`; add `.plugin(SqlBuilder::default().add_migrations("sqlite:app.db", migrations).build())` to Tauri builder

### Shared API Contract Infrastructure

- [x] T017 [P] Extend `packages/types/src/` with `ResponseCode` enum covering all codes from `contracts/desktop-sync.md` and `contracts/admin-api.md`: `CONFIG_OK`, `ORDER_SYNCED`, `ORDER_ALREADY_EXISTS`, `ORDER_STATUS_UPDATED`, `ORDER_NOT_FOUND`, `INVALID_STATUS_TRANSITION`, `RESTAURANT_NOT_FOUND`, `RESTAURANT_CREATED`, `RESTAURANT_UPDATED`, `RESTAURANT_OK`, `RESTAURANTS_OK`, `PLATFORM_UPDATED`, `PLATFORMS_OK`, `INSTALLATION_KEY_PROVISIONED`, `INSTALLATION_KEY_OK`, `CREDENTIAL_UPDATED`, `ORDER_OK`, `ORDERS_OK`, `ORDER_UPDATED`, `SUMMARIES_OK`, `HOLIDAY_TYPES_OK`, `HOLIDAY_CALENDAR_OK`, `CALENDAR_ENTRY_UPDATED`, `HOLIDAY_POLICIES_OK`, `HOLIDAY_POLICY_UPDATED`, `HOLIDAY_POLICY_DELETED`, `OVERRIDES_OK`, `OVERRIDE_CREATED`, `OVERRIDE_UPDATED`, `OVERRIDE_DELETED`, `OVERRIDE_ALREADY_EXISTS`, `SCHEDULE_PREVIEW_OK`, `VALIDATION_ERROR`, `PLATFORM_NOT_FOUND`
- [x] T018 [P] Create global NestJS response interceptor `apps/api/src/common/interceptors/response.interceptor.ts` that wraps all successful responses in `{ code: ResponseCode; data: unknown; message: string }` shape; register it globally in `apps/api/src/app.module.ts`

**Checkpoint**: Prisma schema migrated, @repo/utils builds cleanly, Tauri SQLite plugin registered, response codes defined. All gates green. User story phases can now begin.

---

## Phase 3: User Story 1 — Local Manual Review Queue (Priority: P1) 🎯 MVP

**Goal**: Desktop app holds orders locally when auto-accept conditions fail; queue survives restarts; working hours enforcement via cached config.

**Independent Test**: Start app, take printer offline, receive 2 simulated orders → both appear in ManualReviewQueue with countdown timers → close and reopen app → both orders still present.

### Rust: Local DB Commands

- [x] T019 [US1] Create Rust module `apps/desktop/src-tauri/src/local_db/mod.rs`: declare submodules `manual_review_queue`, `pending_order_sync`, `local_config`; re-export their Tauri command handlers
- [x] T020 [P] [US1] Implement `apps/desktop/src-tauri/src/local_db/manual_review_queue.rs`: Tauri commands `enqueue_order(db: State<DbPool>, payload: ManualReviewEntry) -> Result<()>`, `list_queue(db) -> Result<Vec<ManualReviewEntry>>`, `remove_from_queue(db, id: String) -> Result<()>`, `clear_expired(db) -> Result<Vec<String>>` (returns IDs of expired entries for timed-out recording)
- [x] T021 [P] [US1] Implement `apps/desktop/src-tauri/src/local_db/local_config.rs`: Tauri commands `set_config(db, key: String, value: String) -> Result<()>`, `get_config(db, key: String) -> Result<Option<String>>`; define `LocalConfigKey` enum (`Restaurant`, `Platforms`, `UpcomingOverrides`)
- [x] T022 [P] [US1] Implement `apps/desktop/src-tauri/src/local_db/pending_order_sync.rs`: Tauri commands `enqueue_sync(db, payload: String, outcome_status: String) -> Result<()>`, `list_pending(db) -> Result<Vec<PendingSyncEntry>>`, `remove_synced(db, id: String) -> Result<()>`, `increment_retry(db, id: String) -> Result<()>`

### Rust: Order Reception & Working Hours Enforcement

- [x] T023 [US1] Create `apps/desktop/src-tauri/src/platform_ws/order_handler.rs`: implement `should_auto_accept(local_config: &LocalConfigSnapshot) -> bool` — reads `UpcomingOverrides` from LocalConfig, finds today's effective schedule, returns `true` only if current time is within working hours; implement `handle_incoming_order(order: RawOrder, local_config: &LocalConfigSnapshot, db: &DbPool)` — calls `should_auto_accept`, routes to `enqueue_order` (ManualReviewQueue) or auto-accept path
- [x] T024 [US1] Create `apps/desktop/src-tauri/src/platform_ws/mod.rs`: declare platform WebSocket connection stub (one per enabled platform); on order arrival call `order_handler::handle_incoming_order`; on platform cancellation event: remove from ManualReviewQueue if present, enqueue cancellation outcome to PendingOrderSync
- [x] T025 [US1] Wire up timer expiry in `apps/desktop/src-tauri/src/platform_ws/mod.rs`: spawn a background Tokio task that runs every 10 seconds, calls `clear_expired` on ManualReviewQueue, and for each expired entry enqueues a `timed_out` outcome to PendingOrderSync

### TypeScript: Desktop App Queue UI

- [x] T026 [P] [US1] Create `apps/desktop/src/hooks/useManualReviewQueue.ts`: call `invoke('list_queue')` on mount and on a 5-second interval; expose `queue: ManualReviewEntry[]`, `acceptOrder(id)`, `refreshQueue()`
- [x] T027 [US1] Create `apps/desktop/src/pages/queue/ManualReviewQueuePage.tsx`: render queue entries from `useManualReviewQueue`; show countdown timer per entry (derived from `expires_at - Date.now()`); Accept button calls `acceptOrder`; display empty state when queue is empty

**Checkpoint**: ManualReviewQueue functional end-to-end. Orders held locally, countdown visible, survive restart. Working hours checked against cached config.

---

## Phase 4: User Story 2 — Desktop Syncs Orders to Server (Priority: P1)

**Goal**: Every order outcome (accept, timeout, cancelled) syncs to server; offline outcomes queue locally and retry; server deduplicates.

**Independent Test**: Disconnect server, auto-accept 5 orders → all 5 appear in PendingOrderSync → reconnect → all 5 appear on server with correct details; submit same platformOrderId twice → server returns one record.

### NestJS: Config Sync Endpoint

- [ ] T028 [US2] Scaffold ConfigSync NestJS module: run `npx nest generate module config-sync`, `nest generate controller config-sync`, `nest generate service config-sync` in `apps/api/src/`
- [ ] T029 [US2] Implement `apps/api/src/config-sync/config-sync.service.ts`: `getRestaurantConfig(restaurantId: string)` — fetch Restaurant + WeeklyScheduleDay + RestaurantPlatform + acceptance timer settings from `@repo/db`; call `previewSchedule()` from `@repo/utils` for next 90 days; return full config snapshot matching `contracts/desktop-sync.md` response shape
- [ ] T030 [US2] Implement `GET /config/:restaurantId` in `apps/api/src/config-sync/config-sync.controller.ts`: call `ConfigSyncService.getRestaurantConfig`, return `{ code: ResponseCode.CONFIG_OK, data: config, message: '...' }`; return `RESTAURANT_NOT_FOUND` if unknown ID

### NestJS: Order Sync Endpoints

- [ ] T031 [US2] Scaffold Orders NestJS module: run `nest generate module orders`, `nest generate controller orders`, `nest generate service orders` in `apps/api/src/`
- [ ] T032 [US2] Implement `apps/api/src/orders/orders.service.ts`: `upsertOrder(dto: CreateOrderDto) -> Order` — insert with `@@unique([restaurantId, platformOrderId])` conflict handling (return existing on conflict); `updateStatus(orderId, status, outcomeAt)` — update outcome status; validate allowed transitions (only `cancelled_by_platform` via this path)
- [ ] T033 [US2] Implement `POST /orders` in `apps/api/src/orders/orders.controller.ts`: validate body, call `upsertOrder`, return `ORDER_SYNCED` (201) or `ORDER_ALREADY_EXISTS` (200) with `orderId`
- [ ] T034 [US2] Implement `PATCH /orders/:id/status` in `apps/api/src/orders/orders.controller.ts`: validate `outcomeStatus` is `cancelled_by_platform`, call `updateStatus`, return `ORDER_STATUS_UPDATED`; return `ORDER_NOT_FOUND` or `INVALID_STATUS_TRANSITION` on error

### Rust: Background Sync Task

- [ ] T035 [US2] Create `apps/desktop/src-tauri/src/sync/server_sync.rs`: implement `run_sync_loop(db: DbPool, api_base_url: String)` as a Tokio task — on each tick (every 5s): fetch `list_pending` from PendingOrderSync; for each entry POST to `/orders`; on success call `remove_synced`; on failure call `increment_retry`; implement exponential back-off (skip entries with `retry_count >= 10` or `last_attempted_at` within back-off window)
- [ ] T036 [US2] Create `apps/desktop/src-tauri/src/sync/mod.rs`: spawn `server_sync::run_sync_loop` as background Tauri task on app startup; also spawn a config refresh task that calls `GET /config/:restaurantId` every 5 minutes and updates LocalConfig via `set_config` commands

**Checkpoint**: Order outcomes reach server within 30s. Offline queue drains on reconnect. Duplicate POST returns existing record.

---

## Phase 5: User Story 3 — Server Generates Daily Summaries (Priority: P2)

**Goal**: Server auto-computes `DailySummary` from stored orders at session end; recomputes on late sync.

**Independent Test**: Insert 10 orders for restaurant on a given date, trigger summary computation → `DailySummary` row exists with correct counts, revenue, peak hour, top items. Insert a late-arriving order → summary recomputes.

- [ ] T037 [US3] Scaffold Summaries NestJS module: run `nest generate module summaries`, `nest generate controller summaries`, `nest generate service summaries` in `apps/api/src/`
- [ ] T038 [US3] Implement `apps/api/src/summaries/summaries.service.ts`: `computeSummary(restaurantId: string, date: Date) -> DailySummary` — aggregate all `Order` rows for (restaurantId, date) in Turkey local date; compute `acceptedCount`, `failedCount`, `totalRevenue` (accepted orders only), `platformBreakdown` (per platform), `peakHour` (hour with most accepted orders, 0-based), `topItems` (top 10 by quantity across accepted orders); upsert into `DailySummary` (update `computedAt` on recompute)
- [ ] T039 [US3] Implement summary trigger in `apps/api/src/summaries/summaries.service.ts`: `triggerSessionEndSummary(restaurantId: string)` — compute Turkey local date, call `computeSummary`; schedule this via a `setInterval` or NestJS `@Cron` that checks every minute whether any restaurant's session just ended (based on `WeeklyScheduleDay.endTime` in UTC+3)
- [ ] T040 [US3] Call `summaries.service.computeSummary` from `apps/api/src/orders/orders.service.ts` after every `upsertOrder` — this ensures late-arriving syncs trigger recomputation (fire-and-forget, non-blocking via `setImmediate` or background Promise)
- [ ] T041 [US3] Implement `GET /restaurants/:id/summaries` in `apps/api/src/summaries/summaries.controller.ts`: accept `from` and `to` query params (ISO date strings); return `DailySummary` rows for date range, ordered by date desc; return `{ code: SUMMARIES_OK, data: [...] }`

**Checkpoint**: DailySummary computed and available within 10 minutes of session end. Late-sync triggers recomputation.

---

## Phase 6: User Story 4 — Operator Views Orders and Summaries (Priority: P2)

**Goal**: Admin app shows order history + daily summaries for any restaurant; operator can annotate or edit any order; all edits audit-logged.

**Independent Test**: In admin app, select a restaurant, filter order history by platform and date range → correct orders displayed. Edit an order's `operatorNotes` → audit log entry created with original and new value.

### NestJS: Order Admin Endpoints

- [ ] T042 [US4] Implement `GET /restaurants/:id/orders` in `apps/api/src/orders/orders.controller.ts`: accept `from`, `to`, `platformId`, `outcomeStatus`, `page`, `pageSize` (default 50) query params; return paginated `{ orders: [...], total, page, pageSize }` with `code: ORDERS_OK`
- [ ] T043 [US4] Implement `GET /orders/:id` in `apps/api/src/orders/orders.controller.ts`: return full order with `OrderItem[]` and `OrderAuditLog[]` joined; return `{ code: ORDER_OK, data: fullOrder }`
- [ ] T044 [US4] Implement `PATCH /orders/:id` in `apps/api/src/orders/orders.controller.ts`: accept `{ operatorId, changes: Record<string, unknown> }`; call `orders.service.editOrder`; return `{ code: ORDER_UPDATED }`
- [ ] T045 [US4] Implement `editOrder(orderId, operatorId, changes)` in `apps/api/src/orders/orders.service.ts`: within a single Prisma transaction — update `Order` fields from `changes`; for each changed field create one `OrderAuditLog` row (field, originalValue, newValue, editedAt now(), operatorId); never allow `OrderAuditLog` rows to be updated or deleted

### Admin App: Orders and Summaries UI

- [ ] T046 [P] [US4] Create `apps/admin/src/pages/orders/OrdersPage.tsx`: fetch `GET /restaurants/:id/orders` with filter controls (date range picker, platform select, status select, pagination); render order rows in a table using `packages/ui` components; add route to admin router
- [ ] T047 [P] [US4] Create `apps/admin/src/pages/orders/OrderDetailPage.tsx`: fetch `GET /orders/:id`; render item list, outcome status badge, operator notes textarea; render audit log table (field / original / new / timestamp / operator); Edit button sends `PATCH /orders/:id`; add route to admin router
- [ ] T048 [P] [US4] Create `apps/admin/src/pages/summaries/SummariesPage.tsx`: fetch `GET /restaurants/:id/summaries` with date range filter; render summary cards per day (accepted count, revenue, platform breakdown, peak hour, top items); add route to admin router
- [ ] T049 [P] [US4] Create `apps/admin/src/services/ordersApi.ts` and `apps/admin/src/services/summariesApi.ts`: typed fetch wrappers for each endpoint; handle `code` field for control flow; never branch on `message`

**Checkpoint**: Admin app shows orders + summaries. Operator can annotate and edit. Audit log grows with every edit.

---

## Phase 7: User Story 5 — Holiday & Special-Day Schedules (Priority: P2)

**Goal**: System auto-computes Turkish holiday calendar; operators review and correct entries; restaurants define standing holiday policies; operators manage per-date overrides; effective schedule preview computable on demand.

**Independent Test**: Set a "closed" policy for Ramazan Bayramı → call schedule-preview for the holiday dates → those dates show as `closed` from `holiday_policy` source. Set a WorkingDayOverride "open_normal" for one of those dates → that date now shows `open` from `override` source, overriding the policy.

### NestJS: Holiday Module

- [ ] T050 [US5] Scaffold Holidays NestJS module: run `nest generate module holidays`, `nest generate controller holidays`, `nest generate service holidays` in `apps/api/src/`
- [ ] T051 [US5] Implement `apps/api/src/holidays/holiday-calendar.service.ts`: `ensureYearComputed(year: number)` — check if all `HolidayCalendarEntry` rows for the year exist; if not, call `computeHolidayCalendar(year)` from `@repo/utils`, insert missing entries with `approvalStatus: AUTO_APPROVED`; skip entries marked `OPERATOR_OVERRIDDEN`
- [ ] T052 [US5] Implement `GET /holiday-types` in `apps/api/src/holidays/holidays.controller.ts`: return all `HolidayType` rows; code `HOLIDAY_TYPES_OK`
- [ ] T053 [US5] Implement `GET /holiday-calendar?year` in `apps/api/src/holidays/holidays.controller.ts`: call `ensureYearComputed(year)` then return all `HolidayCalendarEntry` for the year; code `HOLIDAY_CALENDAR_OK`
- [ ] T054 [US5] Implement `PUT /holiday-calendar/:id` in `apps/api/src/holidays/holidays.controller.ts`: update `startDate` and/or `endDate`, set `approvalStatus: OPERATOR_OVERRIDDEN`; code `CALENDAR_ENTRY_UPDATED`
- [ ] T055 [US5] Implement RestaurantHolidayPolicy endpoints in `apps/api/src/holidays/holidays.controller.ts`: `GET /restaurants/:id/holiday-policies` (include computed upcoming dates via `previewSchedule`), `PUT /restaurants/:id/holiday-policies/:holidayTypeId` (upsert policy), `DELETE /restaurants/:id/holiday-policies/:holidayTypeId`; codes `HOLIDAY_POLICIES_OK`, `HOLIDAY_POLICY_UPDATED`, `HOLIDAY_POLICY_DELETED`
- [ ] T056 [US5] Implement WorkingDayOverride endpoints in `apps/api/src/holidays/holidays.controller.ts`: `GET /restaurants/:id/working-day-overrides?from&to`, `POST /restaurants/:id/working-day-overrides`, `PUT /working-day-overrides/:id`, `DELETE /working-day-overrides/:id`; return `OVERRIDE_ALREADY_EXISTS` (409) on duplicate date; codes per `contracts/admin-api.md`
- [ ] T057 [US5] Implement `GET /restaurants/:id/schedule-preview?from&to` in `apps/api/src/holidays/holidays.controller.ts`: fetch all context data (weeklySchedule, overrides, policies, calendarEntries); call `previewSchedule(from, to, context)` from `@repo/utils`; return day-by-day array; code `SCHEDULE_PREVIEW_OK`; cap range at 90 days

### Admin App: Holiday Management UI

- [ ] T058 [P] [US5] Create `apps/admin/src/pages/holidays/HolidayCalendarPage.tsx`: year selector; fetch `GET /holiday-calendar?year`; display entries in a table with edit modal for operator corrections; show `approvalStatus` badge; add route
- [ ] T059 [P] [US5] Create `apps/admin/src/pages/holidays/HolidayPoliciesPage.tsx`: for a selected restaurant, fetch `GET /restaurants/:id/holiday-policies`; display policies with computed upcoming date range; add/edit/delete policy via modal; add route
- [ ] T060 [P] [US5] Create `apps/admin/src/pages/holidays/WorkingDayOverridesPage.tsx`: date-range calendar view for a restaurant; show overrides as colored markers; add/edit/delete via modal; add route
- [ ] T061 [P] [US5] Create `apps/admin/src/services/holidaysApi.ts`: typed fetch wrappers for all holiday/policy/override/schedule-preview endpoints

### Desktop App: Owner Schedule View

- [ ] T062 [US5] Create `apps/desktop/src/pages/schedule/SchedulePreviewPage.tsx`: call `GET /restaurants/:id/schedule-preview?from=today&to=+90days`; render a 90-day calendar-style list showing each date's status (open / closed / holiday), applicable holiday name if any, and effective hours; use i18n strings from `apps/desktop/src/locales/`

**Checkpoint**: Holiday calendar auto-computed, operator-correctable. Restaurant policies apply every year automatically. Schedule preview shows correct priority-chain resolution.

---

## Phase 8: User Story 7 — Restaurant & Credentials Management (Priority: P3)

**Goal**: Operators create and manage restaurant records, platform connections, and encrypted credentials from the admin app.

**Independent Test**: Create a new restaurant with 2 active platforms, provision credentials, retrieve installation key — desktop app loads correct config on startup.

### NestJS: Restaurants Module

- [ ] T063 [US7] Scaffold Restaurants NestJS module: run `nest generate module restaurants`, `nest generate controller restaurants`, `nest generate service restaurants` in `apps/api/src/`
- [ ] T064 [US7] Implement `apps/api/src/restaurants/restaurants.service.ts`: `findAll()`, `create(dto)`, `findOne(id)` (with platforms, weeklySchedule, credential status), `update(id, dto)` — manage `Restaurant` and `WeeklyScheduleDay` records via `@repo/db`
- [ ] T065 [US7] Implement Restaurant CRUD endpoints in `apps/api/src/restaurants/restaurants.controller.ts`: `GET /restaurants`, `POST /restaurants`, `GET /restaurants/:id`, `PUT /restaurants/:id`; codes `RESTAURANTS_OK`, `RESTAURANT_CREATED`, `RESTAURANT_OK`, `RESTAURANT_UPDATED`
- [ ] T066 [US7] Implement platform management in `apps/api/src/restaurants/restaurants.controller.ts`: `GET /platforms` (static seed list), `PUT /restaurants/:id/platforms/:platformId` body `{ isActive: boolean }`; codes `PLATFORMS_OK`, `PLATFORM_UPDATED`

### NestJS: Credentials Module

- [ ] T067 [US7] Scaffold Credentials NestJS module: run `nest generate module credentials`, `nest generate controller credentials`, `nest generate service credentials` in `apps/api/src/`
- [ ] T068 [US7] Implement `apps/api/src/credentials/credentials.service.ts`: `provisionInstallationKey(restaurantId)` — generate random 32-byte key, encrypt at rest with server-side KEK (env var), store as `InstallationKey`, return plaintext once; `getEncryptedInstallationKey(restaurantId)` — retrieve encrypted blob for operator recovery; `storeCredential(restaurantId, platformSlug, dto)` — upsert `PlatformCredential`
- [ ] T069 [US7] Implement credential endpoints in `apps/api/src/credentials/credentials.controller.ts`: `POST /restaurants/:id/credentials/provision` (code `INSTALLATION_KEY_PROVISIONED`), `GET /restaurants/:id/credentials/installation-key` (code `INSTALLATION_KEY_OK`), `PUT /restaurants/:id/credentials/:platformSlug` (code `CREDENTIAL_UPDATED`)

### Admin App: Restaurant & Credentials UI

- [ ] T070 [P] [US7] Create `apps/admin/src/pages/restaurants/RestaurantsListPage.tsx`: fetch `GET /restaurants`; render table with name, platform count, credential status; link to detail; "New Restaurant" button; add route
- [ ] T071 [P] [US7] Create `apps/admin/src/pages/restaurants/RestaurantDetailPage.tsx`: fetch `GET /restaurants/:id`; display weekly schedule, enabled platforms (toggle active), timer settings (edit inline); link to Credentials; add route
- [ ] T072 [P] [US7] Create `apps/admin/src/pages/restaurants/RestaurantFormPage.tsx`: create/edit form for restaurant name + 7-day weekly schedule (open/closed toggle per day, time pickers for open days) + timer settings; calls `POST` or `PUT`; add route
- [ ] T073 [P] [US7] Create `apps/admin/src/pages/restaurants/CredentialsPage.tsx`: show per-platform credential status; "Provision New Key" button → calls POST endpoint → displays key once in a modal (with copy button, warn it won't be shown again); "Upload Credential" form calls PUT; add route
- [ ] T074 [P] [US7] Create `apps/admin/src/services/restaurantsApi.ts` and `apps/admin/src/services/credentialsApi.ts`: typed fetch wrappers for all restaurant and credential endpoints

**Checkpoint**: Operators can onboard a restaurant end-to-end: create record → enable platforms → provision key → desktop app loads config on startup.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, build verification, integration tests for critical paths.

- [ ] T075 [P] Verify all NestJS endpoints return `{ code: ResponseCode; data?: unknown; message: string }` — check that the global response interceptor (T018) covers all new controllers; add explicit `ResponseCode` usage to any endpoint returning a bare object
- [ ] T076 [P] Confirm all Prisma indexes from `data-model.md` are present in the migrated schema: `@@index([restaurantId, receivedAt])` on Order, `@@index([restaurantId, outcomeStatus])` on Order, `@@index([year])` on HolidayCalendarEntry, `@@index([restaurantId, date])` on WorkingDayOverride and DailySummary — run `pnpm --filter @repo/db db:migrate` if any are missing
- [ ] T077 Run full monorepo build + lint + type-check: `pnpm build && pnpm lint && pnpm check-types` — fix all errors before considering any phase complete
- [ ] T078 [P] Write integration test for critical path in `apps/api/src/orders/orders.service.spec.ts`: POST same order twice → verify one DB row; POST then PATCH status → verify transition recorded; PATCH with wrong status → verify `INVALID_STATUS_TRANSITION` returned
- [ ] T079 [P] Write integration test for ManualReviewQueue persistence in `apps/desktop/src-tauri/src/local_db/manual_review_queue.rs` (Rust test): enqueue → verify row exists → call `clear_expired` after setting past `expires_at` → verify row removed and ID returned

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)       → no dependencies, start immediately
Phase 2 (Foundational) → depends on Phase 1 complete — BLOCKS all user stories
Phase 3 (US1, P1)     → depends on Phase 2 (specifically T015+T016 Tauri SQLite, T012 schedule.ts)
Phase 4 (US2, P1)     → depends on Phase 2 (T005+T006 Prisma schema, T017 ResponseCode)
Phase 5 (US3, P2)     → depends on Phase 4 (orders must exist for summaries to compute)
Phase 6 (US4, P2)     → depends on Phase 4 (orders API must exist) + Phase 5 (summaries API)
Phase 7 (US5, P2)     → depends on Phase 2 (T011 @repo/utils schedule.ts, T005 Prisma entities)
Phase 8 (US7, P3)     → depends on Phase 2 (T005 Prisma entities)
Phase N (Polish)       → depends on all story phases complete
```

### User Story Dependencies

| Story    | Depends On         | Can Start When                                                 |
| -------- | ------------------ | -------------------------------------------------------------- |
| US1 (P1) | Phase 2 complete   | T015+T016 (Tauri SQLite) + T012 (@repo/utils schedule.ts) done |
| US2 (P1) | Phase 2 complete   | T005 (Prisma migration) + T017 (ResponseCode) done             |
| US3 (P2) | US2 complete       | Orders table populated, upsertOrder working                    |
| US4 (P2) | US2 + US3 complete | Orders + Summaries APIs exist                                  |
| US5 (P2) | Phase 2 complete   | T011 (@repo/utils) + T005 (holiday entities) done              |
| US7 (P3) | Phase 2 complete   | T005 (Restaurant entity) done                                  |

### Within Each User Story

- Rust commands before TypeScript hooks that call them
- NestJS service before controller that uses it
- NestJS endpoints before admin app pages that call them
- Seed data (T007) before any endpoint that reads seed tables

---

## Parallel Opportunities

### Phase 2 Parallel Cluster

```
T005 (Prisma schema) → T006 (seed file) run together
T009, T010 (holiday-types, hijri wrappers) run together, then T011 (calendar), then T012 (schedule)
T014 (Tauri SQL migration file) and T017 (ResponseCode enum) run together
T015, T016 (Tauri plugin registration) after T014
```

### Phase 3 Parallel Cluster (US1)

```
T020, T021, T022 (Rust local_db commands) all [P] — run together
T026 (TypeScript hook) after T020
T027 (Queue UI) after T026
T023, T024, T025 (order handler + platform_ws) sequentially
```

### Phase 4 Parallel Cluster (US2)

```
T028→T030 (ConfigSync module) and T031→T034 (Orders module) run in parallel tracks
T035+T036 (Rust sync task) after T032+T033
```

### Phase 6 Parallel Cluster (US4)

```
T046, T047, T048 (admin pages) all [P] — run in parallel after T042+T043+T044 complete
T049 (API service wrappers) [P] — run with admin pages
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Phase 1 + Phase 2 → Foundation green
2. Phase 3 (US1) → Local queue functional, orders held safely
3. Phase 4 (US2) → Orders reach server, sync works
4. **STOP and VALIDATE**: US1 + US2 independently testable → demo-able MVP

### Incremental Delivery After MVP

5. Phase 5 (US3) → Daily summaries available
6. Phase 6 (US4) → Admin can view order history + summaries
7. Phase 7 (US5) → Holiday scheduling live
8. Phase 8 (US7) → Full restaurant onboarding from admin app

### Parallel Team Strategy (if applicable)

After Phase 2 complete:

- **Track A**: US1 (Tauri/Rust local queue) → US2 (desktop sync Rust)
- **Track B**: US2 (NestJS orders API) → US3 (summaries) → US4 (admin views)
- **Track C**: US5 (holiday system) — fully independent of US1–US4
- **Track D**: US7 (restaurant CRUD) — fully independent

---

## Notes

- No test tasks generated (not requested in spec). Add `[P] [USN] Write tests for ...` tasks if TDD approach is adopted.
- [P] tasks touch different files and have no unresolved dependencies — safe to run in parallel.
- Each story phase is independently testable per the **Independent Test** criteria.
- Phase-gate rule (constitution): after each phase, run `pnpm build && pnpm lint && pnpm check-types`, wait for pass, present summary, get approval before next phase.
- Commit after each completed phase per constitution.
- All i18n strings for admin and desktop UI pages must use locale files via `packages/i18n` — no hardcoded user-facing text.
- All user-facing UI must use `packages/ui` components — no one-off styled elements.
- Total tasks: T001–T079 (79 tasks across 9 phases).
