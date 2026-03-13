const NAVITIA_BASE_URL = 'https://api.navitia.io/v1';

/**
 * Fetch transit travel duration (seconds) from one origin to one destination
 * using the Navitia journeys API.
 *
 * Navitia uses lon;lat coordinate format (longitude first, semicolon separated).
 *
 * @param {{ latitude: number, longitude: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {function} fetchFn  injectable fetch for testing
 * @returns {Promise<number>}  duration in seconds
 * @throws if NAVITIA_API_KEY is not set, API returns non-2xx, or no journeys found
 */
export async function fetchNavitiaTravelDuration(origin, destination, fetchFn = fetch) {
  const apiKey = process.env.NAVITIA_API_KEY;
  if (!apiKey) throw new Error('NAVITIA_API_KEY not configured');

  const from = `${origin.longitude};${origin.latitude}`;
  const to = `${destination.lng};${destination.lat}`;
  const url =
    `${NAVITIA_BASE_URL}/journeys` +
    `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&datetime_represents=departure`;

  const res = await fetchFn(url, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) throw new Error(`Navitia API error: ${res.status}`);

  const data = await res.json();
  const journeys = data.journeys;
  if (!journeys || journeys.length === 0) throw new Error('Navitia: no journeys found');

  return journeys[0].duration; // seconds
}
