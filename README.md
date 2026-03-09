# JetAdisyon

B2B SaaS order management platform for Turkish food businesses operating on delivery marketplaces (Trendyol Go, Yemeksepeti).

## The Problem

Food businesses on delivery marketplaces juggle incoming orders manually — accepting each one by hand, copying details for the kitchen, and hoping nothing gets missed during rush hours. Every missed or delayed order is lost revenue.

## The Product

**JetAdisyon** automates the entire order flow, then goes further.

**Core (MVP):** Auto-accept orders from marketplaces, print receipts, play audio alerts — completely hands-free during service. 100% order acceptance, under 2 seconds latency.

**Analytics (MVP):** Every accepted order builds a dataset. From day one, owners get a heat map dashboard showing where orders come from, order amount distributions, and profit overlays by area — spatial and financial visibility they've never had.

**Future:** AI-powered business intelligence — area-based price benchmarking, sales pattern analysis, weather/holiday correlations, and actionable suggestions to improve revenue.

## Who It's For

- **Owner-operators** running 1-2 person kitchens who need orders to flow and print without touching a screen
- **Cashiers** in growing restaurants who route printed orders to the kitchen and need large, readable text with clear audio alerts

## Tech Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Monorepo   | TurboRepo + pnpm workspaces                      |
| Frontend   | Next.js 16, React 19, Tailwind v4, shadcn/ui v4  |
| Backend    | NestJS 11, Express                               |
| Database   | Supabase (self-hosted) — PostgreSQL + Auth + RLS |
| Maps       | Leaflet + react-leaflet + leaflet.heat           |
| Real-time  | Server-Sent Events (SSE)                         |
| Logging    | Pino with correlation IDs                        |
| Validation | Zod v4                                           |
| i18n       | next-intl (Turkish / English)                    |
| Infra      | VPS (Docker Compose)                             |

## Project Structure

```
apps/
  web/               → Next.js 16 frontend (port 3001)
  api/               → NestJS 11 backend (port 3000)
packages/
  ui/                → shadcn/ui v4 component library
  api/               → Shared types & Supabase database types
  eslint-config/     → Shared ESLint configs
  jest-config/       → Shared Jest configs
  typescript-config/ → Shared tsconfig presets
supabase/            → Migrations and seed data
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm 10.x
- Supabase CLI (for local development)

### Setup

```bash
# Install dependencies
pnpm install

# Start Supabase locally
supabase start

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Start all apps
pnpm dev
```

The web app runs on `http://localhost:3001` and the API on `http://localhost:3000`.

### Commands

```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps and packages
pnpm test         # Run unit tests
pnpm test:e2e     # Run end-to-end tests
pnpm lint         # Lint all packages
pnpm format       # Format all files with Prettier
pnpm clean        # Remove build outputs and node_modules
```

## Architecture Highlights

- **Multi-tenant isolation:** Single schema with `tenant_id` on every tenant-scoped table, enforced by Supabase Row-Level Security
- **Layered RBAC:** NestJS guards (route-level) + Supabase RLS (database-level) + JWT custom claims (`tenant_id`, `role`)
- **Webhook ingestion:** Receive, persist immediately, ACK, then process asynchronously via EventEmitter2 — at-least-once delivery with deduplication
- **Marketplace adapter pattern:** Platform differences abstracted behind a common interface — no platform-specific code in core order processing
- **Feature toggle independence:** Auto-accept, printing, and audio alerts are fully decoupled — any combination works independently

## Roadmap

| Epic | Scope                                                                         | Status  |
| ---- | ----------------------------------------------------------------------------- | ------- |
| 1    | Project infrastructure & admin login                                          | Done    |
| 2    | Order processing engine (marketplace adapter, webhook ingestion, auto-accept) | Planned |
| 3    | Service mode dashboard (live order feed, history)                             | Planned |
| 4    | Audio alerts & receipt printing                                               | Planned |
| 5    | Tenant configuration & feature toggles                                        | Planned |
| 6    | Guided onboarding                                                             | Planned |
| 7    | Analytics dashboard (heat map, overlays)                                      | Planned |
| 8    | License lifecycle & support                                                   | Planned |
| 9    | Observability & admin diagnostics                                             | Planned |

## License

Proprietary. All rights reserved.
