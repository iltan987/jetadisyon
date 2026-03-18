---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - product-brief-jetadisyon-2026-03-07.md
  - prd.md
  - ux-design-specification.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-08'
project_name: 'JetAdisyon'
user_name: 'iltan'
date: '2026-03-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
70 FRs across 16 categories. The core architectural load falls on:
- **Marketplace Integration (FR11-FR19)** — webhook ingestion, auto-accept with retry, connection health monitoring, order queuing during outages. This is the critical path and the most architecturally complex area.
- **Real-Time Communication (FR47) + Order Management (FR23-FR29)** — server-side event processing pushed to browser via WebSocket/SSE. Orders, cancellations, and modifications all flow through the same real-time pipeline.
- **Analytics Dashboard (FR61-FR69)** — geospatial data storage, heat map rendering, overlay calculations, date filtering. Requires geocoding and aggregation queries.
- **Authentication & Access Control (FR1-FR10)** — multi-tenant RBAC with three roles. Tenant isolation enforced at every layer.
- **Audio Alert System (FR30-FR34) + Receipt Printing (FR35-FR38)** — browser-side features driven by server-side events. Decoupled feature toggles (FR39-FR41) mean any combination must work.
- **Admin Operations (FR48-FR51)** — cross-tenant visibility, per-tenant diagnostics, license lifecycle management.
- **Observability (FR57-FR60)** — event logging, latency tracking, error recording, staff action audit trail.

**Non-Functional Requirements:**
31 NFRs that will drive architectural decisions:
- **Performance:** <2s order processing latency (NFR1), <500ms real-time push (NFR2), <3s dashboard load (NFR3), <1s API responses (NFR5)
- **Security:** Password hashing (NFR6), TLS only (NFR7), DB-level tenant isolation (NFR8), PII masking (NFR9), rate limiting (NFR11), encrypted credential storage (NFR23)
- **Reliability:** At-least-once webhook processing with persist-before-ACK (NFR13), 99.5% uptime during working hours (NFR14), zero-downtime deployments for webhook endpoint (NFR16)
- **Scalability:** 3-5 tenants MVP → 50+ without redesign (NFR18), <100ms tenant-scoped queries at scale (NFR19), horizontal scaling capability (NFR20)
- **Integration:** Adapter pattern — new marketplace = no core changes (NFR21), idempotent webhook processing (NFR22)
- **Data Management:** 2-year active retention + cold archive (NFR24-25), full tenant data deletion (NFR26)
- **Analytics Performance:** <3s heat map render for 10K orders (NFR29), <200ms map interactions (NFR30), <2s filter refresh (NFR31)

**Scale & Complexity:**

- Primary domain: Full-stack web application with real-time event processing
- Complexity level: Medium-high
- Estimated architectural components: ~12 major components (auth, tenant management, webhook ingestion, order processing, marketplace adapter, real-time push, notification engine, print service, analytics engine, admin panel, support system, observability)

### Technical Constraints & Dependencies

- **Existing tech stack (committed):** Next.js 16 + NestJS 11 + Supabase (self-hosted) + Tailwind v4 + shadcn/ui v4, TurboRepo monorepo
- **Marketplace API access not yet available** — integration layer must be designed abstractly with adapter pattern, concrete implementation deferred
- **Browser-based MVP** — audio and printing require open browser tab; Chrome kiosk mode for silent printing
- **Solo developer** — architecture must be maintainable by one person; no over-engineering
- **Side project economics** — self-hosted Supabase, minimal infrastructure costs
- **Supabase as the database/auth layer** — Row Level Security for tenant isolation, Supabase Auth for authentication
- **KVKK compliance** — Turkish data protection law; PII masking, retention limits, deletion rights

### Cross-Cutting Concerns Identified

- **Tenant context propagation** — every database query, API call, WebSocket connection, and event must be scoped to the correct tenant. This is the #1 architectural concern — a leak here is a security and compliance failure.
- **Real-time event pipeline** — webhook received → order persisted → marketplace acceptance triggered → browser notified. This pipeline must be reliable, observable, and independent of browser state.
- **Connection health monitoring** — multiple connection points (browser↔backend, backend↔marketplace per platform) each independently monitored and reported.
- **Observability** — logging, latency metrics, error tracking, and audit trails must be woven through every layer from webhook ingestion to browser notification.
- **Security** — authentication, authorization (RBAC), tenant isolation, PII masking, credential encryption, rate limiting — all cross-cutting.
- **Retry and resilience** — marketplace API calls, WebSocket reconnection, queued order processing during outages — consistent retry patterns needed across the system.
- **Feature toggle system** — auto-accept, printing, audio alerts are independently configurable per tenant, affecting behavior at multiple architectural layers.
- **Internationalization** — Turkish/English, configurable per tenant, affects all user-facing text.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application with real-time event processing — already initialized as a TurboRepo monorepo.

### Existing Foundation (Already Initialized)

This project is not starting from a starter template. The monorepo foundation was built incrementally using official CLIs and is already committed to the repository. The architectural evaluation here documents what's in place and assesses fitness for the project requirements.

**Monorepo Structure:**

| Workspace | Technology | Purpose |
|-----------|-----------|---------|
| `apps/web` | Next.js 16.1.7 (React 19, Turbopack) | Tenant and admin frontend |
| `apps/api` | NestJS 11 (Express) | Backend API, webhook processing, order engine |
| `packages/ui` | shadcn/ui v4 (Base UI, CVA, Tailwind v4) | Shared UI component library |
| `packages/api` | TypeScript (NestJS mapped-types) | Shared DTOs and API types |
| `packages/eslint-config` | ESLint 9 | Shared linting rules |
| `packages/jest-config` | Jest 30 + ts-jest | Shared test configuration |
| `packages/typescript-config` | TypeScript 5 | Shared TS configs |

**Tooling:**
- Package manager: pnpm 10.30.3
- Build orchestration: TurboRepo 2.8.14
- Formatting: Prettier 3.8.1
- Node: ≥18

### Architectural Decisions Already Made

**Language & Runtime:**
- TypeScript 5 across all workspaces — strict type safety, shared configs
- Node.js ≥18 runtime

**Frontend Framework:**
- Next.js 16 with Turbopack dev server — App Router, React Server Components, React 19
- Supabase SSR integration (@supabase/ssr) with 3-tier client pattern (browser/server/proxy)

**Backend Framework:**
- NestJS 11 with Express adapter — modular architecture, dependency injection, decorator-based
- @nestjs/config with zod v4 for environment validation
- Global SupabaseModule with SupabaseService for database access

**Design System:**
- shadcn/ui v4 components in `packages/ui`, consumed by `apps/web`
- Base UI (Radix replacement) primitives for accessibility
- Tailwind v4 for styling with CSS variables for theming
- CVA + clsx + tailwind-merge for variant management
- lucide-react for icons
- tw-animate-css for animations

**Testing:**
- Jest 30 + ts-jest for unit/integration tests (API)
- Supertest for HTTP endpoint testing
- Shared jest config in packages/jest-config

**Code Organization:**
- Direct imports (no barrel exports/index.ts) — NestJS CLI convention
- Separate .gitignore per app/package
- Two components.json files for shadcn (packages/ui + apps/web)

### Fitness Assessment for Project Requirements

**Well-served by current foundation:**
- Multi-tenant RBAC → NestJS guards + Supabase RLS
- REST API → NestJS controllers/services
- Server-side rendering + dashboard → Next.js App Router
- UI components → shadcn/ui with theme customization
- Environment management → @nestjs/config + zod validation
- Frontend environment validation → @t3-oss/env-nextjs with split client/server files
- Type sharing → packages/api for DTOs
- Database → Supabase (PostgreSQL + RLS + Auth)
- Rate limiting → @nestjs/throttler (configurable via env vars)
- Phone validation → libphonenumber-js (API DTOs + frontend forms)

**Requires additional libraries (to be decided in architecture):**
- Real-time push (WebSocket/SSE) → NestJS has @nestjs/websockets and @nestjs/platform-socket.io, or SSE via native NestJS support
- Map visualization → Mapbox GL JS, Leaflet, or Google Maps (external)
- Internationalization → next-intl, react-i18next, or similar
- Observability → logging framework (Pino/Winston), APM/monitoring
- Email delivery → Resend, SendGrid, or similar for support form
- Credential encryption → Node.js crypto or dedicated library

### Why No Starter Template Change Needed

