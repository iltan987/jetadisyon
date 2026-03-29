# Research: pnpm Monorepo Scaffold

**Feature**: 001-monorepo-scaffold
**Date**: 2026-03-29

---

## Decision 1 — pnpm-workspace.yaml glob pattern

**Decision**: Use `packages: ['packages/*']` with a single direct-subdirectory glob.

**Rationale**: The glob `packages/*` matches exactly the four packages defined in SPEC.md (`electron`, `backend`, `frontend`, `shared`). Nested globs (`**`) are not needed. The root package is automatically included by pnpm and does not need to be listed.

**Alternatives considered**: `packages/**` — rejected because it would match any nested directory inside a package folder, which is not intended.

---

## Decision 2 — Cross-package workspace protocol

**Decision**: Use `"workspace:*"` in the `dependencies` field of any package that references another workspace package.

**Rationale**: `workspace:*` refuses to resolve to the npm registry — it is a hard workspace-only reference. This prevents accidental version drift. When published, pnpm converts it to the resolved version. `workspace:^` and `workspace:~` allow semver constraints but add unnecessary complexity at scaffold stage.

**Alternatives considered**: `"file:../shared"` — rejected because it does not benefit from pnpm's workspace deduplication and does not convert cleanly on publish.

---

## Decision 3 — Shared package: live types (source-first, no build step at scaffold stage)

**Decision**: Point the `shared` package's `main` and `types` fields in `package.json` directly to `./src/index.ts`. Do not emit a `dist/` at scaffold stage.

**Rationale**: At scaffold stage no build toolchain is installed. Running `tsc --noEmit` in consuming packages only needs TypeScript to resolve the `.d.ts` or `.ts` source. Pointing `main`/`types` at the TypeScript source file works when `allowImportingTsExtensions` or `moduleResolution` is set correctly. This avoids requiring a build step before type-checking can work.

**How it works**: pnpm creates a symlink at `node_modules/@jetadisyon/shared` pointing to `packages/shared`. TypeScript follows the `types` field in `package.json` and finds `src/index.ts`. No `paths` aliases needed.

**Alternatives considered**:
- Emit `dist/` via `tsc -b` before checking — rejected because it adds a mandatory build order dependency at a stage where nothing is installed yet.
- TypeScript project references — deferred to a later feature when the actual build pipeline is set up. Not needed for `tsc --noEmit` correctness at scaffold stage.

---

## Decision 4 — moduleResolution per package

**Decision**:

| Package | module | moduleResolution | Reason |
|---------|--------|-----------------|--------|
| shared | NodeNext | NodeNext | Library; no downstream consumer coupling |
| backend | CommonJS | Node10 | NestJS uses CommonJS; `emitDecoratorMetadata` requires `module: CommonJS`; `Node10` picks up `types` field |
| frontend | ESNext | Bundler | Vite is a bundler; `Bundler` mode is the official recommendation for Vite + TypeScript; allows no file extension on imports |
| electron | NodeNext | NodeNext | Electron main process is Node.js ESM-capable |

**Rationale**: `Bundler` moduleResolution was introduced in TypeScript 5.0 specifically for bundlers (Vite, webpack, etc.). It follows `exports` when present and falls back to `main`/`types` — both of which are set on the shared package. `Node10` for NestJS is the safe default used by the official NestJS starter; it follows `main`/`types` directly.

**Alternatives considered**: `NodeNext` for backend — rejected because NestJS `emitDecoratorMetadata` + `module: NodeNext` causes decorator metadata issues; NestJS's own scaffold uses `CommonJS` + `Node10`.

---

## Decision 5 — Root tsconfig.json as base

**Decision**: Create a root `tsconfig.json` at repo root that sets `strict: true` and shared baseline options. Each package extends it with `"extends": "../../tsconfig.json"`.

**Rationale**: A single source of truth for `strict: true` and other base settings prevents packages from diverging. Packages override only what is specific to their role (target, module, lib, jsx, etc.).

**Alternatives considered**: No base tsconfig, copy options into each package — rejected because it creates drift risk (e.g., one package accidentally drops `strict`).

---

## Decision 6 — NestJS decorator support

**Decision**: Backend tsconfig includes `"experimentalDecorators": true` and `"emitDecoratorMetadata": true`.

**Rationale**: NestJS relies on TypeScript decorators (`@Controller`, `@Injectable`, etc.) and `reflect-metadata` for dependency injection. These two flags are mandatory. They are not set in the root base tsconfig because only `backend` needs them.

**Alternatives considered**: None — these are hard requirements for NestJS.

---

## Decision 7 — Minimal src/index.ts content

**Decision**: Each package gets a `src/index.ts` with a single comment: `// Entry point`. The shared package exports an empty object type as a placeholder.

**Rationale**: TypeScript requires at least one file to be matched by the `include` glob when `rootDir` is set, or it errors. A minimal non-empty file satisfies this without adding any logic.

**Alternatives considered**: Empty file — rejected because TypeScript `noEmit` + `include` with an empty file can trigger `TS18003` ("No inputs were found") in some configurations.

---

---

## Decision 8 — Validated against official shadcn + turborepo monorepo examples

Two official example repos (`jetadisyon-shadcn`, `jetadisyon-turborepo`) are available at the repo root. Key findings and their impact on this feature:

**Decision**: Adopt the frontend tsconfig pattern from `jetadisyon-shadcn/apps/web/tsconfig.app.json` verbatim (adjusted for our `src/` include and `extends` pattern). Drop `composite: true` from all packages at scaffold stage.

**Rationale**:

1. **Root tsconfig must NOT set `module` or `moduleResolution`**. The shadcn example root sets only `target`, `strict`, `skipLibCheck` — packages declare their own module system. Our backend (CommonJS) and frontend (ESNext) would conflict if root forced one value. Confirmed: keep root tsconfig option-minimal.

2. **Frontend tsconfig: use `allowImportingTsExtensions`, `verbatimModuleSyntax`, `moduleDetection: "force"`**. The shadcn `tsconfig.app.json` uses all three. These are now TypeScript best practices for bundler-mode projects. We adopt them for `packages/frontend/tsconfig.json`. `allowImportingTsExtensions` is safe because `noEmit: true` is set.

3. **`composite: true` is not used on the UI packages in either example**. Neither example needs project references at scaffold stage. We remove `composite: true` from all packages in our scaffold — it belongs in the build pipeline feature, not the scaffold.

4. **`.npmrc` file**: both examples include an `.npmrc` at the root (even if empty). This is a pnpm convention that signals the workspace layout to tooling. We add an empty `.npmrc` to our scaffold.

5. **`typescript` in root `devDependencies`**: both examples pin TypeScript at the workspace root (5.9.x). Packages inherit it via workspace hoisting. We add `typescript: "5.9.3"` to the root `package.json` devDependencies.

6. **Cross-package paths aliases**: both examples use `tsconfig.paths` for workspace package resolution. However, both expose per-file exports (`./components/*`, `./lib/*`). Our `@jetadisyon/shared` has a single `src/index.ts` entry point and uses the `types` field in `package.json` — making `paths` aliases unnecessary. Decision 3 holds.

**Alternatives considered**: Adopting the turborepo pattern of a dedicated `packages/typescript-config/` package — rejected as premature abstraction for 4 packages.

---

## Resolved Clarifications

All spec requirements are fully specified. No TBD items apply to this scaffold feature.
