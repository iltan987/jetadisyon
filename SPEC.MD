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
| Cloud DB | Supabase — local CLI + Docker for dev, cloud project for production |
| Package manager | pnpm with workspaces |
| UI components | shadcn/ui + Tailwind CSS |
| AI | TBD — design behind an interface, do not implement provider yet |
| Printer | TBD — research ESC/POS library options before implementing |
| Styling | Tailwind CSS — no inline styles, no CSS modules |
| State (client) | useState/useReducer for local, @tanstack/react-query for server |

---

## REPO STRUCTURE

pnpm monorepo. Four packages: `electron`, `backend`, `frontend`, `shared`.
No separate `ui` package — shadcn components live inside `packages/frontend`.
Extract to `packages/ui` only if a second frontend is added in the future.

```
jetadisyon/
├── packages/
│   ├── electron/          # Electron main process + IPC handlers
│   ├── backend/           # NestJS app (localhost:3456)
│   ├── frontend/          # React + Vite + shadcn/ui
│   └── shared/            # Shared TypeScript types only — no logic
├── supabase/              # Supabase CLI project
│   ├── migrations/        # All schema migrations — version controlled
│   └── seed.sql           # Dev seed data
├── .mcp.json              # MCP server config — in .gitignore
├── SPEC.md
├── CLAUDE.md
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

`frontend` and `backend` must not import from each other directly.
Frontend calls backend over HTTP only.
`shared` types can be imported by any package.

---

## ARCHITECTURE

### Local (restaurant PC)
- Electron shell manages app lifecycle and hardware access (sound, printer via IPC)
- NestJS runs on localhost:3456, handles all business logic
- SQLite stores all operational data
- App must work fully offline — see OFFLINE RULES

### Cloud (your infrastructure)
- Supabase handles only: restaurant accounts, license keys, subscription status
- One REST endpoint the app pings on startup to validate license
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
Platforms POST to a public HTTPS URL. Restaurants are behind home/business routers with no public IP.
Solution: lightweight relay server (Node.js, VPS) that:
- Receives webhook POSTs from platforms
- Queues them durably
- Forwards to local app via persistent WebSocket
- Retries queued webhooks when app reconnects after outage

During development: use ngrok to expose localhost:3456. ngrok provides HTTPS automatically.

---

## OFFLINE RULES — CRITICAL

### Auto-accept is only safe when both conditions are met
Auto-accepting an order dispatches a carrier. If the kitchen has no printed ticket, the order is confirmed but unknown to the restaurant — this is worse than a missed acceptance. Auto-accept must be gated.

**Auto-accept decision flow:**
```
New order arrives via relay WebSocket
  └─> Is relay WebSocket connected and stable?   NO → do NOT accept, queue for manual review
        ↓ YES
  └─> Is printer reachable?                      NO → do NOT accept, alert owner
        ↓ YES
  └─> Auto-accept + print + sound
```

**Relay connection loss:**
- App monitors the WebSocket to the relay server continuously
- If connection drops for more than 10 seconds, flip to offline mode
- Show persistent dashboard warning in Turkish: "⚠️ Bağlantı kesildi — siparişler otomatik onaylanmıyor"
- Play a distinct alert sound (different from new order sound) so owner knows
- Small grace period of 10 seconds before triggering — prevents false alarms on micro-blips
- When relay reconnects, replayed/queued orders go to manual review queue, NOT auto-accept
- Owner must explicitly accept or reject each queued order

**Printer failure:**
- On app startup, ping the configured printer
- If printer is unreachable, disable auto-accept immediately and show warning
- Periodically re-check printer status (every 60 seconds)
- Re-enable auto-accept automatically when printer comes back online

**License check (cloud only — never blocks operations):**
- Ping Supabase on startup, cache result locally with timestamp
- If unreachable, use cached result
- Block app only if cache is invalid AND Supabase unreachable for more than 48 hours
- Never interrupt an active session for license reasons

### General rule
All order processing (receive, accept, print, sound) runs locally. Cloud unavailability never stops order processing — only relay or printer failure does.

---

## SUPABASE SETUP

### Local development
- Use Supabase CLI + Docker: `supabase start`
- Local studio at `http://localhost:54323`
- Local API at `http://localhost:54321`
- All schema changes via migrations: `supabase migration new <name>`
- Migrations are version controlled in `supabase/migrations/`
- TypeScript types generated from local schema: `supabase gen types typescript`

### Production
- Cloud Supabase project (free tier is sufficient)
- Migrations pushed via: `supabase db push --linked`
- Never edit cloud schema manually — always via migrations

