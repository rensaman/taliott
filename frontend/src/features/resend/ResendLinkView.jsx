import { useState } from 'react';

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
    <main>
      <h1>Recover your link</h1>
      {submitted ? (
        <p role="status">
          If we found a matching event, we&apos;ve sent the link to your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} aria-label="Resend link form">
          <label>
            Your email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send my link'}
          </button>
        </form>
      )}
    </main>
  );
}
