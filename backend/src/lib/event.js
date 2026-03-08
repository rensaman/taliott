/**
 * Returns true when the event is no longer open for editing.
 * This covers: deadline passed, explicit lock, or finalization.
 * @param {{ deadline: Date|string, status?: string }} event
 */
export function isEventLocked(event) {
  return (
    new Date(event.deadline) < new Date() ||
    event.status === 'locked' ||
    event.status === 'finalized'
  );
}
