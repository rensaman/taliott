/**
 * POST /api/resend-link — Link Recovery (US 1.7)
 * Always returns 200 to prevent user enumeration.
 * Rate-limited to 3 requests per email per 15 minutes.
 */
import { Router } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/mailer.js';
import { buildOrganizerCreationEmail, buildParticipantInvite } from '../lib/invite-mailer.js';

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

  if (isRateLimited(email)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const prisma = getPrisma();

  // Find events where this email is the organizer (with participants for email builder)
  const organizerEvents = await prisma.event.findMany({
    where: { organizerEmail: email },
    include: { participants: true },
  });

  // Find participant records where this email matches
  const participants = await prisma.participant.findMany({
    where: { email },
    include: { event: true },
  });

  // Send admin recovery email for each organizer match
  for (const event of organizerEvents) {
    await sendEmail(buildOrganizerCreationEmail(event));
  }

  // Send participation link recovery email for each participant match
  for (const participant of participants) {
    await sendEmail(buildParticipantInvite(participant, participant.event));
  }

  return res.json({ ok: true });
});

export default router;
