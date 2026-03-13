---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - product-brief-jetadisyon-2026-03-07.md
  - prd.md
  - ux-design-specification.md
  - architecture.md
---

# JetAdisyon - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for JetAdisyon, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Admin can create tenant accounts with business details and initial credentials
FR2: Tenant Owner can log in and access their tenant's dashboard
FR3: Tenant Staff can log in and access a restricted view of their tenant's dashboard
FR4: Admin can log in and access the admin panel with global visibility
FR5: System enforces tenant data isolation — no user can access another tenant's data
FR6: Admin and Tenant Owner can create and manage Staff accounts for a tenant
FR7: System enforces role-based permissions (Admin, Tenant Owner, Tenant Staff) with appropriate access restrictions
FR8: Tenant Owner and Tenant Staff can log out
FR9: Tenant Owner can change their own password
FR10: Admin and Tenant Owner can deactivate and delete Staff accounts
FR11: Tenant Owner can connect their marketplace account to JetAdisyon (via OAuth if available, or manual credential entry as fallback)
FR12: System receives incoming orders via webhook from the connected marketplace
FR13: System automatically accepts received orders on the marketplace platform
FR14: System retries failed order acceptance up to 5 times with exponential backoff, then alerts the user if acceptance has not succeeded
FR15: System queues orders received during connectivity outages and processes them upon reconnection
FR16: System monitors marketplace connection health and displays status to the tenant
FR17: System monitors marketplace service availability and notifies tenant of third-party issues
FR18: System distinguishes between JetAdisyon-side and marketplace-side connectivity problems in user-facing alerts
FR19: System handles marketplace acceptance timeout — if the marketplace expires an order before retries succeed, the system alerts the tenant and logs the event
FR20: Tenant Owner can configure working hours during which the system is active
FR21: System synchronizes working hours with the marketplace platform using whichever method the platform API supports (read, push, or both) — mechanism determined during integration
FR22: System is only active during configured working hours — idle outside them
FR23: Tenant Owner and Tenant Staff can view order history for their tenant
FR24: System displays orders with masked customer PII (e.g., "İltan C***" instead of full name)
FR25: Admin can view any tenant's order history and system health data
FR26: System records order processing metadata (timestamps, latency, acceptance status) for diagnostics
FR27: Tenant Owner can view their own order processing metrics (latency, success rate)
FR28: System receives and processes order cancellation events from the marketplace and alerts the tenant (audio + visual, cancellation slip if printing enabled)
FR29: System receives and processes order modification events from the marketplace and alerts the tenant (updated receipt if printing enabled, visual + audio notification)
FR30: System plays an audible alert sound when a new order is received (browser must be open)
FR31: System plays a distinct warning sound for critical events (connection loss, system errors)
FR32: Tenant Owner can select from available alert sounds
FR33: Tenant Owner can adjust alert volume
FR34: Tenant Owner can enable or disable audio alerts independently of other features
FR35: System triggers automatic receipt printing when a new order is received (browser must be open)
FR36: Receipts display order details (items, quantities, notes) in a large-font, high-contrast, scannable layout
FR37: Tenant Owner can configure printer settings
FR38: Tenant Owner can enable or disable receipt printing independently of other features
FR39: Tenant Owner can independently toggle auto-accept, receipt printing, and audio alerts on or off
FR40: Tenant Staff can activate a single "System On/Off" emergency toggle that pauses all features (auto-accept, print, audio)
FR41: System persists all configuration settings across sessions
FR42: When the browser reconnects after being closed, system surfaces orders that arrived while offline — queuing missed prints for printing and indicating missed alerts
FR43: Dashboard rebuilds from server data when the browser tab is opened or refreshed — no state lost
FR44: System guides new tenants through a step-by-step onboarding flow (connect marketplace → configure print and audio → test)
FR45: Onboarding strongly recommends configuring print and audio as first priority, with skip as a secondary option
FR46: Tenant Owner can trigger a test order at any time to verify the full flow (alert + print) — not limited to onboarding
FR47: System pushes order events and status changes to the browser in real-time (for audio alerts, print triggers, and dashboard updates)
FR48: Admin can create, view, update, and deactivate tenant accounts
FR49: Admin can set and manage license status per tenant (free, trial, active, expired, deactivated)
FR50: Admin can view per-tenant diagnostics (order history, connection logs, processing latency, print status)
FR51: Admin can view a global overview of all tenants and their current status
FR52: System warns tenant owner before license/trial expiry (e.g., 7 days, 3 days, 1 day before)
FR53: System defines tenant-facing behavior when license expires (read-only dashboard, order acceptance stops, clear visual indication of expired state)
FR54: Tenant Owner and Tenant Staff can submit a support request via an in-app contact form
FR55: Support requests are sent to admin via email
FR56: System rate-limits support form submissions to a maximum of 3 per hour per user to prevent spam
FR57: System logs order processing events (received, accepted, printed, failed) with timestamps
FR58: System tracks and records processing latency metrics
FR59: System tracks and records error events for monitoring and diagnostics
FR60: System logs staff actions (emergency toggle, configuration changes) with timestamp and user identity, visible to Tenant Owner as an activity log
FR61: Tenant Owner can access an analytics dashboard showing order count, total revenue, and average order value for a selected time period
FR62: Analytics dashboard displays a heat map visualization of order locations based on delivery address data
FR63: Tenant Owner can overlay order amounts per geographic area on the heat map
FR64: Tenant Owner can overlay profit per geographic area on the heat map, calculated from order revenue minus cost data (sourced from marketplace API, order payload, or manually entered by Tenant Owner — exact source determined upon marketplace API access)
FR65: Tenant Owner can filter analytics data by date range (day, week, month, custom range)
FR66: Tenant Owner can interact with the heat map — zoom, pan, and tap a cluster to view area-level detail (order count, revenue, profit for that zone)
FR67: Tenant Owner can view a time-series animation of order density over the selected period
FR68: Tenant Owner can configure cost data per menu item for profit calculation (used when marketplace or order data does not include cost information)
FR69: System extracts and stores location data from orders for analytics use — source determined by marketplace API capabilities (delivery address geocoding, coordinates in order payload, or manual area tagging by Tenant Owner as fallback)
FR70: System UI supports Turkish (default) and English, configurable per tenant in settings
FR71: System supports light mode, dark mode, and system-preference-following mode, configurable per tenant in settings — defaults to system preference

### NonFunctional Requirements

NFR1: Order processing latency (webhook received → order accepted on marketplace) must complete in under 2 seconds under normal conditions
NFR2: Real-time push events (order alerts, print triggers, status updates) must reach the browser within 500ms of server-side event
NFR3: Dashboard page load must complete within 3 seconds on a 10 Mbps connection
NFR4: System must handle up to 5 concurrent orders per minute per tenant without degradation
NFR5: API responses for user-initiated actions (settings changes, order history queries) must complete within 1 second
NFR6: All passwords hashed using bcrypt or argon2 — no plaintext or reversible encryption
NFR7: All data in transit encrypted via TLS (HTTPS only, no HTTP fallback)
NFR8: Multi-tenant data isolation enforced at the database level — queries scoped to tenant context, no cross-tenant data access possible even via direct API calls
NFR9: Customer PII masked in all tenant-facing views — no full names, no unmasked phone numbers or addresses
NFR10: Session management with secure tokens, automatic expiry, and logout invalidation
NFR11: Rate limiting on authentication endpoints — maximum 5 failed login attempts per 15 minutes per IP address, with temporary lockout after threshold
NFR12: Admin actions (tenant creation, deactivation, license changes) logged with timestamp and actor identity
NFR13: Zero order loss due to system fault — every webhook received must be persisted before acknowledgment (at-least-once processing)
NFR14: System uptime target of 99.5% during tenant working hours (allows ~3.5 hours downtime per month, scheduled during off-hours)
NFR15: Automatic reconnection for real-time push connections — browser client reconnects without user intervention after temporary network disruption
NFR16: Webhook endpoint must remain available even during application deployments — no incoming orders lost due to deployment activity
NFR17: Failed order acceptance retries must not exceed marketplace timeout window — system detects and handles platform-side expiry
NFR18: Architecture must support growth from 3-5 tenants (MVP) to 50+ tenants without fundamental redesign
NFR19: Tenant-scoped queries must complete within 100ms at 50+ tenant scale under normal load
NFR20: Backend architecture must support horizontal scaling to handle growth beyond 50 tenants without architectural redesign
NFR21: Adding a new marketplace platform must not require changes to core order processing, notification, or tenant management systems
NFR22: Webhook processing must be idempotent — duplicate webhooks from the marketplace must not create duplicate orders
NFR23: Marketplace API credentials stored encrypted at rest — never logged, never exposed in error messages or client-side code
NFR24: Order history retained in active storage for 2 years per tenant
NFR25: Orders older than 2 years archived to cold storage (not deleted) — retrievable if needed but not queried in normal operation
NFR26: Tenant data fully deletable upon account termination (KVKK right to deletion)
NFR27: MVP targets Chrome and Chromium-based browsers (Edge, Brave) on desktop — the primary environment for restaurant laptop setups
NFR28: Core functionality (dashboard, alerts, printing) must work without browser extensions or plugins
NFR29: Analytics dashboard must load with heat map rendered within 3 seconds for up to 10,000 orders in the selected period on a 10 Mbps connection
NFR30: Heat map interactions (zoom, pan, tap) must respond within 200ms
NFR31: Date range filter changes must refresh analytics data and re-render the heat map within 2 seconds

