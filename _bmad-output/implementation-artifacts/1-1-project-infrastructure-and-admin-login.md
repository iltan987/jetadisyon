# Story 1.1: Project Infrastructure & Admin Login

Status: done

## Story

As an Admin,
I want to log in to the admin panel,
So that I can begin managing restaurant tenants.

## Acceptance Criteria

1. **Given** the NestJS backend is running with Pino structured logging, correlation IDs, and common infrastructure (auth guard, global exception filter, zod validation pipe, logging interceptor)
   **When** the admin navigates to the login page
   **Then** a login form is displayed with email and password fields
   **And** the form validates input with zod v4 before submission

2. **Given** valid admin credentials are entered
   **When** the admin submits the login form
   **Then** the system authenticates via Supabase Auth, issues a JWT with role claim set to "admin"
   **And** the admin is redirected to the admin panel with sidebar navigation layout
   **And** the session is managed with secure tokens and automatic expiry (NFR10)

3. **Given** invalid credentials are entered
   **When** the admin submits the login form more than 5 times in 15 minutes from the same IP
   **Then** the system temporarily locks out further attempts on the auth endpoint (NFR11)
   **And** rate limiting is enforced via @nestjs/throttler

4. **Given** the admin is authenticated
   **When** any API request is made
   **Then** the request is logged via Pino with a unique correlation ID, timestamp, and actor identity

5. **Given** the frontend application loads
   **When** any page is rendered
   **Then** TanStack Query provider and Auth provider are initialized and available to all components

## Tasks / Subtasks

### Phase 1: Database Schema & Auth Foundation
- [x] Task 1: Create Supabase database migration for core tables (AC: 1, 2)
  - [x] 1.1: Create `app_role` enum type (`admin`, `tenant_owner`, `tenant_staff`)
  - [x] 1.2: Create `tenants` table (id uuid PK, name, status, license_status, created_at, updated_at)
  - [x] 1.3: Create `user_roles` table (id, user_id FK to auth.users, tenant_id FK nullable, role app_role, unique(user_id, role))
  - [x] 1.4: Create `audit_logs` table (id, actor_id, action, entity_type, entity_id, metadata jsonb, created_at)
  - [x] 1.5: Enable RLS on all tables
  - [x] 1.6: Create RLS policies: admin full access on tenants, user_roles, audit_logs
  - [x] 1.7: Create Custom Access Token Hook function (`custom_access_token_hook`) to inject `user_role` and `tenant_id` into JWT claims
  - [x] 1.8: Seed admin user via Supabase Auth admin API with `app_metadata: { role: 'admin' }` and corresponding `user_roles` row

### Phase 2: NestJS Common Infrastructure
- [x] Task 2: Set up Pino structured logging (AC: 4)
  - [x] 2.1: Install `nestjs-pino` (v4.6.0) and `pino-http` and `pino-pretty` (dev)
  - [x] 2.2: Add `LoggerModule.forRoot()` to AppModule with `genReqId` using `x-request-id` header or `crypto.randomUUID()`
  - [x] 2.3: Set `app.useLogger(app.get(Logger))` in `main.ts` with `bufferLogs: true`
- [x] Task 3: Create common/ infrastructure via `nest generate` (AC: 1, 4)
  - [x] 3.1: Create `src/common/guards/supabase-auth.guard.ts` — extract Bearer token, call `supabase.auth.getUser(token)`, attach user to `request.user`
  - [x] 3.2: Create `src/common/guards/roles.guard.ts` — check `user.app_metadata.role` against `@Roles()` decorator
  - [x] 3.3: Create `src/common/decorators/roles.decorator.ts` — `@Roles('admin', 'tenant_owner', 'tenant_staff')` using `SetMetadata`
  - [x] 3.4: Create `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` param decorator to extract user from request
  - [x] 3.5: Create `src/common/decorators/public.decorator.ts` — `@Public()` to mark routes that skip auth guard
  - [x] 3.6: Create `src/common/filters/global-exception.filter.ts` — catch all exceptions, format as `{ error: { code, message, details? } }`, log with Pino
  - [x] 3.7: Create `src/common/pipes/zod-validation.pipe.ts` — accept zod v4 schema, validate request body/params/query, throw `BadRequestException` with field errors
  - [x] 3.8: Create `src/common/interceptors/logging.interceptor.ts` — log request method, URL, status, duration, actor identity via Pino
  - [x] 3.9: Register auth guard as `APP_GUARD` (global), exception filter as `APP_FILTER`, logging interceptor as `APP_INTERCEPTOR` in AppModule
