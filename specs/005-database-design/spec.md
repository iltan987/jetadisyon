# Feature Specification: Database Design

**Feature Branch**: `005-database-design`
**Created**: 2026-04-17
**Status**: Draft
**Input**: User description: "work on database design. minimal. based on @PRODUCT.md. some data should be in server, some doesn't have to be in server and can be local. should be designed carefully. License and auth related stuff are not a topic of this spec. They are big and important concerns, so will work on them later. in admin app, i want some operations implemented as well"

## Clarifications

### Session 2026-04-17

- Q: Should the server or the desktop app connect to delivery platform websockets? → A: Desktop app (Tauri Rust backend) connects directly to platform websockets. Server has no real-time platform connections.
- Q: Should individual order records sync to the server? → A: Yes — orders are stored server-side for logging, backup, server-side summary generation, and admin access.
- Q: How should platform credentials be stored? → A: Server stores encrypted credential blobs + installation key (encrypted at rest). Server cannot read credentials without the installation key provided by the restaurant owner.
- Q: Should user/account management be server-side or local? → A: Server-side, deferred to the auth spec. This spec uses a placeholder restaurant identifier.
- Q: When an order in the manual review queue is rejected or times out, is that recorded server-side? → A: Yes — all order outcomes (accepted, manually accepted, timed out, cancelled by platform) are recorded on the server. Platform-initiated cancellations must be captured from the websocket and recorded. All server sync is non-blocking and runs silently in the background.
- Q: What is the default auto-accept behavior — instant or after a timer window? → A: Instant by default. Auto-accept fires immediately when an order arrives and conditions are met. A configurable pre-accept delay is available per restaurant but off by default. Manual review timeout defaults to 2 minutes.
- Q: What level of write access do operators have to Order records in the admin app? → A: Annotate by default (free-text notes), plus full field editing when a specific issue demands it (broken record, customer request). All operator edits must be audited — original value, new value, timestamp, and operator identity must be recorded.
- Q: Where is restaurant timezone stored? → A: Not needed as a per-restaurant field. The application targets Turkey exclusively; all timestamps and session boundaries use Turkey time (UTC+3, no DST) as a system-wide constant.
- Q: How should holidays and variable working days be handled? → A: A per-date override layer sits on top of the base weekly schedule. Each override can mark a specific date as closed, custom hours, or explicitly open. A system-level Turkish holiday reference calendar helps operators bulk-configure overrides but never automatically affects any restaurant's schedule. Restaurants are always in full control.
- Q: Should computed holiday dates require operator approval, and can restaurants define standing holiday policies? → A: Yes to both. Computed holiday calendar entries are auto-approved by default but operators can correct them (e.g., if the official Turkish announcement differs from the algorithm). Restaurants define standing policies per holiday type ("closed on Ramazan Bayramı every year", "08:00–12:00 on 30 Ağustos every year", "closed during the month of Ramazan"). The system auto-generates WorkingDayOverrides from these policies each year when the calendar is finalized. Operators can still edit individual overrides after generation.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Restaurant App Holds Unacceptable Orders Locally (Priority: P1)

The restaurant owner's desktop app holds incoming orders in a local manual review queue when auto-accept cannot proceed (printer offline or connection lost). The queue survives app restarts without losing any entries.

**Why this priority**: The manual review queue is the safety net that prevents lost revenue when conditions for auto-accept aren't met. Without local persistence, orders disappear silently after a crash or restart.

**Independent Test**: Simulate printer going offline, trigger two incoming orders, close and reopen the app — both orders must still appear in the manual review queue with full details intact.

**Acceptance Scenarios**:

1. **Given** the printer is offline, **When** an order arrives, **Then** it is stored in the local manual review queue and remains visible after an app restart.
2. **Given** connectivity is restored after an outage, **When** the owner opens the manual review queue, **Then** all held orders are listed in arrival order with no duplicates.

---

### User Story 2 - Desktop App Syncs Accepted Orders to Server (Priority: P1)

Each order auto-accepted by the desktop app is synced to the server. If the server is unreachable at that moment, the order is held in a local pending sync queue and sent as soon as connectivity is restored.

