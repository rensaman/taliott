/**
 * Integration tests for GET /api/events/:adminToken/venues (US 3.2)
 * Requires the test DB: npm run test:integration
 */
import { describe, it, expect, afterAll, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';
import { getPrisma } from '../../src/lib/prisma.js';
import { venueCache, haversineDistance } from '../../src/lib/venues.js';

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

// Base venue fixtures — lat/lng only; distanceM is computed per-call from the query centroid
const MOCK_OSM_BASE = [
  // centroid ≈ (51.5, -0.1); both venues within 800 m
  { externalId: '111', name: 'The Restaurant', latitude: 51.501, longitude: -0.102, website: null, address: null },
  { externalId: '222', name: 'Cafe Bistro', latitude: 51.503, longitude: -0.106, website: null, address: null },
];

// Spy factory: intercepts $queryRaw and computes distanceM from the centroid
// embedded in the SQL args (values order: lng, lat, venueType, lng, lat, MAX_DIST)
function makeOsmSpy(venues) {
  return vi.spyOn(getPrisma(), '$queryRaw').mockImplementation(async (sqlObj) => {
    const lng = sqlObj.values[0];
    const lat = sqlObj.values[1];
    return venues.map(v => ({
      ...v,
      distanceM: Math.round(haversineDistance(lat, lng, v.latitude, v.longitude)),
    }));
  });
}

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

let queryRawSpy;

describe('GET /api/events/:adminToken/venues', () => {
  beforeEach(() => {
    venueCache.clear();
    queryRawSpy = makeOsmSpy(MOCK_OSM_BASE);
  });
  afterEach(() => vi.restoreAllMocks());

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

  it('calls OSM and returns sorted venues', async () => {
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

    // Verify OSM was queried with the correct venue type
    expect(queryRawSpy).toHaveBeenCalledOnce();
    expect(queryRawSpy.mock.calls[0][0].values).toContain('restaurant');
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

  it('returns cached venues on second call without querying OSM', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res1.status).toBe(200);

    // Replace spy with one that throws — a cache miss would fail the test
    queryRawSpy.mockRejectedValue(new Error('Should not query OSM'));

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res2.status).toBe(200);
    expect(res2.body.venues).toEqual(res1.body.venues);
  });

  it('accepts venue_type query param to override event default', async () => {
    const { admin_token, participants } = await createEvent();
    await giveLocation(participants[0].id);

    const res = await request(app).get(`/api/events/${admin_token}/venues?venue_type=bar`);
    expect(res.status).toBe(200);

    expect(queryRawSpy.mock.calls[0][0].values).toContain('bar');
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

    // Reject next OSM query: if cache were still present it would return 200; 502 confirms re-fetch was attempted
    queryRawSpy.mockRejectedValue(new Error('OSM unavailable'));
    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res2.status).toBe(502);
  });

  it('re-fetches venues with the updated centroid after cache invalidation', async () => {
    // P1 and P2 ~960 m apart; both venues within 800 m of every centroid position
    const MOCK_VENUES = [
      { externalId: '301', name: 'Near P1', latitude: 47.501, longitude: 19.051, website: null, address: null },
      { externalId: '302', name: 'Near P2', latitude: 47.505, longitude: 19.057, website: null, address: null },
    ];

    vi.restoreAllMocks();
    queryRawSpy = makeOsmSpy(MOCK_VENUES);
    const { admin_token, participants } = await createEvent({ participant_emails: ['p2-stale@example.com'] });
    await giveLocation(participants[0].id, 47.500, 19.050);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res1.status).toBe(200);
    const distances1 = res1.body.venues.map(v => v.distanceM);

    // P2 joins → cache invalidated; spy still resolves for the re-fetch
    await giveLocation(participants[1].id, 47.506, 19.058); // centroid shifts to ~(47.503, 19.054)

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=restaurant`);
    expect(res2.status).toBe(200);
    expect(res2.body.venues.map(v => v.name)).toEqual(expect.arrayContaining(['Near P1', 'Near P2']));
    // Distances differ because the re-fetch queries PostGIS with the new centroid
    const distances2 = res2.body.venues.map(v => v.distanceM);
    expect(distances2).not.toEqual(distances1);
  });

  it('reflects the updated sort order when the centroid shifts after a new participant responds', async () => {
    // P1: (47.500, 19.050), P2: (47.506, 19.058) — ~960 m apart
    // Near P1 at (47.499, 19.048): ~186 m from P1-centroid, ~631 m from midpoint (47.503, 19.054)
    // Near P2 at (47.502, 19.053): ~316 m from P1-centroid, ~134 m from midpoint → order reverses
    const MOCK_ORDER_VENUES = [
      { externalId: '401', name: 'Near P1', latitude: 47.499, longitude: 19.048, website: null, address: null },
      { externalId: '402', name: 'Near P2', latitude: 47.502, longitude: 19.053, website: null, address: null },
    ];

    vi.restoreAllMocks();
    queryRawSpy = makeOsmSpy(MOCK_ORDER_VENUES);
    const { admin_token, participants } = await createEvent({ participant_emails: ['p2-order@example.com'] });
    await giveLocation(participants[0].id, 47.500, 19.050);

    const res1 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=cafe`);
    expect(res1.status).toBe(200);
    expect(res1.body.venues[0].name).toBe('Near P1');

    // Participant 2 joins → cache invalidated; spy still resolves for the re-fetch
    // New centroid ~(47.503, 19.054) → Near P2 becomes closer
    await giveLocation(participants[1].id, 47.506, 19.058);

    const res2 = await request(app).get(`/api/events/${admin_token}/venues?venue_type=cafe`);
    expect(res2.status).toBe(200);
    expect(res2.body.venues[0].name).toBe('Near P2');
  });
});
