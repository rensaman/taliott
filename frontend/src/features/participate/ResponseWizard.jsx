import { useState } from 'react';
import AvailabilityGrid from './AvailabilityGrid.jsx';
import AddressSearchInput from './AddressSearchInput.jsx';

export default function ResponseWizard({
  participantId,
  initialName,
  initialStep = 1,
  slots,
  initialAvailability,
  initialLocation,
  onComplete,
}) {
  const [step, setStep] = useState(initialStep);
  const [nameValue, setNameValue] = useState(initialName ?? '');
  const [location, setLocation] = useState(initialLocation ?? null);
  const [nameError, setNameError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

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

  async function navigateTo(targetStep) {
    if (step === 1) {
      const ok = await saveName();
      if (!ok) {
        setNameError('Failed to save name. Please try again.');
        return;
      }
      setNameError(null);
    }
    setStep(targetStep);
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

  async function handleSubmit() {
    setSubmitError(null);
    try {
      const res = await fetch(`/api/participate/${participantId}/confirm`, { method: 'PATCH' });
      if (!res.ok) {
        setSubmitError('Failed to submit. Please try again.');
        return;
      }
      onComplete();
    } catch {
      setSubmitError('Failed to submit. Please try again.');
    }
  }

  return (
    <div>
      {step === 1 && (
        <section aria-label="Your name">
          <label htmlFor="participant-name">Your name</label>
          <input
            id="participant-name"
            type="text"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            data-testid="name-input"
          />
          {nameError && <p role="alert">{nameError}</p>}
          <button onClick={() => navigateTo(2)}>Next</button>
        </section>
      )}

      {step === 2 && (
        <section aria-label="Your availability">
          <AvailabilityGrid
            participantId={participantId}
            slots={slots}
            initialAvailability={initialAvailability}
            locked={false}
          />
          <button onClick={() => navigateTo(1)}>Back</button>
          <button onClick={() => navigateTo(3)}>Next</button>
        </section>
      )}

      {step === 3 && (
        <section aria-label="Your location">
          <AddressSearchInput onSelect={saveLocation} />
          {location && <p data-testid="selected-address">{location.label}</p>}
          {locationError && <p role="alert">{locationError}</p>}
          <button onClick={() => navigateTo(2)}>Back</button>
          <button onClick={handleSubmit} data-testid="submit-btn">Submit</button>
          {submitError && <p role="alert">{submitError}</p>}
        </section>
      )}
    </div>
  );
}
