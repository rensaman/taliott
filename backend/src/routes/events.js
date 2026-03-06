import { Router } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { generateSlots } from '../lib/slots.js';

const router = Router();

router.post('/', async (req, res) => {
  const {
    name,
    organizer_email,
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

  const slotData = generateSlots(date_range_start, date_range_end, part_of_day);

  const allEmails = [organizer_email, ...participant_emails.filter(e => e !== organizer_email)];

  let event;
  try {
    event = await getPrisma().event.create({
      data: {
        name,
        organizerEmail: organizer_email,
        dateRangeStart: new Date(date_range_start),
        dateRangeEnd: new Date(date_range_end),
        partOfDay: part_of_day,
        venueType: venue_type ?? null,
        deadline: new Date(deadline),
        status: 'open',
        slots: { create: slotData },
        participants: { create: allEmails.map(email => ({ email })) },
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

  return res.status(201).json({
    event_id: event.id,
    name: event.name,
    admin_token: event.adminToken,
    slots: event.slots.map(s => ({ id: s.id, starts_at: s.startsAt, ends_at: s.endsAt })),
    participants: event.participants.map(p => ({ id: p.id, email: p.email })),
  });
});

export default router;
