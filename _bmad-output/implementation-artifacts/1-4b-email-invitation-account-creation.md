# Story 1.4b: Email Invitation Account Creation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system administrator,
I want account creation to use email invitations instead of temporary passwords,
So that no one (admin or tenant owner) ever knows another user's password, and users can self-recover access via email.

## Acceptance Criteria

1. **Tenant creation sends invitation email instead of displaying temporary password**
   - Given an admin is logged in and submits the tenant creation form
   - When the system creates the tenant and owner account
   - Then a Supabase Auth user is created via `admin.generateLink({ type: 'invite' })` (no password set, no email sent by Supabase)
   - And the system sends an invitation email via Nodemailer to the owner's email address
   - And the email contains a link pointing to the app URL (`{site_url}/auth/accept-invite?token_hash=xxx&type=invite`), NOT a Supabase URL
   - And the API response no longer includes `temporaryPassword`
   - And the admin UI shows "Invitation email sent to {email}" confirmation instead of displaying credentials

2. **Invited user can set their password via the email link**
   - Given a tenant owner received an invitation email
   - When they click the invitation link
   - Then they are directed to the app's `/auth/accept-invite` route handler
   - And the route handler exchanges the token for a session via `supabase.auth.verifyOtp({ token_hash, type: 'invite' })`
   - And the user is redirected to `/set-password` with a valid authenticated session

3. **Set-password page allows password creation without requiring a current password**
   - Given an invited user has been redirected to `/set-password` with a valid session
   - When they enter and confirm a new password meeting security requirements
   - Then the password is set via a backend endpoint that uses `auth.admin.updateUserById()`
   - And the `invitation_pending` metadata flag is cleared
   - And the user receives fresh auth tokens
   - And the user is redirected to the tenant dashboard

4. **Invited users without a password are redirected to /set-password**
   - Given an invited user has a valid session but `invitation_pending: true` in their JWT claims
   - When they attempt to access any app route (e.g., `/dashboard`)
   - Then `(tenant)/layout.tsx` (authoritative guard) detects `invitation_pending === true` and redirects to `/set-password`
   - And proxy.ts provides a first-pass guard with the same redirect (defense in depth)
   - And the custom access token hook injects `invitation_pending` into JWT claims (same pattern as `must_change_password`)

5. **Email infrastructure uses Inbucket in local development**
   - Given the local Supabase stack is running with Inbucket enabled
   - When an invitation email is sent via Nodemailer
   - Then the email is captured by Inbucket and visible at `http://localhost:54324`
   - And `supabase/config.toml` has `smtp_port = 54325` uncommented for Nodemailer SMTP target
   - And no real SMTP server or domain is required for local development

6. **Email module is reusable for future email needs**
   - Given the email infrastructure is created as a NestJS `MailModule`
   - Then it supports sending templated emails via Nodemailer with configurable SMTP settings
   - And React Email templates live in `packages/emails/` as the architecture specifies
   - And the module can be reused by staff invitation (story 1-5), support forms (Epic 8), and license warnings (Epic 8)

7. **Expired invitation tokens are handled gracefully**
   - Given an invitation token has expired (default: 1 hour per `otp_expiry = 3600`)
   - When the user clicks the expired link
   - Then the app displays a clear error message ("This invitation link has expired")
   - And provides guidance to contact their administrator for a new invitation

8. **Backward compatibility with existing must_change_password flow**
   - Given existing users may have `must_change_password: true` from stories 1-2/1-3
   - When those users log in
   - Then the existing `/change-password` flow continues to work unchanged
   - And `(tenant)/layout.tsx` handles both `must_change_password` and `invitation_pending` redirects independently
   - And proxy.ts first-pass guards handle both redirects as defense in depth

9. **Admin can resend invitation for a tenant owner**
   - Given a tenant exists with an owner whose invitation is pending or expired
   - When the admin triggers "Resend Invitation" from the tenant creation success screen or the tenant list
   - Then the system calls `admin.generateLink({ type: 'invite' })` again to get a fresh token
   - And a new invitation email is sent via Nodemailer with the new link
   - And the previous invitation token is implicitly invalidated (Supabase generates a new one)
   - And the admin sees a confirmation: "Invitation email resent to {email}"

## Tasks / Subtasks

### Email Infrastructure (AC: #5, #6)

- [x] Task 1: Create `packages/emails` shared package
  - [x] 1.1 Initialize package with `package.json`, `tsconfig.json` (extends `@repo/typescript-config/react-library.json`). The `package.json` must have: `"name": "@repo/emails"`, `"main": "./dist/invitation.js"`, `"exports": { "./invitation": "./dist/invitation.js" }`, and `"scripts": { "build": "tsc" }` — same build approach as `packages/api`. The tsconfig `outDir` should be `./dist`. NestJS SWC cannot import `.tsx` directly, so the compiled JS output is required.
  - [x] 1.2 Add `react-email` and `@react-email/components` dependencies
  - [x] 1.3 Create `src/invitation.tsx` — invitation email template with "Set Your Password" CTA button and app link
  - [x] 1.4 Export `renderInvitationEmail()` async function that calls `render()` internally and returns an HTML string — NestJS imports this plain TS function, never the JSX component directly

