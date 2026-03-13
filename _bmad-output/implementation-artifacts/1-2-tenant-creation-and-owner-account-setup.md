# Story 1.2: Tenant Creation & Owner Account Setup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Admin**,
I want to **create a new restaurant tenant with business details and generate initial credentials**,
so that **restaurant owners have accounts ready to use**.

## Acceptance Criteria

1. **Tenant Creation Form Display:** Given the admin is logged in to the admin panel, when the admin navigates to the tenant creation form, then a form is displayed with fields for business name, owner full name, owner email, and contact phone (optional).

2. **Tenant Creation with Owner Account Setup:** Given valid tenant details are submitted, when the admin creates a new tenant, then:
   - A row is inserted into the `tenants` table with business name and optional contact phone
   - A Supabase Auth user is created for the tenant owner with a temporary password and `must_change_password: true` in `user_metadata`
   - A `profiles` entry is created with the owner's `full_name` and `role: tenant_owner`
   - A `tenant_memberships` entry is created linking the owner to the tenant
   - The JWT custom claims (via `custom_access_token_hook`) will include `tenant_id` and `user_role: tenant_owner` on the owner's next login
   - RLS policies on the `tenants` table restrict access: admin (full) and members (own tenants read-only via `tenant_memberships`)

3. **Credential Display & Audit Logging:** Given the tenant is created, when the admin views the creation confirmation, then:
   - The initial credentials (email + temporary password) are displayed for the admin to share with the owner
   - The admin action (tenant creation) is logged in `audit_logs` with timestamp, actor identity, action type, entity info, and correlation ID

4. **RLS Data Isolation Enforcement:** Given any database query on the `tenants` table, when executed by a non-admin user, then RLS policies enforce that only the user's own tenant(s) data is returned (NFR8).

## Tasks / Subtasks

### Backend

