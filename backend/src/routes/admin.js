/**
 * Dev/test-only admin routes.
 * Registered only when NODE_ENV !== 'production'.
 */
import { Router } from 'express';
import { processExpiredEvents } from '../lib/deadline-worker.js';
import { getPrisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/mailer.js';

const router = Router();

// Manually trigger the deadline worker — useful for E2E tests and local dev.
router.post('/run-deadline-worker', async (req, res) => {
  try {
    const locked = await processExpiredEvents(getPrisma(), { sendEmail });
    res.json({ locked });
  } catch (err) {
    console.error('[admin] run-deadline-worker error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
