import React, { useState } from 'react';
import EventSetupForm from './features/setup/EventSetupForm.jsx';
import ParticipateView from './features/participate/ParticipateView.jsx';
import AdminView from './features/admin/AdminView.jsx';
import JoinView from './features/join/JoinView.jsx';
import ResendLinkView from './features/resend/ResendLinkView.jsx';
import PrivacyPolicyView from './features/legal/PrivacyPolicyView.jsx';
import TermsView from './features/legal/TermsView.jsx';
import LegalFooter from './features/legal/LegalFooter.jsx';

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
    const adminUrl = `${window.location.origin}/admin/${confirmation.admin_token}`;
    const joinUrl = confirmation.join_url
      ? `${window.location.origin}${confirmation.join_url}`
      : null;
    return (
      <main>
        <h1>{confirmation.name}</h1>
        <p>{confirmation.slots?.length ?? 0} slots generated</p>
        <p>Your event was created. Save your admin link to manage it:</p>
        <a href={adminUrl} data-testid="admin-token">{confirmation.admin_token}</a>
        {joinUrl ? (
          <p>
            Share this link with participants:{' '}
            <span data-testid="join-url">{joinUrl}</span>{' '}
            <button onClick={() => navigator.clipboard.writeText(joinUrl)}>Copy link</button>
          </p>
        ) : (
          <p>
            Invite emails have been sent to{' '}
            <strong>{confirmation.participants?.length ?? 0}</strong> participant(s).
          </p>
        )}
      </main>
    );
  }

  return (
    <>
      <main>
        <h1>taliott</h1>
        <EventSetupForm onCreated={setConfirmation} />
        <p><a href="/resend">Lost your link? Recover it here</a></p>
      </main>
      <LegalFooter />
    </>
  );
}
