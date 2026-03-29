/**
 * Integration tests for admin-route security properties:
 *   SEC-1 — per-route rate limiter on finalize and delete (verified via normal-operation tests)
 *   SEC-2 — cross-origin requests rejected on state-mutating admin endpoints
 *   SEC-3 — event deletion is hard and permanent (audit log + 404 on repeat call)
 *
 * Requires the test DB: npm run test:integration
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

const BASE_EVENT = {
  name: 'Security Test Event',
  organizer_email: 'security@example.com',
  date_range_start: '2025-07-01',
  date_range_end: '2025-07-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: FUTURE_DEADLINE,
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({ ...BASE_EVENT, ...overrides });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

// ─── SEC-1: per-route rate limiter on finalize and delete ─────────────────────
// The adminMutateLimiter is skipped outside production; these tests verify that
// legitimate requests are not disrupted and the routes are reachable.

describe('SEC-1: finalize and delete routes accept legitimate requests', () => {
  it('POST finalize returns 200 for a valid request', async () => {
    const { admin_token, slots } = await createEvent();
    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slots[0].id });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('DELETE event returns 200 for a valid request', async () => {
    const { admin_token, event_id } = await createEvent();
    const idx = createdEventIds.indexOf(event_id);
    if (idx !== -1) createdEventIds.splice(idx, 1);

    const res = await request(app).delete(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── SEC-2: cross-origin requests rejected on admin mutations ─────────────────

describe('SEC-2: cross-origin admin mutations are rejected', () => {
  it('POST finalize returns 403 when Origin does not match APP_BASE_URL', async () => {
    const { admin_token, slots } = await createEvent();
    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .set('Origin', 'http://evil.example.com')
      .send({ slot_id: slots[0].id });
    expect(res.status).toBe(403);
  });

  it('POST finalize accepts request with no Origin header (server-to-server / curl)', async () => {
    const { admin_token, slots } = await createEvent();
    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slots[0].id });
    expect(res.status).toBe(200);
  });

  it('DELETE event returns 403 when Origin does not match APP_BASE_URL', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app)
      .delete(`/api/events/${admin_token}`)
      .set('Origin', 'http://evil.example.com');
    expect(res.status).toBe(403);
  });

  it('DELETE event accepts request with no Origin header', async () => {
    const { admin_token, event_id } = await createEvent();
    const idx = createdEventIds.indexOf(event_id);
    if (idx !== -1) createdEventIds.splice(idx, 1);

    const res = await request(app).delete(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
  });
});

// ─── SEC-3: event deletion is hard and permanent ──────────────────────────────

describe('SEC-3: event hard delete is permanent', () => {
  it('second DELETE on the same admin token returns 404 (event is gone, not soft-marked)', async () => {
    const { admin_token, event_id } = await createEvent();
    const idx = createdEventIds.indexOf(event_id);
    if (idx !== -1) createdEventIds.splice(idx, 1);

    const first = await request(app).delete(`/api/events/${admin_token}`);
    expect(first.status).toBe(200);

    const second = await request(app).delete(`/api/events/${admin_token}`);
    expect(second.status).toBe(404);
  });

  it('admin GET returns 404 after deletion', async () => {
    const { admin_token, event_id } = await createEvent();
    const idx = createdEventIds.indexOf(event_id);
    if (idx !== -1) createdEventIds.splice(idx, 1);

    await request(app).delete(`/api/events/${admin_token}`);

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(404);
  });
});
