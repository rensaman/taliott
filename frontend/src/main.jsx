import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

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
    <App />
  </React.StrictMode>
);
