const OTP_BASE_URL = process.env.OTP_BASE_URL || 'http://localhost:8080';

/**
 * Returns the date string (YYYY-MM-DD) of the next Monday,
 * used as a representative weekday for transit time estimation.
 */
function nextMondayDate() {
  const d = new Date();
  const daysUntilMonday = d.getDay() === 1 ? 7 : (8 - d.getDay()) % 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch transit travel duration (seconds) from one origin to one destination
 * using the local OpenTripPlanner (OTP) REST API.
 *
 * Uses next Monday 09:00 as a representative weekday morning departure time.
 *
 * @param {{ latitude: number, longitude: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {function} fetchFn  injectable fetch for testing
 * @returns {Promise<number>}  duration in seconds
 * @throws if OTP returns non-2xx or no itineraries found
 */
export async function fetchNavitiaTravelDuration(origin, destination, fetchFn = fetch) {
  const date = nextMondayDate();
  const url =
    `${OTP_BASE_URL}/otp/routers/default/plan` +
    `?fromPlace=${origin.latitude},${origin.longitude}` +
    `&toPlace=${destination.lat},${destination.lng}` +
    `&mode=TRANSIT,WALK` +
    `&time=09:00:00&date=${date}`;

  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`OTP API error: ${res.status}`);

  const data = await res.json();
  const itineraries = data.plan?.itineraries;
  if (!itineraries || itineraries.length === 0) throw new Error('OTP: no itineraries found');

  return itineraries[0].duration; // seconds
}