- [x] Task 4: Set up rate limiting (AC: 3)
  - [x] 4.1: Install `@nestjs/throttler` (v6.5.0)
  - [x] 4.2: Add `ThrottlerModule.forRoot()` with default limits
  - [x] 4.3: Register `ThrottlerGuard` as `APP_GUARD`
  - [x] 4.4: Configure auth-specific throttle: 5 attempts per 15 minutes via `@Throttle()` on login endpoint

### Phase 3: NestJS Auth Module
- [x] Task 5: Create auth module via `nest generate` (AC: 2, 3)
  - [x] 5.1: `nest generate module auth`
  - [x] 5.2: `nest generate controller auth`
  - [x] 5.3: `nest generate service auth`
  - [x] 5.4: Create `src/auth/dto/login.dto.ts` with zod v4 schema (`email: z.email(), password: z.string().min(8)`)
  - [x] 5.5: Implement `POST /api/v1/auth/login` — validate with zod pipe, call `supabase.auth.signInWithPassword()`, return `{ data: { access_token, refresh_token, user } }`
  - [x] 5.6: Implement `POST /api/v1/auth/logout` — call `supabase.auth.admin.signOut(userId)`, require auth
  - [x] 5.7: Implement `POST /api/v1/auth/refresh` — call `supabase.auth.refreshSession()`, return new tokens
  - [x] 5.8: Implement `GET /api/v1/auth/me` — return current user profile from JWT, require auth
  - [x] 5.9: Mark login and refresh endpoints as `@Public()` (skip auth guard), apply `@Throttle({ default: { limit: 5, ttl: minutes(15) } })` on login
  - [x] 5.10: Add unit tests for auth.service (mock Supabase client)

### Phase 4: Environment & Configuration Updates
- [x] Task 6: Update env validation and configuration (AC: 1)
  - [x] 6.1: Add `SUPABASE_JWT_SECRET` to `apps/api/src/config/env.validation.ts` zod schema
  - [x] 6.2: Update `apps/api/.env.example` with all required variables
  - [x] 6.3: Set global API prefix to `/api/v1` in `main.ts`

### Phase 5: Shared Types
- [x] Task 7: Create shared types in packages/api (AC: 1, 2)
  - [x] 7.1: Create `packages/api/src/auth.types.ts` — `LoginRequest`, `LoginResponse`, `AuthUser`, `TokenPayload` types
  - [x] 7.2: Create `packages/api/src/roles.types.ts` — `AppRole` type, role constants
  - [x] 7.3: Generate database types with `mcp__supabase__generate_typescript_types` after migration

### Phase 6: Next.js Frontend Auth Infrastructure
- [x] Task 8: Set up providers (AC: 5)
  - [x] 8.1: Install `@tanstack/react-query` (v5.x)
  - [x] 8.2: Create `src/providers/query-provider.tsx` — client component with `QueryClientProvider`, `isServer` check pattern for SSR-safe client creation, `staleTime: 60_000`
  - [x] 8.3: Create `src/providers/auth-provider.tsx` — client component, React context with `user`, `session`, `isLoading`, `signOut` state. Subscribe to `onAuthStateChange` via browser Supabase client
  - [x] 8.4: Create `src/app/layout.tsx` root layout wrapping children with `QueryProvider` and `AuthProvider`
- [x] Task 9: Build login page (AC: 1, 2)
  - [x] 9.1: Create `src/app/(auth)/layout.tsx` — minimal centered layout, no sidebar
  - [x] 9.2: Create `src/app/(auth)/login/page.tsx` — login form with email/password inputs using shadcn `Input`, `Label`, `Button` components from `@repo/ui`
  - [x] 9.3: Create client-side zod v4 validation schema for login form
  - [x] 9.4: Implement form submission: call `POST /api/v1/auth/login` via fetch, on success redirect to `/admin/overview`
  - [x] 9.5: Display inline error messages for validation failures and auth errors (plain text, explicit next action)
  - [x] 9.6: Show rate limit message when 429 response received
