const SNAP_DECIMALS = 3; // ~55 m grid — negligible for travel-time estimation
const SNAP_FACTOR = 10 ** SNAP_DECIMALS;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Snap a coordinate to a ~55 m grid to maximise cache hit rate.
 * Differences within one grid cell (~55 m) produce < 1 min travel-time error.
 */
export function snapCoord(v) {
  return Math.round(v * SNAP_FACTOR) / SNAP_FACTOR;
}

/**
 * Batch-fetch cached durations for a list of origins → one destination.
 * Returns an array parallel to `origins`: each entry is durationSec or null
 * if the entry is missing or older than TTL.
 *
 * @param {object} prisma
 * @param {{ latitude: number, longitude: number }[]} origins
 * @param {{ lat: number, lng: number }} dest
 * @param {string} mode
 * @returns {Promise<(number|null)[]>}
 */
export async function getCachedDurations(prisma, origins, dest, mode) {
  const toLat = snapCoord(dest.lat);
  const toLng = snapCoord(dest.lng);

  const entries = await prisma.routeCache.findMany({
    where: {
      mode,
      toLat,
      toLng,
      OR: origins.map(o => ({
        fromLat: snapCoord(o.latitude),
        fromLng: snapCoord(o.longitude),
      })),
    },
  });

  const now = Date.now();
  const valid = new Map(
    entries
      .filter(e => now - e.createdAt.getTime() < CACHE_TTL_MS)
      .map(e => [`${e.fromLat},${e.fromLng}`, e.durationSec]),
  );

  return origins.map(o => {
    const key = `${snapCoord(o.latitude)},${snapCoord(o.longitude)}`;
    return valid.get(key) ?? null;
  });
}

/**
 * Store a batch of durations for origins → one destination.
 * `durations` is parallel to `origins`; null entries are skipped.
 *
 * @param {object} prisma
 * @param {{ latitude: number, longitude: number }[]} origins
 * @param {{ lat: number, lng: number }} dest
 * @param {string} mode
 * @param {(number|null)[]} durations
 */
export async function storeCachedDurations(prisma, origins, dest, mode, durations) {
  const toLat = snapCoord(dest.lat);
  const toLng = snapCoord(dest.lng);

  for (let i = 0; i < origins.length; i++) {
    if (durations[i] == null) continue;
    const fromLat = snapCoord(origins[i].latitude);
    const fromLng = snapCoord(origins[i].longitude);
    await prisma.routeCache.upsert({
      where: {
        fromLat_fromLng_toLat_toLng_mode: { fromLat, fromLng, toLat, toLng, mode },
      },
      update: { durationSec: Math.round(durations[i]), createdAt: new Date() },
      create: { fromLat, fromLng, toLat, toLng, mode, durationSec: Math.round(durations[i]) },
    });
  }
}
