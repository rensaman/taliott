# taliott

Group scheduling tool. Organizers define a date range and time-of-day preference; participants vote on available slots.

## Stack

- **Frontend** — React 18 + Vite, port 3000
- **Backend** — Express 4 + Node.js (ESM), port 4000
- **Database** — PostgreSQL 16 via Prisma ORM

---

## Local development

### Prerequisites

- Node.js 20+
- Docker (for the database)

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

```bash
docker compose up -d postgres
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env   # then edit if needed
```

Default `backend/.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taliott_dev"
```

### 4. Run migrations

```bash
cd backend && npx prisma migrate deploy && cd ..
```

### 5. Start dev servers

```bash
npm run dev
```

App is at http://localhost:3000. Backend API at http://localhost:4000.

---

## Docker (full stack)

Runs everything — postgres, backend, frontend — in containers.

```bash
docker compose up --build
```

App is at http://localhost:3000. Migrations run automatically on backend startup.

To stop:
```bash
docker compose down
```

---

## Testing

### Unit tests

```bash
npm run test
```

Co-located with source files, no database required.

### Integration tests

Require the test database with migrations applied:

```bash
docker compose -f docker-compose.test.yml up -d
cd backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/taliott_test" npx prisma migrate deploy && cd ..
npm run test:integration
```

Uses `DATABASE_URL` from `.env.test` (port 5433).

### E2E tests (Playwright)

Require both dev servers running (or they start automatically):

```bash
npm run test:e2e
```

`create-event-real.spec.js` hits the real backend and DB — ensure `backend/.env` is configured and the dev database is running.

---

## Project structure

```
taliott/
├── frontend/          # React/Vite app
│   ├── src/
│   │   ├── features/  # Feature-scoped components + co-located tests
│   │   └── App.jsx
│   └── Dockerfile
├── backend/           # Express API
│   ├── src/
│   │   ├── lib/       # Pure utilities (slots, etc.)
│   │   └── routes/    # API route handlers + co-located unit tests
│   ├── prisma/        # Schema + migrations
│   ├── tests/integration/
│   └── Dockerfile
├── e2e/               # Playwright tests
├── docker-compose.yml
└── docker-compose.test.yml
```

---

## Schema changes

Always use Prisma migrations — never edit `schema.prisma` directly without generating a migration:

```bash
cd backend && npx prisma migrate dev --name describe_your_change
```
