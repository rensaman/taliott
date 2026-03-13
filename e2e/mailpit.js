const MAILPIT_API = 'http://localhost:8025/api/v1';

/** Delete all messages from Mailpit. */
export async function clearMailpit() {
  await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' });
}

/**
 * Poll Mailpit until an email to `toAddress` arrives.
 * Returns the message summary object from the Mailpit API.
 *
 * @param {string} toAddress
 * @param {{ timeout?: number, subject?: string, since?: Date }} opts
 *   since — only return messages created at or after this Date (use to avoid
 *   interference from parallel tests without needing clearMailpit).
 */
export async function waitForEmail(toAddress, { timeout = 5_000, subject, since } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_API}/messages`);
    const data = await res.json();
    const match = data.messages?.find(m =>
      m.To?.some(t => t.Address === toAddress) &&
      (subject === undefined || m.Subject?.includes(subject)) &&
      (since === undefined || new Date(m.Created) >= since)
    );
    if (match) return match;
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for email to "${toAddress}"${subject ? ` with subject containing "${subject}"` : ''}`);
}
