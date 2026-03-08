/**
 * Integration tests for SSE endpoint and real-time broadcast (US 2.3)
 */
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const BASE_EVENT = {
  name: 'SSE Test',
  organizer_email: 'alex@example.com',
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  part_of_day: 'morning',
  deadline: '2099-12-31T23:59:59.000Z',
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

describe('GET /api/events/:eventId/stream', () => {
  it('returns SSE headers on connect', async () => {
    const event = await createEvent();

    // Start a real HTTP server so we can use fetch() — which returns headers immediately
    // without waiting for the body to close (supertest can't do this for SSE).
    const server = await new Promise(resolve => {
      const s = app.listen(0, () => resolve(s));
    });
    const { port } = server.address();
    const controller = new AbortController();

    try {
      const res = await fetch(`http://localhost:${port}/api/events/${event.event_id}/stream`, {
        signal: controller.signal,
      });
      expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
      expect(res.headers.get('cache-control')).toBe('no-cache');
    } finally {
      controller.abort();
      await new Promise(r => server.close(r));
    }
  });
});

describe('GET /api/participate/:id heatmap', () => {
  it('includes heatmap and centroid in response', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}`);
    expect(res.status).toBe(200);
    expect(res.body.heatmap).toBeDefined();
    expect(res.body.heatmap.total_participants).toBeTypeOf('number');
    expect(Array.isArray(res.body.heatmap.slots)).toBe(true);
    // centroid is null when no locations are set
    expect(res.body.centroid === null || typeof res.body.centroid === 'object').toBe(true);
  });

  it('heatmap yes_count reflects availability updates', async () => {
    const { participants, slots } = await createEvent();
    const pid = participants[0].id;

    // Before any availability: all yes_counts are 0
    const before = await request(app).get(`/api/participate/${pid}`);
    const slotId = slots[0].id;
    expect(before.body.heatmap.slots.find(s => s.slot_id === slotId).yes_count).toBe(0);

    // Mark the slot as yes
    await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slotId, state: 'yes' }] });

    // After: yes_count should be 1
    const after = await request(app).get(`/api/participate/${pid}`);
    expect(after.body.heatmap.slots.find(s => s.slot_id === slotId).yes_count).toBe(1);
  });

  it('centroid updates when participant sets location', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const before = await request(app).get(`/api/participate/${pid}`);
    expect(before.body.centroid).toBeNull();

    await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 48.8566, longitude: 2.3522, address_label: 'Paris' });

    const after = await request(app).get(`/api/participate/${pid}`);
    expect(after.body.centroid).toMatchObject({ lat: 48.8566, lng: 2.3522, count: 1 });
  });
});

describe('GET /api/events/:adminToken (admin dashboard)', () => {
  it('includes event id in response', async () => {
    const { event_id, admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(event_id);
  });
});
