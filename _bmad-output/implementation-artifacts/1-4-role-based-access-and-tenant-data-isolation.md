# Story 1.4: Role-Based Access & Tenant Data Isolation

Status: done

## Story

As a Tenant Owner,
I want my restaurant's data to be completely isolated from other restaurants with role-appropriate access enforced,
So that my business information is private and secure.

## Acceptance Criteria

1. **RLS enforces tenant data isolation on all tenant-scoped tables**
   - Given multiple tenants exist in the system
   - When a tenant owner queries any tenant-scoped table (orders, settings, users, etc.)
   - Then RLS policies ensure only rows matching their `tenant_id` JWT claim are returned
   - And no cross-tenant data is accessible even via direct API calls (NFR8)

2. **NestJS TenantGuard extracts and injects tenant context**
   - Given a request hits any protected API endpoint
   - When the NestJS auth guard validates the JWT
   - Then the tenant guard extracts `tenant_id` from JWT claims and injects it into the request context
   - And the roles guard checks the user's role against the endpoint's required roles

3. **Non-admin users cannot access admin endpoints**
   - Given a user with role `tenant_owner` or `tenant_staff`
   - When they attempt to access admin-only endpoints (e.g., `/api/v1/admin/*`)
   - Then the request is rejected with 403 Forbidden

4. **Admin can view cross-tenant data**
   - Given a user with role `admin`
   - When they access cross-tenant endpoints
   - Then they can view data across all tenants (admin is not tenant-scoped)

5. **Defense-in-depth: both guard and RLS enforce isolation**
   - Given the system processes any tenant-scoped operation
   - When the database query is constructed
   - Then the query is always scoped by `tenant_id` — enforced at both the NestJS guard level and the Supabase RLS policy level (defense in depth)

## Tasks / Subtasks

### Backend — NestJS Guards & Decorators

