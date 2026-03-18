---
title: 'Admin User Menu with NavUser Sidebar Pattern'
slug: 'admin-user-menu'
created: '2026-03-18'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'shadcn/ui v4 (base-ui)', 'Tailwind v4', 'lucide-react', 'Supabase Auth']
files_to_modify:
  - 'packages/ui/src/components/ui/avatar.tsx'
  - 'apps/web/src/components/nav-user.tsx'
  - 'apps/web/src/app/admin/_components/admin-sidebar.tsx'
  - 'apps/web/src/app/change-password/page.tsx'
  - 'apps/web/src/components/theme-toggle.tsx'
code_patterns:
  - 'DropdownMenuTrigger render={<SidebarMenuButton />} for trigger composition'
  - 'useAuth() hook for user/signOut — user can be null during loading'
  - 'useSidebar() for isMobile and collapsed state'
  - 'base-ui data attributes: data-popup-open on triggers, data-open/data-closed on popups'
  - 'Turkish UI labels'
  - 'variant=destructive for logout'
test_patterns: ['No existing tests for admin sidebar']
---

# Tech-Spec: Admin User Menu with NavUser Sidebar Pattern

**Created:** 2026-03-18

## Overview

### Problem Statement

Admin users have no way to log out or change their password. The `UserMenu` component with logout and change password functionality only exists in the tenant header layout. Admin users are stuck once they log in — the only workaround is manually clearing cookies.

### Solution

Adopt the shadcn `NavUser` sidebar pattern (from sidebar-07 block) for the `AdminSidebar` footer. Create a shared `NavUser` component that renders in the sidebar footer with user avatar (initials fallback), email display, change password, and logout menu items. It integrates naturally with the existing shadcn sidebar infrastructure and handles collapsed icon state.

### Scope

**In Scope:**
- Create a `NavUser` component based on shadcn sidebar-07 pattern at a shared location (`src/components/nav-user.tsx`)
- Integrate it into `AdminSidebar` footer (replacing standalone `ThemeToggle`)
- Menu items: Theme toggle, Change Password ("Şifremi Değiştir"), Logout ("Çıkış Yap")
- Handles sidebar collapsed state (icon-only mode)
- Fix `/change-password` page to redirect admin users to `/admin/overview` instead of `/dashboard`
- Fix `/change-password` page UI copy to work for both forced and voluntary password changes
- Remove dead `ThemeToggle` component after migration

**Out of Scope:**
- Refactoring the tenant `UserMenu` to use NavUser (separate task)
- Avatar image uploads — use initials fallback only
- Admin managing other users' passwords

## Context for Development

### Codebase Patterns

- shadcn/ui sidebar with `collapsible="icon"` mode already in use in `AdminSidebar`
- `useAuth()` returns `{ user, session, isLoading, mustChangePassword, setMustChangePassword, signOut }`. The `user` object (`AuthUser | null`) has `id`, `email`, `systemRole`, `tenantRole`, `tenantId`. **`user` is `null` while loading or unauthenticated** — all access must use optional chaining or null guards.
- `SidebarFooter` already exists in `AdminSidebar` (currently holds `ThemeToggle`)
- shadcn components live in `packages/ui/src/components/`, app components in `apps/web/src/components/`
- **Trigger composition pattern:** `<DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>` — the `render` prop passes the SidebarMenuButton as the rendered element for the trigger
- `variant="destructive"` used for logout menu items
- All UI labels in Turkish
- Icons from `lucide-react`

### Data Attributes (base-ui, NOT Radix)

This project uses `@base-ui/react` (not Radix). The data attributes differ from the original shadcn sidebar-07 example:

| Component | Open Attribute | Closed Attribute |
|-----------|---------------|-----------------|
| `Menu.Trigger` | `data-popup-open` | — |
| `Menu.Popup` | `data-open` | `data-closed` |
| `Menu.SubmenuTrigger` | `data-popup-open` | — |
| `SidebarMenuButton` (cva) | `data-open` (already styled) | — |

**Important:** Do NOT use `data-[state=open]` — that is a Radix pattern. Use `data-popup-open:` for trigger styling. `SidebarMenuButton` already includes `data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground` in its cva definition, so open-state styling works automatically when composed with `DropdownMenuTrigger`.

### DropdownMenuSub Support

`DropdownMenuSub`, `DropdownMenuSubTrigger`, and `DropdownMenuSubContent` are exported from `packages/ui/src/components/ui/dropdown-menu.tsx` and properly implemented with base-ui `SubmenuTrigger`. They have **not been used anywhere in the codebase yet** — this will be the first usage. Collision/overflow handling is built-in via Floating UI's `MenuPositioner` (automatic flip/shift behavior), so submenu positioning is handled automatically.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/admin/_components/admin-sidebar.tsx` | Admin sidebar — modify footer to use NavUser |
| `apps/web/src/app/(tenant)/_components/user-menu.tsx` | Reference: auth menu logic, `user?.email` optional chaining pattern |
| `apps/web/src/hooks/use-auth.ts` | `useAuth()` hook — provides `user` and `signOut()` |
| `apps/web/src/providers/auth-provider.tsx` | Auth context with `AuthUser` interface and `signOut()` implementation |
| `apps/web/src/components/theme-toggle.tsx` | ThemeToggle — only consumer is `admin-sidebar.tsx`, becomes dead code after Task 4 |
| `apps/web/src/app/change-password/page.tsx` | Change password page — has hardcoded `/dashboard` redirect and "first login" UI copy to fix |
| `packages/ui/src/components/ui/sidebar.tsx` | Sidebar primitives — `SidebarMenuButton` cva includes `data-open:` styling |
| `packages/ui/src/components/ui/dropdown-menu.tsx` | DropdownMenu primitives including `DropdownMenuSub*` components |

