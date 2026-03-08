import { useEffect, useState, useCallback } from 'react';
import ParticipantResponseList from './ParticipantResponseList.jsx';
import GroupMap from './GroupMap.jsx';
import VenueList from './VenueList.jsx';
import FinalizePanel from './FinalizePanel.jsx';
import { useEventStream } from '../../hooks/useEventStream.js';

export default function AdminView({ adminToken }) {
  const [data, setData] = useState(null);
  const [venues, setVenues] = useState([]);
  const [error, setError] = useState(null);
  const [liveCentroid, setLiveCentroid] = useState(null);

  const loadDashboard = useCallback(() => {
    fetch(`/api/events/${adminToken}`)
      .then(res => {
        if (!res.ok) throw new Error('Dashboard not found.');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message));
  }, [adminToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Seed live centroid from initial load
  useEffect(() => {
    if (data?.centroid !== undefined) setLiveCentroid(data.centroid);
  }, [data?.centroid]);

  // Subscribe to live location updates
  useEventStream(data?.id ?? null, msg => {
    if (msg.type === 'location') setLiveCentroid(msg.centroid);
  });

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const responded = data.participants.filter(p => p.responded_at).length;
  const total = data.participants.length;

  return (
    <main>
      <h1>{data.name}</h1>
      <p>Status: <strong>{data.status}</strong></p>
      <p>Deadline: {new Date(data.deadline).toLocaleString()}</p>
      <p>{responded} of {total} responded</p>
      <GroupMap centroid={liveCentroid} participants={data.participants} />
      <ParticipantResponseList participants={data.participants} />
      <VenueList
        adminToken={adminToken}
        defaultVenueType={data.venue_type || ''}
        onVenuesLoaded={setVenues}
      />
      {data.status !== 'finalized' && (
        <FinalizePanel
          adminToken={adminToken}
          slots={data.slots || []}
          venues={venues}
          onFinalized={loadDashboard}
        />
      )}
      {data.status === 'finalized' && (
        <p data-testid="finalized-notice"><strong>This event has been finalized.</strong></p>
      )}
    </main>
  );
}
