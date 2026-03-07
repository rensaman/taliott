import React, { useEffect, useState } from 'react';

export default function JoinView({ joinToken }) {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
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
        body: JSON.stringify({ email, name: name || undefined }),
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
    return <main><p>This join link is invalid or has expired.</p></main>;
  }
  if (error) {
    return <main><p>Something went wrong. Please try again later.</p></main>;
  }
  if (!event) {
    return <main><p>Loading…</p></main>;
  }
  if (event.closed) {
    return (
      <main>
        <h1>{event.name}</h1>
        <p data-testid="closed-message">Voting is closed for this event.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{event.name}</h1>
      <p>Voting deadline: {new Date(event.deadline).toLocaleString()}</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="join-email">Email</label>
          <input
            id="join-email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="join-name">Name (optional)</label>
          <input
            id="join-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        {fieldError && <p role="alert">{fieldError}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join event'}
        </button>
      </form>
    </main>
  );
}
