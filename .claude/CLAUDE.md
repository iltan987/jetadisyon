# JetAdisyon

B2B SaaS order management platform for Turkish food businesses on delivery marketplaces (Trendyol Go, Yemeksepeti).

## Project Structure

Monorepo: TurboRepo + pnpm workspaces

```
apps/
  web/          → Next.js 16 frontend (port 3001)
  api/          → NestJS 11 backend (port 3000)
packages/
  ui/           → shadcn/ui v4 components (Tailwind v4, base-nova style)
  api/          → Shared types + Supabase database types
  eslint-config/→ Shared ESLint configs (base, nest, next, library)
  jest-config/  → Shared Jest configs (base, nest, next)
  typescript-config/ → Shared tsconfig (base, nestjs, nextjs, react-library)
_bmad-output/   → BMAD planning & implementation artifacts
```

## Commands

```bash
pnpm dev              # Start all apps (web :3001, api :3000)
pnpm build            # Build all apps/packages
pnpm test             # Run unit tests (Jest)
pnpm test:e2e         # Run e2e tests
pnpm lint             # Lint all packages
pnpm format           # Prettier format all files
pnpm clean            # Remove all build outputs + node_modules
```

### Per-app commands (run from app directory)

```bash
# apps/api
pnpm nest generate    # Use NestJS CLI for scaffolding
pnpm test:watch       # Jest watch mode

# apps/web
pnpm shadcn add <component>  # Add shadcn components (also works from packages/ui)
```

## Environment

Supabase runs locally via CLI (`supabase start`). Config: `supabase/config.toml`.

### apps/api (`apps/api/.env`)

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<secret-key>
THROTTLE_TTL=60          # optional, default 60s
THROTTLE_LIMIT=100       # optional, default 100 req/ttl
```

### apps/web (`apps/web/.env`)

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1  # optional, has default
```

### Supabase CLI key mapping

- **Publishable key** = anon key (frontend, public-facing)
- **Secret key** = service role key (backend, admin operations)

## Architecture Patterns

- **Supabase clients (web)**: 3-tier pattern — `client.ts` (browser), `server.ts` (RSC/actions), `proxy.ts` (request interception)
- **Next.js 16 uses `proxy.ts`**, not `middleware.ts`, for request interception (`src/proxy.ts`)
- **Env validation (web)**: `@t3-oss/env-nextjs` with split files — `src/lib/env/client.ts` (NEXT_PUBLIC_*), `src/lib/env/server.ts` (server-only). Import `clientEnv` or `serverEnv` as needed.
- **Env validation (api)**: Zod v4 schema in `src/config/env.validation.ts`, loaded via `@nestjs/config`
- **API client (web)**: `src/lib/api-client.ts` — fetch wrapper with timeout (30s default), optional Zod schema validation, auth token injection
- **Shared constants**: Labels in `packages/api/src/tenant.constants.ts`, styles in `apps/web/src/lib/tenant-styles.ts` (labels = data, styles = presentation)
- **Query keys (web)**: Factory pattern in `src/lib/query-keys.ts`
- **Phone validation**: `libphonenumber-js` for international phone number validation in both API DTOs and frontend forms
- **shadcn/ui**: Dual `components.json` — one in `packages/ui` (source of truth), one in `apps/web` (points to ui package). Components live in `packages/ui/src/components/`
- **Cross-package imports**: `transpilePackages: ["@repo/ui"]` in next.config.ts + tsconfig paths

## Code Style

- No barrel exports (index.ts) — use direct imports
- Use official CLI tools (`nest generate`) rather than manual file creation
- Separate `.gitignore` per app/package
- Prettier: single quotes, trailing commas (`packages/eslint-config/prettier-base.js`)

## Workflow

- After completing a meaningful unit of progress, stop and present for review
- Wait for explicit approval before proceeding to next task
- Only commit after approval — do not auto-commit

## Git

- No co-author lines in commit messages
- Do not push to remote unless explicitly asked

## BMAD

Planning artifacts: `_bmad-output/planning-artifacts/`
Implementation artifacts: `_bmad-output/implementation-artifacts/`
PRD: `_bmad-output/planning-artifacts/prd.md`
