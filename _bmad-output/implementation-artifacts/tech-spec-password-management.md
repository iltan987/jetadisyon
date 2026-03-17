---
title: 'Password Management — Self-Service Change, Forgot Password & Admin Reset'
slug: 'password-management'
created: '2026-03-17'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'NestJS 11', 'Supabase Auth', 'React Email', 'Nodemailer', 'Zod v4', 'shadcn/ui v4 (base-nova)', 'Tailwind v4', 'lucide-react']
files_to_modify: ['packages/emails/src/password-reset.tsx', 'packages/emails/package.json', 'apps/api/src/auth/auth.module.ts', 'apps/api/src/auth/auth.controller.ts', 'apps/api/src/auth/auth.service.ts', 'apps/api/src/auth/dto/forgot-password.dto.ts', 'apps/api/src/auth/dto/reset-password.dto.ts', 'apps/api/src/mail/mail.service.ts', 'apps/web/src/app/change-password/layout.tsx', 'apps/web/src/app/(auth)/login/page.tsx', 'apps/web/src/app/(auth)/forgot-password/page.tsx', 'apps/web/src/app/auth/reset-password/route.ts', 'apps/web/src/app/auth/reset-password-expired/page.tsx', 'apps/web/src/app/reset-password/page.tsx', 'apps/web/src/app/reset-password/layout.tsx', 'apps/web/src/app/(tenant)/_components/user-menu.tsx', 'apps/web/src/app/(tenant)/_components/tenant-nav.tsx', 'packages/api/src/auth.types.ts']
code_patterns: ['@Public() + @Throttle() for public rate-limited endpoints', 'ZodValidationPipe for DTO validation', 'generateLink() + MailService for custom emails', 'Layout-based server component guards (authoritative)', 'supabase.auth.verifyOtp() for token exchange in route handlers', '{data: {...}} response wrapper', 'user_metadata flags set to null to clear', 'shadcn NavUser dropdown pattern for user menu']
test_patterns: ['Jest unit tests for services co-located as *.spec.ts']
---

# Tech-Spec: Password Management — Self-Service Change, Forgot Password & Admin Reset

**Created:** 2026-03-17

## Overview

### Problem Statement

Users who forget their password have no way to recover their account — it's effectively locked. There is no self-service password change accessible outside the forced `must_change_password` flow, and admins have no mechanism to reset user passwords or force a password change for security reasons.

### Solution

Implement three password management capabilities:

1. **Voluntary self-service password change** — Lift the `/change-password` layout guard so any authenticated user can access it; add a `UserMenu` dropdown in the header nav with "Şifremi Değiştir" for discoverability.
2. **Forgot password flow** — "Şifremi Unuttum" link on login page → public `POST /auth/forgot-password` → `generateLink(type: 'recovery')` → custom password reset email via `packages/emails` → `/auth/reset-password` route handler exchanges token → `/reset-password` page to set new password.
3. **Admin-initiated password reset** — Two options: (a) send reset email (triggers same recovery flow as forgot password), (b) force password change (sets `must_change_password=true`, user locked out until they change on next login). Platform admin can target any user; tenant owner can target their staff/employees (not other owners).

### Scope

**In Scope:**

- Lift the `/change-password` layout guard — allow any authenticated user, not just `must_change_password=true`
- `UserMenu` dropdown in header nav with "Şifremi Değiştir" + "Çıkış Yap" items
- Forgot password flow end-to-end: link on login → API → email → token exchange → reset page
- `PasswordResetEmail` template in `packages/emails/src/password-reset.tsx`
- `sendPasswordResetEmail()` in `MailService`
- `POST /auth/forgot-password` — public, rate-limited (3/15 min), always returns success
- `POST /auth/reset-password` — authenticated, accepts newPassword + confirmPassword (no current password)
- `POST /auth/admin/users/:userId/send-reset-email` — admin or owner, triggers recovery email
- `POST /auth/admin/users/:userId/force-password-change` — admin or owner, sets `must_change_password=true`
- Authorization: platform admin → any user; tenant owner → their staff/employees only (not other owners)
- Edge cases: non-existent email (no leak), `invitation_pending=true` (silently skip email), rate limiting

**Out of Scope:**

- Settings/profile page
- Staff management UI (Story 1.5 — tenant owner UI for admin reset will come with that)
- Password complexity rules beyond current min 8 chars
- Password history/reuse prevention
- Account deletion

---

## Context for Development

