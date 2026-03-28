import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/big-shoulders-display/700.css';
import '@fontsource/big-shoulders-display/900.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import './index.css';
import App from './App.jsx';
import i18n from './i18n.js';
import { I18nextProvider } from 'react-i18next';

// Inject Umami analytics if configured. Cookieless, GDPR-compliant by default.
// Set VITE_UMAMI_WEBSITE_ID (and optionally VITE_UMAMI_SCRIPT_URL) in your .env.
if (import.meta.env.VITE_UMAMI_WEBSITE_ID) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = import.meta.env.VITE_UMAMI_SCRIPT_URL || 'http://localhost:3001/script.js';
  s.dataset.websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  document.head.appendChild(s);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);
