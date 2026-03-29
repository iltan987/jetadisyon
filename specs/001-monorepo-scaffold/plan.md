# Implementation Plan: pnpm Monorepo Scaffold

**Branch**: `001-monorepo-scaffold` | **Date**: 2026-03-29 | **Spec**: `specs/001-monorepo-scaffold/spec.md`
**Input**: Feature specification from `/specs/001-monorepo-scaffold/spec.md`

---

## Summary

Create the pnpm workspace root and four packages (`electron`, `backend`, `frontend`, `shared`) with correct `package.json`, `tsconfig.json`, and minimal `src/index.ts` files — no application logic, no installed third-party dependencies. The scaffold must pass `pnpm ls -r` (four members) and `tsc --noEmit` (zero errors) in each package, with cross-package type imports resolving via workspace symlinks.

---

## Technical Context

**Language/Version**: TypeScript 5.x — strict mode; Node.js 20 LTS
**Primary Dependencies**: pnpm workspaces (no third-party packages installed at scaffold stage)
**Storage**: N/A — no database schema in this feature
**Testing**: `tsc --noEmit` per package; `pnpm ls -r` at root
**Target Platform**: Windows desktop (Electron) — scaffold works cross-platform
**Project Type**: Monorepo scaffold (config files and minimal entry points only)
**Performance Goals**: N/A
**Constraints**: Zero application logic; zero third-party packages installed; `tsc --noEmit` must pass in all four packages with zero errors
**Scale/Scope**: 4 workspace packages

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Offline-First / Auto-Accept safety gate | N/A | No business logic in scaffold |
| II — Locked Stack | ✅ PASS | Sets up exactly: Electron, NestJS, React+Vite, pnpm workspaces, TypeScript strict — no deviation |
| III — Package Isolation | ✅ PASS | Exactly 4 packages; frontend/backend declared non-dependent; shared is types-only; no barrel files |
| IV — Platform Adapter Contract | N/A | No platform modules in scaffold |
| V — Simplicity / Minimal Scope | ✅ PASS | Config files and minimal `src/index.ts` only; no stubs, no placeholders beyond what TS requires |
| VI — Confirm Before Coding | ✅ PASS | Plan presented before implementation via `/speckit.plan` |

**No violations. No Complexity Tracking entry required.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-monorepo-scaffold/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by /speckit.plan)
```

### Source Code (repository root)

```text
jetadisyon/                        ← repo root
├── packages/
│   ├── electron/
│   │   ├── package.json           @jetadisyon/electron
│   │   ├── tsconfig.json          NodeNext, ES2022, composite
│   │   └── src/
│   │       └── index.ts           // Entry point
│   ├── backend/
│   │   ├── package.json           @jetadisyon/backend
│   │   ├── tsconfig.json          CommonJS, Node10, decorators, ES2022, composite
│   │   └── src/
│   │       └── index.ts           // Entry point
│   ├── frontend/
│   │   ├── package.json           @jetadisyon/frontend
│   │   ├── tsconfig.json          ESNext, Bundler, ES2020, DOM, jsx, noEmit
│   │   └── src/
│   │       └── index.ts           // Entry point
│   └── shared/
│       ├── package.json           @jetadisyon/shared, main/types → src/index.ts
│       ├── tsconfig.json          NodeNext, emitDeclarationOnly, composite
│       └── src/
│           └── index.ts           export type placeholder
├── supabase/
│   ├── migrations/                empty dir
│   └── seed.sql                   empty file
├── pnpm-workspace.yaml            packages: ['packages/*']
├── package.json                   root, scripts: { build, dev }
├── tsconfig.json                  base: strict, no module/target (overridden per package)
└── .env.example                   empty placeholder
```

**Structure Decision**: Monorepo (Option 2 variant — desktop app with local backend). Structure matches SPEC.md exactly. No extra directories created.

---

## Key Design Decisions

### 0. Validated Against Official Examples

Configs below are cross-referenced against `jetadisyon-shadcn` (Vite + React + shadcn/ui) and `jetadisyon-turborepo` (pnpm monorepo official template), both available at repo root. Key adoptions:
- Frontend tsconfig: matches shadcn's `tsconfig.app.json` pattern (`bundler`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `moduleDetection: "force"`)
- Root tsconfig: no `module`/`moduleResolution` (packages override independently)
- `composite: true` removed from scaffold — belongs in build pipeline feature
- `.npmrc` added (pnpm convention — both examples include it)
- `typescript: "5.9.3"` pinned at workspace root (both examples do this)

### 1. Live Types — No Build Step at Scaffold Stage

`packages/shared/package.json` points `main` and `types` directly at `src/index.ts`. pnpm creates a workspace symlink at `node_modules/@jetadisyon/shared`. TypeScript follows the `types` field and resolves the source file directly.

This means consuming packages can run `tsc --noEmit` without first building shared. TypeScript project references and `dist/` output will be added in a later feature when the actual build pipeline is established.

```json
// packages/shared/package.json (relevant fields)
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

### 2. moduleResolution per Package

| Package | `module` | `moduleResolution` | Why |
|---------|----------|-------------------|-----|
| shared | NodeNext | NodeNext | Standard library default |
| backend | CommonJS | Node10 | NestJS requires CommonJS; Node10 follows `main`/`types` |
| frontend | ESNext | Bundler | Vite recommendation; no `.js` extension requirement |
| electron | NodeNext | NodeNext | Node.js ESM |

### 3. NestJS Decorator Flags — Backend Only

`experimentalDecorators: true` and `emitDecoratorMetadata: true` are set only in the backend tsconfig, not in the root base. These are NestJS-specific and should not bleed into other packages.

### 4. Frontend `noEmit: true` + Modern Bundler Flags

Vite owns the frontend build. TypeScript only type-checks. `noEmit: true` prevents TypeScript from attempting to emit files. Additionally, three flags adopted from the official shadcn monorepo example:
- `allowImportingTsExtensions: true` — allows `.ts` imports in source (valid because `noEmit: true`)
- `verbatimModuleSyntax: true` — ensures `import type` is not re-emitted as value imports
- `moduleDetection: "force"` — treats every file as a module regardless of `import`/`export` presence

### 4a. No `composite: true` at Scaffold Stage

Neither official example uses `composite: true` on their shared/UI packages. TypeScript project references are a build optimization, not a prerequisite for `tsc --noEmit` correctness. Removing it keeps the scaffold simple — project references will be added in the build pipeline feature.

### 5. `.env.example` is Empty at Scaffold Stage

No environment variables are needed until feature 002 (Supabase setup). The file is created now to satisfy FR-007 and to establish the convention.

---

## Contracts

No external interfaces are defined by this feature. The scaffold exposes no APIs, CLI commands, or public surfaces. Contracts directory is not created.

---

## Post-Design Constitution Check

Re-evaluating after Phase 1 design:

| Principle | Status | Notes |
|-----------|--------|-------|
| II — Locked Stack | ✅ PASS | tsconfig targets match the locked stack (Electron/Node, NestJS/CommonJS, React+Vite) |
| III — Package Isolation | ✅ PASS | shared package.json has no deps; backend/frontend not cross-referenced |
| V — Simplicity | ✅ PASS | No TypeScript project references introduced prematurely; no build tooling beyond tsc |

**All gates pass. Implementation may proceed.**
