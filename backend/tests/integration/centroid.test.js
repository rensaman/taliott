/**
 * Integration tests for the Weiszfeld centroid algorithm (US 3.1).
 *
 * ORS_API_KEY management:
 *   - Tests that exercise the ORS path set the key manually and mock global fetch.
 *   - Tests that verify the Euclidean fallback leave the key absent.
 *
 * SSE broadcast note:
 *   PATCH /location triggers a fire-and-forget SSE broadcast that also calls
 *   computeCentroid. To avoid races, the global fetch mock is always set BEFORE
 *   any PATCH calls so both the broadcast and the explicit GET /admin call use
 *   the same mock.
 *
 * Requires the test DB: npm run test:integration
 */
import { describe, it, expect, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

const BASE_EVENT = {
  name: 'Centroid Integration Test',
  organizer_email: 'centroid-int@example.com',
  // Two participants so computeCentroid runs the full Weiszfeld loop
  participant_emails: ['p2-centroid@example.com'],
  date_range_start: '2025-08-01',
  date_range_end: '2025-08-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: FUTURE_DEADLINE,
};

// Budapest-area participant locations
const LOCATIONS = [
  { latitude: 47.497, longitude: 19.040 }, // downtown
  { latitude: 47.550, longitude: 19.080 }, // north-east
];

// Build an ORS Matrix API mock response for N participants → 1 destination.
function mockORS(durations) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ durations: durations.map(d => [d]) }),
  });
}

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.routeCache.deleteMany({});
  await prisma.$disconnect();
});

async function createEventWithLocations(fetchStub, { travelMode } = {}) {
  // Set the mock BEFORE PATCH calls so the SSE broadcast also uses it.
  if (fetchStub) vi.stubGlobal('fetch', fetchStub);

  const res = await request(app).post('/api/events').send(BASE_EVENT);
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  const { admin_token, participants } = res.body;

  for (let i = 0; i < participants.length && i < LOCATIONS.length; i++) {
    if (travelMode) {
      await request(app)
        .patch(`/api/participate/${participants[i].id}/travel-mode`)
        .send({ travel_mode: travelMode });
    }
    await request(app)
      .patch(`/api/participate/${participants[i].id}/location`)
      .send(LOCATIONS[i]);
  }

  // Allow any in-flight SSE broadcast computations to settle.
  await new Promise(resolve => setTimeout(resolve, 50));

  return { admin_token, participants };
}

// ---------------------------------------------------------------------------
// Euclidean fallback (no ORS_API_KEY)
// ---------------------------------------------------------------------------
describe('centroid — Euclidean fallback (no ORS_API_KEY)', () => {
  let savedKey;
  beforeEach(() => {
    savedKey = process.env.ORS_API_KEY;
    delete process.env.ORS_API_KEY;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (savedKey === undefined) delete process.env.ORS_API_KEY;
    else process.env.ORS_API_KEY = savedKey;
  });

  it('GET /api/events/:adminToken returns a centroid without calling ORS', async () => {
    const throwFetch = vi.fn().mockRejectedValue(new Error('should not call external API'));
    const { admin_token } = await createEventWithLocations(throwFetch);

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    expect(res.body.centroid).not.toBeNull();
    expect(res.body.centroid.count).toBe(2);

    const orsCalls = throwFetch.mock.calls.filter(([url]) =>
      url.includes('openrouteservice.org'),
    );
    expect(orsCalls).toHaveLength(0);
  });

  it('centroid lat is between the two participant latitudes', async () => {
    const { admin_token } = await createEventWithLocations();

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    const { centroid } = res.body;
    expect(centroid.count).toBe(2);
    const [minLat, maxLat] = [LOCATIONS[0].latitude, LOCATIONS[1].latitude].sort((a, b) => a - b);
    expect(centroid.lat).toBeGreaterThanOrEqual(minLat);
    expect(centroid.lat).toBeLessThanOrEqual(maxLat);
  });
});

