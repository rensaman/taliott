import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haversineDistance, sortVenues, fetchVenuesFromOSM, getCachedVenues, venueCache } from './venues.js';

vi.mock('./prisma.js', () => ({ getPrisma: vi.fn() }));
import { getPrisma } from './prisma.js';

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0);
  });

  it('returns approximate distance between London and Paris (~340km)', () => {
    const dist = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(330000);
    expect(dist).toBeLessThan(350000);
  });

  it('returns approximate distance between nearby points', () => {
    // ~1.4 km diagonal at London latitude
    const dist = haversineDistance(51.5, -0.1, 51.51, -0.09);
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(2000);
  });
});

describe('sortVenues', () => {
  it('sorts by distance ascending', () => {
    const venues = [
      { distanceM: 500, rating: 4.5 },
      { distanceM: 200, rating: 3.0 },
      { distanceM: 800, rating: 5.0 },
    ];
    const sorted = sortVenues(venues);
    expect(sorted.map(v => v.distanceM)).toEqual([200, 500, 800]);
  });

  it('sorts by rating descending when distances are equal', () => {
    const venues = [
      { distanceM: 300, rating: 3.0 },
      { distanceM: 300, rating: 4.5 },
      { distanceM: 300, rating: 2.0 },
    ];
    const sorted = sortVenues(venues);
    expect(sorted.map(v => v.rating)).toEqual([4.5, 3.0, 2.0]);
  });

  it('places null-rating venues after rated venues at the same distance', () => {
    const venues = [
      { distanceM: 300, rating: null },
      { distanceM: 300, rating: 4.0 },
    ];
    const sorted = sortVenues(venues);
    expect(sorted[0].rating).toBe(4.0);
    expect(sorted[1].rating).toBeNull();
  });

  it('does not mutate the original array', () => {
    const venues = [{ distanceM: 200 }, { distanceM: 100 }];
    sortVenues(venues);
    expect(venues[0].distanceM).toBe(200);
  });

  it('handles empty array', () => {
    expect(sortVenues([])).toEqual([]);
  });
});

describe('getCachedVenues', () => {
  const venues = [{ externalId: '1', name: 'Café', latitude: 51.501, longitude: -0.1, rating: null, distanceM: 100, website: null, address: null }];

  beforeEach(() => venueCache.clear());

  it('fetches and caches on first call', async () => {
    const mockDataFn = vi.fn().mockResolvedValue(venues);
    await getCachedVenues('cafe', 51.5, -0.1, mockDataFn);
    expect(mockDataFn).toHaveBeenCalledOnce();
    expect(venueCache.size).toBe(1);
  });

  it('returns cached result on second call without fetching again', async () => {
    const mockDataFn = vi.fn().mockResolvedValue(venues);
    await getCachedVenues('cafe', 51.5, -0.1, mockDataFn);
    await getCachedVenues('cafe', 51.5, -0.1, mockDataFn);
    expect(mockDataFn).toHaveBeenCalledOnce();
  });

  it('uses the same cache bucket for coordinates rounded to 3 decimal places', async () => {
    const mockDataFn = vi.fn().mockResolvedValue(venues);
    await getCachedVenues('cafe', 51.5001, -0.1001, mockDataFn);
    await getCachedVenues('cafe', 51.5004, -0.1004, mockDataFn);
    expect(mockDataFn).toHaveBeenCalledOnce();
  });

  it('revalidates in background when cache is stale but within stale window', async () => {
    const mockDataFn = vi.fn().mockResolvedValue(venues);
    // Seed a stale entry (70 min old)
    const key = 'cafe:51.500:-0.100';
    venueCache.set(key, { venues, fetchedAt: Date.now() - 70 * 60 * 1000 });
    const result = await getCachedVenues('cafe', 51.5, -0.1, mockDataFn);
    expect(result).toBe(venues); // returned stale immediately
    // Background fetch is kicked off — wait a tick
    await new Promise(r => setTimeout(r, 0));
    expect(mockDataFn).toHaveBeenCalledOnce();
  });

  it('fetches synchronously when cache is expired beyond stale window', async () => {
    const mockDataFn = vi.fn().mockResolvedValue(venues);
    const key = 'cafe:51.500:-0.100';
    venueCache.set(key, { venues, fetchedAt: Date.now() - 3 * 60 * 60 * 1000 });
    await getCachedVenues('cafe', 51.5, -0.1, mockDataFn);
    expect(mockDataFn).toHaveBeenCalledOnce();
    // Cache should be refreshed
    expect(venueCache.get(key).fetchedAt).toBeGreaterThan(Date.now() - 1000);
  });
});

describe('fetchVenuesFromOSM', () => {
  it('maps DB rows to venue objects with correct shape', async () => {
    const mockRows = [
      { externalId: '123', name: 'The Pub', latitude: 51.501, longitude: -0.102, distanceM: 150, website: null, address: null },
    ];
    getPrisma.mockReturnValue({ $queryRaw: vi.fn().mockResolvedValue(mockRows) });

    const results = await fetchVenuesFromOSM('bar', 51.5, -0.1);
    expect(results).toHaveLength(1);
    expect(results[0].externalId).toBe('123');
    expect(results[0].name).toBe('The Pub');
    expect(results[0].latitude).toBe(51.501);
    expect(results[0].longitude).toBe(-0.102);
    expect(results[0].distanceM).toBe(150);
    expect(results[0].rating).toBeNull();
  });

  it('returns empty array when no OSM results', async () => {
    getPrisma.mockReturnValue({ $queryRaw: vi.fn().mockResolvedValue([]) });
    const results = await fetchVenuesFromOSM('bar', 51.5, -0.1);
    expect(results).toEqual([]);
  });

  it('uses "Unnamed" for rows without a name', async () => {
    const mockRows = [
      { externalId: '456', name: 'Unnamed', latitude: 51.5, longitude: -0.1, distanceM: 50, website: null, address: null },
    ];
    getPrisma.mockReturnValue({ $queryRaw: vi.fn().mockResolvedValue(mockRows) });
    const results = await fetchVenuesFromOSM('restaurant', 51.5, -0.1);
    expect(results[0].name).toBe('Unnamed');
  });

  it('coerces numeric fields to numbers', async () => {
    const mockRows = [
      { externalId: '999', name: 'Test', latitude: '51.5010', longitude: '-0.1020', distanceM: '150', website: null, address: null },
    ];
    getPrisma.mockReturnValue({ $queryRaw: vi.fn().mockResolvedValue(mockRows) });
    const results = await fetchVenuesFromOSM('cafe', 51.5, -0.1);
    expect(typeof results[0].latitude).toBe('number');
    expect(typeof results[0].longitude).toBe('number');
    expect(typeof results[0].distanceM).toBe('number');
  });

  it('normalises null website and address', async () => {
    const mockRows = [
      { externalId: '888', name: 'No Web', latitude: 51.5, longitude: -0.1, distanceM: 50, website: undefined, address: undefined },
    ];
    getPrisma.mockReturnValue({ $queryRaw: vi.fn().mockResolvedValue(mockRows) });
    const [result] = await fetchVenuesFromOSM('cafe', 51.5, -0.1);
    expect(result.website).toBeNull();
    expect(result.address).toBeNull();
  });
});
