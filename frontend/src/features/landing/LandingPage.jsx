import React from 'react';
import './LandingPage.css';

export default function LandingPage({ onStart }) {
  return (
    <div className="landing">
      <div className="landing-content">
        <p className="landing-wordmark">taliott</p>

        <h1 className="landing-headline">
          Group meetups,<br />without the chaos.
        </h1>

        <p className="landing-sub">
          Everyone votes on their availability and location.
          You pick the best time and a fair spot for all.
        </p>

        <div className="landing-steps">
          <div className="landing-step">
            <span className="step-icon">📅</span>
            <span className="step-label">Set a date range</span>
          </div>
          <div className="landing-step">
            <span className="step-icon">🗳️</span>
            <span className="step-label">Everyone votes</span>
          </div>
          <div className="landing-step">
            <span className="step-icon">📍</span>
            <span className="step-label">Pick the fairest spot</span>
          </div>
        </div>

        <button className="landing-cta" onClick={onStart}>
          Create an event
        </button>

        <p className="landing-recover">
          Already have an event? <a href="/resend">Recover your link</a>
        </p>
      </div>

      <footer className="landing-footer">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
    </div>
  );
}
