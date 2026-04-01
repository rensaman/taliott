# taliott

Group scheduling that does the heavy lifting. Organizers set a date range; participants vote on time slots and share their starting location. The app calculates a geographically fair meeting point, suggests nearby venues, and sends everyone a calendar invite when the organizer finalizes.

No accounts needed for participants.

## How it works

**Organizer** creates an event with a date range, voting deadline, and an invite method — either direct email invites or a shareable join link.

**Participants** follow their personal link, mark availability on the time grid, and optionally enter a home address and travel mode (walking, cycling, driving, transit).

**Admin view** shows a live availability heatmap, a travel-time-weighted meeting-point estimate (Weiszfeld algorithm via OpenRouteService / OpenTripPlanner, with Euclidean fallback), and venue suggestions near that center.

**Finalization** locks the event, records the chosen slot and venue, and emails everyone a `.ics` calendar file.

---

Live at **[taliott.hu](https://taliott.hu)**

---

## Stack

- **Frontend** — React 18 + Vite, port 3000
- **Backend** — Express 4 + Node.js (ESM), port 4000
- **Database** — PostgreSQL 16 via Prisma ORM
- **Analytics** — Umami (self-hosted, cookieless, port 3001) — optional

---

## Local development

### Prerequisites

- Node.js 20+
- Docker (for the database and optional services)
- Playwright browsers — install once with `npx playwright install` (E2E tests only)
- `osmium-tool` — required only if using OTP transit routing (`apt install osmium-tool` / `brew install osmium-tool`)

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

# Optional: OpenRouteService key for travel-time-weighted centroid
# (walking, cycling, driving). Falls back to Euclidean without it.
# ORS_API_KEY="your-key-here"

# Optional: OpenTripPlanner URL for transit-aware centroid.
# Requires a pre-built graph — see "OpenTripPlanner (transit routing)" below.
# OTP_BASE_URL="http://otp:8080"
```

Analytics (optional) — create `frontend/.env.local`:
```
VITE_UMAMI_WEBSITE_ID=paste-website-id-from-umami-dashboard
VITE_UMAMI_SCRIPT_URL=http://localhost:3001/script.js
```
See [Analytics setup](#analytics-umami) below for the full flow.

### 4. Run migrations

```bash
cd backend && npx prisma migrate deploy && cd ..
```

### 5. Install the pre-commit hook

```bash
npm run setup:hooks
```

### 6. Start dev servers

```bash
npm run dev
```

App at http://localhost:3000. Backend API at http://localhost:4000. Email UI (Mailpit) at http://localhost:8025.

---

## Analytics (Umami)

Taliott includes optional self-hosted analytics via [Umami](https://umami.is). It is cookieless and GDPR-compliant by default — no consent banner required.

### What is tracked

| Event | When |
|---|---|
| Page views | Automatic (all pages) |
| `event_created` | Organizer completes the setup wizard |
| `availability_submitted` | Participant submits their response |

### Setup

**1. Start Umami:**
```bash
docker compose up -d umami
```
Umami runs at http://localhost:3001. Default credentials: `admin` / `umami`.

**2. Add your site:**
- Settings → Websites → Add website
- Enter any name and `localhost` as domain
- Copy the **Website ID**

**3. Configure the frontend:**
```bash
# frontend/.env.local
VITE_UMAMI_WEBSITE_ID=your-website-id-here
VITE_UMAMI_SCRIPT_URL=http://localhost:3001/script.js
```

**4. Restart the dev server** (`npm run dev`) — analytics will start appearing in the Umami dashboard.

In production, set `VITE_UMAMI_SCRIPT_URL` to your public Umami URL and `UMAMI_APP_SECRET` in your environment (see [deployment guide](docs/deployment.md)).

### Feedback form

An NPS feedback form (0–10 score + optional comment) is shown:
- To organizers on the event confirmation screen
- To participants immediately after they submit their availability

Responses are stored in the `Feedback` table in the app database. Each browser submits at most once (tracked via `localStorage`).

---

## OpenTripPlanner (transit routing)

OTP provides travel-time estimates for participants who choose the "public transit" mode. It is optional — the app falls back to straight-line distance if OTP is unavailable.

OTP requires a pre-built graph before it can serve requests. Run these once, and again whenever GTFS or OSM data changes:

```bash
# 1. Download BKK transit schedules (GTFS)
./scripts/download-gtfs.sh

# 2. Download Hungary street network (OSM PBF) from Geofabrik
./scripts/download-osm.sh

# 3. Build the graph (needs ~4 GB RAM, exits when done)
./scripts/build-otp-graph.sh

# 4. Start OTP (loads the pre-built graph, ~1 GB RAM)
docker compose up -d otp
```

OSM data is © OpenStreetMap contributors, available under the [ODbL licence](https://www.openstreetmap.org/copyright). BKK GTFS data is used under BKK's open data licence.

---

## Docker (full stack)

Runs everything — postgres, mailpit, backend, frontend, and Umami analytics — in containers.

```bash
docker compose up --build
```

App at http://localhost:3000. Migrations run automatically on backend startup. Umami analytics at http://localhost:3001.

To stop:
```bash
docker compose down
```

---

## Region configuration

The app defaults to **Budapest, Hungary**. Edit `region.config.js` at the project root to change it:

```js
export const REGION = {
  center: [47.4979, 19.0402],   // map default center [lat, lng]
  groupMapZoom: 10,
  locationMapZoom: 13,
  geocode: {
    viewbox: [18.75, 47.75, 19.55, 47.25],
    bounded: 1,
    countrycodes: 'hu',
  },
};
```

This controls the default map center, zoom levels, and geocoding search area.

---

## Testing

### Unit tests

```bash
npm run test
```

Co-located with source files, no database required.

### Integration tests

```bash
npm run test:integration
```

Starts a `postgres-test` container (port 5433), applies migrations, runs tests, then stops the container.

### E2E tests (Playwright)

```bash
npm run test:e2e
```

Starts postgres and mailpit automatically, plus dev servers if not already running.

> **Note:** If the Docker production stack is running, stop the app containers first:
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
│   │   │   └── feedback/  # NPS feedback form (FeedbackForm.jsx)
│   │   ├── hooks/     # Shared React hooks
│   │   ├── lib/       # Frontend utilities (analytics.js, etc.)
│   │   └── App.jsx
│   └── Dockerfile
├── backend/           # Express API
│   ├── src/
│   │   ├── lib/       # Pure utilities (slots, centroid, ICS, etc.)
│   │   └── routes/    # API route handlers + co-located unit tests
│   │       └── feedback.js  # POST /api/feedback
│   ├── prisma/        # Schema + migrations
│   └── tests/integration/
├── e2e/               # Playwright tests
├── scripts/           # Maintenance scripts (e.g. update-readme-screenshots.js)
├── docs/              # Specs, deployment guide, analytics queries, legal analysis
├── region.config.js   # Region / geocoding configuration
├── docker-compose.yml
└── docker-compose.test.yml
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/deployment.md](docs/deployment.md) | Production setup: env vars, SMTP, ORS, OTP, HTTPS, GDPR checklist |
| [docs/analytics.sql](docs/analytics.sql) | SQL queries for NPS scores, participation rates, event trends |
| [docs/specs/overview.md](docs/specs/overview.md) | Product spec and acceptance criteria |
| [docs/legal/gdpr-compliance-analysis.md](docs/legal/gdpr-compliance-analysis.md) | GDPR data mapping, third-party services, implemented rights |

---

## Schema changes

Always use Prisma migrations — never edit `schema.prisma` directly:

```bash
cd backend && npx prisma migrate dev --name describe_your_change
```
