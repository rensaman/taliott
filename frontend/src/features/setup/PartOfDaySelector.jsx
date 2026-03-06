import React from 'react';

export const PART_OF_DAY_OPTIONS = ['all', 'morning', 'afternoon', 'evening'];

export default function PartOfDaySelector({ value, onChange }) {
  return (
    <fieldset>
      <legend>Part of Day</legend>
      {PART_OF_DAY_OPTIONS.map(opt => (
        <label key={opt}>
          <input
            type="radio"
            name="part_of_day"
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </fieldset>
  );
}
