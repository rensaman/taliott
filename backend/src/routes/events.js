import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getPrisma } from '../lib/prisma.js';
import { generateSlots } from '../lib/slots.js';
import { sendEventInvites, sendOrganizerConfirmation } from '../lib/invite-mailer.js';
import { computeCentroid } from '../lib/centroid.js';
import { fetchVenuesFromOverpass, sortVenues } from '../lib/venues.js';

const router = Router();

router.post('/', async (req, res) => {
  const {
    name,
    organizer_email,
    invite_mode = 'email_invites',
    participant_emails = [],
    date_range_start,
    date_range_end,
    part_of_day = 'all',
    venue_type,
    deadline,
  } = req.body;

  if (!name || !organizer_email || !date_range_start || !date_range_end || !deadline) {
    return res.status(400).json({ error: 'Missing required fields: name, organizer_email, date_range_start, date_range_end, deadline' });
  }

  if (new Date(date_range_end) < new Date(date_range_start)) {
    return res.status(400).json({ error: 'date_range_end must be on or after date_range_start' });
  }

  const validPartOfDay = ['morning', 'afternoon', 'evening', 'all'];
  if (!validPartOfDay.includes(part_of_day)) {
    return res.status(400).json({ error: `part_of_day must be one of: ${validPartOfDay.join(', ')}` });
  }

  const validInviteModes = ['email_invites', 'shared_link'];
  if (!validInviteModes.includes(invite_mode)) {
    return res.status(400).json({ error: `invite_mode must be one of: ${validInviteModes.join(', ')}` });
  }

  const slotData = generateSlots(date_range_start, date_range_end, part_of_day);

  const isSharedLink = invite_mode === 'shared_link';
  const joinToken = isSharedLink ? randomUUID() : null;
  const participantEmails = isSharedLink
    ? []
    : [organizer_email, ...participant_emails.filter(e => e !== organizer_email)];

  let event;
  try {
    event = await getPrisma().event.create({
      data: {
        name,
        organizerEmail: organizer_email,
        inviteMode: invite_mode,
        joinToken,
        dateRangeStart: new Date(date_range_start),
        dateRangeEnd: new Date(date_range_end),
        partOfDay: part_of_day,
        venueType: venue_type ?? null,
        deadline: new Date(deadline),
        status: 'open',
        slots: { create: slotData },
        participants: { create: participantEmails.map(email => ({ email })) },
      },
      include: {
        slots: { orderBy: { startsAt: 'asc' } },
        participants: true,
      },
    });
  } catch (err) {
    console.error('Failed to create event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Fire-and-forget — emails are best-effort; don't block the response
  if (!isSharedLink) {
    sendEventInvites(event).catch(err => console.error('[invite-mailer]', err));
  }
  sendOrganizerConfirmation(event).catch(err => console.error('[invite-mailer]', err));

  const response = {
    event_id: event.id,
    name: event.name,
    admin_token: event.adminToken,
    slots: event.slots.map(s => ({ id: s.id, starts_at: s.startsAt, ends_at: s.endsAt })),
    participants: event.participants.map(p => ({ id: p.id, email: p.email })),
  };
  if (event.joinToken) {
    response.join_url = `/join/${event.joinToken}`;
  }
  return res.status(201).json(response);
});

router.get('/:adminToken', async (req, res) => {
  const { adminToken } = req.params;

  let event;
  try {
    event = await getPrisma().event.findUnique({
      where: { adminToken },
      include: {
        participants: { orderBy: { id: 'asc' } },
        slots: true,
      },
    });
  } catch (err) {
    console.error('Failed to fetch event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const centroid = computeCentroid(event.participants);

  return res.json({
    name: event.name,
    deadline: event.deadline,
    status: event.status,
    slot_count: event.slots.length,
    venue_type: event.venueType ?? null,
    centroid,
    participants: event.participants.map(p => ({
      id: p.id,
      email: p.email,
      responded_at: p.respondedAt ?? null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
    })),
  });
});

router.get('/:adminToken/venues', async (req, res) => {
  const { adminToken } = req.params;
  const venueTypeOverride = req.query.venue_type;

  let event;
  try {
    event = await getPrisma().event.findUnique({
      where: { adminToken },
      include: { participants: true },
    });
  } catch (err) {
    console.error('Failed to fetch event for venues:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!event) return res.status(404).json({ error: 'Event not found' });

  const venueType = venueTypeOverride || event.venueType;
  if (!venueType) return res.status(400).json({ error: 'No venue type set for this event' });
  if (!/^[a-z0-9_-]+$/i.test(venueType)) {
    return res.status(400).json({ error: 'Invalid venue type format' });
  }

  const centroid = computeCentroid(event.participants);
  if (!centroid) return res.status(400).json({ error: 'No participant locations available' });

  try {
    const cached = await getPrisma().venue.findMany({
      where: { eventId: event.id, venueType },
    });

    if (cached.length > 0) {
      return res.json({ venues: sortVenues(cached.map(toVenueDto)) });
    }

    const fetched = await fetchVenuesFromOverpass(venueType, centroid.lat, centroid.lng);
    if (fetched.length > 0) {
      await getPrisma().venue.createMany({
        data: fetched.map(v => ({ ...v, eventId: event.id, venueType })),
        skipDuplicates: true,
      });
    }

    const stored = await getPrisma().venue.findMany({
      where: { eventId: event.id, venueType },
    });
    return res.json({ venues: sortVenues(stored.map(toVenueDto)) });
  } catch (err) {
    console.error('Failed to fetch venues:', err);
    return res.status(502).json({ error: 'Venue service unavailable' });
  }
});

function toVenueDto(v) {
  return {
    id: v.id,
    externalId: v.externalId,
    name: v.name,
    latitude: v.latitude,
    longitude: v.longitude,
    rating: v.rating,
    distanceM: v.distanceM,
  };
}

export default router;
