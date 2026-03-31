import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToggleBlock from '../setup/ToggleBlock.jsx';
import '../setup/ToggleBlock.css';
import '../setup/EventSetupForm.css';
import './TravelModeSelector.css';

export const TRAVEL_MODE_LABELS = {
  transit: 'Transit',
  driving: 'Car',
  cycling: 'Cycling',
  walking: 'Walking',
};

const MODE_VALUES = ['transit', 'driving', 'cycling', 'walking'];

export default function TravelModeSelector({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!value);

  function handleSelect(v) {
    onChange(v);
    setOpen(false);
  }

  return (
    <fieldset className="wizard-fieldset" data-testid="travel-mode-selector">
      <legend>{t('travelMode.legend')}</legend>
      {!open && value ? (
        <button
          type="button"
          className="tms-selected"
          onClick={() => setOpen(true)}
          data-testid="travel-mode-selected"
        >
          <span className="tms-selected-bar" aria-hidden="true" />
          <span className="tms-selected-body">
            <span className="tms-selected-title">{t(`travelMode.${value}.label`)}</span>
            <span className="tms-selected-desc">{t(`travelMode.${value}.description`)}</span>
          </span>
          <span className="tms-change" aria-hidden="true">{t('travelMode.change')}</span>
        </button>
      ) : (
        <div className="toggle-group">
          {MODE_VALUES.map(v => (
            <ToggleBlock
              key={v}
              name="travel-mode"
              value={v}
              checked={value === v}
              onChange={() => handleSelect(v)}
              title={t(`travelMode.${v}.label`)}
              description={t(`travelMode.${v}.description`)}
              data-testid={`travel-mode-${v}`}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}
