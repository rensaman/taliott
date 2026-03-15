import ToggleBlock from '../setup/ToggleBlock.jsx';
import '../setup/ToggleBlock.css';
import '../setup/EventSetupForm.css';

const MODES = [
  { value: 'transit',  label: 'Transit',  description: 'Bus, metro, or train' },
  { value: 'driving',  label: 'Car',       description: 'Drive your own vehicle' },
  { value: 'cycling',  label: 'Cycling',   description: 'Bike or e-bike' },
  { value: 'walking',  label: 'Walking',   description: 'On foot' },
];

export const TRAVEL_MODE_LABELS = Object.fromEntries(MODES.map(m => [m.value, m.label]));

export default function TravelModeSelector({ value, onChange }) {
  return (
    <fieldset className="wizard-fieldset">
      <legend>How will you get there?</legend>
      <div className="toggle-group">
        {MODES.map(({ value: v, label, description }) => (
          <ToggleBlock
            key={v}
            name="travel-mode"
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            title={label}
            description={description}
          />
        ))}
      </div>
    </fieldset>
  );
}
