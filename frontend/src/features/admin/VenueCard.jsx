export default function VenueCard({ venue }) {
  const distance =
    venue.distanceM != null
      ? venue.distanceM >= 1000
        ? `${(venue.distanceM / 1000).toFixed(1)} km`
        : `${venue.distanceM} m`
      : null;

  return (
    <li data-testid="venue-card">
      <span>&#128205;</span>
      {' '}
      <strong>{venue.name}</strong>
      {distance && <span data-testid="venue-distance"> &mdash; {distance}</span>}
      {venue.rating != null && (
        <span data-testid="venue-rating"> &mdash; &#9733; {venue.rating.toFixed(1)}</span>
      )}
    </li>
  );
}
