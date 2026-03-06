import React, { useState } from 'react';
import EventSetupForm from './features/setup/EventSetupForm.jsx';
import ParticipateView from './features/participate/ParticipateView.jsx';

function getParticipantId() {
  const match = window.location.pathname.match(/^\/participate\/([^/]+)/);
  return match?.[1] ?? null;
}

export default function App() {
  const [confirmation, setConfirmation] = useState(null);
  const participantId = getParticipantId();

  if (participantId) {
    return <ParticipateView participantId={participantId} />;
  }

  if (confirmation) {
    const adminUrl = `${window.location.origin}/admin/${confirmation.admin_token}`;
    return (
      <main>
        <h1>{confirmation.name}</h1>
        <p>Your event was created. Save your admin link to manage it:</p>
        <a href={adminUrl} data-testid="admin-token">{adminUrl}</a>
        <p>
          Invite emails have been sent to{' '}
          <strong>{confirmation.participants?.length ?? 0}</strong> participant(s).
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>taliott</h1>
      <EventSetupForm onCreated={setConfirmation} />
    </main>
  );
}
