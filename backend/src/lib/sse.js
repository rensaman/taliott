/**
 * In-memory SSE (Server-Sent Events) registry.
 * Maps eventId → Set of active Express Response objects.
 */

const subscriptions = new Map();

/**
 * Subscribe a response to an event's SSE channel.
 * Sets the required SSE headers, writes an initial keep-alive comment,
 * and starts a heartbeat to detect dead connections.
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

  function cleanup() {
    clearInterval(keepAlive);
    const clients = subscriptions.get(eventId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) subscriptions.delete(eventId);
    }
  }

  // Heartbeat every 25 s; also detects connections broken without a close event
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      cleanup();
    }
  }, 25_000);
  if (keepAlive.unref) keepAlive.unref();

  res.on('close', cleanup);
}

/**
 * Broadcast a JSON payload to all SSE subscribers of an event.
 * Dead subscribers (write throws) are removed automatically.
 */
export function broadcast(eventId, data) {
  const clients = subscriptions.get(eventId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch (err) {
      console.error('[sse] removing dead subscriber after write error:', err.message);
      clients.delete(res);
    }
  }
  if (clients.size === 0) subscriptions.delete(eventId);
}

/** Returns the number of active subscribers for an event (useful for tests). */
export function subscriberCount(eventId) {
  return subscriptions.get(eventId)?.size ?? 0;
}

/** Exposed for testing only. */
export { subscriptions };
