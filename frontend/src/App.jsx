import React, { useState } from 'react';
import EventSetupForm from './features/setup/EventSetupForm.jsx';

export default function App() {
  const [confirmation, setConfirmation] = useState(null);

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
