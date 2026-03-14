---
title: 'Return-To-Page After Login'
slug: 'return-to-page-after-login'
created: '2026-03-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['next.js 16', 'supabase-ssr', 'react-hook-form', 'useSearchParams']
files_to_modify: ['apps/web/src/lib/supabase/proxy.ts', 'apps/web/src/providers/auth-provider.tsx', 'apps/web/src/app/(auth)/login/page.tsx', 'apps/web/src/app/(auth)/layout.tsx']
code_patterns: ['proxy.ts redirectTo() helper with NextResponse.redirect', 'onAuthStateChange with window.location.href', 'useRouter + router.push for client navigation', 'Card/CardHeader/CardDescription for login UI']
test_patterns: ['no frontend tests exist yet for auth flow — manual testing only']
---

# Tech-Spec: Return-To-Page After Login

**Created:** 2026-03-14

## Overview

### Problem Statement

When users get redirected to `/login` (either by the proxy.ts guard or by signing out), they lose their place. After logging back in, they always land on a hardcoded destination (`/admin/overview`) instead of returning to the page they were on.

### Solution

Pass a `?next=` query param when redirecting to `/login`, read it after successful login, and redirect there instead of the hardcoded default. On sign-out, preserve the current path in the redirect. Optionally tweak the login UI to hint where the user is returning to.

### Scope

**In Scope:**
- `proxy.ts`: append `?next=` when redirecting unauthenticated users to `/login`
- `auth-provider.tsx`: include current path in the `/login` redirect on `SIGNED_OUT`
- `login/page.tsx`: read `?next=` param, redirect there after successful login (with role-based validation/fallback)
- Login UI: subtle context hint when `?next=` is present
- Align with Story 1.3's role-based redirect logic (`mustChangePassword` takes priority over `?next=`)

**Out of Scope:**
- Story 1.3 implementation itself (change-password flow, tenant dashboard, etc.)
- External/cross-domain return URLs
- Deep persistence (e.g., saving return URL to localStorage across browser restarts)

## Context for Development

### Codebase Patterns

- Two-layer auth enforcement: proxy.ts (first-pass) + server component layouts (authoritative)
- `proxy.ts` uses `getClaims()` for JWT-based route guards — redirects to `/login` for unauthenticated users
- `proxy.ts` has a `redirectTo(path)` helper that clones `request.nextUrl`, sets pathname, and returns `NextResponse.redirect(url)` — the `url.searchParams` are preserved automatically when cloning
- `auth-provider.tsx` listens to `onAuthStateChange` — on `SIGNED_OUT`, does `window.location.href = '/login'`. The `SIGNED_IN` event also fires across tabs when another tab logs in — can be used for cross-tab auto-login
- Login page is a client component (`'use client'`) using `useRouter` from `next/navigation` — will need `useSearchParams` to read `?next=`
- Login page calls `apiClient('/auth/login')`, then `supabase.auth.setSession()`, then `router.push('/admin/overview')` (hardcoded)
- `(auth)/layout.tsx` is a server component that redirects authenticated users to `/` — MUST be updated to read `?next=` and redirect there instead, so that already-authenticated users accessing `/login?next=X` land on `X` (not `/` → role-based default)
- `useSearchParams` is not used anywhere in the codebase yet
- Story 1.3 will add `mustChangePassword` check — that must take priority over `?next=`

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `apps/web/src/lib/supabase/proxy.ts` | First-pass auth guard, redirects unauthenticated to `/login` | L47-51: `redirectTo()` helper; L65-66: admin guard redirect; L75-77: catch-all redirect |
| `apps/web/src/providers/auth-provider.tsx` | Client-side auth context, `SIGNED_OUT` redirect | L50-52: `SIGNED_OUT` handler with `window.location.href` |
| `apps/web/src/app/(auth)/login/page.tsx` | Login form, post-login redirect logic | L60-61: hardcoded `router.push('/admin/overview')` |
| `apps/web/src/app/(auth)/layout.tsx` | Auth layout, redirects authenticated users — must honor `?next=` | L15-17: server-side auth check, currently hardcodes redirect to `/` |
| `apps/web/src/app/page.tsx` | Root route, role-based redirect | L18-19: admin → `/admin/overview` |
| `_bmad-output/implementation-artifacts/1-3-tenant-owner-login-and-forced-password-reset.md` | Story 1.3 spec for alignment | Task 7: proxy.ts update, Task 9: auth-provider update |

