import { describe, it, expect, vi } from 'vitest';
import { fetchNavitiaTravelDuration } from './otp.js';

const ORIGIN = { latitude: 47.497, longitude: 19.040 };
const DEST = { lat: 47.520, lng: 19.060 };

const OTP_RESPONSE = (duration) => ({
  plan: { itineraries: [{ duration }] },
});

describe('fetchNavitiaTravelDuration', () => {
  it('calls the OTP plan endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => OTP_RESPONSE(900),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/otp/routers/default/plan');
  });

  it('passes origin as fromPlace=lat,lon', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => OTP_RESPONSE(900),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`fromPlace=${ORIGIN.latitude},${ORIGIN.longitude}`);
  });

  it('passes destination as toPlace=lat,lon', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => OTP_RESPONSE(900),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`toPlace=${DEST.lat},${DEST.lng}`);
  });

  it('requests TRANSIT,WALK mode', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => OTP_RESPONSE(900),
    });

    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('mode=TRANSIT,WALK');
  });

  it('returns the duration of the first itinerary', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plan: { itineraries: [{ duration: 1234 }, { duration: 999 }] } }),
    });

    const result = await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);
    expect(result).toBe(1234);
  });

  it('throws when OTP returns a non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('OTP API error: 503');
  });

  it('throws when itineraries array is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plan: { itineraries: [] } }),
    });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('no itineraries found');
  });

  it('throws when plan is missing from response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'no path' }),
    });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('no itineraries found');
  });
});
