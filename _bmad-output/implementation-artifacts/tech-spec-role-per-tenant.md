---
title: 'Role-Per-Tenant Architecture Refactor'
slug: 'role-per-tenant'
created: '2026-03-16'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Supabase (PL/pgSQL)', 'NestJS 11', 'Next.js 16', 'TypeScript']
files_to_modify:
  - 'supabase/migrations/20260308081743_create_core_auth_schema.sql'
  - 'supabase/migrations/20260315120000_add_must_change_password_to_access_token_hook.sql'
  - 'supabase/migrations/20260316120000_add_invitation_pending_to_access_token_hook.sql'
  - 'supabase/seed.sql'
  - 'packages/api/src/roles.types.ts'
  - 'packages/api/src/entry.ts'
  - 'packages/api/src/profile.types.ts'
  - 'packages/api/src/auth.types.ts'
  - 'packages/api/src/database.types.ts'
  - 'apps/api/src/tenants/tenants.service.ts'
  - 'apps/api/src/common/guards/tenant.guard.ts'
  - 'apps/api/src/common/decorators/roles.decorator.ts'
  - 'apps/api/src/auth/auth.controller.ts'
  - 'apps/api/src/tenants/tenants.controller.ts'
  - 'apps/api/src/auth/auth.service.ts'
  - 'apps/web/src/providers/auth-provider.tsx'
  - 'apps/web/src/lib/supabase/proxy.ts'
  - 'apps/web/src/app/page.tsx'
  - 'apps/web/src/app/admin/layout.tsx'
  - 'apps/web/src/app/(tenant)/layout.tsx'
  - 'apps/web/src/app/(tenant)/_components/tenant-nav.tsx'
  - 'apps/api/src/common/guards/roles.guard.spec.ts'
  - 'apps/api/src/common/guards/tenant.guard.spec.ts'
  - 'apps/api/src/common/guards/supabase-auth.guard.spec.ts'
  - 'apps/api/src/auth/auth.service.spec.ts'
  - 'apps/api/src/tenants/tenants.service.spec.ts'
  - 'apps/api/src/tenants/tenants.controller.spec.ts'
  - 'apps/api/test/tenant-isolation.e2e-spec.ts'
code_patterns:
  - 'JWT claim: app_metadata.user_role (string) — injected by custom_access_token_hook'
  - 'Guards read from JWT, not from DB — RolesGuard and TenantGuard'
  - '@Roles() decorator with string role values on controller methods'
  - 'Supabase PostgREST joins: tenants → tenant_memberships → profiles'
  - 'RLS policies check JWT user_role = admin only (no tenant_owner/tenant_staff checks in RLS)'
test_patterns:
  - 'Unit tests: Jest with manual mocking of request objects containing app_metadata'
  - 'E2E tests: tenant-isolation.e2e-spec.ts with mock JWT metadata'
  - 'Service tests: mock Supabase client with chained query builders'
---

# Tech-Spec: Role-Per-Tenant Architecture Refactor

**Created:** 2026-03-16

## Overview

### Problem Statement

Tenant-scoped roles (`tenant_owner`, `tenant_staff`) live on `profiles` (one global value per user), not on `tenant_memberships`. This makes it impossible for the same user to have different roles across tenants (e.g., owner in Tenant A, staff in Tenant B). This blocks story 1-5 (staff account management), which requires creating staff members within a specific tenant context.

### Solution

Split the role system into two separate enums: a **system-level** `system_role` enum (`admin`, `user`) on `profiles`, and a **tenant-scoped** `tenant_role` enum (`owner`, `staff`, `employee`) on `tenant_memberships`. Edit existing migrations in-place (DB reset + reseed), update the custom access token hook to read tenant role from memberships, and update all application code accordingly.

### Scope

**In Scope:**

- New `system_role` enum (`admin`, `user`) replacing `app_role` on `profiles.role`
- New `tenant_role` enum (`owner`, `staff`, `employee`) on `tenant_memberships.role`
- Edit existing migrations in-place (no new migration file — DB reset + reseed)
- Update custom access token hook to read role from `tenant_memberships`
- Update `tenants.service.ts` to write/read role from memberships
- Update seed data
- Regenerate database types via `npx supabase gen types typescript --local`
- Split `packages/api/src/roles.types.ts` into `SystemRole` + `TenantRole`
- Update all application code referencing role string values
- Update all test files with new role values

