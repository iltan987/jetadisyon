# Quickstart & Verification: pnpm Monorepo Scaffold

**Feature**: 001-monorepo-scaffold
**Date**: 2026-03-29

---

## Prerequisites

- pnpm v10.25+ installed globally (`pnpm --version`)
- Node.js 20 LTS installed
- TypeScript available (will be installed as part of the scaffold)

---

## Verification Steps (in order)

### Step 1 — Install workspace dependencies

```bash
# From repo root
pnpm install
```

**Expected**: All four packages are recognized as workspace members. No errors about missing packages. (`node_modules/@jetadisyon/shared` will exist as a symlink.)

---

### Step 2 — Verify workspace membership (SC-001)

```bash
pnpm ls -r
```

**Expected output** (exact package names):
```
Legend: production dependency, optional only, dev only

jetadisyon@0.1.0 /path/to/jetadisyon

@jetadisyon/backend@0.1.0 /path/to/jetadisyon/packages/backend
└── @jetadisyon/shared 0.1.0 <- /path/to/jetadisyon/packages/shared

@jetadisyon/electron@0.1.0 /path/to/jetadisyon/packages/electron
└── @jetadisyon/shared 0.1.0 <- /path/to/jetadisyon/packages/shared

@jetadisyon/frontend@0.1.0 /path/to/jetadisyon/packages/frontend
└── @jetadisyon/shared 0.1.0 <- /path/to/jetadisyon/packages/shared

@jetadisyon/shared@0.1.0 /path/to/jetadisyon/packages/shared
```

Must list exactly four workspace packages.

---

### Step 3 — TypeScript check per package (SC-002)

Run in each package individually:

```bash
pnpm --filter @jetadisyon/shared exec tsc --noEmit
pnpm --filter @jetadisyon/backend exec tsc --noEmit
pnpm --filter @jetadisyon/frontend exec tsc --noEmit
pnpm --filter @jetadisyon/electron exec tsc --noEmit
```

**Expected**: Each exits with code 0, zero errors, zero warnings.

---

### Step 4 — Cross-package type resolution (SC-004)

Add a test type to `packages/shared/src/index.ts`:

```typescript
export type TestOrder = { id: string; platform: string };
```

Add a test import to `packages/backend/src/index.ts`:

```typescript
import type { TestOrder } from '@jetadisyon/shared';
const _order: TestOrder = { id: '1', platform: 'yemeksepeti' };
```

Run:

```bash
pnpm --filter @jetadisyon/backend exec tsc --noEmit
```

**Expected**: Exits with code 0. Revert both files after verification.

---

### Step 5 — Filter targeting (acceptance scenario)

```bash
pnpm --filter @jetadisyon/shared build
```

**Expected**: Targets only the shared package. (The `build` script may be a no-op placeholder at scaffold stage — that is acceptable. The command must not throw a "package not found" error.)

---

### Step 6 — Directory structure check (SC-003)

```bash
ls packages/
# Expected: backend  electron  frontend  shared

ls supabase/
# Expected: migrations  seed.sql
```

---

## Acceptance Criteria Mapping

| Criterion | Verification |
|-----------|-------------|
| SC-001 — four packages in `pnpm ls -r` | Step 2 |
| SC-002 — `tsc --noEmit` zero errors per package | Step 3 |
| SC-003 — directory tree matches SPEC.md | Step 6 |
| SC-004 — cross-package type import resolves | Step 4 |
| SC-005 — zero application logic | Visual inspection: only config files and minimal comments in `src/index.ts` |
