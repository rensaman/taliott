import { useTranslation } from 'react-i18next';
import { privacyPath, termsPath } from '../../lib/legalPaths.js';

function getLegalLangInfo() {
  const path = window.location.pathname;
  if (path === '/privacy' || path === '/privacy/hu') {
    return { activeLang: path === '/privacy/hu' ? 'hu' : 'en', getPath: privacyPath };
  }
  if (path === '/terms' || path === '/terms/hu') {
    return { activeLang: path === '/terms/hu' ? 'hu' : 'en', getPath: termsPath };
  }
  return null;
}

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const legalInfo = getLegalLangInfo();
  const activeLang = legalInfo ? legalInfo.activeLang : i18n.language;

  function handleChange(lang) {
    if (legalInfo) {
      window.location.href = legalInfo.getPath(lang);
    } else {
      i18n.changeLanguage(lang);
    }
  }

  return (
    <div className="language-selector" role="group" aria-label="Language">
      {['en', 'hu'].map(lang => (
        <button
          key={lang}
          type="button"
          className={`lang-btn${activeLang === lang ? ' lang-btn--active' : ''}`}
          onClick={() => handleChange(lang)}
          aria-pressed={activeLang === lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
