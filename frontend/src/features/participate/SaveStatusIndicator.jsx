const MESSAGES = {
  error: 'Failed to save. Please try again.',
};

export default function SaveStatusIndicator({ status }) {
  const message = MESSAGES[status];
  if (!message) return null;
  return (
    <p
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      data-testid="save-status"
    >
      {message}
    </p>
  );
}
