# Implementation Plan: Separate Database Package

**Branch**: `004-db-package` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-db-package/spec.md`

## Summary

Extract Prisma schema, migrations, and client generation into a dedicated `packages/db` workspace package (`@repo/db`). The package owns the singleton `PrismaClient` (with adapter) and re-exports all generated types. `apps/api` drops all direct Prisma dependencies and imports from `@repo/db`. Turbo's `dependsOn` replaces the custom `ensure-prisma-client.mjs` script.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js ≥20  
**Primary Dependencies**: Prisma 7.7.0, `@prisma/client ^7.7.0`, `@prisma/adapter-pg ^7.7.0`, `pg`, pnpm workspaces, Turbo v2  
**Storage**: PostgreSQL via `@prisma/adapter-pg` (`PrismaPg` driver)  
**Testing**: Jest (API), Vitest (frontend packages)  
**Target Platform**: Node.js server (NestJS API) + future CLI/script consumers  
**Project Type**: Monorepo workspace package (library)  
**Constraints**: Prisma generation must complete before any dependent build or dev task starts — handled entirely by Turbo `dependsOn`, no custom scripts

## Constitution Check

No project constitution is currently defined. No gates to evaluate.

## Project Structure

### Documentation (this feature)

```text
specs/004-db-package/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
└── tasks.md             ← Phase 2 output (/speckit.tasks command)
```

### Source Code Layout

```text
packages/db/
├── prisma/
│   ├── schema.prisma          ← moved from apps/api/prisma/
│   └── migrations/            ← moved from apps/api/prisma/migrations/
├── generated/
│   └── prisma/                ← Prisma generates here (gitignored)
├── src/
│   ├── client.ts              ← singleton PrismaClient with PrismaPg adapter
│   └── index.ts               ← re-exports prisma singleton + all generated types
├── package.json
├── tsconfig.json
└── prisma.config.ts           ← moved from apps/api/

apps/api/
├── prisma/                    ← REMOVED (moved to packages/db)
├── generated/                 ← REMOVED (moved to packages/db)
├── prisma.config.ts           ← REMOVED (moved to packages/db)
├── scripts/
│   └── ensure-prisma-client.mjs  ← DELETED (Turbo handles generation ordering)
└── src/
    └── database/
        └── prisma.service.ts  ← updated: wraps singleton from @repo/db
```

**Why `generated/prisma/` not `src/generated/`**: Matches the official Prisma Turborepo guide and the existing `apps/api` convention (`output = "../generated/prisma"`). Generated files are not TypeScript source — keeping them outside `src/` makes this clear.

## Implementation Phases

---

### Phase 1 — Create `packages/db` scaffold

**Goal**: Create the new package with `package.json`, `tsconfig.json`, `src/client.ts`, and `src/index.ts`.

#### 1.1 `packages/db/package.json`

```json
{
  "name": "@repo/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "prisma db seed",
    "check-types": "tsc --noEmit",
    "lint": "eslint",
    "clean": "rm -rf .turbo node_modules generated"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.7.0",
    "@prisma/client": "^7.7.0",
    "dotenv": "^17.4.1",
    "pg": "^8.20.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "eslint": "catalog:",
    "prisma": "^7.7.0",
    "typescript": "catalog:"
  }
}
```

**Note**: `@prisma/adapter-pg` and `pg` live here — the singleton is configured with the adapter inside `packages/db`, not in `apps/api`.

#### 1.2 `packages/db/tsconfig.json`

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "module": "preserve",
    "target": "ES2022",
    "lib": ["ES2022"]
  },
  "include": ["src", "prisma.config.ts"],
  "exclude": ["generated", "node_modules"]
}
```

`generated/` is excluded from strict checking — generated files are `@ts-nocheck` anyway.

#### 1.3 `packages/db/src/client.ts`

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

The `globalThis` guard prevents multiple client instances during hot-reload in dev (harmless in NestJS, required in Next.js).

#### 1.4 `packages/db/src/index.ts`

```typescript
export { prisma } from "./client.js";
export * from "../generated/prisma/client.js";
```

This gives consumers access to:

- `prisma` — the configured singleton
- `PrismaClient` — the class (for `extends` patterns)
- All model types, input types, enums, `Prisma` namespace

---

### Phase 2 — Move Prisma files from `apps/api`

**Goal**: Relocate schema, migrations, and config. Delete `ensure-prisma-client.mjs`.

#### 2.1 Move `prisma/schema.prisma`

Move `apps/api/prisma/schema.prisma` → `packages/db/prisma/schema.prisma`.

Update `output` path:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

#### 2.2 Move `prisma/migrations/`

Move `apps/api/prisma/migrations/` → `packages/db/prisma/migrations/` (currently empty).

#### 2.3 Move `prisma.config.ts`

