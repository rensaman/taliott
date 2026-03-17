import { Router } from 'express';
import { getPrisma } from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { score, comment, context } = req.body;

  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 10) {
    return res.status(400).json({ error: 'score must be an integer 0–10' });
  }

  try {
    await getPrisma().feedback.create({
      data: {
        score,
        comment: typeof comment === 'string' ? comment.slice(0, 1000) : null,
        context: typeof context === 'string' ? context.slice(0, 50) : 'unknown',
      },
    });
  } catch (err) {
    console.error('Failed to save feedback:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.status(204).end();
});

export default router;
