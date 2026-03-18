import { useTranslation } from 'react-i18next';
import ToggleBlock from '../setup/ToggleBlock.jsx';
import '../setup/ToggleBlock.css';
import '../setup/EventSetupForm.css';

export const TRAVEL_MODE_LABELS = {
  transit: 'Transit',
  driving: 'Car',
  cycling: 'Cycling',
  walking: 'Walking',
};

const MODE_VALUES = ['transit', 'driving', 'cycling', 'walking'];

export default function TravelModeSelector({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <fieldset className="wizard-fieldset" data-testid="travel-mode-selector">
      <legend>{t('travelMode.legend')}</legend>
      <div className="toggle-group">
        {MODE_VALUES.map(v => (
          <ToggleBlock
            key={v}
            name="travel-mode"
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            title={t(`travelMode.${v}.label`)}
            description={t(`travelMode.${v}.description`)}
            data-testid={`travel-mode-${v}`}
          />
        ))}
      </div>
    </fieldset>
  );
}
