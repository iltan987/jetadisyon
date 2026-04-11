# Quickstart: Infrastructure Scaffolding

**Branch**: `002-infra-scaffold` | **Date**: 2026-04-10
**Audience**: Developer working on this feature or onboarding to the project post-merge

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10 (`npm install -g pnpm`)
- Docker with Compose plugin (`docker compose version` — must be v2)
- Rust toolchain (for Tauri desktop build only, not needed for tests/api)

---

## First-Time Setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Copy env files for each app
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/desktop/.env.example apps/desktop/.env

# 3. Start local infrastructure (PostgreSQL)
pnpm dev:infra

# 4. Apply initial database migrations
pnpm --filter api db:migrate

# 5. Verify everything works
pnpm build       # build all packages in dependency order
pnpm check-types # TypeScript across all packages
pnpm lint        # ESLint across all packages
pnpm test        # run all test suites
```

---

## Day-to-Day Commands

### Start infrastructure

```bash
pnpm dev:infra          # start PostgreSQL in background
pnpm dev:infra:stop     # stop all services, preserve data
```

### Run tests

```bash
pnpm test                          # all packages via Turbo
pnpm --filter api test             # API only (Jest)
pnpm --filter admin test           # Admin only (Vitest)
pnpm --filter desktop test         # Desktop only (Vitest)
pnpm --filter @repo/ui test        # UI package (Vitest)
```

### Database

```bash
pnpm --filter api db:migrate       # apply pending migrations
pnpm --filter api db:generate      # regenerate Prisma client
pnpm --filter api db:studio        # open Prisma Studio browser UI
pnpm --filter api db:seed          # seed development data (when available)
```

### Type checking

```bash
pnpm check-types                   # all packages
pnpm --filter api check-types      # API only
```

---

## Package Locations

| Package        | Path              | Purpose                                    |
| -------------- | ----------------- | ------------------------------------------ |
| `@repo/types`  | `packages/types/` | Shared TypeScript enums and interfaces     |
| `@repo/i18n`   | `packages/i18n/`  | Centralized translations (Turkish default) |
| `apps/api`     | `apps/api/`       | NestJS REST API with Prisma + PostgreSQL   |
| `apps/admin`   | `apps/admin/`     | React admin dashboard                      |
| `apps/desktop` | `apps/desktop/`   | Tauri desktop application                  |
| `@repo/ui`     | `packages/ui/`    | Shared React component library             |

---

## Adding a New Response Code

```bash
# 1. Add to packages/types/src/response-codes.ts
#    e.g., ORDER_ACCEPTED = 'ORDER_ACCEPTED'

# 2. Add Turkish translation to packages/i18n/src/locales/tr.json
#    "api": { "ORDER_ACCEPTED": "Sipariş kabul edildi" }

# 3. Verify — TypeScript will surface missing switch cases
pnpm check-types

# Both steps must be committed together (constitution §VI)
```

---

## Adding a New Translation Key

```bash
# 1. Add to packages/i18n/src/locales/tr.json
#    "order": { "new_order": "Yeni sipariş" }

# 2. Use in component (TypeScript autocompletes valid keys)
#    const { t } = useTranslation();
#    t('order.new_order')

# No codegen step needed — types update automatically
```

---

## Environment Variables Reference

### apps/api (.env)

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/jetadisyon
PORT=3000
NODE_ENV=development
```

### apps/admin (.env)

```bash
VITE_API_URL=http://localhost:3000
VITE_APP_ENV=development
```

### apps/desktop (.env)

```bash
VITE_API_URL=http://localhost:3000
```

---

## CI Pipeline

CI runs automatically on every pull request. The pipeline:

1. Installs dependencies with frozen lockfile
2. Runs `turbo build lint check-types test` — all must pass
3. Uses Turbo remote cache — unchanged packages are skipped

To simulate CI locally:

```bash
pnpm build && pnpm lint && pnpm check-types && pnpm test
```
