import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enForms from './locales/en/forms.json';
import enErrors from './locales/en/errors.json';

i18next
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'forms', 'errors'],
    resources: {
      en: { common: enCommon, forms: enForms, errors: enErrors },
      hu: { common: {}, forms: {}, errors: {} },
    },
    interpolation: { escapeValue: false },
  });

export default i18next;