### Technical Decisions

- Use shadcn sidebar-07 `NavUser` pattern adapted for base-ui data attributes (no avatar image, initials fallback only)
- Place `NavUser` in `apps/web/src/components/nav-user.tsx` (shared across layouts)
- Integrate theme switching as a `DropdownMenuSub` inside NavUser dropdown — first usage of submenu in codebase, collision handling is automatic via Floating UI
- `Avatar` component needs to be added via `pnpm shadcn add avatar` (not currently installed)
- Reuse `useAuth()` hook for user data and signOut — **must handle `user === null`** with early return
- Derive initials from user email (first character, uppercased)
- Compose trigger via `<DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>` — no `asChild` needed
- Keyboard accessibility is handled by base-ui Menu primitives (focus management, arrow key navigation, Escape to close, Enter/Space to select)
- Delete `ThemeToggle` component after migration — it has zero consumers after admin-sidebar removal

## Implementation Plan

### Tasks

- [x] Task 1: Add Avatar component via shadcn CLI
  - File: `packages/ui/src/components/ui/avatar.tsx`
  - Action: Run `pnpm shadcn add avatar` from `packages/ui` to install the Avatar primitive
  - Notes: Adds `Avatar`, `AvatarImage`, `AvatarFallback` exports. Needed for user initials circle in NavUser.

- [x] Task 2: Create `NavUser` component
  - File: `apps/web/src/components/nav-user.tsx` (new file)
  - Action: Create a `'use client'` component following the shadcn sidebar-07 `NavUser` pattern, adapted as follows:
    - **Imports:**
      - `useAuth` from `@/hooks/use-auth` — for `user` and `signOut`
      - `useSidebar` from `@repo/ui/components/ui/sidebar` — for `isMobile`
      - `useTheme` from `next-themes` — for theme sub-menu
      - `useRouter` from `next/navigation` — for change-password navigation
      - `Avatar`, `AvatarFallback` from `@repo/ui/components/ui/avatar`
      - `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem` from `@repo/ui/components/ui/sidebar`
      - `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuTrigger` from `@repo/ui/components/ui/dropdown-menu`
      - Icons: `ChevronsUpDownIcon`, `LockKeyholeIcon`, `LogOutIcon`, `MoonIcon`, `SunIcon` from `lucide-react`
    - **Null guard:** Early return `null` if `!user` (handles loading state gracefully)
    - **Trigger composition:** `<DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground" />}>`
      - `Avatar` with `AvatarFallback` showing `user.email.charAt(0).toUpperCase()`
      - User email in a truncated `<span>` inside a `<div>` with `grid flex-1 text-left text-sm leading-tight`
      - `ChevronsUpDownIcon` with `className="ml-auto size-4"`
    - **Dropdown content** (`DropdownMenuContent`):
      - `side={isMobile ? 'bottom' : 'right'}`, `align="end"`, `sideOffset={4}`
      - `className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"`
      - Label: Avatar + user email (non-interactive, same layout as sidebar-07)
      - Separator
      - Theme sub-menu (`DropdownMenuSub`):
        - `DropdownMenuSubTrigger`: `SunIcon`/`MoonIcon` (with dark: toggle) + "Tema"
        - `DropdownMenuSubContent`: "Açık" → `setTheme('light')`, "Koyu" → `setTheme('dark')`, "Sistem" → `setTheme('system')`
      - Separator
      - Change password item: `LockKeyholeIcon` + "Şifremi Değiştir" → `router.push('/change-password')`
      - Logout item: `LogOutIcon` + "Çıkış Yap" with `variant="destructive"` → `signOut()`
    - **Structure:** Wrapped in `SidebarMenu > SidebarMenuItem > DropdownMenu`
  - Notes: No props needed — all data from hooks. The `SidebarMenuButton` cva already has `data-open:` styling for accent colors, but the trigger element receives `data-popup-open` from base-ui, so explicit `data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground` classes are needed on the trigger.

