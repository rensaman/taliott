import { Router } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { isEventLocked } from '../lib/event.js';
import { computeHeatmap } from '../lib/heatmap.js';
import { computeCentroid } from '../lib/centroid.js';
import { broadcast } from '../lib/sse.js';

const router = Router();

const VALID_STATES = ['yes', 'maybe', 'no', 'neutral'];

router.get('/:participantId', async (req, res) => {
  let participant;
  try {
    participant = await getPrisma().participant.findUnique({
      where: { id: req.params.participantId },
      include: {
        event: {
          include: {
            slots: { orderBy: { startsAt: 'asc' } },
          },
        },
        availability: true,
      },
    });
  } catch (err) {
    console.error('Failed to fetch participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  const locked = isEventLocked(participant.event);

  const [heatmap, allParticipants] = await Promise.all([
    computeHeatmap(getPrisma(), participant.event.id),
    getPrisma().participant.findMany({
      where: { eventId: participant.event.id },
      select: { latitude: true, longitude: true },
    }),
  ]);
  const centroid = await computeCentroid(allParticipants, { prisma: getPrisma() });

  // Resolve final slot and venue when event is finalized
  let finalSlot = null;
  let finalVenue = null;
  if (participant.event.status === 'finalized') {
    if (participant.event.finalSlotId) {
      const slot = participant.event.slots.find(s => s.id === participant.event.finalSlotId);
      if (slot) finalSlot = { id: slot.id, starts_at: slot.startsAt, ends_at: slot.endsAt };
    }
    if (participant.event.finalVenueId) {
      const venueRow = await getPrisma().venue.findUnique({ where: { id: participant.event.finalVenueId } });
      if (venueRow) {
        finalVenue = { name: venueRow.name, address: null };
      }
    } else if (participant.event.finalVenueName) {
      finalVenue = {
        name: participant.event.finalVenueName,
        address: participant.event.finalVenueAddress ?? null,
      };
    }
  }

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
      name: participant.name,
      email: participant.email,
      latitude: participant.latitude,
      longitude: participant.longitude,
      address_label: participant.addressLabel,
      travel_mode: participant.travelMode,
      responded_at: participant.respondedAt,
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
    heatmap,
    centroid,
    finalSlot,
    finalVenue,
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

  // Broadcast heatmap update to all subscribers of this event
  computeHeatmap(getPrisma(), participant.event.id)
    .then(heatmap => broadcast(participant.event.id, { type: 'availability', heatmap }))
    .catch(err => console.error('[sse] heatmap broadcast failed:', err));

  return res.json({ ok: true });
});

router.patch('/:participantId/name', async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (name.trim().length > 200) {
    return res.status(400).json({ error: 'name must be 200 characters or fewer' });
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
      data: { name: name.trim() },
    });
  } catch (err) {
    console.error('Failed to update name:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
});

router.patch('/:participantId/location', async (req, res) => {
  const { latitude, longitude, address_label } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'latitude and longitude must be numbers' });
  }
  if (!isFinite(latitude) || !isFinite(longitude)) {
    return res.status(400).json({ error: 'latitude and longitude must be finite numbers' });
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
      },
    });
  } catch (err) {
    console.error('Failed to update location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Broadcast centroid update to all subscribers of this event
  getPrisma().participant.findMany({
    where: { eventId: participant.event.id },
    select: { latitude: true, longitude: true },
  })
    .then(async participants => {
      const centroid = await computeCentroid(participants, { prisma: getPrisma() });
      broadcast(participant.event.id, { type: 'location', centroid });
    })
    .catch(err => console.error('[sse] centroid broadcast failed:', err));

  return res.json({ ok: true });
});

const VALID_TRAVEL_MODES = ['walking', 'cycling', 'driving', 'transit'];

router.patch('/:participantId/travel-mode', async (req, res) => {
  const { travel_mode } = req.body;

  if (!VALID_TRAVEL_MODES.includes(travel_mode)) {
    return res.status(400).json({
      error: `travel_mode must be one of: ${VALID_TRAVEL_MODES.join(', ')}`,
    });
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
      data: { travelMode: travel_mode },
    });
  } catch (err) {
    console.error('Failed to update travel mode:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
});

router.patch('/:participantId/confirm', async (req, res) => {
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
      data: { respondedAt: new Date() },
    });
  } catch (err) {
    console.error('Failed to confirm participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
});

export default router;