**Why this priority**: Server-side order records are the foundation for daily summaries, admin visibility, and order history. Unreliable sync leaves the server with incomplete data.

**Independent Test**: Disconnect server connectivity, auto-accept 5 orders, reconnect — all 5 orders must appear on the server with correct details and in arrival sequence.

**Acceptance Scenarios**:

1. **Given** the server is reachable, **When** an order is auto-accepted, **Then** a full order record (platform, items, value, timestamps) is created on the server within seconds.
2. **Given** the server is unreachable, **When** an order is auto-accepted, **Then** it is stored locally in a pending sync queue and synced automatically when connectivity is restored.
3. **Given** a pending sync queue exists, **When** the same platform order ID is submitted twice, **Then** only one record is created on the server.

---

### User Story 3 - Server Generates Daily Summaries (Priority: P2)

At the end of each restaurant's configured working session, the server automatically computes a daily summary from stored order records for that restaurant and date, making it available in the admin app.

**Why this priority**: Server-side summary generation is more reliable than client-computed — it uses the complete, deduplicated order history and does not depend on the desktop app being online at session end.

**Independent Test**: With 10 orders stored for a restaurant on a given date, trigger end-of-session — a summary must be computed with correct totals, per-platform breakdown, peak hour, and top items.

**Acceptance Scenarios**:

1. **Given** a working session ends, **When** the server detects the session window has closed, **Then** a daily summary is computed from order records for that restaurant and date.
2. **Given** a summary already exists for a date, **When** new orders arrive late (e.g., delayed sync), **Then** the summary is recomputed rather than duplicated.

---

### User Story 4 - Operator Views Restaurant Orders and Summaries (Priority: P2)

A JetAdisyon operator uses the admin app to view order history and daily summaries for any restaurant, enabling performance monitoring and customer support.

**Why this priority**: The admin app is the operator's primary oversight tool. Without order-level and summary-level visibility, operators cannot support restaurants effectively.

**Independent Test**: In the admin app, select a restaurant and filter order history by a date range across two platforms — all order records must be present with correct platform attribution and item details.

**Acceptance Scenarios**:

1. **Given** orders exist for a restaurant, **When** an operator selects that restaurant, **Then** order history is viewable with filtering by date range and delivery platform.
2. **Given** daily summaries exist, **When** the operator views summary history, **Then** summaries are listed by date with key metrics visible.
3. **Given** a restaurant is selected, **When** the operator views its profile, **Then** connected platforms, working hours, and credential status (configured / not configured) are displayed.

---

### User Story 5 - Operator Configures Holiday and Special-Day Schedules (Priority: P2)

A JetAdisyon operator sets working hour overrides for specific calendar dates — closing a restaurant for Eid, shortening hours for a national holiday, or marking a holiday as a normal working day. The system automatically computes Turkish public holidays (including lunar-calendar events like Ramazan and Kurban Bayramı) and presents them alongside the restaurant's schedule so the operator only needs to decide what each restaurant does on those days.

**Why this priority**: Turkish holidays include lunar-calendar events (Eid, Ramadan) that shift every year. Without explicit date-level overrides, the weekly schedule will accept orders on days the restaurant is closed — creating courier dispatches with no one to fulfill them.

**Independent Test**: Set a working hour override of 10:00–15:00 for a specific future date, then simulate an order arriving at 16:00 on that date — the desktop app must not auto-accept it.

**Acceptance Scenarios**:

1. **Given** the operator sets a "closed" override for a specific date, **When** that date arrives and an order comes in, **Then** the desktop app treats the restaurant as outside working hours and does not auto-accept.
2. **Given** the operator sets custom hours (10:00–15:00) for a specific date, **When** an order arrives at 16:00 that day, **Then** the desktop app does not auto-accept it; orders within 10:00–15:00 proceed normally.
3. **Given** a date is marked in the holiday calendar, **When** the operator views a restaurant's schedule for that date, **Then** the holiday is visible as a reference but the restaurant's override (or weekly default) is what the system actually enforces.
4. **Given** the operator has not set any override for a public holiday date, **When** that date arrives, **Then** the system falls back to the weekly schedule — it does not automatically close the restaurant.

