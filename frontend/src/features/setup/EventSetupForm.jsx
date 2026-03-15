import React, { useState } from 'react';
import TimeRangeSelector from './PartOfDaySelector.jsx';

const STEPS = ['name', 'organizer_email', 'date_and_time', 'deadline', 'invite_mode', 'review'];

function minutesToHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function EventSetupForm({ onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    organizerEmail: '',
    isDateTimeFixed: false,
    fixedDate: '',
    fixedTime: '',
    dateRange: { start: '', end: '' },
    timeRangeStart: 480,
    timeRangeEnd: 1320,
    deadline: '',
    inviteMode: 'shared_link',
    participantEmails: '',
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;

  function update(key, value) {
    setFormData(d => ({ ...d, [key]: value }));
  }

  function canAdvance() {
    switch (currentStep) {
      case 'name': return formData.name.trim().length > 0;
      case 'organizer_email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.organizerEmail);
      case 'date_and_time':
        if (formData.isDateTimeFixed) {
          return formData.fixedDate.length > 0 && formData.fixedTime.length > 0;
        }
        return !!(formData.dateRange.start && formData.dateRange.end &&
          formData.dateRange.end >= formData.dateRange.start);
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
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let dateRangeStart, dateRangeEnd, timeRangeStart, timeRangeEnd;
    if (formData.isDateTimeFixed) {
      dateRangeStart = formData.fixedDate;
      dateRangeEnd = formData.fixedDate;
      const [hours, mins] = formData.fixedTime.split(':').map(Number);
      timeRangeStart = hours * 60 + mins;
      timeRangeEnd = timeRangeStart + 30;
    } else {
      dateRangeStart = formData.dateRange.start;
      dateRangeEnd = formData.dateRange.end;
      timeRangeStart = formData.timeRangeStart;
      timeRangeEnd = formData.timeRangeEnd;
    }

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
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
          time_range_start: timeRangeStart,
          time_range_end: timeRangeEnd,
          timezone,
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

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

      case 'date_and_time':
        return (
          <>
            <h2>When is it happening?</h2>
            <label>
              <input
                type="radio"
                name="dt_pref"
                value="flexible"
                checked={!formData.isDateTimeFixed}
                onChange={() => update('isDateTimeFixed', false)}
              />
              We need to find a time that works
            </label>
            <label>
              <input
                type="radio"
                name="dt_pref"
                value="fixed"
                checked={formData.isDateTimeFixed}
                onChange={() => update('isDateTimeFixed', true)}
              />
              The date and time are already set
            </label>

            {formData.isDateTimeFixed ? (
              <>
                <label>
                  Date
                  <input
                    type="date"
                    value={formData.fixedDate}
                    onChange={e => update('fixedDate', e.target.value)}
                  />
                </label>
                <label>
                  Start time ({timezone})
                  <input
                    type="time"
                    value={formData.fixedTime}
                    onChange={e => update('fixedTime', e.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <fieldset>
                  <legend>Date range</legend>
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
                </fieldset>
                <fieldset>
                  <legend>Start time ({timezone})</legend>
                  <TimeRangeSelector
                    startValue={formData.timeRangeStart}
                    endValue={formData.timeRangeEnd}
                    onStartChange={v => update('timeRangeStart', v)}
                    onEndChange={v => update('timeRangeEnd', v)}
                  />
                </fieldset>
              </>
            )}
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

      case 'invite_mode':
        return (
          <>
            <h2>How do you want to invite people?</h2>
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
            {formData.inviteMode === 'email_invites' && (
              <label>
                Participant emails
                <small> (one per line)</small>
                <textarea
                  value={formData.participantEmails}
                  onChange={e => update('participantEmails', e.target.value)}
                  placeholder={'jamie@example.com\nsam@example.com'}
                />
              </label>
            )}
          </>
        );

      case 'review': {
        const emails = formData.inviteMode === 'email_invites'
          ? formData.participantEmails.split('\n').map(s => s.trim()).filter(Boolean)
          : [];
        return (
          <>
            <h2>Ready to create your event?</h2>
            <dl>
              <dt>Name</dt>
              <dd>{formData.name}</dd>
              <dt>Organizer</dt>
              <dd>{formData.organizerEmail}</dd>
              {formData.isDateTimeFixed ? (
                <>
                  <dt>Date &amp; time</dt>
                  <dd>{formData.fixedDate} at {formData.fixedTime} ({timezone})</dd>
                </>
              ) : (
                <>
                  <dt>Dates</dt>
                  <dd>{formData.dateRange.start} – {formData.dateRange.end}</dd>
                  <dt>Start time</dt>
                  <dd>{minutesToHHMM(formData.timeRangeStart)} – {minutesToHHMM(formData.timeRangeEnd)} ({timezone})</dd>
                </>
              )}
              <dt>Deadline</dt>
              <dd>{formData.deadline}</dd>
              <dt>Invite mode</dt>
              <dd>{formData.inviteMode === 'email_invites' ? 'Email invites' : 'Shared link'}</dd>
              {emails.length > 0 && (
                <>
                  <dt>Invitees</dt>
                  <dd>
                    <ul>
                      {emails.map(email => <li key={email}>{email}</li>)}
                    </ul>
                  </dd>
                </>
              )}
            </dl>
            <p>
              By creating this event you confirm that any participant emails you have provided were
              collected with their knowledge. Emails are used solely to send event invitations and
              notifications. See our{' '}
              <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
            </p>
          </>
        );
      }

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
