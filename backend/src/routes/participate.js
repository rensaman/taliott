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
    participant: {
      id: participant.id,
      email: participant.email,
      latitude: participant.latitude,
      longitude: participant.longitude,
      address_label: participant.addressLabel,
    },
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
      include: { event: { include: { slots: { select: { id: true } } } } },
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
    if (typeof slot_id !== 'string' || !slot_id) {
      return res.status(400).json({ error: 'slot_id must be a non-empty string' });
    }
    if (!VALID_STATES.includes(state)) {
      return res.status(400).json({
        error: `Invalid state "${state}". Must be one of: ${VALID_STATES.join(', ')}`,
      });
    }
  }

  const eventSlotIds = new Set(participant.event.slots.map(s => s.id));
  for (const { slot_id } of availability) {
    if (!eventSlotIds.has(slot_id)) {
      return res.status(400).json({ error: `slot_id "${slot_id}" does not belong to this event` });
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

router.patch('/:participantId/location', async (req, res) => {
  const { latitude, longitude, address_label } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'latitude and longitude must be numbers' });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'latitude or longitude out of valid range' });
  }

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

  try {
    await getPrisma().participant.update({
      where: { id: participant.id },
      data: {
        latitude,
        longitude,
        addressLabel: address_label ?? null,
        respondedAt: participant.respondedAt ?? new Date(),
      },
    });
  } catch (err) {
    console.error('Failed to update location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
});

export default router;
