# Story 1.3: Tenant Owner Login & Forced Password Reset

Status: done

## Story

As a Tenant Owner,
I want to log in with my provided credentials and set my own password on first login,
So that my account is secure from the start.

## Acceptance Criteria

1. **First login detects forced password change**
   - Given a tenant owner has received initial credentials from the admin
   - When they log in for the first time
   - Then the system detects `must_change_password: true` in user metadata
   - And the owner is redirected to a mandatory password change page before accessing the dashboard

2. **Password change completes successfully**
   - Given the owner is on the password change page
   - When they enter and confirm a new password meeting security requirements (min 8 chars)
   - Then the password is updated via Supabase Auth (bcrypt hashing — NFR6)
   - And the `must_change_password` key is deleted from user_metadata entirely
   - And the owner is redirected to the tenant dashboard

3. **Subsequent logins go directly to dashboard**
   - Given a tenant owner has completed password reset
   - When they log in subsequently
   - Then they are taken directly to the tenant dashboard with the top navigation layout (Dashboard, Analitik, Ayarlar)
   - And the dashboard shows a placeholder/empty state ("Henuz siparis yok")

4. **Logout works correctly**
   - Given a tenant owner or staff member is logged in
   - When they click the logout button
   - Then the session is invalidated on the server, tokens are cleared
   - And the user is redirected to the login page (FR8)

5. **Rate limiting enforced on auth endpoints**
   - Given auth rate limiting is active
   - When more than 5 failed login attempts occur within 15 minutes from the same IP
   - Then the system temporarily blocks further login attempts (NFR11)

## Tasks / Subtasks

### Backend