**Out of Scope:**

- Tenant switching UI/logic (keep `LIMIT 1` behavior)
- New staff management endpoints (story 1-5)
- RLS policy changes (JWT claim name `user_role` and admin value stay the same)

## Context for Development

### Codebase Patterns

- **JWT role injection:** `custom_access_token_hook` (PL/pgSQL) reads role from DB and injects into `app_metadata.user_role` claim. All backend guards and frontend checks read from this claim — never directly from DB.
- **Guard chain:** `SupabaseAuthGuard → RolesGuard → TenantGuard` (global, ordered). Guards read `request.user.app_metadata.user_role`.
- **RLS policies:** Only check `user_role = 'admin'` — they do NOT check `tenant_owner` or `tenant_staff`. So RLS policies need NO changes.
- **Supabase PostgREST joins:** `tenants.service.ts` uses nested selects like `tenant_memberships(profiles(id, full_name, role))` — these join paths change since role moves to memberships.
- **Frontend role checks:** `proxy.ts`, layouts, and page.tsx check `app_metadata.user_role` string values directly.

### Files to Reference

| File                                                                                   | Purpose                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `supabase/migrations/20260308081743_create_core_auth_schema.sql`                       | Core schema: enums, tables, RLS, access token hook     |
| `supabase/migrations/20260315120000_add_must_change_password_to_access_token_hook.sql` | Hook v2: adds must_change_password                     |
| `supabase/migrations/20260316120000_add_invitation_pending_to_access_token_hook.sql`   | Hook v3 (latest): adds invitation_pending              |
| `supabase/seed.sql`                                                                    | Dev seed data: admin, tenant_owner, tenant_staff users |
| `packages/api/src/roles.types.ts`                                                      | `AppRole` type + `APP_ROLES` constant                  |
| `packages/api/src/profile.types.ts`                                                    | `Profile` and `TenantMembership` interfaces            |
| `packages/api/src/auth.types.ts`                                                       | `AuthUser` and `TokenPayload` interfaces               |
| `packages/api/src/entry.ts`                                                            | Package exports                                        |
| `apps/api/src/tenants/tenants.service.ts`                                              | Tenant CRUD — writes role to profiles, reads via joins |
| `apps/api/src/tenants/tenants.controller.ts`                                           | `@Roles()` decorator usage                             |
| `apps/api/src/auth/auth.controller.ts`                                                 | `@Roles()` decorator usage                             |
| `apps/api/src/auth/auth.service.ts`                                                    | Maps `user_role` from app_metadata to response         |
| `apps/api/src/common/guards/roles.guard.ts`                                            | Checks `user_role` against `@Roles()` metadata         |
| `apps/api/src/common/guards/tenant.guard.ts`                                           | Checks `user_role === 'admin'` for admin bypass        |
| `apps/web/src/lib/supabase/proxy.ts`                                                   | Frontend request interception — role-based routing     |
| `apps/web/src/providers/auth-provider.tsx`                                             | Maps JWT `user_role` to AuthUser                       |
| `apps/web/src/app/page.tsx`                                                            | Root redirect by role                                  |
| `apps/web/src/app/admin/layout.tsx`                                                    | Admin layout guard                                     |
| `apps/web/src/app/(tenant)/layout.tsx`                                                 | Tenant layout — staff restrictions                     |
| `apps/web/src/app/(tenant)/_components/tenant-nav.tsx`                                 | Nav items with role restrictions                       |

### Technical Decisions

