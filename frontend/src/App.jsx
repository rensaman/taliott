import React, { useState } from 'react';
import EventSetupForm from './features/setup/EventSetupForm.jsx';
import ParticipateView from './features/participate/ParticipateView.jsx';
import AdminView from './features/admin/AdminView.jsx';
import JoinView from './features/join/JoinView.jsx';
import ResendLinkView from './features/resend/ResendLinkView.jsx';
import PrivacyPolicyView from './features/legal/PrivacyPolicyView.jsx';
import TermsView from './features/legal/TermsView.jsx';
import LegalFooter from './features/legal/LegalFooter.jsx';
import LandingPage from './features/landing/LandingPage.jsx';
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
        <p className="confirmation-wordmark">Taliott</p>
      </header>
      <main className="confirmation-body">
        <p className="confirmation-eyebrow">Event created</p>
        <h1 className="confirmation-name">{confirmation.name}</h1>

        <div className="confirmation-section">
          <p className="confirmation-section-label">Your admin link — save this</p>
          <a
            href={adminUrl}
            className="confirmation-admin-link"
            data-testid="admin-token"
          >
            {confirmation.admin_token}
          </a>
        </div>

        {joinUrl ? (
          <div className="confirmation-section">
            <p className="confirmation-section-label">Share with participants</p>
            <div className="confirmation-join-row">
              <span className="confirmation-join-url" data-testid="join-url">{joinUrl}</span>
              <button className="confirmation-copy-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div className="confirmation-section">
            <p className="confirmation-email-notice">
              Invite emails have been sent to{' '}
              <strong>{confirmation.participants?.length ?? 0}</strong> participant(s).
            </p>
          </div>
        )}
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

export default function App() {
  const [confirmation, setConfirmation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const participantId = getParticipantId();
  const adminToken = getAdminToken();
  const joinToken = getJoinToken();
  const resend = isResendPage();

  if (isPrivacyPage()) {
    return <PrivacyPolicyView />;
  }

  if (isTermsPage()) {
    return <TermsView />;
  }

  if (resend) {
    return <ResendLinkView />;
  }

  if (participantId) {
    return <ParticipateView participantId={participantId} />;
  }

  if (adminToken) {
    return <AdminView adminToken={adminToken} />;
  }

  if (joinToken) {
    return <JoinView joinToken={joinToken} />;
  }

  if (confirmation) {
    return <ConfirmationView confirmation={confirmation} />;
  }

  if (!showForm) {
    return <LandingPage onStart={() => setShowForm(true)} />;
  }

  return (
    <>
      <EventSetupForm onCreated={setConfirmation} />
      <LegalFooter />
    </>
  );
}
