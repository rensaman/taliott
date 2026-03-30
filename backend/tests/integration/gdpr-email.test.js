/**
 * Integration tests for UX-2: deletion confirmation email on
 * DELETE /api/participate/:participantId
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

vi.mock('../../src/lib/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../../src/index.js';
import { sendEmail } from '../../src/lib/mailer.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const createdEventIds = [];

const BASE_EVENT = {
  name: 'Deletion Email Test Event',
  organizer_email: 'organizer@example.com',
  date_range_start: '2025-06-01',
  date_range_end: '2025-06-01',
  time_range_start: 480, time_range_end: 720,
  timezone: 'UTC',
  deadline: '2099-12-31T23:59:59.000Z',
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

describe('DELETE /api/participate/:participantId — deletion confirmation email (UX-2)', () => {
  it('sends a deletion confirmation email to the participant after erasure', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;
    vi.clearAllMocks();

    await request(app).delete(`/api/participate/${pid}`);

    // Allow fire-and-forget to complete
    await new Promise(r => setTimeout(r, 50));

    const emailCalls = sendEmail.mock.calls;
    // At least one email sent, and one of them goes to the organizer email
    expect(emailCalls.length).toBeGreaterThan(0);
    const recipients = emailCalls.map(([msg]) => msg.to);
    expect(recipients).toContain('organizer@example.com');
  });

  it('deletion confirmation email subject mentions the event name', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;
    vi.clearAllMocks();

    await request(app).delete(`/api/participate/${pid}`);
    await new Promise(r => setTimeout(r, 50));

    const deletionEmail = sendEmail.mock.calls.find(([msg]) =>
      msg.to === 'organizer@example.com' && /deleted|törölve/i.test(msg.subject)
    );
    expect(deletionEmail).toBeDefined();
    expect(deletionEmail[0].subject).toContain('Deletion Email Test Event');
  });

  it('does not send deletion confirmation when participant is already anonymised', async () => {
    const { participants } = await createEvent();
    const pid = participants[0].id;

    // First deletion
    await request(app).delete(`/api/participate/${pid}`);
    await new Promise(r => setTimeout(r, 50));
    vi.clearAllMocks();

    // Second deletion — email already anonymised, should not send again
    await request(app).delete(`/api/participate/${pid}`);
    await new Promise(r => setTimeout(r, 50));

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
