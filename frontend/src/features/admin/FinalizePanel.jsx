import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SlotScoreCard from './SlotScoreCard.jsx';

export default function FinalizePanel({
  adminToken, slots, scoredSlots,
  selectedVenueId, selectedVenueName, onFinalized,
}) {
  const { t } = useTranslation();
  const [slotId, setSlotId] = useState('');
  const [venueMode, setVenueMode] = useState('recommended');

  useEffect(() => {
    if (slots.length === 1 && !slotId) {
      setSlotId(slots[0].id);
    }
  }, [slots]);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [notes, setNotes] = useState('');
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
      if (durationMinutes) body.duration_minutes = Number(durationMinutes);
      if (notes.trim()) body.notes = notes.trim();

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
      setError(t('finalize.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  const displayedSlots = scoredSlots && scoredSlots.length > 0 ? scoredSlots : slots;

  return (
    <section data-testid="finalize-panel" className="finalize-section">
      <h2>{t('finalize.heading')}</h2>
      <form onSubmit={handleFinalize}>

        {/* Visual slot scorer — click to select */}
        {displayedSlots.length > 0 && (
          <div className="slot-scorer">
            {displayedSlots.map((s, i) => (
              <SlotScoreCard
                key={s.id}
                slot={s}
                rank={i + 1}
                selected={slotId === s.id}
                onClick={() => setSlotId(s.id)}
              />
            ))}
          </div>
        )}

        <div>
          <fieldset className="venue-mode-fieldset">
            <legend>{t('finalize.venueLegend')}</legend>
            <div className="venue-mode-options">
              <label className="venue-mode-option">
                <input
                  type="radio"
                  name="venue-mode"
                  value="recommended"
                  checked={venueMode === 'recommended'}
                  onChange={() => setVenueMode('recommended')}
                />
                {t('finalize.venueRecommended')}
              </label>
              <label className="venue-mode-option">
                <input
                  type="radio"
                  name="venue-mode"
                  value="custom"
                  checked={venueMode === 'custom'}
                  onChange={() => setVenueMode('custom')}
                  data-testid="custom-venue-radio"
                />
                {t('finalize.venueCustom')}
              </label>
            </div>
          </fieldset>

          {venueMode === 'recommended' && (
            <p data-testid="selected-venue-display" className="selected-venue-display">
              {selectedVenueName
                ? t('finalize.venueSelected', { name: selectedVenueName })
                : t('finalize.venueNone')}
            </p>
          )}

          {venueMode === 'custom' && (
            <div className="custom-venue-fields">
              <div className="custom-venue-field">
                <label>
                  {t('finalize.venueNameLabel')}
                  <input
                    type="text"
                    value={venueName}
                    onChange={e => setVenueName(e.target.value)}
                    placeholder={t('finalize.venueNamePlaceholder')}
                    data-testid="custom-venue-name"
                  />
                </label>
              </div>
              <div className="custom-venue-field">
                <label>
                  {t('finalize.venueAddressLabel')}
                  <input
                    type="text"
                    value={venueAddress}
                    onChange={e => setVenueAddress(e.target.value)}
                    placeholder={t('finalize.venueAddressPlaceholder')}
                    data-testid="custom-venue-address"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="finalize-duration-row">
          <label htmlFor="duration-select">{t('finalize.durationLegend')}</label>
          <select
            id="duration-select"
            value={durationMinutes}
            onChange={e => setDurationMinutes(e.target.value)}
            data-testid="duration-select"
          >
            <option value="30">{t('finalize.duration30')}</option>
            <option value="60">{t('finalize.duration60')}</option>
            <option value="90">{t('finalize.duration90')}</option>
            <option value="120">{t('finalize.duration120')}</option>
            <option value="180">{t('finalize.duration180')}</option>
          </select>
        </div>

        <div className="finalize-notes-row">
          <label htmlFor="finalize-notes">{t('finalize.notesLabel')}</label>
          <textarea
            id="finalize-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('finalize.notesPlaceholder')}
            rows={3}
            data-testid="finalize-notes"
          />
        </div>

        {error && <p role="alert" className="admin-error-inline">{error}</p>}

        <div className="finalize-button-row">
          <button type="submit" className="btn btn-primary" disabled={loading || !slotId} data-testid="finalize-btn">
            {loading ? t('finalize.btnFinalizing') : t('finalize.btnFinalize')}
          </button>
        </div>
      </form>
    </section>
  );
}
