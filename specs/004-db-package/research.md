# Research: Separate Database Package

## Prisma 7 Generator Output

**Decision**: Keep `provider = "prisma-client"` (already correct).

Prisma 7 generates a set of TypeScript source files (not a compiled JS bundle):

| File                  | Purpose                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| `client.ts`           | Main entry: exports `PrismaClient` class, re-exports enums and input types |
| `models.ts`           | Barrel for all model types + `commonInputTypes.ts`                         |
| `enums.ts`            | All schema enum types                                                      |
| `browser.ts`          | Browser-safe subset (no Node.js imports)                                   |
| `commonInputTypes.ts` | Prisma input/filter/orderBy types                                          |
| `internal/`           | Runtime internals, not imported directly                                   |

All generated files are `@ts-nocheck` — strict tsconfig settings do not apply to them.

**Rationale**: Generated TS files can be re-exported directly without a compile step, which matches how the existing `@repo/types` package works (exports `.ts` files directly via `exports` field).

## Monorepo Pattern (Prisma's Own E2E Tests)

**Decision**: `packages/db` owns schema + generation; `output = "../src/generated"`.

Prisma's own test suite has a `packages/db` e2e test that validates exactly this pattern:

```sh
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
```

The `output` path in `schema.prisma` is relative to the schema file's location. With schema at `packages/db/prisma/schema.prisma`, setting `output = "../src/generated"` puts generated files in `packages/db/src/generated/`.

**Rationale**: This keeps generated files inside the package boundary, making them importable via `@repo/db` package exports.

## `@prisma/adapter-pg` API in Prisma 7

**Decision**: `PrismaPg` (not `PgAdapter`) with `{ connectionString }` — already in use in `apps/api`.

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
```

The current `apps/api/src/database/prisma.service.ts` already uses this correct API. No change needed there.

**Alternatives considered**: Passing a `pg.Pool` instance (old API, removed in v7).

## NestJS PrismaService Pattern vs Singleton

**Decision**: Export a pre-instantiated singleton `prisma` from `packages/db` (with adapter configured). `PrismaService` in `apps/api` becomes a lifecycle manager (connect/disconnect) and DI token, not a second `PrismaClient` instance.

**Source**: Official Prisma Turborepo guide (https://www.prisma.io/docs/guides/deployment/turborepo, section 2.4) confirms the singleton-in-shared-package pattern.

The `extends PrismaClient` pattern in `apps/api` is superseded: creating a second client instance would open a competing connection pool. The singleton in `packages/db` holds the single configured connection.

**What `packages/db` exports**:

- `prisma` — configured singleton (`PrismaPg` adapter wired in)
- `PrismaClient` — the class (re-exported, for typing and `@nestjs/testing` override scenarios)
- All model types, input types, enums, `Prisma` namespace

**`PrismaService` in `apps/api`** wraps the singleton with `OnModuleInit`/`OnModuleDestroy` lifecycle hooks. No adapter configuration in the API layer.

**Why `@prisma/adapter-pg` and `pg` belong in `packages/db`**: The adapter is instantiated once at singleton creation. Moving it to `apps/api` would mean the API owns the connection configuration, defeating the purpose of the shared package. Consumers that don't use PostgreSQL would supply their own singleton package.

## Turbo Pipeline

**Decision**: Add `db:generate` as a `dependsOn` for `build` in `packages/db`, and list `src/generated/**` as outputs.

```json
"build": {
  "dependsOn": ["^build", "db:generate"],
  "outputs": ["dist/**", "src/generated/**"]
}
```

This ensures Prisma generation always runs before any dependent package compiles.

**Alternatives considered**: Running `prisma generate` as part of `build` script directly — rejected because Turbo caches `build` but not `db:generate` (marked `cache: false`), and we want generation to be a separate cacheable unit.

## `ensure-prisma-client.mjs` Script

**Decision**: Delete entirely from `apps/api`. Do not replicate in `packages/db`.

The official Prisma Turborepo guide does not use this script. Turbo's `dependsOn: ["^db:generate"]` on `build` and `dev` tasks guarantees generation runs before any consumer task. Turbo uses content hashing on task inputs — more reliable than mtime comparison.

**Why the script existed**: Workaround for the lack of Turbo pipeline ordering. With `packages/db` as a proper workspace package and Turbo wiring, the problem it solved no longer exists.

## TypeScript Configuration

**Decision**: `packages/db` tsconfig extends `@repo/typescript-config/base.json`; no `build` compile step needed (exports `.ts` source directly, same as `@repo/types`).

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "module": "preserve",
    "target": "ES2022",
    "lib": ["ES2022"]
  },
  "include": ["src", "prisma.config.ts"],
  "exclude": ["src/generated"]
}
```

`src/generated` is excluded from strict type-checking (it's `@ts-nocheck` anyway) but is still importable via `exports` field.

## Migration Ownership

**Decision**: `packages/db` owns migrations (`prisma/migrations/`). All `db:*` commands (`db:migrate`, `db:migrate:deploy`, `db:studio`, `db:seed`) run from `packages/db`. `apps/api` retains no Prisma CLI dependency.

**Rationale**: Schema + migrations must stay co-located. The API app has no reason to own the schema independently.
