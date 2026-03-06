import React from 'react';

export default function DateRangePicker({ value, onChange }) {
  const { start, end } = value;

  return (
    <fieldset>
      <legend>Date Range</legend>
      <label>
        From
        <input
          type="date"
          value={start}
          onChange={e => onChange({ ...value, start: e.target.value })}
          required
        />
      </label>
      <label>
        To
        <input
          type="date"
          value={end}
          min={start || undefined}
          onChange={e => onChange({ ...value, end: e.target.value })}
          required
        />
      </label>
    </fieldset>
  );
}
