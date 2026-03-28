# JetAdisyon Constitution

## Core Principles

### I. Offline-First — Auto-Accept is Safety-Gated (NON-NEGOTIABLE)
Auto-accepting an order dispatches a carrier. A confirmed order with no printed ticket is worse than a missed acceptance. Auto-accept must only fire when **both** conditions are true:
- The relay WebSocket is connected and stable (no drop > 10 seconds)
- The thermal printer is reachable

If either condition fails: do not accept, show a persistent Turkish warning on the dashboard, and play a distinct alert sound. Queued/replayed orders after reconnection go to **manual review only** — never auto-accepted. This gate cannot be removed or bypassed for any reason.

### II. Locked Stack — Do Not Deviate
The technology stack is final. Every concern has an assigned solution:

| Concern | Decision |
|---|---|
| Desktop shell | Electron |
| Local server | NestJS (child process, port 3456) |
| Frontend | React + Vite |
| Language | TypeScript strict mode — no `any` |
| Local DB | SQLite via Prisma |
| Cloud DB | Supabase (CLI + Docker for dev) |
| Package manager | pnpm workspaces |
| UI components | shadcn/ui + Tailwind CSS |
| Client state | useState/useReducer (local), @tanstack/react-query (server) |
| AI provider | **TBD** — implement behind interface, do not choose provider yet |
| Printer library | **TBD** — research ESC/POS options, present before coding |

No new dependency may be introduced without: (1) naming it, (2) explaining what it does and why it is needed, (3) checking if an existing dependency covers the need, (4) getting explicit user confirmation.

### III. Package Isolation
The monorepo has exactly four packages: `electron`, `backend`, `frontend`, `shared`.
- `frontend` and `backend` must not import each other directly — frontend calls backend over HTTP only
- `shared` is for TypeScript types only — no logic
- `shadcn/ui` components live in `packages/frontend/src/components/ui/` — no separate `packages/ui` until a second frontend exists
- Do not create `index.ts` barrel files unless explicitly asked

### IV. Platform Adapter Contract
Every platform integration implements `IPlatformAdapter`:
```typescript
interface IPlatformAdapter {
  acceptOrder(platformOrderId: string): Promise<void>;
  rejectOrder(platformOrderId: string, reason: string): Promise<void>;
  getStatus(): Promise<'open' | 'closed'>;
  setStatus(status: 'open' | 'closed'): Promise<void>;
}
```
Each platform is a NestJS module in `packages/backend/src/platforms/`. No platform-specific logic outside its own module. `OrderService` calls adapters only.

### V. Simplicity and Minimal Scope
- Do not scaffold, stub, or create placeholder code for out-of-scope features
- Do not abstract prematurely — repeat yourself twice before extracting
- Do not add columns, tables, or logic speculatively — only what the current task requires
- Start minimal, migrate as requirements become clear
- Never implement anything listed under **Out of MVP scope** in SPEC.md

### VI. Confirm Before Coding
- No non-trivial implementation without confirming the plan first
- If a decision is not explicitly covered in SPEC.md, stop and ask — do not guess
- If something is marked TBD in SPEC.md, it must not be implemented until the user decides
- Do one thing at a time — complete and confirm before moving on

---

## Code Quality Standards

- TypeScript strict mode everywhere — no `any`, no type assertions without an inline comment explaining why
- All async functions must have try/catch — never swallow errors silently
- Never use `console.log` in `backend/` — use NestJS `Logger`
- Log every order event and every platform API call with platform name and order ID
- All NestJS controllers return `{ data, error, timestamp }`
- All secrets in `.env`, validated on startup via `@nestjs/config` + `class-validator` — fail fast with a clear message if required vars are missing
- Every new NestJS service or controller must be registered in its module
- No `TODO` comments in code — either implement it or raise it to the user

---

## Database Rules

### Local SQLite (operational data)
- Schema defined in `packages/backend/prisma/schema.prisma`
- All changes via Prisma migration — never edit the DB directly
- Never rename a column or table without flagging it as a breaking change first
- Entities: `Order`, `PlatformCredential`, `DailySummary`, `AppSettings`, `LicenseCache`
- `Order` has a unique constraint on `(platform, platformOrderId)` for deduplication

### Cloud Supabase (business data only)
- Entities: restaurants, licenses
- All changes via `supabase migration new` — never via the dashboard
- Use Supabase RLS + Auth — desktop app authenticates with stored session token, not raw DB credentials
- License check: pings Supabase on startup, caches result locally with timestamp; blocks app only if cache is invalid AND Supabase unreachable for more than 48 hours; never interrupts an active session

---

## TBD Items — Do Not Implement Until Resolved

| Item | Status |
|---|---|
| AI provider | TBD — Ollama (local) vs Claude Haiku API |
| Thermal printer library | TBD — research ESC/POS options first |
| Webhook relay server design | TBD — VPS provider and relay protocol unresolved |
| Migros Yemek API access | TBD — no public portal |
| Domain + company email | TBD — needed before Getir/Trendyol applications |

---

## MVP Scope Boundary

**In scope:**
- Auto-accept orders from at least one platform
- Sound alert on new order
- Thermal printer ticket on new order
- Live order feed dashboard
- Order history with basic filters
- Settings: credentials, working hours, printer
- Daily AI summary (after provider is chosen)
- License check on startup

**Out of scope — do not implement, do not scaffold:**
- Multi-branch support
- Menu/catalog management
- Mobile or web interface
- Cloud order sync
- Promotions or discounts
- Delivery tracking
- Accounting integrations
- Separate `packages/ui` package

---

## Development Workflow

Feature build order (do not skip steps):
1. pnpm monorepo scaffold
2. Supabase local setup + license schema
3. NestJS bootstrap + SQLite/Prisma setup
4. License check module (startup ping + local cache)
5. Settings screen UI (shadcn)
6. Dashboard UI with mock data (shadcn)
7. First platform webhook integration
8. Auto-accept logic (with safety gate)
9. Sound alert
10. Printer integration
11. Order history page
12. Analytics page + AI summary

Feature workflow per feature: `/speckit.specify` → `/speckit.clarify` (if needed) → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`

---

## Governance

This constitution is derived from SPEC.md and CLAUDE.md, which are user-managed and immutable by Claude. In any conflict, SPEC.md and CLAUDE.md are authoritative. This constitution must be updated if those files change — it must never diverge from them.

All implementation decisions must be verifiable against SPEC.md. If SPEC.md does not cover a decision, the user must be asked — the constitution does not fill gaps on its own.

**Version**: 1.0.0 | **Ratified**: 2026-03-29 | **Last Amended**: 2026-03-29
