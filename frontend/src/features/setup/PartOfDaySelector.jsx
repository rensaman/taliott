import React from 'react';

// Every 30 minutes from 00:00 (0) to 23:30 (1410) — 48 entries total
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { value: totalMinutes, label };
});

export default function TimeRangeSelector({ startValue, endValue, onStartChange, onEndChange }) {
  return (
    <div>
      <label>
        From time
        <select
          aria-label="From time"
          value={startValue}
          onChange={e => onStartChange(Number(e.target.value))}
        >
          {TIME_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label>
        To time
        <select
          aria-label="To time"
          value={endValue}
          onChange={e => onEndChange(Number(e.target.value))}
        >
          {TIME_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