### Additional Requirements

**From Architecture:**
- Existing monorepo foundation: Next.js 16 + NestJS 11 + Supabase (self-hosted) + Tailwind v4 + shadcn/ui v4, TurboRepo + pnpm (no starter template needed — foundation already built)
- Multi-tenant isolation via RLS with tenant_id on all tenant-scoped tables
- Supabase Auth with email/password — admin creates accounts with temporary password, forced first-login password reset via `must_change_password` metadata flag
- Layered RBAC: NestJS Guards (route-level) + Supabase RLS (DB-level) + JWT custom claims (tenant_id, role)
- SSE (Server-Sent Events) for real-time server → browser push via NestJS native @Sse() decorator + browser EventSource API
- Webhook ingestion: persist raw payload before ACK (at-least-once), deduplicate via unique webhook/order ID, async processing via EventEmitter2
- Marketplace adapter pattern: abstract interface, concrete adapters per platform (e.g., trendyol-go.adapter.ts)
- TanStack Query for frontend server state management
- Leaflet + react-leaflet for analytics heat map (open-source, no API key required)
- next-intl for internationalization (Turkish default + English)
- Pino structured logging via nestjs-pino with correlation IDs
- @nestjs/throttler for rate limiting
- Supabase Vault (pgsodium) for marketplace credential encryption at rest
- Nodemailer + Gmail SMTP + React Email for email delivery (support forms, license expiry warnings)
- VPS with Docker Compose (Hetzner/DigitalOcean, ~€10-20/month)
- NestJS modules communicate via EventEmitter2 for cross-module decoupling (no direct cross-module service imports)
- snake_case in DB ↔ camelCase in TypeScript/JSON, transform at SupabaseService boundary
- zod v4 for all validation (no class-validator) — shared schemas in packages/api
- No barrel exports — direct imports everywhere
- NestJS features created via `nest generate` CLI
- packages/emails for React Email templates (support request, license expiry)
- Implementation sequence: Supabase schema + RLS → Auth + Guards → Tenant management → SSE infra → Webhook/order pipeline → Frontend dashboard → Feature toggles → Printing → Analytics → i18n → Support → Observability

**From UX Design:**
- Split Panel layout for service mode dashboard: left panel (health + stats), right panel (live order feed)
- Three experience modes: Service Mode (passive monitoring), Configuration Mode (onboarding + settings), Insight Mode (analytics exploration)
- Audio-first interaction model: distinct sounds for new orders, cancellations, modifications, and warnings — ear learns the system before the eye
- Chrome kiosk printing mode (`--kiosk-printing` flag) for silent auto-print with zero interaction — one-time setup during onboarding
- Health status bar persistent across all pages (not just dashboard) — part of page chrome
- Granular connection indicators with Turkish labels: "Sistem Bağlantısı" (browser↔backend), "Trendyol Go Bağlantısı" (backend↔marketplace)
- Order card information hierarchy: item names (largest) → item details (portion, mods, promos) → price (large, right-aligned) → time (large) → metadata → customer notes (highlighted) → action buttons (reserved area)
- Green highlight fade-out (~10 seconds) for new orders in the feed
- Three-section top nav for tenants: Dashboard, Analitik, Ayarlar — no sidebar
- Sidebar navigation for admin panel (standard SaaS pattern)
- Auto-save everywhere — no save buttons, toast confirmations for every change
- Settings organized by section on one scrollable page: feature toggles, audio, print, working hours, theme, language, cost data
- Staff view is subtraction from owner view — no separate staff interface, just hide what they can't access
- Emergency toggle with confirmation dialog: "Tüm sistemler duraklatılacak. Emin misiniz?"
- Dark/light mode support, default to system preference, configurable per tenant
- Inter as primary typeface, typography scale biased large (body-lg 18px minimum in service mode, display 36px for key metrics)
- 8px base grid, generous spacing, minimum 44x44px touch targets
- Warm amber/orange accent color for brand; green/amber/red reserved exclusively for semantic status
- WCAG AA compliance minimum, status never communicated through color alone
- Receipt layout: items+quantities (largest) → delivery/prep notes → order number+timestamp → "İPTAL EDİLDİ"/"DEĞİŞTİRİLDİ" headers for cancellation/modification receipts
- Analytics: heat map as hero element (60-70% viewport), default view = last 7 days order density, overlay toggles (density/amount/profit), date presets in Turkish
- Onboarding: linear 3-step flow, print/audio skip actively discouraged, test order as completion milestone
- Error messages always in plain Turkish with explicit next action
- Outside working hours: dashboard loads in inactive state with clear messaging

### FR Coverage Map

FR1: Epic 1 — Admin creates tenant accounts
FR2: Epic 1 — Tenant Owner login
FR3: Epic 1 — Tenant Staff restricted login
FR4: Epic 1 — Admin login to admin panel
FR5: Epic 1 — Tenant data isolation enforcement
FR6: Epic 1 — Staff account management
FR7: Epic 1 — Role-based permission enforcement
FR8: Epic 1 — Logout functionality
FR9: Epic 1 — Password change
FR10: Epic 1 — Staff account deactivation/deletion
FR11: Epic 2 — Marketplace account connection
FR12: Epic 2 — Webhook order reception
FR13: Epic 2 — Auto-accept orders on marketplace
FR14: Epic 2 — Retry failed acceptance with backoff
FR15: Epic 2 — Queue orders during outages
FR16: Epic 2 — Marketplace connection health monitoring
FR17: Epic 2 — Marketplace service availability monitoring
FR18: Epic 2 — Distinguish JetAdisyon vs marketplace connectivity issues
FR19: Epic 2 — Handle marketplace acceptance timeout
FR20: Epic 5 — Working hours configuration
FR21: Epic 5 — Working hours marketplace sync
FR22: Epic 5 — System active only during working hours
FR23: Epic 3 — View order history
FR24: Epic 3 — PII masking on orders
FR25: Epic 3 — Admin view any tenant's order history
FR26: Epic 2 — Order processing metadata recording
FR27: Epic 3 — Owner view processing metrics
FR28: Epic 3 — Order cancellation handling
FR29: Epic 3 — Order modification handling
FR30: Epic 4 — Audio alert on new order
FR31: Epic 4 — Distinct warning sound for critical events
FR32: Epic 4 — Alert sound selection
FR33: Epic 4 — Alert volume adjustment
FR34: Epic 4 — Audio alerts independent toggle
FR35: Epic 4 — Auto receipt printing
FR36: Epic 4 — Receipt layout (large-font, high-contrast)
FR37: Epic 4 — Printer settings configuration
FR38: Epic 4 — Receipt printing independent toggle
FR39: Epic 5 — Independent feature toggles
FR40: Epic 5 — Staff emergency system toggle
FR41: Epic 5 — Settings persistence across sessions
FR42: Epic 3 — Missed event recovery on reconnect
FR43: Epic 3 — Dashboard rebuilds from server data
FR44: Epic 6 — Step-by-step onboarding flow
FR45: Epic 6 — Onboarding recommends print/audio setup
FR46: Epic 6 — Test order trigger anytime
FR47: Epic 2 — Real-time push to browser
FR48: Epic 1 — Admin tenant CRUD
FR49: Epic 1 — Admin license status management
FR50: Epic 9 — Admin per-tenant diagnostics
FR51: Epic 1 — Admin global tenant overview
FR52: Epic 8 — License/trial expiry warnings
FR53: Epic 8 — Expired license tenant behavior
FR54: Epic 8 — In-app support contact form
FR55: Epic 8 — Support requests sent via email
FR56: Epic 8 — Support form rate limiting
FR57: Epic 9 — Order processing event logging
FR58: Epic 9 — Processing latency metrics
FR59: Epic 9 — Error event tracking
FR60: Epic 9 — Staff action audit log
FR61: Epic 7 — Analytics dashboard (order count, revenue, avg)
FR62: Epic 7 — Heat map visualization
FR63: Epic 7 — Order amount overlay on map
FR64: Epic 7 — Profit overlay on map
FR65: Epic 7 — Date range filtering
FR66: Epic 7 — Heat map interaction (zoom, pan, tap)
FR67: Epic 7 — Time-series order density animation
FR68: Epic 7 — Cost data configuration for profit calc
FR69: Epic 7 — Location data extraction from orders
FR70: Epic 5 — Turkish/English localization
FR71: Epic 5 — Dark/light/system mode appearance

