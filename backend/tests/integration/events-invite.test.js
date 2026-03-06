/**
 * Integration tests for invite email sending on POST /api/events (US 1.3)
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

describe('POST /api/events — invite emails (US 1.3)', () => {
  it('sends one email per participant (organizer + invitees)', async () => {
    // Wait briefly for fire-and-forget sendEventInvites to run
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    // Give the async fire-and-forget a tick to run
    await new Promise(r => setTimeout(r, 50));

    const totalParticipants = res.body.participants.length; // organizer + 2 invitees = 3
    expect(sendEmail).toHaveBeenCalledTimes(totalParticipants);
  });

  it('sends to each participant email address', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    const recipients = sendEmail.mock.calls.map(([msg]) => msg.to);
    expect(recipients).toContain('organizer@example.com');
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
  });

  it('email subject includes event name', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    const subjects = sendEmail.mock.calls.map(([msg]) => msg.subject);
    expect(subjects.every(s => s.includes('Invite Test Event'))).toBe(true);
  });
});
