import React, { useEffect, useState } from 'react';
import LegalFooter from '../legal/LegalFooter.jsx';
import '../setup/EventSetupForm.css';
import './JoinView.css';

export default function JoinView({ joinToken }) {
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
        setFieldError(body.error ?? 'Something went wrong');
        return;
      }
      window.location.href = `/participate/${body.participant_id}`;
    } catch {
      setFieldError('Network error, please try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (error === 'not_found') {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">Taliott</p></header>
        <div className="join-body"><p>This join link is invalid or has expired.</p></div>
      </main>
    );
  }
  if (error) {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">Taliott</p></header>
        <div className="join-body"><p>Something went wrong. Please try again later.</p></div>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">Taliott</p></header>
        <div className="join-body"><p>Loading…</p></div>
      </main>
    );
  }
  if (event.closed) {
    return (
      <main className="join-shell">
        <header className="join-header"><p className="wizard-wordmark">Taliott</p></header>
        <div className="join-body">
          <h1 className="join-event-name">{event.name}</h1>
          <p className="join-meta" data-testid="closed-message">Voting is closed for this event.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="join-shell">
      <header className="join-header">
        <p className="wizard-wordmark">Taliott</p>
      </header>

      <div className="join-body">
        <h1 className="join-event-name">{event.name}</h1>
        <p className="join-meta">
          Voting deadline: {new Date(event.deadline).toLocaleString()}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="join-email" className="field-label">Your email</label>
            <input
              id="join-email"
              className="wizard-input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          {fieldError && <p className="wizard-error" role="alert">{fieldError}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Joining…' : 'Join event →'}
          </button>
        </form>
      </div>

      <footer className="join-footer">
        <LegalFooter />
      </footer>
    </main>
  );
}
