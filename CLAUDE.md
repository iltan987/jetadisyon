# CLAUDE.md
> Behavioral rules for Claude Code in this repository.
> Read this file AND SPEC.md before every session. SPEC.md defines what to build. This file defines how to behave.

---

## FIRST THING EVERY SESSION

1. Read `SPEC.md` fully
2. Read `CLAUDE.md` (this file)
3. Understand current state of the repo before writing anything
4. If the task is ambiguous or not covered in SPEC.md — ask, do not guess

---

## GENERAL BEHAVIOR

- Do not start coding immediately. Confirm your plan with the user first for any non-trivial task.
- Do one thing at a time. Complete and confirm before moving to the next.
- If you are about to make a decision that is not explicitly covered in SPEC.md, stop and ask.
- If something in SPEC.md says TBD, do not implement it — ask the user for a decision first.
- Never scaffold, stub, or create placeholder code for out-of-scope features. Only build what is needed now.
- Prefer simple over clever. The simplest working solution is correct.

---

## BEFORE INSTALLING ANY PACKAGE

- State the package name, what it does, and why you need it
- Check if an existing dependency already covers the need
- Wait for user confirmation before running any install command
- Never install multiple packages at once without listing all of them first

---

## FILE AND FOLDER RULES

- Follow the folder structure in SPEC.md exactly
- Do not create files outside the structure without asking
- Do not create `index.ts` barrel files unless explicitly asked
- One responsibility per file — do not put multiple classes or services in one file
- Keep `shared/` for types only — no logic

---

## CODE QUALITY

- TypeScript strict mode — no `any`, no type assertions without an inline comment explaining why
- Never use `console.log` in `backend/` — use NestJS `Logger`
- All async functions must have try/catch — never let errors propagate silently
- Every new NestJS service or controller must be registered in its module
- Do not leave `TODO` comments in code — either implement it or raise it to the user

---

## DATABASE

- All schema changes go through a Prisma migration — never edit the DB directly
- Never rename a column or table without flagging it as a breaking change first
- Do not add columns speculatively — only add what is needed for the current task
- Local DB is SQLite. Cloud DB is Supabase. Never mix their concerns — see SPEC.md

---

## GIT

- Do not commit automatically — always show the user what would be committed and ask
- Commit messages follow conventional commits: `feat:` `fix:` `chore:` `docs:` `refactor:`
- One logical change per commit — do not bundle unrelated changes
- Never commit `.env` or any file containing secrets

---

## WHEN SOMETHING IS BROKEN

- Do not silently work around a bug — surface it and explain it
- Do not delete code to make a test pass
- If a dependency causes an issue, explain the problem and propose alternatives before switching
- If you are stuck after two attempts, stop and explain the situation to the user

---

## THINGS YOU MUST NEVER DO

- Never run `rm -rf` or any destructive command without explicit user confirmation
- Never modify `SPEC.md` or `CLAUDE.md` — these are user-managed documents
- Never implement a feature that is listed under "Out of MVP scope" in SPEC.md
- Never push to git remote without explicit instruction
- Never expose or log credentials, API keys, or tokens

---

*Keep this file short. If a rule needs a long explanation, it belongs in SPEC.md instead.*

## Active Technologies
- TypeScript 5.x — strict mode; Node.js 20 LTS + pnpm workspaces (no third-party packages installed at scaffold stage) (001-monorepo-scaffold)
- N/A — no database schema in this feature (001-monorepo-scaffold)

## Recent Changes
- 001-monorepo-scaffold: Added TypeScript 5.x — strict mode; Node.js 20 LTS + pnpm workspaces (no third-party packages installed at scaffold stage)
