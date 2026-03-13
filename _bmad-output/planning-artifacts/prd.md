---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments:
  - product-brief-jetadisyon-2026-03-07.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
  projectContext: 0
classification:
  projectType: saas_b2b
  domain: Restaurant technology / food delivery management
  complexity: medium
  projectContext: greenfield
workflowType: 'prd'
lastEdited: '2026-03-07'
editHistory:
  - date: '2026-03-07'
    changes: 'Run 3 validation fixes: renumbered analytics FRs to FR61-FR69 and localization to FR70 for sequential ordering, synced product brief to reflect analytics promotion to MVP'
  - date: '2026-03-07'
    changes: 'Promoted analytics dashboard to core MVP: added heat map visualization, order amount/profit overlays, Journey 7 (analytics experience), FR61-FR69 (originally FR62-FR70), NFR29-NFR31, updated executive summary, success criteria, MVP feature set, and journey summary'
  - date: '2026-03-07'
    changes: 'Post-validation fixes: specified FR14/FR56 thresholds, cleaned NFR implementation leakage (NFR15-16,19-21), defined NFR3/NFR11 values, added cancellation/modification journey scenario'
---

# Product Requirements Document - JetAdisyon

**Author:** iltan
**Date:** 2026-03-07

## Executive Summary

JetAdisyon is a B2B SaaS order management platform for small food businesses operating on Turkish delivery marketplaces (Trendyol Go, Yemeksepeti). It solves a straightforward cost problem: restaurant owners pay 9,000–15,000 TL/year for existing order management tools that auto-accept orders and print receipts — core functionality that doesn't justify the price. JetAdisyon delivers the same reliability at a lower cost, earning trust through simplicity and 100% order acceptance.

The real product vision extends beyond order management. The auto-accept and print workflow is the foot in the door — a price-competitive entry point that builds a growing dataset of order volume, timing patterns, location data, and platform activity. From MVP, this data powers an analytics dashboard with heat map visualization of order locations, order amount distributions, and profit overlays — giving restaurant owners spatial and financial visibility they've never had. This data foundation also enables the long-term play: an AI-powered business intelligence layer with area-based price benchmarking, sales pattern analysis, weather and holiday correlations, and actionable suggestions to improve revenue.

The primary user is the owner-operator running a 1–2 person kitchen who needs orders to flow and print without touching a screen. The secondary user is the cashier in a growing restaurant who routes printed orders to the kitchen. Both need the system to be invisible during service — reliable, fast, and zero-friction.

Go-to-market is organic: personal networks first, word-of-mouth second, with a trial-first model. No aggressive sales targets — the product sells itself or it doesn't.

### What Makes This Special

- **Price as entry strategy:** Same core functionality as incumbent tools at a meaningfully lower cost — the simplest possible reason for a cost-conscious restaurant owner to switch
- **Data moat through usage:** Every auto-accepted order builds the dataset that powers analytics from day one and future intelligence features no competitor offers
- **Analytics from MVP:** Heat map visualization, order amount distribution, and profit overlays give owners immediate spatial and financial insight — a tangible differentiator competitors don't offer at this price point
- **Domain proximity:** Built by someone with direct access to the target market, enabling rapid feedback loops and authentic product decisions
- **Architecture for growth:** Modern multi-tenant foundation designed from day one to support the evolution from order tool to intelligence platform

## Project Classification

- **Project Type:** B2B SaaS platform — multi-tenant, subscription-based, with external marketplace API integrations
- **Domain:** Restaurant technology / food delivery management
- **Complexity:** Medium — no heavy regulatory requirements, but marketplace API integrations with unclear access timelines, real-time reliability demands (100% order acceptance), multi-tenancy, and a phased roadmap toward AI features add meaningful complexity
- **Project Context:** Greenfield — new product built from scratch

## Success Criteria

### User Success

- **Near-instant order flow:** Order received via webhook → auto-accepted → receipt printed in under 2 seconds. The user should never notice a delay.
- **Zero-interaction service:** During peak hours, Ahmet doesn't touch the software. Orders arrive, print, and he cooks. The system is invisible.
- **Zero-loss switching:** No functionality lost compared to existing solutions. Auto-accept and print work at least as well.
- **Simple onboarding:** Connect marketplace account → configure printer → first auto-printed order in under 15 minutes. No training, no manual, no learning curve.

### Business Success

