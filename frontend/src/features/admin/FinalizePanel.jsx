import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SlotScoreCard from './SlotScoreCard.jsx';

export default function FinalizePanel({
  adminToken, slots, scoredSlots,
  selectedVenueId, selectedVenueName, onFinalized,
}) {
  const { t, i18n } = useTranslation();
  const [slotId, setSlotId] = useState('');
  const [venueMode, setVenueMode] = useState('recommended');

  useEffect(() => {
    if (slots.length === 1 && !slotId) {
      setSlotId(slots[0].id);
    }
  }, [slots, slotId]);

  // UX-11: Reset venueMode to recommended when a venue is selected while in custom mode
  const venueModeRef = useRef(venueMode);
  venueModeRef.current = venueMode;
  useEffect(() => {
    if (selectedVenueId && venueModeRef.current === 'custom') {
      setVenueMode('recommended');
    }
  }, [selectedVenueId]);

  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60'); // UX-4: default 60 min
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false); // UX-1

  // UX-1: modal-based confirmation — called from the confirm modal, not the form submit
  async function submitFinalize() {
    setShowConfirm(false);
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
        setError(data.error || t('finalize.errorGeneric'));
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
  const selectedSlot = displayedSlots.find(s => s.id === slotId) ?? null;
  const confirmVenueName = venueMode === 'recommended'
    ? (selectedVenueName || '—')
    : (venueName || '—');

  return (
    <section data-testid="finalize-panel" className="finalize-section">
      <div className="admin-section-title" data-testid="finalize-section-title">{t('finalize.heading')}</div>
      <form>

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
                tied={!!s.tied}
                totalSlots={displayedSlots.length}
              />
            ))}
          </div>
        )}

        {/* UX-9: single-slot auto-select hint */}
        {slots.length === 1 && (
          <p className="single-slot-hint" data-testid="single-slot-hint">
            {t('finalize.singleSlotHint')}
          </p>
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
                {/* UX-2: required hint when name is empty */}
                {!venueName.trim() && (
                  <p className="custom-venue-hint" data-testid="custom-venue-required">
                    {t('finalize.venueNameRequired')}
                  </p>
                )}
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
          {/* UX-1: opens confirm modal; UX-2: also disabled when custom venue name is empty */}
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !slotId || (venueMode === 'custom' && !venueName.trim())}
            data-testid="finalize-btn"
            onClick={() => setShowConfirm(true)}
          >
            {loading ? t('finalize.btnFinalizing') : t('finalize.btnFinalize')}
          </button>
        </div>
      </form>

      {/* UX-1: confirmation modal */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finalize-confirm-title"
          data-testid="finalize-confirm-modal"
          className="finalize-confirm-overlay"
        >
          <div className="finalize-confirm-dialog">
            <h3 id="finalize-confirm-title">{t('finalize.confirmTitle')}</h3>
            <dl className="finalize-confirm-details">
              <dt>{t('finalize.confirmSlotLabel')}</dt>
              <dd data-testid="confirm-slot-value">
                {selectedSlot
                  ? `${new Date(selectedSlot.starts_at).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })} ${new Date(selectedSlot.starts_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`
                  : '—'}
              </dd>
              <dt>{t('finalize.confirmVenueLabel')}</dt>
              <dd data-testid="confirm-venue-value">{confirmVenueName}</dd>
              <dt>{t('finalize.confirmDurationLabel')}</dt>
              <dd>{durationMinutes} {t('admin.finalizedDurationUnit')}</dd>
              {notes.trim() && (
                <>
                  <dt>{t('finalize.confirmNotesLabel')}</dt>
                  <dd>{notes}</dd>
                </>
              )}
            </dl>
            <div className="finalize-confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
                data-testid="confirm-cancel-btn"
              >
                {t('finalize.confirmCancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitFinalize}
                data-testid="confirm-send-btn"
                disabled={loading}
              >
                {loading ? t('finalize.btnFinalizing') : t('finalize.confirmSend')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
