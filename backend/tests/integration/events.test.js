/**
 * Integration tests for POST /api/events (US 1.1)
 * Requires the test DB to be running:
 *   docker compose -f docker-compose.test.yml up -d
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';
import { PART_OF_DAY_HOURS } from '../../src/lib/slots.js';

const prisma = new PrismaClient();

const BASE_BODY = {
  name: 'Summer meetup',
  organizer_email: 'alex@example.com',
  participant_emails: ['jamie@example.com', 'sam@example.com'],
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-03',
  part_of_day: 'all',
  venue_type: 'bar',
  deadline: '2025-05-25T12:00:00.000Z',
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

    const hoursPerDay = PART_OF_DAY_HOURS.all.end - PART_OF_DAY_HOURS.all.start;
    expect(res.body.slots).toHaveLength(3 * hoursPerDay);
  });

  it('bounds slots to morning hours when part_of_day is morning', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ ...BASE_BODY, part_of_day: 'morning' });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const startHours = res.body.slots.map(s => new Date(s.starts_at).getHours());
    expect(Math.min(...startHours)).toBe(PART_OF_DAY_HOURS.morning.start);
    expect(Math.max(...startHours)).toBe(PART_OF_DAY_HOURS.morning.end - 1);
  });

  it('handles a date range that crosses a month boundary', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      date_range_start: '2025-01-30',
      date_range_end: '2025-02-01',
      part_of_day: 'morning',
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    const hoursPerDay = PART_OF_DAY_HOURS.morning.end - PART_OF_DAY_HOURS.morning.start;
    expect(res.body.slots).toHaveLength(3 * hoursPerDay);
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

  it('returns 400 when date_range_end is before date_range_start', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      date_range_start: '2025-06-05',
      date_range_end: '2025-06-01',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid part_of_day value', async () => {
    const res = await request(app).post('/api/events').send({
      ...BASE_BODY,
      part_of_day: 'night',
    });
    expect(res.status).toBe(400);
  });
});
