---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
date: 2026-03-07
author: iltan
---

# Product Brief: JetAdisyon

## Executive Summary

JetAdisyon is a B2B SaaS order management platform for Turkish food businesses operating on delivery marketplaces (Trendyol Go, Yemeksepeti). It targets cost-conscious businesses already using existing solutions by offering the same core functionality — automated order acceptance and receipt printing — at a lower price point. The platform is built on a solid multi-tenant foundation (Next.js, NestJS, Supabase) designed to support future AI-powered business intelligence as the product and its data mature. Built by a developer with genuine proximity to the domain, JetAdisyon's go-to-market starts with personal networks and word-of-mouth.

---

## Core Vision

### Problem Statement

Small food businesses on Turkish delivery marketplaces use order management tools like existing solutions and are generally satisfied. However, they're paying more than necessary for core functionality — auto-accepting orders and printing receipts. There is no acute pain, but there is a clear cost opportunity: a simpler, cheaper alternative that does the essentials well.

### Problem Impact

For small food businesses operating on thin margins, every recurring software cost matters. A lower-cost tool that delivers the same core value frees up budget — and for businesses that currently manage orders manually, it removes friction that grows during peak hours.

### Why Existing Solutions Fall Short

The incumbent tooling is the primary competitor and serves the market adequately. The opportunity is not that it fails, but that it charges more than the core job requires. There is no AI-driven business intelligence layer in the current market, leaving an open lane for future differentiation.

### Proposed Solution

JetAdisyon is a focused order management platform built in phases:
- **Foundation:** Authentication, multi-tenant architecture, security, database design
- **v1 — Core:** Single platform integration (whichever grants API access first), auto-accept orders, receipt printing — feature parity with incumbent tools at a lower price. Analytics dashboard with heat map visualization, order amount and profit overlays
- **v2 — Expansion:** Second platform integration, self-service onboarding
- **v3 — Intelligence:** AI-powered insights — area-based price benchmarking, sales pattern analysis, weather/holiday correlations, actionable suggestions

### Key Differentiators

- Lower price for the same core functionality
- Clean, modern architecture built for multi-tenancy from day one
- AI-powered business intelligence as a future differentiator (no competitor offers this)
- Personal domain proximity — built by someone who knows these businesses firsthand
- Go-to-market through personal networks and word-of-mouth, trial-first model

---

## Target Users

### Primary Users

**Persona: Ahmet — Small Restaurant Owner/Operator**

Ahmet runs a small food business with 1-2 people total. He's the cook, the cashier, and the manager all in one. He operates on Trendyol Go and/or Yemeksepeti to get delivery orders. He currently uses existing solutions but would switch to something cheaper if it does the same job. He doesn't have time to learn complex software — he needs orders to come in, get accepted automatically, and print so he can start preparing. Every lira saved on software is a lira kept on a thin margin.

- **Role:** Owner-operator, does everything
- **Environment:** Small kitchen, 1-2 people, high pace during peak hours
- **Goal:** Orders flow in and print without him touching a screen
- **Motivation:** Save money, keep things simple, focus on food not software

### Secondary Users

**Persona: Elif — Cashier at a Growing Restaurant**

As a restaurant grows to 4+ staff (cashier, prep cooks, service), the workflow shifts. Elif is the cashier — she receives the printed order slips and hands them to the kitchen team, or the kitchen reads directly from the printout. She doesn't configure the system; the owner set it up. She just needs orders to print reliably and be readable at a glance.

- **Role:** Cashier / order coordinator
- **Environment:** Busier restaurant, separated roles
- **Goal:** Grab printed orders, route them to kitchen staff
- **Motivation:** Clear, fast printouts that don't slow down service

### Future Target

As JetAdisyon matures, the target expands to all restaurants across Turkey that use online food ordering platforms — from small to large operations. The product grows with the market: small restaurants first, then mid-size with separated roles, eventually larger operations that benefit from analytics and AI insights.

### User Journey

- **Discovery:** Word-of-mouth through iltan's personal network and local food business connections
- **Onboarding:** Simple setup — connect marketplace account, configure printer, done
- **Core Usage:** Fully automated — orders auto-accepted, receipts auto-printed. Ahmet barely interacts with the software during service
- **Success Moment:** First busy evening where orders just flow without manual acceptance — same as before, less money spent
- **Long-term:** As trust builds, upgrades to analytics/AI tiers. Recommends to other restaurant owners

---

## Success Metrics

### User Success Metrics

- **Order reliability: 100%** — Every order auto-accepted without failure. If this breaks, nothing else matters. This is a hard requirement, not a target.
- **Zero-loss switching** — Users lose no functionality moving from existing tools to JetAdisyon. Feature parity on core workflows (auto-accept, print).
- **Cost savings** — Users pay less than they did with existing solutions for the same core service.
- **Sales improvement (v3)** — Users who engage with AI suggestions and analytics see measurable sales increases.