- [x] Task 10: Build admin layout shell (AC: 2)
  - [x] 10.1: Create `src/app/admin/layout.tsx` — admin layout with sidebar navigation (Overview, Tenants, Licenses, Diagnostics sections)
  - [x] 10.2: Create `src/app/admin/_components/admin-sidebar.tsx` — collapsible sidebar using shadcn components, warm accent for active item
  - [x] 10.3: Create `src/app/admin/overview/page.tsx` — placeholder admin overview page (content will be built in story 1.6)
  - [x] 10.4: Implement auth check in admin layout — redirect to `/login` if not authenticated or not admin role
- [x] Task 11: Update proxy.ts for auth routing (AC: 2)
  - [x] 11.1: Add optimistic cookie check in `src/proxy.ts` — redirect unauthenticated users from `/admin/*` to `/login`
  - [x] 11.2: Redirect authenticated users from `/login` to `/admin/overview`
  - [x] 11.3: Matcher config: broad regex matching all paths except static assets

## Dev Notes

### Critical Architecture Patterns

**Authentication Flow:**
1. Admin submits credentials to `POST /api/v1/auth/login`
2. NestJS auth service calls `supabase.auth.signInWithPassword()`
3. Supabase Auth validates credentials, runs Custom Access Token Hook to inject `user_role` claim
4. JWT returned with claims: `sub`, `email`, `user_role: 'admin'`, `tenant_id: null` (admin has no tenant)
5. Frontend stores tokens via `@supabase/ssr` cookie-based session management
6. Subsequent API requests include `Authorization: Bearer <access_token>`
7. `SupabaseAuthGuard` validates token via `supabase.auth.getUser(token)`
8. `RolesGuard` checks `user.app_metadata.role` against `@Roles()` decorator

**Layered RBAC (Defense in Depth):**
- Layer 1: NestJS Guards — route-level authorization
- Layer 2: Supabase RLS — database-level isolation
- Layer 3: JWT Custom Claims — `tenant_id` and `role` without extra DB lookups

**API Response Format:**
```typescript
// Success: { data: T }
// Error: { error: { code: 'AUTH.INVALID_CREDENTIALS', message: string, details?: unknown } }
// Paginated: { data: T[], meta: { total, page, limit, hasMore } }
```

**Error Code Convention:** `DOMAIN.ACTION_ERROR` — e.g., `AUTH.INVALID_CREDENTIALS`, `AUTH.SESSION_EXPIRED`, `AUTH.RATE_LIMITED`

**Naming Conventions:**
- NestJS files: `kebab-case` (`auth.service.ts`, `supabase-auth.guard.ts`)
- Classes: `PascalCase` (`AuthService`, `SupabaseAuthGuard`)
- DB tables: `snake_case` plural (`user_roles`, `audit_logs`)
- DB → API: `snake_case` in DB ↔ `camelCase` in JSON, transform at service boundary
- API endpoints: `kebab-case` plural (`/api/v1/auth/login`)

### Supabase Custom Access Token Hook

This is the recommended approach for injecting custom claims into JWTs. Create a PostgreSQL function `custom_access_token_hook` that:
1. Receives JWT event payload with `user_id` and `claims`
2. Looks up role from `user_roles` table
3. Injects `user_role` and `tenant_id` into claims
4. Returns modified event

Enable via Supabase Dashboard > Authentication > Hooks (or via SQL for self-hosted). Required permissions: `GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin`.

Claims don't update until next token refresh — call `supabase.auth.refreshSession()` to force.

### Rate Limiting Configuration

Use `@nestjs/throttler` v6.5.0 with helper functions:
```typescript
ThrottlerModule.forRoot([
  { name: 'default', ttl: seconds(60), limit: 100 },
])
// On login endpoint specifically:
@Throttle({ default: { limit: 5, ttl: minutes(15) } })
```
`@SkipThrottle()` on health check endpoints.

### Pino Logging Configuration

Use `nestjs-pino` v4.6.0:
- `genReqId`: Use `x-request-id` header or `crypto.randomUUID()`
- Every request automatically gets a child logger with `req.id` via `AsyncLocalStorage`
- All logs within a request context automatically include correlation ID
- Use `PinoLogger` injection or `@InjectPinoLogger(ServiceName)` decorator in services
- Set `bufferLogs: true` in `NestFactory.create()` to capture bootstrap logs

