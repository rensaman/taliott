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
  timezone: 'UTC',
  deadline: '2025-06-30T12:00:00.000Z',
};

describe('POST /api/events — invite emails (US 1.3 + US 1.4)', () => {
  it('sends one email per non-organizer invitee plus one combined organizer creation email', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    // 2 invitees (alice, bob) + 1 combined organizer creation email = 3
    expect(sendEmail).toHaveBeenCalledTimes(3);
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

  it('organizer receives exactly one combined creation email', async () => {
    const res = await request(app).post('/api/events').send(BASE_BODY);
    expect(res.status).toBe(201);
    createdEventIds.push(res.body.event_id);

    await new Promise(r => setTimeout(r, 50));

    const orgEmails = sendEmail.mock.calls
      .map(([msg]) => msg)
      .filter(msg => msg.to === 'organizer@example.com');

    // organizer gets exactly 1 combined email (admin link + voting link)
    expect(orgEmails).toHaveLength(1);
    expect(orgEmails[0].text).toContain('/admin/');
    expect(orgEmails[0].text).toContain('/participate/');
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