### Codebase Patterns

- **Auth endpoints**: `@Public()` skips `SupabaseAuthGuard`; `@Throttle({ default: { limit: N, ttl: minutes(M) } })` for rate limiting; `@CurrentUser() user: User` extracts authenticated user from JWT; `ZodValidationPipe` validates DTOs.
- **Supabase clients**: `supabaseService.getClient()` = admin/service-role (bypass RLS); `supabaseService.createAuthClient()` = user-facing signIn/signOut/refresh; `supabaseService.getClientForUser(accessToken)` = user-scoped RLS client.
- **Email sending**: `generateLink()` → extract `linkData.properties.hashed_token` → construct URL as `${this.appUrl}/auth/<route>?token_hash=${hashed_token}&type=<type>` → call `MailService.send*Email()` → React Email `render()` produces HTML → Nodemailer sends. `appUrl` = `this.config.get('APP_URL', 'http://localhost:3001')` (already used in `TenantsService`).
- **Password metadata flags**: Stored in `user_metadata` (e.g., `must_change_password`, `invitation_pending`). Set via `auth.admin.updateUserById(id, { user_metadata: { flag: true } })`. Clear by setting to `null`.
- **JWT custom claims**: Flags injected into access token via Supabase hook. `must_change_password` claim only present when `true`.
- **Frontend guards**: Server component layouts read claims via `getClaims()` from `@/lib/supabase/server.ts` and redirect before render. `(tenant)/layout.tsx` is the authoritative guard for the app.
- **Route handler token exchange** (critical pattern from `auth/accept-invite/route.ts`): Create `NextResponse.redirect()` FIRST, wire `createServerClient` to that response's cookies, call `supabase.auth.verifyOtp()`, return the redirect (session cookies are set on it). Do NOT use `createClient()` from `server.ts` — `next/headers` cookies don't propagate to redirect responses.
- **Response format**: `{ data: { ... } }` for success; `{ error: { code, message } }` for errors.
- **User nav**: Horizontal header in `tenant-nav.tsx` has inline email + logout button (right side). Replace with `UserMenu` using shadcn `DropdownMenu` pattern (see sidebar-07 `NavUser` component). Trigger = email/initials button, `side="bottom"`, `align="end"`.
- **packages/emails exports**: No `index.ts`. Each template is a separate export entry in `package.json` `exports` field. Import as `@repo/emails/password-reset`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `apps/api/src/auth/auth.controller.ts` | Add 4 new endpoints — follow exact decorator + pipe patterns |
| `apps/api/src/auth/auth.service.ts` | Add 4 new methods — follow existing error handling + Supabase patterns |
| `apps/api/src/auth/dto/change-password.dto.ts` | Zod DTO + SYNC comment pattern to replicate |
| `apps/api/src/mail/mail.service.ts` | Add `sendPasswordResetEmail()` — mirror `sendInvitationEmail()` |
| `apps/api/src/tenants/tenants.service.ts` | `generateLink()` + `hashed_token` + URL construction reference |
| `packages/emails/src/invitation.tsx` | React Email template structure to replicate |
| `packages/emails/package.json` | Add new `./password-reset` export entry |
| `apps/web/src/app/auth/accept-invite/route.ts` | Route handler token exchange pattern — replicate exactly |
| `apps/web/src/app/change-password/layout.tsx` | Guard to modify (remove `must_change_password` restriction) |
| `apps/web/src/app/change-password/page.tsx` | Existing form for reference — reset-password page is similar |
| `apps/web/src/app/(auth)/login/page.tsx` | Add "Şifremi Unuttum" link |
| `apps/web/src/app/(tenant)/_components/tenant-nav.tsx` | Replace right-side email+logout with `<UserMenu />` |
| `packages/api/src/auth.types.ts` | Add shared request types |

### Technical Decisions