- [x] Task 2: Create NestJS `MailModule` (`apps/api/src/mail/`)
  - [x] 2.0 Add `@repo/emails: workspace:*` to `apps/api/package.json` dependencies, then `pnpm install`
  - [x] 2.1 Use `nest generate module mail` and `nest generate service mail`
  - [x] 2.2 Configure Nodemailer transport via `@nestjs/config` (SMTP host, port, secure, auth)
  - [x] 2.3 Add env vars to `apps/api/src/config/env.validation.ts`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` (optional with defaults for local dev: `localhost`, `54325`, `noreply@jetadisyon.local`)
  - [x] 2.4 Add env vars to `apps/api/.env`: SMTP_HOST=localhost, SMTP_PORT=54325, SMTP_FROM=noreply@jetadisyon.local
  - [x] 2.5 `sendInvitationEmail(to: string, inviteLink: string, tenantName: string)` method — renders React Email template, sends via Nodemailer
  - [x] 2.6 Make `MailModule` global (or export from AppModule) so other modules can inject `MailService`
  - [x] 2.7 Unit tests for `MailService` (mock Nodemailer transport)

- [x] Task 3: Enable Inbucket SMTP port
  - [x] 3.1 Uncomment `smtp_port = 54325` in `supabase/config.toml`

### Backend — Tenant Creation Refactor (AC: #1)

- [x] Task 4: Replace temporary password flow with `generateLink` + email
  - [x] 4.1 In `tenants.service.ts`: replace `auth.admin.createUser()` call with `auth.admin.generateLink({ type: 'invite', email, options: { data: { invitation_pending: true } } })`
  - [x] 4.2 Remove `randomBytes(12).toString('base64url')` temporary password generation
  - [x] 4.3 Extract `hashed_token` and `user.id` from generateLink response
  - [x] 4.4 Build invitation link: `` `${this.appUrl}/auth/accept-invite?token_hash=${hashedToken}&type=invite` ``
  - [x] 4.5 Call `MailService.sendInvitationEmail()` with the link
  - [x] 4.6 Add `APP_URL` env var to `env.validation.ts` (default: `http://localhost:3001`)
  - [x] 4.7 Keep profile + tenant_membership creation unchanged (use user.id from generateLink response)
  - [x] 4.8 Keep cleanup logic: on failure, delete user (cascades), then tenant

- [x] Task 5: Update shared response types
  - [x] 5.1 In `packages/api/src/tenant.types.ts`: replace `credentials: { email, temporaryPassword }` with `invitation: { email: string; sent: boolean }`
  - [x] 5.2 Update `tenants.service.ts` to return new response shape
  - [x] 5.3 Update `tenants.controller.spec.ts` and `tenants.service.spec.ts` for new response

### Backend — Set Initial Password Endpoint (AC: #2, #3)

- [x] Task 6: Create `POST /auth/set-initial-password` endpoint
  - [x] 6.1 New DTO: `SetInitialPasswordDto` — `{ newPassword, confirmPassword }` (NO currentPassword field)
  - [x] 6.2 Controller: `@Post('set-initial-password')`, `@Roles('tenant_owner', 'tenant_staff')` (tenant_staff for future story 1-5 staff invitations), `@Throttle({ default: { limit: 5, ttl: minutes(15) } })`. Uses `@CurrentUser() user: User` to get userId and email.
  - [x] 6.3 Verify user has `invitation_pending: true` in metadata (`user.user_metadata.invitation_pending === true`) — reject with 400 `AUTH.NOT_INVITATION_USER` if not (prevents misuse by normal users)
  - [x] 6.4 Set password via `auth.admin.updateUserById(userId, { password, user_metadata: { invitation_pending: null } })`
  - [x] 6.5 Re-authenticate to get fresh tokens (same pattern as change-password)
  - [x] 6.6 Return `{ accessToken, refreshToken }`
  - [x] 6.7 Rate-limit: same as change-password (5 req/15min)
  - [x] 6.8 Unit tests

### Database — JWT Claims Hook Update (AC: #4)

- [x] Task 7: Add `invitation_pending` to custom access token hook
  - [x] 7.1 New migration: update `custom_access_token_hook` function
  - [x] 7.2 Add logic: if `user_metadata.invitation_pending IS TRUE`, inject `invitation_pending: true` into JWT claims (same pattern as `must_change_password`)
  - [x] 7.3 Verify existing `must_change_password` and role/tenant claims are unaffected

### Frontend — Accept Invitation Flow (AC: #2, #3, #7)

