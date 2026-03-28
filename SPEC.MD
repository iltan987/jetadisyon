# JetAdisyon — SPEC.md
> AI agent instruction document. Read fully before generating any code.
> Treat every statement here as a constraint, not a suggestion.
> When something is marked TBD, ask the user before implementing.

---

## WHAT THIS APP DOES

JetAdisyon is a Windows desktop app for Turkish restaurant owners.
Restaurants receive orders from multiple food delivery platforms (Yemeksepeti, Trendyol Go, Getir, Migros Yemek).
The app connects to all platforms via their official Partner APIs, auto-accepts incoming orders, plays a sound alert, and prints an order ticket to a thermal printer — automatically, without user interaction.
A secondary feature generates a daily AI summary of order statistics in Turkish.

---

## STACK — LOCKED. DO NOT DEVIATE.

| Concern | Decision |
|---|---|
| Desktop shell | Electron |
| Local server | NestJS — spawned as child process by Electron main |
| Frontend | React + Vite — rendered inside Electron BrowserWindow |
| Language | TypeScript strict mode everywhere — no `any` |
| Local DB | SQLite via Prisma |
| Cloud DB | Supabase (managed, not self-hosted) |
| Package manager | pnpm with workspaces |
| AI | TBD — design behind an interface, do not implement provider yet |
| Printer | TBD — research ESC/POS library options before implementing |
| Styling | Tailwind CSS — no inline styles, no CSS modules |
| State (client) | useState/useReducer for local, @tanstack/react-query for server |

---

## REPO STRUCTURE

This is a pnpm monorepo. Three packages: `electron`, `backend`, `frontend`. One `shared` package for types.

```
jetadisyon/
├── packages/
│   ├── electron/          # Electron main process + IPC handlers
│   ├── backend/           # NestJS app (localhost:3456)
│   ├── frontend/          # React + Vite
│   └── shared/            # Shared TypeScript types only
├── SPEC.md
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

Keep each package independent. `frontend` and `backend` must not import from each other directly — frontend calls backend over HTTP only. `shared` types can be imported by any package.

---

## ARCHITECTURE

Two separate concerns. Keep them clean.

### Local (restaurant PC)
- Electron shell manages app lifecycle and hardware access (sound, printer via IPC)
- NestJS runs on localhost:3456, handles all business logic
- SQLite stores all operational data
- App must work fully offline — see OFFLINE RULES below

### Cloud (your infrastructure)
- Supabase handles only: restaurant accounts, license keys, subscription status
- One simple REST endpoint the app pings on startup to validate license
- Nothing operational depends on cloud being reachable

### Order flow
```
Platform webhook → POST /webhooks/:platform
  → validate signature
  → deduplicate (platform + platformOrderId must be unique)
  → save to SQLite
  → call platform API to accept order
  → send to printer (IPC)
  → play sound (IPC)
  → push update to frontend (SSE or polling)