The current foundation is well-suited for the project:
1. **NestJS** is purpose-built for the kind of modular, event-driven backend JetAdisyon needs (guards for RBAC, interceptors for tenant scoping, WebSocket gateway support, modules for clean separation)
2. **Next.js 16** provides the modern React framework needed for the dashboard with SSR/RSC support
3. **Supabase** provides PostgreSQL + RLS + Auth in a single self-hosted package — exactly what multi-tenant isolation requires
4. **shadcn/ui v4** gives full component ownership and customization for the domain-specific UI (order cards, health indicators, etc.)
5. **TurboRepo + pnpm** enables clean separation of concerns while sharing types and configs

No alternative starter would improve on this foundation. The remaining decisions are about additional libraries and architectural patterns, not about replacing the base.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Multi-tenant isolation via RLS with tenant_id
- Supabase Auth with email/password + forced first-login password reset
- SSE for real-time server → browser push
- Layered RBAC (NestJS Guards + Supabase RLS + JWT claims)
- Webhook ingestion with persist-before-ACK + idempotent processing

**Important Decisions (Shape Architecture):**
- TanStack Query + SSE-driven React state for frontend data management
- Leaflet + react-leaflet for analytics heat map
- next-intl for internationalization
- Pino for structured logging
- @nestjs/throttler for rate limiting
- Supabase Vault for credential encryption at rest

**Deferred Decisions (Post-MVP):**
- Caching layer (no dedicated cache for MVP; NestJS cache manager + Redis if needed later)
- APM/error tracking service (Sentry or similar — structured logs sufficient for MVP scale)
- Map library upgrade (Mapbox GL JS if Leaflet performance insufficient at 10K+ orders)
- Zustand for global client state (only if cross-component state management becomes needed)

### Data Architecture

**Multi-Tenant Isolation: Row-Level Security (RLS)**
- Strategy: Single schema, all tenants share tables, every tenant-scoped table has a `tenant_id` column
- Enforcement: Supabase RLS policies check `tenant_id` against the authenticated user's JWT claims
- Every query is automatically scoped to the tenant — no cross-tenant data access possible even via direct API calls
- Rationale: Natural Supabase pattern, simple for solo developer, scales to 50+ tenants, integrates directly with Supabase Auth JWT
- Affects: Every data model, every query, every API endpoint

**Database Migration Strategy: Supabase Migrations**
- Tool: Supabase CLI (`supabase migration new`, `supabase db diff`, `supabase db push`)
- SQL migration files tracked in version control
- No ORM layer — direct use of @supabase/supabase-js client (already set up in both apps)
- Schema changes managed via Supabase MCP tools and CLI
- Rationale: Integrated with Supabase ecosystem, no additional dependency, SQL gives full control over RLS policies and database functions

**Caching Strategy: None for MVP**
- No dedicated cache layer at MVP scale (3-5 tenants)
- PostgreSQL handles the query volume directly
- Upgrade path: NestJS built-in cache manager (in-memory → Redis) if query performance degrades at scale
- Rationale: Avoid premature optimization; measure first, cache only when data shows a need

### Authentication & Security

**Authentication: Supabase Auth with Email/Password**
- Admin creates user accounts via `supabase.auth.admin.createUser()` with temporary password
- User metadata flag: `must_change_password: true` set on account creation
- On first login, frontend detects the flag and redirects to mandatory password change screen
- After password change, metadata updated to `must_change_password: false`
- Supabase Auth handles: password hashing (bcrypt), session management, JWT issuance, token refresh
- Affects: FR1-FR10, NFR6, NFR10

**RBAC: Layered Enforcement (Defense in Depth)**
- Layer 1 — **NestJS Guards:** Route-level authorization. Custom guards check user role from JWT (`admin`, `tenant_owner`, `tenant_staff`) and enforce endpoint-level permissions
- Layer 2 — **Supabase RLS:** Database-level isolation. Policies check `tenant_id` and `role` from JWT claims. Even if a guard is misconfigured, RLS prevents cross-tenant data access
- Layer 3 — **JWT Custom Claims:** `tenant_id` and `role` stored in Supabase Auth user metadata, included in JWT. Available to both NestJS guards and RLS policies without additional DB lookups
- Affects: FR5, FR7, NFR8, every API endpoint and database query

**Marketplace Credential Encryption: Supabase Vault (pgsodium)**
- Marketplace API credentials (OAuth tokens, API keys) encrypted at rest using Supabase Vault
- Encryption/decryption happens at the database level — credentials never stored in plaintext
- NestJS service layer requests decrypted credentials only when making marketplace API calls
- Credentials never logged, never exposed in error messages or client-side code (NFR23)
- Affects: FR11, NFR23

### API & Communication Patterns

**Real-Time Push: Server-Sent Events (SSE)**
- Technology: NestJS native SSE support via `@Sse()` decorator
- Pattern: Unidirectional server → browser event stream
- Use cases: Order events (new, cancelled, modified), connection health status changes, stats updates, print triggers
- Browser client: Native `EventSource` API with built-in auto-reconnect
- Per-tenant SSE streams — each authenticated connection receives only its tenant's events
- Why SSE over WebSocket: JetAdisyon's real-time needs are strictly unidirectional (server pushes to browser). SSE is simpler, works over HTTP (no proxy complications), auto-reconnects natively, and NestJS has built-in support. The browser never needs to send real-time data back — settings changes go through REST API.
- Affects: FR47, NFR2, all real-time dashboard features

**Rate Limiting: @nestjs/throttler**
- Global defaults configurable via environment variables: `THROTTLE_TTL` (default: 60s) and `THROTTLE_LIMIT` (default: 100 requests/TTL)
- Loaded via `ThrottlerModule.forRootAsync` with `ConfigService` injection for runtime configuration
- General API: global defaults serve as reasonable abuse prevention for all endpoints
- Authentication endpoints: max 5 failed attempts per 15 minutes per IP (NFR11)
- Support form: max 3 submissions per hour per user (FR56)
- Configurable per-route via decorators for stricter limits
- Affects: NFR11, FR56

**Webhook Ingestion Pattern**
- Step 1: Receive webhook from marketplace → immediately persist raw payload to DB → ACK the webhook (NFR13: at-least-once, persist before ACK)
- Step 2: Process persisted webhook asynchronously — deduplicate via unique order/webhook ID (NFR22: idempotent processing)
- Step 3: Execute business logic — auto-accept on marketplace (with retry), create/update order record, emit SSE event to browser
- Retry on marketplace acceptance failure: exponential backoff, up to 5 attempts (FR14). If all fail, alert tenant via SSE
- Separation: Webhook controller (ingestion) is decoupled from order processing service (business logic) via NestJS modules
- Affects: FR12-FR19, NFR13, NFR22

**REST API Design**
- RESTful endpoints for all CRUD operations and settings
- Consistent error response format across all endpoints
- API versioning deferred — single version for MVP, version prefix (`/api/v1/`) reserved for future use
- Request validation via zod v4 (already in stack) with NestJS validation pipes
- Affects: All FR categories, NFR5

### Frontend Architecture

**Server State: TanStack Query (React Query)**
- All REST API data managed via TanStack Query: order history, settings, analytics data, admin operations
- Automatic caching, background refetching, optimistic updates
- Stale-while-revalidate pattern for dashboard data
- Query key factory in `lib/query-keys.ts` — centralized key definitions for cache invalidation consistency
- Affects: All frontend data fetching

**Real-Time State: SSE → React State**
- EventSource connection feeds into local React state (useState/useReducer in a context provider)
- Live order feed, connection health indicators, real-time stats — all driven by SSE events
- On browser reconnect: SSE auto-reconnects, server sends missed events since last connection
- Affects: FR42-FR43, FR47, all real-time UI

**Global Client State: Deferred (Zustand if Needed)**
- Start without a global state library — use React context + local state
- If cross-component state sharing becomes complex (e.g., audio playback state across multiple components), introduce Zustand
- Rationale: Avoid adding complexity before it's proven necessary

**Map Library: Leaflet + react-leaflet**
- Open-source, free, no API key required
- Heat map via leaflet.heat plugin
- Sufficient for the analytics use case at MVP scale
- Upgrade path: Mapbox GL JS if performance degrades at 10K+ order data points or if richer map features are needed
- Affects: FR62-FR69, NFR29-NFR31

