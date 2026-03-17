-- Taliott analytics queries
-- Run against the app database:
--   psql $DATABASE_URL -f docs/analytics.sql
-- Or pipe individual queries from your editor.


-- ─── FEEDBACK ────────────────────────────────────────────────────────────────

-- NPS score distribution
SELECT score, COUNT(*) AS n
FROM "Feedback"
GROUP BY score
ORDER BY score;

-- Net Promoter Score  (promoters 9-10 minus detractors 0-6, as %)
SELECT
  ROUND(
    100.0 * SUM(CASE WHEN score >= 9 THEN 1 ELSE 0 END) / COUNT(*) -
    100.0 * SUM(CASE WHEN score <= 6 THEN 1 ELSE 0 END) / COUNT(*),
    1
  ) AS nps,
  COUNT(*) AS total_responses
FROM "Feedback";

-- Average score and response count by context (organizer vs. participant)
SELECT
  context,
  ROUND(AVG(score), 1) AS avg_score,
  COUNT(*)              AS n
FROM "Feedback"
GROUP BY context
ORDER BY context;

-- All comments, most recent first
SELECT score, context, comment, "createdAt"
FROM "Feedback"
WHERE comment IS NOT NULL
ORDER BY "createdAt" DESC;

-- Low-score comments (detractors who left a reason) — highest signal
SELECT score, context, comment, "createdAt"
FROM "Feedback"
WHERE score <= 6 AND comment IS NOT NULL
ORDER BY score, "createdAt" DESC;


-- ─── EVENTS ──────────────────────────────────────────────────────────────────

-- Events created per day (last 30 days)
SELECT
  DATE("createdAt") AS day,
  COUNT(*)          AS events_created
FROM "Event"
WHERE "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;

-- Invite mode breakdown
SELECT "inviteMode", COUNT(*) AS n
FROM "Event"
GROUP BY "inviteMode";

-- Event status breakdown
SELECT status, COUNT(*) AS n
FROM "Event"
GROUP BY status;


-- ─── PARTICIPATION ───────────────────────────────────────────────────────────

-- Participation rate: responded vs. invited, per event (most recent 20)
SELECT
  e.name,
  e."createdAt",
  COUNT(p.id)                                              AS invited,
  COUNT(p."respondedAt")                                   AS responded,
  ROUND(100.0 * COUNT(p."respondedAt") / NULLIF(COUNT(p.id), 0), 0) AS pct
FROM "Event" e
JOIN "Participant" p ON p."eventId" = e.id
GROUP BY e.id, e.name, e."createdAt"
ORDER BY e."createdAt" DESC
LIMIT 20;

-- Overall participation rate across all events
SELECT
  COUNT(*)                                                         AS total_participants,
  COUNT("respondedAt")                                             AS responded,
  ROUND(100.0 * COUNT("respondedAt") / NULLIF(COUNT(*), 0), 0)    AS pct
FROM "Participant";

-- Location share rate (participants who provided a location)
SELECT
  COUNT(*)                                                                AS total,
  COUNT(latitude)                                                         AS with_location,
  ROUND(100.0 * COUNT(latitude) / NULLIF(COUNT(*), 0), 0)                AS pct_with_location
FROM "Participant";

-- Travel mode distribution
SELECT "travelMode", COUNT(*) AS n
FROM "Participant"
WHERE "respondedAt" IS NOT NULL
GROUP BY "travelMode"
ORDER BY n DESC;
