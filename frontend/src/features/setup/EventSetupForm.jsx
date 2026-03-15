import React, { useState } from 'react';
import TimeRangeSelector from './PartOfDaySelector.jsx';
import DateRangePicker from './DateRangePicker.jsx';
import StepRoute from './StepRoute.jsx';
import ToggleBlock from './ToggleBlock.jsx';
import './EventSetupForm.css';

const STEPS = ['name', 'organizer_email', 'date_and_time', 'deadline', 'invite_mode', 'review'];
const STEP_LABELS = ['Name', 'Email', 'Dates', 'Deadline', 'Invites', 'Review'];

function minutesToHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
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
            <div className="field">
              <label htmlFor="event-name" className="field-label">Event name</label>
              <input
                id="event-name"
                className="wizard-input"
                type="text"
                aria-label="Event name"
                value={formData.name}
                onChange={e => update('name', e.target.value)}
                autoFocus
                placeholder="e.g. Summer meetup"
              />
            </div>
          </>
        );

      case 'organizer_email':
        return (
          <>
            <h2>What&apos;s your email?</h2>
            <div className="field">
              <label htmlFor="organizer-email" className="field-label">Your email</label>
              <input
                id="organizer-email"
                className="wizard-input"
                type="email"
                aria-label="Your email"
                value={formData.organizerEmail}
                onChange={e => update('organizerEmail', e.target.value)}
                autoFocus
                placeholder="you@example.com"
              />
            </div>
          </>
        );

      case 'date_and_time':
        return (
          <>
            <h2>When is it happening?</h2>
            <div className="toggle-group">
              <ToggleBlock
                name="dt_pref"
                value="flexible"
                checked={!formData.isDateTimeFixed}
                onChange={() => update('isDateTimeFixed', false)}
                title="We need to find a time that works"
                description="Participants vote on their availability"
              />
              <ToggleBlock
                name="dt_pref"
                value="fixed"
                checked={formData.isDateTimeFixed}
                onChange={() => update('isDateTimeFixed', true)}
                title="The date and time are already set"
                description="You just need location and RSVPs"
              />
            </div>

            {formData.isDateTimeFixed ? (
              <>
                <div className="field">
                  <label htmlFor="fixed-date" className="field-label">Date</label>
                  <input
                    id="fixed-date"
                    className="wizard-input"
                    type="date"
                    value={formData.fixedDate}
                    onChange={e => update('fixedDate', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="fixed-time" className="field-label">Start time ({timezone})</label>
                  <input
                    id="fixed-time"
                    className="wizard-input"
                    type="time"
                    aria-label="Start time"
                    value={formData.fixedTime}
                    onChange={e => update('fixedTime', e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <fieldset className="wizard-fieldset">
                  <legend>Date range</legend>
                  <DateRangePicker
                    value={formData.dateRange}
                    onChange={v => update('dateRange', v)}
                  />
                </fieldset>
                <fieldset className="wizard-fieldset">
                  <legend>Start time window ({timezone})</legend>
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
            <div className="field">
              <label htmlFor="deadline" className="field-label">Voting deadline</label>
              <input
                id="deadline"
                className="wizard-input"
                type="datetime-local"
                aria-label="Voting deadline"
                value={formData.deadline}
                onChange={e => update('deadline', e.target.value)}
                autoFocus
              />
            </div>
          </>
        );

      case 'invite_mode':
        return (
          <>
            <h2>How do you want to invite people?</h2>
            <div className="toggle-group">
              <ToggleBlock
                name="invite_mode"
                value="shared_link"
                checked={formData.inviteMode === 'shared_link'}
                onChange={() => update('inviteMode', 'shared_link')}
                title="Share a join link"
                description="Anyone with the link can join and vote"
              />
              <ToggleBlock
                name="invite_mode"
                value="email_invites"
                checked={formData.inviteMode === 'email_invites'}
                onChange={() => update('inviteMode', 'email_invites')}
                title="Send email invites"
                description="Invitations go directly to each person"
              />
            </div>
            {formData.inviteMode === 'email_invites' && (
              <div className="field">
                <label htmlFor="participant-emails" className="field-label">
                  Participant emails <span style={{ textTransform: 'none', fontWeight: 400 }}>(one per line)</span>
                </label>
                <textarea
                  id="participant-emails"
                  className="wizard-input"
                  aria-label="Participant emails"
                  value={formData.participantEmails}
                  onChange={e => update('participantEmails', e.target.value)}
                  placeholder={'jamie@example.com\nsam@example.com'}
                />
              </div>
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
            <div className="review-ticket">
              <div className="review-ticket-row">
                <span className="review-ticket-label">Name</span>
                <span className="review-ticket-value">{formData.name}</span>
              </div>
              <div className="review-ticket-row">
                <span className="review-ticket-label">Org.</span>
                <span className="review-ticket-value">{formData.organizerEmail}</span>
              </div>
              {formData.isDateTimeFixed ? (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">When</span>
                  <span className="review-ticket-value">{formatDate(formData.fixedDate)} at {formData.fixedTime} ({timezone})</span>
                </div>
              ) : (
                <>
                  <div className="review-ticket-row">
                    <span className="review-ticket-label">Dates</span>
                    <span className="review-ticket-value">{formatDate(formData.dateRange.start)} – {formatDate(formData.dateRange.end)}</span>
                  </div>
                  <div className="review-ticket-row">
                    <span className="review-ticket-label">Time</span>
                    <span className="review-ticket-value">{minutesToHHMM(formData.timeRangeStart)} – {minutesToHHMM(formData.timeRangeEnd)} ({timezone})</span>
                  </div>
                </>
              )}
              <div className="review-ticket-row">
                <span className="review-ticket-label">By</span>
                <span className="review-ticket-value">{formData.deadline}</span>
              </div>
              <div className="review-ticket-row">
                <span className="review-ticket-label">Via</span>
                <span className="review-ticket-value">{formData.inviteMode === 'email_invites' ? 'Email invites' : 'Shared link'}</span>
              </div>
              {emails.length > 0 && (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">To</span>
                  <span className="review-ticket-value">
                    <ul className="review-ticket-email-list">
                      {emails.map(email => <li key={email}>{email}</li>)}
                    </ul>
                  </span>
                </div>
              )}
            </div>
            <p className="review-privacy">
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
    <form className="wizard" onSubmit={handleNext} aria-label="Event setup">
      <header className="wizard-header">
        <p className="wizard-wordmark">Taliott</p>
        <StepRoute stepLabels={STEP_LABELS} current={step} />
      </header>

      <div className="wizard-body">
        <p style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>Step {step + 1} of {totalSteps}</p>

        {renderStepContent()}

        {error && <p className="wizard-error" role="alert">{error}</p>}
      </div>

      <footer className="wizard-footer">
        {step > 0 && (
          <button className="btn btn-ghost" type="button" onClick={handleBack}>← Back</button>
        )}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!canAdvance() || submitting}
        >
          {isLastStep
            ? (submitting ? 'Creating…' : 'Create Event')
            : 'Continue →'}
        </button>
      </footer>
    </form>
  );
}