- [x] Task 3: Fix change-password page for role-aware redirect and UI copy
  - File: `apps/web/src/app/change-password/page.tsx`
  - Action:
    - **Redirect fix:** After successful password change (line ~95), instead of hardcoded `router.push('/dashboard')`, check `user.systemRole === 'admin'` and redirect to `/admin/overview` for admin users, `/dashboard` for others. Use `useAuth()` to get the user object (already available or add it).
    - **UI copy fix:** Change the `CardDescription` text from `"İlk giriş için şifrenizi değiştirmeniz gerekmektedir"` (first login forced change copy) to a conditional: if `mustChangePassword` is true, show the forced change copy; otherwise show `"Şifrenizi buradan değiştirebilirsiniz"` ("You can change your password here") for voluntary changes.
  - Notes: This is an integration fix — without it, admin users who change their password get redirected to the tenant dashboard.

- [x] Task 4: Integrate NavUser into AdminSidebar and clean up ThemeToggle
  - File: `apps/web/src/app/admin/_components/admin-sidebar.tsx`
  - Action:
    - Add import: `import { NavUser } from '@/components/nav-user'`
    - Remove import: `ThemeToggle` from `@/components/theme-toggle`
    - Replace `SidebarFooter` contents: replace `<ThemeToggle />` with `<NavUser />`
  - File: `apps/web/src/components/theme-toggle.tsx`
  - Action: Delete this file — it has zero consumers after the admin-sidebar change (verified: only imported in `admin-sidebar.tsx`)
  - Notes: If `ThemeToggle` is referenced in any other file discovered at implementation time, keep it. But current grep shows single consumer.

### Acceptance Criteria

- [ ] AC 1: Given an admin user is logged in and on any admin page, when they look at the sidebar footer, then they see their avatar initial and email in the NavUser button.
- [ ] AC 2: Given an admin user clicks the NavUser button, when the dropdown opens, then they see email label, theme sub-menu ("Tema"), "Şifremi Değiştir", and "Çıkış Yap".
- [ ] AC 3: Given an admin user clicks "Çıkış Yap", when signOut completes, then they are redirected to login and session is cleared.
- [ ] AC 4: Given an admin user clicks "Şifremi Değiştir", when navigation completes, then they are on `/change-password` and the page shows voluntary change copy ("Şifrenizi buradan değiştirebilirsiniz"), not forced change copy.
- [ ] AC 5: Given an admin user opens the "Tema" sub-menu, when sub-content opens, then they can select "Açık", "Koyu", or "Sistem" to change theme, and the sub-menu positions correctly without overflow.
- [ ] AC 6: Given the sidebar is collapsed to icon mode, when admin views footer, then only the avatar circle is visible and clicking opens the full dropdown.
- [ ] AC 7: Given mobile viewport, when NavUser dropdown opens, then it appears on bottom (not right side).
- [ ] AC 8: Given the auth context is still loading (`user` is null), when the admin sidebar renders, then the NavUser component renders nothing (no crash, no empty avatar flash).
- [ ] AC 9: Given an admin user successfully changes their password on `/change-password`, when the redirect occurs, then they are taken to `/admin/overview` (not `/dashboard`).
- [ ] AC 10: Given a tenant user successfully changes their password on `/change-password`, when the redirect occurs, then they are still taken to `/dashboard` (no regression).

## Additional Context

### Dependencies

- `Avatar` shadcn component — must be added via CLI (Task 1) before creating NavUser
- No new npm packages — `next-themes`, `lucide-react`, all shadcn sidebar/dropdown primitives already installed
- `/change-password` route already exists — needs modification for role-aware redirect and conditional UI copy

### Testing Strategy

- **Manual testing:**
  - Log in as admin → verify NavUser in sidebar footer with email and avatar initial
  - Click NavUser → verify dropdown items (theme sub-menu, change password, logout)
  - Click "Çıkış Yap" → verify redirect to login
  - Click "Şifremi Değiştir" → verify navigation to `/change-password` with voluntary change copy
  - Complete password change as admin → verify redirect to `/admin/overview`
  - Complete password change as tenant user → verify redirect to `/dashboard` (regression check)
  - First-login forced password change → verify forced change copy still shows
  - Test theme switching via sub-menu (light/dark/system)
  - Collapse sidebar → verify avatar-only display, dropdown still works
  - Test mobile viewport → verify bottom-aligned dropdown
  - Refresh page / slow connection → verify no crash when user is null (loading state)
  - Keyboard navigation: Tab to NavUser button, Enter to open, arrow keys to navigate, Escape to close

### Notes

- Tenant `UserMenu` at `(tenant)/_components/user-menu.tsx` can be refactored to use NavUser in a future task
- `DropdownMenuSub` is first usage in this codebase — collision handling is built-in via Floating UI, but verify visually during testing
- Keyboard accessibility is handled by base-ui Menu primitives — Enter/Space to open, arrow keys to navigate items and sub-menus, Escape to close. No custom keyboard handling needed.

## Review Notes
- Adversarial review completed
- Findings: 7 total, 3 fixed, 4 skipped (noise/not applicable)
- Resolution approach: auto-fix for real issues
- Fixed F1: Removed Radix CSS variable `--radix-dropdown-menu-trigger-width` (base-ui uses `--anchor-width` internally)
- Fixed F6: Added active theme indicator (CheckIcon) in theme sub-menu
- Additional: Fixed sidebar state persistence via cookie reading in admin layout