---

### User Story 7 - Operator Manages Restaurants and Credentials (Priority: P3)

A JetAdisyon operator creates and updates restaurant records in the admin app — onboarding a new restaurant, adjusting working hours, changing platform connections, or managing encrypted platform credentials.

**Why this priority**: Operators need central control over restaurant configuration; without it, every change requires direct database or developer access.

**Independent Test**: Create a new restaurant record with a weekly schedule and two enabled platforms, provision credentials for each platform — confirm the desktop app loads the correct configuration on startup.

**Acceptance Scenarios**:

1. **Given** a new restaurant is onboarded, **When** the operator creates a restaurant record, **Then** the record is stored with name, working hours, and enabled platforms.
2. **Given** a restaurant's working hours change, **When** the operator updates the record, **Then** the desktop app picks up the new schedule within one sync cycle.
3. **Given** credential provisioning is needed, **When** the operator initiates it, **Then** an installation key is generated and displayed once for the operator to share with the restaurant owner.

---

### Edge Cases

- What happens when an order is auto-accepted and printed, but the server sync fails? It is held in a local pending sync queue and retried automatically. It is NOT added to the manual review queue — it was already accepted and printed.
- What happens when the desktop app cannot detect the end of working hours (e.g., it was offline)? The server computes the summary when it detects the session window has closed based on configured working hours.
- What happens if the same platform order ID is synced to the server twice? The server deduplicates by platform order ID + restaurant, storing only one record.
- What happens when a configurable pre-accept delay is set and conditions fail mid-window? The order transitions to the manual review queue for owner intervention.
- What happens when the manual accept timer expires while the order is awaiting owner review? The order is marked as timed out, removed from the queue, and the event is recorded server-side as a lost order.
- What happens when the platform sends a cancellation event (customer cancelled, platform cancelled) for an order currently in the manual review queue? The order is removed from the queue and the cancellation is recorded server-side.
- What happens when the platform sends a cancellation event for an order that was already accepted and synced? The server record must be updated to reflect the cancellation; the admin should be able to see both the acceptance and the subsequent cancellation.
- What happens when restaurant configuration is changed in the admin app while the desktop app is running? The desktop app detects the change on its next sync cycle without requiring a restart.
- What happens when a working day override is added mid-day (e.g., operator closes the restaurant at 14:00 for the rest of the day)? The desktop app applies the change on its next config sync and stops auto-accepting from that point.
- What happens if no override is set for a public holiday? The weekly schedule applies — the system never enforces closures automatically.
- What if a restaurant has both a "closed" override and an active websocket order arrives? The desktop app must not auto-accept; the order should be visible in the manual review queue if the owner is present and chooses to handle it, or silently ignored if no override-accept policy is configured.
- What happens if local storage becomes corrupted? The app fails loudly with a visible error rather than silently losing queued data.

## Requirements _(mandatory)_

### Functional Requirements

**Order Reception & Acceptance**

- **FR-001**: The desktop app MUST connect directly to each enabled delivery platform's real-time order feed via the Rust backend process; the server MUST NOT connect to delivery platform feeds.
- **FR-002**: By default, when an order arrives and auto-accept conditions are met (printer online, connection stable, within working hours), the desktop app MUST accept it instantly. A configurable pre-accept delay window MAY be set per restaurant (e.g., 30 seconds) to allow brief review before auto-acceptance.
- **FR-003**: When auto-accept conditions are NOT met, the order MUST be placed in the local manual review queue for owner action. A configurable manual-accept timer MUST be applied (default: 2 minutes); if the owner does not act within this window, the order is marked as timed out and removed from the queue.
- **FR-004**: The desktop app MUST handle order cancellation events received from the platform websocket. If the order is in the manual review queue, it MUST be removed. If the order was already accepted, the cancellation MUST be recorded as a subsequent status change.
- **FR-005**: The desktop app MUST maintain a local manual review queue persisted across process restarts and machine reboots.

**Order Sync & Recording**

