/**
 * Integration tests for UX-4: resend invite endpoint
 * POST /api/events/:adminToken/participants/:participantId/resend-invite
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';
import { sendEmail } from '../../src/lib/mailer.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const createdEventIds = [];

const BASE_EMAIL_EVENT = {
  name: 'Resend Invite Test',
  organizer_email: 'organizer@example.com',
  invite_mode: 'email_invites',
  participant_emails: ['alice@example.com'],
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
};

const BASE_LINK_EVENT = {
  ...BASE_EMAIL_EVENT,
  invite_mode: 'shared_link',
  participant_emails: [],
};

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

async function createEvent(overrides = {}) {
  const res = await request(app).post('/api/events').send({ ...BASE_EMAIL_EVENT, ...overrides });
  expect(res.status).toBe(201);
  createdEventIds.push(res.body.event_id);
  return res.body;
}

describe('POST /api/events/:adminToken/participants/:participantId/resend-invite (UX-4)', () => {
  it('returns 200 and sends invite email for a valid participant', async () => {
    const { admin_token, participants } = await createEvent();
    // alice is the non-organizer participant
    const alice = participants.find(p => p.email === 'alice@example.com');
    vi.clearAllMocks();

    const res = await request(app).post(
      `/api/events/${admin_token}/participants/${alice.id}/resend-invite`
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    await new Promise(r => setTimeout(r, 50));
    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('alice@example.com');
  });

  it('returns 404 for an unknown admin token', async () => {
    const res = await request(app).post(
      '/api/events/00000000-0000-0000-0000-000000000000/participants/some-id/resend-invite'
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for a participant not belonging to the event', async () => {
    const { admin_token } = await createEvent();
    const res = await request(app).post(
      `/api/events/${admin_token}/participants/00000000-0000-0000-0000-000000000000/resend-invite`
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for shared_link events', async () => {
    const { admin_token, participants } = await createEvent({ ...BASE_LINK_EVENT });
    const res = await request(app).post(
      `/api/events/${admin_token}/participants/${participants[0].id}/resend-invite`
    );
    expect(res.status).toBe(400);
  });
});