## Epic List

### Epic 1: Secure Multi-Tenant Foundation
Admin can create isolated restaurant accounts, all users log in securely with role-appropriate access, and admin has a global tenant overview. Includes foundational infrastructure: Supabase schema + RLS policies, Pino logging + correlation IDs, NestJS common/ (guards, interceptors, filters, decorators, pipes), frontend providers (TanStack Query, auth), layout shells (tenant top nav, admin sidebar, auth pages).
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR48, FR49, FR51

### Epic 2: Order Processing Engine
Restaurant owners connect their marketplace account, and orders are automatically accepted with 100% reliability. Connection health is monitored, events are pushed to the browser in real-time. Marketplace adapter interface built first; concrete adapter implementation slots in when API access is granted.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR26, FR47

### Epic 3: Service Mode Dashboard
Owners and staff see a live order feed in the split-panel layout, view order history with PII masking, handle cancellations and modifications visually, and the dashboard rebuilds seamlessly after any disconnection.
**FRs covered:** FR23, FR24, FR25, FR27, FR28, FR29, FR42, FR43

### Epic 4: Audio Alerts & Receipt Printing
Orders announce themselves via distinct audio chimes, receipts print automatically — the complete hands-free kitchen experience. Audio stories prioritized before print stories within this epic.
**FRs covered:** FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38

### Epic 5: Tenant Configuration & Feature Toggles
Owners customize their restaurant's setup — working hours, independent feature toggles (auto-accept, print, audio), language preference. Staff can use the emergency system toggle. All settings auto-save with toast confirmations.
**FRs covered:** FR20, FR21, FR22, FR39, FR40, FR41, FR70, FR71

### Epic 6: Guided Onboarding
New restaurant owners complete setup in under 15 minutes — a guided 3-step flow (connect marketplace → configure print/audio → test order) that verifies everything works. Highest dependency risk: requires Epics 2, 4, 5.
**FRs covered:** FR44, FR45, FR46

### Epic 7: Analytics Dashboard
Owners explore where their orders come from on a heat map, toggle revenue and profit overlays by area, filter by date, and discover business patterns. Default view loads with sensible defaults (last 7 days, density) — zero configuration needed.
**FRs covered:** FR61, FR62, FR63, FR64, FR65, FR66, FR67, FR68, FR69

### Epic 8: License Lifecycle & Support
System proactively warns owners before trial/subscription expiry with graceful degradation on expiration, and users can reach support directly from the app via a rate-limited contact form.
**FRs covered:** FR52, FR53, FR54, FR55, FR56

### Epic 9: Observability & Admin Diagnostics
Admin can diagnose tenant issues with full visibility into connection logs, processing latency, and error history. Owners see a staff activity log. User-facing diagnostic views delivered here; foundational Pino logging infrastructure established in Epic 1.
**FRs covered:** FR50, FR57, FR58, FR59, FR60

---

## Epic 1: Secure Multi-Tenant Foundation

Admin can create isolated restaurant accounts, all users log in securely with role-appropriate access, and admin has a global tenant overview. Includes foundational infrastructure: Supabase schema + RLS policies, Pino logging + correlation IDs, NestJS common/ (guards, interceptors, filters, decorators, pipes), frontend providers (TanStack Query, auth), layout shells (tenant top nav, admin sidebar, auth pages).

### Story 1.1: Project Infrastructure & Admin Login

As an Admin,
I want to log in to the admin panel,
So that I can begin managing restaurant tenants.

**Acceptance Criteria:**

**Given** the NestJS backend is running with Pino structured logging, correlation IDs, and common infrastructure (auth guard, global exception filter, zod validation pipe, logging interceptor)
**When** the admin navigates to the login page
**Then** a login form is displayed with email and password fields
**And** the form validates input with zod v4 before submission

**Given** valid admin credentials are entered
**When** the admin submits the login form
**Then** the system authenticates via Supabase Auth, issues a JWT with role claim set to "admin"
**And** the admin is redirected to the admin panel with sidebar navigation layout
**And** the session is managed with secure tokens and automatic expiry (NFR10)

**Given** invalid credentials are entered
**When** the admin submits the login form more than 5 times in 15 minutes from the same IP
**Then** the system temporarily locks out further attempts on the auth endpoint (NFR11)
**And** rate limiting is enforced via @nestjs/throttler

**Given** the admin is authenticated
**When** any API request is made
**Then** the request is logged via Pino with a unique correlation ID, timestamp, and actor identity

**Given** the frontend application loads
**When** any page is rendered
**Then** TanStack Query provider and Auth provider are initialized and available to all components

### Story 1.2: Tenant Creation & Owner Account Setup

As an Admin,
I want to create a new restaurant tenant with business details and generate initial credentials,
So that restaurant owners have accounts ready to use.

**Acceptance Criteria:**

**Given** the admin is logged in to the admin panel
**When** the admin navigates to the tenant creation form
**Then** a form is displayed with fields for business name, owner name, contact info, and marketplace platform

**Given** valid tenant details are submitted
**When** the admin creates a new tenant
**Then** a row is inserted into the tenants table with the business details
**And** a Supabase Auth user is created for the tenant owner with a temporary password and `must_change_password: true` in user metadata
**And** the JWT custom claims include `tenant_id` and `role: tenant_owner`
**And** RLS policies on the tenants table restrict access to admin (full) and owner (own tenant read)

**Given** the tenant is created
**When** the admin views the creation confirmation
**Then** the initial credentials (email + temporary password) are displayed for the admin to share with the owner
**And** the admin action (tenant creation) is logged with timestamp and actor identity (NFR12)

**Given** any database query on the tenants table
**When** executed by a non-admin user
**Then** RLS policies enforce that only the user's own tenant data is returned (NFR8)

### Story 1.3: Tenant Owner Login & Forced Password Reset

As a Tenant Owner,
I want to log in with my provided credentials and set my own password on first login,
So that my account is secure from the start.

**Acceptance Criteria:**

**Given** a tenant owner has received initial credentials from the admin
**When** they log in for the first time
**Then** the system detects `must_change_password: true` in user metadata
**And** the owner is redirected to a mandatory password change page before accessing the dashboard

**Given** the owner is on the password change page
**When** they enter and confirm a new password meeting security requirements
**Then** the password is updated via Supabase Auth (hashed with bcrypt/argon2 — NFR6)
**And** the `must_change_password` metadata flag is set to `false`
**And** the owner is redirected to the tenant dashboard

**Given** a tenant owner has completed password reset
**When** they log in subsequently
**Then** they are taken directly to the tenant dashboard with the top navigation layout (Dashboard, Analitik, Ayarlar)
**And** the dashboard shows a placeholder/empty state ("no orders yet")

**Given** a tenant owner or staff member is logged in
**When** they click the logout button
**Then** the session is invalidated on the server, tokens are cleared, and the user is redirected to the login page (FR8)

**Given** auth rate limiting is active
**When** more than 5 failed login attempts occur within 15 minutes from the same IP
**Then** the system temporarily blocks further login attempts (NFR11)

### Story 1.4: Role-Based Access & Tenant Data Isolation

As a Tenant Owner,
I want my restaurant's data to be completely isolated from other restaurants with role-appropriate access enforced,
So that my business information is private and secure.

**Acceptance Criteria:**

**Given** multiple tenants exist in the system
**When** a tenant owner queries any tenant-scoped table (orders, settings, users, etc.)
**Then** RLS policies ensure only rows matching their `tenant_id` JWT claim are returned
**And** no cross-tenant data is accessible even via direct API calls (NFR8)

**Given** a request hits any protected API endpoint
**When** the NestJS auth guard validates the JWT
**Then** the tenant guard extracts `tenant_id` from JWT claims and injects it into the request context
**And** the roles guard checks the user's role against the endpoint's required roles

**Given** a user with role `tenant_owner`
**When** they attempt to access admin-only endpoints (e.g., `/api/v1/admin/*`)
**Then** the request is rejected with 403 Forbidden

**Given** a user with role `admin`
**When** they access cross-tenant endpoints
**Then** they can view data across all tenants (admin is not tenant-scoped)

**Given** the system processes any tenant-scoped operation
**When** the database query is constructed
**Then** the query is always scoped by `tenant_id` — enforced at both the NestJS guard level and the Supabase RLS policy level (defense in depth)

