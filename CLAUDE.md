# jetadisyon Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-17

## Active Technologies

- TypeScript 5.x strict (backend, admin, shared packages); Rust 2021 (Tauri desktop backend) (005-database-design)
- PostgreSQL (server, via `@repo/db`); SQLite (Tauri local-only layer) (005-database-design)

- TypeScript 5.x (strict), Node.js ≥20 + Prisma 7.7.0, `@prisma/client ^7.7.0`, `@prisma/adapter-pg ^7.7.0`, pnpm workspaces, Turbo v2 (004-db-package)
- PostgreSQL via `@prisma/adapter-pg` (`PrismaPg` driver) (004-db-package)

- TypeScript 5.x (strict, no any), Node.js ≥20, Rust 2021 (Tauri — unchanged) + pnpm v10 workspaces, Turbo v2, NestJS v11 (API), React 19 + Vite v7 (frontend), Vitest (new — frontend tests), `@repo/vite-config` (new — shared Vitest base config), Prisma (new — ORM), i18next + react-i18next (new — i18n), zod (existing — env validation), Docker Compose v2 (new — local infra), GitHub Actions (new — CI) (002-infra-scaffold)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

cargo test && cargo clippy

## Code Style

TypeScript 5.x (strict, no any), Node.js ≥20, Rust 2021 (Tauri — unchanged): Follow standard conventions

## Recent Changes

- 005-database-design: Added TypeScript 5.x strict (backend, admin, shared packages); Rust 2021 (Tauri desktop backend)

- 004-db-package: Added TypeScript 5.x (strict), Node.js ≥20 + Prisma 7.7.0, `@prisma/client ^7.7.0`, `@prisma/adapter-pg ^7.7.0`, pnpm workspaces, Turbo v2

- 002-infra-scaffold: Added TypeScript 5.x (strict, no any), Node.js ≥20, Rust 2021 (Tauri — unchanged) + pnpm v10 workspaces, Turbo v2, NestJS v11 (API), React 19 + Vite v7 (frontend), Vitest (new — frontend tests), `@repo/vite-config` (new — shared Vitest base config), Prisma (new — ORM), i18next + react-i18next (new — i18n), zod (existing — env validation), Docker Compose v2 (new — local infra), GitHub Actions (new — CI)

<!-- MANUAL ADDITIONS START -->

## Agent Guidelines

Rules governing how the agent should behave in this project. These take precedence over default behaviors.

### Git Commits

- Never add a `Co-Authored-By:` trailer to commit messages. Keep commits clean.

### CLI-First Scaffolding

Prefer CLI tools over manual file creation for any task a CLI can handle (init, scaffold, package add, migrations, etc.).

Steps, in order:

1. **Verify CLI usage first** — do not rely on training knowledge; run `--help`, use Context7, web search, or read `node_modules` source.
2. **Back up before running** — ensure git is clean (stage/commit first) so any CLI-damaged file is recoverable. If the CLI writes outside the repo, create an explicit backup.
3. **Run the CLI** with the verified arguments.
4. **Check output** — read all printed warnings and errors.
5. **Compare actual vs expected** — identify what was created/modified and what's missing.
6. **Complete manually if needed** — CLIs may only partially accomplish a task; finish the rest after verifying.

### Phase-Gate Approval

After each implementation phase completes:

1. Run all checks (build, lint, type-check, tests) and wait for every check to pass.
2. Present a short phase summary to the user.
3. Ask for explicit approval before starting the next phase.
4. By default, commit the completed phase before moving on — unless the user says otherwise.

Rushing through multiple phases without user checkpoints is prohibited.

### Library Research Mandate

Before writing any code that uses a library, framework, SDK, or external dependency, research its current API via available tools: Context7 MCP, web search, or reading installed `node_modules` source. Never rely solely on training knowledge — it is frequently outdated (e.g., zod v4 changed significantly). If behavior remains unclear after research, ask the user rather than guessing.

### Memory Scope

Prefer updating `CLAUDE.md` over writing to local (`~/.claude`) memory files. `CLAUDE.md` is project-scoped, versioned with the repo, and visible to all contributors. Use local memory only for information that is truly user-specific and not relevant to the project itself.

<!-- MANUAL ADDITIONS END -->