### Technical Decisions

- Use `?next=` query parameter (not localStorage or session storage) — stateless, works across tabs, no cleanup needed
- Validate `?next=` is a relative path starting with `/` and does NOT start with `//` — prevent open redirect attacks
- `mustChangePassword` (Story 1.3) will always take priority over `?next=` when implemented
- Use `window.location.pathname` (not full URL) in auth-provider to avoid leaking query params or hashes
- `proxy.ts` `redirectTo()` already clones `request.nextUrl` — we just need to set `url.searchParams.set('next', pathname)` before the redirect
- Login page will use `useSearchParams()` from `next/navigation` to read `?next=` on the client side
- The `?next=` param should be excluded for `/login` itself (no point in returning to login after login)
- Login UI hint: change `CardDescription` text when `?next=` is present — e.g., "Devam etmek için tekrar giriş yapın" (Log in again to continue)

## Implementation Plan

### Tasks

- [x] Task 1: Update `proxy.ts` to append `?next=` when redirecting to `/login`
  - File: `apps/web/src/lib/supabase/proxy.ts`
  - Action: Modify the `redirectTo()` helper to accept an optional `preservePath` parameter. When redirecting unauthenticated users to `/login`, pass the current `pathname` as the `?next=` search param. Apply to both redirect sites: the `/admin` guard (L65-66) and the catch-all guard (L75-77). Do NOT add `?next=` when the current path is `/` (root has no meaningful return destination — it just role-redirects anyway).
  - Implementation detail: Create a new helper `redirectToLogin(pathname)` that builds the `/login` URL with `?next=`:
    ```typescript
    const redirectToLogin = (pathname: string) => {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      // Don't set ?next= for root — it just role-redirects
      if (pathname !== '/') {
        url.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(url);
    };
    ```
  - Replace `redirectTo('/login')` calls with `redirectToLogin(pathname)` at L66 and L76.
  - Keep the existing `redirectTo()` helper unchanged for non-login redirects (e.g., redirecting non-admins to `/`).

- [x] Task 2: Update `auth-provider.tsx` to preserve current path on sign-out and auto-redirect on cross-tab sign-in
  - File: `apps/web/src/providers/auth-provider.tsx`
  - Action A (SIGNED_OUT): In the `SIGNED_OUT` handler (L50-52), change `window.location.href = '/login'` to include the current path as `?next=`. Use `window.location.pathname` to get the current path.
  - Implementation detail:
    ```typescript
    if (event === 'SIGNED_OUT') {
      const currentPath = window.location.pathname;
      const loginUrl = currentPath !== '/' && currentPath !== '/login'
        ? `/login?next=${encodeURIComponent(currentPath)}`
        : '/login';
      window.location.href = loginUrl;
    }
    ```
  - Action B (SIGNED_IN): Add a handler for the `SIGNED_IN` event. When fired and the user is currently on the `/login` page, read the `?next=` param from the URL and redirect to that destination (or the default). This enables cross-tab auto-login: if Tab A is on `/login?next=/admin/tenants` and Tab B logs in, Tab A auto-navigates to `/admin/tenants`.
  - Implementation detail:
    ```typescript
    if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const destination = next && next.startsWith('/') && !next.startsWith('//')
        ? next
        : '/';
      window.location.href = destination;
    }
    ```
  - Notes: Use `window.location.href` (hard navigation) for both events to ensure server-side proxy re-evaluates auth. Redirect to `/` as default for `SIGNED_IN` (root page handles role-based routing). Exclude `/` and `/login` as return targets for `SIGNED_OUT`.

- [x] Task 3: Update `login/page.tsx` to read `?next=` and redirect after login
  - File: `apps/web/src/app/(auth)/login/page.tsx`
  - Action: Import `useSearchParams` from `next/navigation`. Read the `next` query param. After successful login, redirect to `next` if it passes validation, otherwise fall back to `/admin/overview` (the current hardcoded default).
  - Implementation detail:
    ```typescript
    import { useRouter, useSearchParams } from 'next/navigation';
    // ...
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next');
    ```
  - Validation function (inline, no separate file needed):
    ```typescript
    function isValidReturnPath(path: string | null): path is string {
      if (!path) return false;
      // Must start with / and must NOT start with // (protocol-relative URL attack)
      return path.startsWith('/') && !path.startsWith('//');
    }
    ```
  - Replace `router.push('/admin/overview')` (L61) with:
    ```typescript
    const destination = isValidReturnPath(nextPath) ? nextPath : '/admin/overview';
    router.push(destination);
    ```
  - Notes: When Story 1.3 is implemented, the fallback will change from `/admin/overview` to role-based routing with `mustChangePassword` priority. The `?next=` logic sits on top and doesn't conflict — Story 1.3 just needs to check `mustChangePassword` before honoring `?next=`.

