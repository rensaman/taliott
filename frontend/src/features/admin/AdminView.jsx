import { useEffect, useState } from 'react';
import ParticipantResponseList from './ParticipantResponseList.jsx';
import GroupMap from './GroupMap.jsx';

export default function AdminView({ adminToken }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/events/${adminToken}`)
      .then(res => {
        if (!res.ok) throw new Error('Dashboard not found.');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message));
  }, [adminToken]);

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
      <GroupMap centroid={data.centroid} participants={data.participants} />
      <ParticipantResponseList participants={data.participants} />
    </main>
  );
}
