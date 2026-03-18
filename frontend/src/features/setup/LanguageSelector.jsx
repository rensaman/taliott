import { useTranslation } from 'react-i18next';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  return (
    <div className="language-selector" role="group" aria-label="Language">
      {['en', 'hu'].map(lang => (
        <button
          key={lang}
          type="button"
          className={`lang-btn${i18n.language === lang ? ' lang-btn--active' : ''}`}
          onClick={() => i18n.changeLanguage(lang)}
          aria-pressed={i18n.language === lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
