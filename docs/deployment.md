# Deployment Guide

This document covers everything that must be in place before taliott is operated as a live service. Work through each section top to bottom; items marked **required** will cause the service to malfunction or expose legal liability if skipped.

---

## 1. Environment variables

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **yes** | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/taliott` |
| `PORT` | no | HTTP port for the Express server (default `4000`) |
| `NODE_ENV` | **yes** | Set to `production` in production (disables the `/api/admin` debug router) |
| `APP_BASE_URL` | **yes** | Full public URL of the frontend, e.g. `https://taliott.example.com`. Used in email links |
| `SMTP_HOST` | **yes** | SMTP server hostname |
| `SMTP_PORT` | **yes** | SMTP port (typically `587` for STARTTLS or `465` for TLS) |
| `SMTP_USER` | **yes** | SMTP username |
| `SMTP_PASS` | **yes** | SMTP password |
| `SMTP_FROM` | **yes** | From address shown in emails, e.g. `taliott <noreply@example.com>` |
| `SMTP_SECURE` | no | Set to `true` for port 465 (implicit TLS); omit or `false` for STARTTLS |
| `ORS_API_KEY` | no | OpenRouteService API key. Without it, centroid falls back to Euclidean distance (no travel-time weighting). Get one at openrouteservice.org — free tier is 500 req/day |

### Frontend — `frontend/.env` (or injected at build time)

| Variable | Required | Description |
|---|---|---|
| `VITE_CONTACT_EMAIL` | **yes** | Email address shown in the Privacy Policy and Terms as the data controller contact |
| `VITE_APP_NAME` | no | Service name shown in legal pages (default `taliott`) |
| `VITE_UMAMI_WEBSITE_ID` | no | Umami website ID. If unset, analytics script is not injected |
| `VITE_UMAMI_SCRIPT_URL` | no | Full URL to Umami's `script.js`. Defaults to `http://localhost:3001/script.js`; set to your public Umami URL in production |

### Umami (analytics) — `docker-compose.yml` / environment

| Variable | Required | Description |
|---|---|---|
| `UMAMI_APP_SECRET` | **yes** (prod) | Secret used to sign Umami session cookies. Change from the default before exposing Umami publicly |

---

## 2. SMTP / transactional email

1. Sign up with a transactional email provider (Resend, Postmark, Mailgun, or self-hosted).
2. Verify your sending domain (SPF, DKIM, DMARC records) to avoid delivery to spam.
3. **GDPR (EU only):** Sign the provider's Data Processing Agreement (DPA) — this is usually a checkbox or button in their account dashboard. This is a legal requirement under GDPR Art. 28 before you can send participant emails through a third-party processor.

---

## 3. OpenRouteService (optional but recommended)

Without an ORS key the centroid calculation falls back to straight-line (haversine) distance, which gives a less accurate meeting point for groups with varied transport modes.

1. Register at openrouteservice.org.
2. Create an API key with access to the Matrix API.
3. Set `ORS_API_KEY` in `backend/.env`.
4. Free tier: 500 requests/day, 2,500/month. Each event with `n` participants with locations costs one matrix request per travel mode selected. Monitor usage in the ORS dashboard if you expect high volume.

---

## 4. OpenTripPlanner (transit mode)

Transit-mode centroid calculation requires a running OTP instance with GTFS data for your target region.

