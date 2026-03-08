/**
 * Integration tests for POST /api/events/:adminToken/finalize (US 3.3)
 * Requires the test DB: npm run test:integration
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';
import { sendEmail } from '../../src/lib/mailer.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const createdEventIds = [];

const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

const BASE_EVENT = {
  name: 'Finalize Test Event',
  organizer_email: 'organizer@example.com',
  participant_emails: ['alice@example.com', 'bob@example.com'],
  date_range_start: '2025-06-15',
  date_range_end: '2025-06-15',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: FUTURE_DEADLINE,
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({ ...BASE_EVENT, ...overrides });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

describe('POST /api/events/:adminToken/finalize', () => {
  it('returns 404 for unknown admin token', async () => {
    const res = await request(app)
      .post('/api/events/00000000-0000-0000-0000-000000000000/finalize')
      .send({ slot_id: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when slot_id is missing', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for a slot_id not belonging to this event', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: '00000000-0000-0000-0000-000000000099' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/slot_id/i);
  });

  it('sets event status to finalized', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('finalized');

    const dashboard = await request(app).get(`/api/events/${admin_token}`);
    expect(dashboard.body.status).toBe('finalized');
  });

  it('stores final_slot_id on the event', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    const event = await prisma.event.findFirst({ where: { adminToken: admin_token } });
    expect(event.finalSlotId).toBe(slotId);
  });

  it('returns 409 when event is already finalized', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    expect(res.status).toBe(409);
  });

  it('enqueues notifications for all participants and organizer', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    // Allow fire-and-forget promises to settle
    await new Promise(r => setTimeout(r, 50));

    // 3 participants (organizer + alice + bob) + 1 organizer notification = 4 emails
    // (organizer gets one as participant, one as organizer finalization)
    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('organizer@example.com');
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
  });

  it('sends emails with ICS attachment', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    // Clear mocks after event creation so only finalization emails are captured
    vi.clearAllMocks();

    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    await new Promise(r => setTimeout(r, 50));

    expect(sendEmail).toHaveBeenCalled();
    for (const [msg] of sendEmail.mock.calls) {
      expect(msg.attachments).toBeDefined();
      expect(msg.attachments[0].filename).toBe('event.ics');
      expect(msg.attachments[0].content).toContain('BEGIN:VCALENDAR');
    }
  });
});

describe('PATCH availability after finalization returns 403', () => {
  it('blocks availability updates on finalized event', async () => {
    const { admin_token, slots, participants } = await createEvent();
    const slotId = slots[0].id;
    const participantId = participants[0].id;

    // Finalize the event
    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    // Attempt to update availability
    const res = await request(app)
      .patch(`/api/participate/${participantId}/availability`)
      .send({ availability: [{ slot_id: slotId, state: 'yes' }] });

    expect(res.status).toBe(403);
  });

  it('blocks location updates on finalized event', async () => {
    const { admin_token, slots, participants } = await createEvent();
    const slotId = slots[0].id;
    const participantId = participants[0].id;

    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId });

    const res = await request(app)
      .patch(`/api/participate/${participantId}/location`)
      .send({ latitude: 51.5, longitude: -0.1 });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/events/:adminToken/finalize — custom venue', () => {
  it('accepts venue_name + venue_address and stores them', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId, venue_name: 'The Grand Hall', venue_address: '1 Main St' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const event = await prisma.event.findFirst({ where: { adminToken: admin_token } });
    expect(event.finalVenueName).toBe('The Grand Hall');
    expect(event.finalVenueAddress).toBe('1 Main St');
    expect(event.finalVenueId).toBeNull();
  });

  it('returns 400 when both venue_id and venue_name are provided', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    const res = await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId, venue_id: '00000000-0000-0000-0000-000000000001', venue_name: 'A Place' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/venue/i);
  });

  it('sets final_venue_id to null when custom venue is used', async () => {
    const { admin_token, slots } = await createEvent();
    const slotId = slots[0].id;

    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId, venue_name: 'Cozy Cafe' });

    const event = await prisma.event.findFirst({ where: { adminToken: admin_token } });
    expect(event.finalVenueId).toBeNull();
    expect(event.finalVenueName).toBe('Cozy Cafe');
  });
});

describe('GET /api/participate/:participantId — finalized event returns final details', () => {
  it('returns finalSlot and finalVenue after finalization with custom venue', async () => {
    const { admin_token, slots, participants } = await createEvent();
    const slotId = slots[0].id;
    const participantId = participants[0].id;

    await request(app)
      .post(`/api/events/${admin_token}/finalize`)
      .send({ slot_id: slotId, venue_name: 'Grand Venue', venue_address: '42 Park Ave' });

    const res = await request(app).get(`/api/participate/${participantId}`);
    expect(res.status).toBe(200);
    expect(res.body.finalSlot).toBeDefined();
    expect(res.body.finalSlot.id).toBe(slotId);
    expect(res.body.finalVenue).toBeDefined();
    expect(res.body.finalVenue.name).toBe('Grand Venue');
    expect(res.body.finalVenue.address).toBe('42 Park Ave');
  });

  it('returns null finalSlot and finalVenue for open event', async () => {
    const { participants } = await createEvent();
    const participantId = participants[0].id;

    const res = await request(app).get(`/api/participate/${participantId}`);
    expect(res.status).toBe(200);
    expect(res.body.finalSlot).toBeNull();
    expect(res.body.finalVenue).toBeNull();
  });
});

describe('GET /api/events/:adminToken returns slots array', () => {
  it('includes slots array in dashboard response', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).get(`/api/events/${admin_token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.slots[0]).toHaveProperty('id');
    expect(res.body.slots[0]).toHaveProperty('starts_at');
    expect(res.body.slots[0]).toHaveProperty('ends_at');
  });
});
