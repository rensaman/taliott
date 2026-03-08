/**
 * In-memory SSE (Server-Sent Events) registry.
 * Maps eventId → Set of active Express Response objects.
 */

const subscriptions = new Map();

/**
 * Subscribe a response to an event's SSE channel.
 * Sets the required SSE headers and writes an initial keep-alive comment.
 */
export function subscribe(eventId, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(': connected\n\n');

  if (!subscriptions.has(eventId)) {
    subscriptions.set(eventId, new Set());
  }
  subscriptions.get(eventId).add(res);

  res.on('close', () => {
    const clients = subscriptions.get(eventId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) subscriptions.delete(eventId);
    }
  });
}

/**
 * Broadcast a JSON payload to all SSE subscribers of an event.
 */
export function broadcast(eventId, data) {
  const clients = subscriptions.get(eventId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

/** Returns the number of active subscribers for an event (useful for tests). */
export function subscriberCount(eventId) {
  return subscriptions.get(eventId)?.size ?? 0;
}