- [x] **Task 1: Schema Restructure — Replace `user_roles` with `profiles` + `tenant_memberships`** (AC: #2, #4)
  - [x] 1.1 Edit existing migration `supabase/migrations/20260308081743_create_core_auth_schema.sql` (one-time exception — no production data, will recreate Supabase instance)
  - [x] 1.2 Replace `user_roles` table with two new tables:

    **`profiles`** (1:1 with auth.users — structured user data):

    ```sql
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text NOT NULL,
      role public.app_role NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ```

    **`tenant_memberships`** (1:N — one user can belong to multiple tenants):

    ```sql
    CREATE TABLE public.tenant_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tenant_memberships_user_tenant_key UNIQUE (user_id, tenant_id)
    );
    ```

  - [x] 1.3 Add `contact_phone` column to `tenants` table (text, optional)
  - [x] 1.4 Add `updated_at` auto-update trigger for `tenants` and `profiles`
  - [x] 1.5 Update `custom_access_token_hook` to read from `profiles` + `tenant_memberships`:

    ```sql
    SELECT p.role INTO user_role
    FROM public.profiles p
    WHERE p.id = (event ->> 'user_id')::uuid;

    SELECT tm.tenant_id INTO user_tenant_id
    FROM public.tenant_memberships tm
    WHERE tm.user_id = (event ->> 'user_id')::uuid
    LIMIT 1;  -- picks first tenant for now; tenant switching is a future feature
    ```

  - [x] 1.6 Update RLS policies:
    - `profiles`: admin full access; authenticated users can SELECT own row
    - `tenant_memberships`: admin full access; authenticated users can SELECT own rows
    - `tenants`: admin full access (existing); **add** member SELECT policy:
      ```sql
      CREATE POLICY policy_tenants_select_member ON public.tenants
        FOR SELECT USING (
          id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = (select auth.uid()))
        );
      ```
    - `audit_logs`: no changes needed
  - [x] 1.7 Update grants: `supabase_auth_admin` needs SELECT on `profiles` and `tenant_memberships` (for the JWT hook)
  - [x] 1.8 Remove all `user_roles` references (table, indexes, policies, grants)
  - [x] 1.9 Update `supabase/seed.sql`:
    - Replace `INSERT INTO user_roles` with `INSERT INTO profiles` + `INSERT INTO tenant_memberships`
    - Add `contact_phone` to test tenant
    - Admin user: profiles entry with `role: admin`, no tenant_memberships entry
    - Tenant owner: profiles entry with `role: tenant_owner` + tenant_memberships entry
    - Tenant staff: profiles entry with `role: tenant_staff` + tenant_memberships entry
  - [x] 1.10 Regenerate database types: either `mcp__supabase__generate_typescript_types` MCP tool, or `npx supabase gen types typescript --local > packages/api/src/database.types.ts`
  - [x] 1.11 Update `packages/api/src/database.types.ts` — verify new tables appear, `user_roles` is gone

- [x] **Task 2: Update Existing NestJS Code for Schema Change** (AC: #2)
  - [x] 2.1 Update any code that references `user_roles` table name (grep for `user_roles` in `apps/api/src/`)
  - [x] 2.2 Update shared types in `packages/api/src/` if any reference `user_roles`

- [x] **Task 3: NestJS Tenants Module** (AC: #1, #2, #3)
  - [x] 3.1 Generate module via CLI: `nest generate module tenants`, `nest generate controller tenants`, `nest generate service tenants`
  - [x] 3.2 Create `create-tenant.dto.ts` with Zod v4 schema: `businessName`, `ownerFullName`, `ownerEmail`, `contactPhone` (optional)
  - [x] 3.3 Implement `TenantsService.createTenant()` — atomic operation:
    1. Generate secure temporary password (crypto.randomBytes)
    2. Insert tenant row into `tenants` table (name, contact_phone)
    3. Create Supabase Auth user via `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true } })`
    4. Insert `profiles` entry (id = new user id, full_name, role: tenant_owner)
    5. Insert `tenant_memberships` entry (user_id, tenant_id)
    6. Log action to `audit_logs` table
    7. Return tenant data + temporary credentials
    - On any step failure: handle cleanup (delete created resources to prevent orphans)
  - [x] 3.4 Implement `TenantsService.findAll()` — admin only, returns all tenants with owner info via SQL join: `tenants` → `tenant_memberships` → `profiles` (where role = tenant_owner)
  - [x] 3.5 Implement `TenantsService.findById()` — admin gets any tenant, member gets own tenant only
  - [x] 3.6 Implement `TenantsController` with routes:
    - `POST /tenants` — `@Roles('admin')`, creates tenant + owner (body validated with `ZodValidationPipe`)
    - `GET /tenants` — `@Roles('admin')`, lists all tenants
    - `GET /tenants/:tenantId` — `@Roles('admin', 'tenant_owner')`, gets single tenant (member scoped to own)
  - [x] 3.7 Register `TenantsModule` in `AppModule`

- [x] **Task 4: Unit Tests** (AC: #1, #2, #3)
  - [x] 4.1 `tenants.service.spec.ts` — test createTenant (happy path, duplicate email, DB error rollback), findAll, findById
  - [x] 4.2 `tenants.controller.spec.ts` — test route guards, validation, response format

### Frontend

- [x] **Task 5: Admin Tenants List Page** (AC: #1)
  - [x] 5.1 Create `apps/web/src/app/admin/tenants/page.tsx` — server component fetching tenant list
  - [x] 5.2 Display tenants in a table/list with columns: business name, owner name (from API join), status, license status, created date
  - [x] 5.3 Add "Restoran Ekle" (Add Restaurant) button linking to creation form
  - [x] 5.4 Handle empty state: "Henuz restoran eklenmemis. Ilk restorani ekleyin." with primary CTA

- [x] **Task 6: Admin Tenant Creation Form** (AC: #1, #2, #3)
  - [x] 6.1 Create `apps/web/src/app/admin/tenants/create/page.tsx` — client component with form
  - [x] 6.2 Form fields: business name, owner full name, owner email, contact phone (optional). No marketplace platform — that's configured separately per-connection in Epic 2 (Story 2.2)
  - [x] 6.3 Form validation with Zod v4 schema (shared with backend DTO)
  - [x] 6.4 Submit via `apiClient.post('/tenants', data)` using existing `api-client.ts`
  - [x] 6.5 Success state: display generated credentials (email + temporary password) in a prominent card with copy-to-clipboard
  - [x] 6.6 Error handling: display inline error messages for validation, toast for server errors

- [x] **Task 7: Admin Sidebar Navigation Update** (AC: #1)
  - [x] 7.1 Add "Restoranlar" (Restaurants) link to admin sidebar navigation
  - [x] 7.2 Ensure active state highlights correctly for `/admin/tenants` routes

### Shared Types

- [x] **Task 8: Shared Types** (AC: #1, #2)
  - [x] 8.1 Create `packages/api/src/tenant.types.ts` with `Tenant`, `CreateTenantRequest`, `CreateTenantResponse` interfaces
  - [x] 8.2 Create `packages/api/src/profile.types.ts` with `Profile`, `TenantMembership` interfaces
  - [x] 8.3 Export from `packages/api/src/entry.ts`

## Dev Notes

### Critical Architecture Patterns

#### Schema Design: `profiles` + `tenant_memberships` (replaces `user_roles`)

**Why this change:** The old `user_roles` table mixed user profile data, role assignment, and tenant association in one row. The new design properly normalizes:

- **`profiles`** (1:1 with `auth.users`): Structured user data — `full_name`, `role`. Single source of truth for "who is this user and what can they do". Replaces unstructured `user_metadata` JSONB on auth.users.
- **`tenant_memberships`** (1:N): Which tenants a user belongs to. Supports a user managing multiple tenants (e.g., restaurant chain owner with 3 branches).

**Multi-tenant support:** The schema supports one user belonging to multiple tenants from day one. The JWT hook currently picks `LIMIT 1` for the active tenant_id. Tenant switching UI is a future feature — no schema change needed when we add it.

**RLS on tenants table:** Uses `tenant_memberships` subquery (not JWT `tenant_id`) so owners can see ALL their tenants, not just the active one:

```sql
CREATE POLICY policy_tenants_select_member ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = (select auth.uid()))
  );
```

#### Editing Existing Migration (One-Time Exception)

The migration `20260308081743_create_core_auth_schema.sql` is being edited in-place to replace `user_roles` with `profiles` + `tenant_memberships`. This is a one-time exception approved because there is no production data. After this, Supabase instance must be recreated (`supabase db reset`). **Never edit existing migrations again after this** — always create new ones.

#### Supabase Auth Admin API for User Creation

The backend uses the **service role key** (already configured in `SupabaseService`). Use `auth.admin.createUser()` for server-side user creation:

```typescript
const { data, error } = await supabaseClient.auth.admin.createUser({
  email: ownerEmail,
  password: tempPassword,
  email_confirm: true, // Skip email confirmation for admin-created users
  user_metadata: {
    must_change_password: true, // Story 1.3 enforces this on first login
  },
});
```

**Note:** `full_name` is stored in the `profiles` table (structured), NOT in `user_metadata` (unstructured JSONB). Only `must_change_password` goes in `user_metadata` because it's a transient auth lifecycle flag — it exists briefly between account creation and first password change, then is **deleted entirely** (set to `null` which removes the key) in Story 1.3. It is NOT profile data.

**Important:** The `SupabaseService.getClient()` already uses the service role key, so `auth.admin.*` methods are available directly. No separate admin client needed.

#### Atomic Tenant + Owner Creation

The `createTenant` method must be atomic. If any step fails, previous steps must be cleaned up:

1. Insert tenant row → if fails, throw
2. Create auth user → if fails, delete tenant row
3. Insert profiles entry → if fails, delete auth user + tenant row
4. Insert tenant_memberships entry → if fails, delete profile + auth user + tenant row
5. Insert audit_log → if fails, log error but don't rollback (audit is best-effort)

Consider wrapping steps 1-4 in a try/catch with explicit cleanup.

#### JWT Custom Claims — Updated Hook

The `custom_access_token_hook` is updated to read from `profiles` (for role) and `tenant_memberships` (for tenant_id). The hook still uses `LIMIT 1` on tenant_memberships — this picks the first tenant for multi-tenant users. Tenant switching (selecting active tenant) is a future feature.

**IMPORTANT — Preserve existing hook security patterns:**

- Keep `STABLE` keyword (optimizer hint, indicates read-only function)
- Keep `SET search_path = ''` (prevents search_path injection — more secure than the official Supabase example which omits this)
- Keep the `COALESCE(...) || jsonb_build_object(...)` merge pattern (preserves existing `app_metadata` keys like `provider`)
- Keep the explicit RLS policy for `supabase_auth_admin` on both `profiles` and `tenant_memberships` tables (needed because `supabase_auth_admin` is not the table owner, so RLS applies even with `GRANT ALL`)
- Do NOT simplify to match the official Supabase docs example — our version is more secure

**Note:** Claims are populated at token generation time. The owner will get correct claims on their first login (Story 1.3).

#### Marketplace Platform — NOT in Scope

NOT stored on the `tenants` table. A tenant can connect to multiple platforms (Trendyol Go, Yemeksepeti, future platforms). Marketplace connections are a separate `marketplace_connections` table implemented in Epic 2, Story 2.2. The tenant creation form does NOT include marketplace selection.

#### Temporary Password Generation

Use Node.js `crypto` module for secure random password:

```typescript
import { randomBytes } from 'crypto';
const tempPassword = randomBytes(12).toString('base64url'); // ~16 chars, URL-safe
```

Do NOT log the temporary password. It should only appear in the API response to the admin.

#### Audit Logging Pattern

Insert into `audit_logs` table directly via Supabase client:

```typescript
await supabaseClient.from('audit_logs').insert({
  actor_id: adminUserId,
  action: 'CREATE_TENANT',
  entity_type: 'TENANT',
  entity_id: tenantId,
  metadata: { owner_email: ownerEmail, business_name: businessName },
});
```

#### API Response Format

Follow the established envelope pattern:

```typescript
// Success (201 Created)
{ data: { tenant: { id, businessName, ... }, credentials: { email, temporaryPassword } } }

// Error (400/409/500)
{ error: { code: 'TENANT.DUPLICATE_EMAIL', message: '...' } }
```

Error codes for this story:

- `TENANT.DUPLICATE_EMAIL` — owner email already exists in auth.users
- `TENANT.CREATION_FAILED` — generic creation failure
- `TENANT.NOT_FOUND` — tenant ID doesn't exist

#### Future Improvement: Env-Based Throttle Toggle

Currently `@nestjs/throttler` is always active. A `THROTTLE_ENABLED=false` env flag for development would prevent hitting rate limits during testing (especially the 5-per-15-min login limit). Out of scope for this story — track as a separate improvement.

#### Naming Convention: snake_case DB ↔ camelCase API

Transform at the service boundary:

- DB columns: `full_name`, `contact_phone`, `tenant_id`, `user_id`, `license_status`, `created_at`, `updated_at`
- API/TS: `fullName`, `contactPhone`, `tenantId`, `userId`, `licenseStatus`, `createdAt`, `updatedAt`

#### Finding Owner for a Tenant (SQL Join)

To get tenant with owner name in `findAll()`:

```sql
SELECT t.*, p.full_name as owner_name, p.id as owner_id
FROM tenants t
LEFT JOIN tenant_memberships tm ON tm.tenant_id = t.id
LEFT JOIN profiles p ON p.id = tm.user_id AND p.role = 'tenant_owner'
```

This is a clean SQL join — no N+1 `auth.admin.getUserById()` calls needed.

### Project Structure Notes

#### Backend Files to Create

```
apps/api/src/tenants/
├── tenants.module.ts           # Generated via nest generate
├── tenants.controller.ts       # Generated, then implement routes
├── tenants.service.ts          # Generated, then implement logic
├── tenants.service.spec.ts     # Co-located unit tests
├── tenants.controller.spec.ts  # Co-located unit tests
└── dto/
    └── create-tenant.dto.ts    # Zod schema + inferred type
```

#### Frontend Files to Create

```
apps/web/src/app/admin/tenants/
├── page.tsx                    # Tenant list page (server component)
└── create/
    └── page.tsx                # Tenant creation form (client component)
```

#### Shared Types Files

```
packages/api/src/tenant.types.ts   # Tenant, CreateTenantRequest, CreateTenantResponse
packages/api/src/profile.types.ts  # Profile, TenantMembership
```

#### Files to Modify

- `supabase/migrations/20260308081743_create_core_auth_schema.sql` — replace `user_roles` with `profiles` + `tenant_memberships`, update hook + RLS + grants
- `supabase/seed.sql` — rewrite to use `profiles` + `tenant_memberships`, add `contact_phone`
- `packages/api/src/database.types.ts` — regenerated after migration
- `apps/api/src/app.module.ts` — import TenantsModule
- `apps/web/src/app/admin/_components/admin-sidebar.tsx` — add Restoranlar nav item
- `packages/api/src/entry.ts` — export new types
- Any existing code referencing `user_roles` table name (grep and update)

#### Alignment with Existing Patterns

- Use `nest generate` CLI for module scaffolding (no manual file creation)
- No barrel exports — direct imports only
- Zod v4 for validation (not class-validator)
- Co-located `.spec.ts` test files
- Service uses `SupabaseService.getClient()` for DB operations
- Guards: `SupabaseAuthGuard` (global) + `RolesGuard` with `@Roles()` decorator
- Frontend uses `apiClient` from `lib/api-client.ts` for authenticated requests

### Previous Story Intelligence (Story 1.1)

**Key Learnings to Apply:**

1. **Security:** Always use `supabase.auth.getUser()` (not `getSession()`) for server-side auth validation
2. **Logging:** Use `PinoLogger` (not NestJS `Logger`) in all services for correlation ID support
3. **Duplicate logging:** `autoLogging: false` is already set in pino-http config — don't re-enable
4. **Error handling:** `apiClient` in frontend has try/catch for non-JSON error responses — handle accordingly
5. **Cookie handling:** `proxy.ts` uses `includes('-auth-token')` to handle chunked Supabase cookies
6. **Guards are global:** `SupabaseAuthGuard` and `RolesGuard` are registered globally in `app.module.ts` — no need to add `@UseGuards()` on every controller
7. **Rate limiting:** `@SkipThrottle()` on non-auth endpoints if needed, but default throttle config should be fine

**Established Patterns to Follow:**

- Error code format: `DOMAIN.ACTION_ERROR` (e.g., `TENANT.DUPLICATE_EMAIL`)
- Response envelope: `{ data: T }` or `{ error: { code, message, details? } }`
- DTO pattern: Zod schema first, then `z.infer<typeof schema>` for type
- Test pattern: Mock `SupabaseService`, test service methods independently

### Git Intelligence

**Recent Commits (context):**

```
521a752 Refactor authentication flow and update seed data for development users
09fbe27 Update VSCode settings for improved formatting and linting
bc4e485 Add README.md
13980f1 Update project description
eb6db07 Fix Supabase migration, seed, and admin auth flow
326fdf7 Fix Story 1.1 code review findings: security, logging, and reproducibility
8c3d75e Implement Story 1.1: Project infrastructure and admin login
```

The auth flow was recently refactored (521a752), and code review fixes were applied (326fdf7). The patterns are now stable and should be followed consistently.

### Web Research: Supabase Admin API Notes

**`auth.admin.createUser()` API:**

```typescript
const { data, error } = await supabase.auth.admin.createUser({
  email: string,
  password: string,
  email_confirm?: boolean,      // true = skip email confirmation
  user_metadata?: object,       // Custom user data (e.g., must_change_password)
  app_metadata?: object,        // System metadata (populated by hook instead)
  ban_duration?: string,
});
```

**Key Notes:**

- `email_confirm: true` is REQUIRED for admin-created users (no email verification flow)
- `user_metadata` is mutable by the user, `app_metadata` is system-only
- Only `must_change_password` goes in `user_metadata` — `full_name` goes in `profiles` table
- Do NOT set `app_metadata.user_role` or `app_metadata.tenant_id` manually — the `custom_access_token_hook` handles this from `profiles` + `tenant_memberships`

**`auth.admin.deleteUser()` for cleanup:**

```typescript
const { error } = await supabase.auth.admin.deleteUser(userId);
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Multi-Tenant Isolation, Authentication, RBAC sections]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1, FR2, FR5, FR6, FR48, FR49, FR51, NFR6, NFR8, NFR11, NFR12]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 5 (Admin Operations), Tenant Creation Form, Empty States]
- [Source: _bmad-output/implementation-artifacts/1-1-project-infrastructure-and-admin-login.md — Dev Notes, Code Review Findings]
- [Source: supabase/migrations/20260308081743_create_core_auth_schema.sql — tenants table, user_roles (to be replaced), audit_logs, custom_access_token_hook, RLS policies]
- [Source: apps/api/src/auth/auth.service.ts — Supabase admin API usage pattern]
- [Source: apps/api/src/supabase/supabase.service.ts — Service role client configuration]
- [Source: packages/api/src/database.types.ts — Current generated types (will be regenerated)]
- [Source: supabase/seed.sql — Test data patterns for auth users and tenants]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Replaced `user_roles` table with `profiles` + `tenant_memberships` (normalized schema)
- Added `contact_phone` to tenants table, `updated_at` auto-update triggers
- Updated `custom_access_token_hook` to read from `profiles` + `tenant_memberships`
- Added comprehensive RLS policies for new tables (admin, member, auth_admin)
- Updated seed data with profiles + tenant_memberships for all 3 test users
- Regenerated TypeScript database types via Supabase CLI
- Implemented NestJS TenantsModule with createTenant (atomic with cleanup), findAll (with owner join), findById
- Created shared types: tenant.types.ts, profile.types.ts
- Created frontend: tenant list page with table, empty state, loading skeleton
- Created frontend: tenant creation form with Zod validation, credential display with copy-to-clipboard
- Added shadcn table, badge, sonner components
- Added Sonner Toaster to root layout
- Fixed pre-existing lint issue in app/page.tsx (enabled redirect)
- Switched from self-hosted Supabase to CLI-based local dev (config.toml, updated .env docs)
- Removed unused SUPABASE_JWT_SECRET from env validation
- All 42 tests pass (11 new), 0 lint errors, builds clean

**Post-review fixes:**

- Fixed SupabaseAuthGuard: decode validated JWT payload to get `custom_access_token_hook`-injected `app_metadata` (user_role/tenant_id) — `getUser()` returns raw DB data without hook claims
- Fixed proxy.ts: rewrote with app-specific routing rules (admin requires auth+admin role, `/login` only unauthenticated, all other routes require auth)
- Established two-layer auth: proxy as fast first-pass guard (`getClaims`), server components as authoritative (`getUser`)
- Fixed Turkish character encoding across tenant admin pages (ş, İ, ç, ö, ü, ğ)
- Refactored create tenant form: replaced manual FormData + deprecated `FormEvent` with react-hook-form + zodResolver + shadcn Field components

### Change Log

- 2026-03-09: Implemented Story 1.2 — Tenant Creation & Owner Account Setup
- 2026-03-09: Migrated from self-hosted Supabase to CLI-based local dev
- 2026-03-09: Post-review fixes — auth guard JWT decode, proxy routing, Turkish chars, react-hook-form refactor

### File List

New files:

- supabase/config.toml
- apps/api/src/tenants/tenants.module.ts
- apps/api/src/tenants/tenants.controller.ts
- apps/api/src/tenants/tenants.service.ts
- apps/api/src/tenants/tenants.controller.spec.ts
- apps/api/src/tenants/tenants.service.spec.ts
- apps/api/src/tenants/dto/create-tenant.dto.ts
- apps/web/src/app/admin/tenants/page.tsx
- apps/web/src/app/admin/tenants/create/page.tsx
- packages/api/src/tenant.types.ts
- packages/api/src/profile.types.ts
- packages/ui/src/components/ui/table.tsx
- packages/ui/src/components/ui/sonner.tsx
- packages/ui/src/components/ui/badge.tsx

Modified files:

- supabase/migrations/20260308081743_create_core_auth_schema.sql
- supabase/seed.sql
- packages/api/src/database.types.ts
- packages/api/src/entry.ts
- apps/api/src/app.module.ts (auto by nest generate)
- apps/api/src/config/env.validation.ts
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/lib/supabase/proxy.ts
- apps/web/src/app/(auth)/layout.tsx
- apps/web/src/app/admin/layout.tsx
- apps/api/src/common/guards/supabase-auth.guard.ts
- apps/api/src/common/guards/supabase-auth.guard.spec.ts
- apps/api/src/tenants/tenants.service.spec.ts
- .claude/CLAUDE.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
