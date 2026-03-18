import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LegalFooter from '../legal/LegalFooter.jsx';
import '../setup/EventSetupForm.css';
import './JoinView.css';

export default function JoinView({ joinToken }) {
  const { t, i18n } = useTranslation();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    fetch(`/api/join/${joinToken}`)
      .then(async r => {
        const body = await r.json();
        if (!r.ok) {
          setError(r.status === 404 ? 'not_found' : 'error');
        } else if (body.status === 'locked' || body.status === 'finalized') {
          setEvent({ ...body, closed: true });
        } else {
          setEvent(body);
        }
      })
      .catch(() => setError('error'));
  }, [joinToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/join/${joinToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFieldError(body.error ?? t('join.genericError'));
        return;
      }
      window.location.href = `/participate/${body.participant_id}`;
    } catch {
      setFieldError(t('join.networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (error === 'not_found') {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">{t('wizard.wordmark')}</p></header>
        <div className="join-body"><p data-testid="join-invalid-link">{t('join.invalidLink')}</p></div>
      </main>
    );
  }
  if (error) {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">{t('wizard.wordmark')}</p></header>
        <div className="join-body"><p>{t('join.genericError')}</p></div>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">{t('wizard.wordmark')}</p></header>
        <div className="join-body"><p>{t('join.loading')}</p></div>
      </main>
    );
  }
  if (event.closed) {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">{t('wizard.wordmark')}</p></header>
        <div className="join-body">
          <h1 className="join-event-name">{event.name}</h1>
          <p className="join-meta" data-testid="closed-message">{t('join.closed')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="join-shell">
      <header className="join-header">
        <p className="wizard-wordmark">{t('wizard.wordmark')}</p>
      </header>

      <div className="join-body">
        <h1 className="join-event-name">{event.name}</h1>
        <p className="join-meta" data-testid="join-deadline">
          {t('join.deadlineLabel')} {new Date(event.deadline).toLocaleString(i18n.language)}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="join-email" className="field-label">{t('join.emailLabel')}</label>
            <input
              id="join-email"
              className="wizard-input"
              type="email"
              data-testid="join-email-input"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('join.emailPlaceholder')}
              autoFocus
            />
          </div>
          {fieldError && <p className="wizard-error" role="alert">{fieldError}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting} data-testid="join-submit-btn">
            {submitting ? t('join.joining') : t('join.submit')}
          </button>
        </form>
      </div>

      <footer className="join-footer">
        <LegalFooter />
      </footer>
    </main>
  );
}
