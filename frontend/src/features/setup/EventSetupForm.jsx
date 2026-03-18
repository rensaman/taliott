import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    organizerEmail: '',
    isDateTimeFixed: false,
    fixedDate: '',
    fixedTime: '',
    dateRange: { start: '', end: '' },
    timeRangeStart: 480,
    timeRangeEnd: 540,
    deadlineDate: '',
    deadlineTime: '',
    inviteMode: 'shared_link',
    participantEmails: '',
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timeRangeRef = useRef(null);

  // Scroll to time range selector once the date range is fully defined
  useEffect(() => {
    if (formData.dateRange.start && formData.dateRange.end && timeRangeRef.current?.scrollIntoView) {
      timeRangeRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [formData.dateRange.start, formData.dateRange.end]);

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
      case 'deadline': return formData.deadlineDate.length > 0 && formData.deadlineTime.length > 0;
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
      timeRangeEnd = timeRangeStart;
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
          lang: i18next.language ?? 'en',
          invite_mode: formData.inviteMode,
          participant_emails: formData.inviteMode === 'email_invites'
            ? formData.participantEmails.split('\n').map(s => s.trim()).filter(Boolean)
            : [],
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
          time_range_start: timeRangeStart,
          time_range_end: timeRangeEnd,
          timezone,
          deadline: `${formData.deadlineDate}T${formData.deadlineTime}`,
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
            <h2>{t('setup.name.heading')}</h2>
            <div className="field">
              <label htmlFor="event-name" className="field-label">{t('setup.name.label')}</label>
              <input
                id="event-name"
                className="wizard-input"
                type="text"
                data-testid="event-name-input"
                aria-label={t('setup.name.label')}
                value={formData.name}
                onChange={e => update('name', e.target.value)}
                autoFocus
                placeholder={t('setup.name.placeholder')}
              />
            </div>
          </>
        );

      case 'organizer_email':
        return (
          <>
            <h2>{t('setup.email.heading')}</h2>
            <div className="field">
              <label htmlFor="organizer-email" className="field-label">{t('setup.email.label')}</label>
              <input
                id="organizer-email"
                className="wizard-input"
                type="email"
                data-testid="organizer-email-input"
                aria-label={t('setup.email.label')}
                value={formData.organizerEmail}
                onChange={e => update('organizerEmail', e.target.value)}
                autoFocus
                placeholder={t('setup.email.placeholder')}
              />
            </div>
          </>
        );

      case 'date_and_time':
        return (
          <>
            <h2>{t('setup.dateTime.heading')}</h2>
            <div className="toggle-group">
              <ToggleBlock
                name="dt_pref"
                value="flexible"
                checked={!formData.isDateTimeFixed}
                onChange={() => update('isDateTimeFixed', false)}
                title={t('setup.dateTime.flexible.title')}
                description={t('setup.dateTime.flexible.description')}
                data-testid="toggle-dt-flexible"
              />
              <ToggleBlock
                name="dt_pref"
                value="fixed"
                checked={formData.isDateTimeFixed}
                onChange={() => update('isDateTimeFixed', true)}
                title={t('setup.dateTime.fixed.title')}
                description={t('setup.dateTime.fixed.description')}
                data-testid="toggle-dt-fixed"
              />
            </div>

            {formData.isDateTimeFixed ? (
              <>
                <fieldset className="wizard-fieldset">
                  <legend>{t('setup.dateTime.dateLabel')}</legend>
                  <DateRangePicker
                    singleDate
                    value={formData.fixedDate}
                    onChange={v => update('fixedDate', v)}
                  />
                </fieldset>
                <div className="field">
                  <label htmlFor="fixed-time" className="field-label">{t('setup.dateTime.startTimeLabel', { timezone })}</label>
                  <input
                    id="fixed-time"
                    type="time"
                    className="wizard-input"
                    aria-label="Start time"
                    value={formData.fixedTime}
                    onChange={e => update('fixedTime', e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <fieldset className="wizard-fieldset">
                  <legend>{t('setup.dateTime.dateRange')}</legend>
                  <DateRangePicker
                    value={formData.dateRange}
                    onChange={v => update('dateRange', v)}
                  />
                </fieldset>
                <fieldset className="wizard-fieldset" ref={timeRangeRef}>
                  <legend>{t('setup.dateTime.startTimeWindow', { timezone })}</legend>
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
            <h2>{t('setup.deadline.heading')}</h2>
            <fieldset className="wizard-fieldset">
              <legend>{t('setup.deadline.dateLabel')}</legend>
              <DateRangePicker
                singleDate
                value={formData.deadlineDate}
                onChange={v => update('deadlineDate', v)}
              />
            </fieldset>
            <div className="field">
              <label htmlFor="deadline-time" className="field-label">{t('setup.deadline.timeLabel', { timezone })}</label>
              <input
                id="deadline-time"
                type="time"
                className="wizard-input"
                aria-label="Deadline time"
                value={formData.deadlineTime}
                onChange={e => update('deadlineTime', e.target.value)}
              />
            </div>
          </>
        );

      case 'invite_mode':
        return (
          <>
            <h2>{t('setup.inviteMode.heading')}</h2>
            <div className="toggle-group">
              <ToggleBlock
                name="invite_mode"
                value="shared_link"
                checked={formData.inviteMode === 'shared_link'}
                onChange={() => update('inviteMode', 'shared_link')}
                title={t('setup.inviteMode.sharedLink.title')}
                description={t('setup.inviteMode.sharedLink.description')}
                data-testid="toggle-invite-link"
              />
              <ToggleBlock
                name="invite_mode"
                value="email_invites"
                checked={formData.inviteMode === 'email_invites'}
                onChange={() => update('inviteMode', 'email_invites')}
                title={t('setup.inviteMode.email.title')}
                description={t('setup.inviteMode.email.description')}
                data-testid="toggle-invite-email"
              />
            </div>
            {formData.inviteMode === 'email_invites' && (
              <div className="field">
                <label htmlFor="participant-emails" className="field-label">
                  {t('setup.inviteMode.emailsLabel')} <span style={{ textTransform: 'none', fontWeight: 400 }}>{t('setup.inviteMode.emailsOnePerLine')}</span>
                </label>
                <textarea
                  id="participant-emails"
                  className="wizard-input"
                  data-testid="participant-emails-input"
                  aria-label={t('setup.inviteMode.emailsLabel')}
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
            <h2>{t('setup.review.heading')}</h2>
            <div className="review-ticket">
              <div className="review-ticket-row">
                <span className="review-ticket-label">{t('setup.review.labelName')}</span>
                <span className="review-ticket-value">{formData.name}</span>
              </div>
              <div className="review-ticket-row">
                <span className="review-ticket-label">{t('setup.review.labelOrg')}</span>
                <span className="review-ticket-value">{formData.organizerEmail}</span>
              </div>
              {formData.isDateTimeFixed ? (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">{t('setup.review.labelWhen')}</span>
                  <span className="review-ticket-value">{formatDate(formData.fixedDate)} {t('setup.review.at')} {formData.fixedTime} ({timezone})</span>
                </div>
              ) : (
                <>
                  <div className="review-ticket-row">
                    <span className="review-ticket-label">{t('setup.review.labelDates')}</span>
                    <span className="review-ticket-value">{formatDate(formData.dateRange.start)} – {formatDate(formData.dateRange.end)}</span>
                  </div>
                  <div className="review-ticket-row">
                    <span className="review-ticket-label">{t('setup.review.labelTime')}</span>
                    <span className="review-ticket-value">{minutesToHHMM(formData.timeRangeStart)} – {minutesToHHMM(formData.timeRangeEnd)} ({timezone})</span>
                  </div>
                </>
              )}
              <div className="review-ticket-row">
                <span className="review-ticket-label">{t('setup.review.labelBy')}</span>
                <span className="review-ticket-value">{formatDate(formData.deadlineDate)} {t('setup.review.at')} {formData.deadlineTime} ({timezone})</span>
              </div>
              <div className="review-ticket-row">
                <span className="review-ticket-label">{t('setup.review.labelVia')}</span>
                <span className="review-ticket-value">{formData.inviteMode === 'email_invites' ? t('setup.review.viaEmail') : t('setup.review.viaLink')}</span>
              </div>
              {emails.length > 0 && (
                <div className="review-ticket-row">
                  <span className="review-ticket-label">{t('setup.review.labelTo')}</span>
                  <span className="review-ticket-value">
                    <ul className="review-ticket-email-list">
                      {emails.map(email => <li key={email}>{email}</li>)}
                    </ul>
                  </span>
                </div>
              )}
            </div>
            <p className="review-privacy">
              {t('setup.review.privacyText')}{' '}
              <a href="/privacy" target="_blank" rel="noreferrer">{t('setup.review.privacyLink')}</a>.
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
        <h1 className="wizard-wordmark">{t('wizard.wordmark')}</h1>
        <StepRoute stepLabels={STEP_LABELS} current={step} />
      </header>

      <div className="wizard-body">
        <p style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>Step {step + 1} of {totalSteps}</p>

        {renderStepContent()}

        {error && <p className="wizard-error" role="alert">{error}</p>}
      </div>

      <footer className="wizard-footer">
        {step > 0 && (
          <button className="btn btn-ghost" type="button" onClick={handleBack} data-testid="wizard-back-btn">{t('wizard.btn.back')}</button>
        )}
        <div className="wizard-footer-right">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!canAdvance() || submitting}
            data-testid={isLastStep ? 'create-event-submit-btn' : 'wizard-next-btn'}
          >
            {isLastStep
              ? (submitting ? t('wizard.btn.creating') : t('wizard.btn.createEvent'))
              : t('wizard.btn.continue')}
          </button>
          {step === 0 && (
            <p className="wizard-consent">
              {t('wizard.consentPrefix')}{' '}
              <a href="/terms" target="_blank" rel="noreferrer">{t('wizard.tos')}</a>
              {' '}{t('wizard.and')}{' '}
              <a href="/privacy" target="_blank" rel="noreferrer">{t('wizard.privacyPolicy')}</a>.
            </p>
          )}
        </div>
      </footer>
    </form>
  );
}
