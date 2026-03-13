---
title: 'Update Architecture Doc After Code Review'
slug: 'update-architecture-post-review'
created: '2026-03-13'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Markdown documentation']
files_to_modify:
  - '_bmad-output/planning-artifacts/architecture.md'
code_patterns: ['BMAD architecture doc structure — frontmatter + numbered sections + directory trees']
test_patterns: ['N/A — documentation-only change']
---

# Tech-Spec: Update Architecture Doc After Code Review

**Created:** 2026-03-13

## Overview

### Problem Statement

The architecture planning document (`_bmad-output/planning-artifacts/architecture.md`) has several sections that are now stale after code review improvements. Specifically: environment validation patterns, rate limiting configuration, error handling approaches, shared package contents, and API client capabilities are either described as "to be decided" or don't reflect the current implemented state. Future dev agents using this doc as reference will get outdated guidance.

### Solution

Update the architecture doc to reflect patterns that are now implemented and established: t3-env for frontend env validation, configurable throttling via env vars, Supabase error code detection, shared constants in packages/api, API client with timeout and optional Zod validation, phone validation with libphonenumber-js, and query key factory pattern.

### Scope

**In Scope:**
- Update `_bmad-output/planning-artifacts/architecture.md` sections that reference now-implemented patterns

**Out of Scope:**
- Story file updates (still accurate — ACs are satisfied)
- New documentation files or project-context.md creation
- Code changes

## Context for Development

### Codebase Patterns

- Architecture doc is a BMAD planning artifact used as reference for future development
- Doc is structured with sections: Project Context, Starter Template Evaluation, Core Architectural Decisions, etc.
- Updates must preserve existing structure and only modify sections where patterns have changed
- Doc uses `✅ EXISTS` markers on files that were present at time of writing — new files need these markers too

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `_bmad-output/planning-artifacts/architecture.md` | Target file to update |
| `.claude/CLAUDE.md` | Already-updated project instructions (source of truth for current patterns) |
| `apps/web/src/lib/env/client.ts` | t3-env client validation (reference for doc update) |
| `apps/web/src/lib/env/server.ts` | t3-env server validation (reference for doc update) |
| `apps/web/src/lib/api-client.ts` | API client with timeout + Zod (reference) |
| `apps/web/src/lib/query-keys.ts` | Query key factory (reference) |
| `apps/web/src/lib/tenant-styles.ts` | Frontend style maps (reference) |
| `packages/api/src/tenant.constants.ts` | Shared label constants (reference) |
| `apps/api/src/config/env.validation.ts` | Backend env with throttle vars (reference) |

### Technical Decisions

- Only update sections where the architecture doc contradicts or is incomplete relative to current implementation
- Preserve the document's collaborative tone and structure
- Don't rewrite sections that are still accurate

## Implementation Plan

### Task 1: Update Fitness Assessment — Frontend env validation

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At line ~139, after "Environment management → @nestjs/config + zod validation", add a new bullet: "Frontend environment validation → @t3-oss/env-nextjs with split client/server files"
- Notes: This brings the doc in line with `apps/web/src/lib/env/client.ts` and `server.ts`

### Task 2: Move implemented libraries out of "to be decided" list

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At lines ~143-150, move `Rate limiting → @nestjs/throttler` from the "Requires additional libraries (to be decided)" section to the "Well-served" section above. Add `Phone validation → libphonenumber-js` to the "Well-served" section as well.
- Notes: Both libraries are installed and in use. Leave remaining items (real-time, map, i18n, observability, email, credential encryption) as "to be decided" since they haven't been implemented yet.

### Task 3: Update Rate Limiting section with env configurability

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At lines ~244-249, update the Rate Limiting section to note that TTL and limit are configurable via `THROTTLE_TTL` and `THROTTLE_LIMIT` environment variables (defaults: 60s TTL, 100 requests/TTL). Mention `ThrottlerModule.forRootAsync` with `ConfigService` injection.
- Notes: Reflects change from hardcoded `ThrottlerModule.forRoot` to `forRootAsync` pattern.

### Task 4: Add tenant.constants.ts to shared packages description

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At lines ~392-395 (Shared packages naming section), add to `packages/api` description: `tenant.constants.ts` contains shared label maps (`TENANT_STATUS_LABELS`, `TENANT_LICENSE_LABELS`) typed as `Record<TenantStatus, string>` for compile-time safety.
- Notes: Labels are data (shared), styles are presentation (frontend-only in `apps/web/src/lib/tenant-styles.ts`).

