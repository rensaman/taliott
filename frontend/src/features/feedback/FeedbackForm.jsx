import { useState } from 'react';
import './FeedbackForm.css';

const STORAGE_KEY = 'taliott_feedback_sent';

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

export default function FeedbackForm({ context }) {
  const [dismissed, setDismissed] = useState(() => !!storageGet(STORAGE_KEY));
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (dismissed) return null;

  async function handleSubmit() {
    if (score === null) return;
    setSending(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment: comment.trim() || null, context }),
      });
    } catch (_) {
      // best-effort — don't block the user
    }
    storageSet(STORAGE_KEY, '1');
    setSent(true);
    setSending(false);
  }

  function handleDismiss() {
    storageSet(STORAGE_KEY, '1');
    setDismissed(true);
  }

  if (sent) {
    return (
      <div className="feedback-card feedback-card--sent">
        <p className="feedback-thanks">Thanks for the feedback.</p>
      </div>
    );
  }

  return (
    <div className="feedback-card">
      <p className="feedback-question">How likely are you to recommend Taliott?</p>
      <div className="feedback-scale">
        <span className="feedback-scale-label">Not at all</span>
        <div className="feedback-scores">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              className={`feedback-score-btn${score === i ? ' feedback-score-btn--selected' : ''}`}
              onClick={() => setScore(i)}
              aria-label={`Score ${i}`}
              aria-pressed={score === i}
            >
              {i}
            </button>
          ))}
        </div>
        <span className="feedback-scale-label">Extremely</span>
      </div>

      {score !== null && (
        <textarea
          className="feedback-comment"
          placeholder="Anything else on your mind? (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      )}

      <div className="feedback-actions">
        <button
          className="feedback-submit"
          onClick={handleSubmit}
          disabled={score === null || sending}
        >
          Send
        </button>
        <button className="feedback-dismiss" onClick={handleDismiss}>
          No thanks
        </button>
      </div>
    </div>
  );
}