**Internationalization: next-intl**
- Purpose-built for Next.js App Router — supports Server Components and Client Components
- Type-safe message keys
- Turkish (default) + English, configurable per tenant (FR70)
- Message files in JSON, organized by locale
- Affects: FR70, all user-facing text

### Infrastructure & Deployment

**Hosting: VPS with Docker Compose**
- Single VPS (Hetzner or DigitalOcean) running all services
- Docker Compose orchestration: Supabase stack (PostgreSQL, GoTrue, PostgREST, etc.) + NestJS API + Next.js frontend
- Estimated cost: ~€10-20/month — fits side project economics
- Full control over the environment, no vendor lock-in
- Affects: All deployment, NFR14 (uptime), NFR16 (zero-downtime deploys)

**Observability: Pino Structured Logging**
- Logger: Pino via nestjs-pino integration — fast, structured JSON logs
- Correlation IDs: Each request/webhook gets a unique ID propagated through the processing pipeline
- Log levels: error, warn, info, debug — production runs at info level
- Key events logged with timestamps: webhook received, order persisted, marketplace acceptance attempt/success/failure, SSE event emitted, print triggered
- Latency tracking: Timestamps at each pipeline stage for NFR1 compliance measurement
- Sufficient for MVP and likely beyond — upgrade to Grafana/Prometheus/Sentry only if structured logs prove insufficient
- Affects: FR57-FR60, NFR1 (latency measurement)

**Email: Nodemailer + SMTP + React Email**
- Nodemailer for SMTP email delivery — no external paid service
- SMTP provider: Gmail SMTP with app passwords (free, sufficient for MVP volume)
- React Email for HTML email templates — design emails as React components, render to HTML
- Use case: Support form submissions (FR55), license expiry warnings (FR52)
- Rationale: Zero cost, no custom domain required, React Email fits the stack naturally
- Affects: FR52, FR55

### Decision Impact Analysis

**Implementation Sequence:**
1. Supabase schema + RLS policies + Auth configuration (foundation for everything)
2. NestJS Auth module + Guards + JWT claims (unlocks all protected endpoints)
3. Tenant management module (admin can create tenants)
4. SSE infrastructure (NestJS SSE endpoints + frontend EventSource setup)
5. Webhook ingestion + order processing pipeline (core value proposition)
6. Frontend dashboard with TanStack Query + SSE integration
7. Feature toggles + settings (configuration layer)
8. Receipt printing (browser-based)
9. Analytics with Leaflet heat map
10. next-intl internationalization
11. Support form with Nodemailer + React Email
12. Observability refinement (correlation IDs, latency dashboards)

**Cross-Component Dependencies:**
- RLS policies depend on JWT claims → Auth must be configured first
- SSE streams depend on tenant context → Auth + tenant management must exist
- Webhook processing depends on SSE → real-time infrastructure must be ready
- Analytics depends on order data with location → order processing must store geocoded data
- Feature toggles affect webhook processing, SSE events, and browser behavior → toggle state must be accessible at all layers
- Pino logging with correlation IDs must be set up early to enable debugging throughout development

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 major categories where AI agents could make different choices — naming, structure, format, communication, and process patterns. All resolved below.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural (`orders`, `tenants`, `tenant_settings`, `order_events`)
- Columns: `snake_case` (`tenant_id`, `created_at`, `order_status`, `marketplace_order_id`)
- Foreign keys: `referenced_table_singular_id` (`tenant_id`, `user_id`, `order_id`)
- Indexes: `idx_tablename_columns` (`idx_orders_tenant_id_created_at`)
- RLS policies: `policy_tablename_action_role` (`policy_orders_select_tenant_owner`)
- Enums: `snake_case` type name, `snake_case` values (`order_status`: `pending`, `accepted`, `cancelled`)
- Timestamps: always `timestamptz` type, column names ending in `_at` (`created_at`, `updated_at`, `accepted_at`)

**API Naming Conventions:**
- Endpoints: `kebab-case`, plural nouns (`/api/v1/orders`, `/api/v1/tenant-settings`)
- Route params: `:paramName` camelCase (NestJS convention: `/orders/:orderId`)
- Query params: `camelCase` (`?startDate=...&endDate=...&pageSize=20`)
- Request/response body: `camelCase` JSON keys (TypeScript convention)
- DB ↔ API mapping: `snake_case` in database ↔ `camelCase` in JSON. Transformation happens at the service layer boundary.

**Code Naming Conventions:**