### Story 1.5: Staff Account Management

As a Tenant Owner,
I want to create, manage, deactivate, and delete staff accounts for my restaurant,
So that my team can access the system with the right restrictions.

**Acceptance Criteria:**

**Given** a tenant owner is logged in
**When** they navigate to staff management in settings
**Then** they see a list of existing staff accounts for their tenant with name, email, and status

**Given** the owner fills in staff details (name, email)
**When** they create a new staff account
**Then** a Supabase Auth user is created with role `tenant_staff`, the same `tenant_id`, and `must_change_password: true`
**And** the staff member can log in with their initial credentials (FR6)

**Given** a tenant staff member logs in
**When** the dashboard loads
**Then** they see a restricted view — order feed and dashboard visible, but no settings page, no configuration options, no marketplace connection management (FR3)
**And** the staff view is the owner view with restricted elements hidden (subtraction, not a separate interface)

**Given** a tenant owner or admin
**When** they deactivate or delete a staff account
**Then** the staff member can no longer log in, and their active sessions are invalidated (FR10)

**Given** the admin is logged in
**When** they view a specific tenant's detail page
**Then** they can also see and manage staff accounts for that tenant (FR6)

### Story 1.6: Admin Tenant Overview & Lifecycle Management

As an Admin,
I want to view all tenants in a global overview, update tenant details, manage license status, and deactivate accounts,
So that I have full control over the restaurant lifecycle.

**Acceptance Criteria:**

**Given** the admin is logged in to the admin panel
**When** they navigate to the tenant overview page
**Then** a list of all tenants is displayed showing business name, owner name, license status, and last active date (FR51)
**And** the list is filterable by status (active, trial, expired, deactivated) and sortable by name, status, or last active

**Given** the admin clicks on a specific tenant
**When** the tenant detail page loads
**Then** it shows business details, owner info, license status, and account creation date
**And** the admin can edit business details and save changes (FR48 — update)

**Given** the admin manages a tenant's license
**When** they change the license status (free, trial, active, expired, deactivated)
**Then** the status is updated in the database with an effective date
**And** the action is logged with timestamp and admin identity (NFR12, FR49)

**Given** the admin deactivates a tenant
**When** the deactivation is confirmed
**Then** the tenant's status changes to "deactivated"
**And** all users for that tenant can no longer log in (FR48 — deactivate)
**And** the deactivation is logged with timestamp and admin identity

---

## Epic 2: Order Processing Engine

Restaurant owners connect their marketplace account, and orders are automatically accepted with 100% reliability. Connection health is monitored, events are pushed to the browser in real-time. Marketplace adapter interface built first; concrete adapter implementation slots in when API access is granted.

### Story 2.1: SSE Infrastructure & Real-Time Event Pipeline

As a Tenant Owner,
I want to receive real-time updates in my browser without refreshing,
So that I see order events and status changes the moment they happen.

**Acceptance Criteria:**

**Given** a tenant owner or staff member is authenticated
**When** they open the dashboard
**Then** the browser establishes an SSE connection to `/api/v1/events/stream` via native EventSource API
**And** the connection is authenticated via JWT and scoped to the user's tenant

**Given** the NestJS events module emits an event for a specific tenant
**When** the event is dispatched via EventEmitter2
**Then** the SSE controller pushes it to the correct tenant's stream within 500ms (NFR2)
**And** each event includes type, tenantId, timestamp, and correlationId

**Given** the SSE connection drops due to network disruption
**When** the browser detects the disconnection
**Then** EventSource automatically reconnects without user intervention (NFR15)
**And** the SSE provider in React tracks connection state (CONNECTING, OPEN, CLOSED)

**Given** no tenant-scoped events exist for another tenant
**When** a tenant owner is connected to their SSE stream
**Then** they never receive events belonging to other tenants

### Story 2.2: Marketplace Adapter Interface & Connection Setup

As a Tenant Owner,
I want to connect my marketplace account to JetAdisyon,
So that my orders can flow into the system.

**Acceptance Criteria:**

**Given** the tenant owner navigates to marketplace connection settings
**When** the connection form is displayed
**Then** it allows entering marketplace credentials (OAuth if available, manual credential entry as fallback — FR11)

**Given** valid marketplace credentials are submitted
**When** the system processes the connection
**Then** credentials are encrypted at rest via Supabase Vault (pgsodium) and stored in the marketplace_connections table (NFR23)
**And** credentials are never logged, never exposed in error messages or client-side code
**And** RLS policies restrict access to the owning tenant

**Given** the marketplace module
**When** it processes any marketplace operation
**Then** it uses an abstract adapter interface that concrete platform adapters implement (NFR21)
**And** adding a new marketplace platform requires only a new adapter — no changes to core order processing, notification, or tenant management

**Given** the connection is established
**When** the tenant views their connection status
**Then** a connection indicator shows the current state (connected/disconnected)

### Story 2.3: Webhook Ingestion & Idempotent Processing

As a system processing marketplace orders,
I want to receive webhooks, persist them immediately, and process them without duplicates,
So that no order is ever lost or double-counted.

**Acceptance Criteria:**

**Given** the marketplace sends a webhook to `/api/v1/webhooks/:platform`
**When** the webhook controller receives the payload
**Then** the raw payload is persisted to the order_events table before returning a 200 ACK (NFR13 — persist-before-ACK, at-least-once processing)
**And** the webhook is validated for correct structure via zod before persisting

**Given** a persisted webhook
**When** it is dispatched for processing via EventEmitter2 (`webhook.received`)
**Then** the order processing service checks for duplicate webhook/order IDs
**And** duplicate webhooks do not create duplicate orders (NFR22 — idempotent processing)

**Given** the webhook endpoint
**When** an application deployment is in progress
**Then** the endpoint remains available and no incoming orders are lost (NFR16)

**Given** a malformed or invalid webhook payload
**When** it fails validation
**Then** it is rejected with appropriate HTTP status, logged with correlation ID, and not persisted

### Story 2.4: Auto-Accept with Retry & Order Recording

As a Tenant Owner,
I want orders to be automatically accepted on the marketplace with retry on failure,
So that I never miss an order due to a transient error.

**Acceptance Criteria:**

**Given** a valid webhook has been persisted and dispatched
**When** the orders service processes it
**Then** an order record is created in the orders table with tenant_id, order details, and processing metadata (timestamps, status)
**And** the system calls the marketplace adapter's `acceptOrder()` method

**Given** the marketplace acceptance call succeeds
**When** the order is confirmed accepted
**Then** order status is updated to "accepted" with acceptance timestamp
**And** processing latency (webhook received → accepted) is recorded (FR26)
**And** an `order.new` SSE event is emitted to the tenant's browser stream
**And** the end-to-end latency is under 2 seconds under normal conditions (NFR1)

**Given** the marketplace acceptance call fails
**When** a transient error occurs
**Then** the system retries with exponential backoff: `delay = min(1s * 2^attempt + jitter, 30s)`, up to 5 attempts (FR14)
**And** each retry is logged with correlation ID, attempt number, delay, and error reason

**Given** all 5 retry attempts are exhausted
**When** the order is still not accepted
**Then** an `order.acceptance_failed` SSE event is emitted alerting the tenant (FR14)
**And** the order is recorded with "failed" status and the failure is logged

**Given** the marketplace expires an order before retries succeed
**When** the system detects the platform-side expiry
**Then** the tenant is alerted via SSE, the event is logged, and no further retries are attempted (FR19, NFR17)

**Given** the system handles up to 5 concurrent orders per minute per tenant
**When** processing at peak load
**Then** there is no degradation in processing performance (NFR4)

### Story 2.5: Order Queuing During Outages

As a Tenant Owner,
I want orders received during connectivity outages to be queued and processed when connection restores,
So that no orders are lost even when the marketplace is temporarily unreachable.

**Acceptance Criteria:**

**Given** the marketplace connection is down
**When** webhooks continue arriving from the marketplace
**Then** orders are persisted normally (persist-before-ACK still works) and queued for acceptance processing

**Given** the marketplace connection is restored
**When** the system detects reconnection
**Then** all queued orders are processed in order (acceptance calls made, statuses updated)
**And** SSE events are emitted for each processed order so the browser receives them

**Given** queued orders are being processed after reconnection
**When** multiple orders are in the queue
**Then** they are processed sequentially to avoid overwhelming the marketplace API
**And** each order's processing is logged with correlation ID and timestamps

### Story 2.6: Connection Health Monitoring & Alerts

As a Tenant Owner,
I want to see the health of my marketplace connection and be alerted when something goes wrong,
So that I know immediately if orders might need manual attention.

