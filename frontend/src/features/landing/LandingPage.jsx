import React from 'react';
import './LandingPage.css';

const STEPS = [
  {
    label: 'Pin your location',
    desc: 'Everyone shares where they\'re coming from — no faff, no spreadsheets.',
  },
  {
    label: 'Vote on dates',
    desc: 'Pick the slots that work. The overlap rises to the top.',
  },
  {
    label: 'Meet in the middle',
    desc: 'A fair spot, a fair time. Done.',
  },
];

export default function LandingPage({ onStart }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <p className="landing-wordmark">Taliott</p>
      </header>

      <section className="landing-hero">
        <h1 className="landing-headline">
          Group meetups,<br />
          <em>without</em><br />
          the chaos.
        </h1>
        <div className="landing-rule" aria-hidden="true" />
        <p className="landing-sub">
          Everyone shares where they&apos;re coming from.
          You pick the spot that&apos;s fair for all — and a time that works.
        </p>
      </section>

      <section className="landing-route" aria-label="How it works">
        {STEPS.map((step, i) => (
          <div className="landing-route-item" key={step.label}>
            <div className="route-node">
              <div className="route-node-circle" aria-hidden="true">{i + 1}</div>
              {i < STEPS.length - 1 && <div className="route-line" aria-hidden="true" />}
            </div>
            <div className="route-text">
              <p className="route-text-label">{step.label}</p>
              <p className="route-text-desc">{step.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="landing-cta-section">
        <button className="landing-cta" onClick={onStart}>
          Create an event
        </button>
      </div>

      <p className="landing-recover">
        Already have an event? <a href="/resend">Find your link</a>
      </p>

      <footer className="landing-footer">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
    </div>
  );
}
