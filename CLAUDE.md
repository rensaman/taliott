# CLAUDE.md

## Stack
Frontend: React/Vite :3000 | Backend: Express :4000 | DB: PostgreSQL/Prisma

## Commands
- `npm run dev` — start everything
- `npm run test` — unit | `npm run test:integration` — integration | `npm run test:e2e` — Playwright

## Before Every Commit
1. `git diff --cached` — review for bugs, security, missing error handling, test gaps
2. Fix real issues, then commit
Pre-commit hook runs all tests. First-time setup: `npm run setup:hooks` (sets `core.hooksPath`) | Bypass: `--no-verify`

### Pre-commit test cache
The hook caches results in `.git/test-pass-cache` (local, never committed). Tests are **skipped automatically** when both the staged git tree and the hook file itself are identical to the last successful run — so committing an already-green tree is instant. The cache is invalidated the moment any tracked file (source, config, migration, locale, test) changes in the index, or the hook file itself changes on disk. To force a full re-run without changing any file: `rm .git/test-pass-cache`.

## Test-First Development
1. Read ACs from `docs/specs/overview.md`
2. Write unit + integration tests first, then implement until they pass
3. E2E tests after (UI not fully specified upfront)

## Conventions
- Unit tests co-located; integration → `backend/tests/integration/`; E2E → `e2e/`
- New routes → integration tests; new flows → E2E tests
- Schema changes: Prisma migrations only (never edit `schema.prisma` directly)
- Commits: `feat:` `fix:` `test:` `chore:` `docs:` `refactor:`
- Integration DB: `.env.test` port 5433, Docker auto-managed; migrations auto-apply on test run
- E2E: pre-commit hook runs them automatically (reuses running dev stack services). To run manually while the prod docker stack is up, stop conflicting containers first: `docker compose stop backend frontend`
