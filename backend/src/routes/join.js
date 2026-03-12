import { Router } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { isEventLocked } from '../lib/event.js';
import { sendJoinConfirmation, sendOrganizerJoinNotification } from '../lib/invite-mailer.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/:joinToken', async (req, res) => {
  let event;
  try {
    event = await getPrisma().event.findUnique({
      where: { joinToken: req.params.joinToken },
    });
  } catch (err) {
    console.error('Failed to fetch event by joinToken:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!event) return res.status(404).json({ error: 'Join link not found' });

  const locked = isEventLocked(event);
  return res.json({
    name: event.name,
    deadline: event.deadline,
    status: locked ? 'locked' : event.status,
  });
});

router.post('/:joinToken', async (req, res) => {
  const { email, name } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'email is invalid' });
  }

  let event;
  try {
    event = await getPrisma().event.findUnique({
      where: { joinToken: req.params.joinToken },
    });
  } catch (err) {
    console.error('Failed to fetch event by joinToken:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!event) return res.status(404).json({ error: 'Join link not found' });

  if (isEventLocked(event)) {
    return res.status(403).json({ error: 'Event is locked — voting has closed' });
  }

  // Check if participant already exists (to detect new vs. returning registrations)
  let existing;
  try {
    existing = await getPrisma().participant.findUnique({
      where: { eventId_email: { eventId: event.id, email } },
    });
  } catch (err) {
    console.error('Failed to check existing participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  let participant;
  try {
    participant = await getPrisma().participant.upsert({
      where: { eventId_email: { eventId: event.id, email } },
      update: name && !existing?.name ? { name } : {},
      create: { eventId: event.id, email, name: name ?? null },
    });
  } catch (err) {
    console.error('Failed to create/fetch participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  const isNewParticipant = !existing;

  sendJoinConfirmation(participant, event).catch(err =>
    console.error('[invite-mailer] join confirmation:', err)
  );

  // Notify organizer only when a genuinely new participant registers
  if (isNewParticipant) {
    sendOrganizerJoinNotification(participant, event).catch(err =>
      console.error('[invite-mailer] organizer join notification:', err)
    );
  }

  return res.status(201).json({ participant_id: participant.id });
});

export default router;
