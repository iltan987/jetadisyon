<!--
  Sync Impact Report
  ==================
  Version change: 1.0.0 → 1.1.0 (MINOR — new principle added,
  existing principle materially expanded)
  
  Modified principles:
    - III. User Experience Consistency — added i18n rules
      (all strings via centralized locale layer, no hardcoded
      text in components/services)
  
  Added principles:
    - VI. API Response Contract
  
  Removed sections: (none)
  
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
    - .specify/templates/commands/*.md ✅ no command files exist
  
  Follow-up TODOs: none
-->

# JetAdisyon Constitution

## Core Principles

### I. Code Quality & Type Safety

- All TypeScript code MUST use strict mode with no `any` types
  unless explicitly justified with a comment explaining why.
- Rust code MUST compile with zero warnings. Clippy lints MUST
  pass without suppression unless justified inline.
- Shared configurations (ESLint, TypeScript, Prettier) from
  `packages/` MUST be used by all apps — no per-app overrides
  that weaken rules.
- Every module MUST have a single, clear responsibility. Utility
  grab-bags and god-modules are prohibited.
- All code MUST pass lint and format checks before commit.
  Pre-commit hooks enforce this gate.

### II. Testing Standards

- Critical paths (order acceptance, printer communication,
  platform connectivity) MUST have integration tests that
  exercise real behavior, not mocks of the subsystem under test.
- Unit tests are appropriate for pure logic (data transforms,
  validation, formatting). Do not unit-test framework glue.
- Tests MUST be deterministic. No reliance on timing, network,
  or external service availability unless the test is explicitly
  an end-to-end smoke test.
- Test names MUST describe the behavior being verified, not the
  method being called (e.g., "rejects order when printer is
  offline" not "test handleOrder").
- When a bug is fixed, a regression test MUST accompany the fix.

### III. User Experience Consistency

- All user-facing UI MUST use components from `packages/ui`.
  One-off styled elements in app code are prohibited unless the
  component is app-specific and cannot be generalized.
- All user-facing strings MUST be sourced from centralized
  locale files via the i18n layer (`packages/i18n`). No
  hardcoded user-facing text in components or services.
- The default (and initially only) locale is Turkish. The i18n
  infrastructure MUST support adding languages without code
  changes — only new locale JSON files.
- All user-facing text MUST use clear, non-technical language
  appropriate for restaurant staff.
- Audio alerts MUST be distinct per event type (new order,
  printer failure, connection loss) so kitchen staff can
  differentiate without looking at the screen.
- The desktop app MUST provide immediate visual feedback for
  every user action — no silent failures or ambiguous states.
- The admin dashboard and desktop app MUST share consistent
  visual patterns (colors, spacing, typography) via the shared
  UI library.

### IV. Performance & Efficiency

- Order acceptance MUST complete within 3 seconds of receiving
  the order event from any platform. This is the hard latency
  ceiling — exceeding it risks platform penalties.
- The desktop app MUST remain responsive (no UI freezes) during
  order processing, printing, and network operations. All I/O
  MUST be non-blocking on the UI thread.
- Memory usage MUST remain stable over a full working day
  (12+ hours). No unbounded growth in queues, caches, or
  event listeners.
- Startup time (from launch to ready-to-accept) MUST be under
  10 seconds on the minimum supported hardware.
- API responses from the NestJS backend MUST return within
  500ms at p95 for all CRUD operations.

### V. Safety-First Order Processing

- The application MUST NOT auto-accept an order when the
  printer is offline or unreachable. This is non-negotiable —
  an accepted order with no kitchen ticket is worse than a
  missed order.
- The application MUST NOT auto-accept orders when the
  connection to the order relay is interrupted. Orders arriving
  during interruption MUST be queued for manual review.
- When a safety condition is violated (printer down, connection
  lost), the application MUST immediately alert the owner with
  both a visible warning and a distinct audio alert.
- Recovery from a safety violation MUST require explicit owner
  acknowledgment before resuming auto-accept mode.
- Working hours configuration MUST be respected absolutely.
  Outside working hours, no orders are accepted regardless of
  other conditions.

### VI. API Response Contract

- Every API response — success or error — MUST include a
  machine-readable `code` field (e.g., `ORDER_ACCEPTED`,
  `PRINTER_OFFLINE`, `LICENSE_EXPIRED`).
- Response codes MUST be defined as shared TypeScript enums in
  a common package so both backend and frontend reference the
  same source of truth.
- The `message` field is an English developer-friendly
  description for logging and debugging. It MUST NOT be
  displayed to users.
- Frontend MUST map response codes to translated strings via
  the i18n layer (e.g., `t(`api.${code}`)`) — never branch
  on or display raw `message` content.
- Frontend MUST NOT use string equality checks on API
  responses for control flow. All branching logic MUST use
  the typed `code` field.
- Adding a new response code MUST include: (1) the enum
  entry in the shared package, (2) a translation key in
  every supported locale file.

## Reliability & Operational Safety

- All platform integrations (Yemeksepeti, Trendyol Go, Getir,
  Migros Yemek) MUST implement health checks that run at least
  every 30 seconds during working hours.
- Connection state transitions (online to offline and back)
  MUST be logged with timestamps for debugging and daily
  summary generation.
- The application MUST handle temporary internet outages
  gracefully — local operations (printing queued orders,
  displaying status) MUST continue without interruption.
- License verification failure on startup MUST show a clear
  Turkish-language message explaining the issue and how to
  resolve it. The application MUST NOT crash silently.
- All error states MUST be recoverable without restarting the
  application. If a restart is truly required, the application
  MUST state this explicitly.

## Development Workflow

- All work MUST happen on feature branches. Direct commits to
  `main` are prohibited.
- Turborepo tasks (`build`, `lint`, `check-types`, `test`)
  MUST pass in CI before a branch can merge.
- Changes to shared packages (`packages/ui`,
  `packages/eslint-config`, `packages/typescript-config`) MUST
  be tested against all consuming apps before merge.
- Tauri desktop builds MUST be verified on Windows before
  release — this is the only supported deployment target.
- Dependency updates MUST be reviewed for breaking changes.
  Automated dependency bumps MUST NOT be merged without CI
  passing.

## Governance

- This constitution is the authoritative source of project
  standards. When a practice conflicts with a principle stated
  here, the constitution takes precedence.
- Amendments require: (1) a written proposal describing the
  change and its rationale, (2) an update to this document with
  version bump, and (3) a review of all dependent templates for
  consistency.
- Version follows semantic versioning: MAJOR for principle
  removals or incompatible redefinitions, MINOR for new
  principles or material expansions, PATCH for clarifications
  and wording fixes.
- All code reviews SHOULD verify compliance with these
  principles. Reviewers MUST flag violations rather than
  silently approving.

**Version**: 1.1.0 | **Ratified**: 2026-04-04 | **Last Amended**: 2026-04-04
