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

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/resend-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <main className="join-shell">
      <header className="join-header">
        <p className="wizard-wordmark">{t('wizard.wordmark')}</p>
      </header>

      <div className="join-body">
        <h1 className="join-event-name">{t('resend.heading')}</h1>
        {submitted ? (
          <p role="status" data-testid="resend-status">{t('resend.successMsg')}</p>
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
