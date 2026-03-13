import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeCentroid } from './centroid.js';

// Ensure ORS API key is absent by default
let savedOrsKey;
beforeEach(() => {
  savedOrsKey = process.env.ORS_API_KEY;
  delete process.env.ORS_API_KEY;
});
afterEach(() => {
  if (savedOrsKey === undefined) delete process.env.ORS_API_KEY;
  else process.env.ORS_API_KEY = savedOrsKey;
});

// ---------------------------------------------------------------------------
// Null / empty cases
// ---------------------------------------------------------------------------
describe('computeCentroid — null/empty', () => {
  it('returns null for an empty array', async () => {
    expect(await computeCentroid([])).toBeNull();
  });

  it('returns null when all participants lack coordinates', async () => {
    expect(
      await computeCentroid([
        { latitude: null, longitude: null },
        { latitude: null, longitude: null },
      ]),
    ).toBeNull();
  });

  it('excludes participants with only one coordinate set', async () => {
    const result = await computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: 4, longitude: null },
    ]);
    expect(result).not.toBeNull();
    expect(result.count).toBe(1);
    expect(result.lat).toBeCloseTo(0, 5);
    expect(result.lng).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// Single participant
// ---------------------------------------------------------------------------
describe('computeCentroid — single participant', () => {
  it('returns their coordinates directly', async () => {
    const result = await computeCentroid([{ latitude: 51.5, longitude: -0.1 }]);
    expect(result.lat).toBe(51.5);
    expect(result.lng).toBe(-0.1);
    expect(result.count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Euclidean fallback (no API keys, no prisma)
// ---------------------------------------------------------------------------
describe('computeCentroid — Euclidean fallback', () => {
  it('converges to the center for a symmetric layout', async () => {
    // Four corners of a square — geometric median = arithmetic mean by symmetry
    const result = await computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: 2, longitude: 0 },
      { latitude: 0, longitude: 2 },
      { latitude: 2, longitude: 2 },
    ]);
    expect(result.lat).toBeCloseTo(1, 3);
    expect(result.lng).toBeCloseTo(1, 3);
    expect(result.count).toBe(4);
  });

  it('returns a valid result for two points', async () => {
    const result = await computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: 2, longitude: 2 },
    ]);
    expect(result.lat).toBeCloseTo(1, 3);
    expect(result.lng).toBeCloseTo(1, 3);
    expect(result.count).toBe(2);
  });

  it('excludes null-coordinate participants from count', async () => {
    const result = await computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: null, longitude: null },
      { latitude: 2, longitude: 2 },
    ]);
    expect(result.count).toBe(2);
  });

  it('pulls result toward the participant with lower Euclidean distance', async () => {
    // Three participants: two clustered near (0,0) and one outlier at (10,10)
    const result = await computeCentroid([
      { latitude: 0, longitude: 0 },
      { latitude: 0.1, longitude: 0.1 },
      { latitude: 10, longitude: 10 },
    ]);
    // Geometric median is resistant to the outlier — result should be well below (3.37, 3.37) arithmetic mean
    expect(result.lat).toBeLessThan(2);
    expect(result.lng).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// ORS-weighted behaviour (driving mode, mock fetch, ORS_API_KEY set)
// ---------------------------------------------------------------------------
describe('computeCentroid — ORS travel-time weights (driving)', () => {
  beforeEach(() => { process.env.ORS_API_KEY = 'test-key'; });

  it('pulls the result toward the participant with shorter travel time', async () => {
    // Participant A at (0,0): 100 s away
    // Participant B at (2,0): 1000 s away
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ durations: [[100], [1000]] }),
    });

    const result = await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'driving' },
        { latitude: 2, longitude: 0, travelMode: 'driving' },
      ],
      { fetchFn: mockFetch },
    );

    // Must be pulled toward A (lat=0), well below the arithmetic mean of 1.0
    expect(result.lat).toBeLessThan(0.5);
    expect(result.count).toBe(2);
  });

  it('falls back to Euclidean when ORS returns a non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'driving' },
        { latitude: 2, longitude: 2, travelMode: 'driving' },
      ],
      { fetchFn: mockFetch },
    );

    expect(result).not.toBeNull();
    expect(result.lat).toBeCloseTo(1, 2);
    expect(result.lng).toBeCloseTo(1, 2);
  });

  it('falls back to Euclidean when ORS fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));

    const result = await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'driving' },
        { latitude: 2, longitude: 2, travelMode: 'driving' },
      ],
      { fetchFn: mockFetch },
    );

    expect(result).not.toBeNull();
    expect(result.lat).toBeCloseTo(1, 2);
  });

  it('uses cached durations and skips ORS when all hits', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('should not call ORS'));
    const mockPrisma = {
      routeCache: {
        findMany: vi.fn().mockResolvedValue([
          {
            fromLat: 0, fromLng: 0, toLat: 1, toLng: 1,
            mode: 'driving-car', durationSec: 200,
            createdAt: new Date(),
          },
          {
            fromLat: 2, fromLng: 2, toLat: 1, toLng: 1,
            mode: 'driving-car', durationSec: 200,
            createdAt: new Date(),
          },
        ]),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'driving' },
        { latitude: 2, longitude: 2, travelMode: 'driving' },
      ],
      { prisma: mockPrisma, fetchFn: mockFetch },
    );

    expect(result).not.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stores ORS results in cache', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ durations: [[300], [400]] }),
    });
    const mockUpsert = vi.fn().mockResolvedValue({});
    const mockPrisma = {
      routeCache: {
        findMany: vi.fn().mockResolvedValue([]), // all misses
        upsert: mockUpsert,
      },
    };

    await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'driving' },
        { latitude: 2, longitude: 2, travelMode: 'driving' },
      ],
      { prisma: mockPrisma, fetchFn: mockFetch },
    );

    expect(mockUpsert).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// OTP-weighted behaviour (transit mode, mock navitiaFetchFn)