NestJS (`apps/api`):
- Files: `kebab-case` (`order-processing.service.ts`, `tenant.guard.ts`, `create-order.dto.ts`)
- Classes: `PascalCase` (`OrderProcessingService`, `TenantGuard`, `CreateOrderDto`)
- Methods/functions: `camelCase` (`acceptOrder`, `findByTenantId`)
- Variables/properties: `camelCase` (`orderId`, `tenantSettings`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`)
- Interfaces/types: `PascalCase`, no `I` prefix (`OrderResponse`, not `IOrderResponse`)
- Module files follow NestJS CLI output: `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`

Next.js (`apps/web`):
- Route directories: `kebab-case` (App Router convention: `app/(tenant)/dashboard/`, `app/(admin)/tenants/`)
- Component files: `kebab-case.tsx` (`order-card.tsx`, `health-status-bar.tsx`)
- Component exports: `PascalCase` (`export function OrderCard()`)
- Hook files: `kebab-case.ts` (`use-sse-connection.ts`, `use-orders.ts`)
- Hook exports: `camelCase` with `use` prefix (`useSSEConnection`, `useOrders`)
- Utility files: `kebab-case.ts` (`format-currency.ts`, `mask-pii.ts`)

Shared packages:
- `packages/api`: DTOs and types follow NestJS naming (`create-order.dto.ts`, `order-response.type.ts`)
  - `tenant.constants.ts`: shared label maps (`TENANT_STATUS_LABELS`, `TENANT_LICENSE_LABELS`) typed as `Record<TenantStatus, string>` for compile-time safety
  - Convention: labels are data (shared in `packages/api`); presentation styles are frontend-only (`apps/web/src/lib/tenant-styles.ts`)
- `packages/ui`: Components follow shadcn convention (`button.tsx`, `card.tsx`); custom domain components use `kebab-case` (`order-card.tsx`)
- No barrel exports (index.ts) — use direct imports everywhere

### Structure Patterns

**NestJS Project Organization (`apps/api/src/`):**
```
src/
├── main.ts
├── app.module.ts
├── common/                     # Cross-cutting concerns
│   ├── guards/                 # Auth, role, tenant guards
│   ├── interceptors/           # Logging, tenant-scoping, response transform
│   ├── filters/                # Global exception filter
│   ├── decorators/             # Custom decorators (CurrentUser, TenantId, Roles)
│   ├── pipes/                  # Zod validation pipe
│   └── types/                  # Shared internal types
├── auth/                       # Authentication module
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.service.spec.ts    # Co-located test
│   └── dto/
├── tenants/                    # Tenant management module
│   ├── tenants.module.ts
│   ├── tenants.controller.ts
│   ├── tenants.service.ts
│   ├── tenants.service.spec.ts
│   └── dto/
├── orders/                     # Order management module
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.service.spec.ts
│   └── dto/
├── webhooks/                   # Webhook ingestion module
│   ├── webhooks.module.ts
│   ├── webhooks.controller.ts
│   ├── webhooks.service.ts
│   └── dto/
├── marketplace/                # Marketplace adapter module
│   ├── marketplace.module.ts
│   ├── marketplace.service.ts  # Adapter interface
│   ├── adapters/               # Concrete platform adapters
│   │   └── trendyol-go.adapter.ts
│   └── dto/
├── events/                     # SSE event module
│   ├── events.module.ts
│   ├── events.controller.ts    # SSE endpoint
│   └── events.service.ts       # Event emission + per-tenant streams
├── notifications/              # Audio/print trigger logic
├── analytics/                  # Analytics queries + aggregation
├── settings/                   # Tenant settings + feature toggles
├── admin/                      # Admin-specific operations
├── support/                    # Support form + email
├── supabase/                   # Supabase client module (existing)
└── config/                     # App configuration
test/                           # e2e tests
├── app.e2e-spec.ts
└── jest-e2e.json
```

Rules:
- One module per domain feature — created via `nest generate module/controller/service`
- Tests co-located with source files (`*.spec.ts` next to `*.ts`)
- e2e tests in `test/` at app root
- DTOs in `dto/` subfolder within each feature module
- Cross-cutting concerns in `common/` — shared guards, interceptors, decorators, filters
- No circular dependencies between feature modules — use events for decoupling

**Next.js Project Organization (`apps/web/`):**
```
app/
├── layout.tsx                  # Root layout (providers, global styles)
├── page.tsx                    # Landing/redirect
├── (auth)/                     # Auth route group (no layout nesting)
│   ├── login/page.tsx
│   └── change-password/page.tsx
├── (tenant)/                   # Tenant route group (tenant layout)
│   ├── layout.tsx              # Tenant layout (top nav, health bar)
│   ├── dashboard/page.tsx      # Service mode dashboard
│   ├── analytics/page.tsx      # Analytics heat map
│   ├── settings/page.tsx       # Tenant settings
│   └── _components/            # Tenant-specific components
├── (admin)/                    # Admin route group (admin layout)
│   ├── layout.tsx              # Admin layout (sidebar nav)
│   ├── overview/page.tsx
│   ├── tenants/
│   │   ├── page.tsx            # Tenant list
│   │   └── [tenantId]/page.tsx # Tenant detail
│   ├── licenses/page.tsx
│   └── _components/            # Admin-specific components
├── (onboarding)/               # Onboarding route group
│   ├── layout.tsx
│   └── setup/page.tsx
hooks/                          # App-level hooks
├── use-sse-connection.ts
├── use-orders.ts
└── use-auth.ts
lib/                            # Utilities
├── supabase/                   # ✅ EXISTS — Supabase clients
├── env/                        # ✅ EXISTS — Environment validation (@t3-oss/env-nextjs)
│   ├── client.ts               # ✅ EXISTS — NEXT_PUBLIC_* vars
│   └── server.ts               # ✅ EXISTS — Server-only vars
├── api-client.ts               # ✅ EXISTS — REST API client (fetch wrapper with 30s timeout, optional Zod validation, AbortController)
├── query-keys.ts               # ✅ EXISTS — TanStack Query key factory
├── tenant-styles.ts            # ✅ EXISTS — Tenant status/license style maps (presentation-only)
└── format.ts                   # Formatting utilities
providers/                      # React context providers
├── sse-provider.tsx
├── query-provider.tsx
└── auth-provider.tsx
```

Rules:
- Route groups `(tenant)`, `(admin)`, `(auth)`, `(onboarding)` for layout separation
- `_components/` directories for route-group-specific components (underscore prefix = not a route)
- Shared UI components come from `@repo/ui` — not duplicated in `apps/web`
- App-level hooks in `hooks/`, utilities in `lib/`, providers in `providers/`
- No business logic in page components — pages compose components and connect data

### Format Patterns

**API Response Formats:**

```typescript
// Success response
{ data: T }

// Error response
{
  error: {
    code: string,       // e.g., "ORDER.ACCEPTANCE_FAILED"
    message: string,    // Human-readable, localized
    details?: unknown   // Optional: validation errors, debug info (non-production only)
  }
}

// Paginated list response
{
  data: T[],
  meta: {
    total: number,
    page: number,
    limit: number,
    hasMore: boolean
  }
}
```

**Error Code Convention:** `DOMAIN.ACTION_ERROR` format:
- `AUTH.INVALID_CREDENTIALS`, `AUTH.SESSION_EXPIRED`
- `TENANT.NOT_FOUND`, `TENANT.DEACTIVATED`
- `ORDER.ACCEPTANCE_FAILED`, `ORDER.DUPLICATE_WEBHOOK`
- `MARKETPLACE.CONNECTION_LOST`, `MARKETPLACE.TIMEOUT`
- `SUPPORT.RATE_LIMITED`

**HTTP Status Codes:**
- `200` Success (GET, PUT, PATCH)
- `201` Created (POST)
- `204` No content (DELETE)
- `400` Validation error (bad request body/params)
- `401` Not authenticated
- `403` Not authorized (wrong role or wrong tenant)
- `404` Not found
- `409` Conflict (duplicate webhook, duplicate resource)
- `429` Rate limited
- `500` Internal server error (unexpected failures)

**Date/Time Format:**
- JSON: ISO 8601 strings (`"2026-03-08T19:30:00.000Z"`)
- Database: `timestamptz` columns
- Frontend display: Localized to `Europe/Istanbul` timezone using Intl.DateTimeFormat
- All timestamps in UTC internally — convert only at the display layer

**JSON Field Convention:**
- `camelCase` for all JSON keys in API requests and responses
- `snake_case` in database columns
- Transformation at the NestJS service layer boundary (not in controllers, not in frontend)

### Communication Patterns

**SSE Event Naming:** `domain.event` format (dot-separated, lowercase):
- `order.new` — new order accepted and processed
- `order.cancelled` — order cancelled by marketplace
- `order.modified` — order modified by marketplace
- `order.acceptance_failed` — all retry attempts exhausted
- `connection.status_changed` — marketplace connection status update
- `stats.updated` — real-time stats refresh
- `system.health` — periodic health heartbeat

**SSE Event Payload Structure:**
```typescript
interface SSEEvent<T = unknown> {
  type: string;          // Event name (e.g., "order.new")
  tenantId: string;      // Tenant scope
  timestamp: string;     // ISO 8601
  correlationId: string; // For tracing through the pipeline
  data: T;               // Event-specific payload
}
```

**NestJS Internal Events (EventEmitter2):**
Same naming convention as SSE events. Used to decouple modules:
- Webhook controller emits `webhook.received`
- Order service listens, processes, emits `order.new`
- Events service listens to `order.*`, pushes to tenant's SSE stream
- Notification service listens to `order.*`, handles audio/print triggers

### Process Patterns

**Error Handling:**
- Global exception filter in NestJS catches all unhandled errors → formats as standard error envelope → logs via Pino with correlation ID
- Custom exceptions extend `HttpException` with domain error code
- Supabase Auth error detection uses `authError.code` (e.g., `email_exists`, `user_already_exists`) from `@supabase/auth-js` `ErrorCode` type — not string matching on `authError.message`
- Frontend: TanStack Query `onError` callbacks for API errors, EventSource `onerror` for SSE errors
- User-facing errors: Always plain Turkish/English based on tenant locale. Never expose stack traces, SQL errors, or internal codes in the response.
- Distinction: Logged errors include full technical detail (stack, query, context). User-facing errors include only code + message.

**Validation:**
- Backend: zod v4 schemas validate all incoming data at the controller boundary (request body, params, query)
- Shared schemas: Common validation schemas (e.g., order DTOs) live in `packages/api` and are used by both backend and frontend
- Frontend: zod v4 for form validation, reusing schemas from `packages/api` where applicable
- Webhooks: Validate payload structure on ingestion — reject malformed webhooks before persisting

**Retry Pattern:**
- Formula: `delay = min(baseDelay * 2^attempt + randomJitter, maxDelay)`
- Marketplace API calls: base 1s, max 30s, 5 attempts (FR14)
- WebSocket/SSE reconnect (browser): handled natively by EventSource (auto-reconnect with backoff)
- Every retry logged with: correlation ID, attempt number, delay, error reason

**Loading States:**
- TanStack Query provides `isLoading`, `isPending`, `isError`, `data` — use these directly in components
- Skeleton components (shadcn `Skeleton`) for initial page loads and data-dependent sections
- No custom loading state management — defer to TanStack Query and React Suspense where appropriate
- SSE connection state: tracked via EventSource readyState (CONNECTING, OPEN, CLOSED) in the SSE provider

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow naming conventions exactly — `snake_case` in DB, `camelCase` in JSON/TypeScript, `kebab-case` in file names
2. Use the standard API response envelope (`{ data }` / `{ error: { code, message } }`) for all endpoints
3. Create NestJS features via `nest generate` CLI commands — never manually create module/controller/service files
4. Place tests co-located with source files (`.spec.ts`) — never in a separate `__tests__/` directory
5. Use zod v4 for all validation — no class-validator, no manual validation
6. Emit domain events via EventEmitter2 for cross-module communication — no direct service-to-service calls across modules
7. Include `tenantId` scoping in every query and every SSE event — tenant isolation is non-negotiable
8. Log with Pino using correlation IDs — no `console.log` in production code
9. Use direct imports — no barrel exports (index.ts files)
10. Transform `snake_case` ↔ `camelCase` at the service layer — controllers receive/return camelCase, database uses snake_case

**Pattern Verification:**
- ESLint rules enforce naming conventions where possible
- PR review checks for pattern compliance
- Architecture document is the source of truth for pattern disputes

### Pattern Examples

**Good Examples:**
```typescript
// NestJS controller — correct patterns
@Controller('api/v1/orders')
export class OrdersController {
  @Get()
  @UseGuards(AuthGuard, TenantGuard)
  async findAll(@TenantId() tenantId: string, @Query() query: ListOrdersDto) {
    return { data: await this.ordersService.findAll(tenantId, query) };
  }
}

// SSE event emission — correct format
this.eventsService.emit(tenantId, {
  type: 'order.new',
  tenantId,
  timestamp: new Date().toISOString(),
  correlationId: this.requestContext.correlationId,
  data: { orderId, items, totalAmount },
});

// Database query — snake_case columns, tenant-scoped
const { data } = await this.supabase
  .from('orders')
  .select('id, marketplace_order_id, total_amount, created_at')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });
```

**Anti-Patterns (NEVER do these):**
```typescript
// ❌ Wrong: camelCase in database
.from('orders').select('tenantId, orderStatus')  // Should be tenant_id, order_status

// ❌ Wrong: snake_case in API response
return { order_id: order.id, total_amount: order.total }  // Should be camelCase

// ❌ Wrong: direct cross-module service call
constructor(private ordersService: OrdersService) {}  // In webhooks module — use events instead

// ❌ Wrong: console.log
console.log('Order received:', orderId);  // Use Pino logger

// ❌ Wrong: barrel export
export * from './orders.service';  // In index.ts — use direct imports

// ❌ Wrong: missing tenant scope
.from('orders').select('*')  // Missing .eq('tenant_id', tenantId)
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
jetadisyon/                              # Monorepo root
├── .github/
│   └── workflows/
│       └── ci.yml                       # CI pipeline (lint, test, build)
├── apps/
│   ├── api/                             # NestJS 11 backend
│   │   ├── .env.example
│   │   ├── .env                         # Local env (gitignored)
│   │   ├── .gitignore
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.ts                  # App bootstrap + Pino setup
│   │   │   ├── app.module.ts            # Root module
│   │   │   │
│   │   │   ├── config/                  # App configuration
│   │   │   │   └── env.validation.ts    # ✅ EXISTS — zod env validation
│   │   │   │
│   │   │   ├── common/                  # Cross-cutting concerns
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts           # JWT authentication
│   │   │   │   │   ├── roles.guard.ts          # Role-based access (admin/owner/staff)
│   │   │   │   │   └── tenant.guard.ts         # Tenant context enforcement
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── logging.interceptor.ts  # Request/response logging with correlation ID
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts # Global error envelope formatting
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   ├── tenant-id.decorator.ts
│   │   │   │   │   └── roles.decorator.ts
│   │   │   │   ├── pipes/
│   │   │   │   │   └── zod-validation.pipe.ts  # zod v4 request validation
│   │   │   │   └── types/
│   │   │   │       └── request-context.type.ts # Correlation ID, tenant context
│   │   │   │
│   │   │   ├── supabase/                # ✅ EXISTS — Supabase client
│   │   │   │   ├── supabase.module.ts   # snake_case → camelCase transform at this boundary
│   │   │   │   ├── supabase.service.ts  # Returns camelCase objects to consumers
│   │   │   │   └── supabase.service.spec.ts
│   │   │   │
│   │   │   ├── auth/                    # FR1-FR10: Authentication
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.service.spec.ts
│   │   │   │   └── dto/
│   │   │   │       ├── login.dto.ts
│   │   │   │       └── change-password.dto.ts
│   │   │   │
│   │   │   ├── tenants/                 # FR48-FR51: Tenant management
│   │   │   │   ├── tenants.module.ts
│   │   │   │   ├── tenants.controller.ts
│   │   │   │   ├── tenants.service.ts
│   │   │   │   ├── tenants.service.spec.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-tenant.dto.ts
│   │   │   │       └── update-tenant.dto.ts
│   │   │   │
│   │   │   ├── users/                   # FR6, FR10: User/staff management
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.service.spec.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── webhooks/                # FR12-FR15: Webhook ingestion
│   │   │   │   ├── webhooks.module.ts
│   │   │   │   ├── webhooks.controller.ts   # Receive → persist → ACK
│   │   │   │   ├── webhooks.service.ts      # Dedup + dispatch to order processing
│   │   │   │   ├── webhooks.service.spec.ts
│   │   │   │   └── dto/
│   │   │   │       └── webhook-payload.dto.ts
│   │   │   │
│   │   │   ├── orders/                  # FR23-FR29: Order management
│   │   │   │   ├── orders.module.ts
│   │   │   │   ├── orders.controller.ts     # REST: order history, details
│   │   │   │   ├── orders.service.ts        # Order CRUD, processing logic
│   │   │   │   ├── orders.service.spec.ts
│   │   │   │   └── dto/
│   │   │   │       └── list-orders.dto.ts
│   │   │   │
│   │   │   ├── marketplace/             # FR11, FR13-FR19: Marketplace adapter
│   │   │   │   ├── marketplace.module.ts
│   │   │   │   ├── marketplace.service.ts   # Adapter interface
│   │   │   │   ├── marketplace.service.spec.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   └── trendyol-go.adapter.ts  # Concrete platform adapter
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── events/                  # FR47: Real-time SSE push
│   │   │   │   ├── events.module.ts
│   │   │   │   ├── events.controller.ts     # SSE endpoint (/api/v1/events/stream)
│   │   │   │   ├── events.service.ts        # Per-tenant event streams
│   │   │   │   └── events.service.spec.ts
│   │   │   │
│   │   │   ├── health/                  # FR16-FR18: Connection health monitoring
│   │   │   │   ├── health.module.ts
│   │   │   │   ├── health.controller.ts     # Health check endpoints
│   │   │   │   ├── health.service.ts        # Connection monitoring logic
│   │   │   │   └── health.service.spec.ts
│   │   │   │
│   │   │   ├── settings/                # FR20-FR22, FR39-FR41: Tenant settings
│   │   │   │   ├── settings.module.ts
│   │   │   │   ├── settings.controller.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   ├── settings.service.spec.ts
│   │   │   │   └── dto/
│   │   │   │       └── update-settings.dto.ts
│   │   │   │
│   │   │   ├── analytics/               # FR61-FR69: Analytics queries
│   │   │   │   ├── analytics.module.ts
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   ├── analytics.service.spec.ts
│   │   │   │   └── dto/
│   │   │   │       └── analytics-query.dto.ts
│   │   │   │
│   │   │   ├── licenses/                # FR49, FR52-FR53: License lifecycle
│   │   │   │   ├── licenses.module.ts
│   │   │   │   ├── licenses.controller.ts
│   │   │   │   ├── licenses.service.ts
│   │   │   │   └── licenses.service.spec.ts
│   │   │   │
│   │   │   ├── support/                 # FR54-FR56: In-app support
│   │   │   │   ├── support.module.ts
│   │   │   │   ├── support.controller.ts
│   │   │   │   ├── support.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── support-request.dto.ts
│   │   │   │
│   │   │   ├── jobs/                    # Scheduled tasks & background processing
│   │   │   │   ├── jobs.module.ts
│   │   │   │   └── jobs.service.ts      # License expiry checks, retry scheduling, analytics aggregation
│   │   │   │
│   │   │   └── audit/                   # FR57-FR60: Observability & audit
│   │   │       ├── audit.module.ts
│   │   │       ├── audit.service.ts
│   │   │       └── audit.service.spec.ts
│   │   │
│   │   └── test/                        # e2e tests
│   │       ├── jest-e2e.json
│   │       └── app.e2e-spec.ts
│   │
│   └── web/                             # Next.js 16 frontend
│       ├── .env.example
│       ├── .env                         # ✅ EXISTS
│       ├── .gitignore                   # ✅ EXISTS
│       ├── components.json              # ✅ EXISTS — shadcn config
│       ├── next.config.ts               # ✅ EXISTS
│       ├── package.json                 # ✅ EXISTS
│       ├── postcss.config.mjs           # ✅ EXISTS
│       ├── tsconfig.json                # ✅ EXISTS
│       └── src/
│           ├── proxy.ts                 # ✅ EXISTS — Supabase request interception
│           ├── app/
│           │   ├── layout.tsx           # ✅ EXISTS — root layout (providers)
│           │   ├── page.tsx             # ✅ EXISTS — landing/redirect
│           │   ├── favicon.ico          # ✅ EXISTS
│           │   │
│           │   ├── (auth)/              # Auth routes
│           │   │   ├── login/
│           │   │   │   └── page.tsx
│           │   │   └── change-password/
│           │   │       └── page.tsx     # Forced first-login password reset
│           │   │
│           │   ├── (onboarding)/        # Onboarding flow (FR44-FR46)
│           │   │   ├── layout.tsx
│           │   │   └── setup/
│           │   │       ├── page.tsx     # Orchestrator for 3-step flow
│           │   │       └── _components/
│           │   │           ├── onboarding-step-connect.tsx
│           │   │           ├── onboarding-step-configure.tsx
│           │   │           └── onboarding-step-test.tsx
│           │   │
│           │   ├── (tenant)/            # Tenant routes (owner + staff)
│           │   │   ├── layout.tsx       # Tenant layout: top nav + health bar
│           │   │   ├── dashboard/
│           │   │   │   └── page.tsx     # Service mode: split panel
│           │   │   ├── analytics/
│           │   │   │   └── page.tsx     # Heat map + stats (FR61-FR69)
│           │   │   ├── settings/
│           │   │   │   └── page.tsx     # Feature toggles, audio, print, working hours
│           │   │   └── _components/     # Tenant-specific components
│           │   │       ├── dashboard/   # Service mode components
│           │   │       │   ├── order-card.tsx
│           │   │       │   ├── order-feed.tsx
│           │   │       │   ├── stats-panel.tsx
│           │   │       │   ├── health-status-bar.tsx
│           │   │       │   ├── connection-indicator.tsx
│           │   │       │   └── emergency-toggle.tsx
│           │   │       ├── analytics/   # Analytics components
│           │   │       │   └── heat-map-view.tsx
│           │   │       └── settings/    # Settings components
│           │   │           └── audio-control-panel.tsx
│           │   │
│           │   └── (admin)/             # Admin routes (FR48-FR51)
│           │       ├── layout.tsx       # Admin layout: sidebar nav
│           │       ├── overview/
│           │       │   └── page.tsx     # Global tenant overview
│           │       ├── tenants/
│           │       │   ├── page.tsx     # Tenant list
│           │       │   └── [tenant-id]/
│           │       │       └── page.tsx # Tenant detail + diagnostics
│           │       ├── licenses/
│           │       │   └── page.tsx     # License management
│           │       └── _components/     # Admin-specific components
│           │
│           ├── hooks/                   # App-level React hooks
│           │   ├── use-sse-connection.ts     # SSE EventSource management
│           │   ├── use-orders.ts             # TanStack Query: order data
│           │   ├── use-auth.ts               # Auth state + password change detection
│           │   ├── use-tenant-settings.ts    # TanStack Query: settings
│           │   ├── use-analytics.ts          # TanStack Query: analytics data
│           │   └── use-audio-alerts.ts       # Audio playback triggers (consumes AudioProvider)
│           │
│           ├── lib/                     # Utilities
│           │   ├── supabase/            # ✅ EXISTS — Supabase clients
│           │   │   ├── client.ts        # ✅ EXISTS — Browser client
│           │   │   ├── server.ts        # ✅ EXISTS — Server client
│           │   │   └── proxy.ts         # ✅ EXISTS — Proxy client
│           │   ├── env/                 # ✅ EXISTS — Environment validation (@t3-oss/env-nextjs)
│           │   │   ├── client.ts        # ✅ EXISTS — NEXT_PUBLIC_* vars
│           │   │   └── server.ts        # ✅ EXISTS — Server-only vars
│           │   ├── utils.ts             # ✅ EXISTS — cn() utility
│           │   ├── api-client.ts        # ✅ EXISTS — REST API client (fetch wrapper with 30s timeout, optional Zod validation, AbortController)
│           │   ├── query-keys.ts        # ✅ EXISTS — TanStack Query key factory
│           │   ├── tenant-styles.ts     # ✅ EXISTS — Tenant status/license style maps (presentation-only)
│           │   ├── format.ts            # Currency, date, PII masking
│           │   └── constants.ts         # App-level constants
│           │
│           ├── providers/               # React context providers
│           │   ├── query-provider.tsx    # TanStack Query provider
│           │   ├── sse-provider.tsx      # SSE connection + event dispatch
│           │   ├── auth-provider.tsx     # Auth state provider
│           │   └── audio-provider.tsx    # Web Audio API context + sound state
│           │
│           └── messages/                # next-intl translations (FR70)
│               ├── tr/                  # Turkish (default) — split by feature
│               │   ├── common.json      # Shared: nav, buttons, status labels
│               │   ├── dashboard.json   # Service mode UI text
│               │   ├── analytics.json   # Analytics UI text
│               │   ├── settings.json    # Settings labels, toggles
│               │   ├── onboarding.json  # Onboarding flow text
│               │   ├── admin.json       # Admin panel text
│               │   └── errors.json      # Error messages
│               └── en/                  # English — same structure
│                   ├── common.json
│                   ├── dashboard.json
│                   ├── analytics.json
│                   ├── settings.json
│                   ├── onboarding.json
│                   ├── admin.json
│                   └── errors.json
│
├── packages/
│   ├── api/                             # ✅ EXISTS — Shared types & schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── entry.ts                 # ✅ EXISTS
│   │       ├── database.types.ts        # ✅ EXISTS — Supabase generated types
│   │       ├── tenant.constants.ts     # ✅ EXISTS — Shared label maps (status, license)
│   │       ├── schemas/                 # Shared zod schemas + inferred DTO types
│   │       │   ├── order.schema.ts      # Zod schema + export type OrderDto = z.infer<...>
│   │       │   ├── tenant.schema.ts
│   │       │   ├── settings.schema.ts
│   │       │   ├── analytics.schema.ts
│   │       │   ├── auth.schema.ts
│   │       │   └── support.schema.ts
│   │       └── types/                   # Shared enums & type constants
│   │           ├── roles.type.ts        # UserRole enum
│   │           ├── order-status.type.ts
│   │           ├── connection-status.type.ts
│   │           ├── license-status.type.ts
│   │           └── sse-events.type.ts   # SSE event type definitions
│   │
│   ├── emails/                          # React Email templates (shared)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── support-request.tsx      # Support form notification
│   │       └── license-expiry.tsx       # License expiry warning
│   │
│   ├── ui/                              # ✅ EXISTS — shadcn/ui components
│   │   ├── package.json
│   │   ├── components.json
│   │   ├── postcss.config.mjs
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── styles/
│   │       │   └── globals.css          # ✅ EXISTS — Tailwind + theme tokens
│   │       ├── lib/
│   │       │   └── utils.ts             # ✅ EXISTS — cn() utility
│   │       ├── components/
│   │       │   ├── ui/                  # shadcn stock components
│   │       │   │   ├── button.tsx       # ✅ EXISTS
│   │       │   │   ├── card.tsx
│   │       │   │   ├── badge.tsx
│   │       │   │   ├── switch.tsx
│   │       │   │   ├── slider.tsx
│   │       │   │   ├── select.tsx
│   │       │   │   ├── input.tsx
│   │       │   │   ├── label.tsx
│   │       │   │   ├── toast.tsx
│   │       │   │   ├── alert-dialog.tsx
│   │       │   │   ├── tabs.tsx
│   │       │   │   ├── dropdown-menu.tsx
│   │       │   │   ├── tooltip.tsx
│   │       │   │   ├── skeleton.tsx
│   │       │   │   ├── separator.tsx
│   │       │   │   └── scroll-area.tsx
│   │       │   └── domain/             # Custom domain components
│   │       │       └── print-receipt.tsx # Print-optimized order layout
│   │       └── hooks/                   # Shared UI hooks
│   │
│   ├── eslint-config/                   # ✅ EXISTS
│   ├── jest-config/                     # ✅ EXISTS
│   └── typescript-config/               # ✅ EXISTS
│
├── supabase/                            # Supabase project config + migrations
│   ├── config.toml                      # Supabase local config
│   ├── migrations/                      # SQL migration files
│   │   ├── 00001_initial_schema.sql     # Core tables + RLS
│   │   └── ...
│   └── seed.sql                         # Dev seed data
│
├── docker/                              # Docker configuration
│   └── docker-compose.yml               # Supabase + API + Web
│
├── docs/                                # Project documentation
├── _bmad/                               # BMAD framework
├── _bmad-output/                        # BMAD artifacts
├── .github/                             # GitHub config
├── package.json                         # ✅ EXISTS — root
├── pnpm-workspace.yaml                  # ✅ EXISTS
├── turbo.json                           # ✅ EXISTS
├── tsconfig.json                        # ✅ EXISTS — root
├── eslint.config.mjs                    # ✅ EXISTS — root
└── .gitignore                           # ✅ EXISTS — root
```

### Key Structural Decisions (from Party Mode review)

1. **snake_case ↔ camelCase transform at SupabaseService boundary** — SupabaseService returns camelCase objects. All NestJS code works in camelCase natively. No response interceptor needed for this. Transform is encapsulated in the data access layer.

2. **`src/jobs/` module** — Reserved for scheduled/background tasks: license expiry checks, retry scheduling, analytics pre-aggregation. Empty initially, boundary established for when needed.

3. **Schemas as single source of truth** — `packages/api/src/schemas/` contains zod schemas with inferred TypeScript types (`type OrderDto = z.infer<typeof orderSchema>`). No separate `dto/` directory in the shared package. NestJS module-level DTOs in `dto/` subfolders are thin wrappers or direct re-exports of shared schemas.

4. **Tenant _components sub-organized by feature** — `_components/dashboard/`, `_components/analytics/`, `_components/settings/` to keep component directories scannable as the project grows.

5. **`packages/emails/`** — React Email templates as a shared package, consumed by API support module and jobs module (license expiry). Not a root-level directory.

6. **`audio-provider.tsx`** — Dedicated provider for Web Audio API context initialization (browser autoplay policy requires user interaction), sound state management, and volume control. Consumed by `use-audio-alerts.ts` hook.

7. **i18n messages split by feature** — `messages/tr/dashboard.json`, `messages/tr/settings.json`, etc. Prevents a single massive translation file and aligns with feature-based organization.

### Architectural Boundaries

**API Boundaries:**

| Boundary | Endpoint Pattern | Auth Required | Tenant-Scoped |
|----------|-----------------|---------------|---------------|
| Public | `/api/v1/auth/*` | No (login) | No |
| Webhook | `/api/v1/webhooks/:platform` | Platform signature verification | Yes (via payload) |
| Tenant API | `/api/v1/orders/*`, `/api/v1/settings/*`, `/api/v1/analytics/*` | JWT + Role (owner/staff) | Yes |
| Admin API | `/api/v1/admin/*` | JWT + Admin role | No (cross-tenant) |
| SSE | `/api/v1/events/stream` | JWT | Yes (per-tenant stream) |
| Support | `/api/v1/support/*` | JWT + Rate limited | Yes |
| Health | `/api/v1/health` | No | No |

**Service Boundaries (NestJS modules):**

```
                     ┌─────────────┐
                     │  Webhooks   │ ← Marketplace webhooks in
                     │ (ingestion) │
                     └──────┬──────┘
                            │ event: webhook.received
                            ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Marketplace │◄───│   Orders    │───►│   Events    │──► SSE to browser
│ (adapters)  │    │ (processing)│    │  (SSE push) │
└─────────────┘    └──────┬──────┘    └─────────────┘
                          │ event: order.*
                          ▼
                   ┌─────────────┐    ┌─────────────┐
                   │    Audit    │    │    Jobs      │
                   │ (logging)   │    │ (scheduled)  │
                   └─────────────┘    └─────────────┘
```

Module communication rules:
- **Webhooks → Orders:** via EventEmitter2 (`webhook.received` event). No direct service import.
- **Orders → Marketplace:** direct service call (Orders module imports Marketplace module). Orders calls `marketplace.acceptOrder()`.
- **Orders → Events:** via EventEmitter2 (`order.new`, `order.cancelled`, etc.). Events module listens and pushes to SSE.
- **Orders → Audit:** via EventEmitter2. Audit module listens to all domain events.
- **Settings → Orders/Events:** Settings module provides service that other modules import to check feature toggle state.
- **Health → Marketplace:** Health module imports Marketplace module to poll connection status.
- **Jobs → Licenses/Analytics/Marketplace:** Jobs module imports relevant modules for scheduled tasks.
- **All modules → Supabase:** via SupabaseModule (global). Database access through SupabaseService (returns camelCase).

**Data Boundaries:**

| Table | Owner Module | RLS Policy | Accessed By |
|-------|-------------|------------|-------------|
| `tenants` | Tenants | Admin: full access; Owner: own tenant read | Tenants, Admin, Auth |
| `users` | Users | Admin: all; Owner: own tenant users; Staff: own profile | Users, Auth |
| `orders` | Orders | Admin: all; Owner/Staff: own tenant | Orders, Analytics, Admin |
| `order_events` | Webhooks/Orders | Admin: all; Owner: own tenant | Orders, Audit |
| `tenant_settings` | Settings | Owner: own tenant CRUD; Staff: own tenant read | Settings, Orders, Events |
| `marketplace_connections` | Marketplace | Owner: own tenant; credentials via Vault | Marketplace, Health |
| `support_requests` | Support | Admin: all; Owner/Staff: own tenant | Support |
| `licenses` | Licenses | Admin: full; Owner: own tenant read | Licenses, Admin, Jobs |
| `audit_logs` | Audit | Admin: all; Owner: own tenant read | Audit, Admin |
| `order_locations` | Analytics | Owner: own tenant | Analytics |

### Requirements to Structure Mapping

**FR Category → NestJS Module → Next.js Route:**

| FR Category | Backend Module | Frontend Route | Shared Schemas |
|-------------|---------------|----------------|---------------|
| Auth (FR1-FR10) | `auth/`, `users/` | `(auth)/login`, `(auth)/change-password` | `schemas/auth.schema.ts` |
| Marketplace (FR11-FR19) | `webhooks/`, `marketplace/` | — (server-side only) | `types/connection-status.type.ts` |
| Working Hours (FR20-FR22) | `settings/` | `(tenant)/settings` | `schemas/settings.schema.ts` |
| Orders (FR23-FR29) | `orders/` | `(tenant)/dashboard` | `schemas/order.schema.ts` |
| Audio (FR30-FR34) | `events/` (push) | `providers/audio-provider.tsx`, `hooks/use-audio-alerts.ts` | `types/sse-events.type.ts` |
| Printing (FR35-FR38) | `events/` (push) | `packages/ui/components/domain/print-receipt.tsx` | — |
| Config (FR39-FR41) | `settings/` | `(tenant)/settings` | `schemas/settings.schema.ts` |
| Recovery (FR42-FR43) | `events/` | `providers/sse-provider.tsx` | — |
| Onboarding (FR44-FR46) | `auth/`, `marketplace/`, `settings/` | `(onboarding)/setup` | — |
| Real-Time (FR47) | `events/` | `providers/sse-provider.tsx` | `types/sse-events.type.ts` |
| Admin (FR48-FR51) | `tenants/`, `licenses/` | `(admin)/*` | `schemas/tenant.schema.ts` |
| License (FR52-FR53) | `licenses/`, `jobs/` | `(tenant)/layout.tsx` (warnings) | `types/license-status.type.ts` |
| Support (FR54-FR56) | `support/` | `(tenant)/_components/` | `schemas/support.schema.ts` |
| Audit (FR57-FR60) | `audit/` | `(admin)/tenants/[tenant-id]` | — |
| Analytics (FR61-FR69) | `analytics/` | `(tenant)/analytics` | `schemas/analytics.schema.ts` |
| i18n (FR70) | — | `messages/tr/*.json`, `messages/en/*.json` | — |

**Cross-Cutting Concerns → Locations:**

| Concern | Backend Location | Frontend Location |
|---------|-----------------|------------------|
| Tenant isolation | `common/guards/tenant.guard.ts` + RLS | `providers/auth-provider.tsx` |
| Authentication | `common/guards/auth.guard.ts` | `hooks/use-auth.ts`, `providers/auth-provider.tsx` |
| RBAC | `common/guards/roles.guard.ts` + `common/decorators/roles.decorator.ts` | Route group layouts (conditional rendering) |
| Logging | `common/interceptors/logging.interceptor.ts` (Pino) | — (server-side only) |
| Error handling | `common/filters/http-exception.filter.ts` | TanStack Query `onError` |
| Validation | `common/pipes/zod-validation.pipe.ts` | `packages/api/src/schemas/*.schema.ts` |
| snake_case ↔ camelCase | `supabase/supabase.service.ts` (data access boundary) | — (API client receives camelCase) |
| PII masking | Orders service (query-level masking) | `lib/format.ts` |
| Feature toggles | `settings/settings.service.ts` (queried by other modules) | `hooks/use-tenant-settings.ts` |
| Audio management | — | `providers/audio-provider.tsx` + `hooks/use-audio-alerts.ts` |

### Integration Points

**Internal Communication (Event-Driven):**
```
Webhook received → webhook.received (EventEmitter2)
  → Orders service processes → order.new / order.cancelled / order.modified
    → Events service pushes SSE to browser
    → Audit service logs the event
    → (If acceptance fails) → order.acceptance_failed → Events pushes alert
```

**External Integrations:**

| Service | Integration Point | Protocol |
|---------|------------------|----------|
| Trendyol Go / Yemeksepeti | `marketplace/adapters/*.adapter.ts` | REST API (outbound) + Webhooks (inbound) |
| Gmail SMTP | `support/support.service.ts` | SMTP via Nodemailer |
| Supabase Auth | `auth/auth.service.ts` | @supabase/supabase-js admin API |
| Supabase DB | `supabase/supabase.service.ts` | @supabase/supabase-js |

**Data Flow (Order Pipeline):**
```
Marketplace → POST /api/v1/webhooks/:platform
  → WebhooksController validates signature + persists raw payload → ACK 200
  → EventEmitter: webhook.received
  → OrdersService: dedup check → create order record → call MarketplaceService.acceptOrder()
    → (success) → emit order.new → EventsService pushes SSE
    → (failure) → retry with backoff → (exhausted) → emit order.acceptance_failed
  → AuditService: log all steps with timestamps + correlation ID
  → Browser: EventSource receives order.new → AudioProvider plays chime → print receipt → update feed
```

### Development Workflow Integration

**Development:** `pnpm dev` runs TurboRepo → starts both apps in watch mode
- `apps/api`: NestJS with `--watch` on port 3000
- `apps/web`: Next.js with Turbopack on port 3001
- Supabase: running via `supabase start` (local Docker)

**Build:** `pnpm build` → TurboRepo builds in dependency order
- `packages/api` and `packages/emails` build first (shared types/templates)
- `apps/api` and `apps/web` build in parallel

**Testing:** `pnpm test` → runs all workspace tests
- Co-located `.spec.ts` files for unit tests
- `test/` directory for e2e tests

**Deployment:** Docker Compose on VPS
- NestJS built to `dist/` → runs as Node process
- Next.js built to `.next/` → runs as Node process
- Supabase stack via Docker Compose
- Nginx reverse proxy in front

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and proven working together. No version conflicts. The NestJS + Next.js + Supabase stack is already initialized and building successfully. Additional libraries (TanStack Query, Leaflet, next-intl, Pino, @nestjs/throttler, Nodemailer, React Email) are all compatible with the existing foundation.

**Pattern Consistency:**
All patterns align with technology choices:
- Naming: snake_case (DB) → camelCase (TS/JSON) with single transform point at SupabaseService
- Events: `domain.event` naming consistent for both internal EventEmitter2 and external SSE
- API: Standard envelope format, consistent HTTP status codes, zod validation everywhere
- Structure: NestJS modules follow domain boundaries, Next.js route groups follow user roles

**Structure Alignment:**
Project structure directly supports all architectural decisions. Every module has a clear domain, every route group serves a distinct user role, and cross-cutting concerns have dedicated locations. Integration points (SSE, events, shared schemas) are explicitly mapped.

### Requirements Coverage ✅

**Functional Requirements: 70/70 covered**
Every FR category maps to at least one NestJS module and (where user-facing) a Next.js route. No orphan requirements. Cross-cutting FRs (tenant isolation, feature toggles, observability) are addressed via guards, interceptors, providers, and shared services.

**Non-Functional Requirements: 27/31 fully covered, 4 deferred with documented path**

| NFR | Status | Resolution |
|-----|--------|-----------|
| NFR16 (zero-downtime deploys) | Deferred | Deploy off-hours for MVP. Add Nginx failover or Docker Swarm rolling updates post-MVP. |
| NFR24-25 (data retention/archival) | Deferred | No 2-year data in MVP. Add scheduled archival job in `jobs/` module when data volume warrants it. |
| NFR26 (tenant data deletion) | Noted | Cascade delete method to be implemented in `tenants.service.ts`. Required before production KVKK compliance. |
| NFR20 (horizontal SSE scaling) | Noted | Single server for MVP. Redis pub/sub for cross-instance SSE event distribution when horizontally scaling. |

### Implementation Readiness ✅

**Decision Completeness:**
- All critical decisions documented with library names and rationale
- Implementation patterns cover naming, structure, format, communication, and process
- Consistency rules are specific enough for AI agents to follow without ambiguity
- Concrete examples provided for correct patterns and anti-patterns

**Structure Completeness:**
- Full directory tree with every module, route, provider, hook, and shared package
- ✅ EXISTS markers for files already in the codebase
- FR → module → route mapping table for traceability
- Cross-cutting concerns mapped to specific file locations

**Pattern Completeness:**
- 10 mandatory enforcement rules for AI agents
- Named conflict points all resolved
- Error handling, validation, retry, and loading state patterns specified

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (70 FRs, 31 NFRs, UX spec)
- [x] Scale and complexity assessed (medium-high, 12 major components)
- [x] Technical constraints identified (marketplace API not yet available, solo developer, side project economics)
- [x] Cross-cutting concerns mapped (8 concerns: tenant isolation, real-time pipeline, health monitoring, observability, security, retry/resilience, feature toggles, i18n)

**✅ Architectural Decisions**
- [x] Critical decisions documented (RLS, Supabase Auth, SSE, layered RBAC, webhook pattern)
- [x] Technology stack fully specified (all libraries named with rationale)
- [x] Integration patterns defined (adapter pattern, event-driven, SSE push)
- [x] Performance considerations addressed (latency targets, persist-before-ACK, idempotent processing)

**✅ Implementation Patterns**
- [x] Naming conventions established (DB, API, code — with examples)
- [x] Structure patterns defined (NestJS modules, Next.js route groups, shared packages)
- [x] Communication patterns specified (SSE event format, EventEmitter2, API envelope)
- [x] Process patterns documented (error handling, validation, retry, loading states)

**✅ Project Structure**
- [x] Complete directory structure defined with all files and directories
- [x] Component boundaries established (module communication rules, data boundaries)
- [x] Integration points mapped (event flow, external services, data pipeline)
- [x] Requirements to structure mapping complete (FR → module → route table)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all critical decisions made, all FRs covered, structure is concrete and specific. The 4 deferred NFRs are not blocking for MVP and have documented resolution paths.

**Key Strengths:**
- Event-driven architecture cleanly decouples webhook ingestion from order processing from browser notification
- Layered RBAC (NestJS Guards + Supabase RLS + JWT claims) provides defense in depth for tenant isolation
- Existing monorepo foundation is solid — no starter template changes needed
- Adapter pattern for marketplace integration handles the unknown API timeline gracefully
- Party Mode review caught 7 structural improvements that were incorporated

**Areas for Future Enhancement:**
- Zero-downtime deployment strategy (post-MVP, when uptime becomes critical)
- Data archival mechanism (when 2-year retention boundary approaches)
- Horizontal scaling for SSE (Redis pub/sub when single server is insufficient)
- KVKK-compliant tenant data deletion procedure (before production compliance)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented in this file
- Use implementation patterns consistently — naming, structure, format, communication, process
- Respect module boundaries — use EventEmitter2 for cross-module communication, direct imports only within modules
- Generate NestJS features via `nest generate` CLI — never manually create module/controller/service files
- Every database query must be tenant-scoped via `tenant_id`
- Every SSE event must include tenantId, timestamp, correlationId
- Validate all input with zod v4 at the controller boundary
- Log with Pino — no console.log in production code

**First Implementation Priority:**
1. Supabase schema + RLS policies + Auth configuration
2. NestJS common/ infrastructure (guards, interceptors, filters, decorators, pipes)
3. Auth module with forced password reset flow
4. Tenant management module (admin creates tenants)

**Static Assets Note:**
Audio alert sound files go in `apps/web/public/sounds/` (e.g., `order-chime.mp3`, `cancellation-alert.mp3`, `warning-tone.mp3`). Loaded by `audio-provider.tsx`.
