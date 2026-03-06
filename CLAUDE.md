# CLAUDE.md

## Architecture
- Frontend: React/Vite on port 3000
- Backend: Express on port 4000  
- DB: PostgreSQL via Prisma

## Commands
- `npm run dev` — start everything
- `npm run test` — run all unit tests
- `npm run test:integration` — run integration tests (auto-starts/stops test DB)
- `npm run test:e2e` — run Playwright tests (auto-starts/stops postgres + mailpit)

## Pre-commit hook
- A Claude-powered code review runs before every commit
- Install once after cloning: `npm run setup:hooks`
- Reviews staged JS/JSX files; if issues are found, Claude attempts to fix and re-reviews (up to 3 iterations)
- Bypass when necessary: `git commit --no-verify`

## Conventions
- Always co-locate unit tests with source files
- New API routes need integration tests
- New user flows need E2E test coverage
- Use Prisma migrations for schema changes (never edit schema.prisma directly)
- Use Conventional Commits for all commit messages (feat:, fix:, test:, chore:, docs:, refactor:)

## Test DB
- Integration tests use DATABASE_URL from .env.test (port 5433)
- Docker lifecycle is fully automatic — `docker-lifecycle.js` starts the container, runs `prisma migrate deploy`, and stops it after the run
- After schema changes: just run `npm run test:integration` — migrations are applied automatically
- E2E tests auto-start postgres + mailpit via `e2e/global-setup.mjs` and stop them in `e2e/global-teardown.mjs`