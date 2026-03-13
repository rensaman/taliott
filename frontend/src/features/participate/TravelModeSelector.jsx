const MODES = [
  { value: 'transit', label: 'Transit (bus/metro)' },
  { value: 'driving', label: 'Car' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'walking', label: 'Walking' },
];

export const TRAVEL_MODE_LABELS = Object.fromEntries(MODES.map(m => [m.value, m.label]));

export default function TravelModeSelector({ value, onChange }) {
  return (
    <fieldset>
      <legend>How will you get there?</legend>
      {MODES.map(({ value: v, label }) => (
        <label key={v}>
          <input
            type="radio"
            name="travel-mode"
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
