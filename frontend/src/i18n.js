import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enForms from './locales/en/forms.json';
import enErrors from './locales/en/errors.json';
import huCommon from './locales/hu/common.json';
import huForms from './locales/hu/forms.json';
import huErrors from './locales/hu/errors.json';

const LANG_KEY = 'taliott_lang';
const SUPPORTED = ['en', 'hu'];
let stored;
try { stored = localStorage.getItem(LANG_KEY); } catch { stored = null; }
const initialLang = SUPPORTED.includes(stored) ? stored : 'en';

i18next
  .use(initReactI18next)
  .init({
    lng: initialLang,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'forms', 'errors'],
    resources: {
      en: { common: enCommon, forms: enForms, errors: enErrors },
      hu: { common: huCommon, forms: huForms, errors: huErrors },
    },
    interpolation: { escapeValue: false },
  });

i18next.on('languageChanged', lng => {
  try { localStorage.setItem(LANG_KEY, lng); } catch { /* no-op */ }
});

export default i18next;
