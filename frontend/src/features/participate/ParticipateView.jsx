import { useEffect, useState } from 'react';
import DeadlineBadge from './DeadlineBadge.jsx';

export default function ParticipateView({ participantId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/participate/${participantId}`)
      .then(res => {
        if (!res.ok) throw new Error('Participation link not found.');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message));
  }, [participantId]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { event, slots, availability } = data;
  const availMap = Object.fromEntries(availability.map(a => [a.slot_id, a.state]));

  return (
    <main>
      <h1>{event.name}</h1>
      <DeadlineBadge deadline={event.deadline} locked={event.locked} />

      {event.locked && (
        <p role="status">Results only — voting has closed.</p>
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