- **Recovery links**: `generateLink(type: 'recovery', email)` → `linkData.properties.hashed_token` → URL: `${appUrl}/auth/reset-password?token_hash=${hashed_token}&type=recovery`. Same pattern as invitation. `APP_URL` env var already configured.
- **Email enumeration prevention**: `POST /auth/forgot-password` always returns `{ data: { message: 'If an account exists, a reset email was sent' } }` — never reveal if email exists or not. Same for invitation_pending case (silently skip).
- **Reset password — AMR check required**: `POST /auth/reset-password` takes `newPassword + confirmPassword` (no current password). To prevent a hijacked regular session from calling this endpoint, the service must verify the session was established via OTP/magic-link. Supabase injects an `amr` (Authentication Method Reference) array into the JWT: `[{method: 'otp', timestamp: ...}]` when authenticated via `verifyOtp()`. The controller extracts the raw Bearer token via `@Headers('authorization')`, strips the `Bearer ` prefix, decodes the JWT payload (base64, no re-verification needed since `SupabaseAuthGuard` already validated it), and passes `accessToken` to the service. The service checks `payload.amr?.some(a => a.method === 'otp')` — if false, throws `ForbiddenException({ code: 'AUTH.RECOVERY_SESSION_REQUIRED', message: 'Password reset requires authentication via a recovery link' })`. Clears `must_change_password` flag on success.
- **Admin authorization**: Handled in `AuthService` methods. `system_role === 'admin'` → any target. `tenant_role === 'owner'` → target must have a `tenant_memberships` row with matching `tenant_id` and role NOT 'owner'. Otherwise throw `ForbiddenException`.
- **packages/emails new template**: Add `"./password-reset": "./dist/password-reset.js"` to `exports` in `packages/emails/package.json`, matching the existing `"./invitation"` entry format exactly (plain string, not object). TypeScript auto-resolves the adjacent `.d.ts` file from the same dist path.
- **Change-password guard**: Remove only the `must_change_password` check. Keep the unauthenticated redirect. The page already adapts its UI via `useAuth().mustChangePassword`.
- **UserMenu component**: New file `apps/web/src/app/(tenant)/_components/user-menu.tsx`. Uses `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuItem` from `@repo/ui`. Button trigger shows user email (truncated) + `ChevronDownIcon`. Items: "Şifremi Değiştir" (LockKeyholeIcon) → `router.push('/change-password')`, separator, "Çıkış Yap" (LogOutIcon) → `signOut()`.
- **AuthModule update**: Must import `MailModule` so `MailService` can be injected into `AuthService`. `ConfigModule` is already globally available.

---

## Implementation Plan

### Tasks

**Group 1 — Backend Foundation**