### Business Objectives

- **No aggressive sales targets** — Growth is organic: personal network first, then word-of-mouth, eventually ads and a marketing website.
- **Product sells itself** — The measure of success is users recommending JetAdisyon to other restaurant owners without being asked.
- **Sustainable side project** — Built and maintained in free time. No burn rate, no investor pressure.

### Key Performance Indicators

| KPI | Target | Phase |
|-----|--------|-------|
| Order acceptance rate | 100% (non-negotiable) | v1 |
| Feature parity with incumbent tools (core) | Full parity on auto-accept + print | v1 |
| Monthly cost vs. incumbents | Lower | v1 |
| Active paying tenants | First 3-5 from personal network | v1 |
| User churn after trial | Measure — no hard target yet | v1+ |
| Organic referrals | At least 1 unprompted recommendation | v2 |
| Users engaging with analytics | Measure adoption rate | v1 |
| Sales lift from AI suggestions | Measurable improvement reported by users | v3 |

### Personal Success

- Deployed, production-grade B2B SaaS application with real paying users
- Resume line: "Developed a multi-tenant B2B SaaS order management platform with AI-powered business intelligence"

---

## MVP Scope

### Core Features

**Authentication & Tenancy**
- User authentication (login/logout)
- Multi-tenant architecture — each restaurant is an isolated tenant
- Tenant accounts created manually by admin (no self-service signup in MVP)

**UI/UX (First-Class Priority)**
- Desktop-first design, responsive enough that phone doesn't break
- Clean, minimal SaaS aesthetic using shadcn/ui + Tailwind v4
- Dashboard scannable at a glance — large type, high contrast, minimal elements
- Step-by-step onboarding flow: connect account → set up printer → done
- Design validated with real early users from personal network

**Platform Integration**
- Single platform integration (Trendyol Go or Yemeksepeti — whichever grants API access first)
- Restaurant owner connects their marketplace account to JetAdisyon
- Automatic order acceptance — 100% reliability, non-negotiable
- Integration adapter pattern — abstract the platform connection so the real API slots in cleanly
- No mocks, no assumptions — integration work begins only when real API access is granted

**Receipt Printing**
- Auto-print incoming orders on thermal/receipt printer
- Order details, items, quantities — readable at a glance
- Start simple (browser print), iterate later
- Can prototype with manual test data before platform integration

**Order History**
- Scannable list of past orders in the web dashboard
- Time, items, status, platform — glanceable, not a dense data table

**Connection Health & Notifications**
- Connection health monitoring — if the link to the marketplace drops, Ahmet knows immediately
- Red/green status indicator visible at all times on dashboard
- Basic in-app alerts for critical events (connection loss, printer issues, order failures)
- Connection health is more critical than order-event notifications (the printer announces those)

**Admin Dashboard (Internal)**
- Tenant management — create, view, activate/deactivate tenants
- License/subscription tracking
- Functional, not polished

**Analytics Dashboard**
- Heat map visualization of order locations based on delivery address data
- Order amount and profit overlays per geographic area
- Date/time filtering, map interaction (zoom, pan, tap for detail)
- Summary statistics: order count, total revenue, average order value

### MVP Build Order

1. Auth + tenancy + database design
2. UI/UX — dashboard, admin panel, onboarding shells
3. Notification system (connection health framework)
4. Order history (data model + UI)
5. Receipt printing (prototyped with test data)
6. Platform integration — slotted in when API access arrives

### Out of Scope for MVP

- Second platform integration (v2)

- AI-powered suggestions and insights (v3)
- Self-service tenant signup / onboarding flow
- Marketing website
- Mobile app or dedicated mobile UI optimization
- Advanced notifications (email, SMS, push)
- Payment processing / billing automation
- Printer setup wizard
- Any platform mocking or temporary integration work

### MVP Success Criteria

- Orders auto-accepted at 100% reliability on the integrated platform
- At least 1 real restaurant using the system in production
- Receipt printing works end-to-end without manual intervention
- Restaurant owner can log in, see orders, and know system health at a glance
- Onboarding chain works end-to-end: login → connect platform → configure printer → first print
- Admin can manage tenants without touching the database directly
- Cost to the restaurant is lower than existing solutions
- UI feels clean and professional — validated with real users

### Future Vision

- **v2:** Second platform integration, self-service onboarding, improved notifications, mobile-optimized UI
- **v3:** AI-powered insights — area pricing benchmarks, sales patterns, weather/holiday correlations, actionable suggestions
- **Long-term:** Expand across Turkey to all restaurants using online food platforms, from small to large. Product becomes the affordable, intelligent alternative to incumbent tools.
