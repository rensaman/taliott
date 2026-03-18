import { useTranslation } from 'react-i18next';
import { privacyPath, termsPath } from '../../lib/legalPaths.js';
import './LegalView.css';

export default function LegalFooter() {
  const { t, i18n } = useTranslation();
  return (
    <footer className="legal-footer">
      <a href={privacyPath(i18n.language)}>{t('legalFooter.privacy')}</a>
      <a href={termsPath(i18n.language)}>{t('legalFooter.terms')}</a>
    </footer>
  );
}
