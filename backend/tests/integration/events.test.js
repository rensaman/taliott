/**
 * Integration tests for POST /api/events (US 1.1)
 * Requires the test DB to be running:
 *   docker compose -f docker-compose.test.yml up -d
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';
const prisma = new PrismaClient();

// Use future-relative dates so the test body remains valid if deadline/date validation tightens.
function futureDate(daysFromNow) {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

const BASE_BODY = {
  name: 'Summer meetup',
  organizer_email: 'alex@example.com',
  participant_emails: ['jamie@example.com', 'sam@example.com'],
  date_range_start: futureDate(30),
  date_range_end: futureDate(32),
  time_range_start: 480,
  time_range_end: 1320,
  timezone: 'UTC',
  deadline: `${futureDate(20)}T12:00:00.000Z`,
};

const createdEventIds = [];

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

describe('POST /api/events', () => {
  it('returns 201 with event_id, name, admin_token, slots, and participants', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    expect(res.body.event_id).toBeDefined();
    expect(res.body.name).toBe(BASE_BODY.name);
    expect(res.body.admin_token).toBeDefined();
    expect(res.body.slots).toBeInstanceOf(Array);
    expect(res.body.participants).toBeInstanceOf(Array);
    createdEventIds.push(res.body.event_id);
  });

  it('generates the correct number of slots for a 3-day range', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    // full range 480–1320 = 840 minutes / 30 + 1 = 29 slots/day (inclusive upper bound)
    const slotsPerDay = (1320 - 480) / 30 + 1;
    expect(res.body.slots).toHaveLength(3 * slotsPerDay);
  });

  it('bounds slots to correct time range when time_range_start/end are specified', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ ...BASE_BODY, time_range_start: 480, time_range_end: 720, timezone: 'UTC' });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    // With timezone=UTC, UTC minutes equal local minutes directly
    const starts = res.body.slots.map(s => {
      const d = new Date(s.starts_at);
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    });
    expect(Math.min(...starts)).toBe(480); // 08:00
    expect(Math.max(...starts)).toBe(720); // 12:00 (upper bound is now inclusive)
  });

  it('handles a date range that crosses a month boundary', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      date_range_start: '2025-01-30',
      date_range_end: '2025-02-01',
      time_range_start: 480,
      time_range_end: 720,
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    // 480–720 = 240 minutes / 30 + 1 = 9 slots/day (inclusive upper bound), 3 days
    expect(res.body.slots).toHaveLength(3 * 9);
  });

  it('creates one participant row per email (organizer + invitees)', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const emails = res.body.participants.map(p => p.email);
    expect(emails).toContain(BASE_BODY.organizer_email);
    expect(emails).toContain('jamie@example.com');
    expect(emails).toContain('sam@example.com');
    expect(new Set(emails).size).toBe(emails.length); // all unique
  });

  it('admin_token is a UUID v4', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const uuidV4Re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(res.body.admin_token).toMatch(uuidV4Re);
  });

  it('participant ids are UUID v4', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const uuidV4Re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const p of res.body.participants) {
      expect(p.id).toMatch(uuidV4Re);
    }
  });

  it('each participant id differs from admin_token and from each other', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const ids = res.body.participants.map(p => p.id);
    const allTokens = [res.body.admin_token, ...ids];
    expect(new Set(allTokens).size).toBe(allTokens.length);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/events').send({ organizer_email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const { name: _, ...bodyWithoutName } = BASE_BODY;
    const res = await request(app).post('/api/events').send(bodyWithoutName);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when timezone is missing', async () => {
    const { timezone: _, ...bodyWithoutTz } = BASE_BODY;
    const res = await request(app).post('/api/events').send(bodyWithoutTz);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/timezone/i);
  });

  it('returns 400 when timezone is an invalid IANA string', async () => {
    const res = await request(app).post('/api/events').send({ ...BASE_BODY, timezone: 'Not/A/Timezone' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/timezone/i);
  });

  it('persists timezone and returns it in response', async () => {
    const res = await request(app).post('/api/events').send({ ...BASE_BODY, timezone: 'Europe/Paris' });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.timezone).toBe('Europe/Paris');
  });

  it('generates slots in UTC correctly for Europe/Paris (UTC+2 in summer)', async () => {
    // 2025-06-15 in Europe/Paris (CEST = UTC+2)
    // 08:00 local (480 min) → 06:00 UTC
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      date_range_start: '2025-06-15',
      date_range_end: '2025-06-15',
      time_range_start: 480,
      time_range_end: 720,
      timezone: 'Europe/Paris',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const firstSlot = res.body.slots[0];
    expect(new Date(firstSlot.starts_at).getUTCHours()).toBe(6); // 08:00 Paris = 06:00 UTC
  });

  it('returns 400 when date_range_end is before date_range_start', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      date_range_start: '2025-06-05',
      date_range_end: '2025-06-01',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid time_range values', async () => {
    // time_range_start >= time_range_end
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      time_range_start: 720,
      time_range_end: 480,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when time_range_start is out of bounds', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      time_range_start: -1,
      time_range_end: 480,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when organizer_email is not a valid email address', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      organizer_email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/organizer_email/i);
  });

  it('returns 400 when participant_emails contains an invalid address', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      participant_emails: ['valid@example.com', 'not-an-email'],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/participant_emails/i);
  });

  it('normalizes emails to lowercase and deduplicates case-insensitively', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      organizer_email: 'Alex@Example.com',
      participant_emails: ['alex@example.com', 'Other@Example.com'],
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const emails = res.body.participants.map(p => p.email);
    // alex@example.com is the organizer (normalized); duplicate filtered out
    expect(emails.every(e => e === e.toLowerCase())).toBe(true);
    expect(new Set(emails).size).toBe(emails.length);
    expect(emails).toContain('alex@example.com');
    expect(emails).toContain('other@example.com');
    expect(emails).toHaveLength(2);
  });

  it('creates only the organizer participant when participant_emails is [] with email_invites', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      participant_emails: [],
      invite_mode: 'email_invites',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].email).toBe(BASE_BODY.organizer_email.toLowerCase());
  });

  it('shared_link mode: returns join_url and creates only organizer participant', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'shared_link',
      participant_emails: [],
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    expect(res.body.join_url).toMatch(/^\/join\//);
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].email).toBe(BASE_BODY.organizer_email.toLowerCase());
  });

  it('shared_link mode: join_url contains a UUID v4 token', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'shared_link',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const uuidV4Re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const token = res.body.join_url.replace('/join/', '');
    expect(token).toMatch(uuidV4Re);
  });

  it('email_invites mode: does not return join_url', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      invite_mode: 'email_invites',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    expect(res.body.join_url).toBeUndefined();
  });

  it('stores lang "hu" on event when provided', async () => {
    const res = await request(app).post('/api/events').send({ ...BASE_BODY, lang: 'hu' });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const stored = await prisma.event.findUnique({ where: { id: res.body.event_id } });
    expect(stored.lang).toBe('hu');
  });

  it('defaults lang to "en" when not provided', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const stored = await prisma.event.findUnique({ where: { id: res.body.event_id } });
    expect(stored.lang).toBe('en');
  });

  it('returns 400 when date range exceeds 90 days', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      date_range_start: '2025-01-01',
      date_range_end: '2025-04-30',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/date range/i);
  });

  it('returns 400 when deadline is not a valid date', async () => {
    const res = await request(app).post('/api/events').send({ ...BASE_BODY, deadline: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/deadline/i);
  });

  it('returns 400 for an unsupported lang value', async () => {
    const res = await request(app).post('/api/events').send({ ...BASE_BODY, lang: 'xx' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lang/i);
  });

  it('generates slots at correct UTC offsets across a DST boundary (Europe/Helsinki spring-forward)', async () => {
    // 2025-03-30: Helsinki clocks spring forward (EET UTC+2 → EEST UTC+3) at 03:00 local.
    // 08:00 on 2025-03-29 (EET = UTC+2) → 06:00 UTC
    // 08:00 on 2025-03-30 (EEST = UTC+3) → 05:00 UTC
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      date_range_start: '2025-03-29',
      date_range_end: '2025-03-30',
      time_range_start: 480,
      time_range_end: 720,
      timezone: 'Europe/Helsinki',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const slots29 = res.body.slots.filter(s => s.starts_at.startsWith('2025-03-29'));
    expect(new Date(slots29[0].starts_at).getUTCHours()).toBe(6); // 08:00 EET = 06:00 UTC

    const slots30 = res.body.slots.filter(s => s.starts_at.startsWith('2025-03-30'));
    expect(new Date(slots30[0].starts_at).getUTCHours()).toBe(5); // 08:00 EEST = 05:00 UTC
  });
});
