export default function ParticipantResponseList({ participants }) {
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
        </li>
      ))}
    </ul>
  );
}
