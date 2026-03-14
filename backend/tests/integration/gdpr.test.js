/**
 * Integration tests for GDPR data rights endpoints:
 *   DELETE /api/participate/:participantId  (erasure)
 *   GET    /api/participate/:participantId/export  (portability)
 *   DELETE /api/events/:adminToken  (organiser erasure)
 */
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/index.js';

const prisma = new PrismaClient();
const createdEventIds = [];

const FUTURE_DEADLINE = '2099-12-31T23:59:59.000Z';

const BASE_EVENT = {
  name: 'GDPR Test Event',
  organizer_email: 'gdpr-organiser@example.com',
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  part_of_day: 'morning',
  timezone: 'UTC',
  deadline: FUTURE_DEADLINE,
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({ ...BASE_EVENT, ...overrides });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

// ─── DELETE /api/participate/:participantId ───────────────────────────────────

describe('DELETE /api/participate/:participantId', () => {
  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app).delete(
      '/api/participate/00000000-0000-0000-0000-000000000000'
    );
    expect(res.status).toBe(404);
  });

  it('returns { ok: true } on success', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const res = await request(app).delete(`/api/participate/${pid}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('removes participant personal data (name, location, availability) after deletion', async () => {
    const { participants, slots } = await createEvent();
    const pid = participants[0].id;

    // Set personal data first
    await request(app)
      .patch(`/api/participate/${pid}/name`)
      .send({ name: 'Alice' });
    await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 48.8566, longitude: 2.3522, address_label: 'Paris' });
    await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slots[0].id, state: 'yes' }] });

    await request(app).delete(`/api/participate/${pid}`);

    // Personal data should be nulled in DB
    const row = await prisma.participant.findUnique({ where: { id: pid } });
    expect(row.name).toBeNull();
    expect(row.latitude).toBeNull();
    expect(row.longitude).toBeNull();
    expect(row.addressLabel).toBeNull();

    // Availability records should be deleted
    const avail = await prisma.availability.findMany({ where: { participantId: pid } });
    expect(avail).toHaveLength(0);
  });

  it('anonymises the email address so it cannot be reverse-engineered', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    await request(app).delete(`/api/participate/${pid}`);

    const row = await prisma.participant.findUnique({ where: { id: pid } });
    expect(row.email).not.toContain('gdpr-organiser@example.com');
    expect(row.email).toMatch(/deleted/);
  });

  it('GET still returns 200 after anonymisation (participant page remains accessible)', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    await request(app).delete(`/api/participate/${pid}`);

    const res = await request(app).get(`/api/participate/${pid}`);
    expect(res.status).toBe(200);
    expect(res.body.participant.name).toBeNull();
    expect(res.body.participant.latitude).toBeNull();
    expect(res.body.availability).toHaveLength(0);
  });

  it('is idempotent — deleting twice returns 200 both times', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const first = await request(app).delete(`/api/participate/${pid}`);
    const second = await request(app).delete(`/api/participate/${pid}`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });
});

// ─── GET /api/participate/:participantId/export ───────────────────────────────

describe('GET /api/participate/:participantId/export', () => {
  it('returns 404 for an unknown participant id', async () => {
    const res = await request(app).get(
      '/api/participate/00000000-0000-0000-0000-000000000000/export'
    );
    expect(res.status).toBe(404);
  });

  it('returns the participant data as JSON', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}/export`);
    expect(res.status).toBe(200);
    expect(res.body.participant_id).toBe(pid);
    expect(res.body.email).toBe('gdpr-organiser@example.com');
    expect(res.body.event.name).toBe('GDPR Test Event');
  });

  it('includes availability in the export', async () => {
    const { participants, slots } = await createEvent();
    const pid = participants[0].id;

    await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slots[0].id, state: 'yes' }] });

    const res = await request(app).get(`/api/participate/${pid}/export`);
    expect(res.status).toBe(200);
    expect(res.body.availability).toBeInstanceOf(Array);
    expect(res.body.availability).toHaveLength(1);
    expect(res.body.availability[0].state).toBe('yes');
  });

  it('includes location when set', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    await request(app)
      .patch(`/api/participate/${pid}/location`)
      .send({ latitude: 48.8566, longitude: 2.3522, address_label: 'Paris' });

    const res = await request(app).get(`/api/participate/${pid}/export`);
    expect(res.body.location).toMatchObject({
      latitude: 48.8566,
      longitude: 2.3522,
      address_label: 'Paris',
    });
  });

  it('returns null location when no location is set', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    const res = await request(app).get(`/api/participate/${pid}/export`);
    expect(res.body.location).toBeNull();
  });
});

// ─── DELETE /api/events/:adminToken ──────────────────────────────────────────

describe('DELETE /api/events/:adminToken', () => {
  it('returns 404 for an unknown admin token', async () => {
    const res = await request(app).delete(
      '/api/events/00000000-0000-0000-0000-000000000000'
    );
    expect(res.status).toBe(404);
  });

  it('returns { ok: true } on success', async () => {
    const { admin_token, event_id } = await createEvent();
    // Remove from cleanup list since we're deleting it here
    const idx = createdEventIds.indexOf(event_id);
    if (idx !== -1) createdEventIds.splice(idx, 1);

    const res = await request(app).delete(`/api/events/${admin_token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('deletes the event and all associated data (participants, slots, availability)', async () => {
    const { admin_token, event_id, participants, slots } = await createEvent();
    const idx = createdEventIds.indexOf(event_id);
    if (idx !== -1) createdEventIds.splice(idx, 1);

    const pid = participants[0].id;

    // Add some availability first
    await request(app)
      .patch(`/api/participate/${pid}/availability`)
      .send({ availability: [{ slot_id: slots[0].id, state: 'yes' }] });

    await request(app).delete(`/api/events/${admin_token}`);

    // Event should be gone
    const event = await prisma.event.findFirst({ where: { id: event_id } });
    expect(event).toBeNull();

    // Participants should be cascade-deleted
    const participant = await prisma.participant.findFirst({ where: { id: pid } });
    expect(participant).toBeNull();

    // Availability should be cascade-deleted
    const avail = await prisma.availability.findMany({ where: { participantId: pid } });
    expect(avail).toHaveLength(0);
  });

  it('admin GET returns 404 after deletion', async () => {
    const { admin_token, event_id } = await createEvent();
    const idx = createdEventIds.indexOf(event_id);
    if (idx !== -1) createdEventIds.splice(idx, 1);

    await request(app).delete(`/api/events/${admin_token}`);

    const res = await request(app).get(`/api/events/${admin_token}`);
    expect(res.status).toBe(404);
  });
});
