import React from 'react';
import { useTranslation } from 'react-i18next';
import { privacyPath, termsPath } from '../../lib/legalPaths.js';
import './LandingPage.css';

export default function LandingPage({ onStart }) {
  const { t, i18n } = useTranslation();

  const steps = [
    { label: t('landing.step1.label'), desc: t('landing.step1.desc') },
    { label: t('landing.step2.label'), desc: t('landing.step2.desc') },
    { label: t('landing.step3.label'), desc: t('landing.step3.desc') },
  ];

  return (
    <div className="landing">
      <header className="landing-header">
        <p className="landing-wordmark">Taliott</p>
      </header>

      <section className="landing-hero">
        <h1 className="landing-headline">
          {t('landing.headline1')}<br />
          <em>{t('landing.headline2')}</em><br />
          {t('landing.headline3')}
        </h1>
        <div className="landing-rule" aria-hidden="true" />
        <p className="landing-sub">{t('landing.sub')}</p>
      </section>

      <section className="landing-route" aria-label="How it works">
        {steps.map((step, i) => (
          <div className="landing-route-item" key={step.label}>
            <div className="route-node">
              <div className="route-node-circle" aria-hidden="true">{i + 1}</div>
              {i < steps.length - 1 && <div className="route-line" aria-hidden="true" />}
            </div>
            <div className="route-text">
              <p className="route-text-label">{step.label}</p>
              <p className="route-text-desc">{step.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="landing-cta-section">
        <button className="landing-cta" onClick={onStart} data-testid="create-event-btn">
          {t('landing.cta')}
        </button>
      </div>

      <p className="landing-recover">
        {t('landing.recover')} <a href="/resend">{t('landing.recoverLink')}</a>
      </p>

      <footer className="landing-footer">
        <a href={privacyPath(i18n.language)}>{t('landing.footerPrivacy')}</a>
        <a href={termsPath(i18n.language)}>{t('landing.footerTerms')}</a>
        <a href="https://github.com/rensaman/taliott" target="_blank" rel="noopener noreferrer">{t('landing.footerSource')}</a>
        <a href="https://github.com/rensaman/taliott/issues" target="_blank" rel="noopener noreferrer">{t('landing.footerIssue')}</a>
      </footer>
    </div>
  );
}
