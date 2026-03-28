import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haversineDistance, sortVenues, fetchVenuesFromOverpass, getCachedVenues, venueCache, MAX_VENUE_DISTANCE_M } from './venues.js';

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

  function makeFetch(v = venues) {
    return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ elements: [] }) });
  }

  beforeEach(() => venueCache.clear());

  it('fetches and caches on first call', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [{ id: 1, lat: 51.501, lon: -0.1, tags: { name: 'Café' } }] }),
    });
    await getCachedVenues('cafe', 51.5, -0.1, mockFetch);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(venueCache.size).toBe(1);
  });

  it('returns cached result on second call without fetching again', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    await getCachedVenues('cafe', 51.5, -0.1, mockFetch);
    await getCachedVenues('cafe', 51.5, -0.1, mockFetch);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('uses the same cache bucket for coordinates rounded to 3 decimal places', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    await getCachedVenues('cafe', 51.5001, -0.1001, mockFetch);
    await getCachedVenues('cafe', 51.5004, -0.1004, mockFetch);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('revalidates in background when cache is stale but within stale window', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    // Seed a stale entry (70 min old)
    const key = 'cafe:51.500:-0.100';
    venueCache.set(key, { venues, fetchedAt: Date.now() - 70 * 60 * 1000 });
    const result = await getCachedVenues('cafe', 51.5, -0.1, mockFetch);
    expect(result).toBe(venues); // returned stale immediately
    // Background fetch is kicked off — wait a tick
    await new Promise(r => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('fetches synchronously when cache is expired beyond stale window', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    const key = 'cafe:51.500:-0.100';
    venueCache.set(key, { venues, fetchedAt: Date.now() - 3 * 60 * 60 * 1000 });
    await getCachedVenues('cafe', 51.5, -0.1, mockFetch);
    expect(mockFetch).toHaveBeenCalledOnce();
    // Cache should be refreshed
    expect(venueCache.get(key).fetchedAt).toBeGreaterThan(Date.now() - 1000);
  });
});

describe('fetchVenuesFromOverpass', () => {
  it('calls Overpass with correct query containing venue type, coordinates, and configured radius', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    await fetchVenuesFromOverpass('restaurant', 51.5, -0.1, mockFetch);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    const body = decodeURIComponent(opts.body);
    expect(url).toContain('overpass-api.de');
    expect(body).toContain('amenity=restaurant');
    expect(body).toContain('51.5');
    expect(body).toContain('-0.1');
    expect(body).toContain(`around:${MAX_VENUE_DISTANCE_M}`);
  });

  it('maps Overpass elements to venue objects with computed distance', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { id: 123, lat: 51.501, lon: -0.102, tags: { name: 'The Pub', amenity: 'bar' } },
        ],
      }),
    });
    const results = await fetchVenuesFromOverpass('bar', 51.5, -0.1, mockFetch);
    expect(results).toHaveLength(1);
    expect(results[0].externalId).toBe('123');
    expect(results[0].name).toBe('The Pub');
    expect(results[0].latitude).toBe(51.501);
    expect(results[0].longitude).toBe(-0.102);
    expect(typeof results[0].distanceM).toBe('number');
    expect(results[0].distanceM).toBeGreaterThan(0);
    expect(results[0].rating).toBeNull();
  });

  it('uses "Unnamed" for elements without a name tag', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ id: 456, lat: 51.5, lon: -0.1, tags: { amenity: 'restaurant' } }],
      }),
    });
    const results = await fetchVenuesFromOverpass('restaurant', 51.5, -0.1, mockFetch);
    expect(results[0].name).toBe('Unnamed');
  });

  it('returns empty array when Overpass returns no elements', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const results = await fetchVenuesFromOverpass('bar', 51.5, -0.1, mockFetch);
    expect(results).toEqual([]);
  });

  it('throws when Overpass responds with an error status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(
      fetchVenuesFromOverpass('bar', 51.5, -0.1, mockFetch)
    ).rejects.toThrow('429');
  });
});
