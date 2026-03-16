# taliott

Group scheduling that does the heavy lifting. Organizers set a date range; participants vote on time slots and share their starting location. The app calculates a geographically fair meeting point, suggests nearby venues, and sends everyone a calendar invite when the organizer finalizes.

No accounts needed for participants.

## How it works

**Organizer** creates an event with a date range, voting deadline, and an invite method — either direct email invites or a shareable join link.

**Participants** follow their personal link, mark availability on the time grid, and optionally enter a home address and travel mode (walking, cycling, driving, transit).

**Admin view** shows a live availability heatmap, a travel-time-weighted meeting-point estimate (Weiszfeld algorithm via OpenRouteService / OpenTripPlanner, with Euclidean fallback), and venue suggestions near that center.

**Finalization** locks the event, records the chosen slot and venue, and emails everyone a `.ics` calendar file.

---

<!-- screenshots:start -->
## Screenshots

### Creating an event

<table>
<tr>
<td align="center"><img src="screenshots/create-01-landing.png" width="200"/><br/><sub>Landing</sub></td>
<td align="center"><img src="screenshots/create-02-event-name.png" width="200"/><br/><sub>Event name</sub></td>
<td align="center"><img src="screenshots/create-03-organizer-email.png" width="200"/><br/><sub>Organizer</sub></td>
</tr>
<tr>
<td align="center"><img src="screenshots/create-04-date-and-time.png" width="200"/><br/><sub>Date & time</sub></td>
<td align="center"><img src="screenshots/create-05-deadline.png" width="200"/><br/><sub>Deadline</sub></td>
<td align="center"><img src="screenshots/create-06-invite-mode.png" width="200"/><br/><sub>Invite mode</sub></td>
</tr>
<tr>
<td align="center"><img src="screenshots/create-07-review.png" width="200"/><br/><sub>Review</sub></td>
<td align="center"><img src="screenshots/create-08-confirmation.png" width="200"/><br/><sub>Confirmation</sub></td>
</tr>
</table>


### Participating

<table>
<tr>
<td align="center"><img src="screenshots/participate-01-name.png" width="200"/><br/><sub>Name</sub></td>
<td align="center"><img src="screenshots/participate-02-location.png" width="200"/><br/><sub>Location</sub></td>
<td align="center"><img src="screenshots/participate-03-availability.png" width="200"/><br/><sub>Availability</sub></td>
</tr>
<tr>
<td align="center"><img src="screenshots/participate-04-review.png" width="200"/><br/><sub>Review</sub></td>
<td align="center"><img src="screenshots/participate-05-done.png" width="200"/><br/><sub>Done</sub></td>
</tr>
</table>

<!-- screenshots:end -->

---

## Stack

- **Frontend** — React 18 + Vite, port 3000
- **Backend** — Express 4 + Node.js (ESM), port 4000
- **Database** — PostgreSQL 16 via Prisma ORM

---

## Local development

### Prerequisites

- Node.js 20+
- Docker (for the database and optional services)
- Playwright browsers — install once with `npx playwright install` (E2E tests only)

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
# docker compose up otp  — or leave unset to default to http://localhost:8080
# OTP_BASE_URL="http://localhost:8080"
```

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

## Docker (full stack)

Runs everything — postgres, mailpit, backend, frontend — in containers.

```bash
docker compose up --build
```

App at http://localhost:3000. Migrations run automatically on backend startup.

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
│   │   ├── hooks/     # Shared React hooks
│   │   ├── lib/       # Frontend utilities
│   │   └── App.jsx
│   └── Dockerfile
├── backend/           # Express API
│   ├── src/
│   │   ├── lib/       # Pure utilities (slots, centroid, ICS, etc.)
│   │   └── routes/    # API route handlers + co-located unit tests
│   ├── prisma/        # Schema + migrations
│   └── tests/integration/
├── e2e/               # Playwright tests
├── scripts/           # Maintenance scripts (e.g. update-readme-screenshots.js)
├── docs/              # Product spec and deployment notes
├── region.config.js   # Region / geocoding configuration
├── docker-compose.yml
└── docker-compose.test.yml
```

---

## Schema changes

Always use Prisma migrations — never edit `schema.prisma` directly:

```bash
cd backend && npx prisma migrate dev --name describe_your_change
```
