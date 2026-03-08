/**
 * Integration tests for GET /api/events/:adminToken (US 3.0)
 * Requires the test DB: npm run test:integration
 */
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

const BASE_EVENT = {
  name: 'Admin Dashboard Test',
  organizer_email: 'alex@example.com',
  participant_emails: ['jamie@example.com', 'sam@example.com'],
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: FUTURE_DEADLINE,
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({ ...BASE_EVENT, ...overrides });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

describe('GET /api/events/:adminToken', () => {
  it('returns 404 for an unknown admin token', async () => {
    const res = await request(app).get('/api/events/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns event name, deadline, status, and slot count', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(BASE_EVENT.name);
    expect(res.body.deadline).toBeDefined();
    expect(res.body.status).toBe('open');
    expect(typeof res.body.slot_count).toBe('number');
    expect(res.body.slot_count).toBeGreaterThan(0);
  });

  it('returns participant list with email and responded_at', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);

    expect(res.status).toBe(200);
    expect(res.body.participants).toBeInstanceOf(Array);
    expect(res.body.participants.length).toBeGreaterThan(0);

    for (const p of res.body.participants) {
      expect(p.id).toBeDefined();
      expect(p.email).toBeDefined();
      expect('responded_at' in p).toBe(true);
    }
  });

  it('includes all invited participants (organizer + invitees)', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);

    expect(res.status).toBe(200);
    const emails = res.body.participants.map(p => p.email);
    expect(emails).toContain(BASE_EVENT.organizer_email);
    expect(emails).toContain('jamie@example.com');
    expect(emails).toContain('sam@example.com');
  });

  it('shows responded_at as null before participant confirms', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);

    expect(res.status).toBe(200);
    for (const p of res.body.participants) {
      expect(p.responded_at).toBeNull();
    }
  });

  it('shows responded_at after participant confirms via PATCH /confirm', async () => {
    const { admin_token, participants } = await createEvent();
    const pid = participants[0].id;

    await request(app).patch(`/api/participate/${pid}/confirm`);

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);

    const confirmed = res.body.participants.find(p => p.id === pid);
    expect(confirmed.responded_at).not.toBeNull();
  });

  it('returns centroid as null when no participants have a location', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);

    expect(res.status).toBe(200);
    expect(res.body.centroid).toBeNull();
  });

  it('returns centroid with lat, lng, and count when participants have locations', async () => {
    const { admin_token, participants } = await createEvent();

    // Give two participants locations
    await request(app)
      .patch(`/api/participate/${participants[0].id}/location`)
      .send({ latitude: 10, longitude: 20 });
    await request(app)
      .patch(`/api/participate/${participants[1].id}/location`)
      .send({ latitude: 30, longitude: 40 });

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);

    const { centroid } = res.body;
    expect(centroid).not.toBeNull();
    expect(centroid.lat).toBeCloseTo(20);
    expect(centroid.lng).toBeCloseTo(30);
    expect(centroid.count).toBe(2);
  });

  it('excludes participants without location from centroid', async () => {
    const { admin_token, participants } = await createEvent();

    // Only the first participant sets a location
    await request(app)
      .patch(`/api/participate/${participants[0].id}/location`)
      .send({ latitude: 10, longitude: 20 });

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);

    const { centroid } = res.body;
    expect(centroid.lat).toBeCloseTo(10);
    expect(centroid.lng).toBeCloseTo(20);
    expect(centroid.count).toBe(1);
  });
});
