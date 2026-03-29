import { useTranslation } from 'react-i18next';
import './ResponseWizard.css';

export default function ResponseSummary({ name, locked, onUpdate }) {
  const { t } = useTranslation();
  return (
    <section aria-label="Your response" className="pv-confirmation">
      {name && (
        <p className="pv-confirmation-name" data-testid="summary-name">{name}</p>
      )}
      <p className="pv-confirmation-text" data-testid="summary-confirmed">
        {t('participate.summary.confirmed')}
      </p>
      {!locked && (
        <div className="pv-update-links">
          <button className="pv-update-link" data-testid="update-name-btn" onClick={() => onUpdate(0)}>
            {t('participate.summary.changeName')}
          </button>
          <button className="pv-update-link" data-testid="update-location-btn" onClick={() => onUpdate(1)}>
            {t('participate.summary.changeLocation')}
          </button>
          <button className="pv-update-link" data-testid="update-dates-btn" onClick={() => onUpdate(2)}>
            {t('participate.summary.changeDates')}
          </button>
        </div>
      )}
    </section>
  );
}
