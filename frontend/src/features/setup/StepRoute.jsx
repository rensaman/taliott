import React from 'react';
import './StepRoute.css';

/**
 * Transit-map step indicator.
 * stepLabels: string[] — short label for each step
 * current: 0-based index of the active step
 * onStepClick: optional callback(index) — called when a completed step is clicked
 */
export default function StepRoute({ stepLabels, current, onStepClick }) {
  return (
    <nav className="step-route" aria-label="Progress">
      {stepLabels.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'upcoming';
        const isDone = state === 'done' && onStepClick;
        const inner = (
          <>
            <span className="step-node-number" aria-hidden="true">
              {i < current ? '✓' : i + 1}
            </span>
            <span className="step-node-label">{label}</span>
          </>
        );
        return (
          <React.Fragment key={label}>
            <div className={`step-node step-node--${state}`} aria-current={state === 'active' ? 'step' : undefined}>
              {isDone ? (
                <button
                  type="button"
                  className="step-node-btn"
                  onClick={() => onStepClick(i)}
                  aria-label={label}
                >
                  {inner}
                </button>
              ) : inner}
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`step-connector${i < current ? ' step-connector--done' : ''}`} aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
