import { useState } from 'react';
import LegalFooter from '../legal/LegalFooter.jsx';
import '../setup/EventSetupForm.css';
import '../join/JoinView.css';

export default function ResendLinkView() {
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
        <p className="wizard-wordmark">Taliott</p>
      </header>

      <div className="join-body">
        <h1 className="join-event-name">Recover your link</h1>
        {submitted ? (
          <p role="status">
            If we found a matching event, we&apos;ve sent the link to your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} aria-label="Resend link form">
            <div className="field">
              <label htmlFor="resend-email" className="field-label">Your email</label>
              <input
                id="resend-email"
                className="wizard-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send my link'}
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