- **FR-006**: The desktop app MUST sync every order outcome to the server — accepted, manually accepted, timed out, cancelled by platform — as a record including the outcome status and timestamp. All outcomes are recorded, not only successful acceptances.
- **FR-007**: All server sync operations MUST run in a background process and MUST NOT block order acceptance, printing, or any part of the owner-facing interface.
- **FR-008**: If the server is unreachable, outcome records MUST be held in a local pending sync queue and retried automatically when connectivity is restored.
- **FR-009**: The server MUST store each order record with: restaurant identifier, delivery platform, platform-assigned order ID, item list (name, quantity, unit price per item), total value, received timestamp, outcome status, and outcome timestamp.
- **FR-010**: The server MUST deduplicate orders by platform order ID + restaurant identifier. Submitting the same order twice MUST produce one record; subsequent status updates (e.g., cancellation after acceptance) MUST update the existing record rather than creating a new one.

**Configuration & Credentials**

- **FR-011**: The server MUST store restaurant records containing: name, weekly working hours schedule (day-of-week, start time, end time in local timezone), enabled delivery platforms, and configurable acceptance timer durations (pre-accept delay, manual-accept timeout).
- **FR-012**: The server MUST store an encrypted platform credential blob and derivation salt for each restaurant-platform pair. The server MUST NOT be able to derive the plaintext credentials without the installation key.
- **FR-013**: The server MUST store the restaurant's installation key encrypted at rest, retrievable only by operators via the admin app for credential recovery.
- **FR-014**: The desktop app MUST fetch and cache the restaurant's server-side configuration on startup and refresh it periodically. Cached configuration MUST be used to drive auto-accept decisions when the server is temporarily unreachable.

**Summaries**

- **FR-015**: The server MUST automatically compute a daily summary for each restaurant at the end of its configured working session, derived from the stored order records for that restaurant and calendar date. Only accepted and manually accepted orders count toward revenue totals; timed-out and cancelled orders are excluded from revenue but included in aggregate counts.
- **FR-016**: The server MUST recompute a daily summary if new orders arrive after the initial computation (late sync from desktop app).

**Schedule Overrides & Holiday Calendar**

- **FR-021**: The server MUST support per-date working hour overrides per restaurant. Each override applies to exactly one calendar date and has one of three statuses: `closed` (not working), `custom_hours` (working with a specific start and end time), or `open_normal` (working on normal weekly hours, used to explicitly mark a holiday as a working day).
- **FR-022**: When determining the effective schedule for a given date, the system MUST resolve using this priority order: (1) a WorkingDayOverride for that exact date — highest priority, manual exception; (2) a RestaurantHolidayPolicy matching a HolidayCalendarEntry that covers that date — standing yearly rule; (3) the base weekly schedule — fallback.
- **FR-023**: RestaurantHolidayPolicy records apply to all future years automatically without any per-year data entry. The system MUST NOT require operators to re-enter or regenerate holiday rules each year.
- **FR-024**: The system MUST automatically compute HolidayCalendarEntry records for each year without operator input. Fixed national holidays MUST be derived from annual rules. Lunar holidays (the month of Ramazan, Ramazan Bayramı, Kurban Bayramı) MUST be derived from the Islamic Hijri calendar. All generated entries start with status `auto_approved`.
- **FR-025**: The admin app MUST allow operators to review computed HolidayCalendarEntry records and correct any entry's dates before the year's overrides are generated. A corrected entry MUST be marked `operator_overridden` and MUST take precedence over any future recomputation for that year.
- **FR-026**: The admin app MUST allow operators to define a RestaurantHolidayPolicy for any restaurant and HolidayType combination (closed, custom hours, or open normal).
- **FR-027**: The system MUST NOT require per-year data storage or regeneration for holiday policies. Effective schedules MUST be computed on demand from the combination of RestaurantHolidayPolicy, HolidayCalendarEntry, and WorkingDayOverride records.
- **FR-028**: The admin app MUST allow operators to view, create, update, and delete WorkingDayOverride records for specific dates on any restaurant. These are manual exceptions only — they are not generated automatically.
- **FR-029**: The admin app MUST present a restaurant's holiday policies alongside the computed dates for those holidays — showing exact date ranges, days of the week, and effective hours — so operators and restaurant owners can see what the schedule means in concrete calendar terms (e.g., "Ramazan Bayramı: 29 Mart – 1 Nisan 2025, Cumartesi–Salı → Kapalı"). This is a derived view computed from HolidayCalendarEntry + RestaurantHolidayPolicy; no additional data storage is required.
- **FR-030**: The desktop app MUST provide restaurant owners with a view of their upcoming holiday schedule for a configurable future window (e.g., next 30 or 90 days), showing each affected date, the applicable holiday name, and the effective hours or closure status — so owners can plan operations without needing to know the holiday calendar themselves.

