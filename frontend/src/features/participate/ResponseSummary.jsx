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
        <button
          className="pv-update-link"
          onClick={onUpdate}
          data-testid="update-response-btn"
        >
          {t('participate.summary.updateResponse')}
        </button>
      )}
    </section>
  );
}
