import { useEffect, useRef } from 'react';

/**
 * Subscribe to the server-sent event stream for an event.
 * Calls onMessage(data) for each parsed JSON payload received.
 * EventSource auto-reconnects on network errors.
 *
 * @param {string|null} eventId - The event UUID from the participate/admin response.
 * @param {(data: object) => void} onMessage
 */
export function useEventStream(eventId, onMessage) {
  // Keep a stable ref so the effect doesn't re-run when onMessage identity changes
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!eventId) return;
    const es = new EventSource(`/api/events/${eventId}/stream`);
    es.onmessage = e => {
      try {
        onMessageRef.current(JSON.parse(e.data));
      } catch {
        // ignore malformed frames
      }
    };
    return () => es.close();
  }, [eventId]);
}
