import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchNavitiaTravelDuration } from './navitia.js';

let savedApiKey;
beforeEach(() => {
  savedApiKey = process.env.NAVITIA_API_KEY;
  process.env.NAVITIA_API_KEY = 'test-navitia-key';
});
afterEach(() => {
  if (savedApiKey === undefined) delete process.env.NAVITIA_API_KEY;
  else process.env.NAVITIA_API_KEY = savedApiKey;
});

const ORIGIN = { latitude: 47.497, longitude: 19.040 };
const DEST = { lat: 47.520, lng: 19.060 };

describe('fetchNavitiaTravelDuration', () => {
  it('throws when NAVITIA_API_KEY is not set', async () => {
    delete process.env.NAVITIA_API_KEY;
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, vi.fn()),
    ).rejects.toThrow('NAVITIA_API_KEY not configured');
  });

  it('calls the correct Navitia journeys endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ journeys: [{ duration: 900 }] }),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('api.navitia.io/v1/journeys');
  });

  it('encodes origin as lon;lat in the from parameter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ journeys: [{ duration: 900 }] }),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    const [url] = mockFetch.mock.calls[0];
    // Navitia uses longitude;latitude format
    expect(url).toContain(encodeURIComponent(`${ORIGIN.longitude};${ORIGIN.latitude}`));
  });

  it('encodes destination as lon;lat in the to parameter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ journeys: [{ duration: 900 }] }),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(encodeURIComponent(`${DEST.lng};${DEST.lat}`));
  });

  it('sends the Authorization header with the API key', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ journeys: [{ duration: 900 }] }),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('test-navitia-key');
  });

  it('returns the duration of the first journey', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ journeys: [{ duration: 1234 }, { duration: 999 }] }),
    });

    const result = await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);
    expect(result).toBe(1234);
  });

  it('throws when Navitia returns a non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('Navitia API error: 503');
  });

  it('throws when journeys array is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ journeys: [] }),
    });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('no journeys found');
  });

  it('throws when journeys is missing from response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'no solution' }),
    });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('no journeys found');
  });
});
