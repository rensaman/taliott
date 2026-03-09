import { useState } from 'react';

export default function FinalizePanel({ adminToken, slots, selectedVenueId, selectedVenueName, onFinalized }) {
  const [slotId, setSlotId] = useState('');
  const [venueMode, setVenueMode] = useState('recommended'); // 'recommended' | 'custom'
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFinalize(e) {
    e.preventDefault();
    if (!slotId) return;
    setLoading(true);
    setError(null);

    try {
      const body = { slot_id: slotId };
      if (venueMode === 'recommended' && selectedVenueId) {
        body.venue_id = selectedVenueId;
      } else if (venueMode === 'custom' && venueName) {
        body.venue_name = venueName;
        if (venueAddress) body.venue_address = venueAddress;
      }

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

        <div>
          <fieldset>
            <legend>Venue</legend>
            <label>
              <input
                type="radio"
                name="venue-mode"
                value="recommended"
                checked={venueMode === 'recommended'}
                onChange={() => setVenueMode('recommended')}
              />
              {' '}Select recommended
            </label>
            <label>
              <input
                type="radio"
                name="venue-mode"
                value="custom"
                checked={venueMode === 'custom'}
                onChange={() => setVenueMode('custom')}
              />
              {' '}Enter custom venue
            </label>
          </fieldset>

          {venueMode === 'recommended' && (
            <p data-testid="selected-venue-display">
              {selectedVenueName
                ? <>Selected: <strong>{selectedVenueName}</strong></>
                : 'No venue selected — pick one from the list above.'}
            </p>
          )}

          {venueMode === 'custom' && (
            <div>
              <label>
                Venue name
                <input
                  type="text"
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  placeholder="e.g. The Blue Note"
                  data-testid="custom-venue-name"
                />
              </label>
              <label>
                Venue address
                <input
                  type="text"
                  value={venueAddress}
                  onChange={e => setVenueAddress(e.target.value)}
                  placeholder="e.g. 131 W 3rd St, New York"
                  data-testid="custom-venue-address"
                />
              </label>
            </div>
          )}
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading || !slotId}>
          {loading ? 'Finalizing…' : 'Finalize Event'}
        </button>
      </form>
    </section>
  );
}
