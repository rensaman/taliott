import { useTranslation } from 'react-i18next';
import { privacyPath, termsPath } from '../../lib/legalPaths.js';
import './LegalView.css';

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? 'contact@taliott.hu';

export default function LegalFooter({ className = 'legal-footer' }) {
  const { t, i18n } = useTranslation();
  return (
    <footer className={className}>
      <a href={privacyPath(i18n.language)}>{t('legalFooter.privacy')}</a>
      <a href={termsPath(i18n.language)}>{t('legalFooter.terms')}</a>
      <a href={`mailto:${CONTACT_EMAIL}`}>{t('legalFooter.contact')}</a>
      <a href="https://github.com/rensaman/taliott" target="_blank" rel="noopener noreferrer">{t('legalFooter.sourceCode')}</a>
      <a href="https://github.com/rensaman/taliott/issues" target="_blank" rel="noopener noreferrer">{t('legalFooter.reportIssue')}</a>
    </footer>
  );
}