- [x] Task 1: Create change-password DTO (AC: #2)
  - [x] 1.1 Create `apps/api/src/auth/dto/change-password.dto.ts` with Zod v4 schema
  - [x] 1.2 Fields: `currentPassword` (string, min 8), `newPassword` (string, min 8), `confirmPassword` (string, min 8)
  - [x] 1.3 Add refine: `newPassword === confirmPassword` validation
  - [x] 1.4 Add refine: `newPassword !== currentPassword` (must be different)

- [x] Task 2: Implement AuthService.changePassword() (AC: #1, #2)
  - [x] 2.1 Add `changePassword(userId: string, dto: ChangePasswordDto)` method to `auth.service.ts`
  - [x] 2.2 Verify current password by calling `supabase.auth.signInWithPassword()` with user's email + currentPassword
  - [x] 2.3 Update password via `supabase.auth.admin.updateUserById(userId, { password: newPassword })`
  - [x] 2.4 Clear flag via `supabase.auth.admin.updateUserById(userId, { user_metadata: { must_change_password: null } })`
  - [x] 2.5 Setting a key to `null` in `user_metadata` deletes it from the JSONB object (Supabase behavior)
  - [x] 2.6 Log password change action via PinoLogger (do NOT log the password itself)
  - [x] 2.7 Return `{ data: { message: 'Password changed successfully' } }`

- [x] Task 3: Add change-password endpoint (AC: #2)
  - [x] 3.1 Add `POST /api/v1/auth/change-password` to `auth.controller.ts`
  - [x] 3.2 Requires authentication (global `SupabaseAuthGuard` handles this)
  - [x] 3.3 Apply `@Roles('tenant_owner', 'tenant_staff')` — admins don't use forced reset
  - [x] 3.4 Validate request body with `ZodValidationPipe` + `changePasswordSchema`
  - [x] 3.5 Extract userId from `@CurrentUser()` decorator
  - [x] 3.6 Return 200 on success, error envelope on failure

- [x] Task 4: Update login response to include must_change_password flag (AC: #1)
  - [x] 4.1 In `AuthService.login()`, after successful authentication, check `user.user_metadata.must_change_password`
  - [x] 4.2 Include `mustChangePassword: boolean` in login response alongside tokens
  - [x] 4.3 Update `LoginResponse` type in `packages/api/src/auth.types.ts`

- [x] Task 5: Unit tests (AC: #1, #2)
  - [x] 5.1 Add tests in `auth.service.spec.ts` for `changePassword`:
    - Happy path: valid current password, password updated, flag cleared
    - Wrong current password: returns AUTH.INVALID_CREDENTIALS
    - Supabase updateUser failure: returns AUTH.PASSWORD_UPDATE_FAILED
  - [x] 5.2 Add tests in `auth.controller.spec.ts` for change-password endpoint:
    - Route protection (requires auth)
    - DTO validation (mismatched passwords, same password, too short)
    - Success response format

### Frontend

- [x] Task 6: Create change-password page (AC: #1, #2)
  - [x] 6.1 Create `apps/web/src/app/change-password/page.tsx` (standalone route — (auth) layout redirects authenticated users)
  - [x] 6.2 Form fields: currentPassword (the temp password), newPassword, confirmPassword
  - [x] 6.3 Use react-hook-form + zodResolver with shared change-password schema
  - [x] 6.4 Password requirements indicator (min 8 chars)
  - [x] 6.5 Submit via `apiClient('/auth/change-password', data)` with access token
  - [x] 6.6 On success: show toast, redirect to tenant dashboard `/dashboard`
  - [x] 6.7 On error: display error message (Turkish: "Mevcut sifre yanlis", "Sifre en az 8 karakter olmali")
  - [x] 6.8 Loading state on submit button

- [x] Task 7: Update proxy.ts to enforce forced password change (AC: #1, #3)
  - [x] 7.1 In `updateSession()` in `proxy.ts`, after validating auth, check user metadata
  - [x] 7.2 Use `supabase.auth.getUser()` to get authoritative user data with metadata
  - [x] 7.3 If `user.user_metadata?.must_change_password === true` AND path is NOT `/change-password` AND user is NOT admin → redirect to `/change-password`
  - [x] 7.4 If path IS `/change-password` AND `must_change_password` is NOT true → redirect to dashboard (prevent accessing change-password page unnecessarily)
  - [x] 7.5 IMPORTANT: `getClaims()` may NOT include user_metadata — use `getUser()` only for this specific check
  - [x] 7.6 Performance consideration: `getUser()` makes a DB call. Only call it when the user is authenticated and heading to a non-auth route. Cache the result for the request lifecycle.
  - [x] 7.7 IMPORTANT (post-story change): `proxy.ts` now has `redirectTo(path)` and `redirectToLogin()` helpers with `?next=` return-path support. Reuse `redirectTo('/change-password')` instead of creating a new redirect. Do NOT use `redirectToLogin()` for the forced password change redirect — it appends `?next=` which would cause a redirect loop.

- [x] Task 8: Create tenant dashboard placeholder (AC: #3)
  - [x] 8.1 Create `apps/web/src/app/(tenant)/layout.tsx` with top navigation (Dashboard, Analitik, Ayarlar)
  - [x] 8.2 Create `apps/web/src/app/(tenant)/dashboard/page.tsx` with empty state ("Henuz siparis yok")
  - [x] 8.3 Top nav uses `@repo/ui` components (consistent with admin sidebar pattern)
  - [x] 8.4 Dashboard page is a server component that verifies auth
  - [x] 8.5 Restrict nav items based on role: tenant_staff sees Dashboard only (no Analitik, no Ayarlar)

- [x] Task 9: Update auth-provider for password change state (AC: #1)
  - [x] 9.1 In `auth-provider.tsx`, expose `mustChangePassword` from login response
  - [x] 9.2 After successful password change, update local state to `false`
  - [x] 9.3 The provider is used for client-side state; proxy.ts handles server-side enforcement
  - [x] 9.4 IMPORTANT (post-story change): `auth-provider.tsx` sign-out now redirects with `?next=` param. The password change redirect (client-side) should NOT set `?next=` — navigate directly to `/change-password` without return path to avoid loops.

### Shared Types

- [x] Task 10: Update shared types (AC: #2)
  - [x] 10.1 Add `ChangePasswordRequest` type to `packages/api/src/auth.types.ts`
  - [x] 10.2 Update `LoginResponse` to include `mustChangePassword: boolean`
  - [x] 10.3 Error codes defined as inline strings in service (AUTH.INVALID_CREDENTIALS, AUTH.PASSWORD_UPDATE_FAILED)

## Dev Notes

### Post-Story Codebase Changes (added after story creation)

**Commit `e53fc8c`: Return-to-page after login with `?next=` query param**

This feature was added after Story 1.3 was created and affects files this story modifies:

1. **`proxy.ts`** now has `redirectTo(path)` and `redirectToLogin()` helpers. `redirectToLogin()` appends `?next=` with the current path so users return to their intended page after login. Reuse `redirectTo('/change-password')` for the forced password change redirect — do NOT use `redirectToLogin()` as it would create a loop.

2. **`auth-provider.tsx`** sign-out now navigates to `/login?next=<current-path>` for return-to-page. The forced password change client-side redirect should navigate directly to `/change-password` without `?next=`.

3. **`auth.service.ts`** — no structural changes from this commit; the `login()` method is unchanged and the `mustChangePassword` addition (Task 4) remains straightforward.

4. **New file: `apps/web/src/lib/validate-return-path.ts`** — validates `?next=` paths (must start with `/`, no protocol/external URLs). Imported by both `proxy.ts` and `auth-provider.tsx`.

### Critical Architecture Patterns

**Two-Layer Auth Enforcement (established in Story 1.1/1.2):**
- Layer 1: `proxy.ts` → fast first-pass guard using `getClaims()` for route protection
- Layer 2: Server components → authoritative `getUser()` for data fetching
- This story adds a third concern to proxy.ts: forced password change detection
- IMPORTANT: `getClaims()` decodes the JWT but does NOT include `user_metadata` — you MUST use `getUser()` for the `must_change_password` check

**Supabase Auth API for Password Change:**
```typescript
// Verify current password (re-authenticate)
const { error } = await supabase.auth.signInWithPassword({
  email: userEmail,
  password: dto.currentPassword,
});

// Update password (admin API — service role key)
await supabase.auth.admin.updateUserById(userId, {
  password: dto.newPassword,
});

// Clear must_change_password flag (setting to null deletes the key)
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: { must_change_password: null },
});
```

**Why use admin API for password update:**
- The backend uses the service role key (already configured in `SupabaseService`)
- `auth.admin.updateUserById()` doesn't require the user's current session on the server
- The user is authenticated via JWT (validated by `SupabaseAuthGuard`), so we know who they are
- We verify their current password separately via `signInWithPassword()` for security

**must_change_password Flag Lifecycle:**
1. Story 1.2 sets `must_change_password: true` during `auth.admin.createUser()` in `TenantsService.createTenant()`
2. This story detects the flag in `proxy.ts` and enforces redirect to `/change-password`
3. After password change, flag is deleted (set to `null` in JSONB) via `auth.admin.updateUserById()`
4. JWT is reissued on next login/refresh — the `custom_access_token_hook` is unaffected (it reads from `profiles` + `tenant_memberships`, not `user_metadata`)

**Login Response Update:**
- Currently `AuthService.login()` returns `{ accessToken, refreshToken, user: { id, email, role, tenantId } }`
- Add `mustChangePassword: boolean` to the response so the frontend can immediately redirect without waiting for proxy.ts
- Read from `data.user.user_metadata?.must_change_password ?? false`

**Error Codes to Use:**
- `AUTH.INVALID_CREDENTIALS` — wrong current password during change
- `AUTH.PASSWORD_UPDATE_FAILED` — Supabase updateUser failed
- `AUTH.WEAK_PASSWORD` — password doesn't meet requirements (if Supabase rejects)

**Rate Limiting:**
- `@nestjs/throttler` is already configured globally (Story 1.1)
- The `/api/v1/auth/change-password` endpoint is automatically rate-limited
- No additional throttle configuration needed for this endpoint

### Tenant Dashboard Layout

**Top Navigation Structure (from architecture):**
```
[JetAdisyon Logo] [Dashboard] [Analitik] [Ayarlar]  ... [Kullanici Adi ▼] [Cikis]
```

**Route Group: `(tenant)/`**
- `layout.tsx` — Top nav bar + main content area
- `dashboard/page.tsx` — Order feed (empty state for now)
- `analytics/page.tsx` — Future (Epic 7)
- `settings/page.tsx` — Future (Epic 5)

**Staff Role Restriction:**
- tenant_staff sees ONLY Dashboard in the nav (no Analitik, no Ayarlar links)
- Use `user.role` from auth context to conditionally render nav items
- This is "subtraction" — same layout, hidden elements (NOT a separate interface)

### Logout Implementation

**Backend: Already implemented in Story 1.1**
- `POST /api/v1/auth/logout` exists in `auth.controller.ts`
- Calls `supabase.auth.admin.signOut(userId)` — invalidates server-side session

**Frontend: Needs UI**
- Add logout button to tenant layout top nav
- Call `apiClient.post('/api/v1/auth/logout')`
- Clear local Supabase session: `supabase.auth.signOut()`
- Redirect to `/login`
- The `auth-provider.tsx` already has a `signOut` method — wire it to the UI

### Project Structure Notes

**New files to create:**
```
apps/api/src/auth/dto/change-password.dto.ts
apps/web/src/app/(auth)/change-password/page.tsx
apps/web/src/app/(tenant)/layout.tsx
apps/web/src/app/(tenant)/dashboard/page.tsx
```

**Files to modify:**
```
apps/api/src/auth/auth.service.ts          — Add changePassword method
apps/api/src/auth/auth.controller.ts       — Add change-password endpoint
apps/api/src/auth/auth.service.spec.ts     — Add changePassword tests
apps/api/src/auth/auth.controller.spec.ts  — Add change-password route tests
apps/web/src/lib/supabase/proxy.ts         — Add must_change_password detection
apps/web/src/providers/auth-provider.tsx    — Expose mustChangePassword state
apps/web/src/hooks/use-auth.ts             — Expose mustChangePassword
packages/api/src/auth.types.ts             — Add ChangePasswordRequest, update LoginResponse
```

**Files NOT to create (already exist from Story 1.1/1.2):**
```
apps/api/src/auth/auth.module.ts           — Already exists
apps/api/src/auth/auth.controller.ts       — Already exists (modify only)
apps/api/src/auth/auth.service.ts          — Already exists (modify only)
apps/api/src/auth/dto/login.dto.ts         — Already exists (no changes)
apps/web/src/app/(auth)/login/page.tsx     — Already exists (no changes needed)
apps/web/src/app/(auth)/layout.tsx         — Already exists
apps/web/src/lib/supabase/proxy.ts         — Already exists (modify only)
apps/web/src/lib/supabase/client.ts        — Already exists (no changes)
apps/web/src/lib/supabase/server.ts        — Already exists (no changes)
```

**Alignment with unified project structure:**
- `(auth)/change-password/page.tsx` matches architecture plan exactly
- `(tenant)/layout.tsx` and `(tenant)/dashboard/page.tsx` match architecture plan
- Backend follows NestJS co-location: DTOs in `auth/dto/`, tests in `auth/`
- Shared types in `packages/api/src/auth.types.ts` (existing file, extend it)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.3 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & Security section, lines 212-218]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC section, lines 220-224]
- [Source: _bmad-output/planning-artifacts/architecture.md — Rate Limiting, lines 244-249]
- [Source: _bmad-output/planning-artifacts/architecture.md — Next.js routes, lines 862-866]
- [Source: _bmad-output/planning-artifacts/architecture.md — NestJS auth module, lines 743-750]
- [Source: _bmad-output/planning-artifacts/architecture.md — API response format, lines 514-556]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement guidelines, lines 627-638]
- [Source: _bmad-output/planning-artifacts/prd.md — FR2, FR8, FR9, NFR6, NFR10, NFR11]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Onboarding flow, lines 679-714]
- [Source: _bmad-output/implementation-artifacts/1-2-tenant-creation-and-owner-account-setup.md — Dev notes]

### Previous Story Intelligence (Story 1.2)

**Key patterns established that MUST be followed:**
1. **Security:** Always use `supabase.auth.getUser()` (not `getSession()`) for server-side auth validation
2. **Logging:** Use `PinoLogger` (not NestJS `Logger`) in all services
3. **Error handling:** `apiClient` in frontend has try/catch for non-JSON error responses
4. **Cookie handling:** `proxy.ts` uses `includes('-auth-token')` to handle chunked Supabase cookies
5. **Guards are global:** `SupabaseAuthGuard` and `RolesGuard` are registered globally in `app.module.ts`
6. **Forms:** Use react-hook-form + zodResolver + shadcn Field components (NOT manual FormData)
7. **Turkish chars:** Ensure proper encoding for Turkish characters (ş, İ, ç, ö, ü, ğ)
8. **snake_case DB ↔ camelCase API:** Transform at service boundary via SupabaseService
9. **DTO pattern:** Zod schema first, then `z.infer<typeof schema>` for type
10. **Error codes:** `DOMAIN.ACTION_ERROR` format (e.g., `AUTH.INVALID_CREDENTIALS`)
11. **Response envelope:** `{ data: T }` or `{ error: { code, message } }`

**Review feedback from Story 1.2 to avoid repeating:**
- proxy.ts needs app-specific routing rules — don't use generic middleware patterns
- Don't use deprecated `FormEvent` — use react-hook-form
- SupabaseAuthGuard must decode JWT payload (not just getUser()) to access custom hook claims

### Git Intelligence

**Recent commits show:**
- Theme provider and toggle components added (dark/light mode support)
- Tenant management enhanced with access control
- Quotes standardized to single quotes (Prettier convention)
- ESLint/Prettier plugins configured (import sorting, unused imports, a11y, Tailwind sorting)
- AuthService refactored to use `createAuthClient` pattern
- RLS policies refactored for tenants, profiles, memberships

**Patterns to follow:**
- Commit messages: descriptive, no co-author lines
- Code style: single quotes, trailing commas
- All imports sorted by group (side-effects > node: > external > @repo/ > @/ > relative)

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|-------------------|
| `@supabase/supabase-js` | (existing) | `auth.admin.updateUserById()` for password change + flag clear |
| `@supabase/ssr` | (existing) | `getUser()` in proxy.ts for metadata check |
| `react-hook-form` | (existing) | Change password form |
| `@hookform/resolvers/zod` | (existing) | Zod schema validation for form |
| `zod` | v4 (existing) | DTO schema validation (backend + frontend) |
| `@nestjs/throttler` | (existing) | Already configured, auto-applies to new endpoint |
| `sonner` | (existing) | Toast notifications for success/error |

No new dependencies required — all libraries are already installed.

### Testing Requirements

**Backend unit tests (co-located .spec.ts):**
- `auth.service.spec.ts`: Test `changePassword()` — mock SupabaseService
  - Happy path: signInWithPassword succeeds, updateUserById succeeds twice (password + metadata)
  - Wrong current password: signInWithPassword returns error
  - Update fails: updateUserById returns error
- `auth.controller.spec.ts`: Test change-password route
  - Requires authentication (401 without token)
  - Validates DTO (400 for mismatched/short passwords)
  - Returns correct response format

**Frontend manual testing:**
1. Login with tenant owner temp credentials → redirected to /change-password
2. Submit new password → redirected to /dashboard with empty state
3. Login again → goes directly to /dashboard (no password change prompt)
4. Navigate to /change-password directly → redirected to /dashboard (guard prevents unnecessary access)
5. Logout → redirected to /login
6. Staff login (if temp credentials) → same forced password change flow
7. Admin login → no forced password change (admin accounts don't have the flag)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Pre-existing test failure in `roles.guard.spec.ts` (user with no app_metadata) — not related to this story
- Change-password page placed at `/change-password` (standalone route) instead of `/(auth)/change-password` because the `(auth)` layout redirects all authenticated users to `/`
- Fixed existing login test mock that was missing `status` on error object, causing it to hit InternalServerErrorException path instead of UnauthorizedException
- Button component uses `render` prop (base-ui) not `asChild` (radix) for composition

### Completion Notes List

- Backend: `changePassword` endpoint with current password verification, admin API password update, and must_change_password flag clearing
- Backend: Login response now includes `mustChangePassword` boolean from user_metadata
- Backend: PinoLogger added to AuthService for password change audit logging
- Frontend: Change-password page with react-hook-form, zodResolver, Turkish error messages, toast notifications
- Frontend: proxy.ts enforces forced password change via getUser() for non-admin users — redirects to /change-password when flag is true
- Frontend: Tenant dashboard with top navigation bar, role-based nav items (staff sees Dashboard only), logout button
- Frontend: auth-provider exposes mustChangePassword state for client-side enforcement
- Frontend: Login page now routes to /change-password on mustChangePassword, and routes non-admin users to /dashboard
- Frontend: Root page (/) redirects tenant users to /dashboard
- Shared: LoginResponse type updated with mustChangePassword, ChangePasswordRequest type added
- Tests: 4 new changePassword tests in auth.service.spec.ts, 3 new tests in auth.controller.spec.ts (new file)

### File List

**New files:**
- `apps/api/src/auth/dto/change-password.dto.ts`
- `apps/api/src/auth/auth.controller.spec.ts`
- `apps/web/src/app/change-password/page.tsx`
- `apps/web/src/app/change-password/layout.tsx`
- `apps/web/src/app/(tenant)/layout.tsx`
- `apps/web/src/app/(tenant)/dashboard/page.tsx`
- `apps/web/src/app/(tenant)/_components/tenant-nav.tsx`

**Modified files:**
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.spec.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/web/src/lib/supabase/proxy.ts`
- `apps/web/src/providers/auth-provider.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/page.tsx`
- `packages/api/src/auth.types.ts`

### Change Log

- 2026-03-15: Story 1.3 implementation complete — forced password change flow, tenant dashboard, change-password endpoint
- 2026-03-15: Code review complete — 10 issues found (3H/5M/2L), all HIGH and MEDIUM fixed: signOut now calls backend logout, controller tests expanded, forced password check moved from proxy.ts to layouts, Turkish chars fixed, email guard added, root page uses getClaims only
- 2026-03-15: Full project code review — 13 issues found (4H/5M/4L), all HIGH and MEDIUM fixed: atomic password+flag update, wrong-password returns 400 not 401 (prevents auto-signout), router.refresh before navigation after password change, rate-limit on change-password endpoint, session ref in signOut, import sort fix, tenant owner mapping extracted to helper