**Acceptance Criteria:**

**Given** a tenant has a connected marketplace account
**When** the health module polls the marketplace connection periodically
**Then** the connection status is tracked per-platform (connected, degraded, disconnected)
**And** status changes emit `connection.status_changed` SSE events to the tenant's browser

**Given** the marketplace connection drops
**When** the backend detects the failure
**Then** the tenant is notified via SSE with a status change event (FR16)
**And** the system begins automatic reconnection with backoff

**Given** the marketplace service itself is degraded or down
**When** the health module detects third-party issues
**Then** the tenant is notified that the issue is on the marketplace side, not JetAdisyon (FR17, FR18)
**And** the alert message distinguishes between "JetAdisyon connection issue" and "marketplace service issue"

**Given** a `system.health` heartbeat event
**When** emitted periodically
**Then** the browser can detect if the backend itself becomes unreachable (no heartbeats received)
**And** the SSE provider tracks this to show browser↔backend connection status separately from backend↔marketplace status

---

## Epic 3: Service Mode Dashboard

Owners and staff see a live order feed in the split-panel layout, view order history with PII masking, handle cancellations and modifications visually, and the dashboard rebuilds seamlessly after any disconnection.

### Story 3.1: Split-Panel Dashboard & Live Order Feed

As a Tenant Owner,
I want to see a split-panel dashboard with health indicators on the left and a live order feed on the right,
So that I can monitor my restaurant's orders at a glance during service.

**Acceptance Criteria:**

**Given** a tenant owner or staff member navigates to the dashboard
**When** the page loads
**Then** a split-panel layout is displayed: left panel (HealthStatusBar + StatsPanel) and right panel (OrderFeed)
**And** the page loads within 3 seconds on a 10 Mbps connection (NFR3)

**Given** the left panel is rendered
**When** the health status bar displays
**Then** it shows granular ConnectionIndicator components with Turkish labels ("Sistem Bağlantısı", "Trendyol Go Bağlantısı")
**And** each indicator is color-coded (green/amber/red) with text label — never color alone
**And** the StatsPanel shows today's order count, total revenue, average order value, and average processing latency

**Given** an `order.new` SSE event arrives
**When** the OrderFeed receives it
**Then** a new OrderCard appears at the top of the feed with a green highlight
**And** the green highlight fades out over ~10 seconds
**And** existing orders push down in the feed
**And** the StatsPanel updates in real-time (order count +1, revenue updates)

**Given** the OrderCard displays an order
**When** rendered
**Then** it follows the information hierarchy: item names (largest/boldest) → item details (portion, mods, promos) → price (large, right-aligned) → time (large) → order metadata → customer notes (highlighted with distinct background) → action button area (reserved)
**And** cards expand naturally to fit content (variable height, no truncation)

**Given** the feed has scrollable content and the user has not scrolled down manually
**When** a new order arrives
**Then** the feed auto-scrolls to the top to show the new order

**Given** the browser tab is opened or refreshed
**When** the dashboard loads
**Then** it rebuilds from server data — order feed populates from recent orders API, stats recalculate, health indicators reflect current state (FR43)

### Story 3.2: Order History & PII Masking

As a Tenant Owner or Staff member,
I want to view my restaurant's order history with customer data properly masked,
So that I can review past orders while respecting customer privacy.

**Acceptance Criteria:**

**Given** a tenant owner or staff member navigates to order history
**When** the history page loads
**Then** a paginated list of past orders is displayed, scoped to the user's tenant
**And** API responses complete within 1 second (NFR5)

**Given** any order is displayed to a tenant user (owner or staff)
**When** customer PII is present in the order data
**Then** full names are masked (e.g., "İltan C***"), phone numbers and addresses are masked or hidden (NFR9, FR24)
**And** only minimum information needed for order preparation is shown (items, quantities, delivery notes)

**Given** the order history list
**When** the user applies filters
**Then** they can filter by date range, order status, and platform
**And** results update without full page reload via TanStack Query

**Given** a paginated result set
**When** the user scrolls or navigates pages
**Then** the API returns paginated results with meta (total, page, limit, hasMore) following the standard response envelope

### Story 3.3: Order Cancellation & Modification Handling

As a Tenant Owner,
I want to see cancellations and modifications reflected in my order feed with distinct visual indicators,
So that I immediately know when an order changes status.

**Acceptance Criteria:**

**Given** an `order.cancelled` SSE event arrives
**When** the OrderFeed processes it
**Then** the corresponding OrderCard updates to show a cancellation state: red border/badge with "İPTAL EDİLDİ" indicator (FR28)
**And** the card is visually distinct from active orders

**Given** an `order.modified` SSE event arrives
**When** the OrderFeed processes it
**Then** the corresponding OrderCard updates to show a modification indicator (FR29)
**And** the changes are visually highlighted so the owner can see what changed

**Given** a cancellation or modification event arrives for an order not currently visible in the feed
**When** the event is processed
**Then** the order is added to the feed in its updated state if it falls within the visible range

**Given** the dashboard is rebuilt from server data (page refresh)
**When** cancelled or modified orders are loaded
**Then** they display with their correct visual states (cancellation badge, modification indicator)

### Story 3.4: Admin Order Visibility & Owner Processing Metrics

As an Admin,
I want to view any tenant's order history and health data.
As a Tenant Owner,
I want to see my order processing metrics,
So that admin can diagnose issues and owners can track reliability.

**Acceptance Criteria:**

**Given** the admin navigates to a tenant's detail page
**When** they view the orders tab
**Then** the full order history for that tenant is displayed with search and filtering (FR25)
**And** the admin sees unmasked order metadata (processing timestamps, latency, acceptance status)

**Given** a tenant owner navigates to their processing metrics
**When** the metrics view loads
**Then** it shows average processing latency, order acceptance success rate, and recent processing events (FR27)
**And** data is scoped to the owner's tenant only

**Given** any order history API request from an admin
**When** the request includes a tenant ID parameter
**Then** the admin can access any tenant's data (admin bypasses tenant-scoping)
**And** RLS policies allow admin full read access across tenants

### Story 3.5: Browser Reconnection & Missed Event Recovery

As a Tenant Owner,
I want orders that arrived while my browser was closed to appear when I reopen the tab,
So that I never miss an order even if my browser disconnects temporarily.

**Acceptance Criteria:**

**Given** the browser tab was closed or lost connection
**When** the user reopens the tab or connection restores
**Then** the SSE connection re-establishes via EventSource auto-reconnect (NFR15)
**And** the server sends missed events since the last connection timestamp

**Given** orders arrived while the browser was offline
**When** the missed events are received
**Then** the OrderFeed populates with the missed orders
**And** missed orders that should have triggered printing are queued for printing (indicated visually as "pending print") (FR42)
**And** missed alerts are indicated in the UI so the owner knows they were offline when these arrived

**Given** the dashboard page is refreshed or opened fresh
**When** data loads from the server
**Then** the complete current state is rebuilt: recent orders in the feed, current stats, current health status (FR43)
**And** no state is lost — the dashboard is fully functional immediately after refresh

---

## Epic 4: Audio Alerts & Receipt Printing

Orders announce themselves via distinct audio chimes, receipts print automatically — the complete hands-free kitchen experience. Audio stories prioritized before print stories within this epic.

### Story 4.1: Audio Alert System & New Order Chime

As a Tenant Owner,
I want to hear a distinct chime when a new order arrives,
So that I know an order came in without looking at the screen.

**Acceptance Criteria:**

**Given** the dashboard is open in the browser
**When** the AudioProvider initializes
**Then** the Web Audio API context is created and ready for playback
**And** browser autoplay policy is handled (user interaction required to unlock audio context — triggered naturally by any click on the dashboard)

**Given** an `order.new` SSE event is received by the browser
**When** the `use-audio-alerts` hook processes the event
**Then** the order chime sound plays within 500ms of the event arriving (NFR2)
**And** the sound is loaded from `apps/web/public/sounds/order-chime.mp3`

**Given** the browser tab is open but not focused
**When** a new order arrives
**Then** the chime still plays (audio works regardless of tab focus, as long as tab is open)

**Given** audio alerts are enabled (default state)
**When** multiple orders arrive in quick succession
**Then** each order triggers its own chime without overlapping sounds cutting each other off

### Story 4.2: Distinct Alert Sounds & Audio Configuration

As a Tenant Owner,
I want different sounds for cancellations, modifications, and warnings, and I want to choose sounds and adjust volume,
So that I can distinguish events by ear and customize audio to my kitchen environment.

**Acceptance Criteria:**

**Given** an `order.cancelled` SSE event is received
**When** the audio system processes it
**Then** a sharper, distinct cancellation alert sound plays — clearly different from the order chime (FR31)