- [ ] **T1: Create password reset email template**
  - File (create): `packages/emails/src/password-reset.tsx`
  - Action: Create React Email template modelled after `invitation.tsx`. Props: `{ resetLink: string }`. Export `PasswordResetEmail` component and `async renderPasswordResetEmail(props)` function. Subject/copy (Turkish): "Şifre sıfırlama bağlantısı geçerlilik süresi 1 saattir." Button text: "Şifremi Sıfırla".
  - File (modify): `packages/emails/package.json`
  - Action: Add to `exports`: `"./password-reset": "./dist/password-reset.js"`. Also update `main` and `types` if needed to keep them pointing to `invitation` (they're the current entry).

- [ ] **T2: Add `sendPasswordResetEmail()` to MailService**
  - File (modify): `apps/api/src/mail/mail.service.ts`
  - Action: Import `renderPasswordResetEmail` from `@repo/emails/password-reset`. Add method:
    ```ts
    async sendPasswordResetEmail(to: string, resetLink: string) {
      const html = await renderPasswordResetEmail({ resetLink });
      await this.transporter.sendMail({
        from: this.from, to,
        subject: 'JetAdisyon - Şifre Sıfırlama',
        html,
      });
      this.logger.info({ to }, 'Password reset email sent');
    }
    ```

- [ ] **T3: Create `ForgotPasswordDto` and `ResetPasswordDto`**
  - File (create): `apps/api/src/auth/dto/forgot-password.dto.ts`
    ```ts
    export const forgotPasswordSchema = z.object({
      email: z.string().email({ error: 'Invalid email address' }),
    });
    export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
    ```
  - File (create): `apps/api/src/auth/dto/reset-password.dto.ts`
    ```ts
    // SYNC: Frontend mirrors this at apps/web/src/app/reset-password/page.tsx
    export const resetPasswordSchema = z.object({
      newPassword: z.string().min(8, { error: 'Password must be at least 8 characters' }),
      confirmPassword: z.string().min(8, { error: 'Password must be at least 8 characters' }),
    }).refine((d) => d.newPassword === d.confirmPassword, {
      message: 'Passwords do not match', path: ['confirmPassword'],
    });
    export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
    ```

- [ ] **T4: Add new methods to `AuthService`**
  - File (modify): `apps/api/src/auth/auth.service.ts`
  - Action: Inject `MailService` and `ConfigService` in constructor. Resolve `appUrl = config.get('APP_URL', 'http://localhost:3001')` in constructor.
  - Add `async forgotPassword(dto: ForgotPasswordDto)`:
    1. Call `getClient().auth.admin.generateLink({ type: 'recovery', email: dto.email })`
    2. If error AND `error.status >= 500 || error.status === 0` → throw `InternalServerErrorException({ code: 'AUTH.SERVICE_UNAVAILABLE', message: 'Authentication service temporarily unavailable' })` (do NOT swallow infrastructure failures)
    3. If any other error (user not found, etc.) → log debug, return success response (no email leak)
    4. If `linkData.user.user_metadata?.invitation_pending === true` → log debug, return success (silently skip — user needs to accept invitation first)
    5. Call private `sendRecoveryEmail(dto.email, linkData.properties.hashed_token)` (best-effort, catch and log errors)
    6. Return `{ data: { message: 'If an account exists, a reset email was sent' } }`
  - Add `async resetPassword(userId: string, email: string, accessToken: string, dto: ResetPasswordDto)`:
    1. **AMR check**: Decode JWT payload: `JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString())`. Check `payload.amr?.some((a: {method: string}) => a.method === 'otp')`. If false → throw `ForbiddenException({ code: 'AUTH.RECOVERY_SESSION_REQUIRED', message: 'Password reset requires authentication via a recovery link' })`
    2. `getClient().auth.admin.updateUserById(userId, { password: dto.newPassword, user_metadata: { must_change_password: null } })`
    3. If error → throw `InternalServerErrorException({ code: 'AUTH.PASSWORD_RESET_FAILED', message: 'Failed to reset password' })`
    4. Re-authenticate: `createAuthClient().auth.signInWithPassword({ email, password: dto.newPassword })` (old session is invalidated after password change)
    5. If re-auth error → log warn, return `{ data: { message: 'Password reset', accessToken: null, refreshToken: null } }`
    6. Return `{ data: { message: 'Password reset successfully', accessToken, refreshToken } }`
  - Add `async adminSendResetEmail(requestingUser: User, targetUserId: string)`:
    1. `getClient().auth.admin.getUserById(targetUserId)` — if error or no user → throw `NotFoundException({ code: 'AUTH.USER_NOT_FOUND', message: 'User not found' })`
    2. Call private `authorizeAdminAction(requestingUser, targetUserId)` — throws if unauthorized
    3. If `targetUser.user_metadata?.invitation_pending === true` → throw `BadRequestException({ code: 'AUTH.INVITATION_PENDING', message: 'User has not set their initial password yet. Resend invitation instead.' })`
    4. Call private `sendRecoveryEmail(targetUser.email, ...)` — generate fresh recovery link + send email
    5. Return `{ data: { message: 'Password reset email sent' } }`
    - Note: Step 4 generates a NEW recovery link for the target user rather than delegating to `forgotPassword()` to avoid the DTO / enumeration-prevention logic designed for public endpoints.
  - Add `async adminForcePasswordChange(requestingUser: User, targetUserId: string)`:
    1. `getClient().auth.admin.getUserById(targetUserId)` — if error or no user → throw `NotFoundException({ code: 'AUTH.USER_NOT_FOUND', message: 'User not found' })`
    2. Call private `authorizeAdminAction(requestingUser, targetUserId)` — throws if unauthorized
    3. `getClient().auth.admin.updateUserById(targetUserId, { user_metadata: { must_change_password: true } })`
    4. If error → throw `InternalServerErrorException({ code: 'AUTH.FORCE_RESET_FAILED', message: 'Failed to force password change' })`
    5. `logger.info({ requestingUserId: requestingUser.id, targetUserId }, 'Force password change set')`
    6. Return `{ data: { message: 'User will be required to change password on next login' } }`
  - Add `private async authorizeAdminAction(requestingUser: User, targetUserId: string)`:
    - If `requestingUser.app_metadata.system_role === 'admin'` → return (allowed for any user)
    - If `requestingUser.app_metadata.tenant_role === 'owner'`:
      - `ownerTenantId = requestingUser.app_metadata.tenant_id`
      - Query `supabaseService.getClient().from('tenant_memberships').select('role').eq('user_id', targetUserId).eq('tenant_id', ownerTenantId).single()`
      - If no row found → throw `ForbiddenException({ code: 'AUTH.FORBIDDEN', message: 'You can only reset passwords for users in your tenant' })`
      - If `row.role === 'owner'` → throw `ForbiddenException({ code: 'AUTH.FORBIDDEN', message: 'You cannot reset the password of another owner' })`
      - Return (allowed)
    - Otherwise → throw `ForbiddenException({ code: 'AUTH.FORBIDDEN', message: 'Insufficient permissions' })`
  - Add `private async sendRecoveryEmail(email: string, hashedToken: string)`:
    - Build: `resetLink = \`${this.appUrl}/auth/reset-password?token_hash=${hashedToken}&type=recovery\``
    - `await this.mailService.sendPasswordResetEmail(email, resetLink)` (caller handles best-effort try/catch)

- [ ] **T5: Update `AuthModule` to import `MailModule`**
  - File (modify): `apps/api/src/auth/auth.module.ts`
  - Action: Add `MailModule` to the `imports` array so `MailService` is injectable in `AuthService`.

- [ ] **T6: Add new endpoints to `AuthController`**
  - File (modify): `apps/api/src/auth/auth.controller.ts`
  - Action: Add the following 4 endpoints (import new DTOs + schemas):
    ```ts
    @Post('forgot-password')
    @Public()
    @Throttle({ default: { limit: 3, ttl: minutes(15) } })
    async forgotPassword(
      @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto,
    ) {
      return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @Throttle({ default: { limit: 5, ttl: minutes(15) } })
    async resetPassword(
      @CurrentUser() user: User,
      @Headers('authorization') authHeader: string,
      @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
    ) {
      if (!user.email) throw new UnauthorizedException({ code: 'AUTH.USER_NOT_FOUND', message: 'User email not available' });
      const accessToken = authHeader?.replace('Bearer ', '') ?? '';
      return this.authService.resetPassword(user.id, user.email, accessToken, dto);
    }

    @Post('admin/users/:userId/send-reset-email')
    async adminSendResetEmail(
      @CurrentUser() user: User,
      @Param('userId') userId: string,
    ) {
      return this.authService.adminSendResetEmail(user, userId);
    }

    @Post('admin/users/:userId/force-password-change')
    async adminForcePasswordChange(
      @CurrentUser() user: User,
      @Param('userId') userId: string,
    ) {
      return this.authService.adminForcePasswordChange(user, userId);
    }
    ```
  - Notes: Import `Param` and `Headers` from `@nestjs/common`. No `@Roles()` decorator — authorization is handled in service methods.

- [ ] **T7: Update shared auth types**
  - File (modify): `packages/api/src/auth.types.ts`
  - Action: Add two interfaces:
    ```ts
    export interface ForgotPasswordRequest {
      email: string;
    }
    export interface ResetPasswordRequest {
      newPassword: string;
      confirmPassword: string;
    }
    ```

---

**Group 2 — Frontend: Recovery Flow**

- [ ] **T8: Create `/auth/reset-password` route handler (token exchange)**
  - File (create): `apps/web/src/app/auth/reset-password/route.ts`
  - Action: Mirror `apps/web/src/app/auth/accept-invite/route.ts` exactly, with these differences:
    - Validate `type === 'recovery'` (not `'invite'`)
    - Error redirect: `/auth/reset-password-expired` (not `/auth/invite-expired`)
    - Success redirect: `/reset-password` (not `/set-password`)
    - `verifyOtp({ token_hash: tokenHash, type: 'recovery' })`
  - Critical: Create `NextResponse.redirect(redirectUrl)` FIRST, then wire `createServerClient` cookies to the response, then call `verifyOtp`. Return the redirect response — session cookies are written onto it.
  - **Session conflict guard**: Before calling `verifyOtp()`, check if an existing session is already present (`await supabase.auth.getSession()`). If a session exists (a different or same user is already logged in), call `await supabase.auth.signOut()` first. This prevents a recovery link clicked on a shared browser from silently overwriting a logged-in user's session without their awareness. The recovery flow always starts from a clean authentication state.

- [ ] **T9: Create `/auth/reset-password-expired` error page**
  - File (create): `apps/web/src/app/auth/reset-password-expired/page.tsx`
  - Action: Simple server component. Shows Turkish error message: "Şifre sıfırlama bağlantısının süresi dolmuş veya geçersiz." with a link to `/forgot-password` ("Yeni bağlantı iste").

- [ ] **T10: Create `/reset-password` page + layout**
  - File (create): `apps/web/src/app/reset-password/layout.tsx`
    - Server component guard
    - Import `getClaims` (or `getUser`) from `@/lib/supabase/server.ts`
    - If no auth → redirect to `/login`
    - Otherwise render `{children}`
  - File (create): `apps/web/src/app/reset-password/page.tsx`
    - Client component (mirror structure of `change-password/page.tsx`)
    - Fields: `newPassword`, `confirmPassword` — **no** `currentPassword`
    - Zod schema (SYNC comment for backend `reset-password.dto.ts`):
      ```ts
      // SYNC: Mirrors apps/api/src/auth/dto/reset-password.dto.ts (Turkish error messages)
      const schema = z.object({
        newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
        confirmPassword: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
      }).refine((d) => d.newPassword === d.confirmPassword, {
        message: 'Şifreler eşleşmiyor', path: ['confirmPassword'],
      });
      ```
    - On submit: `POST /auth/reset-password` via `apiClient`
    - On success: call `supabase.auth.setSession({ access_token, refresh_token })` from response, then `router.replace('/dashboard')`
    - On error: show error message (same error display pattern as `change-password/page.tsx`)

---

**Group 3 — Frontend: Forgot Password Page**

- [ ] **T11: Create `/forgot-password` page**
  - File (create): `apps/web/src/app/(auth)/forgot-password/page.tsx`
  - Action: Client component (inside `(auth)` group — authenticated users are redirected away by `(auth)/layout.tsx`)
  - Form with single `email` field
  - Zod schema: `z.object({ email: z.string().min(1, 'E-posta gereklidir').email('Geçerli bir e-posta girin') })`
  - Submit: `POST /auth/forgot-password` via `apiClient` (public endpoint, no auth token needed — use `apiClient` without Bearer header or add support for unauthenticated calls)
  - After submit (success OR error): switch to success state. Show: "E-postanıza şifre sıfırlama bağlantısı gönderdik. Gelen kutunuzu kontrol edin." — always show this message regardless of API outcome (no email leak).
  - Include link back to login: "Giriş sayfasına dön"

- [ ] **T12: Add "Şifremi Unuttum" link to login page**
  - File (modify): `apps/web/src/app/(auth)/login/page.tsx`
  - Action: Add a link below the password field (or between password and submit button):
    ```tsx
    <div className="flex justify-end">
      <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
        Şifremi Unuttum
      </Link>
    </div>
    ```

---

**Group 4 — Frontend: Voluntary Password Change**

- [ ] **T13: Lift change-password layout guard**
  - File (modify): `apps/web/src/app/change-password/layout.tsx`
  - Action: Remove the check `if (!claims.must_change_password) redirect('/dashboard')`. Keep only the unauthenticated redirect: `if (!claims) redirect('/login')`. Any authenticated user can now access `/change-password`.
  - Notes: The page already handles both forced and voluntary modes via `useAuth().mustChangePassword` — when forced, the submit redirects with no back-navigation option; when voluntary, the UX can remain the same (the user chose to be there).
  - **Security clarification**: The forced password change flow security is enforced by `(tenant)/layout.tsx` (the authoritative guard), NOT by the `change-password` layout. `(tenant)/layout.tsx` redirects any user with `must_change_password=true` to `/change-password` before rendering any app route. Removing the guard from `change-password/layout.tsx` does not weaken this — the user is still locked out of all `(tenant)` routes. Non-tenant routes (`/forgot-password`, `/reset-password`, `/auth/*`) are intentionally accessible during forced password change, as they are required to complete recovery flows.

- [ ] **T14: Create `UserMenu` component**
  - File (create): `apps/web/src/app/(tenant)/_components/user-menu.tsx`
  - Action: Client component. Based on shadcn `NavUser` pattern (sidebar-07). Structure:
    ```tsx
    'use client';
    // Imports: DropdownMenu + items from @repo/ui, ChevronDownIcon + LockKeyholeIcon + LogOutIcon from lucide-react
    // useAuth() for user + signOut
    // useRouter() for navigation

    export function UserMenu() {
      const { user, signOut } = useAuth();
      const router = useRouter();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <span className="max-w-[160px] truncate text-sm">{user?.email}</span>
              <ChevronDownIcon className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm truncate text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/change-password')}>
              <LockKeyholeIcon className="mr-2 h-4 w-4" />
              Şifremi Değiştir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOutIcon className="mr-2 h-4 w-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    ```

- [ ] **T15: Replace inline user controls in `TenantNav` with `UserMenu`**
  - File (modify): `apps/web/src/app/(tenant)/_components/tenant-nav.tsx`
  - Action: Remove the `<div className="ml-auto flex items-center gap-2">` block (email span + logout Button). Replace with `<div className="ml-auto"><UserMenu /></div>`. Import `UserMenu` from `./user-menu`. Remove `LogOutIcon` import and the `signOut` destructure from `useAuth()` (if no longer used elsewhere in the component). Keep `useAuth()` import if `user` is still used for nav filtering.

---

### Acceptance Criteria

**Forgot Password Flow**

- [ ] **AC1:** Given a user on the login page, when they look at the form, then a "Şifremi Unuttum" link is visible below the password field.
- [ ] **AC2:** Given a user clicks "Şifremi Unuttum", when the forgot-password page loads, then an email input form is shown (unauthenticated users only; authenticated users are redirected away by `(auth)/layout.tsx`).
- [ ] **AC3:** Given a user submits a valid email that exists in the system, when the form is submitted, then a password reset email is received with a valid reset link, and the page shows a generic success message.
- [ ] **AC4:** Given a user submits an email that does NOT exist, when the form is submitted, then the page shows the same generic success message (no indication whether email exists).
- [ ] **AC5:** Given a user submits an email for an account with `invitation_pending=true`, when the form is submitted, then the page shows the generic success message and NO reset email is sent.
- [ ] **AC6:** Given a user submits the forgot-password form more than 3 times within 15 minutes, when the 4th request is made, then a 429 Too Many Requests error is returned.
- [ ] **AC7:** Given a user clicks the reset link in the email, when the route handler processes the `token_hash`, then the user's session is established and they are redirected to `/reset-password`.
- [ ] **AC8:** Given a user clicks an expired or invalid reset link, when the route handler processes it, then the user is redirected to `/auth/reset-password-expired` which shows an error message and a link to `/forgot-password`.
- [ ] **AC9:** Given a user is on the `/reset-password` page with a valid session, when they submit a valid new password + matching confirmation, then their password is updated, session is refreshed with new tokens, and they are redirected to `/dashboard`.
- [ ] **AC10:** Given a user submits mismatched passwords on the `/reset-password` page, when the form is validated, then a "Şifreler eşleşmiyor" error is shown inline.
- [ ] **AC11:** Given a user with `must_change_password=true` resets their password via the recovery flow, when `POST /auth/reset-password` completes, then `must_change_password` is cleared from their metadata and they are not redirected to `/change-password`.
- [ ] **AC11b:** Given an authenticated user with a normal password-login session (not a recovery session) calls `POST /auth/reset-password`, when the AMR check runs, then a 403 Forbidden is returned with code `AUTH.RECOVERY_SESSION_REQUIRED`.

**Voluntary Password Change**

- [ ] **AC12:** Given an authenticated user in the tenant app, when they look at the header, then a user menu dropdown is visible showing their email.
- [ ] **AC13:** Given a user opens the user menu, when they see the dropdown, then "Şifremi Değiştir" and "Çıkış Yap" items are present.
- [ ] **AC14:** Given a user clicks "Şifremi Değiştir" in the user menu, when the navigation occurs, then they land on `/change-password` page.
- [ ] **AC15:** Given an authenticated user navigates directly to `/change-password` (without `must_change_password=true`), when the page loads, then it renders successfully (no redirect to dashboard).
- [ ] **AC16:** Given an unauthenticated user navigates to `/change-password`, when the page layout guard runs, then they are redirected to `/login`.
- [ ] **AC17:** Given a user with `must_change_password=true` in the tenant layout, when the guard checks claims, then they are still redirected to `/change-password` (existing forced flow unaffected).

**Admin Reset**

- [ ] **AC18:** Given a platform admin calls `POST /auth/admin/users/:userId/send-reset-email`, when the user exists without a pending invitation, then a password reset email is sent to the target user and `{ data: { message: '...' } }` is returned.
- [ ] **AC19:** Given a platform admin calls `POST /auth/admin/users/:userId/force-password-change`, when the call succeeds, then the target user's `must_change_password` is set to `true` and on their next login they are blocked from the app until they change their password.
- [ ] **AC20:** Given a tenant owner calls `POST /auth/admin/users/:userId/send-reset-email` for a user in their tenant (staff or employee), when the call is made, then it succeeds and a reset email is sent.
- [ ] **AC21:** Given a tenant owner calls `POST /auth/admin/users/:userId/send-reset-email` for a user in a DIFFERENT tenant, when the call is made, then a 403 Forbidden is returned.
- [ ] **AC22:** Given a tenant owner calls `POST /auth/admin/users/:userId/send-reset-email` for another owner in the same tenant, when the call is made, then a 403 Forbidden is returned.
- [ ] **AC23:** Given a staff or employee user calls any `admin` endpoint, when the call is made, then a 403 Forbidden is returned.
- [ ] **AC24:** Given a platform admin calls `POST /auth/admin/users/:userId/send-reset-email` for a user with `invitation_pending=true`, when the call is made, then a 400 Bad Request with code `AUTH.INVITATION_PENDING` is returned.

---

## Additional Context

### Dependencies

- `packages/emails` must be built (run `pnpm build` in `packages/emails`) after adding the new template, before the API can import it.
- `MailModule` must be imported in `AuthModule` — check if `MailModule` is already a global module or needs explicit import.
- No new npm packages required — all dependencies already exist.
- No database migrations required — `must_change_password` flag already stored in `user_metadata` and injected via existing JWT hook.

### Testing Strategy

**Unit tests (AuthService)**
- `forgotPassword()`: mock `getClient().auth.admin.generateLink` — test (1) non-existent user returns success, (2) `invitation_pending=true` returns success without sending email, (3) valid user generates link and sends email.
- `adminForcePasswordChange()`: test (1) admin can force any user, (2) owner can force staff in same tenant, (3) owner cannot force user in different tenant (throws 403), (4) owner cannot force another owner (throws 403).
- `authorizeAdminAction()`: unit test all 4 authorization paths.

**Manual testing checklist**
1. Forgot password with real email → check Supabase local inbox (port 54325 Inbucket)
2. Click link in email → verify redirect to `/reset-password` with session
3. Submit new password → verify redirect to `/dashboard` with working session
4. Click expired link → verify redirect to `/reset-password-expired`
5. Navigate to `/change-password` while logged in (no `must_change_password`) → verify page loads
6. Open user menu → verify "Şifremi Değiştir" navigates to `/change-password`
7. Admin: `POST /auth/admin/users/:userId/force-password-change` → log in as that user → verify redirect to `/change-password`
8. AMR check: log in normally → call `POST /auth/reset-password` with Bearer token → verify 403 with `AUTH.RECOVERY_SESSION_REQUIRED`
9. Recovery link on browser with active session: log in as user A, click recovery link for user A → verify old session is signed out before new recovery session is established

### Notes

- **AMR security model for `POST /auth/reset-password`**: The endpoint does not require the current password because the user in the forgot-password flow has forgotten it. Authentication is proved via email ownership (recovery link). The AMR check (`amr: [{method: 'otp'}]` in JWT) ensures the session was established via `verifyOtp()`, not via a normal password login. This prevents a normal logged-in session (e.g., on a shared computer) from calling reset-password without the current password. What AMR does NOT protect: a stolen recovery session (an attacker who intercepts the recovery email or steals the cookie after the user clicks the link). This is the accepted security boundary for web password recovery — email ownership is the authentication factor.
- **Abandoned `/reset-password` session**: If a user receives a recovery email, clicks the link (establishing a session), then abandons the `/reset-password` form without submitting — they are now logged into their account. This is intentional and acceptable behavior: the recovery link is functionally equivalent to a magic-link login. The session expires normally. No special handling needed.
- **Admin UI for tenant owners**: The `adminSendResetEmail` and `adminForcePasswordChange` endpoints are ready now but there is no tenant owner UI to trigger them. This UI will be built in Story 1.5 (staff management). The platform admin UI location (admin panel) is TBD.
- **`apiClient` and unauthenticated calls**: `POST /auth/forgot-password` is `@Public()` — the `SupabaseAuthGuard` is bypassed entirely, so no Bearer token is required. Before implementing T11, read `apps/web/src/lib/api-client.ts` to verify it sends the request without throwing when no session exists (no `getSession()` call in the request path, or a graceful null-token path). If `apiClient` throws without a session, use a plain `fetch()` call for this specific page only.
- **Email content**: Turkish copy. Subject: "JetAdisyon - Şifre Sıfırlama". Body: indicate the link expires in 1 hour. Match styling of `invitation.tsx` exactly (same Tailwind config, same color scheme).
