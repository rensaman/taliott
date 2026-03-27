const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const MAX_VENUE_DISTANCE_M = Number(process.env.MAX_VENUE_DISTANCE_M) || 800;

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
