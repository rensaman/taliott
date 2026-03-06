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
    return (
      <main>
        <h1>{confirmation.name}</h1>
        <p>Share your admin link to manage the event.</p>
        <code data-testid="admin-token">{confirmation.admin_token}</code>
        <p>{confirmation.slots?.length} slots generated.</p>
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
