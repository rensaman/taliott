const ORS_BASE_URL = 'https://api.openrouteservice.org';

/**
 * ORS Matrix API profile names.
 * Phase 2 will expose per-participant mode selection.
 */
export const ORS_PROFILE = {
  'driving-car': 'driving-car',
  'foot-walking': 'foot-walking',
  'cycling-regular': 'cycling-regular',
};

export const DEFAULT_MODE = 'driving-car';

/**
 * Fetch travel durations (seconds) from each origin to a single destination
 * using the OpenRouteService Matrix API.
 *
 * ORS uses [longitude, latitude] coordinate order.
 *
 * @param {{ latitude: number, longitude: number }[]} origins
 * @param {{ lat: number, lng: number }} destination
 * @param {string} mode  ORS profile name (e.g. 'driving-car')
 * @param {function} fetchFn  injectable fetch for testing
 * @returns {Promise<number[]>}  durations in seconds, parallel to origins
 * @throws if ORS_API_KEY is not set or ORS returns a non-2xx response
 */
export async function fetchORSTravelDurations(
  origins,
  destination,
  mode = DEFAULT_MODE,
  fetchFn = fetch,
) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error('ORS_API_KEY not configured');

  // Build locations array: all origins first, destination last
  const locations = [
    ...origins.map(o => [o.longitude, o.latitude]),
    [destination.lng, destination.lat],
  ];
  const sources = origins.map((_, i) => i);
  const destinations = [origins.length];

  const res = await fetchFn(`${ORS_BASE_URL}/v2/matrix/${mode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ locations, sources, destinations, metrics: ['duration'] }),
  });

  if (!res.ok) throw new Error(`ORS API error: ${res.status}`);

  const data = await res.json();
  // data.durations is an N×1 matrix; extract the single destination column
  return data.durations.map(row => row[0]);
}
