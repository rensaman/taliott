import { useEffect, useState } from 'react';
import DeadlineBadge from './DeadlineBadge.jsx';
import AddressSearchInput from './AddressSearchInput.jsx';
import LocationMap from './LocationMap.jsx';
import AvailabilityGrid from './AvailabilityGrid.jsx';
import HeatmapGrid from './HeatmapGrid.jsx';
import GroupMap from '../admin/GroupMap.jsx';
import { useEventStream } from '../../hooks/useEventStream.js';

export default function ParticipateView({ participantId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [centroid, setCentroid] = useState(null);

  useEffect(() => {
    fetch(`/api/participate/${participantId}`)
      .then(res => {
        if (!res.ok) throw new Error('Participation link not found.');
        return res.json();
      })
      .then(d => {
        setData(d);
        const { latitude, longitude, address_label, responded_at } = d.participant;
        if (latitude != null && longitude != null) {
          setLocation({ lat: latitude, lng: longitude, label: address_label });
        }
        if (responded_at) setConfirmed(true);
        setHeatmap(d.heatmap ?? null);
        setCentroid(d.centroid ?? null);
      })
      .catch(err => setError(err.message));
  }, [participantId]);

  // Subscribe to live event updates once we know the event ID
  useEventStream(data?.event?.id ?? null, msg => {
    if (msg.type === 'availability') setHeatmap(msg.heatmap);
    if (msg.type === 'location') setCentroid(msg.centroid);
  });

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { event, slots, availability, finalSlot, finalVenue } = data;

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

  async function confirm() {
    setConfirmError(null);
    try {
      const res = await fetch(`/api/participate/${participantId}/confirm`, { method: 'PATCH' });
      if (!res.ok) {
        setConfirmError('Failed to submit. Please try again.');
      } else {
        setConfirmed(true);
      }
    } catch {
      setConfirmError('Failed to submit. Please try again.');
    }
  }

  return (
    <main>
      <h1>{event.name}</h1>
      <DeadlineBadge deadline={event.deadline} locked={event.locked} />

      {event.locked && (
        <p role="status">Results only — voting has closed.</p>
      )}

      {finalSlot && (
        <section aria-label="Event result" data-testid="finalized-banner">
          <h2>Event finalized</h2>
          <p>When: {new Date(finalSlot.starts_at).toLocaleString()}</p>
          {finalVenue && (
            <p>
              Where: {finalVenue.name}
              {finalVenue.address ? `, ${finalVenue.address}` : ''}
            </p>
          )}
        </section>
      )}

      {!event.locked && (
        <section aria-label="Your location">
          <AddressSearchInput onSelect={saveLocation} />
          <LocationMap location={location} onLocationChange={saveLocation} />
          {saveError && <p role="alert">{saveError}</p>}
        </section>
      )}

      <AvailabilityGrid
        participantId={participantId}
        slots={slots}
        initialAvailability={availability}
        locked={event.locked}
      />

      <HeatmapGrid slots={slots} heatmap={heatmap} />

      <section aria-label="Estimated meetup area">
        <GroupMap centroid={centroid} participants={[]} />
      </section>

      {!event.locked && (
        <section aria-label="Confirm response">
          {confirmed ? (
            <button onClick={confirm} data-testid="confirm-btn">
              ✓ Submitted — update response
            </button>
          ) : (
            <button onClick={confirm} data-testid="confirm-btn">
              Mark as done
            </button>
          )}
          {confirmError && <p role="alert">{confirmError}</p>}
        </section>
      )}
    </main>
  );
}
