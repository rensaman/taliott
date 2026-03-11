import { useState } from 'react';
import AvailabilityGrid from './AvailabilityGrid.jsx';
import AddressSearchInput from './AddressSearchInput.jsx';

const STEPS = [
  { number: 1, label: 'Name' },
  { number: 2, label: 'Availability' },
  { number: 3, label: 'Location' },
];

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
  const [submitError, setSubmitError] = useState(null);

  async function saveName() {
    const trimmed = nameValue.trim();
    if (trimmed === (initialName ?? '').trim()) return;
    await fetch(`/api/participate/${participantId}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => {});
  }

  async function navigateTo(targetStep) {
    if (step === 1) await saveName();
    setStep(targetStep);
  }

  async function saveLocation(loc) {
    setLocation(loc);
    await fetch(`/api/participate/${participantId}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng, address_label: loc.label ?? null }),
    }).catch(() => {});
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (step === 1) await saveName();
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
      <nav aria-label="Response steps">
        {STEPS.map(s => (
          <button
            key={s.number}
            onClick={() => navigateTo(s.number)}
            aria-current={step === s.number ? 'step' : undefined}
            data-testid={`step-nav-${s.number}`}
          >
            {s.number}. {s.label}
          </button>
        ))}
      </nav>

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
          <button onClick={() => navigateTo(2)}>Back</button>
          <button onClick={handleSubmit} data-testid="submit-btn">Submit</button>
          {submitError && <p role="alert">{submitError}</p>}
        </section>
      )}
    </div>
  );
}
