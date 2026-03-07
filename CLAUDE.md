# CLAUDE.md

## Stack
Frontend: React/Vite :3000 | Backend: Express :4000 | DB: PostgreSQL/Prisma

## Commands
- `npm run dev` — start everything
- `npm run test` — unit tests
- `npm run test:integration` — integration tests (auto-manages test DB)
- `npm run test:e2e` — Playwright (auto-manages postgres + mailpit)

## Pre-commit hook
Runs Claude code review on staged JS/JSX; auto-fixes and re-reviews (up to 3×).
Install: `npm run setup:hooks` | Bypass: `git commit --no-verify`

## Code Review (Claude Code sessions)
Nested `claude` is blocked inside Claude Code. Before every `git commit` you MUST:
1. `git diff --cached` — inspect all staged changes
2. Review for: bugs, security issues, missing error handling, test gaps
3. Fix real issues, then commit

## Test-First Development
1. Read ACs from `docs/specs/overview.md`
2. Write unit + integration tests encoding the ACs — before any implementation
3. Implement until tests pass
4. Write E2E tests after (UI decisions not fully specified upfront)

Tests derive from the spec, not retrofitted to code.

## Conventions
- Co-locate unit tests with source files (`backend/tests/integration/` for integration, `e2e/` for E2E)
- New routes → integration tests; new flows → E2E tests
- Schema changes: Prisma migrations only (never edit `schema.prisma` directly)
- Commits: Conventional Commits (`feat:` `fix:` `test:` `chore:` `docs:` `refactor:`)

## Test DB
- Integration: `.env.test` DATABASE_URL port 5433; Docker lifecycle fully automatic
- After schema changes: just run `npm run test:integration` — migrations auto-apply
- E2E: postgres + mailpit auto-managed via `e2e/global-setup.mjs` / `global-teardown.mjs`
- If prod Docker stack is running, stop it before E2E: `docker compose stop backend frontend`
