const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const MAX_VENUE_DISTANCE_M = Number(process.env.MAX_VENUE_DISTANCE_M) || 800;

const CACHE_FRESH_MS = 60 * 60 * 1000;  // 1 hour
const CACHE_STALE_MS = 2 * 60 * 60 * 1000; // serve stale + revalidate up to 2 hours

export const venueCache = new Map(); // exported for testing/clearing

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function sortVenues(venues) {
  return [...venues].sort((a, b) => {
    const distDiff = (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
    if (distDiff !== 0) return distDiff;
    return (b.rating ?? -Infinity) - (a.rating ?? -Infinity);
  });
}

export async function getCachedVenues(venueType, lat, lng, fetchFn = fetch) {
  const key = `${venueType}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  const cached = venueCache.get(key);
  const now = Date.now();

  if (cached) {
    const age = now - cached.fetchedAt;
    if (age < CACHE_FRESH_MS) {
      return cached.venues;
    }
    if (age < CACHE_STALE_MS) {
      fetchVenuesFromOverpass(venueType, lat, lng, fetchFn)
        .then(venues => venueCache.set(key, { venues, fetchedAt: Date.now() }))
        .catch(() => {});
      return cached.venues;
    }
  }

  const venues = await fetchVenuesFromOverpass(venueType, lat, lng, fetchFn);
  venueCache.set(key, { venues, fetchedAt: now });
  return venues;
}

export async function fetchVenuesFromOverpass(venueType, lat, lng, fetchFn = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const query = `[out:json];node(around:${MAX_VENUE_DISTANCE_M},${lat},${lng})[amenity=${venueType}];out body;`;
  try {
    const res = await fetchFn(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
    const data = await res.json();
    return (data.elements || []).map(el => {
      const tags = el.tags ?? {};
      const addrParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:city'],
      ].filter(Boolean);
      return {
        externalId: String(el.id),
        name: tags.name || 'Unnamed',
        latitude: el.lat,
        longitude: el.lon,
        rating: null,
        distanceM: Math.round(haversineDistance(lat, lng, el.lat, el.lon)),
        website: tags.website || tags.url || null,
        address: addrParts.length > 0 ? addrParts.join(' ') : null,
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}
