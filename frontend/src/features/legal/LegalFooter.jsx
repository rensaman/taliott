import { useTranslation } from 'react-i18next';
import './LegalView.css';

export default function LegalFooter() {
  const { t } = useTranslation();
  return (
    <footer className="legal-footer">
      <a href="/privacy">{t('legalFooter.privacy')}</a>
      <a href="/terms">{t('legalFooter.terms')}</a>
    </footer>
  );
}