```

### Webhook relay (production only)
Platforms POST to a public HTTPS URL. In production, restaurants are behind home/business routers with no public IP. Solution: a lightweight relay server (Node.js, deployed on a VPS) that:
- Receives webhook POSTs from platforms
- Queues them durably
- Forwards to the local app via persistent WebSocket
- Retries queued webhooks when app reconnects after outage

During development: use ngrok to expose localhost:3456 publicly. ngrok provides HTTPS automatically.

---

## OFFLINE RULES — CRITICAL

These rules are non-negotiable. Do not implement anything that violates them.

1. All order processing (receive, accept, print, sound) runs entirely locally. Never depends on cloud.
2. Platform webhooks arrive via relay server — if restaurant internet is down, webhooks queue on relay and replay on reconnect. The app must handle replayed/delayed webhooks gracefully (idempotency via deduplication).
3. License check: on startup ping Supabase, cache result locally with timestamp. If Supabase unreachable, use cached result. Only block app if cache is invalid AND has been unreachable for more than 48 hours.
4. Never show an error or block the user during an outage mid-session.

---

## DATABASE

### Local SQLite — operational data only

Define schema in `packages/backend/prisma/schema.prisma`.
Fields shown below are starting points — add/remove as needed during implementation.
Do not over-engineer upfront. Start minimal, migrate as requirements become clear.

**Entities needed:**
- `Order` — one record per incoming order. Must have platform identifier + platform's own order ID. Unique constraint on (platform, platformOrderId) for deduplication.
- `PlatformCredential` — stores API credentials per platform. Fields vary per platform — use a flexible structure (e.g. a JSON column for platform-specific fields).
- `DailySummary` — one record per day, stores AI-generated text + raw stats JSON.
- `AppSettings` — single-row config (working hours, printer, sound toggle).
- `LicenseCache` — single-row cache of last Supabase license check result + timestamp.

Do not add timestamps to every table by default. Add them only where they serve a real purpose.

### Cloud Supabase — business data only

Managed via Supabase dashboard, not tracked in this repo.
Entities: restaurants, licenses.
Use Supabase RLS (Row Level Security) to restrict data access per restaurant.
Authentication via Supabase Auth — restaurant owner logs in once during initial setup.
The desktop app authenticates with Supabase using the stored session token, not raw DB credentials.

---

## PLATFORM INTEGRATIONS

Each platform is a NestJS module in `packages/backend/src/platforms/`.
All platform modules implement this interface — do not skip this:

```typescript
interface IPlatformAdapter {
  acceptOrder(platformOrderId: string): Promise<void>;
  rejectOrder(platformOrderId: string, reason: string): Promise<void>;
  getStatus(): Promise<'open' | 'closed'>;
  setStatus(status: 'open' | 'closed'): Promise<void>;
}
```

**Platforms to integrate (no priority order — implement whichever has API access first):**
- Yemeksepeti — Partner API via Delivery Hero middleware
- Trendyol Go — `developers.tgoapps.com`
- Getir — `developers.getir.com`
- Migros Yemek — API access path TBD

Do not hardcode platform-specific logic outside its own module.
The `OrderService` must never contain platform-specific code — it calls adapters only.

---

## AI FEATURE

**When:** Daily cron at 23:30 via NestJS `@Cron`.
**What:** Aggregate today's order stats → send to AI provider → save Turkish narrative + raw stats → display on Analytics page.
**Provider:** TBD. Implement `AIService` behind an interface. Do not couple to any specific provider.
**Language of output:** Turkish always.
**Do not implement the AI provider until the interface is agreed and the user has chosen a provider.**

---

## MVP SCOPE

**In:**
- Auto-accept orders from at least one platform
- Sound alert on new order
- Thermal printer ticket on new order
- Live order feed (dashboard)
- Order history with basic filters
- Settings: credentials, working hours, printer
- Daily AI summary
- License check on startup

**Out (do not implement, do not scaffold):**
- Multi-branch support
- Menu/catalog management
- Mobile or web interface
- Cloud order sync
- Promotions or discounts
- Delivery tracking
- Accounting integrations

---

## CODING RULES

- TypeScript strict. No `any`. No type assertions without a comment explaining why.
- Every async operation in try/catch. Never swallow errors silently.
- Log every order event and every platform API call with platform name and order ID.
- Use NestJS `Logger` — do not use `console.log` in backend.
- All secrets in `.env`. Validate on startup with `@nestjs/config` + `class-validator`. Fail fast with a clear message if required vars are missing.
- All NestJS controllers return `{ data, error, timestamp }`.
- Frontend calls backend over HTTP only — no shared in-memory state between packages.
- Commit format: `feat:` `fix:` `chore:` `docs:` `refactor:`.
- Do not abstract prematurely. Repeat yourself twice before extracting.

---

## UNRESOLVED — ASK USER BEFORE IMPLEMENTING

- AI provider (Ollama local vs Claude Haiku API)
- Thermal printer library (research options, present to user before coding)
- Webhook relay server design (VPS provider, relay protocol details)
- Migros Yemek API access path
- Domain + company email (needed before applying to Getir/Trendyol — not needed yet)

---
