export default function DeadlineBadge({ deadline, locked }) {
  const formatted = new Date(deadline).toLocaleString();
  return (
    <p>
      {locked
        ? <>Voting closed &mdash; {formatted}</>
        : <>Voting deadline: {formatted}</>}
    </p>
  );
}