- [x] Task 8: Create `/auth/accept-invite` route handler
  - [x] 8.1 Create `apps/web/src/app/auth/accept-invite/route.ts` — export `async function GET(request: NextRequest)` (user clicks email link = browser GET request)
  - [x] 8.2 Extract `token_hash` and `type` from `request.nextUrl.searchParams`
  - [x] 8.3 **Critical: Route Handler cookie pattern.** Do NOT use `createClient()` from `server.ts` (that uses `next/headers` cookies which don't propagate to redirect responses in Route Handlers). Instead, create a `NextResponse.redirect()` first, then create the Supabase client with cookie handlers wired to that response:
    ```typescript
    const redirectUrl = new URL('/set-password', request.url);
    const response = NextResponse.redirect(redirectUrl);
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'invite',
    });
    ```
  - [x] 8.4 On success: return the `response` object (cookies already set on it by the SSR client)
  - [x] 8.5 On error (expired/invalid token): return `NextResponse.redirect(new URL('/auth/invite-expired', request.url))`

- [x] Task 9: Create `/set-password` page
  - [x] 9.1 Create `apps/web/src/app/set-password/page.tsx`
  - [x] 9.2 Form: newPassword + confirmPassword (NO currentPassword field)
  - [x] 9.3 Zod validation: same password requirements as change-password
  - [x] 9.4 Submit to `POST /auth/set-initial-password` via API client
  - [x] 9.5 On success: set fresh session tokens, redirect to `/dashboard`
  - [x] 9.6 Style consistent with existing `/change-password` page (same layout shell)

- [x] Task 10: Create `/auth/invite-expired` error page
  - [x] 10.1 Create `apps/web/src/app/auth/invite-expired/page.tsx`
  - [x] 10.2 Show clear message: "This invitation link has expired or is invalid"
  - [x] 10.3 Guidance: "Please contact your administrator to receive a new invitation"
  - [x] 10.4 Link back to `/login`

- [x] Task 11: Create `/set-password/layout.tsx` guard
  - [x] 11.1 Check `claims.invitation_pending === true` — if not, redirect to `/dashboard`
  - [x] 11.2 Prevents access to set-password page for normal users

### Frontend — Proxy, Layout & UI Updates (AC: #1, #4, #8, #9)

- [x] Task 12: Update proxy.ts for invitation flow
  - [x] 12.1 Add auth exception for invitation paths WITHOUT authentication (accept-invite route handler and invite-expired page need unauthenticated access — the user has no session when clicking the email link)
    ```typescript
    // After the /login check, BEFORE the /admin check:
    if (
      pathname.startsWith('/auth/accept-invite') ||
      pathname.startsWith('/auth/invite-expired')
    ) {
      return supabaseResponse;
    }
    ```
  - [x] 12.2 Add first-pass `invitation_pending` redirect: after the `if (!user) return redirectToLogin()` check and before admin/staff checks:
    ```typescript
    if (user.invitation_pending === true && pathname !== '/set-password') {
      return redirectTo('/set-password');
    }
    ```
  - [x] 12.3 **Note:** proxy.ts does NOT currently have a `must_change_password` redirect — that lives in `(tenant)/layout.tsx` line 21. proxy.ts is the first-pass guard; layout.tsx is the authoritative guard. Add `invitation_pending` to proxy.ts following the same defense-in-depth principle.

- [x] Task 12b: Update `(tenant)/layout.tsx` for `invitation_pending` (authoritative guard)
  - [x] 12b.1 In `apps/web/src/app/(tenant)/layout.tsx`: add `invitation_pending` check BEFORE the existing `must_change_password` check (line 21):
    ```typescript
    if (claims.invitation_pending === true) {
      redirect('/set-password');
    }
    if (claims.must_change_password === true) {
      redirect('/change-password');
    }
    ```
  - [x] 12b.2 This is the authoritative guard — proxy.ts is the first-pass guard

- [x] Task 13: Update tenant creation success UI
  - [x] 13.1 In `apps/web/src/app/admin/tenants/create/page.tsx`: remove temporary password display (the code blocks + copy buttons)
  - [x] 13.2 Replace with "Invitation email sent to {email}" success message
  - [x] 13.3 Add note: "The tenant owner will receive an email with instructions to set their password"
  - [x] 13.4 Add "Resend Invitation" button that calls `POST /api/v1/admin/tenants/:tenantId/resend-invitation` (disabled briefly after sending, shows confirmation toast)

### Backend — Resend Invitation (AC: #9)

- [x] Task 16: Create `POST /admin/tenants/:tenantId/resend-invitation` endpoint
  - [x] 16.1 Add `resendInvitation(tenantId: string)` method in `TenantsService`
  - [x] 16.2 Look up tenant → get owner user ID from `tenant_memberships` (where role = 'tenant_owner')
  - [x] 16.3 Get user metadata via `auth.admin.getUserById(ownerId)` — verify `user_metadata.invitation_pending === true`
  - [x] 16.4 If invitation is NOT pending → return 400 `{ code: 'TENANT.INVITATION_NOT_PENDING', message: 'Owner has already accepted the invitation' }`
  - [x] 16.5 Call `auth.admin.generateLink({ type: 'invite', email: owner.email, options: { data: { invitation_pending: true } } })` — this generates a fresh token (previous token is implicitly invalidated)
  - [x] 16.6 Build invitation link: `${APP_URL}/auth/accept-invite?token_hash=${hashedToken}&type=invite`
  - [x] 16.7 Call `MailService.sendInvitationEmail()` with new link
  - [x] 16.8 Return `{ data: { email: owner.email, sent: true } }`
  - [x] 16.9 Add endpoint in `TenantsController`: `@Post(':tenantId/resend-invitation')`, `@Roles('admin')`, `@Throttle({ default: { limit: 3, ttl: minutes(15) } })`
  - [x] 16.10 Unit tests for `resendInvitation` (mock generateLink, mock MailService, test pending/not-pending cases)

### Testing (AC: all)

- [x] Task 14: Update backend tests
  - [x] 14.1 Update `tenants.service.spec.ts`: mock `generateLink` instead of `createUser`, assert `MailService.sendInvitationEmail` called, assert no `temporaryPassword` in response
  - [x] 14.2 Add `auth.service.spec.ts` tests for `setInitialPassword` endpoint
  - [x] 14.3 Add `mail.service.spec.ts` tests for invitation email sending
  - [x] 14.4 Add `tenants.service.spec.ts` tests for `resendInvitation` (pending → sends, not pending → 400)
  - [x] 14.5 Add `tenants.controller.spec.ts` test for resend-invitation endpoint

- [ ] Task 15: Manual testing checklist
  - [ ] 15.1 Create tenant → verify no temp password in API response
  - [ ] 15.2 Check Inbucket (`http://localhost:54324`) → verify invitation email received
  - [ ] 15.3 Verify email link points to `http://localhost:3001/auth/accept-invite?...` (NOT Supabase URL)
  - [ ] 15.4 Click link → verify redirect to `/set-password`
  - [ ] 15.5 Set password → verify redirect to `/dashboard`
  - [ ] 15.6 Log out → log in with new password → verify it works
  - [ ] 15.7 Try accessing `/dashboard` with `invitation_pending: true` → verify redirect to `/set-password`
  - [ ] 15.8 Test expired token → verify error page shown
  - [ ] 15.9 Test existing `must_change_password` user → verify old flow still works
  - [ ] 15.10 Resend invitation from creation success screen → verify new email in Inbucket
  - [ ] 15.11 Click original (now invalidated) link → verify it fails gracefully
  - [ ] 15.12 Click new resend link → verify full flow works
  - [ ] 15.13 Resend for tenant whose owner already set password → verify 400 error
  - [ ] 15.14 Try logging in as invited user before setting password → verify login fails (user has no password)

## Dev Notes

### Core Technical Approach

**Option B: `generateLink()` + Nodemailer (full control, no Supabase URLs)**

The default `inviteUserByEmail()` sends emails with links to Supabase's auth server URL. Instead, we use `admin.generateLink()` which returns the token without sending any email, then send our own email via Nodemailer with a link pointing directly to the app URL.

**End-to-end flow:**

```
ADMIN creates tenant:
  ├─ POST /api/v1/admin/tenants
  ├─ Service calls auth.admin.generateLink({ type: 'invite', email, options: { data: { invitation_pending: true } } })
  │   └─ Returns: { data: { user: User, properties: { hashed_token, ... } } }
  ├─ Profile created (role: tenant_owner) using user.id
  ├─ Tenant membership created
  ├─ Build link: ${APP_URL}/auth/accept-invite?token_hash=${hashed_token}&type=invite
  ├─ MailService.sendInvitationEmail(email, link, tenantName)
  │   └─ Renders React Email template → sends via Nodemailer → captured by Inbucket
  └─ Response: { data: { tenant, invitation: { email, sent: true } } }

OWNER clicks email link:
  ├─ GET /auth/accept-invite?token_hash=xxx&type=invite (Next.js Route Handler)
  ├─ Server client calls supabase.auth.verifyOtp({ token_hash, type: 'invite' })
  │   └─ Success: session cookies set, email confirmed
  └─ Redirect to /set-password

OWNER sets password:
  ├─ GET /set-password (layout guard checks invitation_pending === true)
  ├─ POST /api/v1/auth/set-initial-password { newPassword, confirmPassword }
  ├─ Backend: auth.admin.updateUserById(userId, { password, user_metadata: { invitation_pending: null } })
  ├─ Backend: re-authenticate → return fresh tokens
  └─ Frontend: set session, redirect to /dashboard
```

### Current Implementation to Replace

**File: `apps/api/src/tenants/tenants.service.ts` (lines 37-67)**

```typescript
// REMOVE: temporary password generation
const temporaryPassword = randomBytes(12).toString('base64url');

// REPLACE THIS:
const { data: authData, error: authError } = await client.auth.admin.createUser(
  {
    email: dto.ownerEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  },
);

// WITH THIS:
const { data: linkData, error: linkError } =
  await client.auth.admin.generateLink({
    type: 'invite',
    email: dto.ownerEmail,
    options: {
      data: { invitation_pending: true },
    },
  });
// linkData.user.id → use for profile/membership creation
// linkData.properties.hashed_token → use for invitation link
```

**File: `packages/api/src/tenant.types.ts` (lines 23-28)**

```typescript
// REPLACE THIS:
credentials: {
  email: string;
  temporaryPassword: string;
}
// WITH THIS:
invitation: {
  email: string;
  sent: boolean;
}
```

**File: `apps/web/src/app/admin/tenants/create/page.tsx` (lines 109-174)**

- Remove: the success card with email + temporaryPassword code blocks and copy buttons
- Replace: "Invitation email sent to {email}" success card

### Supabase `generateLink` API Details

```typescript
// Response shape from admin.generateLink({ type: 'invite' })
{
  data: {
    user: {
      id: string;        // UUID — use for profile + membership creation
      email: string;
      // ... other user fields
    },
    properties: {
      action_link: string;     // Supabase URL — DO NOT USE THIS
      hashed_token: string;    // Token hash — USE THIS to build our own link
      redirect_to: string;
      verification_type: string;
    }
  },
  error: null | AuthError
}
```

**Critical:** Use `data.properties.hashed_token` to build the app URL. Ignore `data.properties.action_link` (points to Supabase).

**Error handling:** Same error codes as `createUser()` — check `authError.code` for `'email_exists'` or `'user_already_exists'` (existing pattern in tenants.service.ts lines 70-77).

### `verifyOtp` for Invitation Token Exchange

**Critical: Route Handler cookie pattern.** The `/auth/accept-invite` route handler is a GET handler (user clicks email link). Unlike Server Components, Route Handlers cannot use `createClient()` from `server.ts` because `next/headers` cookies don't propagate to `NextResponse.redirect()`. You must create the Supabase client with cookie handlers wired directly to the response object. See Task 8.3 for the exact pattern.

**Token expiry:** Controlled by `otp_expiry = 3600` in `supabase/config.toml` [auth.email] section (currently 1 hour). Consider increasing for invitations — new tenants may not check email immediately.

### Nodemailer + Inbucket Setup

**Inbucket SMTP** (already running as part of Supabase stack):

- Web UI: `http://localhost:54324`
- SMTP port: `54325` (needs uncommenting in config.toml)
- No authentication required for local SMTP
- All emails sent to port 54325 appear in the web UI regardless of domain

**Nodemailer transport config (local dev with Inbucket):**

```typescript
nodemailer.createTransport({
  host: process.env.SMTP_HOST, // 'localhost'
  port: Number(process.env.SMTP_PORT), // 54325
  secure: false, // no TLS for local
  // No auth needed for Inbucket
});
```

**Env var strategy:** Use `SMTP_HOST` + `SMTP_PORT` + optional `SMTP_USER` + `SMTP_PASS`. When `SMTP_USER` is empty, skip auth (local dev). Production SMTP config (Gmail) is a deployment concern, not in scope for this story.

### React Email Template Pattern

```typescript
// packages/emails/src/invitation.tsx
import { Html, Head, Body, Container, Text, Button, Link } from '@react-email/components';

interface InvitationEmailProps {
  inviteLink: string;
  tenantName: string;
}

export function InvitationEmail({ inviteLink, tenantName }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>You have been invited to join {tenantName} on JetAdisyon.</Text>
          <Button href={inviteLink}>Set Your Password</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

**Rendering in MailService** — see "React Email Rendering in NestJS" section below for the recommended approach. The package should export `renderInvitationEmail()` which returns an HTML string, so NestJS never imports JSX directly.

### Custom Access Token Hook — SQL Migration Pattern

**Existing hook location:** `supabase/migrations/20260315120000_add_must_change_password_to_access_token_hook.sql`

**Pattern to follow for adding `invitation_pending`:**

```sql
-- Add to custom_access_token_hook function, after the must_change_password block:
invitation_pending := (claims -> 'user_metadata' ->> 'invitation_pending')::boolean;
IF invitation_pending IS TRUE THEN
  claims := jsonb_set(claims, '{invitation_pending}', 'true'::jsonb);
END IF;
```

**Create a NEW migration file** — do NOT modify existing migration files. Name: `2026MMDD_add_invitation_pending_to_access_token_hook.sql`.

The function must be `CREATE OR REPLACE FUNCTION` to update the existing hook.

### Resend Invitation Approach

**Endpoint:** `POST /api/v1/admin/tenants/:tenantId/resend-invitation`

**Flow:**

1. Look up tenant → get owner from `tenant_memberships` (role = `tenant_owner`)
2. `auth.admin.getUserById(ownerId)` → check `user_metadata.invitation_pending === true`
3. If not pending → 400 `TENANT.INVITATION_NOT_PENDING`
4. `auth.admin.generateLink({ type: 'invite', email })` → get fresh `hashed_token`
5. Build new link → `MailService.sendInvitationEmail()` → return confirmation

**Supabase behavior:** Calling `generateLink()` again for the same user generates a new token. The previous token is implicitly invalidated (Supabase stores the latest OTP state per user). No need to manually invalidate.

**Frontend:** "Resend Invitation" button on tenant creation success screen. Calls the endpoint, disables briefly during send, shows toast confirmation. Uses the same `apiClient.post()` pattern as tenant creation.

### Login Behavior for Invitation Users

Users created via `generateLink({ type: 'invite' })` have **no password set**. If they try to log in at `/login`, `signInWithPassword` will fail with invalid credentials. This is correct and expected behavior — they MUST use the invitation email link first to set their password. No special handling needed in the login flow.

### React Email Rendering in NestJS

`packages/emails/` is built with `tsc` (same as `packages/api`). The compiled JS output lives in `dist/` and is referenced via `package.json` exports. NestJS imports the compiled render function, never `.tsx` directly:

```typescript
// apps/api/src/mail/mail.service.ts
import { renderInvitationEmail } from '@repo/emails/invitation';
const html = await renderInvitationEmail({ inviteLink, tenantName });
```

### Auth Endpoint Patterns (from story 1-3)

**Existing `change-password` endpoint structure to mirror:**

- DTO with Zod validation (not class-validator)
- Auth-protected (session required)
- Rate-limited via `@Throttle()` decorator
- Uses `auth.admin.updateUserById()` for password + metadata update
- Re-authenticates to get fresh tokens after password change
- Returns `{ data: { accessToken, refreshToken } }`
- Error codes follow `AUTH.ACTION_ERROR` format (e.g., `AUTH.SET_PASSWORD_FAILED`)
- PinoLogger for service logging

**Key difference from change-password:**

- `set-initial-password` does NOT verify current password (user has none)
- Guard: verify `request.user.user_metadata.invitation_pending === true`
- Clear `invitation_pending` (not `must_change_password`)
- Re-auth step uses `createAuthClient()` (not `getClient()` or `getClientForUser()`) — same as changePassword
- Re-auth via `signInWithPassword({ email, password: dto.newPassword })` works because the password was just set

### Previous Story Intelligence (Story 1-4)

**Patterns established in story 1-4 — critical for this story:**

1. **Guard chain order** in `app.module.ts`: `ThrottlerGuard → SupabaseAuthGuard → RolesGuard → TenantGuard`
2. **Three Supabase client types:** `getClient()` (service-role, for `generateLink()`/`updateUserById()`), `getClientForUser(accessToken)` (user-scoped, RLS), `createAuthClient()` (auth ops like `signInWithPassword`)
3. **Frontend:** `getClaims()` for proxy/layout guards, `react-hook-form` + `zodResolver` for forms, `redirectTo()`/`redirectToLogin()` helpers in proxy.ts
4. **Response envelope:** `{ data: T }` or `{ error: { code, message } }`
5. **Button uses `render` prop** (base-ui), not `asChild` (radix)

### Project Structure Notes

**New files to create:**

```
packages/emails/
  ├── package.json
  ├── tsconfig.json
  └── src/
      └── invitation.tsx                              # React Email invitation template

apps/api/src/mail/
  ├── mail.module.ts                                  # NestJS module (via nest generate)
  ├── mail.service.ts                                 # Nodemailer transport + send methods
  └── mail.service.spec.ts                            # Unit tests

apps/api/src/auth/dto/
  └── set-initial-password.dto.ts                     # DTO for set-initial-password endpoint

apps/web/src/app/auth/accept-invite/
  └── route.ts                                        # Next.js Route Handler (token exchange)

apps/web/src/app/auth/invite-expired/
  └── page.tsx                                        # Expired invitation error page

apps/web/src/app/set-password/
  ├── layout.tsx                                      # Guard: invitation_pending === true
  └── page.tsx                                        # Set password form (no current password)

supabase/migrations/
  └── 2026XXXX_add_invitation_pending_to_hook.sql     # JWT hook update
```

**Files to modify:**

```
supabase/config.toml                                  # Uncomment smtp_port = 54325
apps/api/src/config/env.validation.ts                 # Add SMTP_HOST, SMTP_PORT, SMTP_FROM, APP_URL
apps/api/.env                                         # Add SMTP and APP_URL env vars
apps/api/.env.example                                 # Add SMTP and APP_URL placeholders
apps/api/package.json                                  # Add @repo/emails workspace dependency
apps/api/src/tenants/tenants.module.ts                # Import MailModule
apps/api/src/tenants/tenants.service.ts               # Replace createUser with generateLink + email, add resendInvitation
apps/api/src/tenants/tenants.service.spec.ts           # Update mocks and assertions, add resend tests
apps/api/src/tenants/tenants.controller.ts             # Add resend-invitation endpoint
apps/api/src/tenants/tenants.controller.spec.ts        # Update response assertions, add resend tests
apps/api/src/auth/auth.controller.ts                  # Add set-initial-password endpoint
apps/api/src/auth/auth.service.ts                     # Add setInitialPassword method
apps/api/src/auth/auth.service.spec.ts                # Add setInitialPassword tests
packages/api/src/tenant.types.ts                      # Replace credentials with invitation
apps/web/src/lib/supabase/proxy.ts                    # Add /auth/accept-invite + /auth/invite-expired exception + invitation_pending redirect
apps/web/src/app/(tenant)/layout.tsx                  # Add invitation_pending redirect (authoritative guard)
apps/web/src/app/admin/tenants/create/page.tsx        # Remove temp password UI, show invitation sent + resend button
```

**Files that remain UNCHANGED:**

```
apps/web/src/app/change-password/                     # Existing flow preserved (backward compat)
apps/api/src/auth/dto/change-password.dto.ts          # Existing DTO preserved
apps/api/src/common/guards/                           # All guards unchanged
apps/api/src/supabase/supabase.service.ts             # No changes needed (getClient() already works for generateLink)
```

### Library & Framework Requirements

| Library                   | Version       | Usage in This Story                                        | New?                       |
| ------------------------- | ------------- | ---------------------------------------------------------- | -------------------------- |
| `nodemailer`              | latest        | SMTP email transport in MailService                        | **NEW** (apps/api)         |
| `@types/nodemailer`       | latest        | TypeScript types for nodemailer                            | **NEW** (apps/api devDeps) |
| `react-email`             | latest        | Email template rendering                                   | **NEW** (packages/emails)  |
| `@react-email/components` | latest        | Email template components (Html, Button, etc.)             | **NEW** (packages/emails)  |
| `@supabase/supabase-js`   | existing      | `auth.admin.generateLink()`, `auth.admin.updateUserById()` | No                         |
| `@supabase/ssr`           | existing      | `verifyOtp()` in route handler                             | No                         |
| `react-hook-form`         | existing      | Set-password form                                          | No                         |
| `@hookform/resolvers`     | existing      | Zod resolver for form                                      | No                         |
| `zod`                     | v4 (existing) | DTO validation, form validation                            | No                         |

**No version conflicts expected** — nodemailer and react-email are independent packages with no overlapping dependencies.

### Testing Requirements

**Backend unit tests (co-located .spec.ts):**

- `mail.service.spec.ts`: Mock Nodemailer transport, assert `sendMail` called with correct args
- `tenants.service.spec.ts`: Mock `generateLink` (not `createUser`), mock `MailService`, assert invitation link built correctly, assert no `temporaryPassword` in response
- `auth.service.spec.ts`: Add `setInitialPassword()` tests — verify password set, `invitation_pending` cleared, re-auth returns tokens, reject if `invitation_pending !== true`

**Frontend manual tests:**

- Full invitation flow: create tenant → Inbucket email → click link → set password → dashboard
- Expired token: wait for OTP expiry or manually invalidate → verify error page
- Direct URL access: navigate to `/dashboard` with `invitation_pending: true` → verify redirect to `/set-password`
- Backward compat: existing `must_change_password` user → verify `/change-password` flow still works
- Guard: normal user navigates to `/set-password` → verify redirect to `/dashboard`

### References

- [Source: apps/api/src/tenants/tenants.service.ts — current createUser + temp password flow, lines 37-160]
- [Source: apps/api/src/auth/auth.service.ts — changePassword pattern to mirror, lines 103-160]
- [Source: apps/api/src/auth/auth.controller.ts — existing auth endpoints structure]
- [Source: apps/web/src/lib/supabase/proxy.ts — first-pass route guards, NO must_change_password redirect here]
- [Source: apps/web/src/app/(tenant)/layout.tsx — authoritative must_change_password redirect, line 21-22]
- [Source: apps/web/src/app/change-password/layout.tsx — page-level guard pattern to mirror for set-password]
- [Source: apps/web/src/app/change-password/page.tsx — password form pattern to mirror]
- [Source: apps/web/src/app/admin/tenants/create/page.tsx — temp password display to replace, lines 109-174]
- [Source: packages/api/src/tenant.types.ts — response type to modify, lines 23-28]
- [Source: supabase/config.toml — Inbucket config (smtp_port commented at line 104), auth settings (otp_expiry = 3600)]
- [Source: supabase/migrations/20260315120000_add_must_change_password_to_access_token_hook.sql — JWT hook pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md — Email: Nodemailer + SMTP + React Email section, lines 322-328]
- [Source: _bmad-output/planning-artifacts/architecture.md — packages/emails/ directory structure, lines 992-997]
- [Source: _bmad-output/implementation-artifacts/1-4-role-based-access-and-tenant-data-isolation.md — guard chain, client types, decorator patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed TypeScript build error: `membership.tenants` type assertion needed `unknown` intermediate cast
- Fixed `mail.service.spec.ts` jest.mock hoisting issue with `mockSendMail` variable
- Fixed import sorting issues (nestjs-pino before nodemailer, @repo/ group separation)
- Fixed `@typescript-eslint/no-unsafe-argument` by casting `membership.user_id as string`

### Completion Notes List

- Replaced temporary password flow with email invitation via `generateLink()` + Nodemailer
- Created `packages/emails` shared package with React Email invitation template (Turkish text)
- Created NestJS `MailModule` (global) with Nodemailer transport + Inbucket for local dev
- Added `POST /auth/set-initial-password` endpoint (mirrors change-password pattern, no current password required)
- Added `invitation_pending` to JWT claims via new SQL migration (same pattern as `must_change_password`)
- Created `/auth/accept-invite` route handler with correct cookie-wiring pattern for Route Handlers
- Created `/set-password` page + layout guard (mirrors change-password pattern)
- Created `/auth/invite-expired` error page (Turkish text)
- Updated proxy.ts: unauthenticated access for invitation paths + `invitation_pending` first-pass redirect
- Updated `(tenant)/layout.tsx`: `invitation_pending` authoritative guard before `must_change_password`
- Updated tenant creation UI: replaced temp password display with invitation email confirmation + resend button
- Added `POST /tenants/:tenantId/resend-invitation` endpoint with rate limiting
- Updated shared `CreateTenantResponse` type: `credentials` → `invitation`
- All 87 unit tests pass, 14 test suites, lint clean, full build passes
- **Pending:** Manual testing (Task 15) requires `.env` vars and `supabase db reset` for migration

### Change Log

- 2026-03-16: Implemented story 1-4b — Email invitation account creation (all automated tasks complete)
- 2026-03-16: Code review fixes applied (7 issues: 2 HIGH, 2 MEDIUM, 2 LOW, 1 user-reported)

### Code Review Fixes (2026-03-16)

1. **[HIGH] Email sending failure now graceful** — `createTenant` wraps `sendInvitationEmail` in try/catch, returns `sent: false` on failure instead of orphaning data
2. **[HIGH] `resendInvitation` filters by tenant_owner role** — query joins `profiles!inner(role)` to avoid breaking when staff members are added
3. **[MEDIUM] proxy.ts now guards both `invitation_pending` AND `must_change_password`** — fulfills AC#8 defense-in-depth requirement
4. **[MEDIUM] Added test for email sending failure** — verifies tenant is created with `sent: false` when SMTP is down
5. **[LOW] Removed non-null assertions** — `userData.user.email!` replaced with proper null check + error
6. **[USER] Centralized Turkish error messages** — `apiClient.ts` maps known API error codes to Turkish messages; rate limit (`SYSTEM.RATE_LIMITED`) now shows user-friendly Turkish text instead of raw "Too Many Requests"
7. **[USER] Frontend handles `sent: false`** — tenant creation page shows warning toast when email fails, prompting admin to resend

### File List

**New files:**

- packages/emails/package.json
- packages/emails/tsconfig.json
- packages/emails/src/invitation.tsx
- apps/api/src/mail/mail.module.ts
- apps/api/src/mail/mail.service.ts
- apps/api/src/mail/mail.service.spec.ts
- apps/api/src/auth/dto/set-initial-password.dto.ts
- apps/web/src/app/auth/accept-invite/route.ts
- apps/web/src/app/auth/invite-expired/page.tsx
- apps/web/src/app/set-password/page.tsx
- apps/web/src/app/set-password/layout.tsx
- supabase/migrations/20260316120000_add_invitation_pending_to_access_token_hook.sql

**Modified files:**

- supabase/config.toml (uncommented smtp_port = 54325)
- apps/api/package.json (added @repo/emails, nodemailer, @types/nodemailer)
- apps/api/src/config/env.validation.ts (added APP_URL, SMTP_HOST, SMTP_PORT, SMTP_FROM)
- apps/api/.env.example (added APP_URL, SMTP env vars)
- apps/api/src/app.module.ts (added MailModule import)
- apps/api/src/tenants/tenants.service.ts (replaced createUser with generateLink + email, added resendInvitation, email failure graceful, role filter)
- apps/api/src/tenants/tenants.controller.ts (added resend-invitation endpoint)
- apps/api/src/tenants/tenants.service.spec.ts (updated mocks for generateLink, added resend + email failure tests)
- apps/api/src/tenants/tenants.controller.spec.ts (updated response shape, added resend test)
- apps/api/src/auth/auth.service.ts (added setInitialPassword method)
- apps/api/src/auth/auth.controller.ts (added set-initial-password endpoint)
- apps/api/src/auth/auth.service.spec.ts (added setInitialPassword tests)
- packages/api/src/tenant.types.ts (replaced credentials with invitation)
- apps/web/src/lib/api-client.ts (centralized Turkish error message mapping for known API codes)
- apps/web/src/lib/supabase/proxy.ts (added invitation path exceptions + invitation_pending + must_change_password redirects)
- apps/web/src/app/(tenant)/layout.tsx (added invitation_pending authoritative guard)
- apps/web/src/app/admin/tenants/create/page.tsx (replaced temp password UI with invitation email + resend, handles sent: false)
- apps/web/src/app/set-password/page.tsx (simplified error handling — uses centralized messages)
- pnpm-lock.yaml (dependency changes from new packages)
- pnpm-workspace.yaml (pnpm config for new workspace packages)
