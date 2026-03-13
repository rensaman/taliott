import { describe, it, expect, vi } from 'vitest';
import { snapCoord, getCachedDurations, storeCachedDurations } from './route-cache.js';

// ---------------------------------------------------------------------------
// snapCoord
// ---------------------------------------------------------------------------
describe('snapCoord', () => {
  it('rounds to 3 decimal places', () => {
    expect(snapCoord(47.49867)).toBe(47.499);
    expect(snapCoord(19.05432)).toBe(19.054);
    expect(snapCoord(47.5)).toBe(47.5);
  });

  it('handles negative coordinates', () => {
    expect(snapCoord(-0.1278)).toBe(-0.128);
  });

  it('handles zero', () => {
    expect(snapCoord(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getCachedDurations
// ---------------------------------------------------------------------------

function makeEntry({ fromLat, fromLng, toLat, toLng, mode, durationSec, ageMs = 0 }) {
  return {
    fromLat,
    fromLng,
    toLat,
    toLng,
    mode,
    durationSec,
    createdAt: new Date(Date.now() - ageMs),
  };
}

describe('getCachedDurations', () => {
  const origins = [
    { latitude: 47.5, longitude: 19.05 },
    { latitude: 47.6, longitude: 19.1 },
  ];
  const dest = { lat: 47.55, lng: 19.07 };
  const mode = 'driving-car';

  it('returns null for each origin when no cache entries exist', async () => {
    const prisma = { routeCache: { findMany: vi.fn().mockResolvedValue([]) } };
    const result = await getCachedDurations(prisma, origins, dest, mode);
    expect(result).toEqual([null, null]);
  });

  it('returns cached durations when entries are present and fresh', async () => {
    const entries = [
      makeEntry({ fromLat: 47.5, fromLng: 19.05, toLat: 47.55, toLng: 19.07, mode, durationSec: 300 }),
      makeEntry({ fromLat: 47.6, fromLng: 19.1, toLat: 47.55, toLng: 19.07, mode, durationSec: 450 }),
    ];
    const prisma = { routeCache: { findMany: vi.fn().mockResolvedValue(entries) } };

    const result = await getCachedDurations(prisma, origins, dest, mode);
    expect(result).toEqual([300, 450]);
  });

  it('returns null for expired entries (> 7 days old)', async () => {
    const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;
    const entries = [
      makeEntry({
        fromLat: 47.5, fromLng: 19.05, toLat: 47.55, toLng: 19.07,
        mode, durationSec: 300, ageMs: EIGHT_DAYS_MS,
      }),
    ];
    const prisma = { routeCache: { findMany: vi.fn().mockResolvedValue(entries) } };

    const result = await getCachedDurations(prisma, [origins[0]], dest, mode);
    expect(result).toEqual([null]);
  });

  it('returns partial results when only some origins are cached', async () => {
    const entries = [
      makeEntry({ fromLat: 47.5, fromLng: 19.05, toLat: 47.55, toLng: 19.07, mode, durationSec: 300 }),
    ];
    const prisma = { routeCache: { findMany: vi.fn().mockResolvedValue(entries) } };

    const result = await getCachedDurations(prisma, origins, dest, mode);
    expect(result).toEqual([300, null]);
  });

  it('snaps destination coordinates in the DB query', async () => {
    const prisma = { routeCache: { findMany: vi.fn().mockResolvedValue([]) } };
    const unsnapDest = { lat: 47.55499, lng: 19.07499 };

    await getCachedDurations(prisma, origins, unsnapDest, mode);

    const where = prisma.routeCache.findMany.mock.calls[0][0].where;
    expect(where.toLat).toBe(47.555);
    expect(where.toLng).toBe(19.075);
  });
});

// ---------------------------------------------------------------------------
// storeCachedDurations
// ---------------------------------------------------------------------------
describe('storeCachedDurations', () => {
  const origins = [
    { latitude: 47.5, longitude: 19.05 },
    { latitude: 47.6, longitude: 19.1 },
  ];
  const dest = { lat: 47.55, lng: 19.07 };
  const mode = 'driving-car';

  it('upserts one entry per origin with snapped coordinates', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    const prisma = { routeCache: { upsert: mockUpsert } };

    await storeCachedDurations(prisma, origins, dest, mode, [300.7, 450.2]);

    expect(mockUpsert).toHaveBeenCalledTimes(2);

    const firstCall = mockUpsert.mock.calls[0][0];
    expect(firstCall.create.fromLat).toBe(47.5);
    expect(firstCall.create.fromLng).toBe(19.05);
    expect(firstCall.create.toLat).toBe(47.55);
    expect(firstCall.create.toLng).toBe(19.07);
    expect(firstCall.create.durationSec).toBe(301); // rounded
  });

  it('skips null durations', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    const prisma = { routeCache: { upsert: mockUpsert } };

    await storeCachedDurations(prisma, origins, dest, mode, [null, 450]);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert.mock.calls[0][0].create.fromLat).toBe(47.6);
  });

  it('rounds fractional durations to integer seconds', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    const prisma = { routeCache: { upsert: mockUpsert } };

    await storeCachedDurations(prisma, [origins[0]], dest, mode, [299.9]);

    expect(mockUpsert.mock.calls[0][0].create.durationSec).toBe(300);
  });
});
