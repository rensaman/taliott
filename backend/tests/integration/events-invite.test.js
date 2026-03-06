/**
 * Integration tests for invite email sending on POST /api/events (US 1.3 + US 1.4)
 * Mocks the mailer to assert sendEmail call counts without real SMTP.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';
import { sendEmail } from '../../src/lib/mailer.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const createdEventIds = [];

afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

const BASE_BODY = {
  name: 'Invite Test Event',
  organizer_email: 'organizer@example.com',
  participant_emails: ['alice@example.com', 'bob@example.com'],
  date_range_start: '2025-07-01',
  date_range_end: '2025-07-01',
  part_of_day: 'morning',
  deadline: '2025-06-30T12:00:00.000Z',
};

describe('POST /api/events — invite emails (US 1.3 + US 1.4)', () => {
  it('sends one email per participant plus one organizer confirmation', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    // participants (organizer + 2 invitees) + 1 organizer confirmation = 4
    const totalParticipants = res.body.participants.length;
    expect(sendEmail).toHaveBeenCalledTimes(totalParticipants + 1);
  });

  it('sends participant invites to each email address', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('organizer@example.com');
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
  });

  it('organizer receives a confirmation email with a distinct subject', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    const orgEmails = sendEmail.mock.calls
      .map(([msg]) => msg)
      .filter(msg => msg.to === 'organizer@example.com');

    // organizer gets 2 emails: one participant invite + one confirmation
    expect(orgEmails).toHaveLength(2);
    const subjects = orgEmails.map(m => m.subject);
    // at least one subject should differ from the participant invite pattern
    expect(subjects.some(s => s !== subjects[0])).toBe(true);
  });

  it('organizer confirmation email body contains admin link', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    const confirmationEmail = sendEmail.mock.calls
      .map(([msg]) => msg)
      .find(msg => msg.to === 'organizer@example.com' && msg.text.includes('/admin/'));

    expect(confirmationEmail).toBeDefined();
    expect(confirmationEmail.text).toContain(`/admin/${res.body.admin_token}`);
  });
});
