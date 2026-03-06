/**
 * Returns true when the event's voting deadline has passed.
 * @param {{ deadline: Date|string }} event
 */
export function isEventLocked(event) {
  return new Date(event.deadline) < new Date();
}
