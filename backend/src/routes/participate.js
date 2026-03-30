import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getPrisma } from '../lib/prisma.js';
import { isEventLocked } from '../lib/event.js';
import { computeHeatmap } from '../lib/heatmap.js';
import { computeCentroid } from '../lib/centroid.js';
import { broadcast } from '../lib/sse.js';
import { sendParticipantDeletionConfirmation } from '../lib/invite-mailer.js';

const router = Router();

// SEC-4: tight per-route limiter for the irreversible GDPR erasure operation
const erasureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});

const VALID_STATES = ['yes', 'maybe', 'no', 'neutral'];

// Middleware: fetch participant with event, verify not locked, set req.participant
async function requireUnlockedParticipant(req, res, next) {
  try {
    const participant = await getPrisma().participant.findUnique({
      where: { id: req.params.participantId },
      include: { event: true },
    });
    if (!participant) return res.status(404).json({ error: 'Participant not found' });
    if (isEventLocked(participant.event)) {
      return res.status(403).json({ error: 'Event is locked — voting deadline has passed' });
    }
    req.participant = participant;
    next();
  } catch (err) {
    console.error('Failed to fetch participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

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
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        travelMode: true,
        respondedAt: true,
        availability: { select: { slotId: true, state: true } },
      },
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
      timezone: participant.event.timezone,
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
    // Coordinates are omitted for other participants — the centroid and heatmap
    // convey the group's geography without exposing individual departure addresses.
    // The requesting participant's own coordinates are returned in the participant field above.
    participants: allParticipants.map(p => ({
      id: p.id,
      name: p.name,
      responded_at: p.respondedAt,
      availability: p.availability.map(a => ({ slot_id: a.slotId, state: a.state })),
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
    await Promise.all(availability.map(({ slot_id, state }) =>
      getPrisma().availability.upsert({
        where: { participantId_slotId: { participantId: participant.id, slotId: slot_id } },
        update: { state },
        create: { participantId: participant.id, slotId: slot_id, state },
      })
    ));
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

router.patch('/:participantId/name', requireUnlockedParticipant, async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (name.trim().length > 200) {
    return res.status(400).json({ error: 'name must be 200 characters or fewer' });
  }

  try {
    await getPrisma().participant.update({
      where: { id: req.participant.id },
      data: { name: name.trim() },
    });
  } catch (err) {
    console.error('Failed to update name:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
});

router.patch('/:participantId/location', requireUnlockedParticipant, async (req, res) => {
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
  if (address_label != null && (typeof address_label !== 'string' || address_label.length > 500)) {
    return res.status(400).json({ error: 'address_label must be a string of 500 characters or fewer' });
  }

  const { participant } = req;

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

  // Invalidate venue cache — centroid has shifted, next request re-fetches from Overpass
  try {
    await getPrisma().venue.deleteMany({ where: { eventId: participant.event.id } });
  } catch (err) {
    console.error('Failed to invalidate venue cache:', err);
  }

  // Broadcast centroid update to all subscribers of this event
  getPrisma().participant.findMany({
    where: { eventId: participant.event.id },
    select: { latitude: true, longitude: true, travelMode: true },
  })
    .then(async participants => {
      const centroid = await computeCentroid(participants, { prisma: getPrisma() });
      broadcast(participant.event.id, { type: 'location', centroid });
    })
    .catch(err => console.error('[sse] centroid broadcast failed:', err));

  return res.json({ ok: true });
});

const VALID_TRAVEL_MODES = ['walking', 'cycling', 'driving', 'transit'];

router.patch('/:participantId/travel-mode', requireUnlockedParticipant, async (req, res) => {
  const { travel_mode } = req.body;

  if (!VALID_TRAVEL_MODES.includes(travel_mode)) {
    return res.status(400).json({
      error: `travel_mode must be one of: ${VALID_TRAVEL_MODES.join(', ')}`,
    });
  }

  const { participant } = req;

  try {
    await getPrisma().participant.update({
      where: { id: participant.id },
      data: { travelMode: travel_mode },
    });
  } catch (err) {
    console.error('Failed to update travel mode:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Invalidate venue cache — travel mode shifts the centroid, next request re-fetches from Overpass
  try {
    await getPrisma().venue.deleteMany({ where: { eventId: participant.event.id } });
  } catch (err) {
    console.error('Failed to invalidate venue cache:', err);
  }

  // Broadcast centroid update — travel mode affects routing weights
  getPrisma().participant.findMany({
    where: { eventId: participant.event.id },
    select: { latitude: true, longitude: true, travelMode: true },
  })
    .then(async participants => {
      const centroid = await computeCentroid(participants, { prisma: getPrisma() });
      broadcast(participant.event.id, { type: 'location', centroid });
    })
    .catch(err => console.error('[sse] centroid broadcast failed:', err));

  return res.json({ ok: true });
});

// Threat model: export requires only a valid participantId (UUID). Risk is low because
// participantIds are never shown publicly and are only delivered via personal invite
// email. Anyone with the URL already has full participation access (S-4). A one-time
// export token is not implemented; if the participantId is treated as private, this is
// acceptable.
router.get('/:participantId/export', async (req, res) => {
  let participant;
  try {
    participant = await getPrisma().participant.findUnique({
      where: { id: req.params.participantId },
      include: {
        event: { select: { name: true, deadline: true } },
        availability: { select: { slotId: true, state: true, updatedAt: true } },
      },
    });
  } catch (err) {
    console.error('Failed to fetch participant for export:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  return res.json({
    participant_id: participant.id,
    email: participant.email,
    name: participant.name,
    location: participant.latitude != null ? {
      latitude: participant.latitude,
      longitude: participant.longitude,
      address_label: participant.addressLabel,
    } : null,
    travel_mode: participant.travelMode,
    responded_at: participant.respondedAt,
    event: {
      name: participant.event.name,
      deadline: participant.event.deadline,
    },
    availability: participant.availability,
  });
});

// GDPR right-to-erasure: deletion is intentionally allowed regardless of event status
// (locked, finalized) because GDPR Art. 17 applies at any time. If a participant
// erases data after finalization, their availability rows are removed and their name
// is nulled, but the event result is not changed. This is an accepted trade-off.
router.delete('/:participantId', erasureLimiter, async (req, res) => {
  let participant;
  try {
    participant = await getPrisma().participant.findUnique({
      where: { id: req.params.participantId },
      include: { event: true },
    });
  } catch (err) {
    console.error('Failed to fetch participant for deletion:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  // Capture original email before anonymisation for the deletion confirmation
  const originalEmail = participant.email;
  const isAlreadyDeleted = originalEmail.endsWith('@deleted.invalid');

  // SEC-5: audit log for GDPR erasure (non-personal metadata only; mirrors event-delete audit trail)
  console.log('[gdpr-erasure] Anonymising participant', {
    id: participant.id,
    eventId: participant.eventId,
    travelMode: participant.travelMode,
    respondedAt: participant.respondedAt,
  });

  try {
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { participantId: participant.id } });
      await tx.participant.update({
        where: { id: participant.id },
        data: {
          email: `deleted-${participant.id}@deleted.invalid`,
          name: null,
          latitude: null,
          longitude: null,
          addressLabel: null,
          respondedAt: null,
          travelMode: 'transit', // SEC-1: reset to default — travelMode can indirectly profile a deleted participant
        },
      });
    });
  } catch (err) {
    console.error('Failed to anonymise participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // UX-2: GDPR Art. 12(3) — notify participant of erasure; skip if already deleted
  if (!isAlreadyDeleted && participant.event) {
    sendParticipantDeletionConfirmation(originalEmail, participant.event)
      .catch(err => console.error('[deletion-mailer]', err));
  }

  return res.json({ ok: true });
});

router.patch('/:participantId/confirm', requireUnlockedParticipant, async (req, res) => {
  try {
    await getPrisma().participant.update({
      where: { id: req.participant.id },
      data: { respondedAt: new Date() },
    });
  } catch (err) {
    console.error('Failed to confirm participant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
});

export default router;
