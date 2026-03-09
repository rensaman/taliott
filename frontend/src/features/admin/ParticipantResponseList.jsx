const STATE_SYMBOL = { yes: '✓', maybe: '?', no: '✗', neutral: '—' };

export default function ParticipantResponseList({ participants, slots = [] }) {
  return (
    <ul>
      {participants.map(p => (
        <li
          key={p.id}
          data-testid={`participant-${p.id}`}
          data-responded={p.responded_at ? 'true' : 'false'}
        >
          <span>{p.email}</span>
          {p.responded_at ? (
            <span aria-label="responded"> — Responded</span>
          ) : (
            <span aria-label="pending"> — Pending</span>
          )}
          {p.responded_at && slots.length > 0 && (
            <ul data-testid="slot-availability">
              {slots.map(s => {
                const avail = p.availability?.find(a => a.slot_id === s.id);
                const state = avail?.state ?? 'neutral';
                return (
                  <li key={s.id}>
                    {new Date(s.starts_at).toLocaleString()}: {STATE_SYMBOL[state]} {state}
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
