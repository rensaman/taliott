import { Router } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { isEventLocked } from '../lib/event.js';

const router = Router();

const VALID_STATES = ['yes', 'maybe', 'no', 'neutral'];

router.get('/:participantId', async (req, res) => {
  let participant;
  try {
    participant = await getPrisma().participant.findUnique({
      where: { id: req.params.participantId },
      include: {
        event: { include: { slots: { orderBy: { startsAt: 'asc' } } } },
        availability: true,
      },
    });
  } catch (err) {
    console.error('Failed to fetch participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  const locked = isEventLocked(participant.event);

  return res.json({
    event: {
      id: participant.event.id,
      name: participant.event.name,
      deadline: participant.event.deadline,
      status: participant.event.status,
      locked,
    },
    participant: { id: participant.id, email: participant.email },
    slots: participant.event.slots.map(s => ({
      id: s.id,
      starts_at: s.startsAt,
      ends_at: s.endsAt,
    })),
    availability: participant.availability.map(a => ({
      slot_id: a.slotId,
      state: a.state,
    })),
  });
});

router.patch('/:participantId/availability', async (req, res) => {
  let participant;
  try {
    participant = await getPrisma().participant.findUnique({
      where: { id: req.params.participantId },
      include: { event: true },
    });
  } catch (err) {
    console.error('Failed to fetch participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  if (isEventLocked(participant.event)) {
    return res.status(403).json({ error: 'Event is locked — voting deadline has passed' });
  }

  const { availability } = req.body;
  if (!Array.isArray(availability)) {
    return res.status(400).json({ error: 'availability must be an array' });
  }

  for (const { slot_id, state } of availability) {
    if (!VALID_STATES.includes(state)) {
      return res.status(400).json({
        error: `Invalid state "${state}". Must be one of: ${VALID_STATES.join(', ')}`,
      });
    }
  }

  try {
    for (const { slot_id, state } of availability) {
      await getPrisma().availability.upsert({
        where: { participantId_slotId: { participantId: participant.id, slotId: slot_id } },
        update: { state },
        create: { participantId: participant.id, slotId: slot_id, state },
      });
    }
  } catch (err) {
    console.error('Failed to upsert availability:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
});

export default router;
