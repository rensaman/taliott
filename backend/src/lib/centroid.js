/**
 * Compute the arithmetic mean (lat, lng) of participants who have a location.
 * Returns null if no participants have coordinates.
 *
 * @param {{ latitude: number|null, longitude: number|null }[]} participants
 * @returns {{ lat: number, lng: number, count: number } | null}
 */
export function computeCentroid(participants) {
  const located = participants.filter(
    p => p.latitude != null && p.longitude != null
  );
  if (located.length === 0) return null;
  const lat = located.reduce((sum, p) => sum + p.latitude, 0) / located.length;
  const lng = located.reduce((sum, p) => sum + p.longitude, 0) / located.length;
  return { lat, lng, count: located.length };
}
