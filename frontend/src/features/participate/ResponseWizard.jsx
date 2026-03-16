import { useState, useRef } from 'react';
import AvailabilityGrid from './AvailabilityGrid.jsx';
import AddressSearchInput from './AddressSearchInput.jsx';
import TravelModeSelector, { TRAVEL_MODE_LABELS } from './TravelModeSelector.jsx';
import StepRoute from '../setup/StepRoute.jsx';
import '../setup/EventSetupForm.css';
import './ResponseWizard.css';

const STEPS = ['name', 'travel_location', 'dates', 'review'];
const STEP_LABELS = ['Name', 'Location', 'Dates', 'Review'];

export default function ResponseWizard({
  participantId,
  initialName,
  initialStep = 0,
  slots,
  initialAvailability,
  initialLocation,
  initialTravelMode = 'transit',
  onComplete,
}) {
  const [step, setStep] = useState(initialStep);
  const [nameValue, setNameValue] = useState(initialName ?? '');
  const [location, setLocation] = useState(initialLocation ?? null);
  const locationFieldsetRef = useRef(null);
  const [travelMode, setTravelMode] = useState(initialTravelMode);
  const [nameError, setNameError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  async function saveName() {
    const trimmed = nameValue.trim();
    if (trimmed === (initialName ?? '').trim()) return true;
    try {
      const res = await fetch(`/api/participate/${participantId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function saveLocation(loc) {
    setLocation(loc);
    try {
      const res = await fetch(`/api/participate/${participantId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng, address_label: loc.label ?? null }),
      });
      if (!res.ok) setLocationError('Failed to save location. Please try again.');
      else setLocationError(null);
    } catch {
      setLocationError('Failed to save location. Please try again.');
    }
  }

  async function saveTravelMode(mode) {
    setTravelMode(mode);
    locationFieldsetRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    try {
      await fetch(`/api/participate/${participantId}/travel-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travel_mode: mode }),
      });
    } catch {
      // Non-critical — centroid will fall back gracefully
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/participate/${participantId}/confirm`, { method: 'PATCH' });
      if (!res.ok) {
        setSubmitError('Failed to submit. Please try again.');
        return;
      }
      onComplete();
    } catch {
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext(e) {
    e?.preventDefault();
    if (currentStep === 'name') {
      const ok = await saveName();
      if (!ok) {
        setNameError('Failed to save name. Please try again.');
        return;
      }
      setNameError(null);
    }
    if (isLastStep) {
      await handleSubmit();
    } else {
      setStep(s => s + 1);
    }
  }

  function handleBack() {
    setStep(s => s - 1);
  }

  function canAdvance() {
    if (currentStep === 'travel_location') return !!location;
    if (currentStep === 'review') return !submitting;
    return true;
  }

  function renderStepContent() {
    switch (currentStep) {
      case 'name':
        return (
          <>
            <h2>What&apos;s your name?</h2>
            <div className="field">
              <label htmlFor="participant-name" className="field-label">Your name</label>
              <input
                id="participant-name"
                className="wizard-input"
                type="text"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                autoFocus
                placeholder="e.g. Alex"
                data-testid="name-input"
              />
            </div>
            {nameError && <p className="wizard-error" role="alert">{nameError}</p>}
          </>
        );

      case 'travel_location':
        return (
          <>
            <h2>Where are you coming from?</h2>
            <TravelModeSelector value={travelMode} onChange={saveTravelMode} />
            <fieldset className="wizard-fieldset" ref={locationFieldsetRef}>
              <legend>Your starting location</legend>
              <AddressSearchInput onSelect={saveLocation} />
              {location && (
                <p className="rw-selected-address" data-testid="selected-address">{location.label}</p>
              )}
              {locationError && <p className="wizard-error" role="alert">{locationError}</p>}
            </fieldset>
          </>
        );

      case 'dates':
        return (
          <>
            <h2>When can you make it?</h2>
            <div className="rw-legend">
              <span className="rw-legend-chip rw-legend-yes">Yes</span>
              <span className="rw-legend-chip rw-legend-maybe">Maybe</span>
              <span className="rw-legend-chip rw-legend-no">No</span>
              <span className="rw-legend-hint">Tap to toggle</span>
            </div>
            <AvailabilityGrid
              participantId={participantId}
              slots={slots}
              initialAvailability={initialAvailability}
              locked={false}
            />
          </>
        );

      case 'review':
        return (
          <>
            <h2>Ready to submit?</h2>
            <div className="review-ticket">
              {nameValue.trim() && (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">Name</span>
                  <span className="review-ticket-value">{nameValue.trim()}</span>
                </div>
              )}
              <div className="review-ticket-row">
                <span className="review-ticket-label">Travel</span>
                <span className="review-ticket-value">{TRAVEL_MODE_LABELS[travelMode] ?? travelMode}</span>
              </div>
              {location?.label && (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">From</span>
                  <span className="review-ticket-value">{location.label}</span>
                </div>
              )}
            </div>
            {submitError && <p className="wizard-error" role="alert">{submitError}</p>}
          </>
        );

      default:
        return null;
    }
  }

  return (
    <form className="wizard" onSubmit={handleNext} aria-label="Participation">
      <header className="wizard-header">
        <h1 className="wizard-wordmark">Taliott</h1>
        <StepRoute stepLabels={STEP_LABELS} current={step} />
      </header>

      <div className="wizard-body">
        <p style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
          Step {step + 1} of {STEPS.length}
        </p>
        {renderStepContent()}
      </div>

      <footer className="wizard-footer rw-footer">
        <div className="rw-footer-legal">
          <p className="rw-consent">
            By continuing you agree to our{' '}
            <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
          </p>
        </div>
        <div className="rw-footer-actions">
          {step > 0 && (
            <button className="btn btn-ghost" type="button" onClick={handleBack}>← Back</button>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!canAdvance() || submitting}
            data-testid={isLastStep ? 'submit-btn' : undefined}
          >
            {isLastStep ? (submitting ? 'Submitting…' : 'Submit →') : 'Continue →'}
          </button>
        </div>
      </footer>
    </form>
  );
}