- [x] Task 4: Update `(auth)/layout.tsx` to honor `?next=` for already-authenticated users
  - File: `apps/web/src/app/(auth)/layout.tsx`
  - Action: Currently when an authenticated user hits `/login?next=/admin/tenants`, the layout does `redirect('/')` and the `?next=` param is lost. Update the layout to read the `next` search param and redirect there instead of `/`.
  - Implementation detail: The layout is a server component — use the `searchParams` prop (Next.js page/layout prop) or access from `headers`/URL. In Next.js 16, layouts don't receive `searchParams` directly, but we can use `redirect()` with the full URL. However, the simplest approach: update `proxy.ts` to handle this case instead. When an authenticated user hits `/login`, proxy.ts already redirects to `/`. Change it to read `?next=` and redirect to the validated `next` path.
  - Revised approach (handle in proxy.ts instead of layout): In the `/login` path handler in proxy.ts, when `user` exists, read `request.nextUrl.searchParams.get('next')`, validate it, and redirect there instead of `/`.
  - Implementation detail:
    ```typescript
    if (pathname.startsWith('/login')) {
      if (user) {
        const next = request.nextUrl.searchParams.get('next');
        if (next && next.startsWith('/') && !next.startsWith('//')) {
          return redirectTo(next);
        }
        return redirectTo('/');
      }
      return supabaseResponse;
    }
    ```
  - Notes: This is cleaner than modifying the layout because proxy.ts already handles this redirect. The layout's `redirect('/')` becomes a fallback that rarely fires (proxy catches it first).

- [x] Task 5: Update login UI to show context hint when returning
  - File: `apps/web/src/app/(auth)/login/page.tsx`
  - Action: Change the `CardDescription` text when `?next=` is present. Default text stays "Hesabınıza giriş yapmak için bilgilerinizi girin". When `?next=` is present, show "Devam etmek için tekrar giriş yapın" (Log in again to continue).
  - Implementation detail:
    ```tsx
    <CardDescription>
      {isValidReturnPath(nextPath)
        ? 'Devam etmek için tekrar giriş yapın'
        : 'Hesabınıza giriş yapmak için bilgilerinizi girin'}
    </CardDescription>
    ```
  - Notes: Subtle change — no flashy banners or route names displayed. Just a hint that the user is returning from somewhere. This is the optional enhancement — if during review it feels unnecessary, it can be dropped without affecting functionality.

### Acceptance Criteria

- [ ] AC 1: Given an unauthenticated user tries to access `/admin/tenants`, when proxy.ts redirects them, then the browser navigates to `/login?next=%2Fadmin%2Ftenants`
- [ ] AC 2: Given an unauthenticated user tries to access `/admin/overview`, when proxy.ts redirects them, then the browser navigates to `/login?next=%2Fadmin%2Foverview`
- [ ] AC 3: Given an unauthenticated user tries to access `/` (root), when proxy.ts redirects them, then the browser navigates to `/login` (no `?next=` param — root is a role-redirector, not a destination)
- [ ] AC 4: Given a user is on `/admin/tenants` and signs out, when `SIGNED_OUT` fires, then the browser navigates to `/login?next=%2Fadmin%2Ftenants`
- [ ] AC 5: Given a user is on `/login?next=%2Fadmin%2Ftenants` and logs in successfully, when the login completes, then the browser navigates to `/admin/tenants` (not `/admin/overview`)
- [ ] AC 6: Given a user is on `/login` (no `?next=`), when they log in successfully, then the browser navigates to `/admin/overview` (default fallback)
- [ ] AC 7: Given a user is on `/login?next=https%3A%2F%2Fevil.com`, when they log in, then the browser navigates to `/admin/overview` (invalid `?next=` is ignored)
- [ ] AC 8: Given a user is on `/login?next=%2F%2Fevil.com`, when they log in, then the browser navigates to `/admin/overview` (protocol-relative URL rejected)
- [ ] AC 9: Given a user lands on `/login?next=%2Fadmin%2Ftenants`, when the login page renders, then the `CardDescription` shows "Devam etmek için tekrar giriş yapın" instead of the default text
- [ ] AC 10: Given a user signs out in Tab A while Tab B is on `/admin/tenants`, when Tab B detects `SIGNED_OUT`, then Tab B navigates to `/login?next=%2Fadmin%2Ftenants`
- [ ] AC 11: Given an already-authenticated user navigates to `/login?next=%2Fadmin%2Ftenants`, when proxy.ts processes the request, then the user is redirected to `/admin/tenants` (not to `/` then role-redirect)
- [ ] AC 12: Given an already-authenticated user navigates to `/login` (no `?next=`), when proxy.ts processes the request, then the user is redirected to `/` (existing behavior preserved)
- [ ] AC 13: Given Tab A is on `/login?next=%2Fadmin%2Ftenants` and Tab B successfully logs in, when Tab A detects `SIGNED_IN`, then Tab A auto-navigates to `/admin/tenants` without user interaction
- [ ] AC 14: Given Tab A is on `/login` (no `?next=`) and Tab B logs in, when Tab A detects `SIGNED_IN`, then Tab A auto-navigates to `/` (role-based default)

