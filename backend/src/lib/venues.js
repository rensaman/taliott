const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_M = 2000;

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
  const query = `[out:json];node(around:${SEARCH_RADIUS_M},${lat},${lng})[amenity=${venueType}];out body;`;
  const res = await fetchFn(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();
  return (data.elements || []).map(el => ({
    externalId: String(el.id),
    name: el.tags?.name || 'Unnamed',
    latitude: el.lat,
    longitude: el.lon,
    rating: null,
    distanceM: Math.round(haversineDistance(lat, lng, el.lat, el.lon)),
  }));
}
