import { describe, it, expect, vi } from 'vitest';
import { haversineDistance, sortVenues, fetchVenuesFromOverpass, MAX_VENUE_DISTANCE_M } from './venues.js';

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