- **First paying tenants:** 3–5 restaurants from personal network using JetAdisyon in production
- **Organic referral:** At least 1 unprompted recommendation from an existing user
- **Price advantage:** At least 30–40% cheaper than incumbents for the same core functionality. Exact pricing TBD once hosting and infrastructure costs are understood.
- **Trial-to-paid conversion:** Named metric, instrumented from day one. No hard target yet — measure and learn.
- **Sustainable economics:** Side project with no burn rate — hosting and infrastructure costs stay manageable. Key decision: self-hosted Supabase vs. cloud Supabase to be evaluated mid-MVP based on cost/complexity tradeoffs
- **Personal milestone:** Production-grade B2B SaaS with real paying users

### Technical Success

- **Zero dropped orders due to system fault:** Every webhook is processed. If the marketplace acceptance API call fails, the system retries with backoff until it succeeds or alerts the user. No order is silently lost.
- **Processing latency:** Webhook received → order accepted → print triggered in under 2 seconds
- **Connection health:** System detects marketplace connectivity issues immediately and alerts the user. Reconnection is automatic and fast.
- **Multi-tenant isolation:** Each restaurant's data is fully isolated. No cross-tenant data leaks.
- **Observability:** Logging, monitoring, and error tracking in place from MVP. If we can't measure latency, uptime, and error rates, we can't prove any of these metrics.
- **Uptime during service hours:** The system must be available when restaurants are open and receiving orders. Downtime during off-hours is tolerable; downtime during dinner rush is not.

### Measurable Outcomes

| Metric | Target | Phase |
|--------|--------|-------|
| Order processing latency (webhook → accepted → print triggered) | < 2 seconds | MVP |
| Order acceptance rate (zero dropped due to system fault) | 100% | MVP |
| Feature parity with incumbent tools (core) | Full parity on auto-accept + print | MVP |
| Time-to-value (signup → first auto-printed order) | < 15 minutes | MVP |
| Active paying tenants | 3–5 from personal network | MVP |
| Trial-to-paid conversion rate | Measure (no hard target) | MVP |
| Price vs. incumbents | ≥ 30–40% cheaper | MVP |
| Unprompted organic referrals | ≥ 1 | Post-MVP |
| Users engaging with analytics dashboard | Measure adoption rate | MVP |
| Heat map and overlays used weekly | Measure weekly active usage | MVP |
| Sales lift from AI suggestions | Measurable improvement reported by users | v3 |

## User Journeys

### Journey 1: Ahmet's First Day — Onboarding

Ahmet runs a small döner shop in Kadıköy. He's been using an existing order management tool for a year — it works fine, but 12,000 TL/year feels steep for something that just accepts orders and prints receipts. His friend mentions JetAdisyon is half the price. He's skeptical but willing to try.

iltan creates Ahmet's tenant account and sends him login credentials. Ahmet opens the dashboard on his shop's old laptop during a quiet afternoon. The onboarding flow greets him: **connect your marketplace account**. He enters his Trendyol Go credentials. The system verifies the connection — green status indicator appears. Step two: **configure your setup**. He sees toggles for auto-accept, receipt printing, and audio alerts — all on by default. He has a thermal printer, so he sets that up. He picks an alert sound from the defaults — a loud, clear chime that'll cut through kitchen noise. He sets his working hours: 10:00–23:00. Step three: **test it**. He triggers a test order. The chime plays, the receipt prints. He grins. Done in 8 minutes.

**What this reveals:** Onboarding flow, marketplace account connection, feature toggle configuration (auto-accept, print, audio alert), working hours setup, printer configuration, test order capability, connection health indicator.

### Journey 2: Ahmet's Friday Rush — Core Experience

It's Friday at 19:30. Ahmet is working the grill alone. The laptop sits on the counter with JetAdisyon open. Three Trendyol Go orders arrive within 90 seconds. Each time: the chime sounds, the receipt prints automatically, Ahmet glances at the slip, pins it to the rail, and keeps cooking. He never touches the laptop. The dashboard shows three new orders in the history — green status, all accepted.

At 21:15, a customer cancels a Trendyol Go order mid-preparation. The system plays a distinct cancellation alert — sharper and different from the new-order chime. A cancellation slip prints automatically with the cancelled order details and "CANCELLED" in large text. Ahmet pulls the original order slip from the rail, glances at the cancellation receipt, and moves on. Ten minutes later, a customer modifies an order — swapping ayran for şalgam. The system plays a brief notification, and an updated receipt prints with the change highlighted. Ahmet adjusts the prep without breaking stride.

By 22:00, he's processed 47 orders. He didn't manually accept a single one. He didn't miss any. When he closes up, he glances at the dashboard — all orders accounted for, connection healthy all evening. Same experience as his current tool, less money out of his pocket.

**What this reveals:** Real-time webhook processing, auto-accept reliability, auto-print, audio alerts, order history display, connection health monitoring, zero-interaction during service, order cancellation and modification handling with distinct alerts and printed slips.

