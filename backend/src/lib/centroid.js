import { haversineDistance } from './venues.js';
import { getCachedDurations, storeCachedDurations } from './route-cache.js';
import { fetchORSTravelDurations, TRAVEL_MODE_TO_ORS } from './ors.js';
import { fetchNavitiaTravelDuration } from './otp.js';

const MAX_ITER = 5;
const CONVERGENCE_DEG = 1e-6; // ≈ 0.1 m — stop when estimate barely moves

/**
 * Compute the travel-time-weighted geometric median (Weiszfeld algorithm).
 *
 * Each participant may specify a travelMode: 'walking', 'cycling', 'driving',
 * or 'transit' (default). ORS handles the first three in batch; Navitia
 * handles transit individually. Both fall back to Euclidean (haversine)
 * distance when the respective API is unavailable.
 *
 * Returns null when no participants have coordinates.
 * Returns the single point directly when only one participant has a location.
 *
 * @param {{ latitude: number|null, longitude: number|null, travelMode?: string }[]} participants
 * @param {{ prisma?: object, fetchFn?: function, navitiaFetchFn?: function }} [options]
 * @returns {Promise<{ lat: number, lng: number, count: number } | null>}
 */
export async function computeCentroid(
  participants,
  { prisma, fetchFn = fetch, navitiaFetchFn = fetch } = {},
) {
  const located = participants.filter(p => p.latitude != null && p.longitude != null);
  if (located.length === 0) return null;
  if (located.length === 1) {
    return { lat: located[0].latitude, lng: located[0].longitude, count: 1 };
  }

  // Start from arithmetic mean — guaranteed convergence for Weiszfeld
  let lat = located.reduce((s, p) => s + p.latitude, 0) / located.length;
  let lng = located.reduce((s, p) => s + p.longitude, 0) / located.length;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const durations = await resolveDurations(located, { lat, lng }, {
      prisma, fetchFn, navitiaFetchFn,
    });

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
 * Per-participant mode:
 *   - 'walking'  → ORS foot-walking  (batch, cached)
 *   - 'cycling'  → ORS cycling-regular  (batch, cached)
 *   - 'driving'  → ORS driving-car  (batch, cached)
 *   - 'transit'  → Navitia (individual, cached as 'transit' mode)
 *
 * All APIs fall back to Euclidean haversine distance on failure.
 */
async function resolveDurations(located, dest, { prisma, fetchFn, navitiaFetchFn }) {
  const modes = located.map(p => p.travelMode ?? 'transit');
  const durations = new Array(located.length).fill(null);

  // Batch cache lookup per mode group
  if (prisma) {
    const byMode = groupIndicesByMode(modes);
    for (const [mode, idxs] of Object.entries(byMode)) {
      const cacheMode = mode === 'transit' ? 'transit' : TRAVEL_MODE_TO_ORS[mode];
      const origins = idxs.map(i => located[i]);
      const cached = await getCachedDurations(prisma, origins, dest, cacheMode);
      for (let j = 0; j < idxs.length; j++) {
        durations[idxs[j]] = cached[j];
      }
    }
  }

  const missIdxs = durations.map((d, i) => (d == null ? i : null)).filter(i => i != null);
  if (missIdxs.length === 0) return durations;

  // Group misses by mode for efficient API calls
  const missByMode = {};
  for (const i of missIdxs) {
    const m = modes[i];
    if (!missByMode[m]) missByMode[m] = [];
    missByMode[m].push(i);
  }

  // Fetch non-transit modes via ORS Matrix API (batch per mode)
  for (const [mode, idxs] of Object.entries(missByMode)) {
    if (mode === 'transit') continue;
    const orsProfile = TRAVEL_MODE_TO_ORS[mode];
    const origins = idxs.map(i => located[i]);
    try {
      const fetched = await fetchORSTravelDurations(origins, dest, orsProfile, fetchFn);
      if (prisma) await storeCachedDurations(prisma, origins, dest, orsProfile, fetched);
      for (let j = 0; j < idxs.length; j++) durations[idxs[j]] = fetched[j];
    } catch {
      const fallback = origins.map(o =>
        haversineDistance(o.latitude, o.longitude, dest.lat, dest.lng),
      );
      // Cache the Euclidean approximation so repeated ORS failures don't re-compute it.
      if (prisma) {
        storeCachedDurations(prisma, origins, dest, orsProfile, fallback).catch(err =>
          console.error('[centroid] failed to cache ORS fallback:', err),
        );
      }
      for (let j = 0; j < idxs.length; j++) durations[idxs[j]] = fallback[j];
    }
  }

  // Fetch transit via OTP (one call per participant)
  for (const i of (missByMode['transit'] ?? [])) {
    try {
      const d = await fetchNavitiaTravelDuration(located[i], dest, navitiaFetchFn);
      if (prisma) await storeCachedDurations(prisma, [located[i]], dest, 'transit', [d]);
      durations[i] = d;
    } catch {
      const fallback = haversineDistance(
        located[i].latitude, located[i].longitude, dest.lat, dest.lng,
      );
      if (prisma) {
        storeCachedDurations(prisma, [located[i]], dest, 'transit', [fallback]).catch(err =>
          console.error('[centroid] failed to cache transit fallback:', err),
        );
      }
      durations[i] = fallback;
    }
  }

  return durations;
}

function groupIndicesByMode(modes) {
  const groups = {};
  for (let i = 0; i < modes.length; i++) {
    const m = modes[i];
    if (!groups[m]) groups[m] = [];
    groups[m].push(i);
  }
  return groups;
}
