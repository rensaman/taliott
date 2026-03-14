/**
 * Integration tests for GET /api/events/:adminToken/venues (US 3.2)
 * Requires the test DB: npm run test:integration
 */
import { describe, it, expect, afterAll, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

const BASE_EVENT = {
  name: 'Venue Integration Test',
  organizer_email: 'venue-int@example.com',
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: FUTURE_DEADLINE,
  venue_type: 'restaurant',
};

const MOCK_OVERPASS_RESPONSE = {
  elements: [
    { id: 111, lat: 51.501, lon: -0.102, tags: { name: 'The Restaurant', amenity: 'restaurant' } },
    { id: 222, lat: 51.508, lon: -0.115, tags: { name: 'Cafe Bistro', amenity: 'restaurant' } },
  ],
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

async function createEvent(overrides = {}) {
  const body = { ...BASE_EVENT, ...overrides };
  // Explicitly delete venue_type key when override sets it to null/undefined
  if ('venue_type' in overrides && !overrides.venue_type) delete body.venue_type;
  const res = await request(app).post('/api/events').send(body);
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

async function giveLocation(participantId, lat = 51.5, lng = -0.1) {
  await request(app)
    .patch(`/api/participate/${participantId}/location`)
    .send({ latitude: lat, longitude: lng });
}

describe('GET /api/events/:adminToken/venues', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_OVERPASS_RESPONSE,
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns 404 for unknown admin token', async () => {
    const res = await request(app).get('/api/events/00000000-0000-0000-0000-000000000000/venues');
    expect(res.status).toBe(404);
  });

  it('returns 400 when event has no venue type', async () => {
    const { admin_token } = await createEvent({ venue_type: null });
    const res = await request(app).get(`/api/events/${admin_token}/venues`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/venue type/i);
  });

  it('returns 400 when no participants have a location (no centroid)', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}/venues`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/location/i);
  });

  it('calls external API and returns sorted venues', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res = await request(app).get(`/api/events/${admin_token}/venues`);
    expect(res.status).toBe(200);
    expect(res.body.venues).toBeInstanceOf(Array);
    expect(res.body.venues).toHaveLength(2);
    expect(res.body.venues[0]).toMatchObject({
      name: expect.any(String),
      distanceM: expect.any(Number),
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });

    // Verify Overpass was called with correct params
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('overpass-api.de');
    expect(decodeURIComponent(opts.body)).toContain('amenity=restaurant');
  });

  it('returns venues sorted by distance ascending', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res = await request(app).get(`/api/events/${admin_token}/venues`);
    expect(res.status).toBe(200);
    const distances = res.body.venues.map(v => v.distanceM);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
    }
  });

  it('returns cached venues on second call without calling external API', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues`);
    expect(res1.status).toBe(200);

    // Replace mock with one that throws — a cache miss would fail the test
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Should not call external API')));

    const res2 = await request(app).get(`/api/events/${admin_token}/venues`);
    expect(res2.status).toBe(200);
    expect(res2.body.venues).toEqual(res1.body.venues);
  });

  it('accepts venue_type query param to override event default', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res = await request(app).get(`/api/events/${admin_token}/venues?venue_type=bar`);
    expect(res.status).toBe(200);

    const callBody = decodeURIComponent(fetch.mock.calls[0][1].body);
    expect(callBody).toContain('amenity=bar');
  });

  it('includes venue_type in the admin event response', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    expect(res.body.venue_type).toBe('restaurant');
  });
});