- **System role values:** `admin`, `user` — allows future expansion of system-level roles without NULL handling
- **Tenant role values:** `owner`, `staff`, `employee` — no `tenant_` prefix; context is clear from table/enum name
- **Migration approach:** Edit existing migration files in-place. No production data — DB reset + reseed after changes.
- **JWT claim `user_role` value mapping:** Admin users get `'admin'` (from `profiles.role`). Tenant users get `'owner'`/`'staff'`/`'employee'` (from `tenant_memberships.role`). The claim name stays `user_role`.
- **Hook logic:** For users with a tenant membership, read `tenant_memberships.role`. For users without (admin), read `profiles.role`. Both cases inject into `app_metadata.user_role`.
- **`@Roles()` decorator values change:** `'tenant_owner'` → `'owner'`, `'tenant_staff'` → `'staff'`. `'admin'` stays `'admin'`.
- **Type regeneration:** `npx supabase gen types typescript --local` (Supabase CLI preferred, MCP fallback)
- **Tenant switching:** Out of scope. Hook continues `LIMIT 1` for tenant selection.

## Implementation Plan

### Tasks

#### Phase 1: Database Schema (edit existing migrations in-place)

- [ ] Task 1: Replace `app_role` enum with `system_role` and `tenant_role` enums
  - File: `supabase/migrations/20260308081743_create_core_auth_schema.sql`
  - Action: Replace `CREATE TYPE public.app_role AS ENUM ('admin', 'tenant_owner', 'tenant_staff')` with two new enums:
    ```sql
    CREATE TYPE public.system_role AS ENUM ('admin', 'user');
    CREATE TYPE public.tenant_role AS ENUM ('owner', 'staff', 'employee');
    ```

- [ ] Task 2: Update `profiles` table to use `system_role`
  - File: `supabase/migrations/20260308081743_create_core_auth_schema.sql`
  - Action: Change `profiles.role` column type from `public.app_role` to `public.system_role`. Default value: `'user'`.
    ```sql
    role public.system_role NOT NULL DEFAULT 'user',
    ```

- [ ] Task 3: Add `role` column to `tenant_memberships`
  - File: `supabase/migrations/20260308081743_create_core_auth_schema.sql`
  - Action: Add `role public.tenant_role NOT NULL` column to `tenant_memberships` table (no default — role must be explicitly set on insert).
    ```sql
    role public.tenant_role NOT NULL,
    ```

- [ ] Task 4: Update indexes for new role columns
  - File: `supabase/migrations/20260308081743_create_core_auth_schema.sql`
  - Action: Remove `CREATE INDEX idx_profiles_role ON public.profiles (role)` — after the refactor, `profiles.role` only has 2 values (`admin`, `user`) making the index useless (lower cardinality than before, worse than seq scan).
  - Action: Add a composite index for the common "find owner within a tenant" query pattern:
    ```sql
    CREATE INDEX idx_tenant_memberships_tenant_role ON public.tenant_memberships (tenant_id, role);
    ```
  - Notes: Composite index on `(tenant_id, role)` is more useful than a standalone `role` index, since role lookups are always scoped to a tenant.

#### Phase 2: Access Token Hook (edit all 3 migration files)

- [ ] Task 5: Update hook in base migration to read tenant role from memberships
  - File: `supabase/migrations/20260308081743_create_core_auth_schema.sql`
  - Action: Rewrite `custom_access_token_hook` function. Change the variable type from `public.app_role` to `text`. New logic:
    1. First try to get role + tenant_id from `tenant_memberships` in a single query (join instead of two separate queries)
    2. If no tenant membership found, fall back to `profiles.role` (for admin users)
    3. Inject whichever role was found into `app_metadata.user_role`
  - New hook query pattern:

    ```sql
    -- Try tenant membership first (single query for both role and tenant_id)
    SELECT tm.role::text, tm.tenant_id
    INTO user_role, user_tenant_id
    FROM public.tenant_memberships tm
    WHERE tm.user_id = (event ->> 'user_id')::uuid
    ORDER BY tm.created_at ASC
    LIMIT 1;

    -- If no tenant membership, check if user is admin (system role)
    IF user_role IS NULL THEN
      SELECT p.role::text INTO user_role
      FROM public.profiles p
      WHERE p.id = (event ->> 'user_id')::uuid
        AND p.role = 'admin';
    END IF;
    ```

  - Notes: The `DECLARE` block variable type changes from `public.app_role` to `text` since the value can come from either enum.
  - **Critical detail:** The profiles fallback ONLY matches `role = 'admin'`. A `profiles.role = 'user'` (non-admin without a membership) will result in `user_role = NULL`, and no `app_metadata` will be injected. This is correct — users without a membership and without admin status should not get any role claim, and `TenantGuard` will block them with `AUTH.TENANT_MISSING`. This covers the edge case of freshly invited users whose profile exists but who haven't completed onboarding.
  - **`ORDER BY tm.created_at ASC`** added to make `LIMIT 1` deterministic — always selects the user's first/oldest tenant membership.