**Given** an `order.modified` SSE event is received
**When** the audio system processes it
**Then** a brief, light modification notification sound plays — distinguishable from both order chime and cancellation alert

**Given** a `connection.status_changed` SSE event with a critical status (connection lost, system error)
**When** the audio system processes it
**Then** a different, more urgent warning tone plays (FR31)

**Given** the tenant owner navigates to audio settings
**When** the AudioControlPanel is displayed
**Then** it shows sound selection dropdowns per event type (new order, cancellation, modification, warning) with available preset sounds (FR32)
**And** selecting a sound plays a live preview at the current volume

**Given** the volume slider is adjusted
**When** the owner moves the slider
**Then** the volume changes immediately with live preview (FR33)
**And** the system defaults to medium volume

**Given** the audio alert toggle
**When** the owner disables audio alerts
**Then** no sounds play for any event (FR34)
**And** audio alerts are independent of auto-accept and print toggles — disabling audio does not affect other features

**Given** any audio setting change
**When** the value is modified
**Then** it auto-saves immediately with a toast confirmation
**And** settings persist across sessions

### Story 4.3: Automatic Receipt Printing

As a Tenant Owner,
I want receipts to print automatically when orders arrive without any print dialog,
So that I have a physical order slip without touching the computer.

**Acceptance Criteria:**

**Given** printing is enabled and Chrome is running with `--kiosk-printing` flag
**When** an `order.new` SSE event is received
**Then** a receipt is automatically printed to the default printer with no print dialog (FR35)
**And** the print is triggered within the 2-second order processing window

**Given** the PrintReceipt component renders an order
**When** it is sent to the printer
**Then** the receipt layout follows the hierarchy: order items + quantities (largest text, top) → delivery/preparation notes (prominent, below items) → order number + timestamp (smaller, bottom) (FR36)
**And** the layout uses large font, high contrast, and is optimized for thermal printer paper width
**And** the receipt is scannable and readable at a glance

**Given** Chrome is not running with `--kiosk-printing` flag
**When** a print is triggered
**Then** the standard browser print dialog appears (acceptable degradation — kiosk mode is recommended during onboarding)

**Given** the browser tab is open and printing is enabled
**When** the system operates during service hours
**Then** printing works without browser extensions or plugins (NFR28)

### Story 4.4: Printer Configuration & Cancellation/Modification Receipts

As a Tenant Owner,
I want to configure printer settings and have cancellation/modification slips print automatically with clear headers,
So that my printing setup works for my hardware and I see physical slips for order changes.

**Acceptance Criteria:**

**Given** the tenant owner navigates to print settings
**When** the settings section displays
**Then** it shows printer configuration guidance (including Chrome kiosk mode setup instructions)
**And** a test print button is available to verify the setup (FR37)

**Given** the owner clicks the test print button
**When** a test receipt is generated
**Then** a sample receipt prints with test order data
**And** success or failure feedback is shown ("Test yazdırma başarılı" or troubleshooting guidance)

**Given** the print toggle
**When** the owner disables receipt printing
**Then** no receipts print for any event (FR38)
**And** printing is independent of auto-accept and audio toggles — disabling print does not affect other features

**Given** an `order.cancelled` SSE event with printing enabled
**When** the cancellation slip prints
**Then** it displays a large "İPTAL EDİLDİ" header at the top of the receipt
**And** the cancelled order details are shown below the header
**And** the slip is visually unmistakable as a cancellation even at a glance

**Given** an `order.modified` SSE event with printing enabled
**When** the modification slip prints
**Then** it displays a "DEĞİŞTİRİLDİ" header at the top
**And** the changes are highlighted so the owner can see what was modified
**And** the full updated order details are printed below

---

## Epic 5: Tenant Configuration & Feature Toggles

Owners customize their restaurant's setup — working hours, independent feature toggles (auto-accept, print, audio), language preference. Staff can use the emergency system toggle. All settings auto-save with toast confirmations.

### Story 5.1: Feature Toggles & Settings Persistence

As a Tenant Owner,
I want to independently toggle auto-accept, receipt printing, and audio alerts on or off,
So that I can run the system with any combination of features based on my setup.

**Acceptance Criteria:**

**Given** a tenant owner navigates to the settings page
**When** the page loads
**Then** it displays toggle switches for auto-accept ("Otomatik kabul"), receipt printing ("Yazdırma"), and audio alerts ("Sesli uyarı")
**And** each toggle reflects the current saved state

**Given** the owner flips any toggle
**When** the value changes
**Then** it is saved immediately to the tenant_settings table (auto-save, no save button) (FR41)
**And** a toast confirmation appears (e.g., "Yazdırma kapatıldı")
**And** the API response completes within 1 second (NFR5)

**Given** auto-accept is disabled
**When** a new order webhook arrives
**Then** the order is persisted but NOT automatically accepted on the marketplace (FR39)

**Given** printing is disabled but audio is enabled
**When** a new order arrives
**Then** the chime plays but no receipt prints (FR39 — features are fully independent)

**Given** all three features are disabled
**When** orders arrive
**Then** orders are still persisted and visible in the dashboard feed — only auto-accept, print, and audio behaviors are toggled off

**Given** the tenant owner logs out and logs back in
**When** the settings page loads
**Then** all toggle states are restored from the database (FR41 — persistence across sessions)

### Story 5.2: Working Hours Configuration

As a Tenant Owner,
I want to set my restaurant's working hours so the system is only active during business hours,
So that orders aren't processed when my kitchen is closed.

**Acceptance Criteria:**

**Given** the tenant owner navigates to the working hours section in settings
**When** the section loads
**Then** it displays start and end time inputs for configuring active hours
**And** per-day-of-week configuration is available if the owner needs different hours on different days (FR20)

**Given** working hours are set and saved
**When** the current time is within configured working hours
**Then** the system is fully active — orders are processed, alerts play, receipts print (FR22)

**Given** the current time is outside configured working hours
**When** the dashboard is opened
**Then** it loads in an inactive state with clear messaging ("Çalışma saatleri dışında") (FR22)
**And** incoming webhooks during off-hours are persisted but not processed until working hours resume

**Given** the StatsPanel on the dashboard
**When** it renders
**Then** working hours are displayed so the owner can see their configured schedule

**Given** working hours are configured and the marketplace API supports hours synchronization
**When** the settings are saved
**Then** the system attempts to synchronize working hours with the marketplace platform using whichever method the API supports (FR21)
**And** if sync is not supported by the current marketplace API, hours are enforced locally only

**Given** any working hours change
**When** saved
**Then** auto-saves immediately with toast confirmation

### Story 5.3: Staff Emergency Toggle

As a Tenant Staff member,
I want a single "System On/Off" emergency toggle to pause all features at once,
So that I can quickly stop the system if something goes wrong without changing individual settings.

**Acceptance Criteria:**

**Given** a tenant staff member is logged in to the dashboard
**When** they view the emergency toggle
**Then** it is visually prominent but positioned deliberately to avoid accidental activation (FR40)
**And** it is the only system control visible to staff — no individual feature toggles, no settings page

**Given** the staff member activates the emergency toggle
**When** they click or tap it
**Then** a confirmation dialog appears: "Tüm sistemler duraklatılacak. Emin misiniz?" (AlertDialog)
**And** the toggle does not activate until the confirmation is accepted

**Given** the emergency toggle is confirmed
**When** the system pauses
**Then** all features pause simultaneously: auto-accept stops, audio alerts stop, receipt printing stops (FR40)
**And** the dashboard clearly indicates the system is paused
**And** the toggle can be deactivated (resumed) by the staff member without confirmation

**Given** the emergency toggle is active
**When** the tenant owner logs in
**Then** they can see the system is paused and can deactivate the emergency toggle
**And** individual feature toggles remain at their previous settings — emergency toggle overrides but doesn't change them

### Story 5.4: Language & Appearance Settings

As a Tenant Owner,
I want to switch the interface language and choose between light, dark, or system-matching appearance,
So that I can use the system in my preferred language and visual style.

**Acceptance Criteria:**

**Given** next-intl is integrated with the Next.js App Router
**When** the application loads
**Then** Turkish is the default language for all tenants (FR70)
**And** message files are organized by locale and feature (tr/common.json, tr/dashboard.json, en/common.json, etc.)

**Given** the tenant owner navigates to the language section in settings
**When** they select "English" from the language selector
**Then** the page refreshes in English with all UI text translated
**And** the preference is saved per tenant in settings

**Given** a tenant has selected English
**When** any user (owner or staff) of that tenant logs in
**Then** the interface loads in English based on the tenant's language setting

