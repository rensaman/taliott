import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchORSTravelDurations, DEFAULT_MODE } from './ors.js';

const ORIGINS = [
  { latitude: 47.5, longitude: 19.05 },
  { latitude: 47.6, longitude: 19.1 },
];
const DEST = { lat: 47.55, lng: 19.07 };

const MOCK_ORS_RESPONSE = {
  durations: [[300.0], [450.5]],
};

let savedApiKey;

beforeEach(() => {
  savedApiKey = process.env.ORS_API_KEY;
  process.env.ORS_API_KEY = 'test-key';
});
afterEach(() => {
  if (savedApiKey === undefined) {
    delete process.env.ORS_API_KEY;
  } else {
    process.env.ORS_API_KEY = savedApiKey;
  }
});

describe('fetchORSTravelDurations', () => {
  it('throws when ORS_API_KEY is not set', async () => {
    delete process.env.ORS_API_KEY;
    await expect(
      fetchORSTravelDurations(ORIGINS, DEST, DEFAULT_MODE, vi.fn()),
    ).rejects.toThrow('ORS_API_KEY not configured');
  });

  it('builds a POST request to the correct ORS endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ORS_RESPONSE,
    });

    await fetchORSTravelDurations(ORIGINS, DEST, DEFAULT_MODE, mockFetch);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openrouteservice.org/v2/matrix/driving-car');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('test-key');
  });

  it('sends coordinates in [longitude, latitude] order', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ORS_RESPONSE,
    });

    await fetchORSTravelDurations(ORIGINS, DEST, DEFAULT_MODE, mockFetch);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    // Origins first, destination last; all in [lng, lat] order
    expect(body.locations[0]).toEqual([19.05, 47.5]);
    expect(body.locations[1]).toEqual([19.1, 47.6]);
    expect(body.locations[2]).toEqual([19.07, 47.55]);
  });

  it('sets sources to origin indices and destinations to the last index', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ORS_RESPONSE,
    });

    await fetchORSTravelDurations(ORIGINS, DEST, DEFAULT_MODE, mockFetch);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.sources).toEqual([0, 1]);
    expect(body.destinations).toEqual([2]);
    expect(body.metrics).toEqual(['duration']);
  });

  it('returns durations parallel to origins array', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ORS_RESPONSE,
    });

    const result = await fetchORSTravelDurations(ORIGINS, DEST, DEFAULT_MODE, mockFetch);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(300.0);
    expect(result[1]).toBe(450.5);
  });

  it('throws on non-2xx ORS response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });

    await expect(
      fetchORSTravelDurations(ORIGINS, DEST, DEFAULT_MODE, mockFetch),
    ).rejects.toThrow('ORS API error: 429');
  });

  it('works with a single origin', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ durations: [[120.0]] }),
    });

    const result = await fetchORSTravelDurations([ORIGINS[0]], DEST, DEFAULT_MODE, mockFetch);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locations).toHaveLength(2); // 1 origin + 1 destination
    expect(body.sources).toEqual([0]);
    expect(body.destinations).toEqual([1]);
    expect(result).toEqual([120.0]);
  });
});