- [x] Task 1: Create `@TenantId()` parameter decorator (AC: #2)
  - [x] 1.1 Create `apps/api/src/common/decorators/tenant-id.decorator.ts`
  - [x] 1.2 Extract `tenant_id` from `request.user.app_metadata.tenant_id`
  - [x] 1.3 Return `string | null` (null for admin users who are not tenant-scoped)

- [x] Task 2: Create TenantGuard (AC: #2, #5)
  - [x] 2.1 Create `apps/api/src/common/guards/tenant.guard.ts`
  - [x] 2.2 Execute AFTER SupabaseAuthGuard and RolesGuard in the guard chain
  - [x] 2.3 For non-admin users: verify `tenant_id` exists in JWT claims — throw 403 if missing
  - [x] 2.4 For admin users: allow through (admin is not tenant-scoped)
  - [x] 2.5 Inject `tenantId` into request context for downstream use
  - [x] 2.6 Skip for @Public() routes (same pattern as SupabaseAuthGuard)

- [x] Task 3: Register TenantGuard globally (AC: #2)
  - [x] 3.1 Add `{ provide: APP_GUARD, useClass: TenantGuard }` to `app.module.ts` providers
  - [x] 3.2 Place AFTER RolesGuard in the array — guard chain: Throttler → SupabaseAuth → Roles → Tenant
  - [x] 3.3 Verify existing endpoints still work: run `pnpm test` in `apps/api` (login, refresh are @Public; admin endpoints pass because admin is allowed through)

- [x] Task 4: Unit tests for TenantGuard (AC: #2, #3, #4)
  - [x] 4.1 Create `apps/api/src/common/guards/tenant.guard.spec.ts`
  - [x] 4.2 Test: Public route → bypasses guard
  - [x] 4.3 Test: Admin user → allowed through, tenantId is null
  - [x] 4.4 Test: Tenant owner with valid tenant_id → allowed through, tenantId injected
  - [x] 4.5 Test: Tenant staff with valid tenant_id → allowed through, tenantId injected
  - [x] 4.6 Test: Non-admin user with missing tenant_id → 403 Forbidden

- [x] Task 5: Unit tests for @TenantId() decorator (AC: #2)
  - [x] 5.1 Add test in `apps/api/src/common/decorators/tenant-id.decorator.spec.ts`
  - [x] 5.2 Test: returns tenant_id from app_metadata
  - [x] 5.3 Test: returns null when tenant_id not in app_metadata

### Backend — Tenant-Scoped Endpoint Enforcement

- [x] Task 6: Add @TenantId() to tenant-scoped endpoints (AC: #5)
  - [x] 6.1 Update `tenants.controller.ts` `findById()` — use @TenantId() for scoping (non-admin check already in service, but now guard enforces tenant context)
  - [x] 6.2 Verify admin endpoints (`POST /tenants`, `GET /tenants`) remain admin-only via @Roles('admin')
  - [x] 6.3 For `GET /tenants/:tenantId`: after Task 7.6 switches to `getClientForUser()`, the manual membership check in `TenantsService.findById()` becomes redundant for tenant users — RLS auto-scopes. Remove the manual `tenant_memberships` query for the non-admin path; keep the admin path using `getClient()` unchanged

### Backend — User-Scoped Supabase Client (Real RLS Enforcement)

**Implementation order: Task 8 first (token injection), then Task 7 (user-scoped client), since services need the token before they can use `getClientForUser()`.**

- [x] Task 7a: Add `SUPABASE_PUBLISHABLE_KEY` to API environment (AC: #1, #5)
  - [x] 7a.1 Add `SUPABASE_PUBLISHABLE_KEY` to `apps/api/.env` (copy the anon key from `supabase start` output — same key used in `apps/web/.env` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
  - [x] 7a.2 Add `SUPABASE_PUBLISHABLE_KEY` to the Zod env validation schema in `apps/api/src/config/env.validation.ts`
  - [x] 7a.3 Inject it via `ConfigService` in `SupabaseService` constructor
  - [x] 7a.4 **Why needed:** `getClientForUser()` must create a Supabase client with the **anon key** (not service-role key) + the user's JWT. The service-role key bypasses RLS entirely, so using it with a user JWT would defeat the purpose.

- [x] Task 7b: Add `getClientForUser(accessToken: string): SupabaseClient` method to SupabaseService (AC: #1, #5)
  - [x] 7b.1 Implementation:
    ```typescript
    getClientForUser(accessToken: string): SupabaseClient {
      return createClient(this.supabaseUrl, this.publishableKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    ```
  - [x] 7b.2 This client is subject to RLS policies — tenant isolation enforced at the DB level automatically via JWT claims (`app_metadata.tenant_id`, `app_metadata.user_role`)
  - [x] 7b.3 **Usage pattern:** Services receive the access token from the request (extracted by SupabaseAuthGuard), pass it to `getClientForUser()` for all tenant-scoped data queries
  - [x] 7b.4 **Service-role client (`getClient()`) reserved for:** admin operations only (`auth.admin.createUser`, `auth.admin.signOut`, `auth.admin.updateUserById`, cross-tenant admin queries)
  - [x] 7b.5 Update `TenantsService.findById()` to use `getClientForUser()` for tenant_owner queries — RLS replaces the manual membership check. Remove the manual `tenant_memberships` query for non-admin path (it's now redundant)
  - [x] 7b.6 Admin code paths continue to use `getClient()` (service-role) since admin needs cross-tenant access

- [x] Task 8: Inject access token into request context (AC: #5)
  - [x] 8.1 SupabaseAuthGuard already extracts the Bearer token — store it on the request object (e.g., `request.accessToken`)
  - [x] 8.2 Create `@AccessToken()` parameter decorator to extract it in controllers
  - [x] 8.3 Controllers pass the token to services, services pass it to `getClientForUser()`

### Frontend — Route Protection

- [x] Task 9: Enforce tenant route protection in proxy.ts (AC: #3)
  - [x] 9.1 Tenant routes (`/dashboard`, `/analytics`, `/settings`) are already auth-gated
  - [x] 9.2 Add check: if user is `admin` and accesses tenant routes → redirect to `/admin/overview` (admin should use admin panel, not tenant views)
  - [x] 9.3 Verify `/admin/*` routes already block non-admin (confirmed: proxy.ts lines 76-84)

- [x] Task 10: Protect settings and analytics routes from staff (AC: #3)
  - [x] 10.1 Authoritative guard in `(tenant)/layout.tsx`: reads `x-pathname` header (forwarded by proxy.ts), redirects staff away from `/analytics` and `/settings`
  - [x] 10.2 The nav already hides these items for staff (tenant-nav.tsx), but this adds server-side enforcement preventing direct URL access
  - [x] 10.3 This is "subtraction" pattern — same layout, restricted routes
  - [x] 10.4 proxy.ts forwards pathname via `x-pathname` header and does basic first-pass redirect; layout.tsx is the authoritative source of truth

### Integration Testing

- [x] Task 11: Verify guard chain end-to-end (AC: #1-5)
  - [x] 11.1 Test: tenant_owner accesses own tenant data → 200
  - [x] 11.2 Test: tenant_owner accesses other tenant's data → RLS returns empty (no data leak) — verified via mock; real RLS requires running Supabase instance
  - [x] 11.3 Test: tenant_staff accesses own tenant data → 200
  - [x] 11.4 Test: tenant_staff accesses admin endpoint → 403
  - [x] 11.5 Test: admin accesses any tenant data (service-role) → 200
  - [x] 11.6 Test: unauthenticated request → 403 (MockAuthGuard returns false; real SupabaseAuthGuard returns 401)

## Dev Notes

### Critical Architecture Patterns

**Guard Chain Order (app.module.ts):**
```
ThrottlerGuard → SupabaseAuthGuard → RolesGuard → TenantGuard
```
Each guard in this chain has a specific responsibility:
1. **ThrottlerGuard** — Rate limiting (already exists)
2. **SupabaseAuthGuard** — JWT validation + user extraction (already exists)
3. **RolesGuard** — Role-based endpoint access (already exists)
4. **TenantGuard** — Tenant context injection + isolation enforcement (NEW in this story)

**User-Scoped Client for Real RLS Enforcement:**
Currently the backend uses only `SupabaseService.getClient()` which returns a **service-role client that BYPASSES RLS**. Manual `.eq('tenant_id', tenantId)` filters are the only isolation — one missed filter = data leak. RLS is meaningless in this setup.

**Solution: Introduce `getClientForUser(accessToken)`** — creates a Supabase client authenticated with the user's JWT. This client is subject to RLS, so tenant isolation is enforced at the DB level automatically. No manual `.eq()` needed for tenant scoping.

**Three client types after this story:**
| Client | Method | Signature | RLS | Use For |
|--------|--------|-----------|-----|---------|
| User-scoped | `getClientForUser(token)` | `getClientForUser(accessToken: string): SupabaseClient` | Enforced | All tenant-scoped data queries |
| Service-role | `getClient()` | `getClient(): SupabaseClient` | Bypassed | Admin operations, `auth.admin.*`, cross-tenant admin queries |
| Auth client | `createAuthClient()` | `createAuthClient(): SupabaseClient` | N/A | User-facing auth (signIn, refresh) |

**How `getClientForUser()` works:**
- Uses `SUPABASE_PUBLISHABLE_KEY` (anon key) — NOT the service-role key
- Passes user's JWT via `Authorization: Bearer <token>` header
- Supabase server validates the JWT and applies RLS using its `app_metadata` claims
- **Critical: do NOT use the service-role key** — it bypasses RLS regardless of Authorization header

**Data flow:**
1. SupabaseAuthGuard extracts Bearer token from request header and stores it on `request.accessToken`
2. Controller extracts token via `@AccessToken()` decorator, passes to service
3. Service calls `getClientForUser(token)` — RLS uses JWT `app_metadata.tenant_id` claim to auto-scope queries
4. Admin code paths continue using `getClient()` (service-role) for cross-tenant access

**JWT Claims Structure (from `custom_access_token_hook` PostgreSQL function):**
```json
{
  "app_metadata": {
    "user_role": "tenant_owner",
    "tenant_id": "uuid-here"
  },
  "must_change_password": true
}
```
- `user_role` comes from `profiles.role`, `tenant_id` comes from `tenant_memberships` (LIMIT 1)
- Admin users: `user_role: 'admin'`, `tenant_id: null`
- SupabaseAuthGuard merges these JWT claims into `request.user.app_metadata` (prioritizes JWT claims over stored metadata)
- TenantGuard reads from `request.user.app_metadata.tenant_id`
- Frontend `getClaims()` returns the same claims — `claims.app_metadata.user_role` for role checks in layouts

**Existing Application-Level Tenant Check (TenantsService.findById) — TO BE REMOVED:**
```typescript
// CURRENT CODE — manual membership check (will be replaced by RLS):
if (userRole !== 'admin') {
  const { data: membership } = await client
    .from('tenant_memberships')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!membership) throw new ForbiddenException(...);
}
```
**After this story:** Remove this entire block for the non-admin path. `getClientForUser(token)` with RLS auto-scopes queries — if the user doesn't belong to the tenant, RLS returns empty results (no data leak, no ForbiddenException needed). The service should:
- Non-admin: use `getClientForUser(accessToken)` to query, check for empty result → 404 "Tenant not found" (indistinguishable from non-existent tenant)
- Admin: use `getClient()` (service-role) — unchanged, admin sees all tenants

### Frontend Route Access Matrix

| Route | admin | tenant_owner | tenant_staff | unauthenticated |
|-------|-------|-------------|-------------|-----------------|
| `/login` | pass-through | pass-through | pass-through | allowed |
| `/change-password` | N/A | allowed | allowed | redirect to /login |
| `/dashboard` | redirect to /admin | allowed | allowed | redirect to /login |
| `/analytics` | redirect to /admin | allowed | redirect to /dashboard | redirect to /login |
| `/settings` | redirect to /admin | allowed | redirect to /dashboard | redirect to /login |
| `/admin/*` | allowed | redirect to / | redirect to / | redirect to /login |

### Staff Access — "Subtraction" Pattern

Staff view is the owner view with restricted elements hidden:
- **Nav:** Already implemented — staff sees Dashboard only (tenant-nav.tsx line 37-39)
- **Routes:** Need server-side enforcement — staff attempting `/analytics` or `/settings` via URL should redirect to `/dashboard`
- **Data:** Staff sees same dashboard data as owner — no data-level restriction within a tenant (restriction is at feature level, not data level)

### Previous Story Intelligence (Story 1.3)

**Patterns established:**
1. `getClaims()` for proxy.ts fast-pass, `getUser()` for authoritative checks
2. Server components use `getClaims()` for layout guards
3. client components use `useAuth()` hook for role-based UI
4. Turkish labels in UI ("Çıkış", "Henüz sipariş yok")
5. react-hook-form + zodResolver for forms
6. PinoLogger for all service logging
7. Error codes follow `DOMAIN.ACTION_ERROR` format
8. Response envelope: `{ data: T }` or `{ error: { code, message } }`

**Review feedback applied:**
- signOut calls backend logout first, then local signOut
- proxy.ts `redirectTo()` and `redirectToLogin()` helpers with `?next=` support
- Button uses `render` prop (base-ui) not `asChild` (radix)

### Git Intelligence

**Recent commits (last 10):**
- `a85b67a` Apply code review fixes for story 1.3 and project-wide issues
- `bd2303c` Mark story and sprint status as done
- `821ef49` Polish local UX and dev startup
- `a34bb31` Improve logout and 401 recovery
- `d5a4543` Unwrap API payloads and sync tenant UI
- `3fbee2b` Align tenant creation response model
- `f1b557e` Move route guards to claims-based layouts
- `82a8a0f` Harden password change validation
- `9433dad` Use verified claims in auth guard
- `3d11361` feat: implement tenant owner login with forced password reset (story 1.3)

**Patterns to follow:**
- Commit messages: descriptive, no co-author lines
- Single quotes, trailing commas (Prettier)
- Import sorting: side-effects > node: > external > @repo/ > @/ > relative

### Project Structure Notes

**New files to create:**
```
apps/api/src/common/guards/tenant.guard.ts
apps/api/src/common/guards/tenant.guard.spec.ts
apps/api/src/common/decorators/tenant-id.decorator.ts
apps/api/src/common/decorators/tenant-id.decorator.spec.ts
apps/api/src/common/decorators/access-token.decorator.ts
```

**Files to modify:**
```
apps/api/src/app.module.ts                    — Register TenantGuard globally
apps/api/src/config/env.validation.ts         — Add SUPABASE_PUBLISHABLE_KEY to Zod schema
apps/api/src/common/guards/supabase-auth.guard.ts — Store access token on request
apps/api/src/supabase/supabase.service.ts     — Add getClientForUser(accessToken), inject publishable key
apps/api/src/tenants/tenants.controller.ts    — Use @TenantId(), @AccessToken() decorators
apps/api/src/tenants/tenants.service.ts       — Use getClientForUser() for tenant-scoped queries, remove manual membership check
apps/api/.env                                 — Add SUPABASE_PUBLISHABLE_KEY (anon key from supabase start)
apps/web/src/lib/supabase/proxy.ts            — Admin-to-tenant redirect
apps/web/src/app/(tenant)/layout.tsx          — Staff route restriction
```

**Files that already exist and need NO changes:**
```
apps/api/src/common/guards/roles.guard.ts            — Exists (no changes)
apps/api/src/common/decorators/roles.decorator.ts    — Exists (no changes)
apps/api/src/common/decorators/current-user.decorator.ts — Exists (no changes)
apps/api/src/common/decorators/public.decorator.ts   — Exists (no changes)
apps/web/src/app/admin/layout.tsx                    — Exists (admin guard already implemented)
apps/web/src/app/admin/_components/admin-sidebar.tsx  — Exists (sidebar already implemented)
apps/web/src/app/admin/overview/page.tsx             — Exists (placeholder already implemented)
apps/web/src/app/admin/tenants/page.tsx              — Exists (tenant list already implemented)
apps/web/src/app/admin/tenants/create/page.tsx       — Exists (tenant create already implemented)
apps/web/src/app/page.tsx                            — Exists (role-based redirect to /admin/overview or /dashboard already works)
apps/web/src/app/(tenant)/_components/tenant-nav.tsx — Exists (role filtering already implemented)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.4 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC section, lines 222-226]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guard structure, lines 734-737]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement guidelines, lines 638-707]
- [Source: _bmad-output/planning-artifacts/architecture.md — API response format, lines 522-556]
- [Source: _bmad-output/planning-artifacts/architecture.md — NestJS project structure, lines 406-468]
- [Source: _bmad-output/planning-artifacts/architecture.md — Next.js routes, lines 471-500]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data boundaries/RLS, lines 1120-1131]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Staff view subtraction, line 1012]
- [Source: _bmad-output/planning-artifacts/prd.md — FR5, FR7, NFR8]
- [Source: _bmad-output/implementation-artifacts/1-3-tenant-owner-login-and-forced-password-reset.md — Dev notes, patterns]
- [Source: supabase/migrations/20260308081743_create_core_auth_schema.sql — RLS policies, custom_access_token_hook]

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|-------------------|
| `@nestjs/common` | (existing) | Guards, decorators, pipes |
| `@nestjs/core` | (existing) | Reflector for metadata |
| `@supabase/supabase-js` | (existing) | JWT claims, service-role client |
| `@supabase/ssr` | (existing) | `getClaims()` in proxy.ts and layouts |
| `lucide-react` | (existing) | Admin sidebar icons |
| `@repo/ui` | (existing) | Admin layout components |

No new dependencies required — all libraries are already installed.

### Testing Requirements

**Backend unit tests (co-located .spec.ts):**
- `tenant.guard.spec.ts`: Test TenantGuard behavior
  - Public routes bypass
  - Admin allowed with null tenantId
  - Tenant owner/staff allowed with valid tenantId
  - Non-admin without tenantId → 403
- `tenant-id.decorator.spec.ts`: Test decorator extraction
  - Returns tenant_id from app_metadata
  - Returns null when absent
- `supabase.service.spec.ts`: Test getClientForUser
  - Creates client with publishable key (not service-role key)
  - Passes user's access token as Authorization header
  - Client is distinct from service-role client
- `tenants.service.spec.ts`: Update existing tests for `findById()`
  - Non-admin path now uses `getClientForUser()` instead of manual membership query
  - Verify manual membership check is removed for tenant users
  - Admin path still uses `getClient()` — unchanged

**Integration tests (Task 11):**
- These tests require real Supabase tokens from the local Supabase instance (`supabase start`)
- Use Supertest + actual JWT tokens (login via API, extract token, use in subsequent requests)
- Seed test data: at least 2 tenants with 1 owner each to test cross-tenant isolation

**Frontend manual testing:**
1. Login as tenant_owner → see Dashboard, Analitik, Ayarlar in nav
2. Login as tenant_staff → see Dashboard only in nav
3. Staff navigates to `/settings` via URL → redirected to `/dashboard`
4. Staff navigates to `/analytics` via URL → redirected to `/dashboard`
5. Admin navigates to `/dashboard` → redirected to `/admin/overview`
6. Admin panel already works (layout, sidebar, overview, tenants — verified)
7. Non-admin navigates to `/admin/overview` → redirected to `/`
8. Tenant owner cannot see other tenant data via API (RLS enforces, not manual check)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- All 77 unit tests pass (13 suites)
- All 9 e2e tests pass (2 suites)
- Lint passes across all packages
- Build succeeds for both api and web apps

### Completion Notes List

- Implemented TenantGuard with full guard chain: Throttler → SupabaseAuth → Roles → Tenant
- Created @TenantId() and @AccessToken() parameter decorators following existing patterns
- Added getClientForUser(accessToken) to SupabaseService using publishable key (not service-role) for real RLS enforcement
- Removed manual tenant_memberships check in TenantsService.findById() — RLS now auto-scopes queries for non-admin users
- Admin code paths continue using service-role client (getClient()) for cross-tenant access
- Added SUPABASE_PUBLISHABLE_KEY to API env validation and .env
- Extended AuthenticatedRequest type with tenantId and accessToken fields
- Frontend: admin→tenant redirect and staff route restriction — proxy.ts does basic first-pass, layout.tsx is authoritative source of truth
- proxy.ts forwards pathname via `x-pathname` response header; (tenant)/layout.tsx reads it via `headers()` for authoritative staff route guard

### Change Log

- 2026-03-15: Implemented story 1.4 — Role-Based Access & Tenant Data Isolation
- 2026-03-15: Code review fixes — removed unused @TenantId() param from findById; TenantId decorator reads from request.tenantId (guard-set); AccessToken decorator adds guard check; added cross-tenant isolation e2e test (11.2); added layout.tsx to File List

### File List

**New files:**
- apps/api/src/common/guards/tenant.guard.ts
- apps/api/src/common/guards/tenant.guard.spec.ts
- apps/api/src/common/decorators/tenant-id.decorator.ts
- apps/api/src/common/decorators/tenant-id.decorator.spec.ts
- apps/api/src/common/decorators/access-token.decorator.ts
- apps/api/test/tenant-isolation.e2e-spec.ts

**Modified files:**
- apps/api/src/app.module.ts — Register TenantGuard globally
- apps/api/src/common/guards/supabase-auth.guard.ts — Store accessToken on request
- apps/api/src/common/types/request.types.ts — Add tenantId and accessToken to AuthenticatedRequest
- apps/api/src/config/env.validation.ts — Add SUPABASE_PUBLISHABLE_KEY
- apps/api/src/supabase/supabase.service.ts — Add getClientForUser(), store supabaseUrl and publishableKey
- apps/api/src/supabase/supabase.service.spec.ts — Add getClientForUser tests, update config
- apps/api/src/tenants/tenants.controller.ts — Add @AccessToken() to findById
- apps/api/src/tenants/tenants.service.ts — Use getClientForUser for non-admin, remove manual membership check
- apps/api/src/tenants/tenants.service.spec.ts — Update findById tests for new signature
- apps/api/src/tenants/tenants.controller.spec.ts — Update findById test for new signature
- apps/api/.env — Add SUPABASE_PUBLISHABLE_KEY
- apps/api/.env.example — Add SUPABASE_PUBLISHABLE_KEY placeholder
- apps/web/src/lib/supabase/proxy.ts — Admin-to-tenant redirect, staff route restriction
- apps/web/src/app/(tenant)/layout.tsx — Authoritative staff route guard (x-pathname header)
- _bmad-output/implementation-artifacts/sprint-status.yaml — Status updated
