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
    // centroid ≈ (51.5, -0.1); both venues within 800 m
    { id: 111, lat: 51.501, lon: -0.102, tags: { name: 'The Restaurant', amenity: 'restaurant' } }, // ~135 m
    { id: 222, lat: 51.503, lon: -0.106, tags: { name: 'Cafe Bistro', amenity: 'restaurant' } },   // ~476 m
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

  it('invalidates venue cache when a participant provides a location', async () => {
    const { admin_token, participants } = await createEvent({ participant_emails: ['p2-inv@example.com'] });
    await giveLocation(participants[0].id);

    // Populate cache
    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res1.status).toBe(200);

    // Second participant joins → cache must be invalidated
    await giveLocation(participants[1].id, 51.502, -0.103);

    // Reject next fetch: if cache were still present it would return 200; 502 confirms re-fetch was attempted
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Overpass unavailable')));
    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res2.status).toBe(502);
  });

  it('re-fetches venues with the updated centroid after cache invalidation', async () => {
    // P1 and P2 ~960 m apart; both venues within 800 m of every centroid position
    const MOCK_VENUES = {
      elements: [
        { id: 301, lat: 47.501, lon: 19.051, tags: { name: 'Near P1', amenity: 'restaurant' } }, // ~134 m from P1
        { id: 302, lat: 47.505, lon: 19.057, tags: { name: 'Near P2', amenity: 'restaurant' } }, // ~733 m from P1, ~301 m from midpoint
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_VENUES }));
    const { admin_token, participants } = await createEvent({ participant_emails: ['p2-stale@example.com'] });
    await giveLocation(participants[0].id, 47.500, 19.050);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res1.status).toBe(200);
    const distances1 = res1.body.venues.map(v => v.distanceM);

    // P2 joins → cache invalidated; mock still resolves for the re-fetch
    await giveLocation(participants[1].id, 47.506, 19.058); // centroid shifts to ~(47.503, 19.054)

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res2.status).toBe(200);
    expect(res2.body.venues.map(v => v.name)).toEqual(expect.arrayContaining(['Near P1', 'Near P2']));
    // Distances differ because Overpass was re-queried with the new centroid
    const distances2 = res2.body.venues.map(v => v.distanceM);
    expect(distances2).not.toEqual(distances1);
  });

  it('reflects the updated sort order when the centroid shifts after a new participant responds', async () => {
    // P1: (47.500, 19.050), P2: (47.506, 19.058) — ~960 m apart
    // Near P1 at (47.499, 19.048): ~176 m from P1-centroid, ~600 m from midpoint (47.503, 19.054)
    // Near P2 at (47.502, 19.053): ~301 m from P1-centroid, ~130 m from midpoint → order reverses
    // Both venues stay within 800 m throughout
    const MOCK_ORDER_VENUES = {
      elements: [
        { id: 401, lat: 47.499, lon: 19.048, tags: { name: 'Near P1', amenity: 'cafe' } },
        { id: 402, lat: 47.502, lon: 19.053, tags: { name: 'Near P2', amenity: 'cafe' } },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_ORDER_VENUES }));
    const { admin_token, participants } = await createEvent({ participant_emails: ['p2-order@example.com'] });
    await giveLocation(participants[0].id, 47.500, 19.050);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=cafe`);
    expect(res1.status).toBe(200);
    expect(res1.body.venues[0].name).toBe('Near P1');

    // Participant 2 joins → cache invalidated; mock still resolves for the re-fetch
    // New centroid ~(47.503, 19.054) → Near P2 becomes closer
    await giveLocation(participants[1].id, 47.506, 19.058);

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=cafe`);
    expect(res2.status).toBe(200);
    expect(res2.body.venues[0].name).toBe('Near P2');
  });
});
