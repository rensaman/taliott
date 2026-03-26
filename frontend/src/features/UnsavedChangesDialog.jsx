import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './UnsavedChangesDialog.css';

export default function UnsavedChangesDialog({ onStay, onLeave }) {
  const { t } = useTranslation();
  const stayRef = useRef(null);

  // Focus the "Stay" button on open for keyboard accessibility
  useEffect(() => {
    stayRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onStay(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStay]);

  return (
    <div className="nav-guard-overlay" role="dialog" aria-modal="true" aria-labelledby="nav-guard-title">
      <div className="nav-guard-dialog">
        <h2 id="nav-guard-title" className="nav-guard-title">{t('navGuard.title')}</h2>
        <p className="nav-guard-body">{t('navGuard.body')}</p>
        <div className="nav-guard-actions">
          <button ref={stayRef} className="btn btn-primary" onClick={onStay}>
            {t('navGuard.stay')}
          </button>
          <button className="btn btn-ghost" onClick={onLeave}>
            {t('navGuard.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
