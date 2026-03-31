import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AvailabilityGrid from './AvailabilityGrid.jsx';
import AddressSearchInput from './AddressSearchInput.jsx';
import TravelModeSelector from './TravelModeSelector.jsx';
import DeadlineBadge from './DeadlineBadge.jsx';
import StepRoute from '../setup/StepRoute.jsx';
import UnsavedChangesDialog from '../UnsavedChangesDialog.jsx';
import { useNavigationGuard } from '../../hooks/useNavigationGuard.js';
import '../setup/EventSetupForm.css';
import './ResponseWizard.css';

const STEPS = ['travel_location', 'dates', 'review'];

export default function ResponseWizard({
  participantId,
  initialName,
  initialStep = 0,
  slots,
  initialAvailability,
  initialLocation,
  initialTravelMode = null,
  eventTimezone = 'UTC',
  eventName,
  eventDeadline,
  eventLocked,
  isUpdate = false,
  onComplete,
}) {
  const { t } = useTranslation();

  // 4-step labels including the join step (always shown as done in wizard)
  const ALL_STEP_LABELS = [
    t('participate.steps.join'),
    t('participate.steps.location'),
    t('participate.steps.dates'),
    t('participate.steps.review'),
  ];

  const [step, setStep] = useState(initialStep);
  const [location, setLocation] = useState(initialLocation ?? null);
  const locationFieldsetRef = useRef(null);
  const [travelMode, setTravelMode] = useState(initialTravelMode);
  const [locationError, setLocationError] = useState(null);
  const [travelModeError, setTravelModeError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [availabilityStateMap, setAvailabilityStateMap] = useState(() => {
    const map = {};
    for (const slot of slots) map[slot.id] = 'neutral';
    for (const a of initialAvailability) map[a.slot_id] = a.state;
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [hasMadeChanges, setHasMadeChanges] = useState(false);

  const isDirty = !confirmed && hasMadeChanges;
  const { showDialog, confirmLeave, cancelLeave } = useNavigationGuard(isDirty);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  async function saveLocation(loc) {
    setLocation(loc);
    setHasMadeChanges(true);
    try {
      const res = await fetch(`/api/participate/${participantId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng, address_label: loc.label ?? null }),
      });
      if (!res.ok) setLocationError(t('participate.location.errorSave'));
      else setLocationError(null);
    } catch {
      setLocationError(t('participate.location.errorSave'));
    }
  }

  async function saveTravelMode(mode) {
    setTravelMode(mode);
    setHasMadeChanges(true);
    locationFieldsetRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    try {
      const res = await fetch(`/api/participate/${participantId}/travel-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travel_mode: mode }),
      });
      if (!res.ok) setTravelModeError(t('participate.travelModeError'));
      else setTravelModeError(null);
    } catch {
      setTravelModeError(t('participate.travelModeError'));
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/participate/${participantId}/confirm`, { method: 'PATCH' });
      if (!res.ok) {
        setSubmitError(t('participate.review.errorSubmit'));
        return;
      }
      setConfirmed(true);
      onComplete({ name: initialName ?? null, location, travelMode });
    } catch {
      setSubmitError(t('participate.review.errorSubmit'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext(e) {
    e?.preventDefault();
    if (isLastStep) {
      await handleSubmit();
    } else {
      setStep(s => s + 1);
    }
  }

  function handleBack() {
    setStep(s => s - 1);
  }

  function handleBarStepClick(barIndex) {
    if (barIndex === 0) return; // join step — can't navigate back there
    const targetStep = barIndex - 1;
    if (targetStep >= step) return;
    setStep(targetStep);
  }

  function canAdvance() {
    if (currentStep === 'travel_location') return !!travelMode && !!location && !locationError && !travelModeError;
    if (currentStep === 'review') return !submitting;
    return true;
  }

  function renderStepContent() {
    switch (currentStep) {
      case 'travel_location':
        return (
          <>
            <h2>{t('participate.location.heading')}</h2>
            <p className="rw-step-hint">{t('participate.location.why')}</p>
            <TravelModeSelector value={travelMode} onChange={saveTravelMode} />
            <fieldset className="wizard-fieldset" ref={locationFieldsetRef}>
              <legend>{t('participate.location.legend')}</legend>
              <AddressSearchInput onSelect={saveLocation} />
              {location && (
                <p className="rw-selected-address" data-testid="selected-address">{location.label}</p>
              )}
              {locationError && <p className="wizard-error" role="alert">{locationError}</p>}
            </fieldset>
            {travelModeError && <p className="wizard-error" role="alert">{travelModeError}</p>}
          </>
        );

      case 'dates':
        return (
          <>
            <h2>{t('participate.dates.heading')}</h2>
            <div className="rw-legend">
              <span className="rw-legend-chip rw-legend-yes">{t('participate.dates.legendYes')}</span>
              <span className="rw-legend-chip rw-legend-maybe">{t('participate.dates.legendMaybe')}</span>
              <span className="rw-legend-chip rw-legend-no">{t('participate.dates.legendNo')}</span>
              <span className="rw-legend-hint">{t('participate.dates.legendHint')}</span>
            </div>
            <AvailabilityGrid
              participantId={participantId}
              slots={slots}
              initialAvailability={initialAvailability}
              eventTimezone={eventTimezone}
              locked={false}
              onAvailabilityChange={next => { setAvailabilityStateMap(next); setHasMadeChanges(true); }}
            />
          </>
        );

      case 'review': {
        const availCounts = Object.values(availabilityStateMap).reduce(
          (acc, s) => { if (s !== 'neutral') acc[s] = (acc[s] ?? 0) + 1; return acc; },
          { yes: 0, maybe: 0, no: 0 }
        );
        return (
          <>
            <h2>{t('participate.review.heading')}</h2>
            <div className="review-ticket">
              {initialName?.trim() && (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">{t('participate.review.labelName')}</span>
                  <span className="review-ticket-value">{initialName.trim()}</span>
                </div>
              )}
              {travelMode && (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">{t('participate.review.labelTravel')}</span>
                  <span className="review-ticket-value">{t(`travelMode.${travelMode}.label`, { defaultValue: travelMode })}</span>
                </div>
              )}
              {location?.label && (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">{t('participate.review.labelFrom')}</span>
                  <span className="review-ticket-value">{location.label}</span>
                </div>
              )}
              <div className="review-ticket-row">
                <span className="review-ticket-label">{t('participate.review.labelAvailability')}</span>
                <span className="review-ticket-value" data-testid="review-availability-summary">
                  {availCounts.yes} {t('participate.dates.legendYes')} · {availCounts.maybe} {t('participate.dates.legendMaybe')} · {availCounts.no} {t('participate.dates.legendNo')}
                </span>
              </div>
            </div>
            <div className="rw-next-steps">
              <p className="rw-next-steps-heading">{t('participate.review.nextHeading')}</p>
              <ol className="rw-next-steps-list">
                <li>{t('participate.review.next1')}</li>
                <li>{t('participate.review.next2')}</li>
                <li>{t('participate.review.next3')}</li>
              </ol>
            </div>
            {submitError && <p className="wizard-error" role="alert">{submitError}</p>}
          </>
        );
      }

      default:
        return null;
    }
  }

  return (
    <>
    {showDialog && <UnsavedChangesDialog onStay={cancelLeave} onLeave={confirmLeave} />}
    <form className="wizard" onSubmit={handleNext} aria-label="Participation">
      <header className="wizard-header">
        <a href="/" className="wizard-wordmark">{t('wizard.wordmark')}</a>
        <StepRoute
          stepLabels={ALL_STEP_LABELS}
          current={step + 1}
          onStepClick={handleBarStepClick}
        />
      </header>

      <div className="wizard-body">
        <p style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
          Step {step + 2} of {STEPS.length + 1}
        </p>
        {eventName && (
          <div className="rw-event-context">
            <span className="rw-event-context-name">{eventName}</span>
            <DeadlineBadge deadline={eventDeadline} locked={eventLocked} />
          </div>
        )}
        <div key={step} className="rw-step-animate">
          {renderStepContent()}
        </div>
      </div>

      <footer className="wizard-footer rw-footer">
        {!isUpdate && (
          <div className="rw-footer-legal">
            <p className="rw-consent">
              {t('wizard.consentPrefix')}{' '}
              <a href="/terms" target="_blank" rel="noreferrer">{t('wizard.tos')}</a>
              {' '}{t('wizard.and')}{' '}
              <a href="/privacy" target="_blank" rel="noreferrer">{t('wizard.privacyPolicy')}</a>.
            </p>
          </div>
        )}
        <div className="rw-footer-actions">
          {step > 0 && (
            <button className="btn btn-ghost" type="button" onClick={handleBack}>{t('wizard.btn.back')}</button>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!canAdvance() || submitting}
            data-testid={isLastStep ? 'submit-btn' : 'wizard-next-btn'}
          >
            {isLastStep ? (submitting ? t('wizard.btn.submitting') : t('wizard.btn.submit')) : t('wizard.btn.continue')}
          </button>
        </div>
      </footer>
    </form>
    </>
  );
}