### Journey 3: Ahmet's Bad Night — Edge Case / Failure Recovery

It's Saturday at 20:15, peak dinner rush. The dashboard status indicator flips from green to red — marketplace connection lost. The audio alert plays a distinct warning sound (different from the order chime). Ahmet sees the red indicator on the dashboard. He's stressed but informed.

The system is retrying the connection automatically. Within 30 seconds, it reconnects — status flips back to green. Two orders that arrived during the outage were queued server-side. They're now auto-accepted and receipts print in quick succession. No orders were lost.

But what if it doesn't reconnect? After 2 minutes of failed retries, the dashboard shows a persistent alert: "Connection lost — orders may need manual acceptance on Trendyol Go." Ahmet grabs his phone, opens Trendyol Go's merchant app directly, and manually manages orders until JetAdisyon recovers. He sends a WhatsApp message to iltan. The in-app support widget also lets him log the issue.

**What this reveals:** Connection health alerts (distinct from order alerts), automatic retry with backoff, order queuing during outages, graceful degradation messaging, fallback instructions, in-app support mechanism.

### Journey 4: Elif at the Growing Restaurant — Secondary User

Elif works the counter at a busier restaurant in Beşiktaş — 4 staff total. The owner set up JetAdisyon; Elif just works with the output. Every time the chime sounds, a receipt prints at her station. She tears it off, reads the items (large font, high contrast, easy to scan), and either hands it to the kitchen window or calls out the order.

She doesn't log in. She doesn't configure anything. She doesn't know or care what software is running — she just needs the slips to be readable, loud enough to hear over the kitchen noise, and never stop coming. If the chime stops, she tells the owner. That's the extent of her interaction with the system.

**What this reveals:** Receipt readability (large font, high contrast, scannable layout), audio alert volume and clarity, passive user experience — the system serves her without requiring interaction, clear escalation path (tell the owner).

### Journey 5: iltan as Admin — Operations

It's Tuesday morning. A restaurant owner from iltan's network wants to try JetAdisyon. iltan opens the admin panel, creates a new tenant: business name, owner name, contact info, marketplace platform. Sets the license to "trial" with a start date. Sends the credentials.

Later, iltan checks the admin dashboard. He can see all tenants — who's active, who's on trial, when trials expire. He drills into Ahmet's tenant to check order history — 340 orders this week, zero failures, average processing latency 1.2 seconds. Everything healthy.

One tenant's trial expired last week and they haven't responded to messages. iltan deactivates their account from the admin panel. Another tenant reports a printing issue — iltan checks their order history and connection logs to diagnose. He sees orders are being accepted fine, but print triggers are failing — likely a local printer issue on the tenant's side. He messages them with guidance.

**What this reveals:** Tenant CRUD (create, read, update, deactivate), license/trial management, admin visibility into tenant order history and system health, per-tenant diagnostics (connection logs, print status, latency metrics), tenant lifecycle management.

### Journey 6: Ahmet Configures His Preferences — Feature Toggles

Ahmet's thermal printer breaks. Instead of panicking, he opens JetAdisyon settings and flips the print toggle off. Orders still auto-accept, the chime still sounds, and he reads orders from the dashboard screen until the printer is replaced next week. He also bumps the alert volume up — the kitchen fan is loud today.

His neighbor runs a small café and wants to try JetAdisyon but doesn't own a printer. No problem — he uses it with auto-accept and audio alerts only. Print is disabled from the start. Every feature works independently.

**What this reveals:** Feature toggle independence (auto-accept, print, audio alert are fully decoupled), settings persistence, graceful operation with partial features, configuration flexibility for different business setups.

### Journey 7: Ahmet Checks His Numbers — Analytics Dashboard

It's Sunday morning, the shop is closed. Ahmet opens JetAdisyon on his laptop and navigates to the analytics tab. A heat map fills the screen — colored clusters showing where his orders came from this week. Kadıköy's central streets glow hot, but he notices a surprising cluster forming in Moda he hadn't expected. He taps a cluster and sees the order count and total revenue from that area.

He switches to the profit overlay. Each zone now shows estimated profit based on order amounts and his configured cost data. The Moda cluster isn't just growing — it's his highest-margin area. He zooms out and sees that orders from Fikirtepe are frequent but low-margin. He makes a mental note to adjust his delivery radius or pricing for that zone.

He filters by the last 30 days and watches the heat map animate over time — order density shifting between weekdays and weekends. Friday and Saturday nights dominate, but Wednesday lunch is stronger than he thought. He screenshots the map and sends it to his wife: "Look where our orders come from."

