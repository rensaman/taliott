import { Prisma } from '@prisma/client';
import { getPrisma } from './prisma.js';

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

export async function fetchVenuesFromOSM(venueType, lat, lng) {
  const rows = await getPrisma().$queryRaw(Prisma.sql`
    SELECT
      osm_id::text                                         AS "externalId",
      COALESCE(name, 'Unnamed')                            AS name,
      ST_Y(ST_Transform(way, 4326))                        AS latitude,
      ST_X(ST_Transform(way, 4326))                        AS longitude,
      ROUND(ST_Distance(
        geography(ST_Transform(way, 4326)),
        ST_MakePoint(${lng}::float8, ${lat}::float8)::geography
      ))::int                                              AS "distanceM",
      COALESCE(tags->'website', tags->'url')               AS website,
      NULLIF(CONCAT_WS(' ',
        tags->'addr:housenumber',
        tags->'addr:street',
        tags->'addr:city'
      ), '')                                               AS address
    FROM planet_osm_point
    WHERE amenity = ${venueType}
      AND ST_DWithin(
        geography(ST_Transform(way, 4326)),
        ST_MakePoint(${lng}::float8, ${lat}::float8)::geography,
        ${MAX_VENUE_DISTANCE_M}::float8
      )
  `);
  return rows.map(row => ({
    externalId: row.externalId,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    rating: null,
    distanceM: Number(row.distanceM),
    website: row.website ?? null,
    address: row.address ?? null,
  }));
}

export async function getCachedVenues(venueType, lat, lng, dataFn = fetchVenuesFromOSM) {
  const key = `${venueType}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  const cached = venueCache.get(key);
  const now = Date.now();

  if (cached) {
    const age = now - cached.fetchedAt;
    if (age < CACHE_FRESH_MS) {
      return cached.venues;
    }
    if (age < CACHE_STALE_MS) {
      dataFn(venueType, lat, lng)
        .then(venues => venueCache.set(key, { venues, fetchedAt: Date.now() }))
        .catch(() => {});
      return cached.venues;
    }
  }

  const venues = await dataFn(venueType, lat, lng);
  venueCache.set(key, { venues, fetchedAt: now });
  return venues;
}
