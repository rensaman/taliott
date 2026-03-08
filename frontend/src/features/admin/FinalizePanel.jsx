import { useState } from 'react';

export default function FinalizePanel({ adminToken, slots, venues, onFinalized }) {
  const [slotId, setSlotId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFinalize(e) {
    e.preventDefault();
    if (!slotId) return;
    setLoading(true);
    setError(null);

    try {
      const body = { slot_id: slotId };
      if (venueId) body.venue_id = venueId;

      const res = await fetch(`/api/events/${adminToken}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Finalization failed');
        return;
      }

      onFinalized?.();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section data-testid="finalize-panel">
      <h2>Finalize Event</h2>
      <form onSubmit={handleFinalize}>
        <div>
          <label htmlFor="slot-select">Select time slot</label>
          <select
            id="slot-select"
            value={slotId}
            onChange={e => setSlotId(e.target.value)}
            required
          >
            <option value="">-- choose a slot --</option>
            {slots.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {venues && venues.length > 0 && (
          <div>
            <label htmlFor="venue-select">Select venue (optional)</label>
            <select
              id="venue-select"
              value={venueId}
              onChange={e => setVenueId(e.target.value)}
            >
              <option value="">-- none / custom --</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}{v.distanceM ? ` (${Math.round(v.distanceM)}m)` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading || !slotId}>
          {loading ? 'Finalizing…' : 'Finalize Event'}
        </button>
      </form>
    </section>
  );
}