// ---------------------------------------------------------------------------
describe('computeCentroid — OTP travel-time weights (transit)', () => {
  it('pulls the result toward the participant with shorter transit time', async () => {
    // Transit participant A at (0,0): 200 s; B at (2,0): 2000 s
    const navMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ plan: { itineraries: [{ duration: 200 }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ plan: { itineraries: [{ duration: 2000 }] } }) });

    const result = await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'transit' },
        { latitude: 2, longitude: 0, travelMode: 'transit' },
      ],
      { navitiaFetchFn: navMock },
    );

    expect(result.lat).toBeLessThan(0.5);
    expect(result.count).toBe(2);
  });

  it('falls back to Euclidean when Navitia throws', async () => {
    const navMock = vi.fn().mockRejectedValue(new Error('network error'));

    const result = await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'transit' },
        { latitude: 2, longitude: 2, travelMode: 'transit' },
      ],
      { navitiaFetchFn: navMock },
    );

    expect(result).not.toBeNull();
    expect(result.lat).toBeCloseTo(1, 2);
  });

  it('caches transit durations with mode "transit"', async () => {
    const navMock = vi.fn()
      .mockResolvedValue({ ok: true, json: async () => ({ plan: { itineraries: [{ duration: 500 }] } }) });
    const mockUpsert = vi.fn().mockResolvedValue({});
    const mockPrisma = {
      routeCache: {
        findMany: vi.fn().mockResolvedValue([]), // all misses
        upsert: mockUpsert,
      },
    };

    await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'transit' },
        { latitude: 2, longitude: 2, travelMode: 'transit' },
      ],
      { prisma: mockPrisma, navitiaFetchFn: navMock },
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ fromLat_fromLng_toLat_toLng_mode: expect.objectContaining({ mode: 'transit' }) }) }),
    );
  });
});

// ---------------------------------------------------------------------------
// Mixed modes
// ---------------------------------------------------------------------------
describe('computeCentroid — mixed travel modes', () => {
  beforeEach(() => {
    process.env.ORS_API_KEY = 'test-ors-key';
  });

  it('routes driving participants to ORS and transit participants to OTP', async () => {
    const orsMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ durations: [[300]] }),
    });
    const navMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plan: { itineraries: [{ duration: 600 }] } }),
    });

    const result = await computeCentroid(
      [
        { latitude: 0, longitude: 0, travelMode: 'driving' },
        { latitude: 2, longitude: 0, travelMode: 'transit' },
      ],
      { fetchFn: orsMock, navitiaFetchFn: navMock },
    );

    expect(result).not.toBeNull();
    expect(result.count).toBe(2);
    const orsCall = orsMock.mock.calls.find(([url]) => url.includes('openrouteservice.org'));
    expect(orsCall).toBeDefined();
    const navCall = navMock.mock.calls.find(([url]) => url.includes('/otp/'));
    expect(navCall).toBeDefined();
  });
});
