import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function SlotScoreCard({ slot, rank, selected, onClick }) {
  const { i18n } = useTranslation();
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  const dateStr = start.toLocaleDateString(i18n.language, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeStr = `${start.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`;
  const hasData = slot.respondedCount > 0;

  return (
    <div
      data-testid={`slot-card-${slot.id}`}
      className={`slot-score-card${selected ? ' slot-score-card--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-pressed={selected}
    >
      <span className="slot-score-rank">#{rank}</span>
      <div className="slot-score-datetime">
        <span className="slot-score-date">{dateStr}</span>
        <span className="slot-score-time">{timeStr}</span>
      </div>
      {hasData && (
        <div className="slot-score-bars">
          <span className="slot-score-bar slot-score-bar--yes">✓ {slot.yes}</span>
          <span className="slot-score-bar slot-score-bar--maybe">? {slot.maybe}</span>
          <span className="slot-score-bar slot-score-bar--no">✗ {slot.no}</span>
        </div>
      )}
    </div>
  );
}

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