### TanStack Query Provider Setup

Use `@tanstack/react-query` v5.x with `isServer` from the library for SSR-safe client creation:
- Create client function (not `useState`) to avoid hydration issues
- Set `staleTime: 60_000` to prevent immediate refetch after SSR
- Singleton pattern for browser, fresh instance per request for server

### Frontend Auth Provider Pattern

Subscribe to `supabase.auth.onAuthStateChange()` in a client component:
- Provides `user`, `session`, `isLoading`, `signOut` via React context
- Browser Supabase client from `@supabase/ssr` handles cookie-based sessions
- `proxy.ts` does optimistic cookie-existence redirects only (not a security boundary)
- Real auth validation happens in Server Components via `supabase.auth.getUser()`

### UX Requirements for Login Page

- Centered layout, minimal — no sidebar, no navigation
- Email and password fields using shadcn `Input` + `Label` components
- Primary button (warm accent) for submit: "Giriş Yap"
- Inline validation on blur for fields
- Error messages in plain Turkish with explicit next action
- Rate limit message when 429: "Çok fazla deneme. Lütfen 15 dakika bekleyin."
- All interactive elements minimum 44x44px touch target
- Labels always above inputs
- Inter typeface (shadcn default), body size (16px)

### Admin Sidebar Layout

- Left sidebar with sections: Overview, Tenants, Licenses, Diagnostics
- Collapsible for more content area
- Warm accent (amber/orange) for active navigation item
- Standard SaaS sidebar pattern
- Content area max-width: 1280px
- Support dark/light mode (default to system preference)

### Project Structure Notes

**Backend target structure after this story:**
```
apps/api/src/
├── main.ts                         (updated: logger, global prefix, guards)
├── app.module.ts                   (updated: imports LoggerModule, ThrottlerModule, AuthModule)
├── config/
│   └── env.validation.ts           (updated: add SUPABASE_JWT_SECRET)
├── supabase/                       (existing — no changes)
│   ├── supabase.module.ts
│   ├── supabase.service.ts
│   └── supabase.service.spec.ts
├── common/
│   ├── guards/
│   │   ├── supabase-auth.guard.ts  (NEW)
│   │   └── roles.guard.ts          (NEW)
│   ├── decorators/
│   │   ├── roles.decorator.ts      (NEW)
│   │   ├── current-user.decorator.ts (NEW)
│   │   └── public.decorator.ts     (NEW)
│   ├── filters/
│   │   └── global-exception.filter.ts (NEW)
│   ├── pipes/
│   │   └── zod-validation.pipe.ts  (NEW)
│   ├── interceptors/
│   │   └── logging.interceptor.ts  (NEW)
│   └── types/
│       └── request.types.ts        (NEW — extended Request with user)
└── auth/
    ├── auth.module.ts              (NEW)
    ├── auth.controller.ts          (NEW)
    ├── auth.service.ts             (NEW)
    ├── auth.service.spec.ts        (NEW)
    └── dto/
        └── login.dto.ts            (NEW)
```

**Frontend target structure after this story:**
```
apps/web/src/
├── app/
│   ├── layout.tsx                  (updated: wrap with providers)
│   ├── page.tsx                    (updated: redirect to /login or /admin)
│   ├── (auth)/
│   │   ├── layout.tsx              (NEW — centered minimal layout)
│   │   └── login/
│   │       └── page.tsx            (NEW — login form)
│   └── (admin)/
│       ├── layout.tsx              (NEW — sidebar layout with auth check)
│       ├── _components/
│       │   └── admin-sidebar.tsx   (NEW)
│       └── overview/
│           └── page.tsx            (NEW — placeholder)
├── providers/
│   ├── query-provider.tsx          (NEW)
│   └── auth-provider.tsx           (NEW)
├── hooks/
│   └── use-auth.ts                 (NEW — convenience hook for auth context)
├── lib/
│   ├── supabase/                   (existing — no changes)
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── proxy.ts
│   ├── api-client.ts               (NEW — typed fetch wrapper for API calls)
│   └── utils.ts                    (existing)
└── proxy.ts                        (updated: auth routing rules)
```