### MCP server config (in .mcp.json — gitignored)
Point at local instance during development:
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "registry:mcp"]
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y", "@supabase/mcp-server-supabase@latest",
        "--supabase-url", "http://localhost:54321",
        "--access-token", "<local-service-role-key>"
      ]
    }
  }
}
```
Swap to cloud credentials for production debugging.
Never commit `.mcp.json` — add to `.gitignore`.

---

## DATABASE

### Local SQLite — operational data only

Defined in `packages/backend/prisma/schema.prisma`.
Fields are starting points — add/remove as needed during implementation.
Start minimal. Migrate as requirements become clear.

**Entities:**
- `Order` — one record per incoming order. Unique constraint on (platform, platformOrderId) for deduplication.
- `PlatformCredential` — API credentials per platform. Use a flexible JSON column for platform-specific fields since credential shapes vary per platform.
- `DailySummary` — one record per day. AI-generated text + raw stats JSON.
- `AppSettings` — single-row config (working hours, printer, sound toggle).
- `LicenseCache` — single-row cache of last Supabase license check + timestamp.

Do not add timestamps to every table by default. Add only where they serve a real purpose.

### Cloud Supabase — business data only

Managed via Supabase CLI migrations, not the dashboard directly.

**Entities:** restaurants, licenses.

Use Supabase RLS (Row Level Security) — restrict data access per restaurant.
Use Supabase Auth — restaurant owner authenticates once during initial setup.
Desktop app authenticates with Supabase using the stored session token, not raw DB credentials.

---

## PLATFORM INTEGRATIONS

Each platform is a NestJS module in `packages/backend/src/platforms/`.
All modules implement this interface — mandatory:

```typescript
interface IPlatformAdapter {
  acceptOrder(platformOrderId: string): Promise<void>;
  rejectOrder(platformOrderId: string, reason: string): Promise<void>;
  getStatus(): Promise<'open' | 'closed'>;
  setStatus(status: 'open' | 'closed'): Promise<void>;
}
```

**Platforms (no priority order — implement whichever has API access first):**
- Yemeksepeti — Partner API via Delivery Hero middleware — contact form submitted
- Trendyol Go — `developers.tgoapps.com` — apply via `partner.trendyol.com`
- Getir — `developers.getir.com` — requires company domain email (`info@jetadisyon.com.tr`)
- Migros Yemek — no public portal — contact `kurumsal@migros.com.tr`

Do not put platform-specific logic outside its own module.
`OrderService` calls adapters only — no platform-specific code in service layer.

### Getting platform access
Getir and likely Trendyol require a company domain email.
Register `jetadisyon.com.tr` and set up `info@jetadisyon.com.tr` via Zoho Mail (free).
For commercial selling, register a şahıs şirketi (sole proprietorship) in Turkey.

---

## AI FEATURE

**Trigger:** `@Cron('30 23 * * *')` — daily at 23:30.
**Flow:** aggregate today's SQLite orders → compute stats → send to AI provider → save Turkish narrative + raw stats to `DailySummary` → display on Analytics page with recharts chart.
**Provider:** TBD. Implement `AIService` behind an interface. Do not couple to any specific provider.
**Output language:** Turkish always.
**Do not implement until interface is agreed and provider is chosen.**

Provider options when decision time comes:
- Ollama (local) — free, private, needs ~8GB RAM, first-time setup on restaurant PC
- Claude Haiku API — ~$0.001/day, easy, good Turkish, needs internet + API key

---

## MVP SCOPE

**In:**
- Auto-accept orders from at least one platform
- Sound alert on new order
- Thermal printer ticket on new order
- Live order feed dashboard
- Order history with basic filters
- Settings: credentials, working hours, printer
- Daily AI summary
- License check on startup

**Out — do not implement, do not scaffold:**
- Multi-branch support
- Menu/catalog management
- Mobile or web interface
- Cloud order sync
- Promotions or discounts
- Delivery tracking
- Accounting integrations
- Separate `packages/ui` package

---

## CODING RULES

- TypeScript strict. No `any`. No type assertions without inline comment explaining why.
- Every async operation in try/catch. Never swallow errors silently.
- Log every order event and every platform API call with platform name and order ID.
- Use NestJS `Logger` — never `console.log` in backend.
- All secrets in `.env`. Validate on startup with `@nestjs/config` + `class-validator`. Fail fast with clear message if required vars are missing.
- All NestJS controllers return `{ data, error, timestamp }`.
- Frontend calls backend over HTTP only — no shared in-memory state between packages.
- shadcn components live in `packages/frontend/src/components/ui/` — standard shadcn convention.
- Commit format: `feat:` `fix:` `chore:` `docs:` `refactor:`.
- Do not abstract prematurely. Repeat yourself twice before extracting.

---

## MCP SERVERS

Configured in `.mcp.json` (project-scoped, gitignored).
Context7 is configured globally (user-scoped) — available in all projects.

| Server | Purpose |
|---|---|
| Context7 | Live docs for NestJS, Prisma, Electron, React, Vite, Supabase |
| shadcn/ui | Accurate component props and registry — prevents hallucinated APIs |
| Supabase | Query local Supabase schema during development |

---

## DEVELOPMENT WORKFLOW

### Spec-Kit (installed)
Use for every feature — one spec per feature, numbered sequentially.
Workflow per feature: `/speckit.specify` → `/speckit.clarify` (if needed) → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`
Constitution already initialized at `.specify/memory/constitution.md`.

### Feature build order
1. pnpm monorepo scaffold
2. Supabase local setup + license schema
3. NestJS bootstrap + SQLite/Prisma setup
4. License check module (startup ping + local cache)
5. Settings screen UI (shadcn)
6. Dashboard UI with mock data (shadcn)
7. First platform webhook integration
8. Auto-accept logic
9. Sound alert
10. Printer integration
11. Order history page
12. Analytics page + AI summary

---

## UNRESOLVED — ASK USER BEFORE IMPLEMENTING

- AI provider (Ollama vs Claude Haiku)
- Thermal printer library (research options, present before coding)
- Webhook relay server design (VPS provider, relay protocol)
- Migros Yemek API access path
- Domain + company email (needed before Getir/Trendyol applications)

---