- [ ] Task 6: Propagate hook changes to migration v2
  - File: `supabase/migrations/20260315120000_add_must_change_password_to_access_token_hook.sql`
  - Action: Apply same hook logic changes as Task 5 (this file does `CREATE OR REPLACE FUNCTION` with the must_change_password addition). Must stay consistent.

- [ ] Task 7: Propagate hook changes to migration v3 (latest)
  - File: `supabase/migrations/20260316120000_add_invitation_pending_to_access_token_hook.sql`
  - Action: Apply same hook logic changes as Task 5 (this file is the latest `CREATE OR REPLACE FUNCTION` with both must_change_password and invitation_pending). Must stay consistent.

#### Phase 3: Seed Data

- [ ] Task 8: Update seed data for new role system
  - File: `supabase/seed.sql`
  - Action: Update all profile and membership inserts:
    - Admin user: `INSERT INTO public.profiles (id, full_name, role) VALUES (..., 'admin'::public.system_role)` — no tenant membership (unchanged pattern)
    - Tenant owner: `INSERT INTO public.profiles (id, full_name, role) VALUES (..., 'user'::public.system_role)` + `INSERT INTO public.tenant_memberships (user_id, tenant_id, role) VALUES (..., tenant_id, 'owner'::public.tenant_role)`
    - Tenant staff: `INSERT INTO public.profiles (id, full_name, role) VALUES (..., 'user'::public.system_role)` + `INSERT INTO public.tenant_memberships (user_id, tenant_id, role) VALUES (..., tenant_id, 'staff'::public.tenant_role)`
  - Notes: All `app_role` casts become `system_role` or `tenant_role` casts. Tenant users get `'user'` as system role.
  - **Critical:** The existing `INSERT INTO public.tenant_memberships (user_id, tenant_id)` statements have NO `role` column. After Task 3 adds `role public.tenant_role NOT NULL` with no default, these inserts will fail with a NOT NULL violation. You MUST add `role` to both the column list and values: `INSERT INTO public.tenant_memberships (user_id, tenant_id, role) VALUES (..., tenant_id, 'owner'::public.tenant_role)`.

#### Phase 4: Database Reset & Type Regeneration

- [ ] Task 9: Reset Supabase database and regenerate types
  - Action: Run `supabase db reset` to apply edited migrations + seed
  - Action: Run `npx supabase gen types typescript --local` to regenerate `packages/api/src/database.types.ts`
  - Notes: Verify the generated types show `system_role` and `tenant_role` enums, `profiles.role` as `system_role`, and `tenant_memberships.role` as `tenant_role`. If CLI is unavailable, use `mcp__supabase__generate_typescript_types` as fallback.

#### Phase 5: Shared Types (packages/api)

- [ ] Task 10: Split role types
  - File: `packages/api/src/roles.types.ts`
  - Action: Replace the single `AppRole` type and `APP_ROLES` constant with split types:

    ```typescript
    export type SystemRole = 'admin' | 'user';
    export type TenantRole = 'owner' | 'staff' | 'employee';
    export type AnyRole = SystemRole | TenantRole;

    export const SYSTEM_ROLES = {
      ADMIN: 'admin',
      USER: 'user',
    } as const satisfies Record<string, SystemRole>;

    export const TENANT_ROLES = {
      OWNER: 'owner',
      STAFF: 'staff',
      EMPLOYEE: 'employee',
    } as const satisfies Record<string, TenantRole>;
    ```

  - Notes: `AnyRole` is the union type for contexts where either role kind is valid (e.g., JWT claim `user_role` can be either).