**New packages to install:**
- `apps/api`: `nestjs-pino`, `pino-http`, `@nestjs/throttler`
- `apps/api` (dev): `pino-pretty`
- `apps/web`: `@tanstack/react-query`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & RBAC, Multi-Tenant Isolation, NestJS Project Organization, API Response Formats, Naming Conventions]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1-FR10, FR48-FR51, NFR6-NFR12, Permission Model, Tenant Model]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Design System, Admin Layout, Color System, Typography, Button Hierarchy, Form Patterns, Accessibility]
- [Source: nestjs-pino v4.6.0 docs — correlation ID pattern, LoggerModule setup]
- [Source: @nestjs/throttler v6.5.0 docs — per-route config, helper functions]
- [Source: Supabase Auth docs — Custom Access Token Hook, app_metadata for roles]
- [Source: @tanstack/react-query v5 docs — SSR provider pattern with isServer]
- [Source: Next.js 16 docs — proxy.ts migration from middleware.ts]
- [Source: Zod v4 changelog — error param, top-level validators]

### Cross-Story Dependencies

This story is the **foundation for ALL Epic 1 stories**:
- **Story 1.2 (Tenant Creation):** Uses auth guard, admin role check, audit logging
- **Story 1.3 (Tenant Owner Login):** Uses same auth flow, rate limiting, session management
- **Story 1.4 (RBAC & Isolation):** Extends guards with tenant_id scoping, builds on RLS foundation
- **Story 1.5 (Staff Management):** Uses auth infrastructure for staff account creation
- **Story 1.6 (Admin Overview):** Uses admin layout shell, auth check, sidebar navigation

Any changes to auth guard behavior, JWT claim structure, rate limiting logic, or logging patterns will require updates to stories 1.2–1.6.

### Technology Versions (Verified Current)

| Package | Version | Notes |
|---------|---------|-------|
| nestjs-pino | 4.6.0 | NestJS 11 support since v4.3.0 |
| pino-http | latest | Peer dependency of nestjs-pino |
| @nestjs/throttler | 6.5.0 | `seconds()`, `minutes()` helpers, SHA256 |
| @tanstack/react-query | 5.90.x | `isServer` pattern for SSR |
| @supabase/supabase-js | 2.98.0 | Already installed |
| @supabase/ssr | 0.9.0 | Already installed |
| zod | 4.3.6 | Already installed, `error` param replaces `invalid_type_error` |

## Dev Agent Record

### Agent Model Used
claude-opus-4-6 (implementation), claude-opus-4-6 (code review)

### Debug Log References

### Completion Notes List
- All 5 ACs implemented and verified
- 31 unit tests passing (auth.service, guards, filters, pipes, interceptor)
- Frontend type-checks clean, backend lint clean
- Code review (2026-03-08): 13 issues found (2C, 5H, 4M, 2L), all HIGH and MEDIUM fixed

### Code Review Notes (2026-03-08)
- **C1 FIXED**: Story file synced — status, tasks, file list updated
- **C2 FIXED**: Migration SQL extracted from DB and saved to `supabase/migrations/`
- **H1 FIXED**: `page.tsx` — replaced insecure `getSession()` with `getUser()`
- **H2 FIXED**: `GlobalExceptionFilter` + `LoggingInterceptor` — switched from NestJS Logger to PinoLogger for correlation ID support
- **H3 FIXED**: Created `supabase/seed.sql` for reproducible admin user setup
- **H4 FIXED**: CORS configured with `CORS_ORIGIN` env var (default `localhost:3001`)
- **H5 FIXED**: `apiClient` — added try/catch for non-JSON error responses
- **M1 FIXED**: `proxy.ts` — cookie check uses `includes('-auth-token')` to handle chunked cookies
- **M2 FIXED**: Added `autoLogging: false` to pino-http — eliminates duplicate request logging
- **M3 FIXED**: Added `@SkipThrottle()` to `AppController` health check
- **M4 FIXED**: Added `logging.interceptor.spec.ts` — 4 tests, 100% coverage
- **L1 NOTED**: Font is Geist (shadcn v4 default) instead of Inter — intentional
- **L2 NOTED**: e2e test only covers hello world endpoint — deferred to later story

### File List
**Database & Seed:**
- `supabase/migrations/20260308081743_create_core_auth_schema.sql` (NEW)
- `supabase/seed.sql` (NEW)

