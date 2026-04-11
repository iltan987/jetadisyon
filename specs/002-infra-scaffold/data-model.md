# Data Model: Infrastructure Scaffolding

**Branch**: `002-infra-scaffold` | **Date**: 2026-04-10
**Note**: This feature adds no business entities. The "data model" here covers the shared structural contracts and configuration schemas established by this scaffolding work.

---

## 1. API Response Envelope

Every response from `apps/api` MUST conform to this envelope (constitution §VI).

```
ApiResponse<T>
├── code: ResponseCode        (required) machine-readable enum value
├── message: string           (required) English developer description; never shown to users
└── data?: T                  (optional) payload, present on success responses
```

**Rules**:

- `code` is always present, even on errors
- `message` is for logging only; frontends must never display it
- `data` is omitted on error responses
- Pagination, if needed, lives inside `data` (not at envelope level)

---

## 2. ResponseCode Enum

Defined in `packages/types/src/response-codes.ts`. String enum so values are self-documenting in logs.

Initial codes at scaffold time (business codes added per feature):

```
ResponseCode
├── SUCCESS                   generic success
├── CREATED                   resource created
├── VALIDATION_ERROR          input failed schema validation
├── NOT_FOUND                 resource does not exist
├── UNAUTHORIZED              authentication required
├── FORBIDDEN                 authenticated but lacks permission
├── CONFLICT                  state conflict (e.g., duplicate)
├── INTERNAL_ERROR            unhandled server error
└── FEATURE_NOT_IMPLEMENTED   placeholder for in-progress endpoints
```

**Extension rule** (constitution §VI): Adding any new code requires simultaneously:

1. Adding the enum entry to `packages/types`
2. Adding `api.<CODE>` translation key to every locale file in `packages/i18n`

---

## 3. Translation Catalog Structure

Defined by the JSON files in `packages/i18n/src/locales/`. TypeScript types are derived from `tr.json` via module augmentation — adding a key without a translation is a compile error.

```
TranslationCatalog (tr.json structure)
├── api
│   ├── SUCCESS
│   ├── CREATED
│   ├── VALIDATION_ERROR
│   ├── NOT_FOUND
│   ├── UNAUTHORIZED
│   ├── FORBIDDEN
│   ├── CONFLICT
│   ├── INTERNAL_ERROR
│   └── FEATURE_NOT_IMPLEMENTED
├── common
│   ├── save
│   ├── cancel
│   ├── confirm
│   ├── error
│   └── loading
└── error
    ├── required_field
    └── invalid_format
```

**Key naming rules**:

- `api.*` namespace: one key per `ResponseCode` value, casing matches enum value
- `common.*` namespace: shared UI strings (buttons, labels)
- `error.*` namespace: validation and form error messages
- Feature-specific namespaces added per feature (e.g., `order.*`, `printer.*`)
- Snake_case within namespace; dot-separated levels

---

## 4. Environment Variable Schemas

Each app declares its required and optional configuration. Validated at startup via zod.

### `apps/api` environment schema

```
ApiEnv
├── DATABASE_URL: string (url)      PostgreSQL connection string
├── PORT: number (default: 3000)    HTTP listener port
└── NODE_ENV: enum[development, production, test] (default: development)
```

### `apps/admin` environment schema

```
AdminEnv
├── VITE_API_URL: string (url)      Base URL of apps/api
└── VITE_APP_ENV: enum[development, production] (default: development)
```

### `apps/desktop` environment schema

```
DesktopEnv
└── VITE_API_URL: string (url)      Base URL of apps/api
```

**Notes**:

- Vite apps access env via `import.meta.env`; only `VITE_*` prefixed vars are exposed to browser bundles
- API accesses env via `process.env`
- All schemas validated at process start; missing required vars cause immediate exit with named error
- `DATABASE_URL` is the only env var that is secret/sensitive; all others can be committed in `.env.example`

---

## 5. Prisma Schema Skeleton

`apps/api/prisma/schema.prisma` — skeleton only, no business tables at this stage.

**Prisma v7.x pattern** (official NestJS recipe): generator output goes to `./generated/prisma/`, and a PostgreSQL driver adapter is used in `PrismaService`.

```
datasource db
└── provider: "postgresql"
    url: env("DATABASE_URL")

generator client
└── provider: "prisma-client-js"
    output: "../generated/prisma"   ← v7.x: NOT node_modules/@prisma/client
```

`PrismaService` shape (from official recipe):

```
PrismaService extends PrismaClient
└── constructor()
    └── new PrismaPg({ connectionString: process.env.DATABASE_URL })
    └── super({ adapter })
```

No models are defined here. Models are added in subsequent feature specs (e.g., order management, restaurant profile). The migration baseline created by this feature is an empty migration that establishes the migration history.

**CLI workflow** (all schema operations go through CLI):

- `prisma init` → creates schema.prisma and .env
- `prisma migrate dev` → apply migrations locally
- `prisma migrate deploy` → apply in production
- `prisma generate` → regenerate client after schema changes
- `prisma studio` → open data browser

---

## 6. Package Dependency Graph (updated)

```
packages/typescript-config   packages/eslint-config
         ↑                           ↑
packages/types ─────────────────────┤
packages/i18n  ─────────────────────┤
packages/ui    ─────────────────────┤
         ↑                          ↑
    apps/admin              apps/desktop
    apps/api ←── packages/types (response codes)
```

- `packages/types`: zero runtime dependencies; consumed by API and all frontends
- `packages/i18n`: depends on `i18next`, `react-i18next`; consumed by frontend apps only
- `packages/ui`: already depends on `zod` — no change
- All new packages extend `packages/typescript-config/base.json` or `react-library.json`
