import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import VenueCard from './VenueCard.jsx';
import VenueTypeFilter from './VenueTypeFilter.jsx';

const MAX_VENUES = 10;

export default function VenueList({ adminToken, defaultVenueType, selectedId, onVenuesLoaded, onSelectVenue }) {
  const { t } = useTranslation();
  const [venueTypes, setVenueTypes] = useState(
    defaultVenueType ? [defaultVenueType] : []
  );
  const [venues, setVenues] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const venueTypesKey = venueTypes.join(',');

  useEffect(() => {
    if (venueTypes.length === 0) return;
    setLoading(true);
    setError(null);
    onSelectVenue?.(null);
    Promise.all(
      venueTypes.map(type =>
        fetch(`/api/events/${adminToken}/venues?venue_type=${encodeURIComponent(type)}`)
          .then(res =>
            res.ok
              ? res.json()
              : res.json().then(d => Promise.reject(d.error || t('venueList.failedToLoad')))
          )
          .then(data => data.venues)
      )
    )
      .then(results => {
        const seen = new Set();
        const merged = results.flat().filter(v => {
          if (seen.has(v.id)) return false;
          seen.add(v.id);
          return true;
        });
        merged.sort((a, b) => a.distanceM - b.distanceM);
        const capped = merged.slice(0, MAX_VENUES);
        setVenues(capped);
        onVenuesLoaded?.(capped);
        setLoading(false);
      })
      .catch(err => {
        setError(typeof err === 'string' ? err : t('venueList.failedToLoad'));
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, venueTypesKey]);

  return (
    <section data-testid="venue-list-section" className="venue-list-section">
      <h2>{t('venueList.heading')}</h2>
      <VenueTypeFilter defaultValue={defaultVenueType} onSearch={setVenueTypes} />

      {venueTypes.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>{t('venueList.noType')}</p>}
      {loading && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>{t('venueList.loading')}</p>}
      {error && <p role="alert" style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '0.75rem' }}>{error}</p>}
      {venues != null && venues.length === 0 && !loading && (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>{t('venueList.empty')}</p>
      )}
      {venues != null && venues.length > 0 && (
        <ul className="venue-card-list" style={{ marginTop: '0.75rem' }}>
          {venues.map((v, i) => (
            <VenueCard
              key={v.id}
              venue={v}
              number={i + 1}
              selected={v.id === selectedId}
              onSelect={onSelectVenue}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
