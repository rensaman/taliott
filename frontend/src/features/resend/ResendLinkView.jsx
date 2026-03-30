import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LegalFooter from '../legal/LegalFooter.jsx';
import '../setup/EventSetupForm.css';
import '../join/JoinView.css';

export default function ResendLinkView() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/resend-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 429) {
        setError(t('resend.errorRateLimit'));
      } else {
        setError(t('resend.errorGeneric'));
      }
    } catch {
      setError(t('resend.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleTryAgain() {
    setSubmitted(false);
    setEmail('');
    setError(null);
  }

  return (
    <main className="join-shell">
      <header className="join-header">
        <a href="/" className="wizard-wordmark">{t('wizard.wordmark')}</a>
      </header>

      <div className="join-body">
        <h1 className="join-event-name">{t('resend.heading')}</h1>
        {submitted ? (
          <>
            <p role="status" data-testid="resend-status">{t('resend.successMsg')}</p>
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="resend-try-again-btn"
              onClick={handleTryAgain}
            >
              {t('resend.tryAgain')}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} aria-label="Resend link form">
            <div className="field">
              <label htmlFor="resend-email" className="field-label">{t('resend.emailLabel')}</label>
              <input
                id="resend-email"
                className="wizard-input"
                type="email"
                data-testid="resend-email-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('resend.emailPlaceholder')}
                required
                autoFocus
              />
            </div>
            {error && <p role="alert" data-testid="resend-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting} data-testid="resend-submit-btn">
              {submitting ? t('resend.sending') : t('resend.submit')}
            </button>
          </form>
        )}
      </div>

      <footer className="join-footer">
        <LegalFooter />
      </footer>
    </main>
  );
}