- [ ] Task 11: Update Profile and TenantMembership interfaces
  - File: `packages/api/src/profile.types.ts`
  - Action:
    - Change import from `AppRole` to `SystemRole, TenantRole`
    - Change `Profile.role` type from `AppRole` to `SystemRole`
    - Add `role: TenantRole` to `TenantMembership` interface

- [ ] Task 12: Update AuthUser and TokenPayload interfaces
  - File: `packages/api/src/auth.types.ts`
  - Action:
    - Change import from `AppRole` to `AnyRole`
    - Change `AuthUser.role` type from `AppRole | null` to `AnyRole | null`
    - Change `TokenPayload.user_role` type from `AppRole` to `AnyRole`

- [ ] Task 13: Update package exports
  - File: `packages/api/src/entry.ts`
  - Action: Replace `AppRole` / `APP_ROLES` exports with `SystemRole`, `TenantRole`, `AnyRole`, `SYSTEM_ROLES`, `TENANT_ROLES`

- [ ] Task 13b: Search and fix all external `AppRole` / `APP_ROLES` imports
  - Action: Grep across `apps/api` and `apps/web` for any imports of `AppRole` or `APP_ROLES` from `@repo/api`. Replace with the appropriate new type (`SystemRole`, `TenantRole`, or `AnyRole`) depending on usage context.
  - Command: `grep -rn "AppRole\|APP_ROLES" apps/api/src apps/web/src --include="*.ts" --include="*.tsx"`
  - Notes: The TypeScript compiler (Task 31) will also catch these, but fixing them proactively avoids a broken build state between phases.

#### Phase 6: Backend Application Code

- [ ] Task 14: Update `tenants.service.ts` — createTenant
  - File: `apps/api/src/tenants/tenants.service.ts`
  - Action:
    - In `createTenant()`, Step 3 (insert profile): change `role: 'tenant_owner'` to `role: 'user'`
    - In `createTenant()`, Step 4 (insert membership): add `role: 'owner'` to the membership insert
    - Update `TenantMembershipJoin` interface: change `profiles` shape from `{ id: string; full_name: string; role: string }` to `{ id: string; full_name: string }` (role no longer on profiles in this join)
    - Add `role: string` field to `TenantMembershipJoin` itself (role is now on the membership row). Import `TenantRole` from `@repo/api` and type it as `role: TenantRole` for type safety instead of bare `string`.

- [ ] Task 15: Update `tenants.service.ts` — findAll and findById queries
  - File: `apps/api/src/tenants/tenants.service.ts`
  - Action: Change the PostgREST select query in `findAll()` and `findById()` from:
    ```
    tenant_memberships (profiles (id, full_name, role))
    ```
    to:
    ```
    tenant_memberships (role, profiles (id, full_name))
    ```
  - Notes: `role` is now selected directly from `tenant_memberships`, not from `profiles`.

- [ ] Task 16: Update `tenants.service.ts` — mapTenantWithOwner
  - File: `apps/api/src/tenants/tenants.service.ts`
  - Action: Change the owner-finding logic from:
    ```typescript
    (tm) => tm.profiles?.role === 'tenant_owner';
    ```
    to:
    ```typescript
    (tm) => tm.role === 'owner';
    ```

- [ ] Task 17: Update `tenants.service.ts` — resendInvitation
  - File: `apps/api/src/tenants/tenants.service.ts`
  - Action: In the `resendInvitation()` method, find the existing owner lookup query (around lines 288-294):
    ```typescript
    // EXISTING CODE (lines 288-294):
    const { data: membership, error: membershipError } = await client
      .from('tenant_memberships')
      .select('user_id, profiles!inner(role)')
      .eq('tenant_id', tenantId)
      .eq('profiles.role', 'tenant_owner')
      .single()
      .overrideTypes<{ user_id: string }>();
    ```
    Replace with:
    ```typescript
    // NEW CODE:
    const { data: membership, error: membershipError } = await client
      .from('tenant_memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .single()
      .overrideTypes<{ user_id: string }>();
    ```
  - Notes: The `profiles!inner` join and `profiles.role` filter are removed — role is now directly on `tenant_memberships`. The `.eq('tenant_id', tenantId)` was already there; it's retained. The `.single()` and `.overrideTypes` are retained.

