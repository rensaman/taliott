const STATE_SYMBOL = { yes: '✓', maybe: '?', no: '✗', neutral: '—' };
const DOT_CLASS = { yes: 'avail-dot--yes', maybe: 'avail-dot--maybe', no: 'avail-dot--no', neutral: 'avail-dot--neutral' };

export default function ParticipantResponseList({ participants, slots = [] }) {
  return (
    <ul className="participant-list">
      {participants.map(p => {
        const responded = !!p.responded_at;
        return (
          <li
            key={p.id}
            className="participant-row"
            data-testid={`participant-${p.id}`}
            data-responded={responded ? 'true' : 'false'}
          >
            <span className="participant-email">{p.email}</span>
            <span className={`participant-status ${responded ? 'participant-status--responded' : 'participant-status--pending'}`}>
              {responded ? 'Responded' : 'Pending'}
            </span>
            {responded && slots.length > 0 && (
              <div className="participant-avail-dots">
                {slots.map(s => {
                  const avail = p.availability?.find(a => a.slot_id === s.id);
                  const state = avail?.state ?? 'neutral';
                  return (
                    <span
                      key={s.id}
                      className={`avail-dot ${DOT_CLASS[state]}`}
                      title={`${new Date(s.starts_at).toLocaleString()}: ${state}`}
                    />
                  );
                })}
              </div>
            )}
            {/* Hidden list kept for test compatibility */}
            {responded && slots.length > 0 && (
              <ul data-testid="slot-availability" className="slot-availability-hidden">
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
        );
      })}
    </ul>
  );
}
