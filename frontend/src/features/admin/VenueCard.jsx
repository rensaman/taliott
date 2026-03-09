export default function VenueCard({ venue, selected, onSelect }) {
  const distance =
    venue.distanceM != null
      ? venue.distanceM >= 1000
        ? `${(venue.distanceM / 1000).toFixed(1)} km`
        : `${venue.distanceM} m`
      : null;

  const mapUrl = `https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}&zoom=17`;

  return (
    <li data-testid="venue-card">
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5em', cursor: 'pointer' }}>
        <input
          type="radio"
          name="venue-selection"
          checked={selected}
          onChange={() => onSelect(venue)}
          data-testid="venue-radio"
        />
        <span>&#128205;</span>
        {' '}
        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
          <strong>{venue.name}</strong>
        </a>
        {distance && <span data-testid="venue-distance"> &mdash; {distance}</span>}
        {venue.rating != null && (
          <span data-testid="venue-rating"> &mdash; &#9733; {venue.rating.toFixed(1)}</span>
        )}
      </label>
    </li>
  );
}
