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

  it('returns 400 when no venue type is provided', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}/venues`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/venue type/i);
  });

  it('returns 400 when no participants have a location (no centroid)', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/location/i);
  });

  it('calls external API and returns sorted venues', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
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

    const res = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res.status).toBe(200);
    const distances = res.body.venues.map(v => v.distanceM);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
    }
  });

  it('returns cached venues on second call without calling external API', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res1.status).toBe(200);

    // Replace mock with one that throws — a cache miss would fail the test
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Should not call external API')));

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
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

  it('includes venue_type as null in the admin event response when not set', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    expect(res.body.venue_type).toBeNull();
  });

  it('recalculates distanceM from the updated centroid when a new participant provides a location', async () => {
    // Venues near Budapest — one close to P1, one close to P2
    const MOCK_VENUES = {
      elements: [
        { id: 301, lat: 47.501, lon: 19.051, tags: { name: 'Near P1', amenity: 'restaurant' } },
        { id: 302, lat: 47.590, lon: 19.140, tags: { name: 'Near P2', amenity: 'restaurant' } },
      ],
    };

    // Only participant 1 has a location → centroid = P1's exact coords
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_VENUES }));
    const { admin_token, participants } = await createEvent({ participant_emails: ['p2-stale@example.com'] });
    await giveLocation(participants[0].id, 47.500, 19.050);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res1.status).toBe(200);
    const distances1 = res1.body.venues.map(v => v.distanceM);

    // Set the throw-stub BEFORE the PATCH so the async SSE broadcast uses it too
    // (Navitia calls will throw → haversine fallback; Overpass must not be called)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Overpass must not be called')));
    await giveLocation(participants[1].id, 47.600, 19.150);

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    // 200 proves cache was hit (an Overpass miss would have returned 502 or thrown)
    expect(res2.status).toBe(200);
    // Same venue set returned (DB cache), but distances must differ because centroid shifted
    expect(res2.body.venues.map(v => v.name)).toEqual(expect.arrayContaining(['Near P1', 'Near P2']));
    const distances2 = res2.body.venues.map(v => v.distanceM);
    expect(distances2).not.toEqual(distances1);
  });

  it('reflects the updated sort order when the centroid shifts after a new participant responds', async () => {
    // P1 location: (47.500, 19.050) — Near P1 venue at (47.501, 19.051) is ~134 m away
    // P2 location: (47.600, 19.150) — Near P2 venue at (47.590, 19.140) is ~1.3 km away from P1
    // After P2 joins, centroid ≈ midpoint (47.550, 19.100):
    //   dist to Near P1 ≈ 6 580 m, dist to Near P2 ≈ 5 370 m  → order reverses
    const MOCK_ORDER_VENUES = {
      elements: [
        { id: 401, lat: 47.501, lon: 19.051, tags: { name: 'Near P1', amenity: 'cafe' } },
        { id: 402, lat: 47.590, lon: 19.140, tags: { name: 'Near P2', amenity: 'cafe' } },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_ORDER_VENUES }));
    const { admin_token, participants } = await createEvent({ participant_emails: ['p2-order@example.com'] });
    await giveLocation(participants[0].id, 47.500, 19.050);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=cafe`);
    expect(res1.status).toBe(200);
    expect(res1.body.venues[0].name).toBe('Near P1');

    // Participant 2 joins far away → centroid shifts toward midpoint
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Overpass must not be called')));
    await giveLocation(participants[1].id, 47.600, 19.150);

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=cafe`);
    expect(res2.status).toBe(200);
    expect(res2.body.venues[0].name).toBe('Near P2');
  });
});