**Given** all user-facing text in the application
**When** rendered
**Then** it is sourced from next-intl message files — no hardcoded strings in components
**And** both Turkish and English translations exist for all UI text including error messages, labels, buttons, and status indicators

**Given** the tenant owner navigates to the appearance section in settings
**When** the section displays
**Then** three options are available: Light, Dark, and System (follows OS preference) (FR71)
**And** the default is System

**Given** the owner selects a different appearance mode
**When** the selection changes
**Then** the visual theme switches immediately without page reload
**And** the preference is saved per tenant in settings with toast confirmation
**And** all users (owner and staff) of that tenant see the selected theme

---

## Epic 6: Guided Onboarding

New restaurant owners complete setup in under 15 minutes — a guided 3-step flow (connect marketplace → configure print/audio → test order) that verifies everything works. Highest dependency risk: requires Epics 2, 4, 5.

### Story 6.1: Three-Step Onboarding Flow

As a new Tenant Owner,
I want to be guided through connecting my marketplace, configuring print and audio, and setting working hours,
So that I'm fully set up without needing external help.

**Acceptance Criteria:**

**Given** a tenant owner logs in for the first time (after completing password reset)
**When** the system detects they haven't completed onboarding
**Then** the onboarding flow starts automatically with a clear 3-step progress indicator

**Given** Step 1: Connect Marketplace
**When** the owner reaches this step
**Then** they can select their marketplace platform and enter credentials (reuses marketplace connection UI from Epic 2)
**And** the system verifies the connection — green indicator on success, plain Turkish error message on failure ("Bağlantı kurulamadı — bilgilerinizi kontrol edin")
**And** the owner cannot proceed to Step 2 until connection is verified

**Given** Step 2: Configure Print & Audio
**When** the owner reaches this step
**Then** they see printer setup guidance (including Chrome kiosk mode instructions specific to their OS), alert sound selection with preview, volume slider, and working hours configuration
**And** print and audio setup is the primary path — strongly recommended (FR45)
**And** a "skip" option exists as a secondary, discouraged path with a warning: "Temel değer azalacak — yazdırma ve ses olmadan sipariş akışı eksik kalır"

**Given** the onboarding flow
**When** at any step
**Then** progression is linear — no skipping steps, no jumping ahead (FR44)
**And** the progress indicator shows 3 steps clearly — the user always knows where they are

**Given** Step 2 is completed or skipped
**When** the owner proceeds
**Then** they advance to Step 3 (test order)

### Story 6.2: Test Order & Onboarding Completion

As a Tenant Owner,
I want to trigger a test order to verify my full setup works (chime + print), and be able to do this anytime,
So that I have confidence the system is working before relying on it during service.

**Acceptance Criteria:**

**Given** the owner reaches Step 3 of onboarding
**When** they click the test order button
**Then** the server generates a test order that flows through the full pipeline: SSE event → audio chime plays → receipt prints (if enabled)

**Given** the test order succeeds (chime plays + receipt prints)
**When** the result is displayed
**Then** a success screen shows: "Hazırsınız! Siparişler otomatik gelecek" with visual + audio confirmation that it worked
**And** the owner is redirected to the main dashboard — system is ready for service

**Given** the test order partially succeeds (chime plays but no print)
**When** the result is displayed
**Then** a partial success screen shows with guidance to fix print setup
**And** the owner can retry the test

**Given** the test order fails (nothing happens)
**When** the result is displayed
**Then** troubleshooting guidance is shown (check connection, check browser permissions)
**And** the owner can retry the test

**Given** the owner has completed onboarding
**When** they navigate to settings at any later time
**Then** a "Test order" button is permanently available — not limited to onboarding (FR46)
**And** triggering it runs the same full pipeline test

**Given** the overall onboarding timing
**When** measured from login to first successful test order
**Then** the target is under 15 minutes for a typical user

---

## Epic 7: Analytics Dashboard

Owners explore where their orders come from on a heat map, toggle revenue and profit overlays by area, filter by date, and discover business patterns. Default view loads with sensible defaults (last 7 days, density) — zero configuration needed.

### Story 7.1: Location Data Extraction & Analytics Foundation

As a system processing orders,
I want to extract and store location data from each order for analytics use,
So that the analytics dashboard has geospatial data to visualize.

**Acceptance Criteria:**

**Given** an order is processed by the order processing engine
**When** the order contains delivery address or location data
**Then** the system extracts location information and stores it in the order_locations table with tenant_id (FR69)
**And** RLS policies restrict location data access to the owning tenant

**Given** the marketplace API provides coordinates in the order payload
**When** location data is extracted
**Then** coordinates are stored directly without additional geocoding

**Given** the marketplace API provides a delivery address but no coordinates
**When** location data is extracted
**Then** the address is geocoded to coordinates and stored

**Given** no location data is available from the marketplace
**When** the fallback mechanism is needed
**Then** the system supports manual area tagging by the Tenant Owner as a fallback (FR69)

**Given** the analytics NestJS module
**When** it queries location data
**Then** aggregation queries support grouping by geographic area for heat map rendering
**And** queries are tenant-scoped via tenant_id

### Story 7.2: Heat Map Visualization & Summary Statistics

As a Tenant Owner,
I want to see a heat map of where my orders come from alongside summary statistics,
So that I can understand my order distribution at a glance.

**Acceptance Criteria:**

**Given** the tenant owner navigates to the "Analitik" section via top navigation
**When** the analytics page loads
**Then** a heat map renders as the hero element taking 60-70% of the viewport (FR62)
**And** the default view shows order density for the last 7 days — zero configuration needed
**And** the heat map renders within 3 seconds for up to 10,000 orders in the selected period (NFR29)

**Given** the heat map is rendered
**When** the page displays
**Then** summary statistics are shown alongside the map: total order count, total revenue, and average order value for the selected period (FR61)
**And** data is fetched via TanStack Query from the analytics API endpoints

**Given** the map library
**When** initialized
**Then** it uses Leaflet + react-leaflet with the leaflet.heat plugin
**And** the map centers on the tenant's order locations with appropriate zoom level

**Given** the analytics page loads with no order data
**When** a new tenant hasn't received orders yet
**Then** a friendly empty state is shown ("Henüz sipariş verisi yok — siparişler geldikçe burada analiz edebileceksiniz")

### Story 7.3: Date Filtering & Map Interaction

As a Tenant Owner,
I want to filter analytics by date range and interact with the map,
So that I can explore patterns across different time periods and drill into specific areas.

**Acceptance Criteria:**

**Given** the analytics page is loaded
**When** the date filter is displayed
**Then** quick presets are available in Turkish: "Bugün", "Bu Hafta", "Son 30 Gün", "Özel" (custom range) (FR65)
**And** "Bu Hafta" (this week) is the default selection

**Given** the user selects a different date filter
**When** the filter is applied
**Then** the heat map and summary statistics refresh within 2 seconds (NFR31)
**And** the map retains its current zoom/pan position during refresh

**Given** the heat map is displayed
**When** the user zooms or pans
**Then** the map responds within 200ms (NFR30)
**And** heat map clusters adjust to the new zoom level

**Given** the user taps or clicks on a cluster
**When** the cluster is selected
**Then** a popup displays area-level detail: order count, revenue, and profit for that zone (FR66)

**Given** the custom date range picker
**When** the user selects a start and end date
**Then** the analytics refresh with data for the custom period
**And** the date picker supports selecting any range within the tenant's order history

### Story 7.4: Order Amount & Profit Overlays

As a Tenant Owner,
I want to overlay order amounts and profit per area on the heat map,
So that I can see not just where orders come from but where the money and margin are.

**Acceptance Criteria:**

**Given** the analytics page with heat map displayed
**When** overlay toggle controls are visible
**Then** three options are available: order density (default), order amounts, and profit (FR63, FR64)
**And** toggles are additive — switching between overlays doesn't lose map position

**Given** the user selects the "order amounts" overlay
**When** the map updates
**Then** color intensity shifts to represent revenue per geographic area rather than order count (FR63)
**And** the cluster popup updates to emphasize revenue data

**Given** the user selects the "profit" overlay
**When** cost data is configured for the tenant
**Then** color intensity shifts to represent profit per area (order revenue minus cost data) (FR64)
**And** the cluster popup shows profit alongside order count and revenue

**Given** the user selects the "profit" overlay
**When** cost data is NOT configured for the tenant
**Then** a prompt is shown: "Kâr hesaplaması için maliyet bilgisi gerekli" with a link to cost configuration in Settings
**And** no broken or empty state is shown — the overlay gracefully degrades

**Given** any overlay change
**When** applied
**Then** the map re-renders within 2 seconds (NFR31)

### Story 7.5: Cost Data Configuration & Time-Series Animation