### Task 5: Update frontend lib/ directory tree

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At lines ~493-496 (frontend `lib/` directory listing), add the following entries:
  - `├── env/` directory with `client.ts` (t3-env client validation) and `server.ts` (t3-env server validation)
  - `├── query-keys.ts` (TanStack Query key factory)
  - `├── tenant-styles.ts` (tenant status/license style maps)
- Notes: Mark `env/` entries with `✅ EXISTS` since they're implemented.

### Task 6: Add Supabase error code detection to Error Handling section

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At lines ~600-604 (Error Handling process pattern), add a bullet: "Supabase Auth error detection uses `authError.code` (e.g., `email_exists`, `user_already_exists`) from `@supabase/auth-js` `ErrorCode` type — not string matching on `authError.message`."
- Notes: This was a code review fix to prevent brittle error detection.

### Task 7: Update api-client.ts description

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At line ~924, update the `api-client.ts` comment from "REST API client (fetch wrapper)" to "REST API client (fetch wrapper with 30s timeout, optional Zod validation, AbortController)". Also update the earlier reference at line ~495.
- Notes: Reflects the timeout, optional `schema` param for Zod validation, and `AbortSignal.any()` for signal combining.

### Task 8: Add tenant.constants.ts to packages/api directory tree

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At lines ~957-970 (packages/api/src/ tree), add `├── tenant.constants.ts  # ✅ EXISTS — shared label maps (status, license)` after `database.types.ts`.
- Notes: Must match actual file location.

### Task 9: Add query key factory mention to TanStack Query section

- File: `_bmad-output/planning-artifacts/architecture.md`
- Action: At lines ~268-272 (TanStack Query section), add a bullet: "Query key factory in `lib/query-keys.ts` — centralized key definitions for cache invalidation consistency"
- Notes: Reflects the implemented pattern in `apps/web/src/lib/query-keys.ts`.

## Acceptance Criteria

- [x] AC 1: Given the architecture doc, when reading the Fitness Assessment section, then `@t3-oss/env-nextjs` is listed under "Well-served" for frontend env validation
- [x] AC 2: Given the architecture doc, when reading the "to be decided" library list, then `@nestjs/throttler` and `libphonenumber-js` are no longer listed there (moved to "Well-served")
- [x] AC 3: Given the architecture doc, when reading the Rate Limiting section, then `THROTTLE_TTL`/`THROTTLE_LIMIT` env var configurability is documented
- [x] AC 4: Given the architecture doc, when reading shared packages conventions, then `tenant.constants.ts` with label maps is described
- [x] AC 5: Given the architecture doc, when reading the frontend lib/ tree, then `env/`, `query-keys.ts`, and `tenant-styles.ts` are present
- [x] AC 6: Given the architecture doc, when reading Error Handling, then Supabase error code detection pattern is documented
- [x] AC 7: Given the architecture doc, when reading api-client.ts references, then timeout, Zod validation, and AbortController capabilities are noted
- [x] AC 8: Given the architecture doc, when reading packages/api/src/ tree, then `tenant.constants.ts` entry exists
- [x] AC 9: Given the architecture doc, when reading the TanStack Query section, then query key factory pattern is mentioned
- [x] AC 10: Given the architecture doc after all edits, when comparing to previous version, then no existing accurate content has been removed or rewritten

## Dependencies

- None — documentation-only change with no code dependencies

## Testing Strategy

- **Manual review**: Diff the architecture doc before/after to verify only targeted sections changed
- **Cross-reference**: Each updated section should match the current implementation as described in `.claude/CLAUDE.md`
- **No automated tests**: Documentation change — no test suite applicable

## Review Notes

- Adversarial review completed
- Findings: 13 total, 6 fixed, 7 skipped (noise/pre-existing/undecided)
- Resolution approach: auto-fix

## Notes

- **Risk**: Minimal — worst case is a doc inaccuracy that gets caught in next review
- **Known limitation**: The architecture doc contains many planned-but-not-yet-implemented sections (marketplace integration, SSE, analytics, etc.) — those are intentionally left unchanged
- **Future**: As more features are implemented, this doc will need periodic updates to stay current