**Backend — NestJS API (`apps/api/`):**
- `src/main.ts` (MODIFIED — logger, global prefix, CORS config)
- `src/app.module.ts` (MODIFIED — imports LoggerModule, ThrottlerModule, AuthModule, autoLogging: false)
- `src/app.controller.ts` (MODIFIED — @Public, @SkipThrottle)
- `src/config/env.validation.ts` (MODIFIED — added SUPABASE_JWT_SECRET, CORS_ORIGIN)
- `.env.example` (MODIFIED — added SUPABASE_JWT_SECRET, CORS_ORIGIN)
- `src/auth/auth.module.ts` (NEW)
- `src/auth/auth.controller.ts` (NEW)
- `src/auth/auth.service.ts` (NEW)
- `src/auth/auth.service.spec.ts` (NEW)
- `src/auth/dto/login.dto.ts` (NEW)
- `src/auth/dto/refresh.dto.ts` (NEW)
- `src/common/guards/supabase-auth.guard.ts` (NEW)
- `src/common/guards/supabase-auth.guard.spec.ts` (NEW)
- `src/common/guards/roles.guard.ts` (NEW)
- `src/common/guards/roles.guard.spec.ts` (NEW)
- `src/common/decorators/roles.decorator.ts` (NEW)
- `src/common/decorators/current-user.decorator.ts` (NEW)
- `src/common/decorators/public.decorator.ts` (NEW)
- `src/common/filters/global-exception.filter.ts` (NEW — uses PinoLogger)
- `src/common/filters/global-exception.filter.spec.ts` (NEW)
- `src/common/pipes/zod-validation.pipe.ts` (NEW)
- `src/common/pipes/zod-validation.pipe.spec.ts` (NEW)
- `src/common/interceptors/logging.interceptor.ts` (NEW — uses PinoLogger)
- `src/common/interceptors/logging.interceptor.spec.ts` (NEW)
- `src/common/types/request.types.ts` (NEW)
- `test/app.e2e-spec.ts` (MODIFIED)
- `package.json` (MODIFIED — added nestjs-pino, pino-http, @nestjs/throttler, pino-pretty)

**Frontend — Next.js (`apps/web/`):**
- `src/app/layout.tsx` (MODIFIED — wrapped with QueryProvider, AuthProvider)
- `src/app/page.tsx` (MODIFIED — redirect logic using getUser)
- `src/app/(auth)/layout.tsx` (NEW)
- `src/app/(auth)/login/page.tsx` (NEW)
- `src/app/admin/layout.tsx` (NEW)
- `src/app/admin/_components/admin-sidebar.tsx` (NEW)
- `src/app/admin/overview/page.tsx` (NEW)
- `src/providers/query-provider.tsx` (NEW)
- `src/providers/auth-provider.tsx` (NEW)
- `src/hooks/use-auth.ts` (NEW)
- `src/hooks/use-mobile.ts` (NEW — shadcn dependency)
- `src/lib/api-client.ts` (NEW — with non-JSON error handling)
- `src/lib/supabase/proxy.ts` (MODIFIED — auth routing, chunked cookie support)
- `src/proxy.ts` (MODIFIED — delegates to updateSession)
- `package.json` (MODIFIED — added @tanstack/react-query, react-hook-form, @hookform/resolvers)

**Shared Packages:**
- `packages/api/src/auth.types.ts` (NEW)
- `packages/api/src/roles.types.ts` (NEW)
- `packages/api/src/database.types.ts` (MODIFIED — generated from migration)
- `packages/api/src/entry.ts` (MODIFIED — re-exports new types)

**UI Components (`packages/ui/`):**
- `src/components/ui/button.tsx` (NEW — shadcn)
- `src/components/ui/card.tsx` (NEW — shadcn)
- `src/components/ui/field.tsx` (NEW — shadcn)
- `src/components/ui/input.tsx` (NEW — shadcn)
- `src/components/ui/label.tsx` (NEW — shadcn)
- `src/components/ui/separator.tsx` (NEW — shadcn)
- `src/components/ui/sheet.tsx` (NEW — shadcn)
- `src/components/ui/sidebar.tsx` (NEW — shadcn)
- `src/components/ui/skeleton.tsx` (NEW — shadcn)
- `src/components/ui/tooltip.tsx` (NEW — shadcn)
- `src/hooks/use-mobile.ts` (NEW — shadcn dependency)
