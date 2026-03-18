import { useTranslation } from 'react-i18next';
import AvailabilityGrid from './AvailabilityGrid.jsx';
import LocationMap from './LocationMap.jsx';
import '../setup/EventSetupForm.css';
import './ResponseWizard.css';

export default function ResponseSummary({
  participantId,
  name,
  slots,
  availability,
  location,
  travelMode,
  locked,
  onUpdate,
}) {
  const { t } = useTranslation();
  return (
    <section aria-label="Your response" className="summary">
      {name && (
        <div className="summary-section">
          <p className="summary-label">{t('participate.summary.labelName')}</p>
          <p data-testid="summary-name" className="summary-value">{name}</p>
        </div>
      )}

      <div className="summary-section">
        <p className="summary-label">{t('participate.summary.labelAvailability')}</p>
        <AvailabilityGrid
          participantId={participantId}
          slots={slots}
          initialAvailability={availability}
          locked={true}
        />
      </div>

      {(travelMode || location) && (
        <div className="summary-section">
          <p className="summary-label">{t('participate.summary.labelGettingThere')}</p>
          {travelMode && (
            <p data-testid="summary-travel-mode" className="summary-value">
              {t(`travelMode.${travelMode}.label`, { defaultValue: travelMode })}
            </p>
          )}
          {location && (
            <>
              <p data-testid="summary-address" className="summary-address">{location.label}</p>
              <LocationMap location={location} onLocationChange={() => {}} readonly />
            </>
          )}
        </div>
      )}

      {!locked && (
        <div className="summary-section summary-section--action">
          <button className="btn btn-ghost" onClick={onUpdate} data-testid="update-response-btn">
            {t('participate.summary.updateResponse')}
          </button>
        </div>
      )}
    </section>
  );
}