As a Tenant Owner,
I want to configure cost data per menu item for profit calculation, and view an animation of order density over time,
So that profit overlays are accurate and I can see how patterns shift.

**Acceptance Criteria:**

**Given** the tenant owner navigates to the cost data section in settings ("Maliyet")
**When** the section loads
**Then** a list of menu items is displayed (sourced from past orders) with a cost input field per item (FR68)
**And** cost data entry is optional — analytics works without it (just no profit overlay)

**Given** the owner enters cost data for a menu item
**When** the value is typed
**Then** it auto-saves as the value is entered with toast confirmation
**And** profit calculations in the analytics dashboard update to use the new cost data

**Given** the analytics page with a date range selected
**When** the user clicks the time-series animation play button
**Then** the heat map animates order density over the selected period (FR67)
**And** a timeline scrubber shows the current position in the animation
**And** density shifts are visible day by day (or appropriate granularity for the selected period)

**Given** the animation is playing
**When** the user clicks pause or drags the scrubber
**Then** the animation pauses at the selected point
**And** the heat map and stats reflect the data at that specific point in time

**Given** the animation completes
**When** the end of the period is reached
**Then** the map returns to the full-period aggregate view

---

## Epic 8: License Lifecycle & Support

System proactively warns owners before trial/subscription expiry with graceful degradation on expiration, and users can reach support directly from the app via a rate-limited contact form.

### Story 8.1: License Expiry Warnings

As a Tenant Owner,
I want to be warned before my trial or subscription expires,
So that I can take action before losing access.

**Acceptance Criteria:**

**Given** a tenant's license or trial has an expiry date
**When** the expiry date is 7 days away
**Then** the system sends an email notification to the tenant owner via Nodemailer + React Email (license-expiry template) (FR52)
**And** a visual warning appears in the tenant layout (banner or badge)

**Given** the expiry date is 3 days away
**When** the warning triggers
**Then** a second, more prominent warning email is sent
**And** the in-app warning becomes more visible (amber/warning styling)

**Given** the expiry date is 1 day away
**When** the warning triggers
**Then** a final urgent warning email is sent
**And** the in-app warning is highly prominent with clear next steps ("Aboneliğiniz yarın sona eriyor — yöneticiyle iletişime geçin")

**Given** the license expiry check
**When** executed
**Then** it runs as a scheduled job in the jobs module, checking all tenant license dates periodically
**And** warnings are only sent once per threshold (not repeated daily)

### Story 8.2: Expired License Behavior

As a system managing tenant lifecycles,
I want to define clear behavior when a license expires,
So that tenants understand their situation and admin has control.

**Acceptance Criteria:**

**Given** a tenant's license has expired
**When** the tenant owner or staff logs in
**Then** the dashboard loads in a read-only state — order history is visible but order acceptance stops (FR53)
**And** a clear visual indication of the expired state is shown ("Aboneliğiniz sona erdi — siparişler kabul edilmiyor")

**Given** the expired state is active
**When** new webhooks arrive for the tenant
**Then** orders are NOT auto-accepted on the marketplace
**And** orders are persisted for record-keeping but not processed

**Given** an expired tenant
**When** the admin reactivates or extends their license
**Then** the system immediately resumes normal operation — order acceptance restarts, dashboard returns to active state
**And** the tenant sees a positive confirmation ("Aboneliğiniz yenilendi — sistem aktif")

**Given** the expired state
**When** the tenant views the dashboard
**Then** feature toggles, settings, and analytics remain accessible in read-only mode
**And** the support contact form remains functional so the tenant can reach out for help

### Story 8.3: In-App Support Contact Form

As a Tenant Owner or Staff member,
I want to submit a support request from within the app,
So that I can get help without leaving the system.

**Acceptance Criteria:**

**Given** a tenant owner or staff member is logged in
**When** they access the support form (accessible from the tenant UI)
**Then** a contact form is displayed with fields for subject and message (FR54)

**Given** the user submits a valid support request
**When** the form is submitted
**Then** the request is sent to the admin via email using Nodemailer + Gmail SMTP with the React Email support-request template (FR55)
**And** the email includes the tenant name, user name, role, and the support message
**And** a toast confirmation is shown: "Destek talebiniz gönderildi"

**Given** the user has already submitted 3 support requests in the last hour
**When** they try to submit another
**Then** the form is rate-limited and a message is shown: "Saatlik gönderim sınırına ulaştınız — lütfen daha sonra tekrar deneyin" (FR56)
**And** rate limiting is enforced via @nestjs/throttler at max 3 per hour per user

**Given** the support form
**When** available across the tenant UI
**Then** it is accessible from both owner and staff views
**And** the in-app support link becomes more prominent during persistent connection failures (as described in the failure recovery UX flow)

---

## Epic 9: Observability & Admin Diagnostics

Admin can diagnose tenant issues with full visibility into connection logs, processing latency, and error history. Owners see a staff activity log. User-facing diagnostic views delivered here; foundational Pino logging infrastructure established in Epic 1.

### Story 9.1: Order Processing Event Logging & Error Tracking

As an Admin,
I want all order processing events and errors logged with timestamps and correlation IDs,
So that I can trace any order through the entire pipeline and diagnose failures.

**Acceptance Criteria:**

**Given** an order flows through the processing pipeline
**When** each stage completes (webhook received, order persisted, marketplace acceptance attempted, acceptance succeeded/failed, SSE event emitted, print triggered)
**Then** each event is logged via Pino with a structured JSON entry including: correlation ID, tenant ID, event type, timestamp, and stage-specific data (FR57)

**Given** an order is processed end-to-end
**When** the processing completes
**Then** latency metrics are recorded at each pipeline stage: webhook received → persisted, persisted → acceptance call, acceptance call → response, response → SSE emitted (FR58)
**And** total end-to-end latency (webhook → accepted) is recorded for NFR1 compliance measurement

**Given** an error occurs at any stage of the pipeline
**When** the error is caught
**Then** it is logged with full context: correlation ID, tenant ID, error type, error message, stack trace, and the pipeline stage where it occurred (FR59)
**And** errors are categorized (marketplace errors, system errors, timeout errors) for filtering

**Given** all logged events
**When** queried
**Then** they are searchable by correlation ID, tenant ID, time range, event type, and error status
**And** the logging format is consistent across all modules (Pino structured JSON)

### Story 9.2: Admin Per-Tenant Diagnostics Dashboard

As an Admin,
I want to view per-tenant diagnostics including order history, connection logs, processing latency, and print status,
So that I can remotely diagnose any tenant's issues.

**Acceptance Criteria:**

**Given** the admin navigates to a tenant's detail page
**When** they select the diagnostics tab
**Then** a comprehensive diagnostics view is displayed (FR50)

**Given** the diagnostics view — connection logs section
**When** rendered
**Then** it shows a chronological log of connection status changes (connected, disconnected, reconnected) with timestamps for each connection in the chain (browser↔backend, backend↔marketplace)
**And** technical labels are used (admin understands architecture)

**Given** the diagnostics view — processing latency section
**When** rendered
**Then** it shows average and recent processing latency metrics per pipeline stage
**And** latency data is visualized to identify bottlenecks

**Given** the diagnostics view — print status section
**When** rendered
**Then** it shows print trigger history with success/failure status and timestamps

**Given** the diagnostics view — error log section
**When** rendered
**Then** it shows recent errors with correlation IDs, timestamps, error type, and message
**And** the admin can click a correlation ID to see the full processing timeline for that order (webhook → accepted → printed with timestamps at each stage)

**Given** the diagnostics view — order processing timeline
**When** the admin selects a specific order
**Then** a timeline visualization shows each pipeline stage with timestamps and duration between stages

### Story 9.3: Staff Action Audit Log

As a Tenant Owner,
I want to see a log of staff actions with timestamps and user identity,
So that I know what my staff did and when.

**Acceptance Criteria:**

**Given** a tenant staff member activates or deactivates the emergency toggle
**When** the action completes
**Then** an entry is written to the audit_logs table with: tenant_id, user_id, user name, action type ("emergency_toggle_on" / "emergency_toggle_off"), timestamp (FR60)
**And** RLS policies restrict audit log access to the owning tenant's owner and admin

**Given** any configuration change is made by a staff member (if applicable) or owner
**When** the change is saved
**Then** an audit entry is logged with the action type, previous value, new value, user identity, and timestamp (FR60)

**Given** a tenant owner navigates to their activity log
**When** the log page renders
**Then** it shows a chronological list of staff actions for their tenant: who did what, when
**And** the log is filterable by user and date range

**Given** the admin views a tenant's diagnostics
**When** the audit section is displayed
**Then** the admin can see the same audit log for any tenant
**And** admin actions (tenant creation, license changes, deactivation) are also logged and visible (NFR12)