**Admin App**

- **FR-017**: The admin app MUST allow operators to create, view, and update restaurant records (name, working hours, platform connections, acceptance timer settings).
- **FR-018**: The admin app MUST allow operators to view order history for any restaurant, filterable by date range, delivery platform, and outcome status.
- **FR-018a**: The admin app MUST allow operators to add free-text notes to any order record.
- **FR-018b**: The admin app MUST allow operators to edit any field of an order record when required (e.g., broken data, specific customer support case). Every operator edit MUST be recorded in an audit log capturing: the field changed, the original value, the new value, the timestamp, and the operator's identifier.
- **FR-019**: The admin app MUST allow operators to view daily summaries for any restaurant, filterable by date range.
- **FR-020**: The admin app MUST allow operators to initiate platform credential provisioning, generating an installation key displayed once for the operator to share with the restaurant owner.

### Key Entities

**Server-Side Entities:**

- **Restaurant**: A registered restaurant. Holds name, weekly working hours schedule, configurable pre-accept delay window (default: instant), and configurable manual-accept timeout (default: 2 minutes). Auth and license data are excluded from this spec.
- **DeliveryPlatform**: Reference list of the supported food delivery platforms (Yemeksepeti, Trendyol Go, Getir, Migros Yemek). Static, operator-managed.
- **RestaurantPlatform**: Links a restaurant to an enabled delivery platform, recording whether the connection is currently active.
- **PlatformCredential**: Encrypted platform login credential for one restaurant-platform pair. Stores ciphertext blob, derivation salt, and encryption algorithm identifier. Server cannot read plaintext.
- **InstallationKey**: The restaurant's installation key, stored encrypted at rest on the server. Retrievable by operators through the admin app for credential recovery.
- **Order**: One delivery order and its outcome. Stores restaurant, platform, platform-assigned order ID (deduplication key), item list, total value, received timestamp, outcome status, outcome timestamp, and operator notes. Outcome status is one of: `auto_accepted`, `manually_accepted`, `timed_out`, `cancelled_by_platform`. Status may transition (e.g., `auto_accepted` → `cancelled_by_platform` if the platform cancels after acceptance). Operator-editable; all changes are recorded in an audit log.
- **OrderAuditLog**: Immutable record of every operator edit to an Order. Captures the field changed, original value, new value, edit timestamp, and operator identifier. Written on every operator-initiated change; never modified after creation.
- **OrderItem**: One line item within an Order. Stores item name, quantity, and unit price.
- **HolidayType**: A named recurring holiday or period observed in Turkey. Covers: fixed national holidays (e.g., 29 Ekim, 23 Nisan), the month of Ramazan, Ramazan Bayramı (3 days), and Kurban Bayramı (4 days). Each type has a category: `fixed_date` or `lunar`. Stored once as a permanent reference; does not change year to year.
- **HolidayCalendarEntry**: One occurrence of a HolidayType for a specific year — stored for caching and operator review. For `fixed_date` types, derived from the annual rule. For `lunar` types, computed from the Islamic Hijri calendar. Each entry has an approval status: `auto_approved` (default) or `operator_overridden` (operator corrected the date). Operators may correct entries if the algorithm diverges from the official announcement.
- **RestaurantHolidayPolicy**: A restaurant's standing rule for one HolidayType — stored as a single row per (restaurant, holiday type). Defines what the restaurant does every year on that holiday: `closed`, `custom_hours` (with start and end time), or `open_normal`. Applies automatically to every year without any per-year data entry. The operator sees a simple list: "Ramazan → closed, 30 Ağustos → 08:00–12:00."
- **WorkingDayOverride**: A manual exception for one restaurant on one specific calendar date. Used only when the operator needs to deviate from both the weekly schedule and the standing RestaurantHolidayPolicy for that exact date. Status is one of: `closed`, `custom_hours`, or `open_normal`. Highest priority in schedule resolution — always takes precedence.
- **DailySummary**: Server-computed daily record for one restaurant on one calendar day. Contains: accepted order count, timed-out/cancelled order count, total revenue (accepted orders only), per-platform breakdown, peak activity hour, and top-selling items by quantity. Recomputed when late-arriving orders change the totals.