- [ ] Task 18: Update controller `@Roles()` decorator values
  - File: `apps/api/src/auth/auth.controller.ts`
  - Action: Change `@Roles('tenant_owner', 'tenant_staff')` to `@Roles('owner', 'staff', 'employee')` on `changePassword` and `setInitialPassword` methods. All tenant roles must be able to change/set their password.
  - File: `apps/api/src/tenants/tenants.controller.ts`
  - Action: Change `@Roles('admin', 'tenant_owner')` to `@Roles('admin', 'owner')` on `findById` method. Other methods stay `@Roles('admin')` (unchanged).

- [ ] Task 19: Update `auth.service.ts` role mapping
  - File: `apps/api/src/auth/auth.service.ts`
  - Action: The service reads `user.app_metadata.user_role` and maps it to `AuthUser.role`. Since `app_metadata` is typed as `Record<string, unknown>`, the `user_role` value is `unknown`. Add an explicit type cast: `(user.app_metadata.user_role as AnyRole) ?? null`. Import `AnyRole` from `@repo/api`. Apply this in both `login()` (around line 61) and `getMe()` (around line 233) where the role is mapped to the response.

- [ ] Task 20: Update `tenant.guard.ts` admin check
  - File: `apps/api/src/common/guards/tenant.guard.ts`
  - Action: The guard checks `userRole === 'admin'`. The string value `'admin'` doesn't change, so this is a no-op. Verify only.

- [ ] Task 21: Verify `roles.decorator.ts` — no changes needed
  - File: `apps/api/src/common/decorators/roles.decorator.ts`
  - Action: The decorator uses `...roles: string[]` which accepts any role value. Leave as-is — adding `AnyRole[]` typing would introduce a `@repo/api` import into a low-level decorator file that currently has zero external imports. Not worth the cross-package coupling.

#### Phase 7: Frontend Application Code

- [ ] Task 22: Update `proxy.ts` role string values
  - File: `apps/web/src/lib/supabase/proxy.ts`
  - Action: Replace role string comparisons:
    - `user_role !== 'admin'` → no change (admin stays admin)
    - `user_role === 'admin'` → no change
    - `user_role === 'tenant_staff'` → `user_role === 'staff' || user_role === 'employee'` (employee gets same restrictions as staff)

- [ ] Task 23: Update `auth-provider.tsx` type cast
  - File: `apps/web/src/providers/auth-provider.tsx`
  - Action: The existing cast `as AuthUser['role']` will automatically widen to `AnyRole | null` since `AuthUser.role` changes in Task 12. This is structurally correct. However, verify that no frontend code checks `role === 'user'` — the `'user'` system role value should never appear in JWTs (the hook in Task 5 filters it out), but the type system now permits it. This is acceptable because the hook is the source of truth for JWT values, not the TypeScript types.

- [ ] Task 24: Update `page.tsx` root redirect
  - File: `apps/web/src/app/page.tsx`
  - Action: The check `user_role === 'admin'` doesn't change. Verify only.

- [ ] Task 25: Update `admin/layout.tsx` guard
  - File: `apps/web/src/app/admin/layout.tsx`
  - Action: The check `user_role !== 'admin'` doesn't change. Verify only.

- [ ] Task 26: Update `(tenant)/layout.tsx` staff/employee restrictions
  - File: `apps/web/src/app/(tenant)/layout.tsx`
  - Action: Change `user_role === 'tenant_staff'` to `user_role === 'staff' || user_role === 'employee'` (employee gets same restrictions as staff)

- [ ] Task 27: Update `tenant-nav.tsx` role restrictions
  - File: `apps/web/src/app/(tenant)/_components/tenant-nav.tsx`
  - Action: Change `roles: ['tenant_owner']` to `roles: ['owner']` in nav item definitions

#### Phase 8: Test Updates