Move `apps/api/prisma.config.ts` → `packages/db/prisma.config.ts`. Content unchanged:

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
```

#### 2.4 Delete `ensure-prisma-client.mjs`

Delete `apps/api/scripts/ensure-prisma-client.mjs`. Remove the `ensure:prisma` script and all `pnpm run ensure:prisma &&` prefixes from `apps/api/package.json` scripts.

Turbo's `dependsOn: ["^db:generate"]` in `dev` and `build` replaces this script entirely — generation is guaranteed to run before any dependent task.

---

### Phase 3 — Run `prisma generate` in `packages/db`

**Goal**: Verify generation works from the new location.

```sh
cd packages/db
pnpm install
pnpm run db:generate
```

Verify `packages/db/generated/prisma/` is populated with `client.ts`, `models.ts`, `enums.ts`, etc.

Add to root `.gitignore` (or `packages/db/.gitignore`):

```
generated/prisma/
```

---

### Phase 4 — Update `apps/api` to consume `@repo/db`

**Goal**: Remove all direct Prisma dependencies; import from `@repo/db`.

#### 4.1 Update `apps/api/package.json`

Remove from `dependencies`:

- `@prisma/client`
- `@prisma/adapter-pg`
- `pg` (if only used for Prisma)

Remove from `devDependencies`:

- `prisma`

Remove `@types/pg` from devDependencies (if only used for Prisma adapter).

Add to `dependencies`:

- `"@repo/db": "workspace:*"`

Remove scripts: `db:generate`, `db:migrate`, `db:studio`, `db:seed`, `ensure:prisma`.  
Remove `ensure:prisma &&` prefix from `dev`, `build`, `start`, `check-types` scripts.

Update `clean` script — remove `generated/prisma` (no longer exists in `apps/api`).

#### 4.2 Update `apps/api/src/database/prisma.service.ts`

The service no longer creates a `PrismaClient` instance — it wraps the singleton from `@repo/db` and adds NestJS lifecycle hooks for connection management:

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { prisma } from "@repo/db";
import type { PrismaClient } from "@repo/db";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db: PrismaClient = prisma;

  async onModuleInit() {
    await prisma.$connect();
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }
}
```

**Why not `extends PrismaClient`**: The adapter is now configured inside `packages/db`. A second `extends`-based instantiation would create a competing connection pool. The singleton is the single source — `PrismaService` becomes a lifecycle manager and DI token only.

Future repositories/services inject `PrismaService` and access `prismaService.db.user.findMany()` etc.

#### 4.3 Remove `apps/api/prisma/` and `apps/api/generated/`

Delete both directories. Also remove `apps/api/prisma.config.ts`.

---

### Phase 5 — Update Turbo pipeline

**Goal**: Ensure generation always runs before any dependent build or dev task, without a custom script.

Update `turbo.json` (from official Prisma Turborepo guide):

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "globalEnv": ["PORT", "TAURI_DEV_HOST", "DATABASE_URL"],
  "tasks": {
    "build": {
      "dependsOn": ["^build", "^db:generate"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", "generated/prisma/**"]
    },
    "dev": {
      "dependsOn": ["^db:generate"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build", "^lint"]
    },
    "format": {
      "dependsOn": ["^format"]
    },
    "check-types": {
      "dependsOn": ["^build", "^check-types"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:migrate:deploy": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Key changes from current `turbo.json`**:

- `build.dependsOn` gains `"^db:generate"` — runs `@repo/db`'s `db:generate` before any app builds
- `dev.dependsOn` gains `"^db:generate"` — same guarantee for dev mode
- `build.outputs` gains `"generated/prisma/**"` — Turbo caches the generated output correctly
- `db:studio` removed (not a Turbo task — run manually with `pnpm --filter @repo/db db:studio`)

**Why `^db:generate` (caret prefix)**: The `^` means "run this task in all dependency packages first." Since `apps/api` depends on `@repo/db`, Turbo will run `@repo/db#db:generate` before `apps/api#build` or `apps/api#dev`. Packages that don't depend on `@repo/db` are unaffected.

---

### Phase 6 — Verify and clean up

**Goal**: Full build passes with zero errors.

```sh
pnpm install                 # pick up @repo/db workspace dep
pnpm run build               # Turbo: @repo/db#db:generate → @repo/db#build → apps/api#build
pnpm run check-types         # zero errors
pnpm run lint                # zero new violations
```

Verify checklist:

- `packages/db/generated/prisma/` is populated
- `apps/api` has no `prisma/`, `generated/`, or `prisma.config.ts`
- `apps/api` has no `@prisma/*` or `pg` direct dependencies
- `pnpm --filter @repo/db db:migrate` works
- `turbo run dev` starts without requiring manual generation step

---

## Complexity Tracking

No constitution violations. Straightforward package extraction following the official Prisma Turborepo guide.

## Open Questions (deferred to implementation)

1. **`src/index.ts` wildcard export**: `export * from '../generated/prisma/client.js'` may conflict with named exports if the generated file exports something that clashes with `{ prisma }`. Verify after generation — adjust to selective named exports if needed.

2. **`DATABASE_URL` in `packages/db/src/client.ts`**: The singleton reads `process.env.DATABASE_URL` directly (not via the validated `env` from `apps/api/src/config/env.ts`). This is intentional — `packages/db` must not depend on `apps/api`. The env is validated at the app boundary (`apps/api`), which starts before the DI container initialises the `PrismaService`.

3. **`check-types` and generated files**: `tsc --noEmit` in `packages/db` excludes `generated/` but `src/client.ts` imports from it. Add `"skipLibCheck": true` override in `packages/db/tsconfig.json` if `tsc` complains about generated file imports before generation has run.