## Additional Context

### Dependencies

No new dependencies required. `useSearchParams` is built into `next/navigation`.

### Testing Strategy

**Manual testing (no automated frontend tests exist):**

1. Start the app (`pnpm dev`)
2. While logged out, navigate directly to `/admin/tenants` → verify redirect to `/login?next=%2Fadmin%2Ftenants`
3. Log in → verify redirect to `/admin/tenants` (not `/admin/overview`)
4. Log out from `/admin/tenants` → verify redirect to `/login?next=%2Fadmin%2Ftenants`
5. Log in again → verify redirect back to `/admin/tenants`
6. Navigate directly to `/login` (no `?next=`) → log in → verify redirect to `/admin/overview`
7. Manually set `?next=https://evil.com` in URL bar → log in → verify redirect to `/admin/overview`
8. Open two tabs on `/admin/overview` → log out in Tab 1 → verify Tab 2 also redirects to `/login?next=%2Fadmin%2Foverview`
9. Verify login page shows "Devam etmek için tekrar giriş yapın" when `?next=` is present
10. Verify login page shows default text when `?next=` is absent
11. While logged in, navigate to `/login?next=%2Fadmin%2Ftenants` → verify redirect to `/admin/tenants` (not `/`)
12. While logged in, navigate to `/login` (no `?next=`) → verify redirect to `/` (existing behavior)
13. Open Tab A on `/login?next=%2Fadmin%2Ftenants`, log in on Tab B → verify Tab A auto-navigates to `/admin/tenants`
14. Open Tab A on `/login` (no `?next=`), log in on Tab B → verify Tab A auto-navigates to `/`

### Notes

- **Story 1.3 alignment:** When Story 1.3 is implemented, the login `onSubmit` will need to check `mustChangePassword` before honoring `?next=`. The priority order will be: `mustChangePassword` → `/change-password`, else `?next=` → validated return path, else role-based default. The `?next=` param should be preserved through the password change flow (pass it to `/change-password?next=...` so after password change the user still returns to their original page).
- **`(auth)/layout.tsx`** redirects authenticated users from `/login` to `/`. With Task 4, proxy.ts now handles `?next=` before the layout ever runs. The layout's `redirect('/')` becomes a rarely-hit fallback (e.g., if proxy is bypassed or disabled).
- **`encodeURIComponent` usage:** The `?next=` value is URL-encoded when set (by proxy.ts via `searchParams.set` which auto-encodes, and by auth-provider via explicit `encodeURIComponent`). It is decoded automatically by `searchParams.get('next')` on the reading side.
- **Temporary test logout button:** The `apps/web/src/app/admin/overview/page.tsx` currently has a temporary logout button added for testing. This should be removed separately — it is not part of this spec.

## Review Notes

- Adversarial review completed
- Findings: 9 total, 7 fixed, 2 skipped (F8: pre-existing redundant state clear, F7: non-admin `?next=/admin` is a single extra redirect not a loop)
- Resolution approach: auto-fix
- Fixes applied: shared `isValidReturnPath` utility (F9), backslash open-redirect prevention (F2), query string preservation (F3), `Suspense` boundary for `useSearchParams` (F5), `redirectTo` search param leak (F6), cross-tab-only `SIGNED_IN` navigation via `visibilityState` (F1), skip reload when already on `/login` (F4)