- [ ] Task 28: Update guard unit tests
  - File: `apps/api/src/common/guards/roles.guard.spec.ts`
  - Action: Update mock `user_role` values: `'tenant_owner'` → `'owner'`, `'tenant_staff'` → `'staff'`
  - File: `apps/api/src/common/guards/tenant.guard.spec.ts`
  - Action: Update mock `user_role` values in test fixtures. `'admin'` stays the same.
  - File: `apps/api/src/common/guards/supabase-auth.guard.spec.ts`
  - Action: Update mock `user_role` values in JWT metadata fixtures.

- [ ] Task 29: Update service and controller tests
  - File: `apps/api/src/auth/auth.service.spec.ts`
  - Action: Update `app_metadata: { user_role: 'tenant_owner' }` → `'owner'`
  - File: `apps/api/src/tenants/tenants.service.spec.ts`
  - Action: Update:
    - Mock profile inserts: `role: 'tenant_owner'` → `role: 'user'`
    - Mock membership inserts: add `role: 'owner'` to insert calls (e.g., `{ user_id: ..., tenant_id: ..., role: 'owner' }`)
    - Mock query responses for `findAll`/`findById`: change from `tenant_memberships: [{ profiles: { id, full_name, role: 'tenant_owner' } }]` to `tenant_memberships: [{ role: 'owner', profiles: { id, full_name } }]` — role moves from the nested `profiles` object to the `tenant_memberships` level
    - `resendInvitation` mock: remove `profiles!inner(role)` from select mock, change `.eq('profiles.role', 'tenant_owner')` assertion to `.eq('role', 'owner')`
    - `app_metadata.user_role` values in request fixtures: `'tenant_owner'` → `'owner'`
  - File: `apps/api/src/tenants/tenants.controller.spec.ts`
  - Action: Update `app_metadata: { user_role: 'admin' }` — no change needed (admin stays admin). Verify only.

- [ ] Task 30: Update E2E tests
  - File: `apps/api/test/tenant-isolation.e2e-spec.ts`
  - Action: Update all `app_metadata` fixtures:
    - `user_role: 'tenant_owner'` → `'owner'`
    - `user_role: 'tenant_staff'` → `'staff'`
    - `user_role: 'admin'` → no change

#### Phase 9: Verification

- [ ] Task 31: Run linter and type-check
  - Action: Run `pnpm lint` and `pnpm build` to catch any missed references to old role values
  - Notes: TypeScript compiler will flag any remaining `AppRole` / `APP_ROLES` references

- [ ] Task 32: Run test suite
  - Action: Run `pnpm test` to verify all unit tests pass with new role values

- [ ] Task 33: Manual smoke test
  - Action: Start the app (`pnpm dev`) and verify:
    1. Admin login → redirects to `/admin` → can see tenants
    2. Create tenant → owner profile gets `system_role: 'user'`, membership gets `tenant_role: 'owner'`
    3. Tenant owner login → redirects to tenant dashboard → sees full nav
    4. Tenant staff login → redirects to tenant dashboard → sees restricted nav
    5. Resend invitation works (finds owner by `tenant_memberships.role = 'owner'`)

### Acceptance Criteria

- [ ] AC 1: Given the database is reset, when I inspect the schema, then `system_role` enum exists with values (`admin`, `user`) and `tenant_role` enum exists with values (`owner`, `staff`, `employee`), and the old `app_role` enum does not exist.

- [ ] AC 2: Given the database is reset, when I inspect the `profiles` table, then the `role` column has type `system_role` with default `'user'`.

- [ ] AC 3: Given the database is reset, when I inspect the `tenant_memberships` table, then it has a `role` column of type `tenant_role` with no default.

- [ ] AC 4: Given seed data is applied, when I query the admin user's profile, then `role = 'admin'` and they have no tenant membership.

- [ ] AC 5: Given seed data is applied, when I query the tenant owner user, then their profile has `role = 'user'` and their tenant membership has `role = 'owner'`.

- [ ] AC 6: Given seed data is applied, when I query the tenant staff user, then their profile has `role = 'user'` and their tenant membership has `role = 'staff'`.

- [ ] AC 7: Given an admin user logs in, when their JWT is issued, then `app_metadata.user_role = 'admin'` and `app_metadata.tenant_id = null`.

