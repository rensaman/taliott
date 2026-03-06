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
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_FROM="taliott <noreply@taliott.app>"
APP_BASE_URL="http://localhost:3000"
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

Runs everything — postgres, mailpit, backend, frontend — in containers.

```bash
docker compose up --build
```

App is at http://localhost:3000. Mailpit email UI at http://localhost:8025. Migrations run automatically on backend startup.

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

The test database is managed automatically — no manual setup needed:

```bash
npm run test:integration
```

Starts a `postgres-test` container (port 5433), applies migrations, runs tests, then stops the container. Uses `DATABASE_URL` from `.env.test`.

### E2E tests (Playwright)

```bash
npm run test:e2e
```

Starts postgres and mailpit automatically via `globalSetup`, then stops them after the run. Dev servers (frontend + backend) are also started automatically if not already running.

> **Note:** If the Docker production stack (`docker compose up`) is running, stop the backend and frontend containers first so Playwright uses the dev servers instead:
> ```bash
> docker compose stop backend frontend
> ```

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