The dashboard also shows total order count, total revenue, and average order value for the filtered period. Simple numbers, but Ahmet has never seen them laid out like this. He always "felt" Fridays were big — now he sees the data.

**What this reveals:** Analytics dashboard access, heat map visualization of order locations, order amount overlays per area, profit overlays per area (based on available data — marketplace-provided, order-derived, or manually entered costs), date/time filtering, map interaction (zoom, tap for detail), time-series animation of order density, summary statistics (order count, revenue, average order value).

### Journey Requirements Summary

| Capability Area | Revealed By Journeys |
|----------------|---------------------|
| Onboarding flow (marketplace connect, printer setup, test order) | Journey 1 |
| Feature toggles (auto-accept, print, audio — independent, configurable) | Journey 1, 6 |
| Working hours configuration | Journey 1 |
| Audio alert system (order chime, warning sounds, volume control, customizable) | Journey 1, 2, 3, 4, 6 |
| Real-time webhook processing + auto-accept | Journey 2 |
| Receipt auto-printing (large font, high contrast, scannable) | Journey 2, 4 |
| Order history dashboard | Journey 2, 5 |
| Connection health monitoring (red/green indicator) | Journey 2, 3 |
| Order cancellation/modification handling (distinct alerts, printed slips) | Journey 2 |
| Connection failure alerts + automatic retry | Journey 3 |
| Order queuing during outages | Journey 3 |
| Graceful degradation messaging + fallback instructions | Journey 3 |
| In-app support mechanism | Journey 3 |
| Admin panel (tenant CRUD, license management) | Journey 5 |
| Admin tenant diagnostics (order history, connection logs, latency) | Journey 5 |
| Settings persistence + partial-feature operation | Journey 6 |
| Analytics dashboard (order count, revenue, average order value) | Journey 7 |
| Heat map visualization of order locations | Journey 7 |
| Order amount overlays per area | Journey 7 |
| Profit overlays per area (marketplace, order-derived, or manual cost data) | Journey 7 |
| Date/time filtering for analytics | Journey 7 |
| Map interaction (zoom, tap for detail, time-series animation) | Journey 7 |

## Domain-Specific Requirements

### Marketplace API Dependency

- **Third-party API risk:** Core product functionality depends on marketplace APIs (Trendyol Go, Yemeksepeti) that are not under our control. API access, terms, rate limits, and availability can change without notice.
- **Marketplace health monitoring:** If the marketplace provides a health endpoint, poll it periodically. If their service degrades or goes down, notify tenants proactively — before orders stop arriving. Tenants should know whether the problem is on JetAdisyon's side or the marketplace's side.
- **Integration adapter pattern:** Abstract marketplace integrations behind a common interface. When API terms change or a second platform is added, the core system doesn't change — only the adapter.
- **No API access yet:** Integration work begins only when real API access is granted. No mocks, no assumptions about API shape.

### Data Privacy (KVKK Compliance)

- **Customer PII masking:** Tenant owners see masked customer information on orders. Full name "İltan Caner" displays as "İltan C\*\*\*". Phone numbers, addresses — masked or hidden from the tenant dashboard. Only the minimum needed for order preparation is shown (items, quantities, delivery notes if applicable).
- **Multi-tenant data isolation:** Absolute boundary between tenants. A tenant owner must never see any data belonging to another tenant — orders, customers, settings, or system health. Enforced at the database query level, not just the UI.
- **No raw password storage:** All passwords hashed with modern algorithm (bcrypt/argon2). Standard practice, non-negotiable.
- **Order data retention:** Orders stored for tenant's business purposes (history, analytics) — 2 years in active storage, archived to cold storage after (see NFR24-25). No customer PII retained beyond what the marketplace provides per order.

### Printer & Audio Setup (Onboarding Priority)

- **Onboarding strongly recommends setup:** During onboarding, the system advises configuring print and audio alert as a first priority — without them the core value proposition (hands-free order flow) is lost. Users can skip if they truly don't want these features, but skip is a secondary option, not the default path.
- **No hardware requirement:** The system works without a printer. Print feature is a toggle — but onboarding emphasizes its importance.
- **Browser-based printing for MVP:** Start with browser print API. Limitations accepted (browser must be open, print dialog may appear).
- **Future: direct thermal printer support:** Network-capable thermal printers (ESC/POS over LAN/WiFi) for server-side printing without browser dependency. Post-MVP consideration.
- **Printer compatibility:** Document supported printer models as they're tested. Start narrow, expand based on what tenants actually own.

### Risk Mitigations

