# CLAUDE.md

## Architecture
- Frontend: React/Vite on port 3000
- Backend: Express on port 4000  
- DB: PostgreSQL via Prisma

## Commands
- `npm run dev` — start everything
- `npm run test` — run all unit tests
- `npm run test:integration` — run integration tests
- `npm run test:e2e` — run Playwright tests

## Conventions
- Always co-locate unit tests with source files
- New API routes need integration tests
- New user flows need E2E test coverage
- Use Prisma migrations for schema changes (never edit schema.prisma directly)

## Test DB
- Integration tests use DATABASE_URL from .env.test
- Run `docker compose -f docker-compose.test.yml up -d` before integration tests