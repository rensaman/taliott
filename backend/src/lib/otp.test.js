import { describe, it, expect, vi } from 'vitest';
import { fetchNavitiaTravelDuration } from './otp.js';

const ORIGIN = { latitude: 47.497, longitude: 19.040 };
const DEST = { lat: 47.520, lng: 19.060 };

const OTP_RESPONSE = (duration) => ({
  data: { plan: { itineraries: [{ duration }] } },
});

function mockOk(body) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => body });
}

describe('fetchNavitiaTravelDuration', () => {
  it('calls the OTP GraphQL endpoint', async () => {
    const mockFetch = mockOk(OTP_RESPONSE(900));
    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/otp/routers/default/index/graphql');
  });

  it('sends a POST with JSON content-type', async () => {
    const mockFetch = mockOk(OTP_RESPONSE(900));
    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('includes origin coordinates in query body', async () => {
    const mockFetch = mockOk(OTP_RESPONSE(900));
    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toContain(`${ORIGIN.latitude}`);
    expect(options.body).toContain(`${ORIGIN.longitude}`);
  });

  it('includes destination coordinates in query body', async () => {
    const mockFetch = mockOk(OTP_RESPONSE(900));
    await fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toContain(`${DEST.lat}`);
    expect(options.body).toContain(`${DEST.lng}`);
  });

  it('returns the duration of the first itinerary', async () => {
    const mockFetch = mockOk({ data: { plan: { itineraries: [{ duration: 1234 }, { duration: 999 }] } } });
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
    const mockFetch = mockOk({ data: { plan: { itineraries: [] } } });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('no itineraries found');
  });

  it('throws when plan is missing from response', async () => {
    const mockFetch = mockOk({ data: {} });
    await expect(
      fetchNavitiaTravelDuration(ORIGIN, DEST, mockFetch),
    ).rejects.toThrow('no itineraries found');
  });
});
