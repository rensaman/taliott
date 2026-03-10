import React, { useState } from 'react';

const PART_OF_DAY_OPTIONS = ['all', 'morning', 'afternoon', 'evening'];

function getSteps(inviteMode) {
  const steps = [
    'name',
    'organizer_email',
    'date_range',
    'part_of_day',
    'deadline',
    'venue_type',
    'invite_mode',
  ];
  if (inviteMode === 'email_invites') {
    steps.push('participant_emails');
  }
  steps.push('review');
  return steps;
}

export default function EventSetupForm({ onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    organizerEmail: '',
    dateRange: { start: '', end: '' },
    partOfDay: 'all',
    deadline: '',
    venueType: '',
    inviteMode: 'email_invites',
    participantEmails: '',
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const steps = getSteps(formData.inviteMode);
  const currentStep = steps[step];
  const totalSteps = steps.length;

  function update(key, value) {
    setFormData(d => ({ ...d, [key]: value }));
  }

  function canAdvance() {
    switch (currentStep) {
      case 'name': return formData.name.trim().length > 0;
      case 'organizer_email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.organizerEmail);
      case 'date_range':
        return formData.dateRange.start && formData.dateRange.end &&
          formData.dateRange.end >= formData.dateRange.start;
      case 'deadline': return formData.deadline.length > 0;
      case 'review': return !submitting;
      default: return true;
    }
  }

  function handleNext(e) {
    e?.preventDefault();
    if (!canAdvance()) return;
    if (currentStep === 'review') {
      handleSubmit();
    } else {
      setStep(s => s + 1);
    }
  }

  function handleBack() {
    setStep(s => s - 1);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          organizer_email: formData.organizerEmail,
          invite_mode: formData.inviteMode,
          participant_emails: formData.inviteMode === 'email_invites'
            ? formData.participantEmails.split('\n').map(s => s.trim()).filter(Boolean)
            : [],
          date_range_start: formData.dateRange.start,
          date_range_end: formData.dateRange.end,
          part_of_day: formData.partOfDay,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          venue_type: formData.venueType || undefined,
          deadline: formData.deadline,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create event');
      }
      const result = await res.json();
      onCreated?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderStepContent() {
    switch (currentStep) {
      case 'name':
        return (
          <>
            <h2>What&apos;s the event called?</h2>
            <input
              type="text"
              aria-label="Event name"
              value={formData.name}
              onChange={e => update('name', e.target.value)}
              autoFocus
              placeholder="e.g. Summer meetup"
            />
          </>
        );

      case 'organizer_email':
        return (
          <>
            <h2>What&apos;s your email?</h2>
            <label>
              Your email
              <input
                type="email"
                value={formData.organizerEmail}
                onChange={e => update('organizerEmail', e.target.value)}
                autoFocus
                placeholder="you@example.com"
              />
            </label>
          </>
        );

      case 'date_range':
        return (
          <>
            <h2>When could this happen?</h2>
            <label>
              From
              <input
                type="date"
                value={formData.dateRange.start}
                onChange={e => update('dateRange', { ...formData.dateRange, start: e.target.value })}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={formData.dateRange.end}
                min={formData.dateRange.start || undefined}
                onChange={e => update('dateRange', { ...formData.dateRange, end: e.target.value })}
              />
            </label>
          </>
        );

      case 'part_of_day':
        return (
          <>
            <h2>What time of day?</h2>
            {PART_OF_DAY_OPTIONS.map(opt => (
              <label key={opt}>
                <input
                  type="radio"
                  name="part_of_day"
                  value={opt}
                  checked={formData.partOfDay === opt}
                  onChange={() => update('partOfDay', opt)}
                />
                {opt}
              </label>
            ))}
          </>
        );

      case 'deadline':
        return (
          <>
            <h2>When&apos;s the voting deadline?</h2>
            <label>
              Voting deadline
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={e => update('deadline', e.target.value)}
                autoFocus
              />
            </label>
          </>
        );

      case 'venue_type':
        return (
          <>
            <h2>What kind of venue?</h2>
            <p>Optional — leave blank to skip</p>
            <label>
              Venue type
              <input
                type="text"
                value={formData.venueType}
                onChange={e => update('venueType', e.target.value)}
                autoFocus
                placeholder="e.g. bar, restaurant"
              />
            </label>
          </>
        );

      case 'invite_mode':
        return (
          <>
            <h2>How do you want to invite people?</h2>
            <label>
              <input
                type="radio"
                name="invite_mode"
                value="email_invites"
                checked={formData.inviteMode === 'email_invites'}
                onChange={() => update('inviteMode', 'email_invites')}
              />
              Send email invites
            </label>
            <label>
              <input
                type="radio"
                name="invite_mode"
                value="shared_link"
                checked={formData.inviteMode === 'shared_link'}
                onChange={() => update('inviteMode', 'shared_link')}
              />
              Share a join link
            </label>
          </>
        );

      case 'participant_emails':
        return (
          <>
            <h2>Who&apos;s invited?</h2>
            <label>
              Participant emails
              <small> (one per line)</small>
              <textarea
                value={formData.participantEmails}
                onChange={e => update('participantEmails', e.target.value)}
                autoFocus
                placeholder={'jamie@example.com\nsam@example.com'}
              />
            </label>
          </>
        );

      case 'review':
        return (
          <>
            <h2>Ready to create your event?</h2>
            <dl>
              <dt>Name</dt>
              <dd>{formData.name}</dd>
              <dt>Organizer</dt>
              <dd>{formData.organizerEmail}</dd>
              <dt>Dates</dt>
              <dd>{formData.dateRange.start} – {formData.dateRange.end}</dd>
              <dt>Time of day</dt>
              <dd>{formData.partOfDay}</dd>
              <dt>Deadline</dt>
              <dd>{formData.deadline}</dd>
              {formData.venueType && (
                <>
                  <dt>Venue</dt>
                  <dd>{formData.venueType}</dd>
                </>
              )}
              <dt>Invite mode</dt>
              <dd>{formData.inviteMode === 'email_invites' ? 'Email invites' : 'Shared link'}</dd>
            </dl>
          </>
        );

      default:
        return null;
    }
  }

  const isLastStep = currentStep === 'review';

  return (
    <form onSubmit={handleNext} aria-label="Event setup">
      <p>Step {step + 1} of {totalSteps}</p>

      {renderStepContent()}

      {error && <p role="alert">{error}</p>}

      <div>
        {step > 0 && (
          <button type="button" onClick={handleBack}>← Back</button>
        )}
        <button type="submit" disabled={!canAdvance() || submitting}>
          {isLastStep
            ? (submitting ? 'Creating…' : 'Create Event')
            : 'Continue →'}
        </button>
      </div>
    </form>
  );
}