1. Download GTFS data for your region (e.g. from transit.land or the operator's website) and place the `.zip` file in `otp/data/`. The `.gitignore` excludes these files.
2. Download a regional OpenStreetMap extract (`.pbf`) and place it in `otp/data/`.
3. Start OTP with `docker compose up otp` and wait for the graph build to complete (may take several minutes on first run).
4. If you do not need transit routing, participants who select "transit" will silently fall back to Euclidean distance — no action needed.

---

## 5. Database

### Production setup
1. Provision a PostgreSQL ≥ 14 instance.
2. Create a database and a dedicated user with `CONNECT`, `CREATE`, and DML privileges.
3. Set `DATABASE_URL` in `backend/.env`.
4. Run migrations: `cd backend && npx prisma migrate deploy`.

### Backups
- Schedule automated daily backups (e.g. `pg_dump` via cron or your cloud provider's backup feature).
- Test restoration at least once before going live.

### Data retention
The `deadline-worker` automatically deletes events (and all cascade data) 90 days after their voting deadline, once the event is `locked` or `finalized`. This is the stated retention period in the Privacy Policy. If you change it, update the Privacy Policy accordingly (`PrivacyPolicyView.jsx` section 5).

---

## 6. HTTPS and security headers

1. **TLS is required.** All traffic must be HTTPS. Never run the backend or frontend over plain HTTP in production. Use a reverse proxy (nginx, Caddy, or a cloud load balancer) to terminate TLS.
2. Add the following HTTP response headers at the reverse proxy level:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Content-Security-Policy` — at minimum restrict `default-src` and allow only your own origin plus tile.openstreetmap.org for map tiles
3. The participant and admin tokens are UUID v4 values embedded in URLs. HTTPS prevents them from leaking over the wire. Ensure your reverse proxy does not log full URLs (or redacts token-containing paths).

---

## 7. Legal documents

### Before launch (EU / GDPR)

- [ ] Set `VITE_CONTACT_EMAIL` to a real monitored email address. This appears in the Privacy Policy as the data controller contact and must be actively monitored for GDPR data subject requests (access, erasure, portability).
- [ ] Update the `[JURISDICTION]` placeholder in `frontend/src/features/legal/TermsView.jsx` (section 11) with your governing law and courts.
- [ ] Review and customise `PrivacyPolicyView.jsx` if your deployment differs from the default (e.g. different SMTP provider, additional third-party integrations).
- [ ] Sign the SMTP provider's DPA (see section 2).
- [ ] If you operate from within an EU member state, check whether you need to register as a data controller with your national supervisory authority (requirements vary by country).
- [ ] If you expect to process data of residents in California, review CCPA requirements (right to know, right to delete — already implemented in the API).

### Data subject rights already implemented

| Right | How it works |
|---|---|
| **Access (Art. 15)** | `GET /api/participate/:id/export` — "Download my data" button on the participation page |
| **Erasure (Art. 17)** | `DELETE /api/participate/:id` — "Delete my data" button on the participation page |
| **Organiser erasure** | `DELETE /api/events/:adminToken` — "Delete event" button on the admin page |
| **Automated retention** | `purgeOldEvents()` in `deadline-worker.js` — deletes data 90 days after deadline |
| **Portability (Art. 20)** | JSON export via the download button |

Requests you will need to handle manually (via email to `VITE_CONTACT_EMAIL`):
- Rectification of email address (no self-serve endpoint; requires manual DB update)
- Complaints from participants who lost their participation link and cannot self-serve

---

## 8. Analytics and feedback

### Umami (page analytics)

Taliott ships with a self-hosted [Umami](https://umami.is) analytics integration. It is cookieless and GDPR-compliant out of the box — no cookie consent banner is required.

**Docker setup** (already in `docker-compose.yml`):
- `umami` service — web UI at port 3001
- `postgres-umami` service — dedicated postgres for Umami data

**Production checklist:**
1. Set `UMAMI_APP_SECRET` to a strong random string (e.g. `openssl rand -hex 32`). The default placeholder is for development only.
2. Set `VITE_UMAMI_WEBSITE_ID` and `VITE_UMAMI_SCRIPT_URL` at frontend build time.
3. Change the default Umami admin password immediately after first login.
4. Consider whether you want Umami accessible publicly or only on an internal network. If public, put it behind the same reverse proxy as the app (different path or subdomain).

**Custom events tracked:**

| Event name | Fired when |
|---|---|
| `event_created` | Organizer completes the setup wizard; includes `invite_mode` property |
| `availability_submitted` | Participant submits their availability |

Page views are tracked automatically for all routes.

### Feedback form

An NPS (0–10) feedback form with optional free-text comment is shown inline — to organizers on the confirmation screen and to participants immediately after submitting. Responses are stored in the `Feedback` table in the app database. No external service is required.

For a full set of analysis queries (NPS score, participation rates, event trends), see [`docs/analytics.sql`](analytics.sql).

### Additional monitoring

- **Error tracking:** Integrate Sentry or similar (add `import * as Sentry from '@sentry/node'` to `backend/src/index.js`). Without it, backend errors are only visible in server logs.
- **Uptime monitoring:** Use an external ping service (Better Uptime, UptimeRobot) to alert on downtime.
- **Log retention:** Ensure server logs are retained for at least 30 days. Avoid logging full URLs (token exposure risk).
- **Email delivery:** Monitor your SMTP provider's dashboard for bounce/complaint rates. High bounce rates can get your sending domain blacklisted.

---

## 9. Infrastructure / Docker Compose

The provided `docker-compose.yml` is configured for development. For production:

1. Remove or gate the Mailpit container (`mailpit` service) — it is a dev-only email catcher.
2. Set `NODE_ENV=production` so the debug admin router is disabled.
3. Ensure the OTP service has sufficient memory. The default JVM heap is configured in `docker-compose.yml` — increase it for larger GTFS datasets.
4. Use Docker secrets or a secrets manager (Vault, AWS Secrets Manager) for `DATABASE_URL`, `SMTP_PASS`, `ORS_API_KEY`, and `UMAMI_APP_SECRET` rather than plain `.env` files on the host.
5. For Umami: change the default admin password, set a strong `UMAMI_APP_SECRET`, and decide whether the Umami UI should be exposed publicly or restricted to internal access.

---

## 10. Pre-launch checklist

```
Infrastructure
  [ ] DATABASE_URL set and migrations applied (npx prisma migrate deploy)
  [ ] SMTP credentials set and sending domain verified (SPF/DKIM/DMARC)
  [ ] APP_BASE_URL set to the production domain
  [ ] NODE_ENV=production
  [ ] HTTPS termination configured with HSTS header
  [ ] Automated database backups scheduled and tested

Optional but recommended
  [ ] ORS_API_KEY set for travel-time-weighted centroids
  [ ] OTP running with regional GTFS + OSM data if transit mode is needed
  [ ] Error tracking (Sentry or equivalent) integrated
  [ ] Uptime monitoring configured

Analytics (Umami)
  [ ] UMAMI_APP_SECRET set to a strong random string
  [ ] Default Umami admin password changed
  [ ] Website added in Umami dashboard and website ID copied
  [ ] VITE_UMAMI_WEBSITE_ID and VITE_UMAMI_SCRIPT_URL set at frontend build time
  [ ] Umami network exposure decided (public vs. internal)

Legal (EU / GDPR)
  [ ] VITE_CONTACT_EMAIL set to a monitored address
  [ ] [JURISDICTION] filled in TermsView.jsx
  [ ] SMTP provider DPA signed
  [ ] Privacy Policy and Terms of Service reviewed and accurate
  [ ] Supervisory authority registration checked (if required in your jurisdiction)
```
