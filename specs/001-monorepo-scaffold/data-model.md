# Data Model: pnpm Monorepo Scaffold

**Feature**: 001-monorepo-scaffold
**Date**: 2026-03-29

---

This feature produces no database schema. The "entities" here are the configuration artifacts that define the workspace structure.

---

## Workspace Root

**Path**: `/` (repo root)

| Artifact | Path | Purpose |
|----------|------|---------|
| `pnpm-workspace.yaml` | `/pnpm-workspace.yaml` | Declares workspace glob `packages/*` |
| `package.json` | `/package.json` | Root scripts (`build`, `dev` placeholders), no direct dependencies |
| `tsconfig.json` | `/tsconfig.json` | Base TypeScript config extended by all packages |
| `.env.example` | `/.env.example` | Documents required environment variables (empty at scaffold stage) |

---

## Package: `@jetadisyon/electron`

**Path**: `packages/electron/`

| Artifact | Path | Key settings |
|----------|------|-------------|
| `package.json` | `packages/electron/package.json` | `name: @jetadisyon/electron`, `workspace:*` dep on shared |
| `tsconfig.json` | `packages/electron/tsconfig.json` | extends root, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `composite: true` |
| `src/index.ts` | `packages/electron/src/index.ts` | Minimal entry point comment |

**Relationships**: Depends on `@jetadisyon/shared` (workspace link).

---

## Package: `@jetadisyon/backend`

**Path**: `packages/backend/`

| Artifact | Path | Key settings |
|----------|------|-------------|
| `package.json` | `packages/backend/package.json` | `name: @jetadisyon/backend`, `workspace:*` dep on shared |
| `tsconfig.json` | `packages/backend/tsconfig.json` | extends root, `module: CommonJS`, `moduleResolution: Node10`, `target: ES2022`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `composite: true` |
| `src/index.ts` | `packages/backend/src/index.ts` | Minimal entry point comment |

**Relationships**: Depends on `@jetadisyon/shared`. Must NOT depend on `@jetadisyon/frontend`.

---

## Package: `@jetadisyon/frontend`

**Path**: `packages/frontend/`

| Artifact | Path | Key settings |
|----------|------|-------------|
| `package.json` | `packages/frontend/package.json` | `name: @jetadisyon/frontend`, `workspace:*` dep on shared |
| `tsconfig.json` | `packages/frontend/tsconfig.json` | extends root, `module: ESNext`, `moduleResolution: Bundler`, `target: ES2020`, `lib: [ES2020, DOM, DOM.Iterable]`, `jsx: react-jsx`, `noEmit: true` |
| `src/index.ts` | `packages/frontend/src/index.ts` | Minimal entry point comment |

**Relationships**: Depends on `@jetadisyon/shared`. Must NOT depend on `@jetadisyon/backend`. Vite handles bundling; TypeScript only type-checks (`noEmit: true`).

---

## Package: `@jetadisyon/shared`

**Path**: `packages/shared/`

| Artifact | Path | Key settings |
|----------|------|-------------|
| `package.json` | `packages/shared/package.json` | `name: @jetadisyon/shared`, `main: ./src/index.ts`, `types: ./src/index.ts`, `exports` pointing to `src/index.ts` |
| `tsconfig.json` | `packages/shared/tsconfig.json` | extends root, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `composite: true`, `declaration: true`, `emitDeclarationOnly: true` |
| `src/index.ts` | `packages/shared/src/index.ts` | Single placeholder type export |

**Relationships**: No dependencies on other packages. Consumed by all three other packages via pnpm workspace symlink. Source files serve as the type source at scaffold stage (no build step required).

---

## Supabase Folder Structure

**Path**: `supabase/`

| Artifact | Path | Purpose |
|----------|------|---------|
| `migrations/` | `supabase/migrations/` | Empty directory; populated in feature 002 |
| `seed.sql` | `supabase/seed.sql` | Empty file; populated in feature 002 |

No schema or SQL content at scaffold stage.

---

## TypeScript Config Inheritance Graph

```
tsconfig.json (root — strict: true, base options)
├── packages/electron/tsconfig.json   → module: NodeNext, target: ES2022
├── packages/backend/tsconfig.json    → module: CommonJS, decorators: true
├── packages/frontend/tsconfig.json   → module: ESNext, Bundler, jsx, noEmit
└── packages/shared/tsconfig.json     → NodeNext, emitDeclarationOnly
```

---

## Package Dependency Graph

```
@jetadisyon/electron  ──┐
@jetadisyon/backend   ──┼──→  @jetadisyon/shared
@jetadisyon/frontend  ──┘

frontend ✗──→ backend    (forbidden — HTTP only)
backend  ✗──→ frontend   (forbidden)
```
