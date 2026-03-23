import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import EventSetupForm from './features/setup/EventSetupForm.jsx';
import ParticipateView from './features/participate/ParticipateView.jsx';
import AdminView from './features/admin/AdminView.jsx';
import JoinView from './features/join/JoinView.jsx';
import ResendLinkView from './features/resend/ResendLinkView.jsx';
import PrivacyPolicyView from './features/legal/PrivacyPolicyView.jsx';
import TermsView from './features/legal/TermsView.jsx';
import PrivacyPolicyViewHu from './features/legal/PrivacyPolicyViewHu.jsx';
import TermsViewHu from './features/legal/TermsViewHu.jsx';
import LegalFooter from './features/legal/LegalFooter.jsx';
import LandingPage from './features/landing/LandingPage.jsx';
import FeedbackForm from './features/feedback/FeedbackForm.jsx';
import LanguageSelector from './features/setup/LanguageSelector.jsx';
import { track } from './lib/analytics.js';
import './App.css';

function copyToClipboard(text) {
  // navigator.clipboard requires HTTPS and may not be available on iOS Safari WKWebView
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
  }
  return Promise.resolve(execCommandCopy(text));
}

function execCommandCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  // Must be visible (non-zero size) and in the viewport for iOS to allow selection
  el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
  document.body.appendChild(el);
  el.focus();
  el.setSelectionRange(0, el.value.length);
  document.execCommand('copy');
  document.body.removeChild(el);
}

function ConfirmationView({ confirmation }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const adminUrl = `${window.location.origin}/admin/${confirmation.admin_token}`;
  const joinUrl = confirmation.join_url
    ? `${window.location.origin}${confirmation.join_url}`
    : null;

  function handleCopy() {
    copyToClipboard(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="confirmation">
      <header className="confirmation-header">
        <p className="confirmation-wordmark">{t('wizard.wordmark')}</p>
      </header>
      <main className="confirmation-body">
        <p className="confirmation-eyebrow">{t('confirmation.eyebrow')}</p>
        <h1 className="confirmation-name">{confirmation.name}</h1>

        <div className="confirmation-section">
          <p className="confirmation-section-label">{t('confirmation.adminLinkLabel')}</p>
          <a
            href={adminUrl}
            className="confirmation-admin-link"
            data-testid="admin-token"
          >
            {adminUrl}
          </a>
        </div>

        {joinUrl ? (
          <div className="confirmation-section">
            <p className="confirmation-section-label">{t('confirmation.shareLabel')}</p>
            <div className="confirmation-join-row">
              <span className="confirmation-join-url" data-testid="join-url">{joinUrl}</span>
              <button className="confirmation-copy-btn" onClick={handleCopy}>
                {copied ? t('confirmation.copied') : t('confirmation.copy')}
              </button>
            </div>
          </div>
        ) : (
          <div className="confirmation-section">
            <p className="confirmation-email-notice" data-testid="invite-emails-sent">
              {t('confirmation.emailNotice', { count: confirmation.participants?.length ?? 0 })}
            </p>
          </div>
        )}

        <FeedbackForm context="organizer" />

        <p className="donate-nudge">
          {t('donate.text')}{' '}
          <a href="https://www.donably.com/taliott" target="_blank" rel="noopener noreferrer">
            {t('donate.link')}
          </a>
        </p>
      </main>
    </div>
  );
}

function getParticipantId() {
  const match = window.location.pathname.match(/^\/participate\/([^/]+)/);
  return match?.[1] ?? null;
}

function getAdminToken() {
  const match = window.location.pathname.match(/^\/admin\/([^/]+)/);
  return match?.[1] ?? null;
}

function getJoinToken() {
  const match = window.location.pathname.match(/^\/join\/([^/]+)/);
  return match?.[1] ?? null;
}

function isResendPage() {
  return window.location.pathname === '/resend';
}

function isPrivacyPage() {
  return window.location.pathname === '/privacy';
}

function isTermsPage() {
  return window.location.pathname === '/terms';
}

function isPrivacyHuPage() {
  return window.location.pathname === '/privacy/hu';
}

function isTermsHuPage() {
  return window.location.pathname === '/terms/hu';
}

export default function App() {
  const [confirmation, setConfirmation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const participantId = getParticipantId();
  const adminToken = getAdminToken();
  const joinToken = getJoinToken();
  const resend = isResendPage();

  function handleCreated(result) {
    track('event_created', { invite_mode: result.invite_mode });
    setConfirmation(result);
  }

  function renderView() {
    if (isPrivacyHuPage()) return <PrivacyPolicyViewHu />;
    if (isTermsHuPage()) return <TermsViewHu />;
    if (isPrivacyPage()) return <PrivacyPolicyView />;
    if (isTermsPage()) return <TermsView />;
    if (resend) return <ResendLinkView />;
    if (participantId) return <ParticipateView participantId={participantId} />;
    if (adminToken) return <AdminView adminToken={adminToken} />;
    if (joinToken) return <JoinView joinToken={joinToken} />;
    if (confirmation) return <ConfirmationView confirmation={confirmation} />;
    if (!showForm) return <LandingPage onStart={() => setShowForm(true)} />;
    return (
      <>
        <EventSetupForm onCreated={handleCreated} />
        <LegalFooter />
      </>
    );
  }

  return (
    <>
      <div className="lang-corner">
        <LanguageSelector />
      </div>
      {renderView()}
    </>
  );
}
