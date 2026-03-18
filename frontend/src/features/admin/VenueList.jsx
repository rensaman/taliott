import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import VenueCard from './VenueCard.jsx';
import VenueTypeFilter from './VenueTypeFilter.jsx';

export default function VenueList({ adminToken, defaultVenueType, onVenuesLoaded, onSelectVenue }) {
  const { t } = useTranslation();
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
          : res.json().then(d => Promise.reject(d.error || t('venueList.failedToLoad')))
      )
      .then(data => {
        setVenues(data.venues);
        onVenuesLoaded?.(data.venues);
        setLoading(false);
      })
      .catch(err => {
        setError(typeof err === 'string' ? err : t('venueList.failedToLoad'));
        setLoading(false);
      });
  }, [adminToken, venueType]);

  function handleSelect(venue) {
    setSelectedId(venue.id);
    onSelectVenue?.(venue);
  }

  return (
    <section data-testid="venue-list-section" className="venue-list-section">
      <h2>{t('venueList.heading')}</h2>
      <VenueTypeFilter defaultValue={defaultVenueType} onSearch={setVenueType} />

      {!venueType && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>{t('venueList.noType')}</p>}
      {loading && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>{t('venueList.loading')}</p>}
      {error && <p role="alert" style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '0.75rem' }}>{error}</p>}
      {venues != null && venues.length === 0 && !loading && (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>{t('venueList.empty', { type: venueType })}</p>
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
