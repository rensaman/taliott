/**
 * POST /api/resend-link — Link Recovery (US 1.7)
 * Always returns 200 to prevent user enumeration.
 * Rate-limited to 3 requests per email per 15 minutes.
 */
import { Router } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/mailer.js';
import { buildOrganizerLinkRecoveryEmail, buildParticipantInvite } from '../lib/invite-mailer.js';

const router = Router();

// In-memory rate limit store: email -> [timestamp, ...]
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Exported for test teardown only. */
export function clearRateLimitStore() {
  rateLimitStore.clear();
}

function sweepExpiredEntries() {
  const now = Date.now();
  for (const [email, timestamps] of rateLimitStore.entries()) {
    const active = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (active.length === 0) {
      rateLimitStore.delete(email);
    } else {
      rateLimitStore.set(email, active);
    }
  }
}

const _sweepTimer = setInterval(sweepExpiredEntries, 30 * 60 * 1000);
if (_sweepTimer.unref) _sweepTimer.unref();

function isRateLimited(email) {
  const now = Date.now();
  const prev = (rateLimitStore.get(email) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (prev.length >= RATE_LIMIT_MAX) return true;
  rateLimitStore.set(email, [...prev, now]);
  return false;
}

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  // Basic format check to avoid DB queries on garbage input (S-3)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (isRateLimited(email)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const prisma = getPrisma();

  // Find events where this email is the organizer (with participants for email builder)
  const organizerEvents = await prisma.event.findMany({
    where: { organizerEmail: email },
    include: { participants: true, slots: true },
  });

  // Find participant records where this email matches
  const participants = await prisma.participant.findMany({
    where: { email },
    include: { event: { include: { slots: true } } },
  });

  // Only send links for events that haven't happened yet: exclude finalized events
  // whose final slot start time is already in the past.
  const now = new Date();
  function eventHasNotHappened(event) {
    if (event.status !== 'finalized' || !event.finalSlotId) return true;
    const finalSlot = event.slots.find(s => s.id === event.finalSlotId);
    return !finalSlot || finalSlot.startsAt > now;
  }

  // Send all recovery emails in parallel; failures do not block other sends
  await Promise.allSettled([
    ...organizerEvents
      .filter(event => eventHasNotHappened(event))
      .map(event => sendEmail(buildOrganizerLinkRecoveryEmail(event))),
    ...participants
      .filter(p => eventHasNotHappened(p.event))
      .map(participant => sendEmail(buildParticipantInvite(participant, participant.event))),
  ]);

  return res.json({ ok: true });
});

export default router;
