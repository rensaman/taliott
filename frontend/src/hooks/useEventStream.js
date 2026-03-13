import { useEffect, useRef } from 'react';

/**
 * Subscribe to the server-sent event stream for an event.
 * Calls onMessage(data) for each parsed JSON payload received.
 * EventSource auto-reconnects on network errors.
 *
 * @param {string|null} adminToken - The admin token for the event.
 * @param {(data: object) => void} onMessage
 */
export function useEventStream(adminToken, onMessage) {
  // Keep a stable ref so the effect doesn't re-run when onMessage identity changes
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!adminToken) return;
    const es = new EventSource(`/api/events/${adminToken}/stream`);
    es.onmessage = e => {
      try {
        onMessageRef.current(JSON.parse(e.data));
      } catch {
        // ignore malformed frames
      }
    };
    return () => es.close();
  }, [adminToken]);
}