- [ ] AC 8: Given a tenant owner logs in, when their JWT is issued, then `app_metadata.user_role = 'owner'` and `app_metadata.tenant_id` is set to their tenant's UUID.

- [ ] AC 9: Given a tenant staff user logs in, when their JWT is issued, then `app_metadata.user_role = 'staff'` and `app_metadata.tenant_id` is set to their tenant's UUID.

- [ ] AC 10: Given an admin creates a new tenant, when the tenant is created, then the owner's profile has `role = 'user'` and the tenant membership has `role = 'owner'`.

- [ ] AC 11: Given a tenant has an owner with a pending invitation, when the admin resends the invitation, then the system finds the owner by `tenant_memberships.role = 'owner'` (not `profiles.role`).

- [ ] AC 12: Given the admin views the tenant list, when tenants are loaded, then owner info is resolved from `tenant_memberships.role = 'owner'` joined to `profiles` for the owner's name.

- [ ] AC 13: Given a tenant staff user accesses the tenant app, when they navigate, then analytics and settings nav items are hidden (role `'staff'` check works in `tenant-nav.tsx` and `(tenant)/layout.tsx`).

- [ ] AC 14: Given a user with role `'staff'` in their JWT, when they call an endpoint decorated with `@Roles('owner')`, then they receive a 403 Forbidden response.

- [ ] AC 15: Given a user with `profiles.role = 'user'` and NO tenant membership, when the access token hook fires, then `app_metadata.user_role` is NOT injected (null/absent), and the user is blocked by `TenantGuard` with `AUTH.TENANT_MISSING`.

- [ ] AC 16: Given a user with tenant role `'employee'` in their JWT, when they access the tenant app, then they see the same restricted nav as `'staff'` users (analytics and settings hidden).

- [ ] AC 17: Given a user with tenant role `'employee'` in their JWT, when they call `changePassword` or `setInitialPassword`, then the request succeeds (not blocked by `@Roles`).

- [ ] AC 18: Given all code changes are complete, when `pnpm build` is run, then the project compiles with zero TypeScript errors referencing old role types.

- [ ] AC 19: Given all code changes are complete, when `pnpm test` is run, then all unit tests pass.

## Additional Context

### Dependencies

- Supabase CLI must be running locally (`supabase start`) for DB reset and type generation
- No external package changes needed — this is purely a schema + code refactor

### Testing Strategy

**Unit tests (update existing):**

- Guard tests: Update mock `user_role` values in request fixtures
- Service tests: Update mock Supabase query responses and insert data
- Controller tests: Update mock `app_metadata` in request fixtures

**E2E tests (update existing):**

- `tenant-isolation.e2e-spec.ts`: Update all mock JWT `app_metadata` fixtures

**Manual smoke test:**

- Admin login + tenant creation + owner/staff login flow
- Verify JWT claims via browser devtools (decode access token)
- Verify PostgREST queries via Supabase Studio

### Notes

**Risk items:**

- The access token hook change is the most critical — if the hook breaks, no one can authenticate. Test thoroughly by checking JWT claims after login.
- All 3 migration files contain the hook function (`CREATE OR REPLACE`). They must all be updated consistently — if any one is missed, the intermediate migration will overwrite the fix.
- The `LIMIT 1` on tenant membership in the hook now has `ORDER BY created_at ASC` for determinism, but multi-tenant users will always get their oldest membership's role. This is acceptable for now since tenant switching is out of scope.
- The hook's profiles fallback only matches `role = 'admin'`. A user with `profiles.role = 'user'` and no tenant membership gets NO role claim — this is intentional (they are in an incomplete state and should be blocked).
- Seed SQL for `tenant_memberships` must include the new `role` column or `supabase db reset` will fail with NOT NULL violation.

**Future considerations (out of scope):**

- Tenant switching: When implemented, the hook will need a way to know the "active" tenant (e.g., from a session/cookie). The `ORDER BY ... LIMIT 1` will be replaced with a specific tenant lookup.
- `employee` role: Defined in the enum and handled defensively in frontend (same restrictions as staff) and backend (`@Roles` includes employee on auth endpoints). Full employee-specific behavior will be implemented when the employee feature is built.