// ---------------------------------------------------------------------------
// ORS path + RouteCache
// ---------------------------------------------------------------------------
describe('centroid — ORS travel-time weights + RouteCache', () => {
  let savedKey;
  beforeEach(async () => {
    savedKey = process.env.ORS_API_KEY;
    process.env.ORS_API_KEY = 'test-ors-key';
    await prisma.routeCache.deleteMany({});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (savedKey === undefined) delete process.env.ORS_API_KEY;
    else process.env.ORS_API_KEY = savedKey;
  });

  it('calls ORS and returns a centroid on the first request', async () => {
    const orsMock = mockORS([300, 450]);
    const { admin_token } = await createEventWithLocations(orsMock, { travelMode: 'driving' });

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    expect(res.body.centroid).not.toBeNull();

    // ORS was called (by SSE broadcast or by GET /admin — both are acceptable)
    const orsCall = orsMock.mock.calls.find(([url]) => url.includes('openrouteservice.org'));
    expect(orsCall).toBeDefined();
  });

  it('populates RouteCache after the first ORS call', async () => {
    const orsMock = mockORS([300, 450]);
    const { admin_token } = await createEventWithLocations(orsMock, { travelMode: 'driving' });

    await request(app).get(`/api/events/${admin_token}`);

    const cached = await prisma.routeCache.findMany({});
    expect(cached.length).toBeGreaterThan(0);
    expect(cached[0].mode).toBe('driving-car');
  });

  it('uses RouteCache on the second request — ORS not called again', async () => {
    const orsMock = mockORS([300, 450]);
    const { admin_token } = await createEventWithLocations(orsMock, { travelMode: 'driving' });

    // First request: populates cache (via SSE broadcast and/or GET /admin)
    const res1 = await request(app).get(`/api/events/${admin_token}`);
    expect(res1.status).toBe(200);

    // Allow any pending async ORS writes to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Second request: replace mock with a throw — a cache miss would propagate as a fallback
    // (not a hard error), but the centroid should be identical to res1 since all entries are cached.
    const throwMock = vi.fn().mockRejectedValue(new Error('ORS should not be called'));
    vi.stubGlobal('fetch', throwMock);

    const res2 = await request(app).get(`/api/events/${admin_token}`);
    expect(res2.status).toBe(200);
    expect(res2.body.centroid).toEqual(res1.body.centroid);

    // No ORS calls should have been made by GET /admin (cache hit)
    const orsCalls = throwMock.mock.calls.filter(([url]) =>
      url.includes('openrouteservice.org'),
    );
    expect(orsCalls).toHaveLength(0);
  });

  it('centroid is pulled toward participant with shorter ORS travel time', async () => {
    // P0 at lat=0: 100 s away  → weight = 1/100 = 0.01
    // P1 at lat=2: 1000 s away → weight = 1/1000 = 0.001
    // Weighted mean lat ≈ 0.182 — well below arithmetic mean of 1.0
    //
    // Use a coordinate-aware mock so the result is independent of the DB row order
    // returned by participant.findMany (which has no guaranteed ordering).
    const orsMock = vi.fn().mockImplementation(async (_url, opts) => {
      const body = JSON.parse(opts.body);
      const durations = body.sources.map(i => {
        const [, lat] = body.locations[i]; // ORS format: [lng, lat]
        return lat < 1 ? 100 : 1000;       // lat≈0 → 100 s, lat≈2 → 1000 s
      });
      return { ok: true, json: async () => ({ durations: durations.map(d => [d]) }) };
    });
    vi.stubGlobal('fetch', orsMock);

    const res = await request(app).post('/api/events').send({
      ...BASE_EVENT,
      organizer_email: 'centroid-weighted@example.com',
      participant_emails: ['p2-weighted@example.com'],
    });
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);
    const { admin_token, participants } = res.body;

    // Set driving mode so ORS is used
    for (const p of participants) {
      await request(app)
        .patch(`/api/participate/${p.id}/travel-mode`)
        .send({ travel_mode: 'driving' });
    }

    await request(app)
      .patch(`/api/participate/${participants[0].id}/location`)
      .send({ latitude: 0, longitude: 0 });
    await request(app)
      .patch(`/api/participate/${participants[1].id}/location`)
      .send({ latitude: 2, longitude: 0 });

    await new Promise(resolve => setTimeout(resolve, 50));

    const adminRes = await request(app).get(`/api/events/${admin_token}`);
    expect(adminRes.status).toBe(200);
    const { centroid } = adminRes.body;

    // Must be pulled toward P0 (lat=0), well below arithmetic mean of 1.0
    expect(centroid.lat).toBeLessThan(0.5);
  });
});
