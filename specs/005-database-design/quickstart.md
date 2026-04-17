# Quickstart: Database Design Implementation

**Feature**: Database Design (`005-database-design`)
**Date**: 2026-04-17
**Prerequisites**: Docker Compose running (`pnpm docker:up` or equivalent), `@repo/db` package functional

---

## Setup Steps

### 1. Add `@repo/utils` package

```bash
# Create package directory (holidays logic lives in a subdirectory)
mkdir -p packages/utils/src/holidays

# Create package.json
cat > packages/utils/package.json << 'EOF'
{
  "name": "@repo/utils",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsc",
    "check-types": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@tabby_ai/hijri-converter": "latest"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "typescript": "catalog:"
  }
}
EOF

# Install the Hijri calendar library
pnpm --filter @repo/utils add @tabby_ai/hijri-converter

# Link to API and admin apps
pnpm --filter @repo/api add @repo/utils@workspace:*
pnpm --filter @repo/admin add @repo/utils@workspace:*
```

### 2. Extend the Prisma schema

Add all server-side entities to `packages/db/prisma/schema.prisma`. See `data-model.md` for the complete field list.

```bash
# After editing schema.prisma, generate the migration
pnpm --filter @repo/db db:migrate -- --name init_database_design

# Regenerate Prisma client
pnpm --filter @repo/db db:generate

# Verify build
pnpm --filter @repo/db build
```

### 3. Seed delivery platforms

```bash
# Run seed script (to be created at packages/db/prisma/seed.ts)
pnpm --filter @repo/db db:seed
```

Seed must insert the four `DeliveryPlatform` rows:

| name         | slug         |
| ------------ | ------------ |
| Yemeksepeti  | yemeksepeti  |
| Trendyol Go  | trendyol-go  |
| Getir        | getir        |
| Migros Yemek | migros-yemek |

### 4. Configure local SQLite for Tauri desktop

Use the official Tauri CLI to add the plugin. This single command adds the Rust crate to `Cargo.toml`, installs the JS package, and wires up the Tauri 2.x permissions/capabilities automatically:

```bash
# From apps/desktop — the Tauri CLI handles Cargo + JS + permissions in one step
cd apps/desktop
pnpm tauri add sql
```

Migrations are defined as Rust `Migration` structs in `src-tauri/src/lib.rs`. Keep SQL in **separate files** and embed them at compile time with `include_str!()` — this keeps migration SQL readable and version-controllable without runtime file I/O.

Create `apps/desktop/src-tauri/migrations/001_create_local_tables.sql`:

```sql
CREATE TABLE IF NOT EXISTS manual_review_queue (
    id TEXT PRIMARY KEY,
    platform_order_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total_value REAL NOT NULL,
    received_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_order_sync (
    id TEXT PRIMARY KEY,
    order_payload TEXT NOT NULL,
    outcome_status TEXT NOT NULL,
    queued_at INTEGER NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_attempted_at INTEGER
);

CREATE TABLE IF NOT EXISTS local_config (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
);
```

Reference the file from `src-tauri/src/lib.rs` using `include_str!()`, which reads it at **compile time**:

```rust
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_local_tables",
            sql: include_str!("../migrations/001_create_local_tables.sql"),
            kind: MigrationKind::Up,
        },
        // Add further migrations here as new versions (version: 2, 3, …)
        // Each migration file lives at src-tauri/migrations/00N_description.sql
    ];

    tauri::Builder::default()
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:app.db", migrations)
                .build(),
        )
        // ...
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

From the TypeScript/React side, connect and query using parameterized statements (SQLite uses `$1, $2, ...` placeholders):

```typescript
import Database from "@tauri-apps/plugin-sql";

const db = await Database.load("sqlite:app.db");

// Insert into manual_review_queue
await db.execute(
  "INSERT INTO manual_review_queue (id, platform_order_id, platform_id, items_json, total_value, received_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
  [
    id,
    platformOrderId,
    platformId,
    JSON.stringify(items),
    totalValue,
    receivedAt,
    expiresAt,
  ],
);

// Query pending items
const pending = await db.select<ManualReviewQueueRow[]>(
  "SELECT * FROM manual_review_queue ORDER BY received_at ASC",
);
```

### 5. Add new NestJS modules to `apps/api`

```bash
# From apps/api, scaffold modules (use NestJS CLI)
cd apps/api
npx nest generate module restaurants
npx nest generate module orders
npx nest generate module summaries
npx nest generate module holidays
npx nest generate module credentials
npx nest generate module config-sync
```

Each module follows the existing `apps/api/src/` pattern: `module.ts`, `controller.ts`, `service.ts`.

### 6. Verify the full stack builds

```bash
# From repo root
pnpm build
pnpm lint
pnpm check-types
```

All must pass before committing any phase.

---

## Key Conventions

- **Turkey time**: All "today" / "current session" calculations convert `Date.now()` to UTC+3 before comparing with working hours. Use a utility: `toTurkeyTime(date: Date): Date` in `@repo/utils` or `@repo/types`.
- **Monetary serialization**: Always serialize `Decimal` as `string` in JSON (`decimal.toString()`), never as `number`.
- **Response codes**: All NestJS endpoints return `{ code: ResponseCode; data?: unknown; message: string }`. `ResponseCode` is a TypeScript enum exported from `@repo/types`.
- **Audit log writes**: `OrderAuditLog` entries are created within the same database transaction as the `Order` update. Never write audit logs as a separate fire-and-forget operation.
- **@repo/utils purity**: Functions in this package must not call `Date.now()`, make network calls, or access any database. All required data is passed as arguments.