**Local-Only Entities (desktop app only, never synced to server):**

- **ManualReviewQueue**: Orders held locally because auto-accept conditions were not met. Each entry tracks a countdown timer (the configurable manual-accept timeout). Persisted until the owner accepts, the timer expires, or the platform cancels the order.
- **PendingOrderSync**: Order outcome records awaiting a confirmed server sync. Retried automatically on reconnection. Cleared once the server confirms receipt.
- **LocalConfig**: Cached copy of the restaurant's server-side configuration including working hours, enabled platforms, acceptance timer settings, and upcoming working day overrides. Used to drive auto-accept decisions when the server is temporarily unreachable. Overrides for future dates are cached proactively so the app can enforce them without a server round-trip.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Each auto-accepted order is available on the server within 30 seconds of acceptance, assuming connectivity is present.
- **SC-002**: Orders accepted during a connectivity outage are synced to the server within 60 seconds of connectivity being restored, with no data loss.
- **SC-003**: Orders held in the manual review queue are never lost across app crashes, restarts, or machine reboots.
- **SC-004**: Daily summaries are computed and available in the admin app within 10 minutes of the restaurant's configured working session end time.
- **SC-005**: Restaurant configuration changes made in the admin app are reflected in the desktop app within one sync cycle (target: within 5 minutes).
- **SC-006**: Operators can view order history and daily summaries for any restaurant by date range without accessing the restaurant's local machine.
- **SC-007**: The admin app supports managing up to 500 restaurant records and retrieving order history across 12 months without observable performance degradation.
- **SC-008**: Server sync operations complete in the background without any measurable delay to order acceptance, printer output, or UI responsiveness — the owner-facing flow is never blocked waiting for the server.

## Assumptions

- License and authentication are explicitly out of scope. Restaurant identity in this spec is represented by a placeholder identifier, to be replaced when the auth spec is implemented.
- User accounts (owner and staff) are server-side; details deferred to the auth spec.
- "Admin app" refers to a web-based operator dashboard used exclusively by JetAdisyon staff; restaurant owners do not access it.
- Restaurant owners interact with the system only through the desktop app; they do not access the server directly.
- The desktop app (Tauri) opens delivery platform websocket connections from the Rust backend process, not from the frontend JavaScript layer.
- The desktop app syncs configuration from the server on startup and at a periodic interval (assumed default: every 5 minutes).
- The application targets Turkey exclusively. All timestamps and session boundary calculations use Turkey time (UTC+3, no daylight saving) as a system-wide constant. No per-restaurant timezone field is needed.
- Holiday date computation (Hijri calendar derivation for lunar holidays, fixed national holiday rules, and effective schedule resolution) is a shared, stateless capability with no external dependencies. It MUST be implemented once and reused consistently across both the server and the desktop app; the same inputs MUST always produce the same dates in both contexts.
- Working hours are defined as a weekly schedule — one entry per day of the week, each with a start time and end time in Turkey local time (UTC+3).
- A working session corresponds to the period from working hours start to end for one calendar day.
- The installation key is generated once during restaurant onboarding, displayed to the operator once, and shared with the restaurant owner out-of-band.
- If an installation key is lost, the restaurant owner must re-enter platform credentials from scratch; there is no automatic decryption fallback without the key.
- Order records are retained on the server indefinitely in this initial version; a data retention policy is deferred to a future spec.
- Multi-branch support (one owner, multiple restaurants) is out of scope for this spec.
- The admin app is a separate web application from the desktop app, sharing the same server-side data store.
