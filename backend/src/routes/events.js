import { Router } from 'express';
import { randomUUID } from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { getPrisma } from '../lib/prisma.js';
import { generateSlots } from '../lib/slots.js';
import { sendEventInvites, sendOrganizerCreationEmail, sendFinalizationNotifications } from '../lib/invite-mailer.js';
import { computeCentroid } from '../lib/centroid.js';
import { getCachedVenues, sortVenues, haversineDistance, MAX_VENUE_DISTANCE_M } from '../lib/venues.js';
import { subscribe } from '../lib/sse.js';

const router = Router();

// SEC-1: tight per-route limiter for irreversible admin mutations (finalize + delete)
const adminMutateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});

// SEC-2: reject cross-origin mutations; allow server-side callers (no Origin header)
function requireSameOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (!origin) return next();
  const allowed = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  if (origin !== allowed) return res.status(403).json({ error: 'Forbidden' });
  return next();
}

// Keep in sync with EMAIL_RE in frontend/src/features/setup/EventSetupForm.jsx
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidIANATimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

router.post('/', async (req, res) => {
  const {
    name,
    organizer_email,
    invite_mode = 'email_invites',
    participant_emails = [],
    date_range_start,
    date_range_end,
    time_range_start = 480,
    time_range_end = 1320,
    timezone,
    deadline,
    lang = 'en',
  } = req.body;

  if (!name || !organizer_email || !date_range_start || !date_range_end || !deadline) {
    return res.status(400).json({ error: 'Missing required fields: name, organizer_email, date_range_start, date_range_end, deadline' });
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    return res.status(400).json({ error: 'name must be a non-empty string of 200 characters or fewer' });
  }

  if (!timezone) {
    return res.status(400).json({ error: 'timezone is required' });
  }

  if (!isValidIANATimezone(timezone)) {
    return res.status(400).json({ error: 'timezone must be a valid IANA timezone string (e.g. "Europe/Paris")' });
  }

  // Normalize emails to lowercase to prevent case-sensitive duplicates
  const normalizedOrganizerEmail = organizer_email.toLowerCase();
  const normalizedParticipantEmails = Array.isArray(participant_emails)
    ? participant_emails.map(e => (typeof e === 'string' ? e.toLowerCase() : e))
    : [];

  if (!EMAIL_RE.test(normalizedOrganizerEmail)) {
    return res.status(400).json({ error: 'organizer_email is not a valid email address' });
  }
  if (!Array.isArray(participant_emails)) {
    return res.status(400).json({ error: 'participant_emails must be an array' });
  }
  const MAX_PARTICIPANT_EMAILS = 50;
  if (normalizedParticipantEmails.length > MAX_PARTICIPANT_EMAILS) {
    return res.status(400).json({ error: `participant_emails must contain ${MAX_PARTICIPANT_EMAILS} addresses or fewer` });
  }
  const invalidEmail = normalizedParticipantEmails.find(e => !EMAIL_RE.test(e));
  if (invalidEmail !== undefined) {
    return res.status(400).json({ error: `participant_emails contains an invalid address: ${invalidEmail}` });
  }

  const startDateObj = new Date(date_range_start);
  const endDateObj = new Date(date_range_end);
  if (isNaN(startDateObj.getTime())) {
    return res.status(400).json({ error: 'date_range_start is not a valid date' });
  }
  if (isNaN(endDateObj.getTime())) {
    return res.status(400).json({ error: 'date_range_end is not a valid date' });
  }
  if (endDateObj < startDateObj) {
    return res.status(400).json({ error: 'date_range_end must be on or after date_range_start' });
  }

  const deadlineObj = new Date(deadline);
  if (isNaN(deadlineObj.getTime())) {
    return res.status(400).json({ error: 'deadline is not a valid date' });
  }

  const MAX_DATE_RANGE_DAYS = 90;
  const daySpan = Math.round((endDateObj - startDateObj) / 86_400_000) + 1;
  if (daySpan > MAX_DATE_RANGE_DAYS) {
    return res.status(400).json({ error: `date range must span ${MAX_DATE_RANGE_DAYS} days or fewer` });
  }

  if (!Number.isInteger(time_range_start) || time_range_start < 0 || time_range_start > 1440) {
    return res.status(400).json({ error: 'time_range_start must be an integer between 0 and 1440' });
  }
  if (!Number.isInteger(time_range_end) || time_range_end < 0 || time_range_end > 1440) {
    return res.status(400).json({ error: 'time_range_end must be an integer between 0 and 1440' });
  }
  if (time_range_start >= time_range_end) {
    return res.status(400).json({ error: 'time_range_start must be less than time_range_end' });
  }

  const validInviteModes = ['email_invites', 'shared_link'];
  if (!validInviteModes.includes(invite_mode)) {
    return res.status(400).json({ error: `invite_mode must be one of: ${validInviteModes.join(', ')}` });
  }

  const validLangs = ['en', 'hu'];
  if (!validLangs.includes(lang)) {
    return res.status(400).json({ error: `lang must be one of: ${validLangs.join(', ')}` });
  }

  const slotData = generateSlots(date_range_start, date_range_end, time_range_start, time_range_end, timezone);

  const isSharedLink = invite_mode === 'shared_link';
  const joinToken = isSharedLink ? randomUUID() : null;
  // Organizer is always a participant. In shared_link mode, only the organizer is
  // created at event creation time; others self-register via the join link.
  const participantEmails = isSharedLink
    ? [normalizedOrganizerEmail]
    : [normalizedOrganizerEmail, ...normalizedParticipantEmails.filter(e => e !== normalizedOrganizerEmail)];

  let event;
  try {
    event = await getPrisma().event.create({
      data: {
        name,
        organizerEmail: normalizedOrganizerEmail,
        inviteMode: invite_mode,
        joinToken,
        dateRangeStart: new Date(date_range_start),
        dateRangeEnd: new Date(date_range_end),
        timeRangeStart: time_range_start,
        timeRangeEnd: time_range_end,
        timezone,
        deadline: new Date(deadline),
        lang,
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
  sendEventInvites(event).catch(err => console.error('[invite-mailer]', err));
  sendOrganizerCreationEmail(event).catch(err => console.error('[invite-mailer]', err));

  const response = {
    event_id: event.id,
    name: event.name,
    timezone: event.timezone,
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
        participants: { include: { availability: true }, orderBy: { id: 'asc' } },
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

  let centroid;
  try {
    centroid = await computeCentroid(event.participants, { prisma: getPrisma() });
  } catch (err) {
    console.error('Failed to compute centroid:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({
    id: event.id,
    name: event.name,
    timezone: event.timezone,
    deadline: event.deadline,
    status: event.status,
    slot_count: event.slots.length,
    slots: event.slots.map(s => ({ id: s.id, starts_at: s.startsAt, ends_at: s.endsAt })),
    venue_type: event.venueType ?? null,
    centroid,
    final_slot_id: event.finalSlotId ?? null,
    final_venue_name: event.finalVenueName ?? null,
    final_venue_address: event.finalVenueAddress ?? null,
    final_duration_minutes: event.finalDurationMinutes ?? null,
    final_notes: event.finalNotes ?? null,
    participants: event.participants.map(p => ({
      id: p.id,
      email: p.email,
      name: p.name ?? null,
      responded_at: p.respondedAt ?? null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      availability: p.availability.map(a => ({ slot_id: a.slotId, state: a.state })),
    })),
  });
});

router.get('/:adminToken/stream', async (req, res) => {
  let event;
  try {
    event = await getPrisma().event.findUnique({
      where: { adminToken: req.params.adminToken },
      select: { id: true },
    });
  } catch (err) {
    console.error('Failed to fetch event for stream:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  if (!event) return res.status(404).json({ error: 'Event not found' });
  subscribe(event.id, res);
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
  if (venueType.length > 100) {
    return res.status(400).json({ error: 'venue_type must be 100 characters or fewer' });
  }

  let centroid;
  try {
    centroid = await computeCentroid(event.participants, { prisma: getPrisma() });
  } catch (err) {
    console.error('Failed to compute centroid for venues:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  if (!centroid) return res.status(400).json({ error: 'No participant locations available' });

  try {
    const cached = await getPrisma().venue.findMany({
      where: { eventId: event.id, venueType },
    });

    if (cached.length > 0) {
      const recalculated = cached.map(v => ({
        ...v,
        distanceM: Math.round(haversineDistance(centroid.lat, centroid.lng, v.latitude, v.longitude)),
      }));
      const withinRange = recalculated.filter(v => v.distanceM <= MAX_VENUE_DISTANCE_M);
      return res.json({ venues: sortVenues(withinRange.map(toVenueDto)) });
    }

    const fetched = await getCachedVenues(venueType, centroid.lat, centroid.lng);
    if (fetched.length > 0) {
      await getPrisma().venue.createMany({
        data: fetched.map(v => ({ ...v, eventId: event.id, venueType })),
        skipDuplicates: true,
      });
    }

    const stored = await getPrisma().venue.findMany({
      where: { eventId: event.id, venueType },
    });
    const withinRange = stored.filter(v => v.distanceM <= MAX_VENUE_DISTANCE_M);
    return res.json({ venues: sortVenues(withinRange.map(toVenueDto)) });
  } catch (err) {
    console.error('Failed to fetch venues:', err);
    return res.status(502).json({ error: 'Venue service unavailable' });
  }
});

router.post('/:adminToken/finalize', adminMutateLimiter, requireSameOrigin, async (req, res) => {
  const { adminToken } = req.params;
  const { slot_id, venue_id, venue_name, venue_address, duration_minutes, notes } = req.body;

  if (!slot_id) {
    return res.status(400).json({ error: 'slot_id is required' });
  }

  const trimmedVenueName = typeof venue_name === 'string' ? venue_name.trim() : venue_name;
  const trimmedVenueAddress = typeof venue_address === 'string' ? venue_address.trim() : venue_address;

  if (typeof notes === 'string' && notes.length > 2000) {
    return res.status(400).json({ error: 'notes must be 2000 characters or fewer' });
  }
  if (typeof venue_name === 'string' && venue_name.length > 300) {
    return res.status(400).json({ error: 'venue_name must be 300 characters or fewer' });
  }
  if (typeof venue_address === 'string' && venue_address.length > 500) {
    return res.status(400).json({ error: 'venue_address must be 500 characters or fewer' });
  }

  // Exactly one venue form must be provided (or neither for TBD)
  if (venue_id && trimmedVenueName) {
    return res.status(400).json({ error: 'Provide either venue_id or venue_name/venue_address, not both' });
  }
  if (venue_name !== undefined && !trimmedVenueName) {
    return res.status(400).json({ error: 'venue_name must not be empty when provided' });
  }

  if (duration_minutes !== undefined) {
    const dm = Number(duration_minutes);
    if (!Number.isInteger(dm) || dm <= 0) {
      return res.status(400).json({ error: 'duration_minutes must be a positive integer' });
    }
  }

  let event;
  try {
    event = await getPrisma().event.findUnique({
      where: { adminToken },
      include: { participants: true },
    });
  } catch (err) {
    console.error('Failed to fetch event for finalize:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status === 'finalized') return res.status(409).json({ error: 'Event is already finalized' });

  let slot, venue;
  try {
    // Validate slot belongs to this event
    slot = await getPrisma().slot.findFirst({ where: { id: slot_id, eventId: event.id } });
    if (!slot) return res.status(400).json({ error: 'slot_id not found for this event' });

    // Validate venue_id if provided
    venue = null;
    if (venue_id) {
      venue = await getPrisma().venue.findFirst({ where: { id: venue_id, eventId: event.id } });
      if (!venue) return res.status(400).json({ error: 'venue_id not found for this event' });
    }
  } catch (err) {
    console.error('Failed to validate slot/venue for finalize:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : null;
    const updatedEvent = await getPrisma().event.update({
      where: { id: event.id },
      data: {
        status: 'finalized',
        finalSlotId: slot_id,
        finalVenueId: venue_id ?? null,
        finalVenueName: trimmedVenueName ?? venue?.name ?? null,
        finalVenueAddress: trimmedVenueAddress ?? venue?.address ?? null,
        finalDurationMinutes: duration_minutes != null ? Number(duration_minutes) : null,
        finalNotes: trimmedNotes || null,
      },
    });
    // Attach updated fields so notifications can use them
    event.finalVenueName = updatedEvent.finalVenueName;
    event.finalVenueAddress = updatedEvent.finalVenueAddress;
    event.finalDurationMinutes = updatedEvent.finalDurationMinutes;
    event.finalNotes = updatedEvent.finalNotes;
  } catch (err) {
    console.error('Failed to finalize event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Fire-and-forget notifications with ICS attachment
  sendFinalizationNotifications(event, slot, venue).catch(err =>
    console.error('[finalize-mailer]', err)
  );

  return res.json({ ok: true, status: 'finalized' });
});

router.delete('/:adminToken', adminMutateLimiter, requireSameOrigin, async (req, res) => {
  const { adminToken } = req.params;

  let event;
  try {
    event = await getPrisma().event.findUnique({
      where: { adminToken },
      select: { id: true, name: true, organizerEmail: true, status: true, createdAt: true },
    });
  } catch (err) {
    console.error('Failed to fetch event for deletion:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!event) return res.status(404).json({ error: 'Event not found' });

  // SEC-3: log event data before hard delete (audit trail; adminToken intentionally omitted)
  console.log('[admin-delete] Deleting event', {
    id: event.id,
    name: event.name,
    organizerEmail: event.organizerEmail,
    status: event.status,
    createdAt: event.createdAt,
  });

  try {
    await getPrisma().event.delete({ where: { id: event.id } });
  } catch (err) {
    console.error('Failed to delete event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true });
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
    website: v.website ?? null,
    address: v.address ?? null,
  };
}

export default router;
