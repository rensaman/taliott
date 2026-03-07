import { useState, useEffect } from 'react';
import VenueCard from './VenueCard.jsx';
import VenueTypeFilter from './VenueTypeFilter.jsx';

export default function VenueList({ adminToken, defaultVenueType }) {
  const [venues, setVenues] = useState(null);
  const [venueType, setVenueType] = useState(defaultVenueType || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venueType) return;
    setLoading(true);
    setError(null);
    fetch(`/api/events/${adminToken}/venues?venue_type=${encodeURIComponent(venueType)}`)
      .then(res =>
        res.ok
          ? res.json()
          : res.json().then(d => Promise.reject(d.error || 'Failed to load venues'))
      )
      .then(data => {
        setVenues(data.venues);
        setLoading(false);
      })
      .catch(err => {
        setError(typeof err === 'string' ? err : 'Failed to load venues');
        setLoading(false);
      });
  }, [adminToken, venueType]);

  return (
    <section data-testid="venue-list-section">
      <h2>Venue Recommendations</h2>
      <VenueTypeFilter defaultValue={defaultVenueType} onSearch={setVenueType} />
      {!venueType && <p>Set a venue type to see recommendations.</p>}
      {loading && <p>Loading venues&hellip;</p>}
      {error && <p role="alert">{error}</p>}
      {venues != null && venues.length === 0 && !loading && (
        <p>No venues found for &ldquo;{venueType}&rdquo;.</p>
      )}
      {venues != null && venues.length > 0 && (
        <ul>
          {venues.map(v => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </ul>
      )}
    </section>
  );
}
