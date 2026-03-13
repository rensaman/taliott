import { haversineDistance } from './venues.js';
import { getCachedDurations, storeCachedDurations } from './route-cache.js';
import { fetchORSTravelDurations, DEFAULT_MODE } from './ors.js';

const MAX_ITER = 5;
const CONVERGENCE_DEG = 1e-6; // ≈ 0.1 m — stop when estimate barely moves

/**
 * Compute the travel-time-weighted geometric median (Weiszfeld algorithm).
 *
 * Uses ORS driving-car travel times when ORS_API_KEY is configured and prisma
 * is provided for caching. Falls back to Euclidean (haversine) distances when
 * ORS is unavailable or the API call fails.
 *
 * Returns null when no participants have coordinates.
 * Returns the single point directly when only one participant has a location.
 *
 * @param {{ latitude: number|null, longitude: number|null }[]} participants
 * @param {{ prisma?: object, fetchFn?: function }} [options]
 * @returns {Promise<{ lat: number, lng: number, count: number } | null>}
 */
export async function computeCentroid(participants, { prisma, fetchFn = fetch } = {}) {
  const located = participants.filter(p => p.latitude != null && p.longitude != null);
  if (located.length === 0) return null;
  if (located.length === 1) {
    return { lat: located[0].latitude, lng: located[0].longitude, count: 1 };
  }

  // Start from arithmetic mean — guaranteed convergence for Weiszfeld
  let lat = located.reduce((s, p) => s + p.latitude, 0) / located.length;
  let lng = located.reduce((s, p) => s + p.longitude, 0) / located.length;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const durations = await resolveDurations(located, { lat, lng }, { prisma, fetchFn });

    let wLat = 0, wLng = 0, wSum = 0;
    for (let i = 0; i < located.length; i++) {
      const w = 1 / Math.max(durations[i], 1); // guard against zero duration
      wLat += w * located[i].latitude;
      wLng += w * located[i].longitude;
      wSum += w;
    }

    const newLat = wLat / wSum;
    const newLng = wLng / wSum;
    const delta = Math.abs(newLat - lat) + Math.abs(newLng - lng);
    lat = newLat;
    lng = newLng;
    if (delta < CONVERGENCE_DEG) break;
  }

  return { lat, lng, count: located.length };
}

/**
 * Resolve durations (seconds) from each located participant to `dest`.
 *
 * Priority chain:
 *   1. DB cache (if prisma provided)
 *   2. ORS Matrix API (if ORS_API_KEY set) — stores results in cache
 *   3. Euclidean haversine distance (meters used as duration proxy)
 */
async function resolveDurations(located, dest, { prisma, fetchFn }) {
  let durations = prisma
    ? await getCachedDurations(prisma, located, dest, DEFAULT_MODE)
    : located.map(() => null);

  const missIdxs = durations
    .map((d, i) => (d == null ? i : null))
    .filter(i => i != null);

  if (missIdxs.length === 0) return durations;

  const missOrigins = missIdxs.map(i => located[i]);
  let fetched;

  try {
    fetched = await fetchORSTravelDurations(missOrigins, dest, DEFAULT_MODE, fetchFn);
    if (prisma) {
      await storeCachedDurations(prisma, missOrigins, dest, DEFAULT_MODE, fetched);
    }
  } catch {
    // ORS unavailable (no key, network error, etc.) — use Euclidean proxy
    fetched = missOrigins.map(o =>
      haversineDistance(o.latitude, o.longitude, dest.lat, dest.lng),
    );
  }

  for (let j = 0; j < missIdxs.length; j++) {
    durations[missIdxs[j]] = fetched[j];
  }

  return durations;
}
