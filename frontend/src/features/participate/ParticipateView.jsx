import { useEffect, useState } from 'react';
import DeadlineBadge from './DeadlineBadge.jsx';
import AddressSearchInput from './AddressSearchInput.jsx';
import LocationMap from './LocationMap.jsx';

export default function ParticipateView({ participantId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    fetch(`/api/participate/${participantId}`)
      .then(res => {
        if (!res.ok) throw new Error('Participation link not found.');
        return res.json();
      })
      .then(d => {
        setData(d);
        const { latitude, longitude, address_label } = d.participant;
        if (latitude != null && longitude != null) {
          setLocation({ lat: latitude, lng: longitude, label: address_label });
        }
      })
      .catch(err => setError(err.message));
  }, [participantId]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { event, slots, availability } = data;
  const availMap = Object.fromEntries(availability.map(a => [a.slot_id, a.state]));

  async function saveLocation(loc) {
    setLocation(loc);
    try {
      const res = await fetch(`/api/participate/${participantId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng, address_label: loc.label ?? null }),
      });
      if (!res.ok) {
        setSaveError('Failed to save location. Please try again.');
      } else {
        setSaveError(null);
      }
    } catch {
      setSaveError('Failed to save location. Please try again.');
    }
  }

  return (
    <main>
      <h1>{event.name}</h1>
      <DeadlineBadge deadline={event.deadline} locked={event.locked} />

      {event.locked && (
        <p role="status">Results only — voting has closed.</p>
      )}

      {!event.locked && (
        <section aria-label="Your location">
          <AddressSearchInput onSelect={saveLocation} />
          <LocationMap location={location} onLocationChange={saveLocation} />
          {saveError && <p role="alert">{saveError}</p>}
        </section>
      )}

      <section aria-label="Time slots">
        {slots.map(slot => (
          <div key={slot.id} data-testid="slot">
            <span>{new Date(slot.starts_at).toLocaleString()}</span>
            <span>{availMap[slot.id] ?? 'neutral'}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
