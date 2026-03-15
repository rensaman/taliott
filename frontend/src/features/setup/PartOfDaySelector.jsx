import React from 'react';
import './PartOfDaySelector.css';

// Every 30 minutes from 00:00 (0) to 23:30 (1410) — 48 entries total
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { value: totalMinutes, label };
});

function minutesToHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const SLIDER_MIN = 360;  // 06:00
const SLIDER_MAX = 1380; // 23:00
const AXIS_HOURS = [6, 9, 12, 15, 18, 21];

export default function TimeRangeSelector({ startValue, endValue, onStartChange, onEndChange }) {
  const span = SLIDER_MAX - SLIDER_MIN;
  const leftPct = ((startValue - SLIDER_MIN) / span) * 100;
  const rightPct = ((endValue - SLIDER_MIN) / span) * 100;

  // When thumbs are close together, keep end slider on top so it stays reachable
  const startZ = startValue >= endValue - 30 ? 2 : 1;
  const endZ = startValue >= endValue - 30 ? 1 : 2;

  return (
    <div className="time-range-picker">
      <div className="time-range-track-container">
        <div className="time-range-track" />
        <div
          className="time-range-fill"
          style={{ left: `${leftPct}%`, width: `${Math.max(rightPct - leftPct, 0)}%` }}
        />
        <input
          type="range"
          aria-label="Earliest start"
          className="time-range-input"
          style={{ zIndex: startZ }}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={30}
          value={startValue}
          onChange={e => {
            const v = Number(e.target.value);
            onStartChange(v);
            if (v >= endValue) onEndChange(Math.min(v + 30, SLIDER_MAX));
          }}
        />
        <input
          type="range"
          aria-label="Latest start"
          className="time-range-input"
          style={{ zIndex: endZ }}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={30}
          value={endValue}
          onChange={e => {
            const v = Number(e.target.value);
            onEndChange(v);
            if (v <= startValue) onStartChange(Math.max(v - 30, SLIDER_MIN));
          }}
        />
      </div>

      <div className="time-range-axis">
        {AXIS_HOURS.map(h => {
          const pct = ((h * 60 - SLIDER_MIN) / span) * 100;
          return (
            <span key={h} style={{ left: `${pct}%` }}>{h}:00</span>
          );
        })}
      </div>

      <div className="time-range-values">
        <span>From <strong>{minutesToHHMM(startValue)}</strong></span>
        <span>To <strong>{minutesToHHMM(endValue)}</strong></span>
      </div>
    </div>
  );
}
