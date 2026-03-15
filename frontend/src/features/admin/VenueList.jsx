import { useState, useEffect } from 'react';
import VenueCard from './VenueCard.jsx';
import VenueTypeFilter from './VenueTypeFilter.jsx';

export default function VenueList({ adminToken, defaultVenueType, onVenuesLoaded, onSelectVenue }) {
  const [venues, setVenues] = useState(null);
  const [venueType, setVenueType] = useState(defaultVenueType || '');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venueType) return;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    onSelectVenue?.(null);
    fetch(`/api/events/${adminToken}/venues?venue_type=${encodeURIComponent(venueType)}`)
      .then(res =>
        res.ok
          ? res.json()
          : res.json().then(d => Promise.reject(d.error || 'Failed to load venues'))
      )
      .then(data => {
        setVenues(data.venues);
        onVenuesLoaded?.(data.venues);
        setLoading(false);
      })
      .catch(err => {
        setError(typeof err === 'string' ? err : 'Failed to load venues');
        setLoading(false);
      });
  }, [adminToken, venueType]);

  function handleSelect(venue) {
    setSelectedId(venue.id);
    onSelectVenue?.(venue);
  }

  return (
    <section data-testid="venue-list-section" className="venue-list-section">
      <h2>Venue Recommendations</h2>
      <VenueTypeFilter defaultValue={defaultVenueType} onSearch={setVenueType} />

      {!venueType && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>Set a venue type to see recommendations.</p>}
      {loading && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>Loading venues&hellip;</p>}
      {error && <p role="alert" style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '0.75rem' }}>{error}</p>}
      {venues != null && venues.length === 0 && !loading && (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>No venues found for &ldquo;{venueType}&rdquo;.</p>
      )}
      {venues != null && venues.length > 0 && (
        <ul className="venue-card-list" style={{ marginTop: '0.75rem' }}>
          {venues.map(v => (
            <VenueCard
              key={v.id}
              venue={v}
              selected={v.id === selectedId}
              onSelect={handleSelect}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
