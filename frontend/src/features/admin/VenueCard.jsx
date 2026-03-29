export default function VenueCard({ venue, number, selected, onSelect }) {
  const distance =
    venue.distanceM != null
      ? venue.distanceM >= 1000
        ? `${(venue.distanceM / 1000).toFixed(1)} km`
        : `${venue.distanceM} m`
      : null;

  const mapUrl = `https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}&zoom=17`;
  const linkUrl = venue.website || mapUrl;

  return (
    <li data-testid="venue-card" className={`venue-card-block${selected ? ' venue-card-block--selected' : ''}`}>
      {number != null && <span className="venue-card-number">{number}</span>}
      <input
        type="radio"
        name="venue-selection"
        className="venue-card-radio"
        checked={selected}
        onChange={() => onSelect(venue)}
        data-testid="venue-radio"
        aria-label={venue.name}
      />
      <div className="venue-card-body">
        <div className="venue-card-name">
          <a href={linkUrl} target="_blank" rel="noopener noreferrer">{venue.name}</a>
        </div>
        <div className="venue-card-meta">
          <span className="venue-card-pin" aria-hidden="true"></span>
          {distance && <span data-testid="venue-distance">{distance}</span>}
          {venue.rating != null && (
            <span data-testid="venue-rating">★ {venue.rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </li>
  );
}