See [Risk Mitigation Strategy](#risk-mitigation-strategy) in the Project Scoping section for comprehensive risk analysis covering technical, market, and resource risks.

## B2B SaaS Specific Requirements

### Project-Type Overview

JetAdisyon is a multi-tenant B2B SaaS platform with a lean permission model and simple subscription structure. The MVP prioritizes reliability and core functionality over enterprise features. Complexity lives in the marketplace integrations and real-time order processing, not in the permission or billing layers.

### Tenant Model

- **Tenant isolation:** Each restaurant is a fully isolated tenant. Data separation enforced at the database query level (row-level security or schema-based isolation — architecture decision TBD).
- **Tenant provisioning:** Admin-only in MVP. iltan creates tenant accounts manually — no self-service signup.
- **Tenant lifecycle:** Created → Trial → Active → Deactivated. Admin manages all transitions.
- **Tenant configuration:** Each tenant independently configures their feature toggles (auto-accept, print, audio alert), working hours, marketplace connection, and printer setup.

### Permission Model (RBAC)

| Role | Scope | Capabilities |
|------|-------|-------------|
| Admin (iltan) | Global | Create/manage tenants, view all tenant data (orders, health, logs, latency), manage licenses, deactivate accounts, access diagnostics |
| Tenant Owner (Ahmet) | Own tenant | Full tenant access, all individual feature toggles, all settings, create/manage staff accounts |
| Tenant Staff | Own tenant | View orders, view dashboard, in-app support, single "System On/Off" emergency toggle (pauses all: auto-accept, print, audio). Cannot change tenant settings, marketplace connection, or individual feature toggles. |

### Subscription & Licensing

- **MVP structure:** Single tier, single price. No feature gating between tiers.
- **Early adopter incentives:** First business gets the product free (lifetime). Subsequent early users get generous trials and discounted subscriptions. All managed manually by admin.
- **Regular subscription details:** TBD — pricing, billing cycle, payment method to be defined once infrastructure costs are understood.
- **License tracking:** Admin panel tracks license status per tenant (free, trial, active, expired, deactivated). No automated billing in MVP.

### Integration Architecture

- **Primary integration:** Marketplace APIs (Trendyol Go, Yemeksepeti) via adapter pattern. One platform in MVP, second in v2.
- **Integration method:** Webhooks for inbound order events, REST API calls for order acceptance and status updates.
- **No other integrations in MVP.** No accounting software, POS systems, or inventory management connections.
- **Future integration candidates (post-MVP):** Accounting systems, POS integration, additional marketplace platforms.

### Implementation Considerations

- **Skip for this project type:** CLI interface, mobile-first design — not relevant for MVP.
- **Server-side order processing:** Order acceptance logic runs on the backend, independent of browser state. Browser is the UI/notification layer only.
- **Real-time communication:** Server needs to push order events and status changes to the browser client (WebSocket or SSE) for audio alerts and live dashboard updates.
- **Stateless frontend:** Dashboard reads from the API. No critical state lives in the browser — if the tab is closed and reopened, the dashboard rebuilds from server data.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — deliver the core value proposition (auto-accept orders, print receipts, audio alerts) at a lower price than existing solutions. The MVP must work end-to-end with a real marketplace integration. No demo mode, no pre-integration phase.

**Resource Requirements:** Solo developer (iltan), side project built in free time. This constrains scope but not quality — fewer features, each done well. Admin panel included for personal development goals and practical tenant management.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1: Ahmet's onboarding (marketplace connect, configure features, test order)
- Journey 2: Ahmet's Friday rush (zero-interaction order flow)
- Journey 3: Ahmet's bad night (failure recovery, connection alerts)
- Journey 4: Elif's passive experience (readable receipts, clear audio)
- Journey 5: iltan as admin (tenant management, diagnostics)
- Journey 6: Feature toggle configuration (partial-feature operation)
- Journey 7: Ahmet's analytics (heat map, order amounts, profit overlays)

**Must-Have Capabilities:**

| Capability | Justification |
|-----------|---------------|
| Authentication + multi-tenant architecture | Foundation — nothing works without it |
| Single marketplace integration (webhook-based) | Core value proposition — without this, no product |
| Auto-accept with retry logic | 100% reliability requirement — the #1 promise |
| Receipt auto-printing (browser-based) | Core feature — toggleable, recommended in onboarding |
| Audio alert system (customizable sounds, volume) | Core feature — toggleable, the primary notification mechanism |
| Feature toggles (auto-accept, print, audio — independent) | Configurability for different business setups |
| Working hours configuration | System should only be active during business hours |
| Connection health monitoring (red/green + alerts) | Tenant must know if something is wrong |
| Order history dashboard | Tenants need to see their orders |
| Real-time push (WebSocket/SSE) | Browser needs live updates for alerts and print triggers |
| Admin panel (tenant CRUD, license tracking, diagnostics) | Tenant management + personal development goal |
| In-app support (contact form → email, rate-limited) | Lightweight support channel for MVP scale |
| KVKK-compliant PII masking | Legal requirement — customer data masked in dashboard |
| Analytics dashboard (order count, revenue, avg order value) | Immediate value from order data — differentiator from day one |
| Heat map visualization of order locations | Spatial insight into order distribution — unique at this price point |
| Order amount and profit overlays on map | Financial visibility per area — actionable business intelligence |
| Date/time filtering for analytics | Enables trend analysis and pattern discovery |
| Observability (logging, monitoring, error tracking) | Can't prove reliability without measurement |

**Permission Model (MVP):**

| Role | Scope | Key Capabilities |
|------|-------|-----------------|
| Admin | Global | Full system access, all tenant data, diagnostics |
| Tenant Owner | Own tenant | Full tenant access, all individual feature toggles, all settings |
| Tenant Staff | Own tenant | View orders, view dashboard, in-app support, single "System On/Off" emergency toggle (pauses all: auto-accept, print, audio) |

### Post-MVP Features

**Phase 2 (Growth):**
- Second marketplace platform integration
- Self-service tenant signup and onboarding
- Improved notification system (beyond in-app)
- Mobile-optimized UI
- Sub-account management (owner creates staff accounts)
- AI-assisted support (handles simple issues, escalates to admin)

**Phase 3 (Expansion):**
- AI-powered business intelligence — area-based price benchmarking, sales pattern analysis, weather/holiday correlations, actionable suggestions
- Desktop app (Electron/Tauri) for background audio + local printer access
- Network thermal printer support (server-side ESC/POS printing)
- Expansion across Turkey to all restaurants on delivery platforms
- Additional integrations (accounting, POS, inventory)

### Risk Mitigation Strategy

**Technical Risks:**
- *Marketplace API access delay:* Build everything else first (auth, tenancy, UI, admin). Integration slots in via adapter pattern when access is granted. This is the critical path item.
- *Real-time reliability:* Server-side order processing ensures orders are never missed regardless of browser state. Browser is notification layer only.
- *Printer compatibility:* Start with browser print (works everywhere). Document and test specific thermal printer models as tenants onboard.

**Market Risks:**
- *Users don't switch from their current tool:* Price advantage is the primary driver. First users come from personal network — low acquisition cost, direct feedback. If they don't switch, learn why before scaling.
- *Marketplace blocks API access:* Maintain good relationship with platform developer relations. Adapter pattern allows pivoting to whichever platform cooperates.

**Resource Risks:**
- *Solo developer bandwidth:* Lean MVP scope. No feature bloat. Admin panel is the one "nice-to-have" that stays for personal development goals. Everything else is essential.
- *Infrastructure costs unclear:* Self-hosted Supabase vs. cloud to be evaluated mid-MVP. Keep hosting costs minimal — this is a side project, not a funded startup.

## Functional Requirements

### Authentication & Access Control

- **FR1:** Admin can create tenant accounts with business details and initial credentials
- **FR2:** Tenant Owner can log in and access their tenant's dashboard
- **FR3:** Tenant Staff can log in and access a restricted view of their tenant's dashboard
- **FR4:** Admin can log in and access the admin panel with global visibility
- **FR5:** System enforces tenant data isolation — no user can access another tenant's data
- **FR6:** Admin and Tenant Owner can create and manage Staff accounts for a tenant
- **FR7:** System enforces role-based permissions (Admin, Tenant Owner, Tenant Staff) with appropriate access restrictions
- **FR8:** Tenant Owner and Tenant Staff can log out
- **FR9:** Tenant Owner can change their own password
- **FR10:** Admin and Tenant Owner can deactivate and delete Staff accounts

### Marketplace Integration

- **FR11:** Tenant Owner can connect their marketplace account to JetAdisyon (via OAuth if available, or manual credential entry as fallback)
- **FR12:** System receives incoming orders via webhook from the connected marketplace
- **FR13:** System automatically accepts received orders on the marketplace platform
- **FR14:** System retries failed order acceptance up to 5 times with exponential backoff, then alerts the user if acceptance has not succeeded
- **FR15:** System queues orders received during connectivity outages and processes them upon reconnection
- **FR16:** System monitors marketplace connection health and displays status to the tenant
- **FR17:** System monitors marketplace service availability and notifies tenant of third-party issues
- **FR18:** System distinguishes between JetAdisyon-side and marketplace-side connectivity problems in user-facing alerts
- **FR19:** System handles marketplace acceptance timeout — if the marketplace expires an order before retries succeed, the system alerts the tenant and logs the event

### Working Hours & Platform Sync

- **FR20:** Tenant Owner can configure working hours during which the system is active
- **FR21:** System synchronizes working hours with the marketplace platform using whichever method the platform API supports (read, push, or both) — mechanism determined during integration
- **FR22:** System is only active during configured working hours — idle outside them

### Order Management

- **FR23:** Tenant Owner and Tenant Staff can view order history for their tenant
- **FR24:** System displays orders with masked customer PII (e.g., "İltan C\*\*\*" instead of full name)
- **FR25:** Admin can view any tenant's order history and system health data
- **FR26:** System records order processing metadata (timestamps, latency, acceptance status) for diagnostics
- **FR27:** Tenant Owner can view their own order processing metrics (latency, success rate)
- **FR28:** System receives and processes order cancellation events from the marketplace and alerts the tenant (audio + visual, cancellation slip if printing enabled)
- **FR29:** System receives and processes order modification events from the marketplace and alerts the tenant (updated receipt if printing enabled, visual + audio notification)

### Audio Alert System

- **FR30:** System plays an audible alert sound when a new order is received (browser must be open)
- **FR31:** System plays a distinct warning sound for critical events (connection loss, system errors)
- **FR32:** Tenant Owner can select from available alert sounds
- **FR33:** Tenant Owner can adjust alert volume
- **FR34:** Tenant Owner can enable or disable audio alerts independently of other features

### Receipt Printing

- **FR35:** System triggers automatic receipt printing when a new order is received (browser must be open)
- **FR36:** Receipts display order details (items, quantities, notes) in a large-font, high-contrast, scannable layout
- **FR37:** Tenant Owner can configure printer settings
- **FR38:** Tenant Owner can enable or disable receipt printing independently of other features

### Feature Configuration

- **FR39:** Tenant Owner can independently toggle auto-accept, receipt printing, and audio alerts on or off
- **FR40:** Tenant Staff can activate a single "System On/Off" emergency toggle that pauses all features (auto-accept, print, audio)
- **FR41:** System persists all configuration settings across sessions

### Reconnection & Missed Event Recovery

- **FR42:** When the browser reconnects after being closed, system surfaces orders that arrived while offline — queuing missed prints for printing and indicating missed alerts
- **FR43:** Dashboard rebuilds from server data when the browser tab is opened or refreshed — no state lost

### Onboarding

- **FR44:** System guides new tenants through a step-by-step onboarding flow (connect marketplace → configure print and audio → test)
- **FR45:** Onboarding strongly recommends configuring print and audio as first priority, with skip as a secondary option
- **FR46:** Tenant Owner can trigger a test order at any time to verify the full flow (alert + print) — not limited to onboarding

### Real-Time Communication

- **FR47:** System pushes order events and status changes to the browser in real-time (for audio alerts, print triggers, and dashboard updates)

### Admin Operations

- **FR48:** Admin can create, view, update, and deactivate tenant accounts
- **FR49:** Admin can set and manage license status per tenant (free, trial, active, expired, deactivated)
- **FR50:** Admin can view per-tenant diagnostics (order history, connection logs, processing latency, print status)
- **FR51:** Admin can view a global overview of all tenants and their current status

### License Lifecycle

- **FR52:** System warns tenant owner before license/trial expiry (e.g., 7 days, 3 days, 1 day before)
- **FR53:** System defines tenant-facing behavior when license expires (read-only dashboard, order acceptance stops, clear visual indication of expired state)

### In-App Support

- **FR54:** Tenant Owner and Tenant Staff can submit a support request via an in-app contact form
- **FR55:** Support requests are sent to admin via email
- **FR56:** System rate-limits support form submissions to a maximum of 3 per hour per user to prevent spam

### Observability & Audit

- **FR57:** System logs order processing events (received, accepted, printed, failed) with timestamps
- **FR58:** System tracks and records processing latency metrics
- **FR59:** System tracks and records error events for monitoring and diagnostics
- **FR60:** System logs staff actions (emergency toggle, configuration changes) with timestamp and user identity, visible to Tenant Owner as an activity log

### Analytics Dashboard

- **FR61:** Tenant Owner can access an analytics dashboard showing order count, total revenue, and average order value for a selected time period
- **FR62:** Analytics dashboard displays a heat map visualization of order locations based on delivery address data
- **FR63:** Tenant Owner can overlay order amounts per geographic area on the heat map
- **FR64:** Tenant Owner can overlay profit per geographic area on the heat map, calculated from order revenue minus cost data (sourced from marketplace API, order payload, or manually entered by Tenant Owner — exact source determined upon marketplace API access)
- **FR65:** Tenant Owner can filter analytics data by date range (day, week, month, custom range)
- **FR66:** Tenant Owner can interact with the heat map — zoom, pan, and tap a cluster to view area-level detail (order count, revenue, profit for that zone)
- **FR67:** Tenant Owner can view a time-series animation of order density over the selected period
- **FR68:** Tenant Owner can configure cost data per menu item for profit calculation (used when marketplace or order data does not include cost information)
- **FR69:** System extracts and stores location data from orders for analytics use — source determined by marketplace API capabilities (delivery address geocoding, coordinates in order payload, or manual area tagging by Tenant Owner as fallback)

### Localization

- **FR70:** System UI supports Turkish (default) and English, configurable per tenant in settings

### Appearance

- **FR71:** System supports light mode, dark mode, and system-preference-following mode, configurable per tenant in settings — defaults to system preference

## Non-Functional Requirements

### Performance

- **NFR1:** Order processing latency (webhook received → order accepted on marketplace) must complete in under 2 seconds under normal conditions
- **NFR2:** Real-time push events (order alerts, print triggers, status updates) must reach the browser within 500ms of server-side event
- **NFR3:** Dashboard page load must complete within 3 seconds on a 10 Mbps connection
- **NFR4:** System must handle up to 5 concurrent orders per minute per tenant without degradation
- **NFR5:** API responses for user-initiated actions (settings changes, order history queries) must complete within 1 second

### Security

- **NFR6:** All passwords hashed using bcrypt or argon2 — no plaintext or reversible encryption
- **NFR7:** All data in transit encrypted via TLS (HTTPS only, no HTTP fallback)
- **NFR8:** Multi-tenant data isolation enforced at the database level — queries scoped to tenant context, no cross-tenant data access possible even via direct API calls
- **NFR9:** Customer PII masked in all tenant-facing views — no full names, no unmasked phone numbers or addresses
- **NFR10:** Session management with secure tokens, automatic expiry, and logout invalidation
- **NFR11:** Rate limiting on authentication endpoints — maximum 5 failed login attempts per 15 minutes per IP address, with temporary lockout after threshold
- **NFR12:** Admin actions (tenant creation, deactivation, license changes) logged with timestamp and actor identity

### Reliability

- **NFR13:** Zero order loss due to system fault — every webhook received must be persisted before acknowledgment (at-least-once processing)
- **NFR14:** System uptime target of 99.5% during tenant working hours (allows ~3.5 hours downtime per month, scheduled during off-hours)
- **NFR15:** Automatic reconnection for real-time push connections — browser client reconnects without user intervention after temporary network disruption
- **NFR16:** Webhook endpoint must remain available even during application deployments — no incoming orders lost due to deployment activity
- **NFR17:** Failed order acceptance retries must not exceed marketplace timeout window — system detects and handles platform-side expiry

### Scalability

- **NFR18:** Architecture must support growth from 3-5 tenants (MVP) to 50+ tenants without fundamental redesign
- **NFR19:** Tenant-scoped queries must complete within 100ms at 50+ tenant scale under normal load
- **NFR20:** Backend architecture must support horizontal scaling to handle growth beyond 50 tenants without architectural redesign

### Integration

- **NFR21:** Adding a new marketplace platform must not require changes to core order processing, notification, or tenant management systems
- **NFR22:** Webhook processing must be idempotent — duplicate webhooks from the marketplace must not create duplicate orders
- **NFR23:** Marketplace API credentials stored encrypted at rest — never logged, never exposed in error messages or client-side code

### Data Management

- **NFR24:** Order history retained in active storage for 2 years per tenant
- **NFR25:** Orders older than 2 years archived to cold storage (not deleted) — retrievable if needed but not queried in normal operation
- **NFR26:** Tenant data fully deletable upon account termination (KVKK right to deletion)

### Browser Compatibility

- **NFR27:** MVP targets Chrome and Chromium-based browsers (Edge, Brave) on desktop — the primary environment for restaurant laptop setups
- **NFR28:** Core functionality (dashboard, alerts, printing) must work without browser extensions or plugins

### Analytics & Map Performance

- **NFR29:** Analytics dashboard must load with heat map rendered within 3 seconds for up to 10,000 orders in the selected period on a 10 Mbps connection
- **NFR30:** Heat map interactions (zoom, pan, tap) must respond within 200ms
- **NFR31:** Date range filter changes must refresh analytics data and re-render the heat map within 2 seconds
